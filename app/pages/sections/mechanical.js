// Mechanical: the tensile, flexural and impact comparisons drawn product by product at full width (the drawer's
// comparison headings, D133, D139, D140), Z against XY where a test pairs the two, strength against stiffness
// (figures.js), then every other mechanical property on file counted, with the way to its records.

import { esc, count } from '../html.js';
import { measuredIn } from '../../js/ui/material-facts.js';
import { EMPTY_LINES } from '../../js/ui/material-words.js';
import { FIGURE_PAIRS } from '../figures.js';
import { emptyBody, comparisonBlocks, pairScatter, otherProperties, figureCounter } from './common.js';

/** A domain section (Mechanical or Thermal): its comparisons, the scatters filed under it, its other properties. */
export function domainSection(c, tab, place, { id, anchor, noun }) {
  const mi = measuredIn(c, tab);
  if (!mi.rows.length) {
    const other = otherProperties(c, tab, new Set(), anchor);
    return { empty: true, html: emptyBody(c, EMPTY_LINES[tab], { tab, anchor }) + other.html, stats: {} };
  }
  const next = figureCounter(place.n);
  const pairs = FIGURE_PAIRS.filter((p) => p.section === id);
  // A scatter follows the comparison that draws its vertical axis's test, so it is read beside it.
  const cmp = comparisonBlocks(c, tab, next, anchor, (f, nextFig) => pairs.filter((p) => f.hs.some((h) => h.key === p.y)).map((p) => pairScatter(c, p, nextFig)).filter(Boolean));
  const other = otherProperties(c, tab, cmp.covered, anchor);
  const products = new Set(mi.rows.map((x) => x.gradeId)).size;
  const lead = `${count(mi.rows.length, `published ${noun} value`)} from ${count(products, 'product')}${cmp.figures ? ', drawn product by product where a test compares them, then the other properties counted' : ''}.`;
  return { empty: false, html: `<p class="lead">${esc(lead)}</p>${cmp.html}${other.html}`, stats: { figures: cmp.figures, dots: cmp.dots } };
}

export default {
  id: 'mechanical',
  title: 'Mechanical',
  records: '#measurements-mechanical',
  render(c, env, place) {
    return domainSection(c, 'Mechanical', place, { id: 'mechanical', anchor: '#measurements-mechanical', noun: 'mechanical' });
  },
};
