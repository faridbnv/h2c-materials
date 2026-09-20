#!/usr/bin/env node
// Migration m77 (2026-09-20): the libraries of makers whose layout was already proved, batch b11.
//
// BASF Forward AM, Spectrum, Extrudr, 3DXTECH, Polymaker / Fiberon, colorFabb, Fabru / purefil, Flashforge,
// SUNLU, Eryone and Braskem: what was left of each once its first batch had landed, read with the column
// reader that b11's own work added.
//
// Twenty of the documents are a maker's German, French, Italian or Polish edition and none of them has an
// English sibling anywhere in the corpus: a sheet is its numbers, and these are the only copy of theirs.
// Twenty-one more do have a sibling whose numbers they repeat, and those are queued rather than registered
// twice (R053), which is what MEAS-CROSS-SOURCE-TWIN is for.
//
// Held, with their proposals beside the applied ones: every document whose identity is unsettled, every one
// read optically until somebody checks it against the page image, and two whose product the database already
// holds under another document.
//
//   node scripts/migrate/m77-batch-b11.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log } = applyBatch('b11', { migration: 'm77-batch-b11', date: '2026-09-20' });
  console.log(`${log.length} record(s) written`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b11 refused:');
  console.error(error.message);
  process.exit(1);
}
