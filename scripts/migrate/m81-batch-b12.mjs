#!/usr/bin/env node
// Migration m81 (2026-09-20): the new PDF libraries of Wave B, batch b12.
//
// SIDDAMENT, Raise3D, 3D4Makers, Prusament, eSUN, Recreus, Essentium / Nexa3D, BigRep, NinjaTek, Yousu,
// 3D-Fuel, UltiMaker and Markforged: thirteen makers whose libraries had never been read.
//
// Stratasys is not here. Its sheets print a table per layer height with a value column per build orientation,
// and the reader now reads the orientations but cannot tell one layer-height table from the next, so its rows
// would be one grade's elongation four times over with nothing to distinguish them. Twenty-four documents wait
// for the condition-block work rather than enter indistinct.
//
// Held besides: 87 identities nobody has settled, 28 documents whose own sheet gives no name a reader can use
// ("Material Status Mass Production", "Precautions"), four that print another sheet's numbers, and the
// optically read ones.
//
// Six rows were rejected as misreadings rather than recorded: a continuous service temperature whose humidity
// condition was read as a heat deflection, a coefficient of thermal expansion whose range start was read as a
// Vicat point twice over, a heat deflection whose load was read as its temperature, a sentence about printing
// pressure read as a flexural modulus, and a foaming filament's lower density bound.
//
// Twenty-three findings are accepted with a reason apiece: high-speed grades whose melt flow is far above a
// window drawn from ordinary ones, toughened grades above their impact windows, and three strain findings that
// are systematic across makers.
//
//   node scripts/migrate/m81-batch-b12.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log } = applyBatch('b12', { migration: 'm81-batch-b12', date: '2026-09-20' });
  console.log(`${log.length} record(s) written`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b12 refused:');
  console.error(error.message);
  process.exit(1);
}
