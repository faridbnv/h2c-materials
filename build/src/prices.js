// Prices in any currency (D113): a listing keeps the amounts, the currency, the market and the tax its page printed,
// and the build derives what the comparison reads from them, never a stored number.
//
//   regular per kg   list price, less the VAT the page states it includes, divided by the net filament mass, times the
//                    Bank of Canada's rate for its currency (CAD: 1), to the cent. The one CAD-equivalent a median,
//                    an index and a cost axis read. A Canadian listing's is its list price per kg, as it always was.
//   foreign          a listing that is not on a Canadian market (schema/vocab/markets.csv declares which are): it can
//                    price a product that has no Canadian listing, and nothing more. It never makes a product listed or
//                    buyable in Canada, and never closes its material's Canadian-price gap.
//
// One rate per currency is in force: the latest row of fx_rates.csv for it. Every foreign listing of a release is
// compared at that one frozen rate, never at a rate of its own day (the gap-fill plan's 04-PRICES).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.js';
import { parseValue, parseBoolean, cents } from './normalize/values.js';

const here = dirname(fileURLToPath(import.meta.url));
const num = (cell) => { const p = parseValue(cell); return p.known ? p.value : null; };

// Each market declares whether it is Canadian, as each specimen type declares its form: the value is the database's
// own wording, so what it means is written once, beside it.
const MARKETS = new Map(readCsv(join(here, '../../schema/vocab/markets.csv')).records.map((r) => [r.values.Value, r.values.Canadian]));
for (const [value, canadian] of MARKETS) {
  if (!['yes', 'no'].includes(canadian)) throw new Error(`schema/vocab/markets.csv: "${value}" has Canadian "${canadian ?? ''}"; write yes or no`);
}
export const isCanadianMarket = (market) => MARKETS.get(market) === 'yes';

/** The rate in force per currency: the latest fx_rates row for it (CAD needs none: it is 1). */
export function ratesInForce(fxRows) {
  const byCurrency = new Map();
  for (const r of fxRows) {
    const rate = { currency: r.Currency, cadPerUnit: num(r['CAD per unit']), date: r['Rate date'], sourceId: r.SourceID, locator: r.Locator };
    const held = byCurrency.get(rate.currency);
    if (!held || rate.date > held.date) byCurrency.set(rate.currency, rate);
  }
  return byCurrency;
}

/**
 * The compiled listings. A row outside the contract is a build error: an eligible listing with nothing to calculate a
 * price per kg from (PRICE-INCOMPLETE), with VAT at a rate its page does not state (PRICE-TAX-UNSTATED), in a currency
 * with no rate (PRICE-FX-MISSING), or on a Canadian market in another currency (PRICE-MARKET-CURRENCY).
 */
