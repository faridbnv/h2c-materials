// The likely and plausible ranges of a prediction, with the physical and semantic limits that apply to the material.
// Shared by the estimates and the screening back-test, so the back-test judges the ranges shown.

import { boundedQuantile, boundedCdf } from './numerics.js';
import { HEAD, transform } from './model.js';

/**
 * A range function for one headline: (m, subject, p, unit, { ownBounds }) => { bounds, centre, range, wide, at }, where p is
 * the prediction on the model scale with the melting-point offset already added, and subject the material whose
 * product is predicted (itself, or the material its representative product is filed under). at(pr) is the quantile pr
 * with the plausible range's calibration and the same limits, for a range wider than the plausible one; cdf(value)
 * is where a value falls in that distribution, which the screening back-test records.
 */
export function makeRangeFor({ key, model, S, oneSided, inv, calLikely, calPlausible }) {
  const { likely, plausible } = model.levels;
  // `formulation` predicts one grade rather than the material: the density limit then asks whether that grade is
  // a declared variant, not whether the representative one is (D81). Material calls pass none, so nothing moves.
  return (m, subject, p, unit, { ownBounds = true, formulation } = {}) => {
    const h = { unit };
    const bounds = [];
    // Physical limits bound every estimate softly (estimate-model.json bounds): the property's outer
    // plausibleValues, and for heat deflection a floor near room temperature. They are published with the
    // estimate only where they move its plausible range, so a reader sees a limit when it matters.
    const [plo, phi] = model.properties[key].plausibleValues;
    const toModel = transform(key, model);
    const outerSd = model.properties[key].scale === 'log' ? model.bounds.plausibleValuesSd.log : model.bounds.plausibleValuesSd.linear;
    const physical = [
      { side: 'lower', value: toModel(plo), sd: outerSd, why: `physical lower limit ${plo} ${h.unit}: ${model.bounds.plausibleValuesSd.why}` },
      { side: 'upper', value: toModel(phi), sd: outerSd, why: `physical upper limit ${phi} ${h.unit}: ${model.bounds.plausibleValuesSd.why}` },
      ...(key === 'hdt045' ? [{ side: 'lower', value: model.bounds.hdtFloor.value, sd: model.bounds.hdtFloor.sd, why: `${model.bounds.hdtFloor.value} °C floor: ${model.bounds.hdtFloor.why}` }] : []),
    ];
    // A bound its own grades publish with the headline's own semantics limits its estimate.
    // For strength and elongation a printed part is strongest in XY, so a lower bound in an unstated direction
    // bounds the XY value too; an upper bound does only with the headline's own semantics.
    const limits = (b) => b.kind === HEAD[key] || (b.side === 'lower' && key !== 'hdt045' && key !== 'density' && b.kind === HEAD[key].replace(' XY', ' unk'));
    // A grade's range (formulation given) takes the bounds its own sheets publish, not its siblings'.
    const mineOnly = (b) => formulation === undefined || S.fkey(b.gradeId) === formulation;
    for (const b of ownBounds ? oneSided.filter((b) => b.materialId === subject.id && limits(b) && mineOnly(b)) : []) {
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      bounds.push({ side: b.side, own: b.value, value: toModel(b.value), sd: model.bounds.oneSided.sd[scaleName], why: `${b.side === 'lower' ? 'above' : 'below'} ${b.value} ${h.unit}, published for ${b.gradeId} (${b.measurementId})` });
    }
    // What the material's own printed measurements prove (compile.js impliedBounds, from headline_definitions.csv Lower bound: a yield or break stress under
    // the ultimate, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa) limits its
    // estimate from below, as a published one-sided bound does. PA6's plausible HDT reached down to 72 °C though
    // its own 1.8 MPa value is 90 °C (audit 2026-09-15, B-16).
    // What the material's own printed measurements prove is its representative grade's: another grade's range does
    // not take it.
    const representative = formulation === undefined || (m.representativeGrade && S.fkey(m.representativeGrade) === formulation);
    if (ownBounds && representative) {
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      for (const b of m.headline[key]?.impliedBounds ?? []) {
        if (!(b.lo > 0) && scaleName === 'log') continue;
        bounds.push({ side: 'lower', own: b.lo, value: toModel(b.lo), sd: model.bounds.oneSided.sd[scaleName], why: `at least ${b.lo} ${h.unit}: its own ${b.property.toLowerCase()} (${b.measurementId}) bounds it` });
      }
    }
    if (key === 'hdt045' && S.info(m).morphology === 'semicrystalline' && S.tmOf(m) != null) {
      bounds.push({ side: 'upper', value: S.tmOf(m), sd: model.bounds.meltingSd, why: `melting point ${S.tmOf(m)} °C: ${model.bounds.hdtAboveMelting}` });
    }
    if (key === 'hdt045' && !S.fibre(m) && S.vicatOf(m) != null) {
      const { lift, sd, why } = model.bounds.ownVicat;
      bounds.push({ side: 'upper', value: S.vicatOf(m) + lift, sd, why: `its own Vicat ${S.vicatOf(m)} °C + ${lift} °C: ${why}` });
    }
    const variantHere = formulation !== undefined ? S.variantOf(formulation)
      : S.variantOf(m.representativeGrade && S.fkey(m.representativeGrade)) || S.grades.get(m.representativeGrade)?.variant;
    if (key === 'density' && S.info(m).density && !variantHere) {
      const [dlo, dhi] = S.info(m).density, cfg = model.bounds.density;
      const r = S.reinforcement(m), rf = cfg.fibreDensity[r];
      const hi = rf ? 1 / ((1 - cfg.maxFibreWeight) / dhi + cfg.maxFibreWeight / rf) : dhi;
      const lo = dlo * (1 - cfg.porosity);
      bounds.push({ side: 'lower', value: toModel(lo), sd: cfg.sd, why: `${Math.round(lo)} kg/m³: the neat polymer's ${dlo} kg/m³ less ${cfg.porosity * 100} % porosity; ${cfg.why}` });
      bounds.push({ side: 'upper', value: toModel(hi), sd: cfg.sd, why: `${Math.round(hi)} kg/m³: ${rf ? `the rule of mixtures at ${cfg.maxFibreWeight * 100} wt% ${r}` : 'the neat polymer\'s upper value'}; ${cfg.why}` });
    }
    if (key === 'hdt045' && S.matrix(m) === 'amorphous' && S.ownTgOf(m) != null) {
      const tg = S.ownTgOf(m);
      const lift = S.fibre(m) ? model.bounds.amorphousAboveTg.fibre : model.bounds.amorphousAboveTg.unfilled;
      bounds.push({ side: 'upper', value: tg + lift, sd: model.bounds.amorphousAboveTg.sd, why: `glass transition ${tg} °C + ${lift} °C: ${model.bounds.amorphousAboveTg.why}` });
    }
    const qWith = (list) => (pr, cal) => inv(boundedQuantile(p.mu, p.sd * cal, list, pr));
    // A physical limit takes part only where it can reach the distribution; far limits would change
    // nothing but the numerical method. It is published only if it moves the plausible range itself.
    const reach = 6 * p.sd * Math.max(calLikely, calPlausible);
    const active = physical.filter((b) => (b.side === 'lower' ? b.value + 4 * b.sd > p.mu - reach : b.value - 4 * b.sd < p.mu + reach));
    const semantic = [...bounds];
    const all = qWith([...semantic, ...active]);
    for (const b of active) {
      const pr = b.side === 'lower' ? 0.5 - plausible / 2 : 0.5 + plausible / 2;
      const without = qWith([...semantic, ...active.filter((x) => x !== b)])(pr, calPlausible);
      const withIt = all(pr, calPlausible);
      if (Math.abs(without - withIt) > Math.abs(withIt) * 0.01 + 1e-9) bounds.push(b);
    }
    const q = qWith(bounds);
    // A limit the material's own grades publish is a floor and a ceiling, not a suggestion: the model's own words
    // for it are "no range crosses a limit its own grade publishes". As a soft observation it was crossed by about
    // its own half-width, which is how PETG's plausible range came to start at 49.7 MPa below the 50.8 MPa PETG
    // itself publishes. The shown range is held to what the material has measured (D78).
    const own = (side) => bounds.filter((b) => b.side === side && b.own != null).map((b) => b.own);
    const floor = own('lower').length ? Math.max(...own('lower')) : -Infinity;
    const ceiling = own('upper').length ? Math.min(...own('upper')) : Infinity;
    const held = (v) => Math.min(Math.max(v, floor), Math.max(ceiling, floor));
    const wide = [held(q(0.5 - plausible / 2, calPlausible)), held(q(0.5 + plausible / 2, calPlausible))];
    // The likely range sits inside the plausible one. Both are quantiles of the same distribution, but at
    // different calibrations, and against a near bound the wider calibration piles mass at the bound and can
    // lift its own lower end above the narrower one's: PVA's elongation came out likely 220-392 % inside a
    // plausible 221-1610 %. Where that happens the likely range is held to the plausible one, never the other
    // way round, because the plausible range is the one that carries the material's own bounds.
    const clamp = (v) => Math.min(Math.max(held(v), wide[0]), wide[1]);
    const centre = clamp(q(0.5, calLikely));
    const range = [clamp(q(0.5 - likely / 2, calLikely)), clamp(q(0.5 + likely / 2, calLikely))];

    return { bounds, centre, range, wide, at: (pr) => q(pr, calPlausible), cdf: (value) => boundedCdf(p.mu, p.sd * calPlausible, bounds, toModel(value)) };
  };
}
