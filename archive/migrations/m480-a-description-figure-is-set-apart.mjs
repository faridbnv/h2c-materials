#!/usr/bin/env node
// Migration m480 (2026-10-20): Raise3D Industrial PET GF's description figure is set apart, as its PET CF twin's is (the
// owner's rulings of 2026-10-20, D172; the executor's call on the case track T1 left open).
//
// The description of Raise3D Industrial PET GF says its tensile modulus is "over 4.1 GPa" after annealing (V013950). m473
// (D176) typed it a printed specimen from the sheet's "All specimens were annealed at 100˚C for 8h"; D172's prose rule
// (m463) took back the same sentence on Raise3D Industrial PET CF (V007190, "over 6 GPa"), a claim in prose and no row of
// the sheet's tests, as the error-class sweep had read both (m282). One reading for both: the description figure is set
// apart, and the table's own annealed XY modulus (V006923, 4130 MPa) still speaks for the product.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m480-a-description-figure-is-set-apart.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm480';
const NOTE = ' Set apart since m480 (D172): a figure in the description\'s prose, as its PET CF twin\'s V007190 is; the table\'s V006923 holds the annealed modulus.';
const t = openTables();
let n = 0;
const m = t.get('measurements', 'V013950');
if (m['Specimen type'] === 'Printed specimen') {
  t.set('measurements', 'V013950', 'Specimen type', 'Not published (do not assume printed)', { expect: 'Printed specimen', migration: MIGRATION });
  t.set('measurements', 'V013950', 'Notes', m.Notes + NOTE, { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} description figure(s) set apart`);
