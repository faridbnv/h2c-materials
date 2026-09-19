#!/usr/bin/env node
// Migration m54 (2026-09-18): the second batch of the Version 2 import, 53 Spectrum data sheets.
//
// Like m53, the work is in the reviewed proposals under docs/audits/2026-09-18-v2-import/proposals/b02-spectrum/,
// and `applyBatch` refuses the batch unless every row still holds. What it wrote: 53 sources, 53 grades, eleven
// new materials that the polymer-and-filler combinations of this maker's range needed, their measurements,
// profiles and notes, twelve accepted findings and the coverage rows the new grades made untrue.
//
// Fourteen of the maker's documents are not here. Nine are particle-filled PLA variants whose home is the owner's
// question Q004, four name no polymer a material can be filed under (Q005), and one, S-Flex Carbon, publishes
// numbers its own product line's chemistry rules out (Q003). They wait in ../proposals/held-spectrum/.
//
//   node scripts/migrate/m54-batch-b02-spectrum.mjs
//
// A second run prints "0 record(s) written".

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCH = 'b02-spectrum';
const MIGRATION = 'm54-batch-b02-spectrum';

try {
  const { log } = applyBatch(BATCH, { migration: MIGRATION, date: '2026-09-18' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
