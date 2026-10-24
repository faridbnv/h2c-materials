// The floor back-test (DECISIONS D58, D126): does flooring a range by what a material's own measurements prove keep it
// honest? Every measured headline is hidden as calibrate() hides it and predicted from the rest, and the shown range is
// formed from the same prediction under each set of floors:
//
//   none              no floor, the range as the calibration scales alone make it
//   printed           the material's printed bars, any direction (the rule before D126)
//   printedXY         the same, in the headline's own direction only (the rule without "a printed part is strongest in XY")
//   unstated          its printed bars and those of a source that states no specimen, floored at the highest product floor
//                     (the rule first decided for a material, and the grade's rule: bounds.js with a formulation)
//   containment       the same bars, a material's range as bounds.js makes it now: it reaches the highest product floor and is
//                     floored at the lowest, only where every product has one
//   sameSource        the fallback D126 names: an unstated specimen bounds only where its source also prints a bar
//   lowestOfProducts  the lowest of its products' own floors, not the highest: what is true of every product
//   formulation       only the hidden product's own other measurements (what a grade's range takes)
//   containmentUnstated, formulationUnstated   the two rules in force, with a bar whose sheet states no specimen bounding
//                     too: D126's rule, which D161 replaced for elongation (printed bars only); the same as the rules in
//                     force for a headline that still takes both
//   containmentConverted, formulationConverted   the same, with an undescribed bar's floor read as a moulded bar's,
//                     converted by the learned moulded offset (D161's rejected alternative; log headlines only)
//
// A comparable value of the material never floors it (a material that publishes one has no estimate): what remains is
// what a material with no comparable value has, its yield or break stress, its values of another direction or of no stated
// direction. Calibration itself is unchanged and EST-CALIBRATION still judges it; this reports what the shown range does.

import { median } from './numerics.ts';
import { HEAD } from './model.ts';
import { assess, LEVEL } from '../products.ts';
import { lowerBoundsOf, ownCeilingsOf, BOUNDING_FORMS, PRINTED_FORMS } from '../lower-bounds.ts';
import type { Dyn } from '../types.ts';

const r3 = (v: Dyn) => (v == null ? null : Number(v.toPrecision(3)));
const inside = (v: Dyn, [lo, hi]: Dyn) => v >= lo - 1e-9 * Math.abs(lo) && v <= hi + 1e-9 * Math.abs(hi);

/**
 * Per set of floors: hidden cases, how many the floors moved against the unfloored range, the likely and plausible
 * coverage, the median likely width (a ratio on a log scale, degrees otherwise) and how many hidden values lay under the
 * plausible range. Null for a headline with no lower bounds.
 */
