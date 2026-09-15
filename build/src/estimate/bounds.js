// The likely and plausible ranges of a prediction, with the physical and semantic limits that apply to the material.
// Shared by the estimates and the screening back-test, so the back-test judges the ranges shown.

import { boundedQuantile } from './numerics.js';
import { HEAD, transform } from './model.js';

/**
 * A range function for one headline: (m, subject, p, unit, { ownBounds }) => { bounds, centre, range, wide }, where p is
 * the prediction on the model scale with the melting-point offset already added, and subject the material whose
 * product is predicted (itself, or the material its representative product is filed under).
 */
export function makeRangeFor({ key, model, S, oneSided, inv, calLikely, calPlausible }) {
  const { likely, plausible } = model.levels;
  return (m, subject, p, unit, { ownBounds = true } = {}) => {
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
    for (const b of ownBounds ? oneSided.filter((b) => b.materialId === subject.id && limits(b)) : []) {
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      bounds.push({ side: b.side, value: toModel(b.value), sd: model.bounds.oneSided.sd[scaleName], why: `${b.side === 'lower' ? 'above' : 'below'} ${b.value} ${h.unit}, published for ${b.gradeId} (${b.measurementId})` });
    }
    // What the material's own printed measurements prove (compile.js impliedBounds, from headline_definitions.csv Lower bound: a yield or break stress under
    // the ultimate, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa) limits its
    // estimate from below, as a published one-sided bound does. PA6's plausible HDT reached down to 72 °C though
    // its own 1.8 MPa value is 90 °C (audit 2026-09-15, B-16).
    if (ownBounds) {
      const scaleName = model.properties[key].scale === 'log' ? 'log' : 'linear';
      for (const b of m.headline[key]?.impliedBounds ?? []) {
        if (!(b.lo > 0) && scaleName === 'log') continue;
        bounds.push({ side: 'lower', value: toModel(b.lo), sd: model.bounds.oneSided.sd[scaleName], why: `at least ${b.lo} ${h.unit}: its own ${b.property.toLowerCase()} (${b.measurementId}) bounds it` });
      }
    }
    if (key === 'hdt045' && S.info(m).morphology === 'semicrystalline' && S.tmOf(m) != null) {
      bounds.push({ side: 'upper', value: S.tmOf(m), sd: model.bounds.meltingSd, why: `melting point ${S.tmOf(m)} °C: ${model.bounds.hdtAboveMelting}` });
    }
    if (key === 'hdt045' && !S.fibre(m) && S.vicatOf(m) != null) {
      const { lift, sd, why } = model.bounds.ownVicat;
      bounds.push({ side: 'upper', value: S.vicatOf(m) + lift, sd, why: `its own Vicat ${S.vicatOf(m)} °C + ${lift} °C: ${why}` });
    }
    if (key === 'density' && S.info(m).density && !S.variantOf(m.representativeGrade && S.fkey(m.representativeGrade)) && !S.grades.get(m.representativeGrade)?.variant) {
      const [dlo, dhi] = S.info(m).density, cfg = model.bounds.density;
      const r = S.reinforcement(m), rf = cfg.fibreDensity[r];
      const hi = rf ? 1 / ((1 - cfg.maxFibreWeight) / dhi + cfg.maxFibreWeight / rf) : dhi;
      const lo = dlo * (1 - cfg.porosity);
      bounds.push({ side: 'lower', value: toModel(lo), sd: cfg.sd, why: `${Math.round(lo)} kg/m³: the neat polymer's ${dlo} kg/m³ less ${cfg.porosity * 100} % porosity; ${cfg.why}` });
      bounds.push({ side: 'upper', value: toModel(hi), sd: cfg.sd, why: `${Math.round(hi)} kg/m³: ${rf ? `the rule of mixtures at ${cfg.maxFibreWeight * 100} wt% ${r}` : 'the neat polymer\'s upper value'}; ${cfg.why}` });
    }
    if (key === 'hdt045' && S.matrix(m) === 'amorphous' && S.tgOf(m) != null) {
      const lift = S.fibre(m) ? model.bounds.amorphousAboveTg.fibre : model.bounds.amorphousAboveTg.unfilled;
      bounds.push({ side: 'upper', value: S.tgOf(m) + lift, sd: model.bounds.amorphousAboveTg.sd, why: `glass transition ${S.tgOf(m)} °C + ${lift} °C: ${model.bounds.amorphousAboveTg.why}` });
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
    const centre = q(0.5, calLikely);
    const range = [q(0.5 - likely / 2, calLikely), q(0.5 + likely / 2, calLikely)];
    const wide = [q(0.5 - plausible / 2, calPlausible), q(0.5 + plausible / 2, calPlausible)];

    return { bounds, centre, range, wide };
  };
}
