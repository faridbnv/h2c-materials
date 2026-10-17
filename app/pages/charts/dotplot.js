// A dot plot: one row per test or setting, a mark per product at its value, on a scale shared by the rows of a graph.
// The middle half of the compared products is shaded and their median is a line (both the build's, or print-spread.js's
// for a print row); the H2C's limit is a dashed line where it is near the values. Dots closer than scales.js DOT_GAP
// stack upward, as in the drawer. A row is HTML (its label) beside an SVG track 100 % wide, x in per cent, y in px.

import { stack } from './scale.js';
import { mark } from './marks.js';
import { attrs, esc, pct, textPx } from '../html.js';

/** The vertical distance between stacked dots, and a track's height for a number of stacked rows. */
export const DOT_ROW = 10;
export const trackHeight = (rows) => Math.max(26, 24 + (rows - 1) * DOT_ROW);

/**
 * One row's track. `entries` are `{ v: { value }, marks, data, callout? }` (stack sets their x and row); `summary` the
 * row's `{ n, median, q1, q3 }` or null; `limit` a place in per cent for the H2C's limit, or null. An entry with a
 * `callout` (a product's name) is named in a band over the track, joined to its dot by a leader.
 */
export function dotTrack({ entries, scale, summary = null, limit = null }) {
  const rows = stack(entries, scale.pct);
  const calls = entries.filter((e) => e.callout);
  const top = calls.length ? 18 : 0;
  const h = trackHeight(rows) + top;
  const base = h - 11;
  const grid = scale.ticks.map((v) => `<line class="grid" x1="${pct(scale.pct(v))}" x2="${pct(scale.pct(v))}" y1="${top}" y2="${h}"/>`).join('');
  const band = summary?.q1 != null
    ? `<rect class="band" x="${pct(scale.pct(summary.q1))}" y="${top + 1}" width="${pct(Math.max(scale.pct(summary.q3) - scale.pct(summary.q1), 0.4))}" height="${h - top - 2}"/>` : '';
  const median = summary?.n > 1 ? `<line class="median" x1="${pct(scale.pct(summary.median))}" x2="${pct(scale.pct(summary.median))}" y1="${top}" y2="${h}"/>` : '';
  const line = limit != null ? `<line class="limit" x1="${pct(limit)}" x2="${pct(limit)}" y1="${top}" y2="${h}"/>` : '';
  const dots = entries.map((e) => mark(e.marks, pct(e.x), base - e.row * DOT_ROW, e.data)).join('');
  // Two names that would run into each other on a laptop's track (about 640 px) are set apart: the lower one ends at its
  // dot, the higher one starts at its own.
  const sorted = [...calls].sort((a, b) => a.x - b.x);
  const width = (e) => textPx(e.callout);
  // A name centred on its dot unless it would run off the track (about 640 px on a laptop): then it starts or ends there.
  const anchors = new Map(sorted.map((e) => { const x = (e.x / 100) * 640, w = width(e); return [e, x - w / 2 < 0 ? 'start' : x + w / 2 > 640 ? 'end' : 'middle']; }));
  const at = (e, px) => { const w = width(e), a = anchors.get(e), x = (e.x / 100) * px; return a === 'start' ? [x + 4, x + 4 + w] : a === 'end' ? [x - 4 - w, x - 4] : [x - w / 2, x + w / 2]; };
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    if (at(a, 640)[1] + 8 > at(b, 640)[0]) { anchors.set(a, 'end'); anchors.set(b, 'start'); }
  }
  // A name set apart that then runs off the track is left out (its dot keeps its value on hover).
  const dropped = new Set(sorted.filter((e) => at(e, 640)[0] < -2 || at(e, 640)[1] > 642));
  // On a phone's track (about 250 px) a name that would run off the track or into its neighbour is left out (class alt,
  // hidden below 720 px); the dot keeps its value on hover.
  const NARROW = 250;
  const extent = (e) => at(e, NARROW);
  const narrowFits = new Map(sorted.map((e) => { const [l, r] = extent(e); return [e, l >= 0 && r <= NARROW]; }));
  for (let i = 1; i < sorted.length; i++) if (extent(sorted[i - 1])[1] + 6 > extent(sorted[i])[0]) { narrowFits.set(sorted[i - 1], false); narrowFits.set(sorted[i], false); }
  const named = calls.filter((e) => !dropped.has(e)).map((e) => {
    const anchor = anchors.get(e);
    const alt = narrowFits.get(e) ? '' : ' alt';
    return `<line class="callout-line${alt}" x1="${pct(e.x)}" x2="${pct(e.x)}" y1="${top - 3}" y2="${base - e.row * DOT_ROW - 6}"/>`
      + `<text class="callout${alt}" x="${pct(e.x)}" y="${top - 6}" dx="${anchor === 'end' ? -4 : anchor === 'start' ? 4 : 0}" text-anchor="${anchor}">${esc(e.callout)}</text>`;
  }).join('');
  return `<svg class="fig-track" height="${h}" aria-hidden="true" focusable="false">${grid}${band}${line}${median}`
    + `<line class="base" x1="0" x2="100%" y1="${h - 0.5}" y2="${h - 0.5}"/>${named}${dots}</svg>`;
}

/** A row: its label (and a small line under it, such as how many products) beside its track. `data` are its attributes. */
export const dotRow = ({ data = {}, label, sub = '', track }) => `<div class="fig-row"${attrs(data)}><div class="fig-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>${track}</div>`;

/** A graph: its rows over one scale, and the scale's axis under them. */
export const dotGraph = (rows, axis, data = {}) => `<div class="fig-graph"${attrs(data)}>${rows.join('')}${axis}</div>`;
