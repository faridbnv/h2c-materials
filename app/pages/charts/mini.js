// The first screen's key-figure plate draws, under each key figure, its products' spread small: the lowest to highest as
// a hairline, the middle half as a bar (from four products), the median as a tick; hollow circles where the products
// publish it only with no stated orientation or load; a chevron at the edge for a value beyond the scale. It is drawn on
// the property's own scale, the same on every page and in the same column of "Against its alternatives" (peers.js
// columnScale), with the scale's ends printed under it. No other material's mark: comparing is the figure's job. x in per
// cent, so the drawing takes its cell's width.

import { esc, fmtDisplay, NBSP, headline, withUnit, spanUnit, products, tickText } from './kit.js';
import { columnScale, cellMarks } from './peers.js';
import { materialCell } from '../../js/ui/material-stats.js';

/** The small spread drawing for key figure `key` of material context `c`: an SVG string, or '' where nothing is on file. */
export function miniSpread(c, key) {
  const h = headline(key);
  const own = h ? materialCell(c.m, key) : null;
  const sc = own ? columnScale(c, key) : null;
  if (!own || !sc) return '';
  const y = 9;
  const label = own.kind === 'open'
    ? `${h.labels.plain}: ${spanUnit(own.min, own.max, h.unit)} set apart (test bar not described as printed, or no stated load), ${products(own.n)}`
    : `${h.labels.plain}: median ${withUnit(own.median, h.unit)}${own.q1 != null ? `, middle half ${spanUnit(own.q1, own.q3, h.unit)}` : ''}, lowest to highest ${spanUnit(own.min, own.max, h.unit)}, ${products(own.n)}`;
  const o = [`<line class="dv-axis" x1="0" x2="100%" y1="${y}" y2="${y}"/>`, cellMarks(own, sc, y, 'self', { tick: 14, band: 8 })];
  o.push(`<text x="0" y="27">${esc(tickText(sc.from))}</text><text x="100%" y="27" text-anchor="end">${esc(`${tickText(sc.hi)}${sc.log ? `${NBSP}(log)` : ''}`)}</text>`);
  return `<svg class="dv-mini" data-mini="${esc(key)}" data-n="${own.n}" width="100%" height="30" role="img" aria-label="${esc(`${label}; scale ${tickText(sc.from)} to ${tickText(sc.hi)}${NBSP}${h.unit}${sc.log ? ', logarithmic' : ''}, the same on every material's page`)}">${o.join('')}</svg>`;
}
