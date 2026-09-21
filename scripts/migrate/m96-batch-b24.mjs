#!/usr/bin/env node
// Migration m96 (2026-09-21): batch b24, the one reader rule left — a table's columns by position, and the
// caption that names the table.
//
// Everything the reader still could not do was one shape: a table with several value columns, and a caption
// above it saying what the table is. `axisColumns` already split a row by orientation column; this batch teaches
// it two more things. A heading cell may name a condition instead of an orientation, or in front of one —
// "Unannealed | Annealed", "Molded | X-Y Axis | Z Axis", "3D Printed X-Y | 3D Printed Z" — and every value under
// it takes that condition as plainly as it takes a direction. And the caption within six lines above the heading
// ("Table 4: ABS-M30 Black Mechanical Properties - F770 - T14 Standard Head") is carried onto every row of the
// table, which is what tells three Stratasys tables of one grade apart. A property that has no direction but is
// printed per orientation column keeps the column in its parameters instead, so two heat deflections measured
// flat and on edge stay two rows without either taking a direction it cannot have. And "XZ/ZX", a column
// Stratasys heads with two orientations at once, is a direction the database cannot use as a build direction,
// with a note saying what the sheet printed.
//
// Parity over all forty makers, before and after: up on two, down on none. What did not move was the five makers
// the plan hoped this would lift — Stratasys, Essentium, Prusa, iSANMATE and Bambu stay where they were, because
// the sheets their parity is measured on have gaps of their own: a stacked label, a merged impact cell, a table
// per colour.
//
// A block heading names its rows' family and standard as well: "Flexural Properties: ASTM D790, Procedure A"
// makes the "Strain at Break" under it a flexural elongation at break, tested to that standard, where read by
// its own label it was a tensile elongation beside the real one.
//
// Thirteen documents enter from the seventy proposed. Four Stratasys sheets are held after reading: TPU 92A
// stacks the word that tells two tensile rows apart on the line above the value; the coloured ULTEM 9085 sheet
// prints one row per property with a value per colour, which is a sheet covering several products; and the
// ABS-CF10 and PC-ESD sheets are named after their own front matter. QIDI's PLA Rapido is held for its one
// value, a "flexural modulus" of 10 to 20 MPa. The rest of the seventy are held for what the register says.
//
//   node scripts/migrate/m96-batch-b24.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b24', { migration: 'm96-batch-b24', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b24 refused:');
  console.error(error.message);
  process.exit(1);
}
