// A graph's scale under its rows: a tick and a label at each of the scale's ticks (scales.js), the unit beside it in the
// label column. Labels at the ends are anchored inward so none runs off the track. A label that would run into its
// neighbour on a track `wide` px wide is left out (the tick stays); one that fits there but not on a phone's track
// (`narrow` px) carries `alt`, which a narrow screen hides. The ends are kept before the middle.

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';

/** About how wide a tick label is at 11 px: digits and separators are about 6.3 px each. */
const labelPx = (text) => text.length * 6.3 + 2;

/** Which of a scale's tick labels fit on a track `px` wide: a flag per tick, ends first. */
export function labelsFit(texts, places, px) {
  const keep = texts.map(() => false);
  if (!texts.length) return keep;
  const room = (i, j) => Math.abs(places[j] - places[i]) * px / 100 >= (labelPx(texts[i]) + labelPx(texts[j])) / 2 + 6;
  const last = texts.length - 1;
  keep[0] = true;
  if (last > 0 && room(0, last)) keep[last] = true;
  let prev = 0;
  for (let i = 1; i < last; i++) if (room(prev, i) && (!keep[last] || room(i, last))) { keep[i] = true; prev = i; }
  return keep;
}

/** The tick labels of a scale as an SVG row, `height` px tall, thinned for a track `wide` px wide and `narrow` on a phone. */
export function tickSvg(scale, { height = 22, cls = 'fig-ticks', wide = 600, narrow = 300 } = {}) {
  const texts = scale.ticks.map((v) => fmtNumber(v));
  const places = scale.ticks.map((v) => scale.pct(v));
  const fits = labelsFit(texts, places, wide);
  const fitsNarrow = labelsFit(texts, places, narrow);
  const marks = scale.ticks.map((v, i) => {
    const p = places[i];
    const anchor = p >= 99.5 ? 'end' : p <= 0.5 ? 'start' : 'middle';
    const label = fits[i] ? `<text x="${pct(p)}" y="16" text-anchor="${anchor}"${fitsNarrow[i] ? '' : ' class="alt"'}>${esc(texts[i])}</text>` : '';
    return `<line x1="${pct(p)}" x2="${pct(p)}" y1="0" y2="4"/>${label}`;
  }).join('');
  return `<svg class="${cls}" height="${height}" aria-hidden="true" focusable="false"><line class="axis-line" x1="0" x2="100%" y1="0.5" y2="0.5"/>${marks}</svg>`;
}

/** The axis row of a dot graph: the unit (and whether the scale is logarithmic) in the label column, the ticks beside it. */
export function axisRow(scale, unitWords) {
  return `<div class="fig-row fig-axis"><div class="fig-label fig-unit">${esc(unitWords)}${scale.log ? '<small>log scale</small>' : ''}</div>${tickSvg(scale)}</div>`;
}
