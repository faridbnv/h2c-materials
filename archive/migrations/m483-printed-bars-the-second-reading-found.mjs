#!/usr/bin/env node
// Migration m483 (2026-10-20): the test bars a second reading found its documents indicate were printed (the owner's
// ruling of 2026-10-20, D172, "if there is EVEN an implicit indication that it is correct for a filament"; the
// independent review of track T1, F1).
//
// The first reading (m463) told its readers to choose "nothing" when in doubt and to let a counter-indication win, so they
// stopped at a melt flow rate or a blank mould shrinkage row and did not report what indicated printing, and it read one
// page in eight of those whose text held a moulding or resin word. Twenty Claude Sonnet readers read again every value it
// left set apart for want of an indication and every page it never read, 2,832 values on 739 pages, under the executor's
// rubric (docs/audits/2026-10-20-owner-rulings/evidence/reading/round-2/INSTRUCTIONS.md): an indication on the same table
// (another row's or column's print direction, a printed-specimen note, a layer adhesion row), on the same document about
// its test specimens ("How to make specimens", "Valores obtenidos en especímenes impresos"), or a sentence that ties the
// value's property to the printed part (Fillamentum NonOilen's "great temperature resistance after 3D printing") keeps a
// value; a counter-indication sets it apart only when it is about the same values or table (a mould shrinkage row with a
// value, ISO 294 moulding, a resin grade's or supplier's data, a table the document calls typical beside a printed one);
// a melt flow rate never does. The executor's second pass (evidence/classify.mjs) set apart what a reader kept on a
// disclaimer that values "may vary with printing conditions", which names no test or specimen, and kept a sentence's
// values only where it names their property on the printed part; every judgement call is listed in evidence/DOUBTFUL.md.
// This migration retypes the 233 values the second reading found indicated (of 2,832 it read), as m463 did the first's:
//
// - stated: Specimen type "Printed specimen" (the document says in words that its test specimens were printed);
// - implied: Specimen type "Printed (implied by the document)", with the words that imply it and their page in Notes.
//
// Every quote is checked on the cached, hash-checked sheet before anything is written (onCachedSheet, D35), and written
// in Notes in its compatible form (a full-width colon or bracket as an ASCII one, TEXT-FULLWIDTH). The values
// left set apart need no edit. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m483-printed-bars-the-second-reading-found.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm483';
const IMPLIED = 'Printed (implied by the document)';
const STATED = 'Printed specimen';
const KIND_WORDS = {
  'own-label': 'its own row names a print orientation',
  labels: 'its table labels its other rows with a print orientation',
  heading: 'its table\'s heading names the printed part',
  settings: 'print settings are given for the test specimens',
  document: 'a statement on the document about its test specimens reaches it',
  sentence: 'a sentence on the document names this property of the printed part',
  words: 'the document says its test specimens were printed',
};
const t = openTables();
const rows = rowsOf(join(projectRoot, 'docs/audits/2026-10-20-owner-rulings/evidence/classification.csv'))
  .filter((r) => (r.verdict === 'implied' || r.verdict === 'stated') && /^second/.test(r.first));
let n = 0;
const checked = new Set();
for (const r of rows) {
  const m = t.get('measurements', r.measurementId);
  if (!m) throw new Error(`${MIGRATION}: no measurement ${r.measurementId}`);
  if (m.SourceID !== r.sourceId) throw new Error(`${MIGRATION}: ${r.measurementId} is on ${m.SourceID}, not ${r.sourceId}`);
  const type = r.verdict === 'stated' ? STATED : IMPLIED;
  if (m['Specimen type'] === type) continue;
  if (!/^Not published/.test(m['Specimen type'])) throw new Error(`${MIGRATION}: ${r.measurementId} states its specimen already (${m['Specimen type']})`);
  const key = `${r.sourceId}\u0000${r.quote}`;
  if (!checked.has(key)) { onCachedSheet(t, r.sourceId, r.quote, MIGRATION); checked.add(key); }
  const note = `Specimen type ${type} since ${MIGRATION} (2026-10-20, D172, the second reading): ${KIND_WORDS[r.kind] ?? r.kind}, "${r.quote.normalize('NFKC').replace(/\s+\|\s+/g, ' ').replace(/\s+/g, ' ')}" (p. ${r.quotePage}).`;
  t.set('measurements', r.measurementId, 'Specimen type', type, { expect: m['Specimen type'], migration: MIGRATION });
  t.set('measurements', r.measurementId, 'Notes', withNote(m.Notes, note), { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) retyped as printed bars the second reading found their documents indicate`);
