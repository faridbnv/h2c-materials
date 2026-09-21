#!/usr/bin/env node
// Migration m94 (2026-09-20): batch b22, the sheets that state their unit once, in the label.
//
// Raise3D heads its rows "Density (g/cm³) ISO 1183, GB/T 1033 1.34" and AzureFilm "Tensile modulus [MPa]
// 1 mm/min 3,3": the unit is stated in the label and the value column holds a number and nothing else. The
// reader read none of them, because every other layout puts the unit beside the value. Thirty-one held
// documents across seven makers print at least one row that way.
//
// The rule is the hardness fallback generalised. A hardness has always stated its scale in the label and
// printed a bare number, and it is tried last for the same reason: a row that offers a "number unit" pair has
// been read by the time this is reached. It fires only where exactly one number is left after the designations,
// the label and every condition in a unit of its own are taken off, because a row offering two numbers is a row
// that needs its columns read by position, which is a different gap.
//
// Parity over all forty makers: up on three, down on none.
//
// Fifteen documents left the no-values queue. What reading them found:
//
//   - **AzureFilm heads its tensile modulus row [MPa] and prints a modulus in GPa.** Its own flexural modulus
//     row on the same sheet is headed [GPa] and prints 2,8. Five rows are recorded as printed and marked
//     physically implausible (D55), because 3.3 MPa is a thousandth of what any solid polymer reaches.
//   - **Markforged's flexural rows cite ASTM D7901**, which is the specification for dimethyl ether as a fuel.
//     The page prints "D790" with a footnote marker above it and the row assembler joins the two. The numbers
//     are right and the standard is not, so those two rows are rejected rather than recorded against a
//     standard the sheet does not print.
//   - **AzureFilm publishes one table for its PLA and its Silk PLA**, which are two materials. R053 shares a
//     formulation key between the products of one table, and one key cannot be on two materials (D12, D44).
//     Three documents are held for that, and `--twins` now refuses the shape rather than letting the applier
//     find it.
//
//   node scripts/migrate/m94-batch-b22.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b22', { migration: 'm94-batch-b22', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b22 refused:');
  console.error(error.message);
  process.exit(1);
}
