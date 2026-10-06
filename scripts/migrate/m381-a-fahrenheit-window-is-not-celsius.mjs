#!/usr/bin/env node
// Migration m381 (2026-10-05): a temperature window printed in both scales was read with its Fahrenheit numbers as
// degrees Celsius (check round 3, D131; found by the round's sealed sample on DSM's Arnitel ID 2045 guide, P1856).
//
// Nine profiles print their nozzle (and two their bed) as "210-270℃/410-518℉" or "220 - 245°C / 428 - 473°F". The
// temperature parser read every number in the cell, so the window ran from the Celsius minimum to a Fahrenheit number:
// a 210-410 °C nozzle, a 40-140 °C bed. Each of those nozzles was above the H2C's 350 °C, so each product's nozzle gate
// read "exceeds" and the tool told the team it could not print them. The parser now sets a Fahrenheit window aside
// where a Celsius one stands beside it (build/src/normalize/process.js, parseTemperature), and these profiles' typed
// windows are written from it. Each cell's Celsius window is checked on the cached sheet. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m381-a-fahrenheit-window-is-not-celsius.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';
import { cachedText } from '../lib/pdf-text.mjs';

const MIGRATION = 'm381';
const t = openTables();
const FAHRENHEIT = /\d\s*(?:°\s*F|℉)/;
let cells = 0;
const skipped = [];

for (const p of t.rows('profiles').filter((x) => !x.Profile.startsWith('Retired'))) {
  for (const column of ['Nozzle °C', 'Bed °C', 'Chamber °C']) {
    if (!FAHRENHEIT.test(p[column])) continue;
    const celsius = p[column].match(/\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*(?:°\s*C|℃)/)?.[0];
    if (!celsius) continue;
    const before = t.get('profiles', p.ProfileID);
    if (!cachedText(t.get('sources', p.SourceID)?.SHA256)) { skipped.push(p.ProfileID); continue; }
    const n = retype(t, p.ProfileID, [column], MIGRATION);
    if (!n) continue;
    onCachedSheet(t, p.SourceID, celsius.replace(/\s+/g, ' '), MIGRATION);
    const after = t.get('profiles', p.ProfileID);
    t.set('profiles', p.ProfileID, 'Locator', `${after.Locator}; ${column.replace(' °C', '')} window read in °C, its °F window set aside (${MIGRATION})`, { expect: before.Locator, migration: MIGRATION });
    cells += n;
  }
}
if (skipped.length) throw new Error(`${MIGRATION}: no cached sheet for ${skipped.join(', ')}`);
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} typed cell(s) read again with their Fahrenheit window set aside`);
