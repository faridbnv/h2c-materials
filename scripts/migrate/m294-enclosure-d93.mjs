#!/usr/bin/env node
// Migration m294 (2026-10-02): D93 for the enclosure statements the profile root-cause sweep recorded or uncovered.
//
// D93 reads a maker's own "enclosure needed" or "recommended", with no chamber temperature, as printable in the H2C's
// heated chamber for the types Bambu Lab's Filament Guide asks an enclosure for, and a profile declares it in its typed
// columns (Chamber state enclosed, requirement recommended) with a Parse review saying so. m290 recorded two such
// statements that had been missed (3D-Fuel's "works best with an enclosed print area", eSUN's "print in a printer with
// a closed chamber"), and each is declared here as m190 declared the others, unless another profile of the product
// states its chamber.
//
//   node scripts/migrate/m294-enclosure-d93.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm294';
const t = openTables();
const enclosedTypes = new Set(t.rows('print_guide_materials').filter((m) => t.get('print_guide', m.PrintGuideID)?.['Chamber state'] === 'enclosed').map((m) => m.MaterialID));
let n = 0;
for (const r of t.rows('profiles')) {
  if (r.Profile === 'Retired duplicate record' || !enclosedTypes.has(r.MaterialID)) continue;
  if (r['Enclosure state'] !== 'recommended' || r['Chamber °C'] !== 'Not published' || r['Chamber state'] !== 'unknown') continue;
  // A chamber another profile of the product states decides instead (PROCESS-ENCLOSED).
  if (t.rows('profiles').some((o) => o.GradeID === r.GradeID && o !== r && o.Profile !== 'Retired duplicate record' && o['Chamber °C'] !== 'Not published')) continue;
  const why = `Fields: Chamber state, Chamber requirement. Chamber state enclosed (requirement recommended) is D93 (${MIGRATION}), not a reading of a chamber row, which this sheet does not print: its maker asks for an enclosure ("${r.Enclosure}") and states no chamber temperature, and for a type Bambu Lab's Filament Guide asks to print with an enclosure, the H2C's heated chamber is that enclosure.`;
  const review = r['Parse review'] === 'Not applicable' ? why : `${why} ${r['Parse review'].replace(/^Fields:\s*([^.]*)\.\s*/, '')}`;
  t.set('profiles', r.ProfileID, 'Chamber state', 'enclosed', { expect: 'unknown', migration: MIGRATION });
  t.set('profiles', r.ProfileID, 'Chamber requirement', 'recommended', { expect: r['Chamber requirement'], migration: MIGRATION });
  t.set('profiles', r.ProfileID, 'Parse review', review, { expect: r['Parse review'], migration: MIGRATION });
  n++;
}
t.save();
console.log(`${MIGRATION}: ${n} profiles declare the H2C's chamber their maker's enclosure (D93)`);
