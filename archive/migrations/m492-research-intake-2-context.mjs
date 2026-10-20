#!/usr/bin/env node
// Migration m492 (2026-10-20): what the context audit found on the new pages (research intake 2, stage 3;
// docs/audits/2026-10-20-research-intake-2/). Kexcelled's impact row is labelled "Notch impact strength (KJ/m²)", with
// footnote 3 "notch type: type A": its three Charpy values (X,Y, X,Z and Z,X) are of notched bars, which m489 left Not
// published (CONTEXT-NOTCH). Each quote is checked on the cached sheet. A re-run is a no-op.
//
//   node scripts/migrate/m492-research-intake-2-context.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm492';
const KEX = 'R-KEXCELLED-INTAKE-20261020-92a1f96a864b';
const t = openTables();
onSheet(t, KEX, 'Notch impact strength（KJ/m） 15~20 34~48 3~6 | 3. notch type: type A', MIGRATION);
let set = 0;
for (const m of t.rows('measurements').filter((x) => x.SourceID === KEX && x.Property === 'Charpy strength')) {
  if (m.Notch === 'Notched') continue;
  t.set('measurements', m.MeasurementID, 'Notch', 'Notched', { expect: 'Not published', migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Notch (${MIGRATION}): the row is "Notch impact strength", and footnote 3 gives "notch type: type A".`, { expect: m.Notes, migration: MIGRATION });
  set++;
}
if (set !== 0 && set !== 3) throw new Error(`${MIGRATION}: ${set} Charpy rows, not Kexcelled's three`);
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, set, written: false })); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, set }));
