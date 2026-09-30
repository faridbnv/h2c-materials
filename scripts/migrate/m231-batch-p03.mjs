#!/usr/bin/env node
// GOALS step 6: batch p03 of the price pass, tier 3: USD (GOALS, "Decided on 2026-09-30, the price pass"; D113). Ten
// USD Shopify shops captured whole on 2026-09-30 with each shop's /meta.json stating USD, for materials no Canadian
// shop and no Amazon.ca maker store priced. Each listing is compared at the Bank of Canada rate in force (m230) and marks
// its product's price as converted; none makes a product listed or buyable in Canada. The review is
// docs/audits/2026-10-01-price-pass/review-p03.mjs; every value is read again from the hashed catalogue by the guard.
// A second run writes nothing.
import { applyPriceBatch } from '../ingest/prices.mjs';

const migration = 'm231-batch-p03';
const { log } = applyPriceBatch('p03', { migration, date: '2026-09-30' });
console.log(`${migration}: ${log.length} record(s) written`);
