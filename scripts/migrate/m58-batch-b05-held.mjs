#!/usr/bin/env node
// Migration m58 (2026-09-19): eleven documents the owner's rulings released.
//
// They were held out of the Spectrum and 3DXTECH batches because the reader could not settle what they are. The
// rulings of 2026-09-19 settle them: another maker's finish variant of PLA files under the finish material that
// already exists (R039), and Spectrum's S-Flex Carbon is a TPU with a carbon fibre load (R042). Nine metal, wood,
// glitter and glow PLAs, one S-Flex Carbon, and one PLA sheet whose product name is only its finish.
//
//   node scripts/migrate/m58-batch-b05-held.mjs
//
// A second run prints "0 record(s) written".

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCH = 'b05-held';
const MIGRATION = 'm58-batch-b05-held';

try {
  const { log } = applyBatch(BATCH, { migration: MIGRATION, date: '2026-09-19' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
