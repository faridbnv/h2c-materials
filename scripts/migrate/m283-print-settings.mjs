#!/usr/bin/env node
// Migration m283 (2026-10-01): print settings a profile's own sheet prints under labels the import did not know, found
// once `npm run audit:context` learned to look for them (the data audit's RC8, its regression cases R50–R52).
//
// The guard first read only bed and nozzle windows and a hardened-nozzle answer. Taught a drying schedule ("Drying temp.
// and time 75°C/6H", Polymaker's label, on 35 profiles), an enclosure ask ("it is recommended to use an enclosure",
// "Enclosed chamber required No") and a chamber window ("Recommended environmental temperature 40 - 60 (˚C)", "Build
// chamber temperature 160 - 230 °C"), it found 53 settings no profile held. Each is the sheet's own text, read from the
// cached sheet by Claude Opus (m283-print-settings.csv); the raw cell takes it, and its typed columns the parsers'
// reading, as m279 did. Two parser blind spots went with them: an answered question ("required No") read as a
// recommendation, and a build chamber above 200 °C read as a single point (P0888, "160 - 230 °C", typed 160–160).
//
//   node scripts/migrate/m283-print-settings.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm283';
const here = dirname(fileURLToPath(import.meta.url));
const TYPED = { 'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'] };
const t = openTables();
const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
let n = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-print-settings.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, r.SourceID, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  const row = t.get('profiles', e.id);
  const typed = typedOf(row);
  for (const c of TYPED[e.column]) if (row[c] !== typed[c]) t.set('profiles', e.id, c, typed[c], { expect: row[c], migration: MIGRATION });
  n++;
}
// P0888's "160 - 230 °C" was typed with the only end the old 200 °C window let through.
{
  const row = t.get('profiles', 'P0888');
  const typed = typedOf(row);
  if (row['Chamber max °C'] !== typed['Chamber max °C']) { t.set('profiles', 'P0888', 'Chamber max °C', typed['Chamber max °C'], { expect: '160', migration: MIGRATION }); n++; }
}
t.save();
console.log(`${MIGRATION}: ${n} settings read from the profiles' own sheets`);
