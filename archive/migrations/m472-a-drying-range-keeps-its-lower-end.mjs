#!/usr/bin/env node
// Migration m472 (2026-10-20): a drying schedule printed as a range keeps its lower end beside its upper one (D175).
//
// The owner's ruling of 2026-10-20 (GOALS-LOG, item 14; OPEN-PROBLEMS §37.16): "If possible show range." The drying
// parser reads a window at its upper end (Raise3D Industrial PPA GF's "Please dry the filament at 80-100°C for 6-12
// hours", P1151, is typed 100 °C for 12 h), and the typed columns held only that end, so a product's drying and its
// material's typical drying read 100 °C where the maker's own sheet begins at 80. profiles.csv and print_guide.csv gain
// Drying min °C and Drying min hours: the lower end of the window that decides, where the cell prints one, else Not
// applicable. Every rule still reads the upper end (Drying °C, Drying hours); the lower ends are shown, never judged, so no
// drying answer moves (the drying gate asks only whether a sheet speaks of drying).
//
// Each cell is the parser's own reading (scripts/lib/profile-settings.mjs typedOf, the build's parseDrying), which this
// round taught "4 to 16 hours" as a window (BASF's and Raise3D's wording; no upper end moved). Four profiles whose
// temperature the parser cannot read (a degree printed "º", or no unit) have a reviewed Drying °C already: their lower end
// is typed by hand from the same cell, checked on the cached sheet, and their Parse review names the new column too.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m472-a-drying-range-keeps-its-lower-end.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { typedOf } from '../../scripts/lib/profile-settings.mjs';
import { parseDrying } from '../../build/src/normalize/process.js';

const MIGRATION = 'm472';
const NA = 'Not applicable';
const MIN_C = 'Drying min °C', MIN_H = 'Drying min hours';
const t = openTables();
let changed = 0;

const cell = (v) => (v == null ? NA : String(v));
for (const [table, after, reading] of [['profiles', 'Drying need', (r) => typedOf(r)], ['print_guide', 'Drying need', (r) => {
  const d = parseDrying(r.Drying);
  return { [MIN_C]: cell(d.tempMinC), [MIN_H]: cell(d.hoursMin) };
}]]) {
  if (!t.header(table).includes(MIN_C)) { t.addColumn(table, MIN_C, { after, fill: (r) => reading(r)[MIN_C] }); changed++; }
  if (!t.header(table).includes(MIN_H)) { t.addColumn(table, MIN_H, { after: 'Drying °C', fill: (r) => reading(r)[MIN_H] }); changed++; }
}

// The four profiles whose temperature the parser cannot read: the lower end the cell prints, and the review that says so.
// [profile, its Drying cell, the quote on the sheet (Eryone prints a full-width comma the cell writes as ","), low, high]
const HAND = [
  ['P0441', '60 -65 ,6-8h', 60, 65, 'Drying conditions | 60 -65 | 6-8h'],
  ['P0907', 'Please dry the filament at 50 - 60 ºC for 6 - 12 hours', 50, 60],
  ['P0918', 'Please dry the filament at 60 - 70 ºC for 6 - 8 hours', 60, 70],
  ['P1263', 'Please dry the filament at 80 - 100 ºC for 6-12 hours', 80, 100],
];
for (const [id, drying, low, high, quote] of HAND) {
  const r = t.get('profiles', id);
  if (r.Drying !== drying || r['Drying °C'] !== String(high)) throw new Error(`${MIGRATION}: ${id} is not the cell it was`);
  if (r[MIN_C] === String(low)) continue;
  onSheet(t, r.SourceID, quote ?? drying, MIGRATION);
  t.set('profiles', id, MIN_C, String(low), { expect: NA, migration: MIGRATION });
  const review = r['Parse review'];
  if (!review.startsWith('Fields: Drying °C. ')) throw new Error(`${MIGRATION}: ${id}'s Parse review is not the one it was`);
  t.set('profiles', id, 'Parse review', `Fields: ${MIN_C}, Drying °C. ${review.slice('Fields: Drying °C. '.length)} Drying min °C is the window's lower end, ${low}, read the same way (${MIGRATION}, D175).`,
    { expect: review, migration: MIGRATION });
  changed++;
}

if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
