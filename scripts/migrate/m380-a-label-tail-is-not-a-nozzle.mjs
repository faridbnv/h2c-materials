#!/usr/bin/env node
// Migration m380 (2026-10-05): Spectrum's nozzle row answered twice (check round 3, D131; the round's blind draw,
// docs/audits/2026-10-05-check-round-3/blind-draw/verdicts-20261009.csv, found it on three profiles, and the sweep on
// every profile of the template).
//
// Spectrum's sheets (and The Filament's TPU sheets on 3DJake) print one row "Ruby or hardened nozzle | not necessary" (or
// "recommended", or for The Filament's TPUs "Ruby or hardened nozzle recommended | No"). The import held the row whole in
// Abrasion / clogging, which the parser reads and which decides the hardened-nozzle answer, and copied its last words
// into Nozzle material as well: 68 profiles held "not necessary" or "recommended" there, as if those were a nozzle's
// material. The Filament's TPUs showed "recommended" for a sheet that answers No. The sheets name no nozzle material, so
// the cell says so; the answer stays in Abrasion / clogging, and no hardened-nozzle reading moves. Each sheet's row is
// checked on its cached page. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m380-a-label-tail-is-not-a-nozzle.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm380';
const NP = 'Not published';
const TAIL = /^(?:not necessary|recommended|necessary|not recommended)$/i;
const t = openTables();
const checked = new Set();
let cells = 0;

for (const p of t.rows('profiles').filter((x) => !x.Profile.startsWith('Retired') && TAIL.test(x['Nozzle material'].trim()) && /Ruby or hardened nozzle/i.test(x['Abrasion / clogging']))) {
  if (!checked.has(p.SourceID)) { onCachedSheet(t, p.SourceID, 'Ruby or hardened', MIGRATION); checked.add(p.SourceID); }
  const before = t.get('profiles', p.ProfileID)['Hardened nozzle'];
  t.set('profiles', p.ProfileID, 'Nozzle material', NP, { expect: p['Nozzle material'], migration: MIGRATION });
  retype(t, p.ProfileID, ['Nozzle material'], MIGRATION);
  if (t.get('profiles', p.ProfileID)['Hardened nozzle'] !== before) throw new Error(`${MIGRATION}: ${p.ProfileID}'s hardened-nozzle reading moved; its abrasion line does not answer alone`);
  cells++;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} nozzle-material cell(s) that held the end of the nozzle row's label now say the sheet names none`);
