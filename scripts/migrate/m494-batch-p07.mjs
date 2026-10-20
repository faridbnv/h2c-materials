#!/usr/bin/env node
// Price batch p07 (research intake 2, stage 6; D113): two listings from the price leads of the second research package and
// the round's price agent, each page captured live on 2026-10-20 and its offer read. QIDI's own Canadian store prices
// PPS-GF20 (G074-03), new in b50, in CAD; purefil's own shop prices PC GF10 (G038-03) in EUR before VAT, as its page
// states. The review, and the leads not taken with why, is docs/audits/2026-10-20-research-intake-2/prices/review-p07.mjs.
// A second run writes nothing.
import { applyPriceBatch } from '../../scripts/ingest/prices.mjs';

const migration = 'm494-batch-p07';
const { log } = applyPriceBatch('p07', { migration, date: '2026-10-20' });
console.log(`${migration}: ${log.length} record(s) written`);
