#!/usr/bin/env node
// Price batch p05 (quality round 2026-10-07, item 10; D113, D134): eight listings for materials no Canadian, Amazon.ca
// maker, USD or EUR listing had priced. Seven come from filamentworld.de, whose pages print "inkl. 19 % MwSt." beside
// every price: recorded with VAT included at that rate, which the guard reads on the page, and compared before VAT at the
// Bank of Canada rate. Extrudr GREENTEC PRO CF's 800 g spool comes from 3DJake International, before VAT as its page
// says. Each page was fetched as served on 2026-10-07 and its schema.org offer read; the review is
// docs/audits/2026-10-07-quality-round/web/review-p05.mjs. A second run writes nothing.
import { applyPriceBatch } from '../ingest/prices.mjs';

const migration = 'm405-batch-p05';
const { log } = applyPriceBatch('p05', { migration, date: '2026-10-07' });
console.log(`${migration}: ${log.length} record(s) written`);
