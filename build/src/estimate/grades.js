// Grade posteriors (DECISIONS D81): what the model says of each product, not only of each material.
//
// The model is already hierarchical — chemical group, identity, the material's own deviation, the product's own
// deviation (gaussian.js) — and a material's estimate is the prediction at its representative product's row. A
// grade's estimate is the same prediction at the grade's own row: its formulation, its maker as test house. No new
// hierarchy and no refit. A grade that publishes the headline pulls its own posterior towards what it published;
// one that publishes nothing gets its material's latent and the spread between products.
//
// The material's calibration does not hold at grade level (a product's value scatters about its material more than
// a material's about its family's prediction), so grade ranges have their own: every grade that publishes the
// headline has its own observations hidden in turn and is predicted from the rest, through the same hold-out the
// material calibration uses, and the likely and plausible scales are set from where the hidden values fell. The
// material's ranges are untouched.
//
// A grade estimate decides nothing. It is shown beside the grade; screening and the headlines read the material's
// (D48, D59), and constraints.js never reads a grade.

import { quantile } from './numerics.js';
import { HEAD, identityOf, sig3 } from './model.js';
import { predict } from './gaussian.js';

/**
 * Hide each grade's own observations of the headline's own kind and predict them: the grade-level scales, their
 * coverage, and the grades whose published value sits far outside what everything else predicts.
 */
