// Density and price: the weight half and the cost half of the core decision. Their sentences (findings.js densityWords,
// priceWords: the typical value and its middle half from the compiled spread, materials[].summary; the lowest price by
// name; a single price with where it was converted; a Canadian listing that records no regular price), each product's
// value on a strip (figures.js stripsFigure, STRIP_SETS['density-price']), and how the prices were sampled, said once.

import { densityWords, priceWords, priceSampleLine, plain, fmtD, glue } from '../findings.js';
import { opening, para, drawFigure, figureConfig, stripMin, publishedKeys, headlineTable } from './common.js';

const KEYS = ['density', 'priceCADkg'];

export default {
  id: 'price',
  title: 'Density and price',
  render(c, env = {}) {
    const m = c.m;
    const density = densityWords(c);
    const price = priceWords(c);
    // Said once, where the reader looks for it: no price in the sample.
    if (!m.summary?.priceCADkg?.n && !price.length) price.push(plain(`No ${m.name} product has a price in the sample.`));
    if (!density && !m.summary?.priceCADkg?.n && !c.prices.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {})['density-price'] ?? KEYS;
    const min = stripMin();
    const published = publishedKeys(c, keys);
    const stripped = published.filter((k) => (m.summary?.[k]?.n ?? 0) >= min);
    const tabled = published.filter((k) => !stripped.includes(k));
    const fig = stripped.length ? drawFigure('stripsFigure', c, env, stripped, { id: 'density-price' }) : { empty: true, html: '' };
    const priced = m.summary?.priceCADkg?.n || c.prices.length;
    return {
      empty: false,
      html: glue([opening([density, ...price]), fig.empty ? '' : fig.html, tabled.length ? headlineTable(c, tabled, { fmt: (v, u) => fmtD(v, u) }) : '',
        priced ? para([priceSampleLine(c)], 'sec-note') : ''].filter(Boolean).join('\n')),
      stats: { figures: fig.empty ? 0 : (fig.stats?.figures ?? 1), dots: fig.stats?.dots ?? 0 },
    };
  },
};
