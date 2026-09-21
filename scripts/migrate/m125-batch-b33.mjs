#!/usr/bin/env node
// Migration m125 (2026-09-21): batch b33, the optical readings a reader could still sign.
//
// Seven scanned sheets held only for a person to read them against the page image (APPLY-OCR-UNVERIFIED, D35):
// Fiberlogy's FiberFlex CF (two editions), R Nylon, FiberWood and FiberSmooth, and Recreus' PLA-LW. claude-optical
// read every row (BRIEF-optical-review.md); what the page does not print as read was rejected. FiberWood files under
// PLA Wood, as a name that carries the finish does (R039). A tensile modulus of 2200 MPa and two heat deflections on
// FiberFlex CF are kept and flagged (D55): Fiberlogy's other edition prints 200 MPa. 3DJake's copy of the 2021 R
// NYLON sheet prints the Nylon PA12 sheet's table and is registered to R Nylon, which enters from Fiberlogy's own
// 2025 sheet. The rest of the optical pool waits on a reader gap, is empty, or is an identity question.
//
//   node scripts/migrate/m125-batch-b33.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b33', { migration: 'm125-batch-b33', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
