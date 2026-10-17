// Flat against across the layers, product by product (material-stats.js layerPairs): a row per product that publishes
// both orientations, its XY value as a grey dot, its Z value as an accent dot, a line between, and what Z keeps of XY at
// the row's end. Rows by that share, highest first. Over the rows, the median share as the panel's large number. One
// scale per panel from the scale rule, x in per cent; the product's name in the row's label.

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { stripScale } from './scale.js';
import { tickSvg } from './axis.js';
import { shapeOf } from './marks.js';

/** A row's height: 18 px, 15 px where there are many. */
const rowOf = (n) => (n > 24 ? 15 : 18);

/** A share as a whole per cent: "68 %". */
export const sharePercent = (r) => `${Math.round(r * 100)} %`;

/**
 * One property's panel: `pairs` from layerPairs, `title` ("Tensile strength"), `unit`, `median` (the median share),
 * `head` the words under the large number. Returns markup.
 */
export function dumbbellPanel({ pairs, title, unit, median, head, key }) {
  const rows = [...pairs].sort((a, b) => b.ratio - a.ratio || b.xy.v.value - a.xy.v.value);
  const scale = stripScale(rows.flatMap((p) => [p.xy.v.value, p.z.v.value]), unit);
  const X = (v) => scale.pct(v);
  const ROW = rowOf(rows.length);
  const h = rows.length * ROW + 4;
  const grid = scale.ticks.map((t) => `<line class="grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${h}"/>`).join('');
  const marks = rows.map((p, i) => {
    const y = 2 + i * ROW + ROW / 2;
    const shape = shapeOf(p.marks.includes('annealed') ? ['annealed'] : []);
    const data = (e, words) => ` data-grade="${esc(p.g.id)}" data-mid="${esc(e.v.measurementId ?? '')}" data-v="${esc(words)}"`;
    const flat = `${fmtNumber(p.xy.v.value, unit)} flat (XY)`;
    const across = `${fmtNumber(p.z.v.value, unit)} across the layers (Z), ${sharePercent(p.ratio)} of ${fmtNumber(p.xy.v.value, unit)} flat`;
    return `<line class="db-line" x1="${pct(X(p.z.v.value))}" x2="${pct(X(p.xy.v.value))}" y1="${y}" y2="${y}"/>`
      + `<use href="#${shape}" class="mk mk--xy" x="${pct(X(p.xy.v.value))}" y="${y}"${data(p.xy, flat)}/>`
      + `<use href="#${shape}" class="mk mk--z" x="${pct(X(p.z.v.value))}" y="${y}"${data(p.z, across)}/>`;
  }).join('');
  // A Z value above the XY value is marked: unusual for a printed part, so its sheet is worth checking.
  const names = rows.map((p) => `<li data-grade="${esc(p.g.id)}"><span class="db-name" title="${esc(p.name)}">${esc(p.name)}</span><span class="db-share${p.ratio > 1 ? ' over' : ''}">${esc(sharePercent(p.ratio))}${p.ratio > 1 ? '*' : ''}</span></li>`).join('');
  return `<div class="db" data-pair="${esc(key)}"><div class="db-head"><p class="db-big">${esc(sharePercent(median))}</p><p class="db-what"><b>${esc(title)}</b> ${esc(head)}</p></div>`
    + `<div class="db-body"><ol class="db-names" style="--row:${ROW}px">${names}</ol>`
    + `<div class="db-plot"><svg class="db-svg" height="${h}" aria-hidden="true" focusable="false">${grid}${marks}</svg>${tickSvg(scale, { wide: 260, narrow: 200 })}`
    + `<p class="db-unit">${esc(unit)}${scale.log ? ', log scale' : ''}</p></div></div></div>`;
}
