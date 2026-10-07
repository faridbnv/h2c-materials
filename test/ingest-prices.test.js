// The way a price enters (scripts/ingest/prices.mjs, D113): the offer readers, and the guard that holds every row to
// the offer its document holds. Every shop document below is a made-up fixture written for this test, not a real
// listing; the grades they price are real, so the rehearsal runs the real build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { storeBytes } from '../scripts/data/source-store.mjs';
import { shopifyCatalogueOffers, jsonLdOffers, amazonOffers, shopMeta, massKg, isOneSeventyFive } from '../scripts/lib/offers.mjs';
import { guard, rehearse, priceRow, sourceRow, writePrices, keep } from '../scripts/ingest/prices.mjs';
import { cachedText } from '../scripts/lib/pdf-text.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE_URL = 'https://fixture-shop.invalid/products.json?limit=250&page=1';
const catalogue = Buffer.from(JSON.stringify({ products: [
  { id: 11, title: 'eSUN PLA+GF Filament 1.75mm, 1kg', handle: 'esun-pla-gf', vendor: 'eSun', product_type: 'Filament', body_html: '<p>Glass-fibre PLA. Diameter 1.75 mm.</p>',
    variants: [
      { id: 111, title: 'Black', sku: 'ESUN-GF-BK', price: '32.99', compare_at_price: '39.99', available: true },
      { id: 112, title: 'Natural', sku: 'ESUN-GF-NA', price: '39.99', compare_at_price: null, available: false },
    ] },
  { id: 12, title: 'Fixture Brand Spool', handle: 'fixture-spool', vendor: 'Nobody', product_type: 'Filament', body_html: '<p>Net weight 750 g, 1.75 mm.</p>',
    variants: [{ id: 121, title: 'Default Title', sku: 'FX-1', price: '20.00', compare_at_price: '', available: true }] },
] }));
const meta = Buffer.from(JSON.stringify({ name: 'Fixture Shop', country: 'CA', currency: 'CAD', domain: 'fixture-shop.invalid' }));

test('a Shopify catalogue page gives each variant its price, compare-at price, stock, SKU and title', () => {
  const { offers } = shopifyCatalogueOffers(catalogue, CATALOGUE_URL);
  assert.equal(offers.length, 3);
  const [black, natural, other] = offers;
  assert.deepEqual([black.key, black.price, black.compareAt, black.available, black.sku], ['11:111', 32.99, 39.99, true, 'ESUN-GF-BK']);
  assert.equal(black.title, 'eSUN PLA+GF Filament 1.75mm, 1kg / Black');
  assert.equal(black.url, 'https://fixture-shop.invalid/products/esun-pla-gf?variant=111');
  assert.equal(natural.available, false);
  assert.equal(other.title, 'Fixture Brand Spool');
  assert.equal(shopMeta(meta).currency, 'CAD');
});

test('a net mass is read from the listing\'s own words, metric and single, and 1.75 mm from what it says', () => {
  assert.equal(massKg('PLA 1.75mm, 1kg'), 1);
  assert.equal(massKg('PETG 750g spool'), 0.75);
  assert.equal(massKg('1 kg (2.2 lbs)'), 1);
  assert.equal(massKg('Sample pack 250 g and 1 kg'), null);
  assert.equal(massKg('PLA 1.75 mm'), null);
  assert.equal(isOneSeventyFive('1.75mm'), true);
  assert.equal(isOneSeventyFive('2.85 mm only'), false);
  assert.equal(isOneSeventyFive('PLA spool'), null);
});

