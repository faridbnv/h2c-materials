#!/usr/bin/env node
// GOALS steps 2 and 5, C9/C10: batch b40, the gap-fill tranche's product pages (GOALS, "Decided on 2026-09-29, the
// gap-fill tranche"). Nine exact-product pages the gap-fill research of 2026-09-28 saved, staged from its copies by
// digest, each registered with one profile holding the print setting its product's own sheet does not print: eight
// Extrudr drying schedules, and Recreus Conductive Filaflex's 0.4 mm nozzle temperature, bed and drying. The proposals
// and their review are in docs/audits/2026-09-18-v2-import/batches/b40/. Not a general import restart: no product,
// identity or measurement enters, and a second run writes nothing.
import { applyBatch } from '../ingest/apply.mjs';

const migration = 'm226-batch-b40';
const { log } = applyBatch('b40', { migration, date: '2026-09-29' });
console.log(`${migration}: ${log.length} record(s) written`);