export function floorBackTest({ key, def, model, S, tmMean, loo, rangeFor, conv = {}, ledgerRows = [] }: Dyn) {
  // D160's ceiling, which D167 replaced by the two-sided anchor (anchor.js), is still measured here for comparison.
  const ceilingRows = ledgerRows.some((r: Dyn) => r.target === key && r.kind === 'demote-to-ceiling' && !r.appliesToText);
  if ((!def?.lowerBounds && !ceilingRows) || !loo.length) return null;
  const log = model.properties[key].scale === 'log';
  // An undescribed bar read as a moulded one: its floor times the learned moulded conversion (headline over moulded).
  const moulded = log ? conv[HEAD[key].replace(' XY', ' moulded')] : null;
  const converted = (bounds: Dyn) => (moulded ? bounds.map((b: Dyn) => (byIdAll.get(b.measurementId)?.specimenForm === 'not-stated' ? { ...b, lo: b.lo * Math.exp(moulded.offset) } : b)) : null);
  const byIdAll = new Map([...S.byMaterial.values()].flat().map((x: Dyn) => [x.id, x]));
  const cases: Dyn = {};
  for (const l of loo) {
    const m = l.m;
    const own = S.byMaterial.get(m.id) ?? [];
    const byId: Dyn = new Map(own.map((x: Dyn) => [x.id, x]));
    // What a material with no comparable value has left (products.js assess): a product's own comparable value would be
    // shown in place of its estimate, and any product's would make the material's headline a published one.
    const left = own.filter((x: Dyn) => assess(x, def, own.filter((y: Dyn) => y.gradeId === x.gradeId)).level !== LEVEL.COMPARABLE);
    const printed = lowerBoundsOf(def, left, { forms: PRINTED_FORMS });
    const unstated = lowerBoundsOf(def, left, { forms: BOUNDING_FORMS });
    const inForce = lowerBoundsOf(def, left);
    const printedSources = new Set(left.filter((x: Dyn) => x.specimenForm === 'printed').map((x: Dyn) => x.sourceId));
    // Each product's own highest floor; a material's range cannot claim more than its lowest product's.
    const perProduct = new Map();
    for (const b of unstated) {
      const f = S.fkey(byId.get(b.measurementId).gradeId);
      if (!perProduct.has(f) || perProduct.get(f).lo < b.lo) perProduct.set(f, b);
    }
    const floors = {
      none: [],
      printed,
      printedXY: printed.filter((b: Dyn) => b.direction === (def.direction ?? 'XY')),
      unstated,
      containment: inForce,
      sameSource: unstated.filter((b: Dyn) => printedSources.has(byId.get(b.measurementId).sourceId)),
      lowestOfProducts: perProduct.size ? [[...perProduct.values()].reduce((a: Dyn, b: Dyn) => (b.lo < a.lo ? b : a))] : [],
      formulation: lowerBoundsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f)),
      containmentUnstated: unstated,
      formulationUnstated: lowerBoundsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f), { forms: BOUNDING_FORMS }),
      // D160: the grade rule with the hidden product's own moulded or undescribed values as ceilings, alone and with its floors.
      ...(ceilingRows ? {
        formulationCeilings: { implied: [], ceilings: ownCeilingsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f), ledgerRows) },
        formulationBoth: { implied: lowerBoundsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f)), ceilings: ownCeilingsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f), ledgerRows) },
      } : {}),
      ...(moulded ? {
        containmentConverted: converted(unstated),
        formulationConverted: converted(lowerBoundsOf(def, left.filter((x: Dyn) => S.fkey(x.gradeId) === l.f), { forms: BOUNDING_FORMS })),
      } : {}),
    };
    const p = { ...l.p, mu: l.p.mu + tmMean(m) };
    const range = (set: Dyn, material: Dyn = false) => rangeFor(m, m, p, l.unit, { ownBounds: false, formulation: material ? undefined : l.f, ...(Array.isArray(set) ? { implied: set } : set) });
    const plain = range([]);
    for (const [name, implied] of Object.entries(floors)) {
      const r = name === 'none' ? plain : range(implied, name.startsWith('containment'));
      (cases[name] ??= []).push({
        moved: Math.abs(r.range[0] - plain.range[0]) > 1e-9 * Math.abs(plain.range[0]) || Math.abs(r.wide[0] - plain.wide[0]) > 1e-9 * Math.abs(plain.wide[0]),
        likely: inside(l.measured, r.range), plausible: inside(l.measured, r.wide), under: l.measured < r.wide[0] - 1e-9 * Math.abs(r.wide[0]),
        width: log ? r.range[1] / r.range[0] : r.range[1] - r.range[0],
      });
    }
  }
  return Object.fromEntries(Object.entries(cases).map(([name, rows]: Dyn) => [name, {
    held: rows.length, moved: rows.filter((c: Dyn) => c.moved).length,
    likelyCoverage: r3(rows.filter((c: Dyn) => c.likely).length / rows.length),
    plausibleCoverage: r3(rows.filter((c: Dyn) => c.plausible).length / rows.length),
    medianLikelyWidth: r3(median(rows.map((c: Dyn) => c.width))), underPlausible: rows.filter((c: Dyn) => c.under).length,
  }]));
}

/**
 * The own-value back-test (D160): each product that publishes the headline and a value of the same property on a moulded
 * bar or one its sheet does not describe, in the build plane or with no direction stated. Its headline hidden (the
 * conversions refitted without it), where the model's centre c lies above that own value v, a limit between v and c is
 * one the estimate meets and the own value misses: the share of such limits the hidden truth t also meets is
 * (ln t − ln v) ÷ (ln c − ln v), clamped to 0 to 1, averaged over the crossing cases. A share under one half says the own
 * value was the better guide.
 */
export function ownValueCrossing({ key, model, S, obs, holdOut, tmMean, inv }: Dyn) {
  if (model.properties[key].scale !== 'log' || !model.properties[key].ownCeilingTest) return null;
  const kinds = new Set([HEAD[key].replace(' XY', ' unk'), HEAD[key].replace(' XY', ' moulded')]);
  const byF = new Map();
  obs.forEach((o: Dyn, i: Dyn) => {
    if (!o.f) return;
    const g = `${o.m.id}|${o.f}`;
    if (!byF.has(g)) byF.set(g, { m: o.m, f: o.f, gradeId: o.gradeId, head: [], own: [] });
    if (o.kind === HEAD[key]) byF.get(g).head.push(i); else if (kinds.has(o.kind)) byF.get(g).own.push(o);
  });
  const cases = [];
  for (const c of byF.values()) {
    if (!c.head.length || !c.own.length || !obs.some((o: Dyn, i: Dyn) => o.m.id === c.m.id && !c.head.includes(i))) continue;
    const p = holdOut(c.m, c.f, S.grades.get(c.gradeId)?.manufacturer, c.head);
    const centre = p.mu + tmMean(c.m), truth = median(c.head.map((i: Dyn) => obs[i].y + tmMean(c.m)));
    const v = Math.min(...c.own.map((o: Dyn) => o.yRaw));
    cases.push({ crossing: centre > v + 1e-9, share: centre > v + 1e-9 ? Math.min(1, Math.max(0, (truth - v) / (centre - v))) : null });
  }
  const crossing = cases.filter((x: Dyn) => x.crossing);
  return { cases: cases.length, crossing: crossing.length, rightShare: crossing.length ? r3(crossing.reduce((a: Dyn, x: Dyn) => a + x.share, 0) / crossing.length) : null };
}
