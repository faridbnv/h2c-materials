// Price: each product's price per kilogram (grades[].headline.priceCADkg: the median of its listings, Canadian where it
// has any, else a foreign one converted at the Bank of Canada's rate, D113) drawn on one strip with the material's
// median and middle half, the listings counted by whether they are used, and strength against price (figures.js).

import { esc, tableBox } from '../html.js';
import { fmtNumber, priceSampleWords, convertedNote } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { spreadEntries, priceRows, productNameOrId } from '../../js/ui/material-facts.js';
import { plural, andList, joinedSpan, EMPTY_LINES } from '../../js/ui/material-words.js';
import { FIGURE_PAIRS } from '../figures.js';
import { stripScale } from '../charts/scale.js';
import { dotTrack, dotRow, dotGraph } from '../charts/dotplot.js';
import { axisRow } from '../charts/axis.js';
import { keyMark, keyBand, keyMedian, keyList } from '../charts/marks.js';
import { figure, figId } from '../charts/figure.js';
import { emptyBody, recordsLink, figureCounter, pairScatter, findingsBlock, notesHtml } from './common.js';
import { priceFindings } from '../findings.js';

/** Why listings are not used for a price, a sentence for each reason (material-facts.js priceRows().unused; the
 *  records page gives each listing's own, in UNUSED_WORDS). */
const NOT_USED = {
  quarantined: (n) => `${plural(n, 'listing')} ${n === 1 ? 'is a different product' : 'are of different products'}, and not used.`,
  'no-regular': (n) => `${plural(n, 'listing')} ${n === 1 ? 'records' : 'record'} no regular price per kilogram, and ${n === 1 ? 'is' : 'are'} not used.`,
  another: (n) => `${plural(n, 'listing')} ${n === 1 ? 'is' : 'are'} not used, because another listing of the same product is: Canadian listings come before foreign ones.`,
};

