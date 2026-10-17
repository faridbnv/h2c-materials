// A dot plot: one row per test or setting, a mark per product at its value, on a scale shared by the rows of a graph.
// The middle half of the compared products is shaded and their median is a line (both the build's, or print-spread.js's
// for a print row); the H2C's limit is a dashed line where it is near the values. Dots closer than scales.js DOT_GAP
// stack upward, as in the drawer. A row is HTML (its label) beside an SVG track 100 % wide, x in per cent, y in px.

import { stack } from './scale.js';
import { mark } from './marks.js';
import { attrs, esc, pct } from '../html.js';

/** The vertical distance between stacked dots, and a track's height for a number of stacked rows. */
export const DOT_ROW = 10;
export const trackHeight = (rows) => Math.max(26, 24 + (rows - 1) * DOT_ROW);

/**
 * One row's track. `entries` are `{ v: { value }, marks, data }` (stack sets their x and row); `summary` the row's
 * `{ n, median, q1, q3 }` or null; `limit` a place in per cent for the H2C's limit, or null.
 */
export function dotTrack({ entries, scale, summary = null, limit = null }) {
  const rows = stack(entries, scale.pct);
  const h = trackHeight(rows);
  const base = h - 11;
  const grid = scale.ticks.map((v) => `<line class="grid" x1="${pct(scale.pct(v))}" x2="${pct(scale.pct(v))}" y1="0" y2="${h}"/>`).join('');
  const band = summary?.q1 != null
    ? `<rect class="band" x="${pct(scale.pct(summary.q1))}" y="1" width="${pct(Math.max(scale.pct(summary.q3) - scale.pct(summary.q1), 0.4))}" height="${h - 2}"/>` : '';
  const median = summary?.n > 1 ? `<line class="median" x1="${pct(scale.pct(summary.median))}" x2="${pct(scale.pct(summary.median))}" y1="0" y2="${h}"/>` : '';
  const line = limit != null ? `<line class="limit" x1="${pct(limit)}" x2="${pct(limit)}" y1="0" y2="${h}"/>` : '';
  const dots = entries.map((e) => mark(e.marks, pct(e.x), base - e.row * DOT_ROW, e.data)).join('');
  return `<svg class="fig-track" height="${h}" aria-hidden="true" focusable="false">${grid}${band}${line}${median}`
    + `<line class="base" x1="0" x2="100%" y1="${h - 0.5}" y2="${h - 0.5}"/>${dots}</svg>`;
}

/** A row: its label (and a small line under it, such as how many products) beside its track. `data` are its attributes. */
export const dotRow = ({ data = {}, label, sub = '', track }) => `<div class="fig-row"${attrs(data)}><div class="fig-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>${track}</div>`;

/** A graph: its rows over one scale, and the scale's axis under them. */
export const dotGraph = (rows, axis, data = {}) => `<div class="fig-graph"${attrs(data)}>${rows.join('')}${axis}</div>`;
