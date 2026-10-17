// The one scale rule for a row of values drawn product by product: the drawer's comparison headings and print
// temperatures (detail.js), and the material pages' figures, place a value on a track with these functions and no
// others, so a value sits at the same place, between the same ticks, wherever it is drawn.
//
// Impact results of one material run from a few kJ/m² to tens (PLA: 3 to 72), so the scale is logarithmic once the
// largest is more than ten times the smallest, with ticks at 1, 2 and 5 of each decade; below that it is linear from
// zero, ticked every round step. A temperature is an interval, not a ratio: its scale is linear from the round step at or
// below the lowest value (a glass transition may be below zero) and never logarithmic. Dots closer than DOT_GAP per cent
// of the track stack upward, up to MAX_ROWS rows; past that they overlap, and the table under the rows lists every
// product. Positions are per cent of the track, so a renderer draws them at any width.

export const LOG_RATIO = 10;
export const DOT_GAP = 2.4;
export const MAX_ROWS = 6;
export const NICE = [1, 2, 5];
/** A temperature scale spans at least this much about its values, so two products a degree apart are not drawn at the ends. */
export const MIN_SPAN_C = 10;
/** The H2C's limit is drawn on a temperature scale when it is no further above the highest value than the larger of
 *  these: a quarter of the values' span, or LIMIT_NEAR_C. */
export const LIMIT_NEAR_C = 10;

/** A round step giving four to eight ticks over a span. */
export const roundStep = (span) => {
  const raw = span / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((n) => n * mag).find((v) => v >= raw);
};

/**
 * The scale for a row's values in a unit: `{ log, from, hi, ticks, pct }`, where `pct(v)` is the value's place on the
 * track in per cent (0 to 100, clamped) and `ticks` the labelled values, in order. `values` must hold at least one number.
 */
export function stripScale(values, unit) {
  if (unit === '°C') {
    // At least a 10 °C span about the values, so two products a degree apart, or at one value, are not drawn at the
    // ends of the track or on a scale of one tick.
    const mid = (Math.min(...values) + Math.max(...values)) / 2;
    const lo = Math.min(...values, mid - MIN_SPAN_C / 2), hiValue = Math.max(...values, mid + MIN_SPAN_C / 2);
    const step = roundStep(hiValue - lo);
    const from = Math.floor(lo / step) * step;
    const hi = Math.ceil(hiValue / step) * step;
    const ticks = [];
    for (let v = from; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
    return { log: false, from, hi, ticks, pct: (v) => Math.max(0, Math.min(100, ((v - from) / (hi - from)) * 100)) };
  }
  const positive = values.filter((v) => v > 0);
  const hiValue = Math.max(0, ...values);
  const loValue = positive.length ? Math.min(...positive) : 0;
  const log = positive.length > 1 && positive.length === values.length && hiValue / loValue > LOG_RATIO;
  if (log) {
    // From the 1-2-5 step at or below the smallest value to the one at or above the largest.
    const steps = [];
    for (let e = Math.floor(Math.log10(loValue)) - 1; e <= Math.ceil(Math.log10(hiValue)) + 1; e++) for (const n of NICE) steps.push(Number((n * 10 ** e).toPrecision(3)));
    const from = steps.filter((v) => v <= loValue).at(-1) ?? loValue;
    const hi = steps.find((v) => v >= hiValue) ?? hiValue;
    const span = Math.log10(hi) - Math.log10(from) || 1;
    return { log, from, hi, ticks: steps.filter((v) => v >= from && v <= hi),
      pct: (v) => Math.max(0, Math.min(100, ((Math.log10(Math.max(v, from)) - Math.log10(from)) / span) * 100)) };
  }
  // The track to the first tick at or past the largest value.
  const step = roundStep(hiValue || 1);
  const hi = Math.ceil((hiValue || 1) / step) * step;
  const ticks = [];
  for (let v = 0; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
  return { log: false, from: 0, hi, ticks, pct: (v) => Math.max(0, Math.min(100, (v / hi) * 100)) };
}

/**
 * Stack a row's dots so none is drawn on another: each entry `{ v: { value } }` gains `x` (its place, per cent) and
 * `row` (0 at the bottom), in order of value. Returns how many rows the dots take, at least one. It sets `x` and `row` on
 * the entries it is given.
 */
export function stack(entries, pct) {
  const rows = [];
  for (const e of [...entries].sort((a, b) => a.v.value - b.v.value)) {
    e.x = pct(e.v.value);
    let row = rows.findIndex((last) => e.x - last >= DOT_GAP);
    if (row < 0) row = rows.length < MAX_ROWS ? rows.length : rows.indexOf(Math.min(...rows));
    rows[row] = e.x;
    e.row = row;
  }
  return Math.max(1, rows.length);
}

/**
 * Whether the H2C's limit on a print setting is drawn on the setting's scale: where it is near the products' values
 * (within a quarter of their span, or LIMIT_NEAR_C, above the highest). Far above them, the axis says where it is, so
 * PLA's windows are not squeezed against a 350 °C line. A limit of null is never drawn.
 */
export function limitOnScale(limit, values) {
  if (limit == null) return false;
  const lo = Math.min(...values), hi = Math.max(...values);
  return limit <= hi + Math.max((hi - lo) / 4, LIMIT_NEAR_C);
}
