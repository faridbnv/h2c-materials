#!/usr/bin/env node
// Migration m289 (2026-10-01): what a fifth random re-read of 40 profiles found, and its template families (the data
// audit's RC8). Polymaker's ABS and PLA Pro sheets run the drying cell into the bed row ("Build plate temperature
// 100-110°C 70°C/6H"), so its label is lost; Creality's sheets (3DJake) print a horizontal table whose third column is the
// "Ambient Temperature" (0-50°C); Flashforge's "Ambient Temperature for Printing" row; Raise3D's drying advice in prose
// ("Dry PET CF at 70-80°C for 8-12 hours before printing"); and Siraya Tech's "B ed Temperature", split by its text layer.
// Read by Claude Opus from the cached sheets (m289-print-settings.csv).
//
//   node scripts/migrate/m289-print-settings-tail.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm289';
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
t.save();
console.log(`${MIGRATION}: ${n} profiles corrected`);
