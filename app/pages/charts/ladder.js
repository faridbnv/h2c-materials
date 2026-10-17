// The heat ladder: a material's temperatures on one axis (material-stats.js heatLadder), lowest first, each as the
// middle half of its products (a band), their lowest to highest (a hairline) and their median (a tick, labelled), with
// the H2C's heated-chamber limit as a dashed line across every rung. A property compared as a key property is drawn in
// the accent; one drawn from the values as published, with its sheet's own test conditions, in grey.
//
// Where the highest rungs (a melting point) lie far above the rest, the axis is broken: the softening temperatures keep
// most of the width, the rungs above the break a narrow zone of their own, its own ticks, and a break mark between, so
// the temperatures a part meets are not squeezed against one far away.

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { stripScale } from './scale.js';
import { labelsFit } from './axis.js';

const RUNG = 46;
const TOP = 26;
/** A gap above the lower rungs this wide (°C), and at least as wide as their own span, breaks the axis. */
const BREAK_GAP = 40;
/** The share of the width the zone above a break takes, and the gap the break mark sits in (per cent). */
const HIGH_ZONE = 24, BREAK_W = 4;

/** A rung's middle: its band where it has one, else its median. */
const lowOf = (r) => r.summary.q1 ?? r.summary.median;
const highOf = (r) => r.summary.q3 ?? r.summary.median;

/**
 * Rows split where the axis breaks: the lowest band of the upper group starts far above the highest band of the lower
 * (BREAK_GAP, and at least the lower bands' own span). Whiskers may cross the gap; they are cut at their zone's edge.
 */
function splitAt(rows) {
  for (let i = 1; i < rows.length; i++) {
    const below = rows.slice(0, i), above = rows.slice(i);
    const top = Math.max(...below.map(highOf)), bottom = Math.min(...above.map(lowOf));
    const span = top - Math.min(...below.map(lowOf));
    if (bottom - top >= Math.max(BREAK_GAP, span)) return i;
  }
  return 0;
}

/** The tick row under the ladder: each zone's ticks at their places, thinned where they would collide. */
function ticks(zones, { wide = 440, narrow = 240 } = {}) {
  const all = zones.flatMap((z) => z.scale.ticks.map((v) => ({ v, p: z.at(v) })));
  const texts = all.map((t) => fmtNumber(t.v)), places = all.map((t) => t.p);
  const fits = labelsFit(texts, places, wide), fitsNarrow = labelsFit(texts, places, narrow);
  const marks = all.map((t, i) => {
    const anchor = t.p >= 99.5 ? 'end' : t.p <= 0.5 ? 'start' : 'middle';
    return `<line x1="${pct(t.p)}" x2="${pct(t.p)}" y1="0" y2="4"/>${fits[i] ? `<text x="${pct(t.p)}" y="16" text-anchor="${anchor}"${fitsNarrow[i] ? '' : ' class="alt"'}>${esc(texts[i])}</text>` : ''}`;
  }).join('');
  const lines = zones.map((z) => `<line class="axis-line" x1="${pct(z.from)}" x2="${pct(z.to)}" y1="0.5" y2="0.5"/>`).join('');
  // The break: two short slashes on the axis between the zones.
  const brk = zones.length > 1 ? `<text class="brk-mark" x="${pct((zones[0].to + zones[1].from) / 2)}" y="5" text-anchor="middle">//</text>` : '';
  return `<svg class="fig-ticks" height="22" aria-hidden="true" focusable="false">${lines}${marks}${brk}</svg>`;
}

