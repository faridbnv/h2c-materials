#!/usr/bin/env node
// Migration m463 (2026-10-20): the test bars their documents say or imply were printed (the owner's ruling of 2026-10-20,
// D172).
//
// A value of a bar's property (tensile, flexural, impact, heat deflection) whose row and page leave its bar undescribed
// is set apart for good unless something on its document indicates, even implicitly, that the bar was printed (D172).
// Eleven Claude Sonnet readers read 2,265 such values on 655 pages for an indication or a counter-indication
// (docs/audits/2026-10-20-owner-rulings/evidence/reading/, INSTRUCTIONS.md and results-*.csv); the executor's second pass
// (Claude Opus 5.5) applied D172 as recorded, most specific first: the value's own row, its table, the document
// (evidence/classify.mjs, which writes evidence/classification.csv). This migration retypes the values the first reading
// found indicated, 140 (V013951 and V013952 were typed by m473, and V013950, which m473 typed too, is set apart by m480;
// m486 set back two Spectrum rows typed from a neighbour's label); the values the second reading found (the review of
// T1, F1) are m483's:
//
// - stated: Specimen type "Printed specimen" (Stratasys PC's "Physical Properties - Printed" table, which the import read
//   without its heading);
// - implied: Specimen type "Printed (implied by the document)", a value of schema/vocab/specimen-types.csv, with the words
//   that imply it and their page in Notes: a print orientation on the value's own row (SUNLU's "(X-Y) Heat Distortion"),
//   on its table's other rows (labels), print settings given for the test specimens, or a statement about how the
//   document's test specimens were made that the document does not scope to some of its tests ("All testing specimens
//   were printed under the following conditions:", "How to make specimens", "Specimen Printing Conditions").
//
// Every quote is checked on the cached, hash-checked sheet before anything is written (onCachedSheet, D35). The values
// left set apart need no edit: their Specimen type already says nothing of the bar. A re-run is a no-op; a run after the
// data moved stops.
//
//   node scripts/migrate/m463-printed-bars-the-documents-imply.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm463';
const IMPLIED = 'Printed (implied by the document)';
const STATED = 'Printed specimen';
const KIND_WORDS = {
  'own-label': 'its own row names a print orientation',
  labels: 'its table labels its other rows with a print orientation',
  heading: 'its table\'s heading names the printed part',
  settings: 'print settings are given for the test specimens',
  'other-document': 'the document says its test specimens were printed',
  document: 'the document says how its test specimens were printed, for all its tests',
  words: 'the document says the bars were printed',
};
const t = openTables();
const rows = rowsOf(join(projectRoot, 'docs/audits/2026-10-20-owner-rulings/evidence/classification.csv'))
  .filter((r) => (r.verdict === 'implied' || r.verdict === 'stated') && !/^second/.test(r.first));
