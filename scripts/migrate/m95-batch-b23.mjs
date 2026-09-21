#!/usr/bin/env node
// Migration m95 (2026-09-21): batch b23, five twins whose primaries were applied by b22.
//
// A twin can only be shaped once the sheet that carries its values is applied: until then there is nothing for
// its grade to share a formulation key with. b22 applied the sheets these five repeat, so `--twins` shapes them
// now under R053 — a grade each, citing its own sheet, the values recorded once. Nothing else in this batch.
//
// The rest of the twin queue is not waiting on a batch. Seven documents have nothing recording which sheet they
// repeat, and forty-one read as a different material from the sheet that carries their values — AzureFilm's one
// table for its PLA and its Silk PLA is the shape — which one formulation key cannot span (D12, D44). Those are a
// reading of two sheets and are named on their rows.
//
//   node scripts/migrate/m95-batch-b23.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b23', { migration: 'm95-batch-b23', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b23 refused:');
  console.error(error.message);
  process.exit(1);
}
