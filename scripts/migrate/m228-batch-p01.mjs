#!/usr/bin/env node
// GOALS step 6: batch p01 of the price pass (GOALS, "Decided on 2026-09-30, the price pass"; D113). The catalogues of
// twelve Canadian shops, captured on 2026-09-30 with each shop's own profile stating its currency (CAD), and the
// listings a reviewer read as products of the database: for materials with no price, listing by listing; for the other
// products of priced materials, only a listing whose name, less maker, colour and size, is the product's. The review is
// docs/audits/2026-10-01-price-pass/review-p01.mjs; every value is read again from the hashed catalogue by the guard in
// scripts/ingest/prices.mjs. A second run writes nothing.
import { applyPriceBatch } from '../ingest/prices.mjs';

const migration = 'm228-batch-p01';
const { log } = applyPriceBatch('p01', { migration, date: '2026-09-30' });
console.log(`${migration}: ${log.length} record(s) written`);
