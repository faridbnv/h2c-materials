#!/usr/bin/env node
// Migration m118 (2026-09-21): conditions the sheets state and the rows were recorded without.
//
// The second read (R085) sampled 564 applied rows and disagreed with 145; 84 of them were a condition the sheet
// states and the row does not record — the specimen form, the notch, the load, the test temperature — and 51 a
// standard the sheet names. Most were recorded before the reader learned to read them: colorFabb's "Mechanical
// Properties – 3D Printed" and "– Injection Molded*" headings, Polymaker's "Tested with 3D printed specimen",
// Fiberlogy's "3D Printed Sample Properties", a melt-flow row's own temperature.
//
// The sample found the class; the table holds the rest (PLAN-REMAINING 1.6). Every recorded source with a cached
// document was re-proposed with the current reader (1,079 documents), and each recorded row matched to the fresh
// row with the same property, normalized value and label (9,184 rows). Where the record leaves a condition
// unstated and the fresh reading states it, the fresh reading is written: 515 fields on 484 rows, pinned in
// m118-conditions-the-sheets-state.csv so the history does not depend on what a later reader reads. No value moves,
// and a field the record already states is never changed, except a method cell that gains the load its typed
// column now states (15 rows: "ISO 75" becomes the sheet's "0.45 ISO 75", which is what PARSE-MISMATCH reads).
//
//   node scripts/migrate/m118-conditions-the-sheets-state.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm118-conditions-the-sheets-state';
const here = dirname(fileURLToPath(import.meta.url));
const edits = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const byRow = new Map();
for (const e of edits) (byRow.get(e.MeasurementID) ?? byRow.set(e.MeasurementID, []).get(e.MeasurementID)).push(e);

const t = openTables();
let changed = 0;
for (const [id, list] of byRow) {
  const set = Object.fromEntries(list.map((e) => [e.Field, [e.Recorded, e.Fresh]]));
  const said = list.map((e) => `${e.Field} ${e.Fresh}`).join('; ');
  changed += correct(t, { source: list[0].SourceID, ids: [id], set, migration, date: '2026-09-21',
    note: `re-read with the current reader, the sheet states ${said} (${list[0].FreshLocator}); the value is unchanged.` });
}
// A row now known to be a moulded bar, a film or a filament strand backs no printed headline (D55): a headline
// that selected one cites it as context, and the material is estimated as one whose sheets publish no printed part is.
const PRINTED_ONLY = /^(Raw material value|Film specimen|Filament)/;
for (const h of t.rows('headlines')) {
  if (h.Use !== 'value') continue;
  const m = t.find('measurements', h.MeasurementID);
  if (!m || !PRINTED_ONLY.test(m['Specimen type'] ?? '') || !byRow.has(m.MeasurementID)) continue;
  t.update('headlines', { MaterialID: h.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID }, 'Use', 'context', { expect: 'value' });
  console.log(`${migration}: ${h.MaterialID} ${h.HeadlineKey} now cites ${h.MeasurementID} as context: the sheet says it is a ${m['Specimen type']}`);
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} row(s) gained the conditions their sheet states`);