test('a product page\'s schema.org offers give price, currency and stock, with a strike-through list price', () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Fixture PETG 1.75 mm 1 kg', brand: { name: 'Fixture' },
    offers: { '@type': 'AggregateOffer', offers: [
      { '@type': 'Offer', sku: 'F-1', price: '24.90', priceCurrency: 'EUR', availability: 'https://schema.org/InStock',
        priceSpecification: [{ '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: '29.90', priceCurrency: 'EUR' }] },
      { '@type': 'Offer', sku: 'F-2', price: '26.90', priceCurrency: 'EUR', availability: 'https://schema.org/OutOfStock' },
    ] } })}</script></head><body>Prices incl. 19% VAT</body></html>`;
  const { currency, offers } = jsonLdOffers(Buffer.from(html), 'https://fixture.invalid/petg');
  assert.equal(currency, 'EUR');
  assert.deepEqual(offers.map((o) => [o.key, o.price, o.compareAt, o.available]), [['F-1', 24.9, 29.9, true], ['F-2', 26.9, null, false]]);
});

test('an Amazon page drawn by a browser gives the buy box\'s price, its list price, its stock and its seller', () => {
  // A member's price elsewhere on the page is not the buy box's.
  const html = `<input type="hidden" name="currencyOfPreference" value="CAD" id="currencyOfPreference"><input type="hidden" name="asin" value="B0FIXTURE1" id="asin">
    <span id="productTitle"> ELEGOO PLA Filament 1.75mm 1kg </span><div id="bylineInfo_feature_div"><a id="bylineInfo" href="/stores/ELEGOO">Visit the ELEGOO Store</a></div>
    <div class="members">priceToPay <span class="a-price-whole">17<span class="a-price-decimal">.</span></span><span class="a-price-fraction">49</span></div>
    <div id="corePriceDisplay_desktop_feature_div"><span class="a-price priceToPay apex-pricetopay-value"><span class="a-price-whole">21<span class="a-price-decimal">.</span></span><span class="a-price-fraction">99</span></span>
    <span class="basisPrice">List Price: <span class="a-price a-text-price apex-basisprice-value" data-a-strike="true"><span class="a-offscreen">$27.99</span></span></span></div>
    <div id="availability" class="a-section"><span class="primary-availability-message"> In Stock </span></div>
    <span class="a-size-small"> Sold by: </span> <span class="a-size-small"> ELEGOO Official CA </span>`;
  const { currency, offers: [o] } = amazonOffers(Buffer.from(html), 'https://www.amazon.ca/dp/B0FIXTURE1?th=1');
  assert.equal(currency, 'CAD');
  assert.deepEqual([o.key, o.price, o.compareAt, o.available, o.soldBy, o.vendor, o.url], ['B0FIXTURE1', 21.99, 27.99, true, 'ELEGOO Official CA', 'ELEGOO', 'https://www.amazon.ca/dp/B0FIXTURE1']);
});

// A proposal as `propose` writes it, built from the fixture documents.
const seller = { Host: 'fixture-shop.invalid', Retailer: 'Fixture Shop', Code: 'FIXTURE', Market: 'Canadian storefront', 'Tax / shipping': 'Excluded; shipping calculated at checkout' };
const docSha = storeBytes(catalogue).sha, metaSha = storeBytes(meta).sha;
const capture = { Host: seller.Host, URL: CATALOGUE_URL, Kind: 'catalogue', Format: 'shopify-catalogue', SHA256: docSha, Accessed: '2026-09-30' };
const grade = { GradeID: 'G019-03', MaterialID: 'M019', Manufacturer: 'eSUN', Status: 'active', Role: 'procurement' };
const offer = { ...shopifyCatalogueOffers(catalogue, CATALOGUE_URL).offers[0], currency: 'CAD', description: 'Glass-fibre PLA. Diameter 1.75 mm.', capture };
const proposal = (edit = (r) => r, review = { status: 'accepted', by: 'the test' }) => ({
  file: 'fixture.json', kind: 'prices',
  document: { sha256: docSha, url: CATALOGUE_URL, format: 'shopify-catalogue', host: seller.Host, accessed: '2026-09-30' },
  currencyDocument: { sha256: metaSha, url: 'https://fixture-shop.invalid/meta.json', currency: 'CAD', source: { row: { ...sourceRow({ ...capture, URL: 'https://fixture-shop.invalid/meta.json', SHA256: metaSha }, seller, [], { title: 'Fixture Shop shop profile' }), 'Citation role': 'register', 'Applicable grades': 'Shop scope' } } },
  source: { row: sourceRow(capture, seller, ['G019-03'], { title: 'Fixture Shop product catalogue, page 1' }) },
  prices: [{ offer: { key: '11:111', massFrom: 'title' }, row: edit(priceRow(offer, {}, seller, grade)), review }],
  review: { status: 'reviewed', by: 'the test' },
});
const world = () => ({ sources: [], grades: [grade], prices: [], currencies: new Set(['CAD', 'USD', 'EUR']), markets: new Set(['Canadian storefront']) });

test('a row the offer backs passes; its compare-at price is the list price and the displayed one the sale', () => {
  const p = proposal();
  assert.deepEqual(guard([p], world()), []);
  const r = p.prices[0].row;
  assert.deepEqual([r['List price'], r['Sale price'], r['Displayed price'], r.Stock, r['Net mass kg'], r.Currency, r['Headline sample']], [39.99, 32.99, 32.99, 'In stock', 1, 'CAD', 'TRUE']);
  assert.match(p.source.row.SourceID, /^CA-FIXTURE-20260930-[0-9a-f]{12}$/);
});

test('a row the offer does not back is refused, by code', () => {
  const codes = (p) => guard([p], world()).map((x) => x.code);
  assert.deepEqual(codes(proposal((r) => ({ ...r, 'List price': 36.99 }))), ['APPLY-PRICE-NOT-IN-OFFER']);
  assert.deepEqual(codes(proposal((r) => ({ ...r, 'Net mass kg': 0.75 }))), ['APPLY-PRICE-MASS']);
  assert.deepEqual(codes(proposal((r) => ({ ...r, Currency: 'USD' }))), ['APPLY-PRICE-NOT-IN-OFFER']);
  assert.deepEqual(codes(proposal((r) => r, { status: 'accepted' })), ['APPLY-UNREVIEWED']);
  const other = { ...proposal(), prices: [{ offer: { key: '12:121', massFrom: 'description' }, row: priceRow({ ...shopifyCatalogueOffers(catalogue, CATALOGUE_URL).offers[2], currency: 'CAD', description: 'Net weight 750 g, 1.75 mm.', capture }, { 'Mass from': 'description' }, seller, grade), review: { status: 'accepted', by: 'the test' } }] };
  assert.deepEqual(codes(other), ['APPLY-PRICE-GRADE']);
});

// The rehearsal needs a material without a Canadian price, which the pass keeps pricing: it takes the first one the
// tables hold, and a made-up listing of one of its products. Its gap is derived (D114), so it closes by itself.
test('the rehearsal writes a listing for a material without a Canadian price, and the core build passes', () => {
  const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
  const markets = new Map(readCsv(join(root, 'schema/vocab/markets.csv')).records.map((r) => [r.values.Value, r.values.Canadian]));
  const priced = new Set(table('prices').filter((p) => markets.get(p.Market) === 'yes' && p['Headline sample'] === 'TRUE' && p.Quarantined !== 'TRUE').map((p) => p.MaterialID));
  const g = table('grades').find((x) => !priced.has(x.MaterialID) && x.Role === 'procurement' && x.Status === 'active' && /^[A-Za-z]/.test(x.Manufacturer));
  assert.ok(g, 'no material without a Canadian price is left to rehearse on');
  const bytes = Buffer.from(JSON.stringify({ products: [{ id: 21, title: `${g.Manufacturer} ${g['Product name']} Filament 1.75mm, 1kg`, handle: 'fixture-gap', vendor: g.Manufacturer, product_type: 'Filament', body_html: '',
    variants: [{ id: 211, title: 'Black', sku: 'FX-GAP', price: '44.00', compare_at_price: null, available: true }] }] }));
  const sha = storeBytes(bytes).sha;
  const cap = { ...capture, SHA256: sha };
  const o = { ...shopifyCatalogueOffers(bytes, CATALOGUE_URL).offers[0], currency: 'CAD', description: '', capture: cap };
  const p = { ...proposal(), document: { ...proposal().document, sha256: sha }, source: { row: sourceRow(cap, seller, [g.GradeID], { title: 'Fixture Shop product catalogue, page 1' }) },
    prices: [{ offer: { key: '21:211', massFrom: 'title' }, row: priceRow(o, {}, seller, g), review: { status: 'accepted', by: 'the test' } }] };
  assert.deepEqual(guard([p], { ...world(), grades: [g] }), []);
  const r = rehearse([p], { migration: 'test', date: '2026-09-30' });
  assert.deepEqual([r.gate, r.lint.filter((f) => f.level === 'error'), r.build], [[], [], []]);
  assert.ok(r.log.some((l) => new RegExp(`^price CA\\d{4} ${g.GradeID} 44 CAD / 1 kg`).test(l)), r.log.join('\n'));
});

// A reviewer's stored Gap is a judgement the build does not restate, so a Canadian listing supersedes it in the same
// write (m141's pattern); otherwise COVERAGE-UNTRUE would stop the build beside the new price.
test('a stored Canadian-price gap is superseded by the write that prices the material', () => {
  const tables = { sources: [], prices: [], coverage: [{ CoverageID: 'C09990', MaterialID: grade.MaterialID, GradeID: 'Not applicable', Domain: 'Canadian price', Status: 'Gap', 'Manufacturer count': 'Not applicable', Finding: 'A reviewer found no listing.' }] };
  const key = { sources: 'SourceID', prices: 'PriceID', coverage: 'CoverageID' };
  const t = {
    rows: (n) => tables[n], find: (n, id) => tables[n].find((r) => r[key[n]] === id), append: (n, r) => tables[n].push(r),
    set: (n, id, column, value, { expect }) => { const r = t.find(n, id); assert.equal(r[column], expect); r[column] = value; },
  };
  const log = writePrices(t, [proposal()], { migration: 'test', date: '2026-09-30' });
  assert.ok(log.includes(`coverage C09991 (Canadian price of ${grade.MaterialID})`), log.join('\n'));
  assert.deepEqual(tables.coverage.map((c) => [c.CoverageID, c.Status]), [['C09990', 'Superseded'], ['C09991', 'Resolved']]);
  assert.match(tables.coverage[0].Finding, /^Superseded by C09991 \(2026-09-30; was "Gap"\): A reviewer found no listing\.$/);
});

test('a captured page is stored by its digest and its text is read as it is kept', async () => {
  const page = Buffer.from('<html><head><title>Fixture listing</title></head><body><h1>Fixture PLA 1.75 mm 1 kg</h1><p>Price 24.99 inkl. 19 % MwSt.</p></body></html>');
  const { sha } = await keep(page);
  const text = cachedText(sha);
  assert.ok(text, 'the page has cached text');
  assert.match(text.pages.flatMap((p) => p.lines.map((l) => l.text)).join(' '), /Fixture PLA 1\.75 mm 1 kg/);
});
