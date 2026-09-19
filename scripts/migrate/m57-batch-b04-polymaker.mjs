#!/usr/bin/env node
// Migration m57 (2026-09-19): the fourth batch of the Version 2 import, Polymaker's library.
//
// The maker whose sheets the database was largely built from, so almost every product finds a material that
// already exists. What its layout taught the reader is in the commit that carries this file: a unit printed in
// brackets after the value, a row that names its own direction, a plus that means plus-or-minus, a table printed
// twice with "As Printed" and "Annealed" above the two blocks.
//
// The work is in the reviewed proposals under docs/audits/2026-09-18-v2-import/proposals/b04-polymaker/.
//
//   node scripts/migrate/m57-batch-b04-polymaker.mjs
//
// A second run prints "0 record(s) written".

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCH = 'b04-polymaker';
const MIGRATION = 'm57-batch-b04-polymaker';

try {
  const { log } = applyBatch(BATCH, { migration: MIGRATION, date: '2026-09-19' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
