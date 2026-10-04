// The floor back-test (DECISIONS D58, D126): does flooring a range by what a material's own measurements prove keep it
// honest? Every measured headline is hidden as calibrate() hides it and predicted from the rest, and the shown range is
// formed from the same prediction under each set of floors:
//
//   none              no floor, the range as the calibration scales alone make it
//   printed           the material's printed bars, any direction (the rule before D126)
//   printedXY         the same, in the headline's own direction only (the rule without "a printed part is strongest in XY")
//   unstated          its printed bars and those of a source that states no specimen (the rule now)
//   sameSource        the fallback D126 names: an unstated specimen bounds only where its source also prints a bar
//   lowestOfProducts  the lowest of its products' own floors, not the highest: what is true of every product
//   formulation       only the hidden product's own other measurements (what a grade's range takes)
//
// A comparable value of the material never floors it (a material that publishes one has no estimate): what remains is
// what a material with no comparable value has, its yield or break stress, its values of another direction or of no stated
// direction. Calibration itself is unchanged and EST-CALIBRATION still judges it; this reports what the shown range does.

import { median } from './numerics.js';
import { assess, LEVEL } from '../products.js';
import { lowerBoundsOf, BOUNDING_FORMS, PRINTED_FORMS } from '../lower-bounds.js';

const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
const inside = (v, [lo, hi]) => v >= lo - 1e-9 * Math.abs(lo) && v <= hi + 1e-9 * Math.abs(hi);

/**
 * Per set of floors: hidden cases, how many the floors moved against the unfloored range, the likely and plausible
 * coverage, the median likely width (a ratio on a log scale, degrees otherwise) and how many hidden values lay under the
 * plausible range. Null for a headline with no lower bounds.
 */
export function floorBackTest({ key, def, model, S, tmMean, loo, rangeFor }) {
  if (!def?.lowerBounds || !loo.length) return null;
  const log = model.properties[key].scale === 'log';
  const cases = {};
  for (const l of loo) {
    const m = l.m;
    const own = S.byMaterial.get(m.id) ?? [];
    const byId = new Map(own.map((x) => [x.id, x]));
    // What a material with no comparable value has left (products.js assess): a product's own comparable value would be
    // shown in place of its estimate, and any product's would make the material's headline a published one.
    const left = own.filter((x) => assess(x, def, own.filter((y) => y.gradeId === x.gradeId)).level !== LEVEL.COMPARABLE);
    const printed = lowerBoundsOf(def, left, { forms: PRINTED_FORMS });
    const unstated = lowerBoundsOf(def, left, { forms: BOUNDING_FORMS });
    const printedSources = new Set(left.filter((x) => x.specimenForm === 'printed').map((x) => x.sourceId));
    // Each product's own highest floor; a material's range cannot claim more than its lowest product's.
    const perProduct = new Map();
    for (const b of unstated) {
      const f = S.fkey(byId.get(b.measurementId).gradeId);
      if (!perProduct.has(f) || perProduct.get(f).lo < b.lo) perProduct.set(f, b);
    }
    const floors = {
      none: [],
      printed,
      printedXY: printed.filter((b) => b.direction === (def.direction ?? 'XY')),
      unstated,
      sameSource: unstated.filter((b) => printedSources.has(byId.get(b.measurementId).sourceId)),
      lowestOfProducts: perProduct.size ? [[...perProduct.values()].reduce((a, b) => (b.lo < a.lo ? b : a))] : [],
      formulation: lowerBoundsOf(def, left.filter((x) => S.fkey(x.gradeId) === l.f), { forms: BOUNDING_FORMS }),
    };
    const p = { ...l.p, mu: l.p.mu + tmMean(m) };
    const range = (implied) => rangeFor(m, m, p, l.unit, { ownBounds: false, formulation: l.f, implied });
    const plain = range([]);
    for (const [name, implied] of Object.entries(floors)) {
      const r = name === 'none' ? plain : range(implied);
      (cases[name] ??= []).push({
        moved: Math.abs(r.range[0] - plain.range[0]) > 1e-9 * Math.abs(plain.range[0]) || Math.abs(r.wide[0] - plain.wide[0]) > 1e-9 * Math.abs(plain.wide[0]),
        likely: inside(l.measured, r.range), plausible: inside(l.measured, r.wide), under: l.measured < r.wide[0] - 1e-9 * Math.abs(r.wide[0]),
        width: log ? r.range[1] / r.range[0] : r.range[1] - r.range[0],
      });
    }
  }
  return Object.fromEntries(Object.entries(cases).map(([name, rows]) => [name, {
    held: rows.length, moved: rows.filter((c) => c.moved).length,
    likelyCoverage: r3(rows.filter((c) => c.likely).length / rows.length),
    plausibleCoverage: r3(rows.filter((c) => c.plausible).length / rows.length),
    medianLikelyWidth: r3(median(rows.map((c) => c.width))), underPlausible: rows.filter((c) => c.under).length,
  }]));
}