export function calibrateGrades({ key, model, S, obs, holdOut, zLikely, zPlausible }) {
  const cfg = model.calibration;
  const groups = new Map();
  obs.forEach((o, i) => {
    if (o.kind !== HEAD[key] || !o.f) return;
    const k = `${o.m.id}|${o.f}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const held = [];
  for (const hide of groups.values()) {
    const o0 = obs[hide[0]];
    // The grade's only evidence is not held against it: hidden, it would be predicted from the family alone, which
    // is the material calibration's question, not this one's.
    if (!obs.some((o, i) => o.m.id === o0.m.id && !hide.includes(i))) continue;
    const p = holdOut(o0.m, o0.f, S.grades.get(o0.gradeId)?.manufacturer, hide, { refitConversions: false });
    for (const i of hide) held.push({ o: obs[i], p, sd: Math.sqrt(p.sd * p.sd + obs[i].noise2) });
  }
  const zs = held.map((h) => Math.abs((h.o.y - h.p.mu) / h.sd));
  const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
  const enough = held.length >= cfg.minHeld;
  const calLikely = enough ? clamp(quantile(zs, model.levels.likely) / zLikely, cfg.likelyScale) : cfg.defaultScale;
  const calPlausible = enough ? clamp(quantile(zs, model.levels.plausible) / zPlausible, cfg.plausibleScale) : cfg.defaultScale;
  const within = (h, z, cal) => Math.abs(h.o.y - h.p.mu) <= z * Math.sqrt((h.p.sd * cal) ** 2 + h.o.noise2);
  const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
  const calibration = {
    held: held.length, grades: new Set(held.map((h) => h.o.gradeId)).size,
    likelyScale: r3(calLikely), plausibleScale: r3(calPlausible),
    likelyCoverage: held.length ? r3(held.filter((h) => within(h, zLikely, calLikely)).length / held.length) : null,
    plausibleCoverage: held.length ? r3(held.filter((h) => within(h, zPlausible, calPlausible)).length / held.length) : null,
  };
  // The worst hidden value per grade, where it sits beyond what the calibrated plausible range allows.
  const outliers = new Map();
  for (const h of held) {
    const z = (h.o.y - h.p.mu) / Math.sqrt((h.p.sd * calPlausible) ** 2 + h.o.noise2);
    if (Math.abs(z) <= cfg.outlierZ) continue;
    const prior = outliers.get(h.o.gradeId);
    if (!prior || Math.abs(z) > Math.abs(prior.z)) {
      outliers.set(h.o.gradeId, { key, gradeId: h.o.gradeId, materialId: h.o.m.id, material: h.o.m.name, kind: h.o.kind,
        measurementIds: h.o.items.map((x) => x.measurementId).filter(Boolean), z: Math.round(z * 10) / 10 });
    }
  }
  return { calLikely, calPlausible, calibration, outliers: [...outliers.values()] };
}

/**
 * The estimate of every active grade of every material in the pool, for one headline: attached to the grade as
 * `estimate[key]`. Grades that share a formulation share one posterior and say so.
 */
export function attachGradeEstimates({ key, model, S, obs, P, hp, tmMean, inv, rangeFor, ownerOfF }) {
  const byFormulation = new Map();
  for (const g of S.grades.values()) {
    if (g.retired || !S.inPool.has(g.materialId)) continue;
    const f = S.fkey(g.id);
    const k = `${g.materialId}|${f}`;
    if (!byFormulation.has(k)) byFormulation.set(k, []);
    byFormulation.get(k).push(g);
  }
  const cfg = model.properties[key];
  let attached = 0;
  for (const grades of byFormulation.values()) {
    const g0 = grades[0];
    const m = S.inPool.get(g0.materialId);
    const h = m.headline[key];
    if (!h || h.notApplicable) continue;
    const f = S.fkey(g0.id);
    const owner = ownerOfF.get(f) && ownerOfF.get(f) !== m.id ? S.inPool.get(ownerOfF.get(f)) : null;
    const subject = owner ?? m;
    const manufacturer = g0.manufacturer ?? null;
    const p = predict(P, hp, subject, f, manufacturer);
    p.mu += tmMean(subject);
    // The representative grade is the product the material's own estimate describes, and takes the same bounds;
    // every other grade takes the bounds its own sheets publish (bounds.js).
    const representative = m.representativeGrade && S.fkey(m.representativeGrade) === f;
    const { centre, range, wide } = rangeFor(m, subject, p, h.unit, representative ? {} : { formulation: f });
    const own = obs.map((o, i) => ({ o, i })).filter(({ o }) => o.f === f && (o.m.id === m.id || o.m.id === subject.id));
    const mine = obs.some((o) => o.m.id === m.id);
    const strength = own.length ? 'this-grade' : mine ? 'this-material' : 'family';
    const total = p.weights.reduce((a, v) => a + v, 0);
    const ownWeight = own.reduce((a, { i }) => a + p.weights[i], 0);
    const spread = cfg.scale === 'log' ? range[1] / range[0] : range[1] - range[0];
    const precision = spread <= cfg.precision.good ? 'good' : spread <= cfg.precision.fair ? 'fair' : 'poor';
    const estimate = {
      strength, precision, unit: h.unit,
      centre: sig3(centre), lo: sig3(range[0], -1), hi: sig3(range[1], 1),
      plausible: { lo: sig3(wide[0], -1), hi: sig3(wide[1], 1) },
      ownShare: total > 0 ? Math.round(Math.max(0, Math.min(1, ownWeight / total)) * 100) / 100 : 0,
      evidence: own.map(({ o }) => ({ kind: o.kind, measurementIds: o.items.map((x) => x.measurementId).filter(Boolean),
        converted: sig3(inv(o.y + tmMean(o.m))), conflict: !!o.conflict })),
      basis: strength === 'this-grade' ? "this grade's own measurements, with its material and the family model"
        : strength === 'this-material' ? `its material's other grades and the family model (${identityOf(m)})`
          : `the family model only (${identityOf(m)})`,
    };
    for (const g of grades) {
      g.estimate ??= {};
      g.estimate[key] = grades.length > 1 ? { ...estimate, sharedWith: grades.filter((x) => x !== g).map((x) => x.id) } : estimate;
      attached++;
    }
  }
  return attached;
}

/** The constants every grade estimate shares, said once (meta.estimateModel.gradeEstimates). */
export function gradeEstimateMeta(model) {
  return {
    levels: model.levels,
    method: 'The Gaussian model of every observation, predicted at the grade\'s own row (its formulation and its maker as test house); likely and plausible ranges calibrated by hiding each grade\'s own published values and predicting them from the rest (DECISIONS D81).',
    decides: 'Nothing: a grade estimate is shown beside the grade. Screening and the headlines read the material\'s estimate.',
  };
}
