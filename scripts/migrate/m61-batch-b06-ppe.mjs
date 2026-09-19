#!/usr/bin/env node
// Migration m61 (2026-09-19): 3DXTECH's THERMAX PPE/PS, once its polymer had a row (m60).
//
//   node scripts/migrate/m61-batch-b06-ppe.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log } = applyBatch('b06-ppe', { migration: 'm61-batch-b06-ppe', date: '2026-09-19' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
