#!/usr/bin/env node
// Migration m227 (2026-09-30): prices in any currency (D113; GOALS, "Decided on 2026-09-30, the price pass").
//
// The owner asked for a price for every material: CAD where a Canadian shop sells the product, then USD, then EUR.
// prices.csv could hold only CAD: its amount columns were named for it and its Currency allowed nothing else, so a
// foreign amount had nowhere to go but a CAD column, which the gap-fill handoff forbade. This makes the table
// currency-neutral and changes no value:
//
//   List price CAD, Sale price CAD, Displayed price CAD   become List price, Sale price, Displayed price, each row's
//                                                         amounts as they were; Currency (every row CAD) now names
//                                                         a currency of schema/vocab/currencies.csv
//   VAT included %                                        new: the VAT rate a page states its price includes. Every
//                                                         listing so far is before tax: Not applicable
//   Market                                                a vocabulary now (schema/vocab/markets.csv), which says
//                                                         whether a market is Canadian; every row so far is on
//                                                         "Canadian storefront", which is
//   fx_rates.csv                                          new and empty: the Bank of Canada rates foreign listings
//                                                         are compared at, each read from a hashed document
//   headline_definitions priceCADkg                       its Technical label and Hint no longer say "Canadian":
//                                                         the key stays, a CAD-equivalent per kg
//   method.csv, Pricing                                   what is eligible, how a median is formed, how CAD/kg is
//                                                         calculated, and a new row on where the rates come from
//
// A second run writes nothing.
//
//   node scripts/migrate/m227-prices-in-any-currency.mjs
import { openTables } from '../data/table-io.mjs';

const migration = 'm227-prices-in-any-currency';
const t = openTables(undefined, { allowMissing: true });
let changed = 0;

for (const [before, after] of [['List price CAD', 'List price'], ['Sale price CAD', 'Sale price'], ['Displayed price CAD', 'Displayed price']]) {
  if (!t.header('prices').includes(before)) continue;
  t.addColumn('prices', after, { after: before, fill: (r) => r[before] });
  t.dropColumn('prices', before);
  changed++;
}
if (!t.header('prices').includes('VAT included %')) {
  t.addColumn('prices', 'VAT included %', { after: 'Tax / shipping', fill: () => 'Not applicable' });
  changed++;
}
// What the new columns claim of the old rows, checked on the run that claims it: each was CAD, on a Canadian storefront.
if (changed) {
  for (const r of t.rows('prices')) {
    if (r.Currency !== 'CAD' || r.Market !== 'Canadian storefront') throw new Error(`${migration}: ${r.PriceID} is ${r.Currency} on "${r.Market}"; every listing before this migration was CAD on a Canadian storefront`);
  }
}
if (!t.tables().includes('fx_rates')) {
  t.createTable('fx_rates', ['Currency', 'Rate date', 'CAD per unit', 'SourceID', 'Locator', 'Notes']);
  changed++;
}
// The headline's own words said "Canadian retail"; a product with only a foreign listing now has a converted price.
const reword = (field, before, after) => { if (t.get('headline_definitions', 'priceCADkg')[field] !== after) changed += Number(t.set('headline_definitions', 'priceCADkg', field, after, { expect: before })); };
reword('Technical', 'Median Canadian retail price', 'Median retail price, CAD/kg');
reword('Hint', 'sampled Canadian retail, not live', 'sampled listings; Canadian where one exists, else a foreign one converted at the Bank of Canada rate; not live');
// The Pricing rows of the method said CAD and Canadian storefronts only, and three observations per material; they now
// say what the build does (D83, D113). A new row says where the rates come from.
const METHOD = {
  'Eligible observations': [
    'CAD Canadian storefronts only. In-stock, non-bulk regular prices, before tax and shipping. Net filament mass only. Promotions visible separately. Bambu variant price must match an explicit MSRP or a verified single-unit regular header price with no promotion in that price block.',
    "The exact product, 1.75 mm, one spool or refill, with its net filament mass printed: an in-stock regular price, before shipping. CAD from a Canadian storefront first (a Canadian retailer, a maker's Canadian store, or Amazon.ca where the seller is the maker's own store); where no Canadian shop in the sample lists the product, the maker's shop or a seller in USD, then in EUR (D113). Before tax: a EUR price has the VAT its page states taken off, and one whose rate is not printed is not comparable. Promotions visible separately. Bambu variant price must match an explicit MSRP or a verified single-unit regular header price with no promotion in that price block.",
  ],
  'Median sample': [
    'Up to three observations per material, prioritizing distinct retailers. One offer per retailer prevents colour-count bias. Prefer spool and mass closest to 1 kg. Refills remain explicitly labelled. Grade-matched sample is not a whole-market lowest-price search.',
    "A product's price is the median of its own headline-sample listings, one offer per seller, which prevents colour-count bias: its Canadian listings where it has any, its foreign ones only where it has none. A material's price is the median of its plain products' prices (D83). Prefer spool and mass closest to 1 kg. Refills remain explicitly labelled. Grade-matched sample is not a whole-market lowest-price search.",
  ],
  Calculations: [
    'Regular CAD/kg = regular CAD price / net filament kg. Headline = median of eligible flagged observations. A 0.5 kg spool doubles CAD/kg relative to its spool price; a 0.75 kg spool divides by 0.75. Sale, bulk, unavailable and imported offers do not enter the median.',
    'Regular CAD/kg = regular price before VAT / net filament kg x the Bank of Canada rate for its currency (CAD: 1), to the cent. A 0.5 kg spool doubles CAD/kg relative to its spool price; a 0.75 kg spool divides by 0.75. Sale, bulk and unavailable offers do not enter a median. A converted price is marked wherever it is shown.',
  ],
  Refresh: [
    'Price observations are snapshots. Stale-price threshold is 30 days from the fixed snapshot date, not a live TODAY calculation. Recheck stock and variant when buying.',
    'Price observations are snapshots, each with its access date; the sample spans the dates its listings were read. Stale-price threshold is 30 days from the fixed snapshot date, not a live TODAY calculation. Recheck stock and variant when buying.',
  ],
};
for (const [topic, [before, after]] of Object.entries(METHOD)) {
  if (t.get('method', topic)['Definition / rule'] !== after) changed += Number(t.set('method', topic, 'Definition / rule', after, { expect: before }));
}
if (!t.find('method', 'Exchange rates')) {
  const at = t.rows('method').findIndex((r) => r.Topic === 'Refresh') + 1;
  t.append('method', { Section: 'Pricing', Topic: 'Exchange rates', 'Definition / rule': 'One Bank of Canada daily rate per currency, CAD per unit, read from its Valet service as a fetched, hashed document (fx_rates.csv). The latest row per currency is in force, and every foreign listing of a release is compared at it, never at a rate of its own day. A foreign price says nothing about shipping to Canada, duty or Canadian stock, and never makes a product listed or buyable in Canada.' });
  // Beside the other Pricing rows, where a reader of the method looks for it.
  const rows = t.rows('method');
  rows.splice(at, 0, rows.pop());
  changed++;
}
t.save();
console.log(`${migration}: ${changed} change(s)`);
