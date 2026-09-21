#!/usr/bin/env node
// Migration m103 (2026-09-21): batch b26, the first document a browser had to draw before anyone could read it.
//
// MakerBot's support article for Method PETG prints its table from a script after the page loads, so the bytes
// the server sends carry no values and the ledger called it unreadable. `ingest:capture` opened it in a browser,
// waited for the table to appear and hashed the document the browser ended up with; the article is headed
// "Method material: PETG" and prints a tensile modulus of 1,900 MPa, a tensile strength of 44 MPa and a thermal
// resistance of 76 °C.
//
// Two readings were the reviewer's: the product name, which the reader took from the page's own navigation
// ("Refresh") and which the article's title and the maker's catalogue both give as MakerBot PETG; and the comma
// in "1,900 MPa", which is a thousands separator because 1.9 MPa is nothing's tensile modulus.
//
// The rest of what the captures found is not in this batch: BASF's 34 harvested sheets are in the reader pools
// and the optical queue, its range page states no value that belongs to one product, and two documents turned
// out to repeat sheets the database already holds (Eryone's Hyper Speed TPU, AzureFilm's ABS).
//
//   node scripts/migrate/m103-batch-b26.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b26', { migration: 'm103-batch-b26', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
