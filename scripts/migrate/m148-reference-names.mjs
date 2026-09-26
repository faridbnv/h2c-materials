#!/usr/bin/env node
// Migration m148 (2026-09-25): three generic reference names were misspelled (PLAN-REMAINING §3.5, D67).
//
// The reference layer is a drawing layer (D13): uncited bulk envelopes, off by default, read only by the Ashby chart's
// "show reference" option. Four of its 114 names were typing errors, and each envelope says what it is:
//
// - "Standstone" is sandstone: 2240-2650 kg/m3, a modulus of 14-40 GPa, 4-15 MPa in tension and 70-90 MPa in
//   compression, filed with the stones and ceramics.
// - "Slilicon" is silicon: 2300-2350 kg/m3, 140-155 GPa, an expansion of 2-3.2 um/m/K and a toughness of 0.83-0.94
//   MPa m^0.5, beside silicon carbide and silicon nitride in the same category.
// - "Polywood parallel to board" and "... perpendicular to board" are plywood: 700-800 kg/m3, 6.9-13 GPa along the
//   board and 3.4-5.1 across it, filed under Wood between particleboard and hardboard, which take the same "parallel
//   to board" pair. (Polywood is also a Polymaker filament, which is not what a wood envelope describes.)
//
// Name is reference.csv's primary key and reference_envelopes.csv points at it, so each is a re-key through the removal
// ledger (D72): the row stays where it is, and the ledger names the key it now has. None of the four is among the ten
// drawn by default, and no other table, test or view names them.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m148-reference-names.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm148-reference-names';
const t = openTables();
const RENAME = {
  Standstone: 'Sandstone',
  Slilicon: 'Silicon',
  'Polywood parallel to board': 'Plywood parallel to board',
  'Polywood perpendicular to board': 'Plywood perpendicular to board',
};

let n = 0;
for (const [from, to] of Object.entries(RENAME)) {
  const row = t.find('reference', from);
  if (!row) {
    if (!t.find('reference', to)) throw new Error(`${migration}: reference has neither "${from}" nor "${to}"; the data moved`);
    continue;
  }
  const envelopes = t.rows('reference_envelopes').filter((e) => e.Name === from).map((e) => e.Property);
  if (envelopes.length !== 8) throw new Error(`${migration}: "${from}" has ${envelopes.length} envelopes, not the eight properties`);
  t.set('reference', from, 'Name', to, { expect: from, migration });
  for (const property of envelopes) t.update('reference_envelopes', { Name: from, Property: property }, 'Name', to, { expect: from, migration });
  n += 1 + envelopes.length;
}
if (t.rows('reference_envelopes').some((e) => RENAME[e.Name])) throw new Error(`${migration}: an envelope still names a misspelled material`);

if (n) t.save();
console.log(`${migration}: ${n} row(s) re-keyed`);
