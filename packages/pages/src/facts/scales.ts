// The one scale rule for a row of values drawn product by product: the drawer's comparison headings and print
// temperatures (detail.js), and the material pages' figures, place a value on a track with these functions and no
// others, so a value sits at the same place, between the same ticks, wherever it is drawn.
//
// Impact results of one material run from a few kJ/m² to tens (PLA: 3 to 72), so the scale is logarithmic once the
// largest is more than ten times the smallest, with ticks at 1, 2 and 5 of each decade; below that it is linear from
// zero, ticked every round step. A temperature is an interval, not a ratio: its scale is linear from the round step at or
// below the lowest value (a glass transition may be below zero) and never logarithmic. Dots closer than DOT_GAP per cent
// of the track stack upward, as many rows as they need; where the rows would pass TRACK_MAX px, the drawer draws them
// closer (stackPitch), so a column's height stays in proportion to how many products it holds. Positions are per cent of
// the track, so a renderer draws them at any width.

import type { Loose } from '../loose.ts';

export const LOG_RATIO = 10;
export const DOT_GAP = 2;
/** The drawer's stacked rows (px): a 7 px dot's pitch, and the height a row of dots may take before its pitch tightens. */
export const DOT_PITCH = 7.5;
export const TRACK_MAX = 76;
export const NICE = [1, 2, 5];
/** A temperature scale spans at least this much about its values, so two products a degree apart are not drawn at the ends. */
export const MIN_SPAN_C = 10;
/** The H2C's limit is drawn on a temperature scale when it is no further above the highest value than the larger of
 *  these: a quarter of the values' span, or LIMIT_NEAR_C. */
export const LIMIT_NEAR_C = 10;

/** A round step giving four to eight ticks over a span. */
export const roundStep = (span: Loose): Loose => {
  const raw = span / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((n) => n * mag).find((v) => v >= raw);
};

/**
 * The scale for a row's values in a unit: `{ log, from, hi, ticks, pct }`, where `pct(v)` is the value's place on the
 * track in per cent (0 to 100, clamped) and `ticks` the labelled values, in order. `values` must hold at least one number.
 */
export function stripScale(values: Loose, unit: Loose): Loose {
  if (unit === '°C') {
    // At least a 10 °C span about the values, so two products a degree apart, or at one value, are not drawn at the
    // ends of the track or on a scale of one tick.
    const mid = (Math.min(...values) + Math.max(...values)) / 2;
    const lo = Math.min(...values, mid - MIN_SPAN_C / 2), hiValue = Math.max(...values, mid + MIN_SPAN_C / 2);
    const step = roundStep(hiValue - lo);
    const from = Math.floor(lo / step) * step;
    const hi = Math.ceil(hiValue / step) * step;
    const ticks: Loose[] = [];
    for (let v = from; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
    return { log: false, from, hi, ticks, pct: (v: Loose) => Math.max(0, Math.min(100, ((v - from) / (hi - from)) * 100)) };
  }
  const positive = values.filter((v: Loose) => v > 0);
  const hiValue = Math.max(0, ...values);
  const loValue = positive.length ? Math.min(...positive) : 0;
  const log = positive.length > 1 && positive.length === values.length && hiValue / loValue > LOG_RATIO;
  if (log) {
    // From the 1-2-5 step at or below the smallest value to the one at or above the largest.
    const steps: Loose[] = [];
    for (let e = Math.floor(Math.log10(loValue)) - 1; e <= Math.ceil(Math.log10(hiValue)) + 1; e++) for (const n of NICE) steps.push(Number((n * 10 ** e).toPrecision(3)));
    const from = steps.filter((v) => v <= loValue).at(-1) ?? loValue;
    const hi = steps.find((v) => v >= hiValue) ?? hiValue;
    const span = Math.log10(hi) - Math.log10(from) || 1;
    return { log, from, hi, ticks: steps.filter((v) => v >= from && v <= hi),
      pct: (v: Loose) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, from)) - Math.log10(from)) / span) * 100)) };
  }
  // The track to the first tick at or past the largest value.
  const step = roundStep(hiValue || 1);
  const hi = Math.ceil((hiValue || 1) / step) * step;
  const ticks: Loose[] = [];
  for (let v = 0; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
  return { log: false, from: 0, hi, ticks, pct: (v: Loose) => Math.max(0, Math.min(100, (v / hi) * 100)) };
}

/**
 * Stack a row's dots so none is drawn on another: each entry `{ v: { value } }` gains `x` (its place, per cent) and
 * `row` (0 at the bottom), in order of value. Returns how many rows the dots take, at least one. It sets `x` and `row` on
 * the entries it is given. There is no cap: a cap drew 76 products at one setting as tall as 6, so a column's height
 * stopped counting them; stackPitch keeps the track's height instead.
 */
