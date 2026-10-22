// Density and price: the weight half and the cost half of the core decision. Their sentences (findings.js densityWords,
// priceWords: the typical value and its middle half from the compiled spread, materials[].summary; the lowest price by
// name; a single price with where it was converted; a Canadian listing that records no regular price), each product's
// value on a strip (figures.js stripsFigure, STRIP_SETS['density-price']), and how the prices were sampled, said once.

import type { Loose } from '../loose.ts';

import { densityWords, priceWords, priceSampleLine, plain, fmtD, glue } from '../findings.ts';
import { inStrip } from '../figures.ts';
import { opening, para, drawFigure, figureConfig, publishedKeys, headlineTable } from './common.ts';

const KEYS = ['density', 'priceCADkg'];

export default {
  id: 'price',
  title: 'Density and price',
  render(c: Loose, env: Loose = {}): Loose {
    const m = c.m;
    const density = densityWords(c);
    const price = priceWords(c);
    // Said once, where the reader looks for it: no price in the sample.
    if (!m.summary?.priceCADkg?.n && !price.length) price.push(plain(`No ${m.name} product has a price in the sample.`));
    if (!density && !m.summary?.priceCADkg?.n && !c.prices.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {})['density-price'] ?? KEYS;
    const published = publishedKeys(c, keys);
    const stripped = published.filter((k: Loose) => inStrip(m, k));
    const tabled = published.filter((k: Loose) => !stripped.includes(k));
    // No figure: across products a density varies little and the price sample is thin, so two sentences say it
    // (the second review: the figure "adds little"); a product's own price is on the Products page, sortable.
    const fig: Loose = { empty: true, html: '' };
    const priced = m.summary?.priceCADkg?.n || c.prices.length;
    return {
      empty: false,
      html: glue([opening([density, ...price]), fig.empty ? '' : fig.html, tabled.length ? headlineTable(c, tabled, { fmt: (v: Loose, u: Loose) => fmtD(v, u) }) : '',
        priced ? para([priceSampleLine(c)], 'sec-note') : ''].filter(Boolean).join('\n')),
      stats: { figures: fig.empty ? 0 : (fig.stats?.figures ?? 1), dots: fig.stats?.dots ?? 0 },
    };
  },
};
