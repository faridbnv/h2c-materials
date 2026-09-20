#!/usr/bin/env node
// Migration m72 (2026-09-19): five makers' libraries, batch b09.
//
// Eryone, Flashforge, Fiberlogy, Fabru / purefil and colorFabb, applied together because they were read
// together: one pass of the reader learned all five layouts, and the parity gate ran once over the three makers
// whose sheets were transcribed by hand.
//
// What is not here is as much a part of the batch as what is. Held, with their proposals kept beside the
// applied ones: every document whose identity is unsettled (a polymer nobody names, a resin sheet with no
// product name, a PHA whose class its sheet does not say), and every document read optically, because a value
// read from a picture does not enter until somebody has read it against the page image (APPLY-OCR-UNVERIFIED).
// Fiberlogy's library is mostly scans, so most of it waits there.
//
//   node scripts/migrate/m72-batch-b09.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCHES = ['b09-eryone', 'b09-flashforg', 'b09-fiberlogy', 'b09-fabru---p', 'b09-colorfabb'];

let total = 0;
for (const batch of BATCHES) {
  try {
    const { log } = applyBatch(batch, { migration: 'm72-batch-b09', date: '2026-09-19' });
    total += log.length;
    console.log(`${batch}: ${log.length} record(s) written`);
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    console.error(`${batch} refused:`);
    console.error(error.message);
    process.exit(1);
  }
}
console.log(`${total} record(s) written in all`);
