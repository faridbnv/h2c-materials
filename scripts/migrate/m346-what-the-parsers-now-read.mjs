#!/usr/bin/env node
// Migration m346 (2026-10-04): profile cells the parsers could not read, which they read now (the reader round, D125).
//
// The reader round's new profiles put seven raw cells in front of the parsers that they left unread (PARSE-UNREAD), and
// build/src/normalize/process.js is taught their wordings in this change:
//   - "At least closed chamber, passively heated" (BASF Ultrafuse ASA, P0747) and "non-heated printing camber" (Raise3D
//     PPS-CF, P0909): a closed printer with no heater set, read as no heated chamber needed;
//   - "enclosed and heated chamber recommended" (Fiberlogy PA12, P1475): a recommendation with no temperature (D33);
//   - SUNLU's lone "/" in a bed row (P1612, P1614): no setpoint printed, as BASF's lone dash;
//   - SUNLU's "该材料无需热床即可成功打印" (P1613: the material prints without a heated bed) and "室温" (P1796: room temperature).
// Each profile's typed cells are read again by the parsers, except a column its Parse review explains (D115). It runs
// before the batch migration m352, whose build check reads every profile with the parsers as they now stand. A re-run is
// a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m346-what-the-parsers-now-read.mjs
import { openTables } from '../data/table-io.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm346';
const PROFILES = ['P0747', 'P0909', 'P1475', 'P1612', 'P1613', 'P1614', 'P1796'];
const t = openTables();
let retyped = 0;
for (const id of PROFILES) {
  const r = t.get('profiles', id);
  const reviewed = reviewFields(r) ?? new Set();
  const typed = typedOf(r);
  for (const c of Object.values(TYPED).flat()) {
    if (reviewed.has(c) || r[c] === typed[c]) continue;
    t.set('profiles', id, c, typed[c], { expect: r[c], migration: MIGRATION });
    retyped++;
  }
}
if (retyped) t.save();
console.log(`${MIGRATION}: ${retyped} typed cell(s) read again on ${PROFILES.length} profile(s)`);