/** `rows` from heatLadder, each with `label`, `short` and `sub` set by the caller; `limit` the chamber's (°C) or null. */
export function ladderPlot(rows, { limit = null, limitWords = '' } = {}) {
  const cut = splitAt(rows);
  const groups = cut ? [rows.slice(0, cut), rows.slice(cut)] : [rows];
  // Each zone: its scale over its rungs (the lower one with the limit where it is near), and where it sits, in per cent.
  const zones = groups.map((g, i) => {
    // A zone's scale holds its bands and medians, and the lowest and highest values that do not reach across the break.
    const core = g.flatMap((r) => [lowOf(r), highOf(r), r.summary.median]);
    const reach = Math.max(BREAK_GAP / 2, (Math.max(...core) - Math.min(...core)) / 2);
    const values = groups.length === 1 ? g.flatMap((r) => [r.summary.min, r.summary.max])
      : [...core, ...g.map((r) => r.summary.min).filter((v) => v >= Math.min(...core) - reach), ...g.map((r) => r.summary.max).filter((v) => v <= Math.max(...core) + reach)];
    const withLimit = i === 0 && limit != null && limit <= Math.max(...values) + BREAK_GAP;
    const scale = stripScale(withLimit ? [...values, limit] : values, '°C');
    const from = i === 0 ? 0 : 100 - HIGH_ZONE, to = groups.length === 1 ? 100 : i === 0 ? 100 - HIGH_ZONE - BREAK_W : 100;
    return { rows: g, scale, from, to, withLimit, at: (v) => from + (scale.pct(v) / 100) * (to - from), cut: (v) => v < scale.from || v > scale.hi };
  });
  const zoneOf = (r) => zones.find((z) => z.rows.includes(r));
  const h = TOP + rows.length * RUNG;
  const grid = zones.flatMap((z) => z.scale.ticks.map((t) => `<line class="grid" x1="${pct(z.at(t))}" x2="${pct(z.at(t))}" y1="${TOP - 4}" y2="${h}"/>`)).join('');
  const brk = zones.length > 1 ? (() => {
    const x = 100 - HIGH_ZONE - BREAK_W / 2;
    return `<g class="brk"><rect x="${pct(x - BREAK_W / 2 + 0.6)}" y="${TOP - 4}" width="${pct(BREAK_W - 1.2)}" height="${h - TOP + 4}"/></g>`;
  })() : '';
  const rungs = rows.map((r, i) => {
    const z = zoneOf(r);
    const X = z.at;
    const s = r.summary;
    const y = TOP + i * RUNG + RUNG / 2;
    const cls = r.compared ? 'rung' : 'rung rung--pub';
    const range = s.min !== s.max ? `<line class="r-range" x1="${pct(X(s.min))}" x2="${pct(X(s.max))}" y1="${y}" y2="${y}"/>` : '';
    // A whisker cut at its zone's edge ends in a small arrowhead: the value lies beyond.
    const arrow = (v, dir) => (z.cut(v) ? `<svg x="${pct(X(v))}" y="${y}" overflow="visible" class="r-cut"><path d="M${-dir * 5} -4L0 0L${-dir * 5} 4"/></svg>` : '');
    const cuts = s.min !== s.max ? `${arrow(s.min, -1)}${arrow(s.max, 1)}` : '';
    const band = s.q1 != null ? `<rect class="r-band" x="${pct(X(s.q1))}" y="${y - 7}" width="${pct(Math.max(X(s.q3) - X(s.q1), 0.5))}" height="14" rx="3"/>` : '';
    const tick = `<line class="r-med" x1="${pct(X(s.median))}" x2="${pct(X(s.median))}" y1="${y - 11}" y2="${y + 11}"/>`;
    const p = X(s.median);
    const anchor = p > 88 ? 'end' : 'start';
    const label = `<text class="r-val" x="${pct(p)}" y="${y - 13}" dx="${anchor === 'end' ? -4 : 4}" text-anchor="${anchor}">${esc(fmtNumber(s.median, '°C'))}</text>`;
    return `<g class="${cls}" data-rung="${esc(r.id)}">${range}${cuts}${band}${tick}${label}</g>`;
  }).join('');
  const lz = zones.find((z) => z.withLimit);
  const line = lz ? `<line class="limit" x1="${pct(lz.at(limit))}" x2="${pct(lz.at(limit))}" y1="2" y2="${h}"/>`
    + `<text class="limit-label" x="${pct(lz.at(limit))}" y="11" dx="${lz.at(limit) > 55 ? -5 : 5}" text-anchor="${lz.at(limit) > 55 ? 'end' : 'start'}">${esc(limitWords)}</text>` : '';
  // Each label in full, and short for a phone's narrow column ("HDT 1.8", "Vicat").
  const labels = rows.map((r) => `<li class="${r.compared ? '' : 'pub'}"><span class="l-long">${esc(r.label)}</span><span class="l-short">${esc(r.short ?? r.label)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</li>`).join('');
  return `<div class="ladder"><ol class="ladder-labels" style="--top:${TOP}px;--rung:${RUNG}px">${labels}</ol>`
    + `<div class="ladder-plot"><svg class="ladder-svg" height="${h}" aria-hidden="true" focusable="false">${grid}${brk}${line}${rungs}</svg>${ticks(zones)}`
    + `<p class="ladder-unit">°C${zones.length > 1 ? ', the axis broken between the two zones' : ''}</p></div></div>`;
}
