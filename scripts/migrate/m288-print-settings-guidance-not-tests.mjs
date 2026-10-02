#!/usr/bin/env node
// Migration m288 (2026-10-01): print guidance against test-bar settings, and the last labels a fourth random re-read of
// 40 profiles found (the data audit's RC8).
//
// eSUN's sheets print two blocks of the same rows: "Recommended printing parameters" and, lower down, the "Print test
// condition" its test bars were printed at. The import took the test block on 25 profiles (35 cells: "230-270℃ / 100℃"
// where the guidance is "240 - 270℃ / 95 - 110°C"). 3DXTECH's THERMAX sheets print only "Printed Specimen Conditions"
// ("Extrusion Temp: 380-400°C, Bed Temp: 130-140°C"); m170 ruled such settings are not guidance, and six profiles still
// held them. SUNLU prints a "Room Temp. | Room Temperature" row on 37 sheets, which the import did not know; Polymaker's
// FIBERON sheets ran their "Cooling fan" cell into "Room Temp."; Recreus misspells its nozzle row ("Printing
// termperatures"), Fillamentum prints its at-least bed as "Hot pad 100+ °C", and 3DXTECH's product page says in prose
// that a hardened steel nozzle is strongly recommended. `npm run audit:context` now reads a sheet block by block, so a
// test block no longer hides the guidance beside it, and lists all of these. Read by Claude Opus from the cached sheets.
//
//   node scripts/migrate/m288-print-settings-guidance-not-tests.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm288';
const here = dirname(fileURLToPath(import.meta.url));
const TYPED = { 'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'], 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'], 'Abrasion / clogging': ['Hardened nozzle'] };
const t = openTables();
const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
const retype = (id, columns) => { const row = t.get('profiles', id); const typed = typedOf(row); for (const c of columns) if (row[c] !== typed[c]) t.set('profiles', id, c, typed[c], { expect: row[c], migration: MIGRATION }); };
let n = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-print-settings.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, r.SourceID, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  retype(e.id, TYPED[e.column]);
  n++;
}
// 3DXTECH THERMAX: specimen conditions are not guidance (m170).
for (const id of ['P0091', 'P0122', 'P0123', 'P0127', 'P0129', 'P0131']) {
  const r = t.get('profiles', id);
  if (/not printing guidance/.test(r.Locator)) continue;
  onSheet(t, r.SourceID, 'Printed Specimen Conditions', MIGRATION);
  for (const c of ['Nozzle °C', 'Bed °C']) if (r[c] !== 'Not published') t.set('profiles', id, c, 'Not published', { expect: r[c], migration: MIGRATION });
  t.set('profiles', id, 'Locator', 'p. 1: Printed Specimen Conditions, which are not printing guidance (m170, m288)', { expect: r.Locator, migration: MIGRATION });
  retype(id, [...TYPED['Nozzle °C'], ...TYPED['Bed °C']]);
  n++;
}
t.save();
console.log(`${MIGRATION}: ${n} profiles corrected`);
