#!/usr/bin/env node
// Migration m134 (2026-09-21): the reason for eleven implausible flags that carried none (OPEN-PROBLEMS §2).
//
// Batches b11 to b22 flagged eleven values physically implausible (D55) with only the batch's standard note, so a
// reader of the row could not tell why it backs nothing. The class each belongs to is in OPEN-PROBLEMS §2; this
// writes it into each row with the numbers its own sheet prints beside it. Nothing else changes.
//
//   node scripts/migrate/m134-the-reason-each-flag-was-set.mjs

import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const migration = 'm134-the-reason-each-flag-was-set';
const date = '2026-09-21';
const t = openTables();
const REASONS = {
  V006316: 'a flexural modulus of 3.8 MPa for a rigid PLA, a thousandth of what the same sheet\'s tensile modulus (3.5 GPa) and 6 % elongation require; the unit reads as GPa printed as MPa.',
  V006356: 'a flexural modulus of 3.8 MPa for a rigid PLA, a thousandth of what the same sheet\'s tensile modulus (3.5 GPa) and 6 % elongation require; the unit reads as GPa printed as MPa.',
  V008955: 'a flexural modulus of 3.8 MPa for a rigid PLA whose sheet prints a flexural strength of 83 MPa and 6 % elongation; a bar that soft could not carry that stress.',
  V008951: 'a tensile modulus of 3.6 MPa for a rigid PLA whose sheet prints a yield strength of 60 MPa at 6 % elongation at break; the stress would need a thousand times the stiffness.',
  V006409: 'a tensile modulus of 500 MPa for a PLA whose sheet prints a tensile strength of 53 MPa at 6 % elongation at break, which needs at least 900 MPa.',
  V009320: '"Tensile modulus [MPa] 1 mm/min 1,0" for an ABS, beside a tensile strength of 24.2 MPa at 5.6 % strain, which needs at least 430 MPa; the number reads as GPa under an MPa heading.',
  V008991: 'a flexural modulus of 60 MPa for a PETG, a thirtieth of a PETG\'s, beside a flexural strength of 1,170 MPa that no unfilled polymer reaches: the two numbers are swapped or misprinted.',
  V008992: 'a flexural strength of 1,170 MPa for a PETG, twenty times its tensile yield (49 MPa) and above anything an unfilled polymer reaches.',
  V009135: 'a flexural modulus of 60 MPa for a PETG, a thirtieth of a PETG\'s, beside a flexural strength of 1,170 MPa that no unfilled polymer reaches: the two numbers are swapped or misprinted.',
  V009136: 'a flexural strength of 1,170 MPa for a PETG, twenty times its tensile yield (49 MPa) and above anything an unfilled polymer reaches.',
  V006262: 'an elongation at break of 100 % for a carbon-fibre polycarbonate whose sheet prints a flexural modulus of 24,000 kg/cm² (2.4 GPa): short fibres stop a compound drawing past a few per cent. It reads as the neat resin\'s elongation.',
};
let changed = 0;
for (const [id, why] of Object.entries(REASONS)) {
  const m = t.get('measurements', id);
  if (m['Data status'] !== 'Published value (physically implausible)') throw new Error(`${migration}: ${id} is ${m['Data status']}`);
  const note = `Flagged physically implausible (D55): the sheet prints ${why} Kept as printed; it backs nothing (reason written ${date}, ${migration}).`;
  const next = withNote(m.Notes, note);
  if (next === m.Notes) continue;
  t.set('measurements', id, 'Notes', next, { expect: m.Notes });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} flag(s) given their reason`);
