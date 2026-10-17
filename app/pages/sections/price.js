// Density and price: the weight half and the cost half of the core decision. Their sentences (findings.js densityWords,
// priceWords: the typical value and its middle half from the compiled spread, materials[].summary; the lowest price by
// name; a single price with where it was converted; a Canadian listing that records no regular price), each product's
// value on a strip (figures.js stripsFigure, STRIP_SETS['density-price']), and how the prices were sampled, said once.

import { densityWords, priceWords, priceSampleLine } from '../findings.js';
import { opening, para, drawFigure, figureConfig } from './common.js';

const KEYS = ['density', 'priceCADkg'];

export default {
  id: 'price',
  title: 'Density and price',
  render(c, env = {}) {
    const m = c.m;
    const density = densityWords(c);
    const price = priceWords(c);
    if (!density && !price.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {})['density-price'] ?? KEYS;
    const fig = drawFigure('stripsFigure', c, env, keys, { id: 'density-price' });
    const priced = m.summary?.priceCADkg?.n || c.prices.length;
    return {
      empty: false,
      html: [opening([density, ...price]), fig.empty ? '' : fig.html, priced ? para([priceSampleLine(c)], 'sec-note') : ''].filter(Boolean).join('\n'),
      stats: { figures: fig.empty ? 0 : (fig.stats?.figures ?? 1), dots: fig.stats?.dots ?? 0 },
    };
  },
};