export default {
  id: 'price',
  title: 'Price',
  records: '#prices',
  render(c, env, place) {
    const m = c.m;
    const h = REGISTRY.headlines.find((x) => x.kind === 'price');
    const entries = h ? spreadEntries(m, c, h.key) : [];
    const listings = priceRows(c);
    if (!entries.length) {
      return { empty: true, html: emptyBody(c, listings.length ? 'No product of this material has a regular price per kilogram in the sample.' : EMPTY_LINES.Price, { tab: 'Price', anchor: '#prices' }), stats: {} };
    }
    const next = figureCounter(place.n);
    const s = m.summary?.[h.key];
    // The cheapest and the dearest of the products compared are named on the strip.
    const plain = entries.filter((e) => !e.variant);
    const ends = plain.length > 2 ? [plain.reduce((a, b) => (b.v.value < a.v.value ? b : a)), plain.reduce((a, b) => (b.v.value > a.v.value ? b : a))] : [];
    const dots = entries.map((e) => ({ v: e.v, marks: [e.v.converted ? 'open' : '', e.variant ? 'variant' : ''].filter(Boolean), data: { 'data-grade': e.g.id, 'data-v': fmtNumber(e.v.value) }, callout: ends.includes(e) ? productNameOrId(e.g) : null }));
    const marks = new Set(dots.flatMap((d) => d.marks));
    const scale = stripScale(entries.map((e) => e.v.value), h.unit);
    const graph = dotGraph([dotRow({ data: { 'data-headline': h.key, 'data-unit': h.unit, 'data-open': 'converted from a foreign listing' }, label: 'Price per kilogram', sub: `${entries.length} shown, ${s?.n ?? 0} compared`,
      track: dotTrack({ entries: dots, scale, summary: s }) })], axisRow(scale, h.unit));
    const key = keyList([
      dots.some((d) => !d.marks.length) ? [keyMark([]), 'a Canadian listing'] : null,
      marks.has('open') ? [keyMark(['open']), 'a foreign listing, converted to CAD'] : null,
      marks.has('variant') ? [keyMark(['variant']), 'special formulation'] : null,
      s?.q1 != null ? [keyBand, 'middle half'] : null,
      s?.n > 1 ? [keyMedian, 'median'] : null,
    ].filter(Boolean));
    const table = tableBox(`<table class="grid sum"><thead><tr><th scope="col">Price, <span class="u">CAD/kg</span></th><th scope="col" class="num" title="Products compared">n</th><th scope="col" class="num">Median</th><th scope="col" class="num">Middle half</th><th scope="col" class="num">Range</th></tr></thead>`
      + `<tbody><tr><th scope="row">Products</th><td class="num">${s?.n ?? 0}</td><td class="num">${s?.n ? esc(fmtNumber(s.median)) : '—'}</td><td class="num">${s?.q1 != null ? esc(`${fmtNumber(s.q1)}–${fmtNumber(s.q3)}`) : '—'}</td><td class="num">${s?.n ? esc(joinedSpan(s)) : '—'}</td></tr>`
      + `${s?.variants ? `<tr class="apart"><td colspan="5">${esc(`Also drawn, not in the median: ${plural(s.variants.n, 'special formulation')} (${joinedSpan(s.variants)}).`)}</td></tr>` : ''}</tbody></table>`);
    const used = listings.filter((r) => r.used).length;
    const unused = Object.entries(listings.reduce((acc, r) => { if (r.unused) acc[r.unused] = (acc[r.unused] ?? 0) + 1; return acc; }, {}));
    // This material's listings, by the sellers they come from; the whole sample's shops are said apart, so a single
    // listing is never read as coming from sixteen shops.
    const canadian = new Set(listings.filter((r) => !r.foreign).map((r) => r.p.retailer)), foreign = new Set(listings.filter((r) => r.foreign).map((r) => r.p.retailer));
    const from = andList([canadian.size ? plural(canadian.size, 'Canadian retailer') : null, foreign.size ? plural(foreign.size, 'foreign seller') : null].filter(Boolean));
    const notes = [
      `${listings.length === 1 ? 'Its one listing comes' : `Its ${plural(listings.length, 'listing')} come`} from ${from}, in a sample of ${priceSampleWords(c.db.meta)}: ${used} of ${plural(listings.length, 'listing')} ${used === 1 ? 'is' : 'are'} used.${unused.map(([why, n]) => ` ${NOT_USED[why]?.(n) ?? `${plural(n, 'listing')} ${n === 1 ? 'is' : 'are'} not used.`}`).join('')}`,
      m.headline[h.key]?.converted ? convertedNote(m.headline[h.key].converted) : null,
    ].filter(Boolean);
    const no = next();
    const fig = figure({
      id: figId(no), n: no, title: 'Each product\'s price per kilogram', data: { 'data-price': 'products' },
      key, plot: graph,
      label: `Dot plot of price per kilogram, one dot per product: ${plural(entries.length, 'product')}.`,
      read: esc('A dot is one product\'s price: the median of its listings\' regular prices per kilogram, Canadian where it has any. Sampled prices, not live ones.'),
      counted: notesHtml(notes) + table + `<p>${recordsLink(c, '#prices', 'Every listing, on the records page')}.</p>`,
    });
    const scatters = FIGURE_PAIRS.filter((p) => p.section === 'price').map((p) => pairScatter(c, p, next(), { title: 'Strength against price, product by product' })).filter(Boolean);
    const conv = m.headline[h.key]?.converted ? convertedNote(m.headline[h.key].converted) : null;
    const findings = priceFindings(s, entries.length, m.gradeIds.length, conv, s?.variants?.n ?? 0);
    return { empty: false, html: `${findingsBlock(findings)}${fig}${scatters.map((x) => x.html).join('')}`, stats: { figures: 1 + scatters.length, dots: entries.length + scatters.reduce((n, x) => n + x.dots, 0) } };
  },
};
