// Numbers as the material pages print them where a value can be very large or very small (a surface resistivity of
// 10,000,000,000,000,000 Ω): scientific notation from 10⁶ up and below 10⁻³, every other number as format.js prints
// it. Page-only: the selector and the drawer keep format.js's own forms.

import { fmtNumber } from '../js/ui/format.js';

const SUPER = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** A number, in scientific notation where it is 10⁶ or more, or below 10⁻³ and not zero: "1 × 10¹⁶", "2.5 × 10⁻⁴". */
export function fmtPage(v, unit) {
  if (!Number.isFinite(v)) return fmtNumber(v, unit);
  const a = Math.abs(v);
  if (a && (a >= 1e6 || a < 1e-3)) {
    const e = Math.floor(Math.log10(a));
    const mant = Number((v / 10 ** e).toPrecision(3));
    const s = `${mant === 1 ? '1' : fmtNumber(mant)} × 10${String(e).split('').map((ch) => SUPER[ch]).join('')}`;
    return unit ? `${s} ${unit}` : s;
  }
  return fmtNumber(v, unit);
}

/** A span of two numbers that never breaks at its dash (U+2060), or one number where both are one. */
export const spanText = (lo, hi) => (lo === hi ? fmtPage(lo) : `${fmtPage(lo)}⁠–⁠${fmtPage(hi)}`);

/**
 * A value as the Overview and its figures print it (display only; the Products page prints values exactly as published):
 * whole degrees for °C; whole dollars from 10 CAD/kg; whole per cent from 10 %; otherwise three significant figures, with
 * thousands grouped (1,240) and very large or small numbers as fmtPage writes them. No unit is appended: `fmtDisplay(v,
 * unit)` reads the unit for its rule only. "—" for a value that is not a number.
 */
export function fmtDisplay(v, unit) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a && (a >= 1e6 || a < 1e-3)) return fmtPage(v);
  if (unit === '°C') return fmtNumber(Math.round(v) || 0);
  if ((unit === 'CAD/kg' || unit === '%') && a >= 10) return fmtNumber(Math.round(v));
  const p = Number(v.toPrecision(3));
  return Math.abs(p) >= 1000 ? p.toLocaleString('en-CA', { maximumFractionDigits: 0 }) : String(p);
}

/** The space between a number and its unit: no break, so "350 °C" never wraps between the two. */
export const NBSP = '\u00a0';

/** fmtDisplay with its unit, joined by a no-break space: "45.5 MPa", "55 °C", "34 CAD/kg". */
export const fmtDisplayUnit = (v, unit) => (unit ? `${fmtDisplay(v, unit)}${NBSP}${unit}` : fmtDisplay(v, unit));

/** A display span: "40–53" (word-joined dash), one number where both print alike; with `unit` given, "40–53 MPa". */
export const spanDisplay = (lo, hi, unit) => { const a = fmtDisplay(lo, unit), b = fmtDisplay(hi, unit); return a === b ? a : `${a}⁠–⁠${b}`; };

/** A display span with its unit, no-break joined: "40–53 MPa". */
export const spanDisplayUnit = (lo, hi, unit) => (unit ? `${spanDisplay(lo, hi, unit)}${NBSP}${unit}` : spanDisplay(lo, hi, unit));
