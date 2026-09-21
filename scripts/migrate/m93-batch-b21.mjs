#!/usr/bin/env node
// Migration m93 (2026-09-20): batch b21, R053 applied — the twins.
//
// A twin is a document whose sheet prints the numbers another sheet already carries: one maker's table served
// under several product names, which is how SUNLU publishes its PLA range and its Silk PLA+ colour packs. Both
// products are real and the database should hold both; what it must not hold is the same measurement twice,
// because the estimate model would count one result as two.
//
// R053 says what such a pair becomes: "a grade each, citing its own sheet, with the values recorded once". So
// each twin keeps its own source row — a document is its bytes, and this one was fetched and hashed — and its
// own grade, and it shares the formulation key of the sheet that carries the values. That key is what says the
// two names are one formulation: without it the grade is a catalogue row that knows nothing about the sheet it
// repeats, and with it the model predicts the pair once. The measurements and print setups are rejected with
// the reason rather than dropped, because a rejection carries a name and a reason and a disappearance carries
// neither.
//
// Of the 143 documents held as twins, 38 are shaped here. The rest are not one thing, and separating them is
// most of what this batch is:
//
//   29  the product already has a grade. A second sheet for one product is a revision or a copy and its rows
//       belong on the grade that is there; the applier reuses it, and the new source is then cited by nothing,
//       which is what SOURCE-UNCITED caught.
//    4  a shop's copy of a maker's own sheet for the same product. A copy is not a source.
//    3  another language edition of a sheet this batch already shapes — Spectrum publishes PLA Nature and PLA
//       Thermoactive in Polish and in English, and both editions were in the queue.
//   69  cannot be shaped yet, for three reasons the batch now names per document: the sheet they repeat is not
//       applied, so there is nothing for the key to point at; their own identity is unsettled; or the values
//       sit under a different material than the product reads as, which is a reading of two sheets and not a
//       rule.
//
// The distinction the queue could not make is the one worth writing down. The extract stage pairs two documents
// that print one table and says so plainly — "one sheet served twice, or two products tested once?" — and R053
// answers only the second. What separates them is the product name once the maker's own name is off it, and
// that test is not safe enough to decide a hundred documents with: "PI Z2 Filament" and "PI Filament Z2
// Zymergen 3D4Makers" are one product under two catalogue names, and "Facilan Ortho" and "Facilan PCL100" are
// two products under one table. So the test decides only the clear ends of it and the middle is logged.
//
//   node scripts/migrate/m93-batch-b21.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b21', { migration: 'm93-batch-b21', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b21 refused:');
  console.error(error.message);
  process.exit(1);
}
