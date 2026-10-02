#!/usr/bin/env node
// Migration m303 (2026-10-02): an alias carries no chamber band (OPEN-PROBLEMS §12, "Five aliases still carry a researched
// chamber band"; D34, D44).
//
// PLA Basic, PLA Matte, PLA Lite, PETG Basic and PETG HF became aliases of PLA and PETG in m141 (D86), and their rows in
// chamber_bands.csv stayed: the build refused a band only on an excluded material. An alias owns no product and is never
// a candidate, and a band decides nothing anyway (D34), so no answer moves. The rows leave through the removal ledger, and
// the build now refuses a band on a family entry or an alias as it does on an excluded material (chamber-estimates.js).
// A re-run is a no-op.
//
//   node scripts/migrate/m303-no-band-on-an-alias.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm303';
const t = openTables();
const scope = new Map(t.rows('materials').map((m) => [m.MaterialID, m]));
let removed = 0;
for (const b of [...t.rows('chamber_bands')]) {
  const m = scope.get(b.MaterialID);
  if (m.Scope !== 'Family entry') continue;
  t.remove('chamber_bands', b.MaterialID, { migration: MIGRATION,
    where: `nowhere: ${m['Original name']} is a family entry (an alias since m141), which owns no product and is never a candidate, so its band decided nothing (D34, D44); its members carry their own chamber evidence` });
  removed++;
}
if (removed) t.save();
console.log(`${MIGRATION}: ${removed} band(s) on an alias removed`);
