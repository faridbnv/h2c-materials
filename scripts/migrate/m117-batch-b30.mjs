#!/usr/bin/env node
// Migration m117 (2026-09-21): batch b30, the verdicts by witness and the small reader rules.
//
// R089 delegated the identity verdicts to the agent, on a maker's own document. A search found one for 86 of 108
// products; 40 supported a verdict, each re-read from the fetched, hashed witness, and those with the 47 verdicts
// already given became R099 to R164. Four reader rules freed the rest of what this batch takes:
//
//   - R076 built: a support is filed by its chemistry, else by what it says it supports (Helios and Atlas Support
//     are PVA, PolySupport a support for PLA, Raise3D's industrial supports and PolySupport for PA12 support PA).
//   - R098: a filament lighter than its polymer is the foam or the softer grade its sheet says it is (PolyWood,
//     Pegasus PP, PEBA Air: lightweight additive; COC flex: declared softer grade).
//   - Yousu's condition between unit and value ("g/10min 210℃, 2.16Kg 7", "% 23 ℃,24hr 0.15"), and QIDI's "IS0".
//   - "PESO NETO" is a weight, not polyethersulfone; LumberLay and Eco Coffee are wood-effect PLA.
//
// What the review decided by hand is in batches/b30/README.md: colorFabb's 2023 copperFill sheet joins G001-156
// with only the values it adds; five values physics rules out are kept and flagged (D55); five rows the reader
// misread are rejected with the line quoted.
//
//   node scripts/migrate/m117-batch-b30.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b30', { migration: 'm117-batch-b30', date: '2026-09-21' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}
