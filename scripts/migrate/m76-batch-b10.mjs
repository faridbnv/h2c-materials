#!/usr/bin/env node
// Migration m76 (2026-09-19): Fillamentum, batch b10.
//
// Sixteen of the maker's twenty-four documents. The reader reached the parity gate on this layout by learning
// four things its sheets do: a description column set beside the property table, a label the table merges
// across two rows, a row that names its endpoint in the Test Condition column rather than in its label, and a
// page that prints no product name at all at its head.
//
// Eight documents are held, with their proposals kept beside the applied ones:
//
//   seven for an identity nobody has settled — NonOilen, whose composition row names two polymers and is
//   therefore a blend; Nylon AF80 Aramid, a PA12 times aramid no material holds; Nylon CF15 Carbon and Nylon
//   FX256, whose sheets say only "Nylon", which names a family and a family owns no product (D44); Flexfill
//   TPE 90A and 96A, whose composition row says "polyolefin", which names a family too; and Timberfill, wood
//   fibres in a polymer its sheet never names;
//
//   and OBC 905, for a reason that is about the reader and not the sheet. Its table prints a value column per
//   build orientation under the header "XY-axis Z-axis Test Method Test Condition", and read as one column the
//   Z value of every row is dropped and the X-Y value recorded with no direction at all. Its Vicat row prints
//   "-" and the label was carried to the line below it, making a "Temperature resistance" of 100 °C into a
//   Vicat softening point. Neither is a thing to review around; both are the same piece of work, a table read
//   by its columns, which docs/audits/2026-09-18-v2-import/PLAN-REMAINING.md names.
//
// Two standards enter with the data that cites them: ISO 34, the tear strength of an elastomer, and IEC 243,
// which is what some sheets still call IEC 60243.
//
//   node scripts/migrate/m76-batch-b10.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log } = applyBatch('b10', { migration: 'm76-batch-b10', date: '2026-09-19' });
  console.log(`${log.length} record(s) written`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b10 refused:');
  console.error(error.message);
  process.exit(1);
}