export function stack(entries: Loose, pct: Loose) {
  const rows: Loose[] = [];
  for (const e of [...entries].sort((a, b) => a.v.value - b.v.value)) {
    e.x = pct(e.v.value);
    let row = rows.findIndex((last) => e.x - last >= DOT_GAP);
    if (row < 0) row = rows.length;
    rows[row] = e.x;
    e.row = row;
  }
  return Math.max(1, rows.length);
}

/** The pitch (px) of `rows` stacked rows: DOT_PITCH, closer where they would pass TRACK_MAX, so every column keeps its share. */
export const stackPitch = (rows: Loose) => Math.min(DOT_PITCH, (TRACK_MAX - 8) / Math.max(1, rows));
/** How many dots of one value show apart at DOT_PITCH; a taller column of one value carries its count. */
export const COLUMN_SHOWN = Math.floor((TRACK_MAX - 8) / DOT_PITCH);

/**
 * Whether the H2C's limit on a print setting is drawn on the setting's scale: where it is near the products' values
 * (within a quarter of their span, or LIMIT_NEAR_C, above the highest). Far above them, the axis says where it is, so
 * PLA's windows are not squeezed against a 350 °C line. A limit of null is never drawn.
 */
export function limitOnScale(limit: Loose, values: Loose) {
  if (limit == null) return false;
  const lo = Math.min(...values), hi = Math.max(...values);
  return limit <= hi + Math.max((hi - lo) / 4, LIMIT_NEAR_C);
}

/**
 * A dot strip's scale (the material pages' product strips): stripScale, except that a linear strip whose lowest value is
 * above half its highest starts at the round step at or below the lowest, as a temperature strip does. Dots, unlike bars,
 * need no zero baseline, and a material's densities of 1,170 to 1,330 kg/m³ drawn from zero are one blot. Logarithmic and
 * °C strips are stripScale's own. `{ log, from, hi, ticks, pct }`, as stripScale returns.
 */
export function dotScale(values: Loose, unit: Loose): Loose {
  const s = stripScale(values, unit);
  const lo = Math.min(...values), hi = Math.max(...values);
  if (s.log || unit === '°C' || lo === hi || !(lo > hi / 2)) return s;
  const step = roundStep(hi - lo || Math.abs(hi) * 0.1 || 1);
  const from = Math.floor(lo / step) * step;
  const top = Math.max(Math.ceil(hi / step) * step, from + step);
  const ticks: Loose[] = [];
  for (let v = from; v <= top + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
  return { log: false, from, hi: top, ticks, pct: (v: Loose) => Math.max(0, Math.min(100, ((v - from) / (top - from)) * 100)) };
}

/** Where a value lies against a scale: -1 below its start (or not positive on a logarithmic scale), 1 past its end, 0 on it. */
export const beyond = (scale: Loose, v: Loose): Loose => ((scale.log && !(v > 0)) || v < scale.from ? -1 : v > scale.hi ? 1 : 0);

/**
 * A scale zoomed to `values`, of the kind given (`log` true or false), with round ticks: logarithmic at 1, 2 and 5 of
 * each decade from the step at or below the lowest to the one at or above the highest; linear from the round step at or
 * below the lowest to the one at or above the highest. The material pages' product strips use it where their products sit
 * in a narrow part of the property's fixed scale (material-stats.js propertyScale), and say so.
 */
export function zoomScale(values: Loose, unit: Loose, log: Loose): Loose {
  const lo = Math.min(...values), hi = Math.max(...values);
  if (log && lo > 0) {
    const steps: Loose[] = [];
    for (let e = Math.floor(Math.log10(lo)) - 1; e <= Math.ceil(Math.log10(hi)) + 1; e++) for (const n of NICE) steps.push(Number((n * 10 ** e).toPrecision(3)));
    const from = steps.filter((v) => v <= lo).at(-1) ?? lo;
    let top = steps.find((v) => v >= hi) ?? hi;
    if (top <= from) top = steps.find((v) => v > from) ?? from * 2;
    const span = Math.log10(top) - Math.log10(from);
    return { log: true, from, hi: top, ticks: steps.filter((v) => v >= from && v <= top),
      pct: (v: Loose) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, from)) - Math.log10(from)) / span) * 100)) };
  }
  const step = roundStep(hi - lo || Math.abs(hi) * 0.2 || 1);
  const from = Math.floor(lo / step) * step;
  const top = Math.max(Math.ceil(hi / step) * step, from + step);
  const ticks: Loose[] = [];
  for (let v = from; v <= top + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
  return { log: false, from, hi: top, ticks, pct: (v: Loose) => Math.max(0, Math.min(100, ((v - from) / (top - from)) * 100)) };
}
