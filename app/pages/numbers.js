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
