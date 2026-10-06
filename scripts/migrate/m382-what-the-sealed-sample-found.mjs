#!/usr/bin/env node
// Migration m382 (2026-10-05): what check round 3's sealed sample found, swept (D131; the sample of 100 records the
// answers rest on, drawn before the round read anything and read at its end: docs/audits/2026-10-05-check-round-3/
// blind-draw/draw-b-verdicts-20261005.csv).
//
// The sample found two errors in what decides, and m381 fixed the first (a Fahrenheit window read as Celsius, nine
// products). This fixes the other and a template's garble the sample found beside it:
// - colorFabb's PA sheet and page say "If absorbed moisture levels are too high, users will see excessive oozing ...
//   Drying is advised using filament dryers, drying temperature set at 70-80C for 4-6 hours"; the two profiles held the
//   schedule without its condition, so drying read as required. They hold the sentence whole, and it reads optional.
// - 3DXTECH's sheets print "Tensile Strength | ISO 527 | MPa | 55"; the import joined the method's number with the unit
//   and held "527 MPa ISO 527" (or "178 MPa ISO 178") as the standard and load on 134 values, as it held "0.45 °C ISO 75"
//   on others (m377). Each now holds its standard.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m382-what-the-sealed-sample-found.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm382';
const t = openTables();
let cells = 0;

const CONDITIONAL = 'If absorbed moisture levels are too high, users will see excessive oozing of material on travelmoves and rough outer surface of printed parts. Drying is advised using filament dryers, drying temperature set at 70-80C for 4-6 hours.';
for (const id of ['P1170', 'P1660']) {
  const p = t.get('profiles', id);
  if (p.Drying === CONDITIONAL) continue;
  for (const q of ['If absorbed moisture levels are too high, users will', 'using filament dryers, drying temperature set at 70-80C for 4-6 hours.']) onCachedSheet(t, p.SourceID, q, MIGRATION);
  t.set('profiles', id, 'Drying', CONDITIONAL, { expect: p.Drying, migration: MIGRATION });
  cells += 1 + retype(t, id, ['Drying'], MIGRATION);
  const after = t.get('profiles', id);
  t.set('profiles', id, 'Locator', `${after.Locator}; Drying with its condition (${MIGRATION})`, { expect: after.Locator, migration: MIGRATION });
}

const checked = new Set();
for (const m of t.rows('measurements').filter((x) => !x['Data status'].startsWith('Retired'))) {
  const g = /^(\d+)\s*(?:MPa|GPa|%|°C)\s+(ISO|ASTM D?)\s?(\d+)$/.exec(m['Standard / load']);
  if (!g || g[1] !== g[3]) continue;
  const standard = `${g[2].startsWith('ASTM') ? 'ASTM D' : 'ISO '}${g[3]}`;
  if (!checked.has(`${m.SourceID} ${standard}`)) { onCachedSheet(t, m.SourceID, standard, MIGRATION); checked.add(`${m.SourceID} ${standard}`); }
  t.set('measurements', m.MeasurementID, 'Standard / load', standard, { expect: m['Standard / load'], migration: MIGRATION });
  cells++;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s): colorFabb PA's drying with its condition, and 3DXTECH's standards without the number joined to a unit`);
