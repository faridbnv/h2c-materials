// A product's own values as its estimate's anchor (D167): what a product's own published values of the asked property,
// measured another way, allow its printed value to be, in both directions.
//
// Each such value (another direction, an unstated load or direction, a moulded or undescribed bar, an annealed bar)
// enters the model converted to the headline, with its conversion's spread. Two bands are drawn around the converted
// value, neither narrower than the headline's test scatter (D152):
//
//   its band     the conversion's own spread at the plausible level (95 %): what the conversion row, as learned, says
//                the value allows. Two such bands that do not meet are sheets that disagree beyond what their
//                conversions allow (Extrudr DURAPRO PA6 CF prints 1.1 GPa on a moulded bar and 6 GPa on an undescribed
//                one), and nothing anchors that product. The engine reads these bands for the likely tag.
//   its anchor   the same, widened on each side by the band scale the grade calibration sets (grades.js) from the
//                products that publish both, so each side holds a hidden value as often as it claims (unwidened, the
//                bands held 85 to 90 %). The sides differ: a printed bar falls far below its own moulded value more
//                often than it rises above it. The product's printed value lies in every anchor, so in their intersection.
//
// The fit may down-weight such a value as a conflict with its material (calibration.js): that is a statement about the
// material's other products, not about this one. A product's own estimate keeps to its anchor (grades.js): held inside
// it where the model's centre lies inside, withheld where it lies outside, so no estimate contradicts the product's own
// sheet. The engine tags no product "likely" whose own value's band wholly misses a limit, or whose own sheets disagree
// on it (app/js/engine/constraints.js).

import { sig3 } from './model.ts';
import type { Dyn } from '../types.ts';

/** The headline's test scatter on the model's scale: a fraction on a log scale (ln(1 + r)), degrees otherwise. */
function scatterOf(def: Dyn, log: Dyn) {
  const s = def?.testScatter;
  if (!s || !Number.isFinite(s.value)) return 0;
  return log ? (s.is === 'relative' ? Math.log(1 + s.value / 100) : 0) : (s.is === 'absolute' ? s.value : 0);
}

/**
 * The bands and anchor of one formulation: `own` is its converted observations (conversions.js convert; `centreOf` gives
 * one's converted value on the model's scale). Returns null where it publishes no value of the asked property another
 * way; else { bands: [{ kind, measurementIds, lo, hi, conflict }], disagree, lo, hi } on the model's scale, where lo and
 * hi are the anchor (the widened bands' intersection), meaningful only where the bands agree.
 */
export function ownBand({ def, model, key, own, centreOf, zPlausible, scale = 1 }: Dyn) {
  const props = new Set(def?.valueProperties ?? []);
  const log = model.properties[key].scale === 'log';
  const scatter = scatterOf(def, log);
  const bands = [];
  let lo = -Infinity, hi = Infinity;
  for (const o of own) {
    if (o.bound || !o.conversion || !o.items.length || !o.items.every((i: Dyn) => props.has(i.property))) continue;
    const c = centreOf(o);
    // The conversion's own spread and the published value's half-width, never the conflict down-weighting.
    const s = zPlausible * Math.sqrt(o.conversion.sd ** 2 + o.half ** 2);
    const half = Math.max(s, scatter);
    bands.push({ kind: o.kind, measurementIds: o.items.map((i: Dyn) => i.measurementId).filter(Boolean), lo: c - half, hi: c + half, conflict: !!o.conflict });
    lo = Math.max(lo, c - Math.max(s * (scale.lo ?? scale), scatter)); hi = Math.min(hi, c + Math.max(s * (scale.hi ?? scale), scatter));
  }
  if (!bands.length) return null;
  const disagree = Math.max(...bands.map((b: Dyn) => b.lo)) > Math.min(...bands.map((b: Dyn) => b.hi));
  return { bands, disagree, lo, hi };
}

/** The bands and anchor as a grade's estimate publishes them, in the headline's unit. */
export function publishBand(band: Dyn, inv: Dyn) {
  return {
    disagree: band.disagree,
    ...(band.disagree ? {} : { lo: sig3(inv(band.lo), -1), hi: sig3(inv(band.hi), 1) }),
    bands: band.bands.map((b: Dyn) => ({ kind: b.kind, measurementIds: b.measurementIds, lo: sig3(inv(b.lo), -1), hi: sig3(inv(b.hi), 1), ...(b.conflict ? { conflict: true } : {}) })),
  };
}
