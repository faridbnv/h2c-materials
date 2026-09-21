#!/usr/bin/env node
// Migration m121 (2026-09-21): batch b27, the optical pool, read against its page images.
//
// Every row of this batch was read from a scan, so apply.mjs refuses any of it nobody checked against the page
// image (APPLY-OCR-UNVERIFIED, D35). Three rounds of a reader who did not decide the rows (claude-optical,
// BRIEF-optical-review.md) signed or rejected each: round one the measurements, round two every grade row against
// page 1 (22 products named from the page's furniture took the name the page prints, with --rename), round three
// the rows an earlier round had accepted unread. What the page does not print as read was rejected, never
// corrected. Twenty products batches b28 and b30 had recorded left the batch as registered; seven documents that
// are statements, a powder or pellets are not data sheets; three whose page names another polymer, filler or maker
// wait for a ruling; twelve whose every value was rejected wait on the reader (BASF's extended layout, QIDI's
// bilingual columns). batches/b27/README.md says which is which.
//
//   node scripts/migrate/m121-batch-b27.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b27', { migration: 'm121-batch-b27', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
