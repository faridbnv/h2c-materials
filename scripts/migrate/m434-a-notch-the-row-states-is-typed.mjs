#!/usr/bin/env node
// Migration m434 (2026-10-17): an impact value's notch, typed where its own row states it (D142 round, step 5).
//
// Found on PCTG-GF's page, where Fiberlogy PCTG+GF10's 60 kJ/m² Izod read "notch not stated" beside its own words,
// "Izod impact strength (uncharved) @ 23°C" (the reader had written "ISO 180; unnotched" in Standard / load; Fiberlogy's
// data sheet prints the same 60 kJ/m² as "Izod Impact Strength (Unnotched)", V010863). Nine impact rows, all entered by
// m342 from page reads, state their notch on their own line and carry Notch "Not published"; the context audit looked
// only for a row that says the opposite of its line (CONTEXT-NOTCH), not for one that says nothing. Read by Claude Opus
// on each cached sheet, every quote checked here:
//   unnotched, Fiberlogy's product pages, "(uncharved)": V012170 PCTG+CF10, V012173 PCTG+GF10, V012180 R-Nylon,
//     V013165 Nylon PA12+CF15 (Charpy), V013172 MATTE PET-G;
//   notched: V012213 Fishy Filaments Porthcurno ("Charpy impact strength 5 kJ/m² ISO 180 notched, 23 °C": the sheet's
//     own Charpy-with-ISO-180 is kept as printed), V012233 Flashforge TPU 64D ("Notch impact strength(X-Y)"), V013803
//     QIDI ToughPETG-HF ("缺口冲击强度（X-Y）", notched impact strength, above its English "Charpy impact strength"), and
//     V012712, colorFabb PLA Regrind's held-back copy of PLA Premium's row ("Impact Strength Charpy Notch, ISO 179").
// The context audit now flags a line that states a notch beside a row that states none (scripts/audit/context-witness.mjs).
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m434-a-notch-the-row-states-is-typed.mjs
import { openTables } from '../data/table-io.mjs';
import { onSheet } from '../lib/sweep-shared.mjs';

const MIGRATION = 'm434';
const DATE = '2026-10-17';
const ROWS = [
  ['V012170', 'Unnotched', 'Izod impact strength (uncharved) @ 23°C'],
  ['V012173', 'Unnotched', 'Izod impact strength (uncharved) @ 23°C'],
  ['V012180', 'Unnotched', 'Izod impact strength (uncharved) @ 23°C'],
  ['V013165', 'Unnotched', 'Charpy impact strength (uncharved) @ 23°C'],
  ['V013172', 'Unnotched', 'Izod impact strength (uncharved) @ 23°C'],
  ['V012213', 'Notched', 'ISO 180 notched, 23 °C'],
  ['V012233', 'Notched', 'Notch impact strength(X-Y) 62~66'],
  ['V013803', 'Notched', '缺口冲击强度（X-Y） | 16.39 ± 2.16'],
  ['V012712', 'Notched', 'Impact Strength Charpy Notch, ISO 179 4,0'],
];

const t = openTables();
let n = 0;
for (const [id, notch, quote] of ROWS) {
  const row = t.get('measurements', id);
  if (!/Izod|Charpy|Impact/i.test(row.Property)) throw new Error(`${MIGRATION}: ${id} is ${row.Property}, not an impact value`);
  onSheet(t, row.SourceID, quote, MIGRATION);
  if (row.Notch === notch) continue;
  t.set('measurements', id, 'Notch', notch, { expect: 'Not published', migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${row.Notes} Notch ${notch} since ${MIGRATION} (${DATE}): the row's own line states it ("${quote.split(' | ')[0]}").`, { expect: row.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} impact value(s) given the notch their own line states`);
