#!/usr/bin/env node
// Migration m279 (2026-10-01): print settings a profile's own sheet prints and the profile did not hold (the data
// audit's RC8). The import knew neither "Print Platform Temp." nor several other labels sheets print their bed and nozzle
// under (the lexicon learns them in this sweep); `npm run audit:context` listed every profile whose own cached sheet prints
// a window it lacks. An agent read each setting from the sheet (m279-print-settings.csv). The raw cell takes the sheet's
// words, and its typed columns the parser's reading of them, as m08 typed every profile.
//
//   node scripts/migrate/m279-print-settings.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm279';
const here = dirname(fileURLToPath(import.meta.url));
const TYPED = { 'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'], 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'], 'Abrasion / clogging': ['Hardened nozzle'] };
const t = openTables();
let cells = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-print-settings.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, e.source, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  const row = t.get('profiles', e.id);
  const typed = profileCellsFromParsed({
    nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
  });
  for (const c of TYPED[e.column]) if (row[c] !== typed[c]) t.set('profiles', e.id, c, typed[c], { expect: row[c], migration: MIGRATION });
  cells++;
}
t.save();
console.log(`${MIGRATION}: ${cells} settings read from the profiles' own sheets`);
