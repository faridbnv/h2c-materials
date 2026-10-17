// The first screen's key-figure plate draws, under each key figure, its products' spread small: the lowest to highest as
// a hairline, the middle half as a bar (from four products), the median as a tick; hollow circles where the products
// publish it only with no stated orientation. It is drawn on the scale of the same column of "Against its alternatives"
// (charts/peers.js), so the plate and the figure agree, with the scale's ends printed under it. No other material's mark:
// comparing is the figure's job. x in per cent, so the drawing takes its cell's width.

import { esc, pct, fmtDisplay, headline, withUnit, spanUnit, products, figContext } from './kit.js';
import { columnCells, columnScale } from './peers.js';

/** The small spread drawing for key figure `key` of material context `c`: an SVG string, or '' where nothing is on file. */
export function miniSpread(c, key) {
  const h = headline(key);
  if (!h) return '';
  const k = figContext(c);
  const cells = columnCells([c.m, ...k.peers], key);
  const own = cells[0];
  if (!own) return '';
  const sc = columnScale(cells, h.unit);
  const X = (v) => sc.pct(v);
  const y = 9;
  const o = [`<line class="dv-axis" x1="0" x2="100%" y1="${y}" y2="${y}"/>`];
  let label;
  if (own.kind === 'open') {
    if (own.min !== own.max) o.push(`<line class="dv-open-line" x1="${pct(X(own.min))}" x2="${pct(X(own.max))}" y1="${y}" y2="${y}"/>`);
    for (const v of new Set([own.min, own.max])) o.push(`<circle class="dv-open" cx="${pct(X(v))}" cy="${y}" r="3.6"/>`);
    label = `${h.labels.plain}: ${spanUnit(own.min, own.max, h.unit)} as published (orientation or load not stated), ${products(own.n)}`;
  } else {
    if (own.min !== own.max) o.push(`<line class="dv-self-range" x1="${pct(X(own.min))}" x2="${pct(X(own.max))}" y1="${y}" y2="${y}"/>`);
    if (own.q1 != null && own.q3 != null) o.push(`<rect class="dv-self-band" x="${pct(X(own.q1))}" y="${y - 4}" width="${pct(Math.max(X(own.q3) - X(own.q1), 1))}" height="8" rx="2"/>`);
    o.push(`<svg x="${pct(X(own.median))}" y="${y}" overflow="visible"><rect class="dv-self" x="-1.5" y="-7" width="3" height="14" rx="1.5"/></svg>`);
    label = `${h.labels.plain}: median ${withUnit(own.median, h.unit)}${own.q1 != null ? `, middle half ${spanUnit(own.q1, own.q3, h.unit)}` : ''}, lowest to highest ${spanUnit(own.min, own.max, h.unit)}, ${products(own.n)}`;
  }
  o.push(`<text x="0" y="27">${esc(fmtDisplay(sc.from, ''))}</text><text x="100%" y="27" text-anchor="end">${esc(fmtDisplay(sc.hi, ''))}</text>`);
  return `<svg class="dv-mini" data-mini="${esc(key)}" data-n="${own.n}" width="100%" height="30" role="img" aria-label="${esc(`${label}; scale ${fmtDisplay(sc.from, h.unit)} to ${withUnit(sc.hi, h.unit)}${sc.log ? ', logarithmic' : ''}`)}">${o.join('')}</svg>`;
}
