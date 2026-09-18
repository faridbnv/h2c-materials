#!/usr/bin/env node
// Migration m53 (2026-09-18): the first batch of the Version 2 import, ten Spectrum data sheets.
//
// This is the first batch that entered through scripts/ingest/ rather than by hand, and it is a migration for the
// same reason every other change here is one: the sequence of migrations is the one history of how the data got
// here, and a re-run must change nothing. The work is not in this file. It is in the ten reviewed proposals under
// docs/audits/2026-09-18-v2-import/proposals/b01-spectrum/, each naming the document it was read from by SHA-256,
// the page and line behind every value, and who accepted the row. `applyBatch` refuses the whole batch unless
// every one of those still holds (scripts/ingest/apply.mjs lists what it checks).
//
// What it wrote: 10 sources, 10 grades under 7 existing materials, 87 measurements, 11 print profiles with their
// notes, one accepted physics finding and the coverage rows the new grades made untrue.
//
//   node scripts/migrate/m53-batch-b01-spectrum.mjs
//
// A second run prints "0 record(s) written": a source is known by its SourceID, a grade by its source and product
// name, a measurement by its source and locator, a profile by its source and locator.

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCH = 'b01-spectrum';
const MIGRATION = 'm53-batch-b01-spectrum';

try {
  const { log } = applyBatch(BATCH, { migration: MIGRATION, date: '2026-09-18' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
