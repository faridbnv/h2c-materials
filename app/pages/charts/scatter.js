// A scatter: one mark per product at its two values, each axis on the one scale rule (scales.js). x is in per cent of
// the plot's width and y in px, so the plot is fluid. Where both axes are one property in two orientations (Z against
// XY) they share one scale, and the diagonal is drawn where Z equals XY.

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { mark } from './marks.js';
import { yOf } from './scale.js';
import { labelsFit } from './axis.js';

/**
 * A plot `height` px tall: `points` are `{ x, y, marks, data }` in the axes' units; `xs` and `ys` are stripScale
 * results; `diagonal` draws y = x (only where xs and ys are one scale). The axis titles are HTML, above and below.
 */
export function scatterPlot({ points, xs, ys, height = 280, diagonal = false, xTitle, yTitle, wide = 560, narrow = 280 }) {
  const vgrid = xs.ticks.map((v) => `<line class="grid" x1="${pct(xs.pct(v))}" x2="${pct(xs.pct(v))}" y1="0" y2="${height}"/>`).join('');
  const hgrid = ys.ticks.map((v) => `<line class="grid" x1="0" x2="100%" y1="${yOf(ys, v, height)}" y2="${yOf(ys, v, height)}"/>`).join('');
  const texts = xs.ticks.map((v) => fmtNumber(v)), places = xs.ticks.map((v) => xs.pct(v));
  const fits = labelsFit(texts, places, wide), fitsNarrow = labelsFit(texts, places, narrow);
  const xlabels = xs.ticks.map((v, i) => {
    const p = places[i];
    const anchor = p >= 99.5 ? 'end' : p <= 0.5 ? 'start' : 'middle';
    return fits[i] ? `<text x="${pct(p)}" y="${height + 17}" text-anchor="${anchor}"${fitsNarrow[i] ? '' : ' class="alt"'}>${esc(texts[i])}</text>` : '';
  }).join('');
  const ylabels = ys.ticks.map((v) => `<text x="-8" y="${yOf(ys, v, height) + 4}" text-anchor="end">${esc(fmtNumber(v))}</text>`).join('');
  const diag = diagonal ? `<line class="diagonal" x1="0" x2="100%" y1="${height}" y2="0"/>` : '';
  const marks = points.map((p) => mark(p.marks, pct(xs.pct(p.x)), yOf(ys, p.y, height), p.data)).join('');
  // A point with a `label` is named beside it: to its right in the left half, to its left in the right half, so a long
  // name stays inside a phone's narrow plot.
  const named = points.filter((p) => p.label).map((p) => {
    const x = xs.pct(p.x), y = yOf(ys, p.y, height);
    return `<text class="callout" x="${pct(x)}" y="${y + 4}" dx="${x > 50 ? -9 : 9}" text-anchor="${x > 50 ? 'end' : 'start'}">${esc(p.label)}</text>`;
  }).join('');
  return `<div class="sc"><div class="sc-y">${esc(yTitle)}${ys.log ? ', log scale' : ''}</div>`
    + `<div class="sc-plot"><svg class="sc-svg" height="${height}" aria-hidden="true" focusable="false">${vgrid}${hgrid}`
    + `<line class="axis-line" x1="0" x2="100%" y1="${height - 0.5}" y2="${height - 0.5}"/><line class="axis-line" x1="0.5" x2="0.5" y1="0" y2="${height}"/>`
    + `${diag}${marks}${named}<g class="sc-labels">${xlabels}${ylabels}</g></svg></div>`
    + `<div class="sc-x">${esc(xTitle)}${xs.log ? ', log scale' : ''}</div></div>`;
}
