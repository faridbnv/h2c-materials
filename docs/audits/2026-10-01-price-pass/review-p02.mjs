// The review of batch p02, the last Canadian option (GOALS, the price pass): Amazon.ca listings whose buy box is sold by
// the maker's own store, for materials no Canadian shop's catalogue priced. Each page was drawn by a browser on
// 2026-09-30 (Amazon draws its price after the page loads) and hashed as drawn; the regular price is the struck-through
// List Price where the page shows one, and the price to pay is then the sale.
//
// The candidates were found by searching Amazon.ca for each unpriced product of a maker with an Amazon.ca store of its
// own (SUNLU, ERYONE, iSANMATE, ELEGOO, Kingroon, Creality, Anycubic, Siraya Tech, Polymaker, eSUN). Only Siraya Tech's and
// Polymaker's products were found sold by the maker; eSUN's PEBA 90A, ePA12 and ePA-CF, iSANMATE's ESD ABS, PP, HDPE-GF
// and PCL, and SUNLU's PP and PCL were not listed there by their makers.
//
//   node docs/audits/2026-10-01-price-pass/review-p02.mjs     writes archive/ingest-2026-09-18/prices/p02/selected.csv
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../../build/src/csv.js';
import { batchOffers, SELECTED_HEADER, PRICES_ROOT } from '../../../scripts/ingest/prices.mjs';

const REVIEWER = 'Claude (claude-opus-5-5), an agent, 2026-09-30';
const TDS = (source, page) => `The listing names no diameter; the product's own data sheet (${source}, p. ${page}) prints "Diameter (mm) 1.75±0.03", the only diameter it names.`;
// [GradeID, ASIN, options]
const LISTINGS = [
  ['G045-08', 'B0FF4RD2D3'],
  ['G069-02', 'B0DGQFB1WF'],
  ['G071-02', 'B0FL7HN6WJ', { diameter: TDS('D-SIRAYA-Fibreheart-PPA-GF-TDS', 2) }],
  ['G091-02', 'B0D4DSK1RY', { note: 'The black spool\'s page (B0D4DTCWYR) showed no price; the green one is recorded.' }],
  ['G039-69', 'B0DZCD4Z9M', { diameter: TDS('D-SIRAYA-siraya-tech-flex-tpu-air-tds', 1) }],
];
const offers = new Map(batchOffers('p02').map((o) => [o.key, o]));
const rows = LISTINGS.map(([gradeId, asin, opts = {}]) => {
  const o = offers.get(asin);
  if (!o) throw new Error(`${gradeId}: no offer ${asin} in the batch`);
  return {
    GradeID: gradeId, SHA256: o.capture.SHA256, Offer: o.key, Packaging: 'Spool', 'Mass from': 'title', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE',
    'Regular price basis': o.compareAt ? 'The List Price the buy box strikes through; the price to pay is a sale' : 'The buy box shows one price and no List Price',
    Notes: [opts.note, `Sold by ${o.soldBy}, the maker's own Amazon.ca store.`].filter(Boolean).join(' '), Diameter: opts.diameter ?? '', Maker: '', 'VAT included %': '',
    Status: 'accepted', Reviewer: REVIEWER, Why: 'Tier 2: Amazon.ca, sold by the maker\'s own store (review-p02.mjs).',
  };
});
writeFileSync(join(PRICES_ROOT, 'p02', 'selected.csv'), csvText(SELECTED_HEADER, rows));
console.log(`${rows.length} listing(s) selected`);
