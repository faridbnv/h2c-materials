#!/usr/bin/env node
// Migration m287 (2026-10-01): print settings held in part, found by a second random re-read of 40 profiles after m285
// and by the guard taught to compare every cell, not only the empty ones (the data audit's RC8, its last tail).
//
// The second control found 8 of 40 profiles wrong. Most were cells that hold part of what the sheet prints: Eryone's
// drying schedules cut before their hours ("80~85℃, 12h" held as "80~85℃"), a bed "140 ºC +" held without its "+", a
// nozzle typed from a split number ("240 - 28 0 °C"), a specimen's print temperature held as the guidance (3D4Makers
// PCL, "Nozzletemp: 140°C" beside "NozzleTemperature 130-170°C"), an enclosure cell holding the tail of the sentence before
// it. The import's value reader cut "º" degrees, a trailing "+" and the hours after a comma (scripts/ingest/propose.mjs,
// settingValue); it reads them now, and the guard compares the numbers each cell states with the reader's. The rest were
// labels it did not know ("Bottom plate temperature", SUNLU's "Room Temp." row, Recreus's "Hardened steel or ruby-type").
// Flashforge's "Room temperature~60℃ (40℃ recommended)" was typed 40–60: the recommended point is no longer an end.
// Each row of m287-print-settings.csv was read by Claude Opus from the cached sheet.
//
//   node scripts/migrate/m287-print-settings-whole.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm287';
const here = dirname(fileURLToPath(import.meta.url));
const TYPED = { 'Nozzle °C': ['Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'], 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'], Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'], 'Abrasion / clogging': ['Hardened nozzle'] };
const t = openTables();
const typedOf = (row) => profileCellsFromParsed({
  nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
  chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
});
const retype = (id, columns) => {
  const row = t.get('profiles', id); const typed = typedOf(row); let n = 0;
  for (const c of columns) if (row[c] !== typed[c]) { t.set('profiles', id, c, typed[c], { expect: row[c], migration: MIGRATION }); n++; }
  return n;
};
let n = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-print-settings.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, r.SourceID, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  retype(e.id, TYPED[e.column]);
  n++;
}
// A recommended point inside a window is not one of its ends (Flashforge, and one "not required (45°C recommended)").
for (const id of ['P0364', 'P0459', 'P0472', 'P0474', 'P0475', 'P0476', 'P0477', 'P0480', 'P0482', 'P0483', 'P0485', 'P0552', 'P1009']) n += retype(id, TYPED['Bed °C']) ? 1 : 0;
t.save();
console.log(`${MIGRATION}: ${n} profiles corrected`);
