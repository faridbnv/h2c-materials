#!/usr/bin/env node
// Migration m86 (2026-09-20): batch b16, QIDI's library, which this session held b14 for.
//
// QIDI prints the property in Chinese on one baseline, the standard and the value on the next, and English on
// the one after. Read as lines, "ISO 1183 1.07g/cm3" names no property at all, and the rows that did read took
// whatever label had been held from further up the page: a Young's modulus of 2317 MPa was recorded as a
// tensile yield strength, and a heat deflection at 0.45 MPa as a Vicat point. m85 taught the reader to prefer
// the label beside the row to one carried down to it, to read a label that stands on both sides of a row, and
// to read the fifteen Chinese labels this maker and SUNLU print.
//
// Thirteen documents enter. The other sixteen are held, and why is worth saying:
//
//   Ten head their tables "Method | Molded | X-Y Axis | Z Axis" and print three results on one line
//   ("ISO 75 0.45MPa 57.6C 55.3C 56.6C"). Read as one value the reader takes the first, which is the injection
//   moulded bar, and records it as the product's. Refusing such a row inside the reader was tried and measured:
//   it cost 297 values the database already holds, across twenty makers, because a sheet prints two results on
//   one line for good reasons as often as bad ones. So the batch holds the document instead, and the reason is
//   in the ledger.
//
//   Five were read optically and wait for somebody against the page image; one has nothing left after its only
//   row was rejected.
//
// Three rows are rejected as misreadings. Two are sentences: "the stress range of the Z,X-axis modulus:
// 10~20MPa" is the sheet talking about its own figure, and a flexural modulus of 10 MPa is a thousandth of what
// a PLA bends at. The third is a label: the sheet lists an elongation at break and then a stress at 100 %, at
// 200 % and at 300 %, and the 100 in the second one's label is not the first one's value.
//
// Five findings are accepted with a reason apiece, four of them ASA-Aero's: a foaming filament prints at a
// fraction of the density of the ASA it is made from, and its strength and stiffness fall with it.
//
//   node scripts/migrate/m86-batch-b16.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b16', { migration: 'm86-batch-b16', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b16 refused:');
  console.error(error.message);
  process.exit(1);
}