let n = 0;
const checked = new Set();
for (const r of rows) {
  const m = t.get('measurements', r.measurementId);
  if (!m) throw new Error(`${MIGRATION}: no measurement ${r.measurementId}`);
  if (m.SourceID !== r.sourceId) throw new Error(`${MIGRATION}: ${r.measurementId} is on ${m.SourceID}, not ${r.sourceId}`);
  const type = r.verdict === 'stated' ? STATED : IMPLIED;
  const note = `Specimen type ${type} since ${MIGRATION} (2026-10-20, D172): ${KIND_WORDS[r.kind] ?? r.kind}, "${r.quote.replace(/\s+\|\s+/g, ' ').replace(/\s+/g, ' ')}" (p. ${r.quotePage}).`;
  if (m['Specimen type'] === type) {
    // A note first written with the sheet's own runs of spaces (TEXT-SPACING) is written again with one.
    const loose = m.Notes.split(' since ' + MIGRATION).length > 1 && !m.Notes.includes(note);
    if (loose) { t.set('measurements', r.measurementId, 'Notes', m.Notes.replace(/Specimen type [^.]* since m463 \(2026-10-20, D172\): .*\(p\. \d+\)\./, note), { expect: m.Notes, migration: MIGRATION }); n++; }
    continue;
  }
  if (!/^Not published/.test(m['Specimen type'])) throw new Error(`${MIGRATION}: ${r.measurementId} states its specimen already (${m['Specimen type']})`);
  const key = `${r.sourceId}\u0000${r.quote}`;
  if (!checked.has(key)) { onCachedSheet(t, r.sourceId, r.quote, MIGRATION); checked.add(key); }
  t.set('measurements', r.measurementId, 'Specimen type', type, { expect: m['Specimen type'], migration: MIGRATION });
  t.set('measurements', r.measurementId, 'Notes', withNote(m.Notes, note), { expect: m.Notes, migration: MIGRATION });
  n++;
}
// Raise3D's sheets say in the same note that their bars were printed and annealed: a document's statement about how its
// specimens were made speaks for its treatment as for its printing, so the heat deflections it now types printed take the
// schedule the same note states (D172 with D99). Without it an annealed bar would decide as printed.
const ANNEALED = [
  [['V013951', 'V013952'], 'All specimens were annealed at 100˚C for 8h.', 100, 8],
  [['V011569', 'V011570'], 'All specimens were annealed at 80˚C for 8h.', 80, 8],
];
for (const [ids, words, tempC, hours] of ANNEALED) {
  for (const id of ids) {
    const m = t.get('measurements', id);
    if (m['Post-processing state'] === 'annealed') continue;
    onCachedSheet(t, m.SourceID, words, MIGRATION);
    t.set('measurements', id, 'Post-processing', words, { expect: 'Not published', migration: MIGRATION });
    t.set('measurements', id, 'Post-processing state', 'annealed', { expect: 'not-stated', migration: MIGRATION });
    t.set('measurements', id, 'Anneal °C', String(tempC), { expect: 'Not applicable', migration: MIGRATION });
    t.set('measurements', id, 'Anneal h', String(hours), { expect: 'Not applicable', migration: MIGRATION });
    n++;
  }
}
// Raise3D Industrial PPS CF's description says "heat resistance (HDT 260 °C)" (V013958): a claim in prose, not a row of its
// tests, whose HDT table prints 251 °C at 0.45 MPa and 132 °C at 1.8 MPa. The first run typed it printed and annealed with
// the table's note; the executor's review took it back (it would have floored the table's own 251 °C at 260, CV63), so
// it is left as the reader round wrote it, set apart.
// Raise3D's descriptions of PET CF and PET GF say their tensile modulus is "over 6 GPa" and "over 4.1 GPa" after annealing
// (V007190, V013950): prose too, which the error-class sweep had read as no row of the tables (m282). Taken back the same way.
for (const id of ['V007190', 'V013950']) {
  const m = t.get('measurements', id);
  if (m['Specimen type'] !== IMPLIED) continue;
  t.set('measurements', id, 'Specimen type', 'Not published (do not assume printed)', { expect: IMPLIED, migration: MIGRATION });
  t.set('measurements', id, 'Notes', m.Notes.replace(/ Specimen type Printed \(implied by the document\) since m463 .*$/, ''), { expect: m.Notes, migration: MIGRATION });
  n++;
}
{
  const m = t.get('measurements', 'V013958');
  if (m['Specimen type'] === IMPLIED) {
    const before = m.Notes.replace(/ Specimen type Printed \(implied by the document\) since m463 .*$/, '');
    t.set('measurements', 'V013958', 'Specimen type', 'Not published (do not assume printed)', { expect: IMPLIED, migration: MIGRATION });
    t.set('measurements', 'V013958', 'Notes', before, { expect: m.Notes, migration: MIGRATION });
    for (const [col, now, was] of [['Post-processing', 'The specimens of HDT test were annealed at 125 ºC for 16h.', 'Not published'], ['Post-processing state', 'annealed', 'not-stated'], ['Anneal °C', '125', 'Not applicable'], ['Anneal h', '16', 'Not applicable']]) {
      t.set('measurements', 'V013958', col, was, { expect: now, migration: MIGRATION });
    }
    n++;
  }
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) retyped as printed bars their documents say or imply were printed`);
