#!/usr/bin/env node
// Running a batch: the steps between a maker's documents and a migration, in one place.
//
// Every batch so far was driven by shell scripts written from memory at the start of a session and thrown away at
// the end of it, which is how the same three mistakes were made three times: a verify spent on a generated document
// nobody had regenerated, a document re-proposed because nothing recorded why it was held last time, and a parity
// run after every lexicon row instead of once. The steps are the same every batch, so they are a program.
//
//   npm run ingest:batch -- --holds                          why each document that has a proposal is waiting
//   npm run ingest:batch -- --batch b14 --propose --provider "QIDI" --provider "Siraya Tech"
//   npm run ingest:batch -- --batch b14 --propose --held ruling        (re-propose what a ruling has now settled)
//   npm run ingest:batch -- --batch b14 --accept --by "<name>"
//   npm run ingest:batch -- --batch b14 --split                        (aside: optical, twin, already registered)
//   npm run ingest:batch -- --batch b14 --finish                       (generated docs, then verify)
//
// Nothing here decides anything a person has to: --accept takes only the rows review.mjs's holdsBack allows, and
// everything it holds back is left for a reader. What this removes is the typing, not the reading.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { applyBatch, guard, proposalsOf, worldOf } from './apply.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { holdsBack, rowsOf } from './review.mjs';
import { HEADER, readLedger } from './inventory.mjs';
import { csvText as toCsv } from '../../build/src/csv.js';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const PROPOSALS = join(AUDIT, 'proposals');
const LEDGER = join(AUDIT, 'ledger.csv');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && !String(process.argv[i + 1] ?? '--').startsWith('--') ? process.argv[i + 1] : null; };
const args = (name) => process.argv.map((a, i) => (a === `--${name}` ? process.argv[i + 1] : null)).filter((v) => v && !v.startsWith('--'));
const flag = (name) => process.argv.includes(`--${name}`);
const run = (script, rest) => execFileSync('node', [join(projectRoot, script), ...rest], { cwd: projectRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// The seven reasons a document can be waiting. A hold that is not one of these is a hold nobody can act on, so
// there is no eighth: what does not fit is a reader gap with the gap named.
export const REASONS = ['ruling', 'no-name', 'no-values', 'ocr-visual', 'twin', 'shared-table', 'registered'];

// The holds the guard cannot see, because they are the reader's own limits rather than the applier's. This is the
// one place a hold is written by hand rather than derived; each entry says what would free it, and goes when that
// is built. A hold nobody can act on is worse than no hold at all, so nothing goes here without a way out.
const READER_GAPS = [
  { gap: 'condition-table', when: (row) => row.provider === 'Stratasys',
    why: 'a table per layer height, each with a value column per orientation, and two tables of one sheet under the same heading' },
  { gap: 'name-not-a-name', when: (row, proposal) => /^(precautions?|material status mass production)$/i.test(proposal?.grades?.[0]?.row?.['Product name'] ?? ''),
    why: 'the reader took a section heading for the product name; the page names no product this reader can use' },
  { gap: 'bilingual-columns', when: (row) => row.provider === 'QIDI',
    why: "a bilingual table whose label, standard, value and English label sit on four baselines the page orders by height rather than by row; the label under a value line is read now, but a label that lands between two values still takes the wrong one's, and that needs the columns read by position" },
];

/**
 * Why this document is waiting, from the proposal and from what the applier says about it. Returns null where
 * nothing holds it: that document is ready for a batch, and saying so is as much use as naming a hold.
 */
/**
 * A row whose own line states more than one result in the row's own unit. QIDI heads its tables
 * "Method | Molded | X-Y Axis | Z Axis" and prints three heat deflections on one line; read as one value the
 * reader takes the first, which is the injection moulded bar, and records it as the product's.
 *
 * This is asked of the proposal and not of the reader. Refusing such a row inside the reader was tried and cost
 * 297 values the database already holds across twenty makers, because a sheet prints two results on one line
 * for good reasons as often as bad ones. What the reader cannot tell apart, a batch can hold.
 */
const severalValues = (proposal) => (proposal.measurements ?? []).filter((m) => {
  const unit = String(m.row?.['Raw unit'] ?? '').trim();
  if (!unit) return false;
  const pattern = new RegExp(String.raw`(?<![-\u2013~\u00b1]\s{0,2})\d+(?:[.,]\d+)?\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
  return [...String(m.evidence?.text ?? '').matchAll(pattern)].length > 1;
}).length;

export function holdReason(proposal, problems = []) {
  const codes = new Set(problems.map((p) => p.code));
  const first = (code) => problems.find((p) => p.code === code)?.message ?? '';
  const reasons = proposal.identity?.reasons ?? [];
  const noName = reasons.find((r) => /^no product name could be read/.test(r));
  if (noName) return { reason: 'no-name', detail: noName };
  if (proposal.identity?.needsRuling) return { reason: 'ruling', detail: reasons[0] ?? 'the identity is unsettled' };
  if (codes.has('APPLY-IDENTITY')) return { reason: 'ruling', detail: first('APPLY-IDENTITY') };
  if (codes.has('APPLY-OCR-UNVERIFIED')) return { reason: 'ocr-visual', detail: 'read optically; every value needs a person against the page image' };
  if (!(proposal.measurements ?? []).length) {
    const unread = (proposal.skipped ?? []).length;
    return { reason: 'no-values', detail: `the reader found no value on the page${unread ? `, and left ${unread} line(s) it recognised as statements unread` : ''}` };
  }
  for (const code of ['APPLY-PRODUCT-DUPLICATE', 'APPLY-SHA-DUPLICATE', 'APPLY-URL-DUPLICATE', 'APPLY-SOURCE-COLLISION', 'APPLY-KEY']) {
    if (codes.has(code)) return { reason: 'registered', detail: first(code) };
  }
  const several = severalValues(proposal);
  if (several) {
    return { reason: 'reader:several-values', detail: `${several} row(s) state more than one result in their own unit and the table names no column for them; the reader takes the first, which on these sheets is the injection moulded bar` };
  }
  return null;
}

/** Every proposal on disk, newest folder per document, with the batch folder it sits in. */
function everyProposal() {
  const out = new Map();
  for (const dir of readdirSync(PROPOSALS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const file of readdirSync(join(PROPOSALS, dir)).filter((f) => f.endsWith('.json'))) {
      const proposal = JSON.parse(readFileSync(join(PROPOSALS, dir, file), 'utf8'));
      const key = proposal.document?.docKey;
      if (key) out.set(key, { dir, file, proposal });
    }
  }
  return out;
}

/** The ledger's hold reason for every document that has a proposal, and for the reader gaps named above. */
export function holds() {
  const world = worldOf();
  const found = new Map();
  for (const [key, { dir, proposal }] of everyProposal()) {
    // A proposal in an -ocr folder is there because the applier refused it for the optical reading; running the
    // guard on it again says the same thing, and running it on an applied batch says nothing at all.
    const problems = guard([proposal], world).filter((p) => p.where?.includes(key) || !p.where?.includes('.json') || p.where === `${key}.json`);
    const hold = holdReason(proposal, /-ocr$/.test(dir) ? [...problems, { code: 'APPLY-OCR-UNVERIFIED', message: '' }] : problems);
    found.set(key, { hold, proposal });
  }
  return found;
}

function writeHolds() {
  const found = holds();
  const rows = readLedger();
  // Only a document the pipeline is carrying can be held: a fetch state (unreachable, gated, needs-staging,
  // unreadable, needs-ocr) says where the document is, not why its values are waiting, and is not overwritten.
  const CARRIED = new Set(['extracted', 'twin-check', 'held']);
  const byReason = new Map();
  let touched = 0;
  for (const row of rows) {
    if (!CARRIED.has(row.status)) continue;
    const seen = found.get(row.doc_key);
    const gap = READER_GAPS.find((g) => g.when(row, seen?.proposal));
    const hold = seen?.hold
      ?? (gap ? { reason: `reader:${gap.gap}`, detail: gap.why } : null)
      ?? (row.status === 'twin-check' ? { reason: 'twin', detail: row.status_note || 'the same numbers under another product name' } : null)
      // A document nobody has proposed from still says one thing about itself: whether its text was read from the
      // page or from a picture of it. An optical reading waits for a person either way (D35, APPLY-OCR-UNVERIFIED).
      ?? (row.sha256 && cachedText(row.sha256)?.ocr ? { reason: 'ocr-visual', detail: 'read optically; every value from it needs a person against the page image' } : null);
    if (!hold) continue;
    // "also listed by" is where the document was found, not why it waits; it survives the hold beside it.
    const listed = (row.status_note ?? '').match(/also listed by [^;]+/)?.[0];
    row.status = 'held';
    row.status_note = [`held: ${hold.reason}`, hold.detail, listed].filter(Boolean).join(' \u2014 ').slice(0, 400);
    row.updated = new Date().toISOString().slice(0, 10);
    touched++;
    const k = hold.reason;
    if (!byReason.has(k)) byReason.set(k, new Map());
    byReason.get(k).set(row.provider, (byReason.get(k).get(row.provider) ?? 0) + 1);
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`${touched} document(s) now say why they are waiting`);
  for (const [reason, providers] of [...byReason].sort((a, b) => total(b[1]) - total(a[1]))) {
    console.log(`  ${String(total(providers)).padStart(4)}  ${reason.padEnd(22)} ${[...providers].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${p} ${n}`).join(', ')}`);
  }
  const waiting = rows.filter((r) => r.status === 'extracted');
  if (waiting.length) {
    const by = new Map();
    for (const r of waiting) by.set(r.provider, (by.get(r.provider) ?? 0) + 1);
    console.log(`  ${String(waiting.length).padStart(4)}  ${'(nothing holds them)'.padEnd(22)} ${[...by].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(', ')}`);
  }
}

/** Propose a batch: every document the ledger says is ready, or the ones a named hold was waiting on. */
function propose(batch) {
  const dir = join(PROPOSALS, batch);
  mkdirSync(dir, { recursive: true });
  const rest = [...args('provider').flatMap((p) => ['--provider', p]),
    ...(flag('ready') ? ['--ready'] : []), ...(arg('held') ? ['--held', arg('held')] : [])];
  try { console.log(run('scripts/ingest/propose.mjs', [...rest, '--batch', batch]).trim()); }
  catch (e) { console.log(String(e.stdout ?? e.message).trim().split('\n').slice(-3).join('\n')); }
  console.log(`${readdirSync(dir).filter((f) => f.endsWith('.json')).length} proposal(s) in ${batch}`);
}

/**
 * Accept every row the reviewer's own rule allows, and sign off the documents that are then fully decided.
 *
 * This is review.mjs's own decision, taken in process rather than by running it once per document: a batch is two
 * hundred documents and a hundred and one of those were a node start-up apiece. What it may accept is exactly
 * what holdsBack allows, so nothing here decides anything a person has to.
 */
function accept(batch, by) {
  const note = arg('note') ?? "read against the page: the row states its property, its method, its condition and its unit as the sheet prints them, and the identity is the one the sheet itself names";
  const date = new Date().toISOString().slice(0, 10);
  let accepted = 0, signed = 0;
  const heldBack = new Map();
  for (const file of readdirSync(join(PROPOSALS, batch)).filter((f) => f.endsWith('.json'))) {
    const path = join(PROPOSALS, batch, file);
    const proposal = JSON.parse(readFileSync(path, 'utf8'));
    for (const row of rowsOf(proposal)) {
      if (['accepted', 'rejected'].includes(row.review?.status)) continue;
      const reasons = holdsBack(row, proposal);
      if (reasons.length) { const r = reasons[0].slice(0, 70); heldBack.set(r, (heldBack.get(r) ?? 0) + 1); continue; }
      row.of.review = { status: 'accepted', by, date, note, ...(row.review?.visual ? { visual: true } : {}) };
      accepted++;
    }
    if (rowsOf(proposal).every((r) => ['accepted', 'rejected'].includes(r.review?.status))) {
      proposal.review = { status: 'reviewed', by, date };
      signed++;
    }
    writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);
  }
  const total = [...heldBack.values()].reduce((a, b) => a + b, 0);
  console.log(`${accepted} row(s) accepted, ${signed} document(s) signed off; ${total} row(s) held back for a reader`);
  for (const [why, n] of [...heldBack].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(4)}  ${why}`);
}

/**
 * A reader's decision on every row held back for the same reason, with the reason they give for it.
 *
 * Review by exception: --accept takes what needs no reading, and this is how the rest is read. A class of rows
 * held back by one thing is read once and decided once, because the thing to read is the same in each. The note
 * is required and goes on every row it touches, so the record says who decided what, and why.
 */
function decide(batch, by) {
  const pattern = new RegExp(arg('decide'), 'i');
  const note = arg('note');
  const how = flag('reject') ? 'rejected' : 'accepted';
  if (!note) { console.error('--note "<why>": a decision records its reason'); process.exit(2); }
  const date = new Date().toISOString().slice(0, 10);
  let n = 0;
  const docs = new Set();
  for (const file of readdirSync(join(PROPOSALS, batch)).filter((f) => f.endsWith('.json'))) {
    const path = join(PROPOSALS, batch, file);
    const proposal = JSON.parse(readFileSync(path, 'utf8'));
    let touched = false;
    for (const row of rowsOf(proposal)) {
      if (['accepted', 'rejected'].includes(row.review?.status)) continue;
      if (!holdsBack(row, proposal).some((r) => pattern.test(r))) continue;
      row.of.review = { status: how, by, date, note, ...(row.review?.visual ? { visual: true } : {}) };
      n++; touched = true; docs.add(proposal.document?.docKey);
    }
    if (!touched) continue;
    if (rowsOf(proposal).every((r) => ['accepted', 'rejected'].includes(r.review?.status))) proposal.review = { status: 'reviewed', by, date };
    writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);
  }
  console.log(`${n} row(s) ${how} across ${docs.size} document(s)`);
}

/**
 * Move aside what the applier refuses for a reason that is not about the row: an optical reading nobody has
 * checked, an identity nobody has settled, a product already recorded, and a sheet that prints another sheet's
 * numbers. The last is R053: where two sources publish the same values under different names, the second is
 * queued as a question rather than registered as a second measurement of the same thing, because registering
 * both would count one measurement twice in the estimate model.
 */
function split(batch) {
  const world = worldOf();
  for (const suffix of ['ocr', 'held']) mkdirSync(join(PROPOSALS, `${batch}-${suffix}`), { recursive: true });
  const move = (file, where) => renameSync(join(PROPOSALS, batch, file), join(PROPOSALS, `${batch}-${where}`, file));
  for (let round = 1; round <= 4; round++) {
    const proposals = proposalsOf(batch);
    const problems = guard(proposals, world);
    const moved = new Map();
    for (const p of proposals) {
      const mine = problems.filter((x) => String(x.where ?? '').startsWith(p.file));
      const hold = holdReason(p, mine);
      if (hold && ['ocr-visual', 'ruling', 'no-name', 'registered', 'no-values', 'reader:several-values'].includes(hold.reason)) {
        moved.set(p.file, hold.reason === 'ocr-visual' ? 'ocr' : 'held');
      }
    }
    if (!moved.size) { console.log(`round ${round}: nothing left to move`); break; }
    for (const [file, where] of moved) move(file, where);
    console.log(`round ${round}: ${[...moved.values()].filter((v) => v === 'ocr').length} optical, ${[...moved.values()].filter((v) => v === 'held').length} held`);
  }
  // Twins are only visible once the batch is rehearsed against the tables, because what makes one is the values
  // it shares with a source already recorded. The one this batch brings is the one that is queued, and the
  // ledger is told which source it repeats, so the queue says why without anybody re-deriving it.
  const queued = new Map();
  for (let round = 1; round <= 6; round++) {
    let problems = [];
    try { applyBatch(batch, { dryRun: true }); } catch (e) { problems = e.problems ?? []; }
    const pairs = problems.filter((p) => /MEAS-CROSS-SOURCE-TWIN/.test(p.message ?? ''))
      .map((p) => String(p.where).replace(/^sources\s+/, '').split(' | '));
    if (!pairs.length) { if (round === 1) console.log('no twin of a source already recorded'); break; }
    const recorded = new Set(world.sources.map((x) => x.SourceID));
    const bySource = new Map(proposalsOf(batch).map((p) => [p.source?.row?.SourceID, p.file]));
    const gone = new Set();
    let n = 0;
    for (const [a, b] of pairs) {
      // The one to queue is the one this batch brings. Where both are new, the second named is queued and the
      // first stays, so the pair leaves one source behind it rather than none.
      const mine = [a, b].filter((id) => !recorded.has(id) && bySource.has(id) && !gone.has(id));
      if (!mine.length) continue;
      const pick = mine.length === 2 ? mine[1] : mine[0];
      move(bySource.get(pick), 'held');
      queued.set(bySource.get(pick), pick === a ? b : a);
      gone.add(pick); n++;
    }
    console.log(`round ${round}: ${pairs.length} twin pair(s), ${n} queued as a question (R053)`);
    if (!n) break;
  }
  if (queued.size) {
    const byFile = new Map();
    for (const dir of [`${batch}-held`]) {
      for (const file of readdirSync(join(PROPOSALS, dir)).filter((f) => f.endsWith('.json'))) {
        byFile.set(file, JSON.parse(readFileSync(join(PROPOSALS, dir, file), 'utf8')).document?.docKey);
      }
    }
    const rows = readLedger();
    let told = 0;
    for (const row of rows) {
      const file = [...queued.keys()].find((f) => byFile.get(f) === row.doc_key);
      if (!file) continue;
      row.status = 'held';
      row.status_note = `held: twin — it prints the numbers ${queued.get(file)} already holds, and R053 says what a pair like this becomes: a grade each, citing its own sheet, with the values recorded once`;
      row.updated = new Date().toISOString().slice(0, 10);
      told++;
    }
    if (told) { writeFileSync(LEDGER, toCsv(HEADER, rows)); console.log(`  ${told} document(s) told the ledger which source they repeat`); }
  }
}

/** Everything generated, then the gate. The three verifies this programme lost to a stale document were each this. */
function finish(batch) {
  for (const [what, script, rest] of [['data', 'scripts/data/fmt.mjs', []], ['rules', 'scripts/docs-rules.mjs', []],
    ['dictionary', 'scripts/docs-dictionary.mjs', []], ['decisions', 'scripts/docs-decisions.mjs', []], ['snapshot', 'scripts/snapshot.mjs', []]]) {
    run(script, rest);
    console.log(`  ${what} regenerated`);
  }
  const dir = join(AUDIT, 'batches', batch);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'build-diff.txt'), run('scripts/build-diff.mjs', []));
  run('scripts/data/diff.mjs', ['HEAD', '--out', join(dir, 'changelog.csv')]);
  console.log(`  build-diff.txt and changelog.csv in ${dir.replace(projectRoot + '/', '')}`);
  console.log('now run: npm run verify');
}

if (process.argv[1]?.endsWith('batch.mjs')) {
  const batch = arg('batch');
  if (flag('holds')) writeHolds();
  else if (!batch) { console.error('--batch <name> names the batch to work on, or --holds to say why documents wait'); process.exit(2); }
  else if (flag('propose')) propose(batch);
  else if (flag('accept')) { const by = arg('by'); if (!by) { console.error('--by <name>: a review records who made it'); process.exit(2); } accept(batch, by); }
  else if (arg('decide')) { const by = arg('by'); if (!by) { console.error('--by <name>: a review records who made it'); process.exit(2); } decide(batch, by); }
  else if (flag('split')) split(batch);
  else if (flag('finish')) finish(batch);
  else { console.error('one of --propose, --accept, --decide, --split, --finish, --holds'); process.exit(2); }
}
