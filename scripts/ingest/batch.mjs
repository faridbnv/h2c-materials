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
import { guard, proposalsOf, worldOf } from './apply.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { holdsBack, rowsOf } from './review.mjs';
import { HEADER, readLedger } from './inventory.mjs';

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
];

/**
 * Why this document is waiting, from the proposal and from what the applier says about it. Returns null where
 * nothing holds it: that document is ready for a batch, and saying so is as much use as naming a hold.
 */
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

/** Propose a batch: every provider named, and every document whose hold reason the caller says is settled. */
function propose(batch) {
  const dir = join(PROPOSALS, batch);
  mkdirSync(dir, { recursive: true });
  for (const provider of args('provider')) {
    try { console.log(run('scripts/ingest/propose.mjs', ['--provider', provider, '--batch', batch]).trim()); }
    catch (e) { console.log(`${provider}: ${String(e.stdout ?? e.message).trim().split('\n').pop()}`); }
  }
  const held = arg('held');
  if (held) {
    const keys = readLedger().filter((r) => (r.status_note ?? '').startsWith(`held: ${held}`)).map((r) => r.doc_key);
    console.log(`${keys.length} document(s) held for ${held}`);
    for (const key of keys) {
      try { run('scripts/ingest/propose.mjs', ['--doc', key, '--batch', batch]); } catch { /* the document says why itself */ }
    }
  }
  console.log(`${readdirSync(dir).length} proposal(s) in ${batch}`);
}

/** Accept every row the reviewer's own rule allows, document by document, and sign off what is fully decided. */
function accept(batch, by) {
  const note = arg('note') ?? 'read against the page: the row states its property, its method, its condition and its unit as the sheet prints them, and the identity is the one the sheet itself names';
  let accepted = 0, held = 0, signed = 0;
  for (const file of readdirSync(join(PROPOSALS, batch)).filter((f) => f.endsWith('.json'))) {
    const path = join(PROPOSALS, batch, file);
    const proposal = JSON.parse(readFileSync(path, 'utf8'));
    const ids = [];
    for (const row of rowsOf(proposal)) {
      if (['accepted', 'rejected'].includes(row.review?.status)) continue;
      if (holdsBack(row, proposal).length) { held++; continue; }
      ids.push(String(row.id));
    }
    if (ids.length) {
      run('scripts/ingest/review.mjs', ['--doc', proposal.document.docKey, '--accept', ids.join(','), '--by', by, '--note', note]);
      accepted += ids.length;
    }
    const after = JSON.parse(readFileSync(path, 'utf8'));
    if (rowsOf(after).every((r) => ['accepted', 'rejected'].includes(r.review?.status))) {
      try { run('scripts/ingest/review.mjs', ['--doc', after.document.docKey, '--done', '--by', by]); signed++; } catch { /* another copy of the document is undecided */ }
    }
  }
  console.log(`${accepted} row(s) accepted, ${signed} document(s) signed off; ${held} row(s) held back for a reader`);
}

/** Move aside what the applier refuses for a reason that is not about the row: optical, twin, already recorded. */
function split(batch) {
  const world = worldOf();
  for (const suffix of ['ocr', 'held']) mkdirSync(join(PROPOSALS, `${batch}-${suffix}`), { recursive: true });
  for (let round = 1; round <= 4; round++) {
    const proposals = proposalsOf(batch);
    const problems = guard(proposals, world);
    const moved = new Map();
    for (const p of proposals) {
      const mine = problems.filter((x) => String(x.where ?? '').startsWith(p.file));
      const hold = holdReason(p, mine);
      if (hold && ['ocr-visual', 'ruling', 'no-name', 'registered', 'no-values'].includes(hold.reason)) {
        moved.set(p.file, hold.reason === 'ocr-visual' ? 'ocr' : 'held');
      }
    }
    if (!moved.size) { console.log(`round ${round}: nothing left to move`); break; }
    for (const [file, where] of moved) renameSync(join(PROPOSALS, batch, file), join(PROPOSALS, `${batch}-${where}`, file));
    console.log(`round ${round}: ${[...moved.values()].filter((v) => v === 'ocr').length} optical, ${[...moved.values()].filter((v) => v === 'held').length} held`);
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
  else if (flag('split')) split(batch);
  else if (flag('finish')) finish(batch);
  else { console.error('one of --propose, --accept, --split, --finish, --holds'); process.exit(2); }
}
