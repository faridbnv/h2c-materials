#!/usr/bin/env node
// Migration m56 (2026-09-18): the third batch of the Version 2 import, 33 3DXTECH data sheets.
//
// The first batch of a maker whose sheets are laid out the other way round: label, standard, unit, value, with
// the unit in a column of its own. The reader knew only "number unit" and reproduced 4 of that maker's 214
// recorded values; it now reproduces 213. What it learned is in the commit that carries this file.
//
// The work is in the reviewed proposals under docs/audits/2026-09-18-v2-import/proposals/b03-3dxtech/. Four
// documents are not here: two name only "Nylon", one is a bone-simulation filament whose polymer its sheet does
// not give, and one is a PA6 copolymer (pending questions Q006 and Q005).
//
//   node scripts/migrate/m56-batch-b03-3dxtech.mjs
//
// A second run prints "0 record(s) written".

import { applyBatch, Refusal } from '../ingest/apply.mjs';

const BATCH = 'b03-3dxtech';
const MIGRATION = 'm56-batch-b03-3dxtech';

try {
  const { log } = applyBatch(BATCH, { migration: MIGRATION, date: '2026-09-18' });
  console.log(`${log.length} record(s) written`);
  for (const line of log) console.log(`  ${line}`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(error.message);
  process.exit(1);
}
