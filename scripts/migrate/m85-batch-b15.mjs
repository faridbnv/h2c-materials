#!/usr/bin/env node
// Migration m85 (2026-09-20): batch b15, the sheets whose own title the reader was throwing away.
//
// Twenty-four documents SIDDAMENT and 3DJake serve, held since b12 because the reader could find no name on
// their pages. It could: the name was on the first line, in front of the words that announce the sheet.
// SIDDAMENT heads twenty-one sheets "ABS Carbon Fiber - Technical Datasheet", and two rules between them lost
// it — a line ending in "datasheet" was rejected whole, and the line that announces a sheet was read only
// after the announcement and then below it. So the reader walked down into the Precautions paragraph and came
// back with "unused filament properly after use", and twenty-one products were called that.
//
// Now the announcement comes off and what is left is the name, on either side of it: ABS Carbon Fiber, PLA
// Silk, PETG Matte, ASA Carbon Fiber, TPU 95A, PC Carbon Fiber.
//
// A name rule cannot move parity, which compares a property, a value and a unit; the run that follows this
// change lost nothing on any of the thirty-six makers that have hand-transcribed sheets to compare against.
//
// Three documents are held for a ruling: ABS Wood, ABS Marble and PETG Marble are filler combinations no
// material holds, and a new material is the owner's to create.
//
// Two values are recorded as printed and marked physically implausible: SIDDAMENT's PA sheet publishes a
// tensile strength of 170 MPa and a bending strength of 245 MPa with no filler declared, and no unfilled
// polyamide reaches either. Seven findings are accepted with a reason apiece, most of them notched impact
// strengths that read as unnotched ones on the same maker's sheets.
//
//   node scripts/migrate/m85-batch-b15.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b15', { migration: 'm85-batch-b15', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b15 refused:');
  console.error(error.message);
  process.exit(1);
}
