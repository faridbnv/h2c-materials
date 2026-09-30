#!/usr/bin/env node
// GOALS step 6: batch p02 of the price pass, the last Canadian option (GOALS, "Decided on 2026-09-30, the price pass";
// D113). Five Amazon.ca pages whose buy box is sold by the maker's own store (Siraya Tech, Polymaker), drawn by a browser
// on 2026-09-30 and hashed as drawn, for materials no Canadian shop's catalogue priced. The review is
// docs/audits/2026-09-30-price-pass/review-p02.mjs; every value is read again from the hashed page by the guard in
// scripts/ingest/prices.mjs, the seller included. A second run writes nothing.
import { applyPriceBatch } from '../ingest/prices.mjs';

const migration = 'm229-batch-p02';
const { log } = applyPriceBatch('p02', { migration, date: '2026-09-30' });
console.log(`${migration}: ${log.length} record(s) written`);