export function compilePrices(rows, fxRows, issues) {
  const rates = ratesInForce(fxRows);
  const prices = rows.map((r) => {
    const where = `prices ${r.PriceID}`;
    const eligibleForMedian = parseBoolean(r['Eligible for median']);
    const listPrice = num(r['List price']), netMassKg = num(r['Net mass kg']);
    const currency = r.Currency;
    const foreign = !isCanadianMarket(r.Market);
    if (!foreign && currency !== 'CAD') issues.push({ level: 'error', code: 'PRICE-MARKET-CURRENCY', where, message: `A listing on the market "${r.Market}" is in ${currency}; a Canadian listing is in CAD` });
    if (eligibleForMedian && (listPrice === null || !netMassKg)) {
      issues.push({ level: 'error', code: 'PRICE-INCOMPLETE', where, message: 'Eligible for median without a list price and net mass to calculate a price per kg from' });
    }
    // VAT the page states the price includes; Not applicable is a price before tax, Not published one that includes a
    // rate nobody printed, which no comparison can take off.
    const vatCell = String(r['VAT included %'] ?? '').trim();
    const vatPercent = num(vatCell);
    if (eligibleForMedian && vatCell === 'Not published') issues.push({ level: 'error', code: 'PRICE-TAX-UNSTATED', where, message: 'Eligible for median, but the price includes VAT at a rate the page does not state' });
    const rate = currency === 'CAD' ? null : rates.get(currency) ?? null;
    if (eligibleForMedian && currency !== 'CAD' && !rate?.cadPerUnit) issues.push({ level: 'error', code: 'PRICE-FX-MISSING', where, message: `No rate in fx_rates.csv for ${currency}` });
    const usable = eligibleForMedian && listPrice !== null && !!netMassKg && vatCell !== 'Not published' && (currency === 'CAD' || !!rate?.cadPerUnit);
    const preTax = vatPercent === null ? listPrice : listPrice / (1 + vatPercent / 100);
    return {
      id: r.PriceID, materialId: r.MaterialID, gradeId: r.GradeID, retailer: r.Retailer,
      variant: r['Variant / SKU'], packaging: r.Packaging, netMassKg,
      listPrice, salePrice: num(r['Sale price']),
      // A Canadian listing's regular price per kg is its list price per kg to the cent, as it was before any other
      // currency entered (m227 changed no value); a foreign one's is its pre-tax price per kg at the rate in force.
      regularPerKg: !usable ? null : currency === 'CAD' ? cents(preTax / netMassKg) : cents((preTax / netMassKg) * rate.cadPerUnit),
      stock: r.Stock,
      eligibleForMedian,
      headlineSample: parseBoolean(r['Headline sample']),
      displayedPrice: num(r['Displayed price']), currency, market: r.Market,
      taxShipping: r['Tax / shipping'], basis: r['Regular price basis'], url: r.URL,
      sourceId: r.SourceID, accessDate: r['Access date'], notes: r.Notes,
      // A wrong-product or duplicate listing (CA0098, a second record of a Spectrum PA6 Neat listing) stays as an audit
      // trail and nothing else; the Regular price basis says why.
      quarantined: parseBoolean(r.Quarantined) === true,
      // Said only where it is so, and a Canadian listing in CAD carries none of it.
      ...(foreign ? { foreign: true } : {}),
      ...(vatPercent !== null ? { vatPercent } : {}),
      ...(currency !== 'CAD' && usable ? { regularPerKgNative: cents(preTax / netMassKg), fx: { cadPerUnit: rate.cadPerUnit, date: rate.date, sourceId: rate.sourceId } } : {}),
    };
  });
  return { prices, fxRates: [...rates.values()].sort((a, b) => a.currency.localeCompare(b.currency)) };
}

/**
 * The listings a price is the median of: a product's (or, where no plain product is priced, a material's) headline
 * sample, its Canadian listings where it has any and its foreign ones only where it has none. A Canadian price is never
 * outvoted by a converted one.
 */
export function priceSample(listings) {
  const sample = listings.filter((p) => p.headlineSample && p.regularPerKg !== null);
  const canadian = sample.filter((p) => !p.foreign);
  return canadian.length ? canadian : sample;
}

/** What a converted price says of itself: its currencies and the rate date, or nothing for a Canadian price. */
export function convertedFrom(sample) {
  if (!sample.length || sample.some((p) => !p.foreign)) return null;
  return { currencies: [...new Set(sample.map((p) => p.currency))].sort(), rateDate: sample.map((p) => p.fx?.date).filter(Boolean).sort().at(-1) ?? null };
}

/** The price sample as a reader is told it: its dates, its Canadian retailers, and the rates foreign listings use. */
export function priceSampleMeta(prices, fxRates) {
  const live = prices.filter((p) => !p.quarantined);
  const dates = live.map((p) => p.accessDate).filter(Boolean).sort();
  const retailers = (list) => new Set(list.map((p) => p.retailer)).size;
  return {
    from: dates[0] ?? null, to: dates.at(-1) ?? null,
    canadianRetailers: retailers(live.filter((p) => !p.foreign)), foreignSellers: retailers(live.filter((p) => p.foreign)),
    currencies: [...new Set(live.map((p) => p.currency))].sort(),
    rates: fxRates.filter((r) => live.some((p) => p.currency === r.currency)),
  };
}

