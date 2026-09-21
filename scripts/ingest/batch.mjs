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
//   npm run ingest:batch -- --batch b14 --propose --held any           (... or everything held, whatever its reason)
//   npm run ingest:batch -- --batch b14 --accept --by "<name>"
//   npm run ingest:batch -- --batch b14 --split                        (aside: optical, twin, already registered)
//   npm run ingest:batch -- --batch b14 --twins --by "<name>"          (R053: a grade each, the values once)
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
import { productName, labelFor, RATE_OR_CONDITION } from './propose.mjs';
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
    why: "a table per layer height, each with a value column per orientation, and the layer height on a line of its own. The columns are read now — 24 documents yield 379 values, 280 of them stating a direction — and what is still missing is the caption: nine of eleven sheets then hold the same property in the same direction two or three times over, one row per table, with nothing on the row saying which table it came from. Carrying \"Table 5: … with Unidirectional Toolpaths\" and \"0.010 in layer height\" onto each row is what frees them, and until then MEAS-CONDITIONS-INDISTINCT is right to refuse" },
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
  // What a row prints inside brackets is the condition it was measured under, not a second result, and a
  // condition may be in the value's own unit: 3DJake heads a row "Vicat (50 N, 50 °C/h) 98 °C", and the heating
  // rate held eighteen of its documents for stating two temperatures. readRow already sets a bracketed number
  // aside; the count here has to as well, or it holds what the reader has already read correctly.
  const text = String(m.evidence?.text ?? '').replace(/[(（[［][^)）\]］]*[)）\]］]/g, ' ');
  // A number begins where a number begins. Without this the pattern matched the "0" inside "± 10 °C" — its own
  // character before it being the "1" and not the sign — and every published spread counted as a second result.
  const pattern = new RegExp(String.raw`(?<![\d.,])(?<![-\u2013~\u00b1]\s{0,2})\d+(?:[.,]\d+)?\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
  // And a rate or a humidity is the condition a test was run at, not its result: "DSC, 10 °C/min 55 °C" states
  // one temperature, and "23 °C/50 % r.h. 0,3 %" one absorption. readRow already refuses to read either as a
  // value (RATE_OR_CONDITION); a count that does not do the same holds what the reader read correctly.
  const results = [...text.matchAll(pattern)].filter((hit) => !RATE_OR_CONDITION.test(text.slice(hit.index + hit[0].length)));
  return results.length > 1;
}).length;

/**
 * The verdicts the owner has given on a reading, by document key (readings/readings.csv). Empty where the file
 * does not exist yet, which is the same as nobody having looked.
 */
const verdicts = () => {
  const path = join(AUDIT, 'readings/readings.csv');
  if (!existsSync(path)) return new Map();
  return new Map(readCsv(path).records.map((r) => [r.values['Doc key'], String(r.values.Verdict ?? '').trim()]));
};
let VERDICTS = null;
/** The materials the register already permits (Kind new-material): a second permission is not asked for. */
const permitted = () => new Set(readCsv(join(AUDIT, 'rulings/rulings.csv')).records.map((r) => r.values).filter((r) => r.Kind === 'new-material').map((r) => r.Subject));
let PERMITTED = null;

/**
 * What a page the reader found nothing on actually holds, asked of the cached text: how many lines name a
 * property the lexicon knows, how many put a number beside a unit, and how many lines there are at all. Thirty-
 * seven documents were held as one thing, "no-values", and they were four: a brochure with neither (Essentium's
 * TPU 58D), a scan whose text layer is a header and nothing else (SIDDAMENT's NATURE3D pages, ten to eighteen
 * lines), a sheet in a language the lexicon has no labels for (Spectrum's Polish, F2P's Spanish), and a layout
 * that has both and the reader still cannot pair. Each is a different next step, so each is named.
 */
const UNIT_BESIDE_NUMBER = /\d\s*(MPa|GPa|%|°C|℃|g\/cm|kg\/m|kJ\/m|J\/m|Shore)/i;
export function noValuesShape(sha) {
  const text = sha ? cachedText(sha) : null;
  if (!text) return {};
  const lines = (text.pages ?? []).flatMap((p) => (p.lines ?? []).map((l) => String(l.text ?? '')));
  const labels = lines.filter((l) => labelFor(l)).length;
  const units = lines.filter((l) => UNIT_BESIDE_NUMBER.test(l)).length;
  // A data sheet has more than twenty lines of text. A page with fewer is a header over an image, whatever the
  // few lines say: SIDDAMENT's NATURE3D pages carry ten to eighteen lines, a couple of them with a number beside
  // a unit, and the table itself is a picture.
  if (lines.length < 20) return { shape: 'scan', detail: `the text layer is ${lines.length} line(s) over what is otherwise an image: the page needs ingest:ocr` };
  if (!labels && !units) {
    return { shape: 'brochure', detail: `${lines.length} line(s), none naming a property the lexicon knows and none putting a number beside a unit: a brochure, not a data sheet` };
  }
  if (!labels && units) return { shape: 'language', detail: `${units} line(s) put a number beside a unit and none names a property the lexicon knows: the labels are in a language it has none for` };
  if (labels && !units) return { shape: 'prose', detail: `${labels} line(s) name a property and none puts a number beside a unit: the values are in prose or in a layout the reader cannot pair` };
  return { shape: 'layout', detail: `${labels} label line(s) and ${units} value line(s) the reader could not pair: a layout gap` };
}

export function holdReason(proposal, problems = []) {
  const codes = new Set(problems.map((p) => p.code));
  const first = (code) => problems.find((p) => p.code === code)?.message ?? '';
  const reasons = proposal.identity?.reasons ?? [];
  const noName = reasons.find((r) => /^no product name could be read/.test(r));
  if (noName) return { reason: 'no-name', detail: noName };
  if (proposal.identity?.needsRuling) {
    // A reading the owner struck (Verdict `no` in readings/readings.csv) stays under its ruling and says so: the
    // sheet enters only under a ruling that names its product, which the owner writes as the verdict instead.
    VERDICTS ??= verdicts();
    const struck = /^no$/i.test(VERDICTS.get(proposal.document?.docKey) ?? '');
    return { reason: 'ruling', detail: `${reasons[0] ?? 'the identity is unsettled'}${struck ? '; the owner struck the reading, so it enters only under a ruling that names it' : ''}` };
  }
  // R083: where a sheet declares a polymer and a filler no material holds, the material is created — and the
  // list goes to the owner before any of it is written. A reader that settles the identity has not been given
  // permission to create the material, so a proposal carrying one waits for a verdict in readings/readings.csv.
  if (proposal.newMaterial) {
    VERDICTS ??= verdicts();
    PERMITTED ??= permitted();
    const said = VERDICTS.get(proposal.document?.docKey);
    if (!said && !PERMITTED.has(proposal.newMaterial['Original name'])) {
      return { reason: 'ruling', detail: `it would create the material ${proposal.newMaterial['Original name']} (${proposal.identity?.polymer} / ${proposal.identity?.modifier}), and R083 says that list goes to the owner before any of it is written` };
    }
    if (/^no$/i.test(said)) return { reason: 'ruling', detail: `the owner struck the reading that would have created ${proposal.newMaterial['Original name']}` };
  }
  if (codes.has('APPLY-IDENTITY')) return { reason: 'ruling', detail: first('APPLY-IDENTITY') };
  if (codes.has('APPLY-OCR-UNVERIFIED')) return { reason: 'ocr-visual', detail: 'read optically; every value needs a person against the page image' };
  if (!(proposal.measurements ?? []).length) {
    const unread = (proposal.skipped ?? []).length;
    return { reason: 'no-values', detail: `the reader found no value on the page${unread ? `, and left ${unread} line(s) it recognised as statements unread` : ''}`, ...noValuesShape(proposal.document?.sha256) };
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

/**
 * A product the database already holds an active grade for, from this document's own maker. Whatever else is
 * holding the document, that fact settles it: the product is recorded, its values are recorded, and "a second
 * sheet for one product is a revision or a copy, and its rows belong on the grade that is already there".
 *
 * Asked of the tables rather than of the ledger, because the ledger says which documents were applied and the
 * tables say what came of them. Eighty-four documents were waiting in four different queues for this.
 */
function recordedAlready(world) {
  const flat = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = (maker, name) => `${flat(maker)}|${flat(productName(name ?? '', maker ?? ''))}`;
  const have = new Map();
  for (const g of world.grades ?? []) if (g.Status === 'active') have.set(key(g.Manufacturer, g['Product name']), g);
  // Two names for one product: the catalogue's, which the ledger carries, and the sheet's own, which the reader
  // reads and a proposal's grade holds. AzureFilm's ABS sits in the ledger as 3DJake's "ABS P" and in the tables
  // as AzureFilm's "ABS", and asked only by the first the lookup said the product was not recorded — while the
  // twin phase, which asks by the second, said it was. Either name finding the grade is the product being found.
  return (row, proposal) => {
    const grade = proposal?.grades?.[0]?.row;
    if (grade?.Manufacturer && grade['Product name']) {
      const bySheet = have.get(key(grade.Manufacturer, grade['Product name']));
      if (bySheet) return bySheet;
    }
    if (!flat(row.product_raw)) return null;
    return have.get(key(row.manufacturer || row.brand || row.provider, row.product_raw)) ?? null;
  };
}

function writeHolds() {
  const found = holds();
  const recorded = recordedAlready(worldOf());
  const rows = readLedger();
  // Only a document the pipeline is carrying can be held: a fetch state (unreachable, gated, needs-staging,
  // unreadable, needs-ocr) says where the document is, not why its values are waiting, and is not overwritten.
  const CARRIED = new Set(['extracted', 'twin-check', 'held']);
  // An "inventoried" row with a cached text was extracted; only the word was reset, by a rebuild of the inventory
  // that once treated a pipeline-set "registered" as its own to overwrite. It is carried like the rest, so the
  // grade lookup above can say again what it said before.
  const carried = (row) => CARRIED.has(row.status) || (row.status === 'inventoried' && row.sha256 && cachedText(row.sha256));
  const byReason = new Map();
  let touched = 0, released = 0;
  for (const row of rows) {
    if (!carried(row)) continue;
    // A twin stays a twin, and it is asked first. The splitter ran the applier over the pair and saw what the
    // proposal alone cannot — which source this document repeats — so a proposal left over from an earlier batch
    // must not speak over it. Seven documents had their twin note replaced by a question the ruling behind it
    // had already answered, because an old proposal was the only thing still asking it.
    // Asked before anything else, because it is the one answer that makes the rest of the question moot.
    const grade = recorded(row, found.get(row.doc_key)?.proposal);
    if (grade) {
      // A product the database holds is a terminal state, not a hold: nothing is waiting, and a queue that lists
      // it beside the documents that wait is a queue that overstates itself by a hundred. The note keeps the
      // grade it is recorded under, which is what a reader following the document needs.
      const hold = { reason: 'registered', detail: `${grade.Manufacturer} ${grade['Product name']} is already ${grade.GradeID}: the product is in the database, and a second sheet for one product is a revision or a copy whose rows belong on the grade that is there` };
      row.status = 'registered';
      row.registered_source_id = row.registered_source_id || grade.SourceID || '';
      row.registered_by = row.registered_by || 'product';
      row.status_note = hold.detail.slice(0, 400);
      row.updated = new Date().toISOString().slice(0, 10);
      touched++;
      if (!byReason.has(hold.reason)) byReason.set(hold.reason, new Map());
      byReason.get(hold.reason).set(row.provider, (byReason.get(hold.reason).get(row.provider) ?? 0) + 1);
      continue;
    }
    const twin = /^held: twin/.test(row.status_note ?? '') || row.status === 'twin-check'
      ? { reason: 'twin', detail: (row.status_note ?? '').replace(/^held: twin \u2014 /, '') || 'the same numbers under another product name' }
      : null;
    const seen = found.get(row.doc_key);
    const gap = READER_GAPS.find((g) => g.when(row, seen?.proposal));
    const hold = twin
      ?? seen?.hold
      ?? (gap ? { reason: `reader:${gap.gap}`, detail: gap.why } : null)
      // A document nobody has proposed from still says one thing about itself: whether its text was read from the
      // page or from a picture of it. An optical reading waits for a person either way (D35, APPLY-OCR-UNVERIFIED).
      ?? (row.sha256 && cachedText(row.sha256)?.ocr ? { reason: 'ocr-visual', detail: 'read optically; every value from it needs a person against the page image' } : null);
    // "also listed by" is where the document was found, and "staged copy" is where its bytes came from (R084):
    // neither is why it waits, and both survive the hold beside it.
    const listed = ((row.status_note ?? '').match(/(?:also listed by|staged copy: )[^;]+/g) ?? []).map((f) => f.trim()).join('; ') || undefined;
    // A hold that is gone releases the document. A ruling answered, a polymer row written, a reader rule built:
    // whatever freed it, the queue must say so, because a row that keeps the note of a hold it no longer has is
    // a document nobody will look at again. Three sat like that after one ruling — colorFabb's and NinjaTek's
    // PLA/PHA and Siraya's PAHT CF — proposed, settled, and still saying they were waiting on the owner.
    if (!hold) {
      if (row.status !== 'held') continue;
      if (!seen) continue;  // nothing read it this run, so nothing here knows whether it still waits
      row.status = 'extracted';
      row.status_note = listed ?? '';
      row.updated = new Date().toISOString().slice(0, 10);
      released++;
      continue;
    }
    // Two of the shapes a no-values page can have are not holds. A brochure is a document that is not a data
    // sheet, which is a terminal state the ledger already has; a page whose text layer is a header over an image
    // is a scan, and the optical pipeline is where it goes. Both were sitting in the queue as a reader gap.
    if (hold.reason === 'no-values' && hold.shape === 'brochure') {
      row.status = 'not-a-data-sheet';
      row.status_note = [hold.detail, listed].filter(Boolean).join(' \u2014 ').slice(0, 400);
      row.updated = new Date().toISOString().slice(0, 10);
      touched++;
      continue;
    }
    if (hold.reason === 'no-values' && hold.shape === 'scan') {
      row.status = 'needs-ocr';
      row.status_note = [hold.detail, listed].filter(Boolean).join(' \u2014 ').slice(0, 400);
      row.updated = new Date().toISOString().slice(0, 10);
      touched++;
      continue;
    }
    // "registered" is terminal whichever route found it: the grade lookup above, the applier's own duplicate
    // check, or the twin step finding the product already has a grade. Thirteen rows were still "held" for it.
    if (hold.reason === 'registered') {
      row.status = 'registered';
      row.registered_by = row.registered_by || 'product';
      row.status_note = [hold.detail, listed].filter(Boolean).join(' \u2014 ').slice(0, 400);
      row.updated = new Date().toISOString().slice(0, 10);
      touched++;
      if (!byReason.has('registered')) byReason.set('registered', new Map());
      byReason.get('registered').set(row.provider, (byReason.get('registered').get(row.provider) ?? 0) + 1);
      continue;
    }
    row.status = 'held';
    const reason = hold.reason === 'no-values' && hold.shape ? `no-values:${hold.shape}` : hold.reason;
    row.status_note = [`held: ${reason}`, hold.detail, listed].filter(Boolean).join(' \u2014 ').slice(0, 400);
    row.updated = new Date().toISOString().slice(0, 10);
    touched++;
    const k = reason;
    if (!byReason.has(k)) byReason.set(k, new Map());
    byReason.get(k).set(row.provider, (byReason.get(k).get(row.provider) ?? 0) + 1);
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`${touched} document(s) now say why they are waiting${released ? `, and ${released} no longer wait: what held them is settled` : ''}`);
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
      // Every reason must match, not merely one of them. A row held for a confidence and for a value outside
      // every physics window was being accepted on the confidence: the bulk decision answered the easy reason
      // and carried the specific one with it, unread. A row a pattern does not fully cover is left for a reader.
      const why = holdsBack(row, proposal);
      if (!why.length || !why.every((r) => pattern.test(r))) continue;
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
        continue;
      }
      // A document whose every row a reader rejected has been read and refused, and the reason is on its rows;
      // it is held, not applied, and it was being moved aside by hand in three batches running.
      const rows = rowsOf(p);
      if (rows.length && rows.every((r) => r.review?.status === 'rejected')) moved.set(p.file, 'held');
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
    // Which source a twin repeats is written into the proposal as well as into the ledger. The ledger's note is
    // for a person reading the queue; the proposal's `twinOf` is what `--twins` reads, and a hold whose reason
    // only exists as prose is a hold nothing can act on.
    for (const [file, primary] of queued) {
      const path = join(PROPOSALS, `${batch}-held`, file);
      if (!existsSync(path)) continue;
      const proposal = JSON.parse(readFileSync(path, 'utf8'));
      proposal.twinOf = primary;
      writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);
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
    if (told) { writeFileSync(LEDGER, csvText(HEADER, rows)); console.log(`  ${told} document(s) told the ledger which source they repeat`); }
  }
}

/**
 * R053, applied: "a grade each, citing its own sheet, with the values recorded once".
 *
 * A twin is a document whose sheet prints the numbers another sheet already carries — one maker's table served
 * under several product names, which is how SUNLU publishes its PLA range and its Silk PLA+ colour packs. Both
 * are real products and the database should hold both; what it must not hold is the same measurement twice,
 * because the estimate model would then count one result as two.
 *
 * So the twin keeps its own source row — a document is its bytes, and this one was fetched and hashed — and its
 * own grade, and it shares the formulation key of the sheet that carries the values. That key is what says the
 * two names are one formulation: without it the grade is a catalogue row that knows nothing about the sheet it
 * repeats, and with it the model predicts the pair once.
 *
 * Its measurements and its print setups are rejected rather than dropped. A rejection carries a reason and a
 * name; a row that simply disappears carries neither, and a reader six months from now cannot tell a value
 * nobody recorded from a value somebody decided against.
 */
/**
 * Which source a held document repeats, from whatever recorded it. Two things wrote these notes: the splitter,
 * which names a SourceID the tables already hold, and the extract stage, which names the other document by key
 * and says plainly that the question is open — "one sheet served twice, or two products tested once?".
 *
 * Only the first is an answer. The second is a pair of documents printing one table, and which of those two
 * things it is cannot be read off the pair; it is logged rather than guessed at.
 */
const PRIMARY_SOURCE = /it prints the numbers (\S+) already holds/;
const PRIMARY_DOCUMENT = /prints the same numbers as (\S+) \(/;

function primaryOf(row, ledger) {
  const said = PRIMARY_SOURCE.exec(row?.status_note ?? '');
  if (said) return { source: said[1], how: 'the applier found it against a source the tables hold' };
  const other = PRIMARY_DOCUMENT.exec(row?.status_note ?? '');
  if (!other) return null;
  const twin = ledger.find((r) => r.doc_key === other[1] || r.url === other[1]);
  // A twin can only be shaped once the sheet that carries the values is applied: until then there is nothing for
  // its grade to share a formulation key with, and the values it defers to are not recorded anywhere.
  if (!twin?.registered_source_id) return { source: null, how: `the sheet it repeats (${other[1]}) is not applied yet`, other: twin ?? null };
  return { source: twin.registered_source_id, how: `the extract stage paired it with ${twin.doc_key}`, other: twin };
}

function twins(batch, by) {
  const held = join(PROPOSALS, `${batch}-held`);
  if (!existsSync(held)) { console.error(`no ${batch}-held to read twins from; run --split first`); process.exit(2); }
  const world = worldOf();
  const ledger = readLedger();
  const byDoc = new Map(ledger.map((r) => [r.doc_key, r]));
  // The key a source's own grade carries, which is the SourceID itself unless a batch gave the sheet's products
  // a key each ("SourceID#product"). Asked of the tables, so a twin of a twin follows the chain to the values.
  const keyOfSource = new Map();
  const materialOfKey = new Map();
  for (const g of world.grades ?? []) {
    if (g.SourceID && g['Shared formulation key']) keyOfSource.set(g.SourceID, g['Shared formulation key']);
    if (g['Shared formulation key']) materialOfKey.set(g['Shared formulation key'], g.MaterialID);
  }
  const date = new Date().toISOString().slice(0, 10);
  // A product's own name, with the maker's off it, so "ColorFabb SteelFill" and colorFabb's "steelFill" are one
  // product and "Facilan Ortho" and "Facilan PCL100" are two.
  const nameKey = (r) => (r ? String([r.manufacturer, r.provider, r.brand].filter(Boolean)
    .reduce((n, who) => productName(n, who), r.product_raw ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, '') : '');
  const waiting = [], copies = [], registered = [], editions = [];
  const shapedProducts = new Map();
  const shapedKeys = new Map();
  let shaped = 0, missing = 0;
  for (const file of readdirSync(held).filter((f) => f.endsWith('.json'))) {
    const path = join(held, file);
    const proposal = JSON.parse(readFileSync(path, 'utf8'));
    const row = byDoc.get(proposal.document?.docKey);
    const found = proposal.twinOf ? { source: proposal.twinOf } : primaryOf(row, ledger);
    // A document in the held folder for some other reason is not a twin and is not reported as one waiting.
    if (!found && !proposal.twinOf && !/^held: twin/.test(row?.status_note ?? '')) continue;
    const primary = found?.source;
    if (!primary) { waiting.push(`${row?.provider ?? '?'} "${row?.product_raw ?? proposal.document?.docKey}" — ${found?.how ?? 'nothing records which sheet it repeats'}`); continue; }
    // A copy is not a source (AGENTS). Where the two documents name the same product of the same maker, this is
    // one sheet served twice — a shop re-rendering the maker's own — and the second is a duplicate document, not
    // a second product. R053 is about the other shape: two products whose sheets print one table.
    const mine = nameKey(row), theirs = nameKey(found.other);
    if (mine && theirs && mine === theirs) { copies.push([row, found.other]); continue; }
    const key = keyOfSource.get(primary) ?? primary;
    // One formulation key belongs to one material (D12, D44), and the applier refuses a batch that puts it on
    // two. Where the sheet that carries the values sits under a different material than this reader gives this
    // product, the pair is not one formulation — or one of the two identities is wrong — and either way it is a
    // reading of the two sheets rather than a rule. Seventeen of these, and they are logged, not guessed.
    // Including what this run has already shaped: the sheet that carries the values may be in this batch, and
    // until it is applied the tables know nothing about it. AzureFilm publishes one table for its PLA and its
    // Silk PLA, which are two materials, and one formulation key cannot be on both (D12, D44).
    const valuesUnder = materialOfKey.get(key) ?? shapedKeys.get(key);
    const ours = proposal.identity?.materialId;
    if (valuesUnder && ours && valuesUnder !== ours) {
      waiting.push(`${row?.provider ?? '?'} "${row?.product_raw ?? ''}" — the values sit under ${valuesUnder} and this product reads as ${ours}`);
      continue;
    }
    // A product the database already holds a grade for does not need a second one, and its sheet does not need a
    // second source row: "a second sheet for one product is a revision or a copy, and its rows belong on the
    // grade that is already there". The applier reuses the grade and the new source is then cited by nothing,
    // which is what SOURCE-UNCITED is. Thirty-one of these, and they are already recorded.
    const flat = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const g0 = proposal.grades?.[0]?.row;
    const already = (world.grades ?? []).find((g) => g.Status === 'active'
      && flat(g.Manufacturer) === flat(g0?.Manufacturer) && flat(g['Product name']) === flat(g0?.['Product name']));
    if (already) {
      registered.push([row, already]);
      continue;
    }
    // And a product this run has already shaped. Spectrum publishes its PLA Nature and PLA Thermoactive sheets
    // in Polish and in English, and both editions are in this batch: one product, one grade, and the second
    // source would be cited by nothing.
    const product = `${flat(g0?.Manufacturer)}|${flat(g0?.['Product name'])}`;
    if (shapedProducts.has(product)) { editions.push([row, shapedProducts.get(product)]); continue; }
    shapedProducts.set(product, row);
    shapedKeys.set(key, ours);
    if (!ours || proposal.identity?.needsRuling) {
      waiting.push(`${row?.provider ?? '?'} "${row?.product_raw ?? ''}" — its own identity is unsettled: ${proposal.identity?.reasons?.[0] ?? 'no material'}`);
      continue;
    }
    const why = `R053: this sheet prints the numbers ${primary} already carries. The product is its own and keeps its own grade and its own source; the values are recorded once, under ${key}.`;
    for (const row of rowsOf(proposal)) {
      if (row.kind === 'measurement' || row.kind === 'profile') {
        row.of.review = { status: 'rejected', by, date, note: why };
      } else {
        row.of.review = { status: 'accepted', by, date, note: `R053: the product and the document are its own; only the values are ${primary}'s.` };
      }
    }
    for (const grade of proposal.grades ?? []) grade.row['Shared formulation key'] = key;
    proposal.review = { status: 'reviewed', by, date, note: why };
    writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);
    renameSync(path, join(PROPOSALS, batch, file));
    shaped++;
  }
  if (registered.length) {
    // `registered` is terminal, as writeHolds has said since the queue was consolidated: the product is in the
    // database and nothing is waiting. Written as a hold instead, two documents were freed again by the next
    // run that found no proposal holding them, and proposed a third time.
    for (const [row, grade] of registered) {
      row.status = 'registered';
      row.registered_source_id = row.registered_source_id || grade.SourceID || '';
      row.registered_by = row.registered_by || 'product';
      row.status_note = `${grade.Manufacturer} ${grade['Product name']} is already ${grade.GradeID}, and a second sheet for one product is a revision or a copy whose rows belong on the grade that is there`;
      row.updated = date;
    }
  }
  for (const [row, first] of editions) {
    row.status = 'duplicate-of';
    row.duplicate_of = first?.doc_key ?? '';
    row.duplicate_kind = 'other-language';
    row.status_note = `another edition of ${first?.product_raw ?? 'the same sheet'}: one product, one grade, and the values are recorded once`;
    row.updated = date;
  }
  if (copies.length || registered.length || editions.length) {
    for (const [row, other] of copies) {
      row.status = 'duplicate-of';
      row.duplicate_of = other?.doc_key ?? '';
      row.duplicate_kind = 'same-product';
      row.status_note = `a copy of ${other?.provider ?? 'the maker'}'s own sheet for the same product: one document, whatever its bytes (AGENTS, "a copy is not a source")`;
      row.updated = date;
    }
    writeFileSync(LEDGER, csvText(HEADER, ledger));
  }
  missing = readdirSync(held).filter((f) => f.endsWith('.json')).length;
  if (registered.length) console.log(`  ${registered.length} already have a grade for the product: the sheet is a revision or a copy`);
  if (editions.length) console.log(`  ${editions.length} are another language edition of a sheet this batch already shapes`);
  console.log(`${shaped} twin(s) shaped by R053 and moved back into ${batch}`);
  if (copies.length) console.log(`  ${copies.length} marked duplicate-of: the same product under the shop's own name`);
  if (waiting.length) {
    console.log(`  ${waiting.length} cannot be shaped yet:`);
    const by = new Map();
    for (const w of waiting) { const k = w.replace(/^[^—]+— /, ''); by.set(k, (by.get(k) ?? 0) + 1); }
    for (const [k, n] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log(`     ${String(n).padStart(4)}  ${k.replace(/\([^)]*\)/, '(…)')}`);
  }
  if (missing) console.log(`  ${missing} left in ${batch}-held`);
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
  else if (flag('twins')) { const by = arg('by'); if (!by) { console.error('--by <name>: a review records who made it'); process.exit(2); } twins(batch, by); }
  else if (flag('finish')) finish(batch);
  else { console.error('one of --propose, --accept, --decide, --split, --twins, --finish, --holds'); process.exit(2); }
}
