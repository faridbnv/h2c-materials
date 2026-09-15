#!/usr/bin/env node
// Migration m22: one name for the Izod test (audit 2026-09-15, findings C-17 and D-06; open item from the 2026-09-14
// transfer verification). "Izod strength" (21 rows) and "Izod impact strength" (13 rows) are the same test: D re-read
// 34 rows, all ISO 180 / GB/T 1843 (kJ/m²) or ASTM D256 (J/m). The registry gains "Replaced by"; "Izod strength" keeps
// its record and names "Izod impact strength", and its rows move there. Units and notch states stay as each source
// prints them: J/m and kJ/m², notched and unnotched, are different results and are never converted into one another.
//
// V002055 (iSANMATE PP) prints "Notched Izod Impact Strength, KJ/m2, ISO 179: NB". ISO 179 is Charpy, so which test
// it was cannot be settled from the sheet (re-read 2026-09-15); it is filed under Izod as printed, with that note.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm22';
const OLD = 'Izod strength', NEW = 'Izod impact strength';

export function migrate(t) {
  if (!t.header('properties').includes('Replaced by')) t.addColumn('properties', 'Replaced by', { after: 'Description' });
  if (t.get('properties', OLD)['Replaced by'] !== NEW) t.set('properties', OLD, 'Replaced by', NEW, { expect: null });
  for (const r of t.rows('measurements').filter((m) => m.Property === OLD)) {
    t.set('measurements', r.MeasurementID, 'Property', NEW, { expect: OLD });
    t.set('measurements', r.MeasurementID, 'Notes', withNote(r.Notes, `Property renamed 2026-09-15 (${MIGRATION}) from "${OLD}": the same test under one name.`), { expect: r.Notes });
  }
  const v = t.get('measurements', 'V002055');
  const note = 'Source error, re-read 2026-09-15: the row says Izod but cites ISO 179, the Charpy standard; the test type cannot be settled from the sheet, and no comparison may rest on it.';
  if (!v.Notes.includes(note)) t.set('measurements', 'V002055', 'Notes', withNote(v.Notes, note), { expect: v.Notes });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
