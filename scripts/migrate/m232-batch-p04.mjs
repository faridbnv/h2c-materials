#!/usr/bin/env node
// GOALS step 6: batch p04 of the price pass, tier 4: EUR (GOALS, "Decided on 2026-09-30, the price pass"; D113).
// Thirty 3DJake International product pages fetched as served on 2026-09-30, for materials no Canadian option and no
// USD shop priced. Each page says its prices exclude VAT for a visitor outside the EU, which the guard reads on the page;
// each listing is compared at the Bank of Canada rate in force (m230) and marks its product's price as converted. The
// review is docs/audits/2026-10-01-price-pass/review-p04.mjs. A second run writes nothing.
import { applyPriceBatch } from '../ingest/prices.mjs';

const migration = 'm232-batch-p04';
const { log } = applyPriceBatch('p04', { migration, date: '2026-09-30' });
console.log(`${migration}: ${log.length} record(s) written`);
