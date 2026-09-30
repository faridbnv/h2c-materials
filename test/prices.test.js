// Prices in any currency (D113, build/src/prices.js). Every row below is a made-up fixture written for this test, not
// evidence of a real offer: the amounts are chosen so the arithmetic can be checked by hand.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compilePrices, priceSample, convertedFrom, priceSampleMeta, isCanadianMarket } from '../build/src/prices.js';

const row = (over) => ({
  PriceID: 'CA9001', MaterialID: 'M900', GradeID: 'G900-01', Retailer: 'Fixture shop', 'Variant / SKU': 'Fixture / 1kg', Packaging: 'Spool',
  'Net mass kg': '1', 'List price': '40', 'Sale price': 'Not applicable', Stock: 'In stock', 'Eligible for median': 'TRUE', 'Headline sample': 'TRUE',
  'Displayed price': '40', Currency: 'CAD', Market: 'Canadian storefront', 'Tax / shipping': 'Excluded', 'VAT included %': 'Not applicable',
  'Regular price basis': 'Fixture', Quarantined: 'FALSE', URL: 'https://example.invalid/p', SourceID: 'S-FIXTURE', 'Access date': '2026-09-30', Notes: 'Fixture.',
  ...over,
});
const FX = [
  { Currency: 'USD', 'Rate date': '2026-09-29', 'CAD per unit': '1.35', SourceID: 'S-FX', Locator: 'FXUSDCAD 2026-09-29', Notes: 'Fixture.' },
  { Currency: 'USD', 'Rate date': '2026-09-01', 'CAD per unit': '1.30', SourceID: 'S-FX-OLD', Locator: 'FXUSDCAD 2026-09-01', Notes: 'Fixture.' },
  { Currency: 'EUR', 'Rate date': '2026-09-29', 'CAD per unit': '1.50', SourceID: 'S-FX', Locator: 'FXEURCAD 2026-09-29', Notes: 'Fixture.' },
];
const compile = (rows, fx = FX) => { const issues = []; return { ...compilePrices(rows, fx, issues), issues }; };

test('a Canadian listing keeps its list price per kg, and carries nothing a foreign one does', () => {
  const { prices: [p], issues } = compile([row({ 'List price': '29.99', 'Net mass kg': '0.75' })]);
  assert.deepEqual(issues, []);
  assert.equal(p.regularPerKg, 39.99);
  assert.equal(p.foreign, undefined);
  assert.equal(p.fx, undefined);
  assert.equal(p.vatPercent, undefined);
});

test('a USD half-kilogram spool is converted at the rate in force, the latest for its currency', () => {
  const { prices: [p], issues } = compile([row({ Currency: 'USD', Market: 'USD storefront', 'List price': '30', 'Net mass kg': '0.5' })]);
  assert.deepEqual(issues, []);
  assert.equal(p.foreign, true);
  assert.equal(p.regularPerKgNative, 60);
  assert.equal(p.regularPerKg, 81); // 60 USD/kg x 1.35
  assert.deepEqual(p.fx, { cadPerUnit: 1.35, date: '2026-09-29', sourceId: 'S-FX' });
});

test('a EUR price that states its VAT is compared before it', () => {
  const { prices: [p], issues } = compile([row({ Currency: 'EUR', Market: 'European storefront', 'List price': '23.8', 'VAT included %': '19' })]);
  assert.deepEqual(issues, []);
  assert.equal(p.vatPercent, 19);
  assert.equal(p.regularPerKgNative, 20); // 23.80 / 1.19
  assert.equal(p.regularPerKg, 30); // 20 EUR/kg x 1.50
});

test('a price that includes VAT at a rate nobody printed is not comparable, and an eligible one is an error', () => {
  const { prices: [p], issues } = compile([row({ Currency: 'EUR', Market: 'European storefront', 'VAT included %': 'Not published' })]);
  assert.equal(p.regularPerKg, null);
  assert.deepEqual(issues.map((i) => i.code), ['PRICE-TAX-UNSTATED']);
  const recorded = compile([row({ Currency: 'EUR', Market: 'European storefront', 'VAT included %': 'Not published', 'Eligible for median': 'FALSE', 'Headline sample': 'FALSE' })]);
  assert.deepEqual(recorded.issues, []);
});

test('a foreign currency with no rate stops the build, and a Canadian market is in CAD', () => {
  const missing = compile([row({ Currency: 'USD', Market: 'USD storefront' })], []);
  assert.deepEqual(missing.issues.map((i) => i.code), ['PRICE-FX-MISSING']);
  assert.equal(missing.prices[0].regularPerKg, null);
  const wrong = compile([row({ Currency: 'USD', Market: 'Canadian storefront' })]);
  assert.ok(wrong.issues.some((i) => i.code === 'PRICE-MARKET-CURRENCY'));
});

test('Amazon.ca sold by the maker\'s store is Canadian; a US or EU storefront is not', () => {
  assert.equal(isCanadianMarket("Amazon.ca (sold by the maker's store)"), true);
  assert.equal(isCanadianMarket('Canadian storefront'), true);
  assert.equal(isCanadianMarket('USD storefront'), false);
  assert.equal(isCanadianMarket('European storefront'), false);
});

test('a Canadian price is never outvoted by a converted one, and a converted price says so', () => {
  const { prices } = compile([
    row({ PriceID: 'CA9001', 'List price': '40' }),
    row({ PriceID: 'CA9002', Currency: 'USD', Market: 'USD storefront', 'List price': '20' }),
  ]);
  const both = priceSample(prices);
  assert.deepEqual(both.map((p) => p.id), ['CA9001']);
  assert.equal(convertedFrom(both), null);
  const foreignOnly = priceSample(prices.filter((p) => p.foreign));
  assert.deepEqual(convertedFrom(foreignOnly), { currencies: ['USD'], rateDate: '2026-09-29' });
});

test('the sample counts its Canadian retailers and foreign sellers apart, and names the rates it uses', () => {
  const { prices, fxRates } = compile([
    row({ PriceID: 'CA9001', Retailer: 'Shop A', 'Access date': '2026-09-10' }),
    row({ PriceID: 'CA9002', Retailer: 'Shop B' }),
    row({ PriceID: 'CA9003', Retailer: 'Shop US', Currency: 'USD', Market: 'USD storefront', 'Access date': '2026-10-01' }),
    row({ PriceID: 'CA9004', Retailer: 'Shop Q', Quarantined: 'TRUE', 'Access date': '2026-08-01' }),
  ]);
  const meta = priceSampleMeta(prices, fxRates);
  assert.equal(meta.canadianRetailers, 2);
  assert.equal(meta.foreignSellers, 1);
  assert.equal(meta.from, '2026-09-10');
  assert.equal(meta.to, '2026-10-01');
  assert.deepEqual(meta.rates.map((r) => r.currency), ['USD']);
});
