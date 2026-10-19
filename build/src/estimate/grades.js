// Grade posteriors (DECISIONS D81): what the model says of each product, not only of each material.
//
// The model is already hierarchical — chemical group, identity, the material's own deviation, the product's own
// deviation (gaussian.js) — and a material's estimate is the prediction at the material (or, where it has one product,
// at that product's row). A grade's estimate is the same prediction at the grade's own row: its formulation, its maker
// as test house. No new hierarchy and no refit. A grade that publishes the headline pulls its own posterior towards what it published;
// one that publishes nothing gets its material's latent and the spread between products.
//
// The material's calibration does not hold at grade level (a product's value scatters about its material more than
// a material's about its family's prediction), so grade ranges have their own: every grade that publishes the
// headline has its own observations hidden in turn and is predicted from the rest, through the same hold-out the
// material calibration uses, and the likely and plausible scales are set from where the hidden values fell. The
// material's ranges are untouched.
//
// Attached only where a product lacks a comparable value. It never passes a requirement.
// D137 adds separate independent exclusion certification without changing these displayed ranges.

import { quantile, median, normalCdf } from './numerics.js';
import { HEAD, identityOf, sig3 } from './model.js';
import { predict } from './gaussian.js';
import { lowerBoundsOf, ownCeilingsOf } from '../lower-bounds.js';

/**
 * Hide each grade's own observations of the headline's own kind and predict them: the grade-level scales, their
 * coverage, and the grades whose published value sits far outside what everything else predicts.
 */
export function calibrateGrades({ key, model, S, obs, holdOut, zLikely, zPlausible, tmMean = () => 0 }) {
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
    // The median width of the plausible range a hidden grade would be shown (a ratio on a log scale, °C otherwise).
    medianPlausibleWidth: held.length ? r3(median(held.map((h) => (model.properties[key].scale === 'log' ? Math.exp(2 * zPlausible * calPlausible * h.p.sd) : 2 * zPlausible * calPlausible * h.p.sd)))) : null,
  };
  // The same hidden grades by matrix as printed and by fold of materials (D162): the coverage the shared scales give each,
  // and the scales each class alone would need.
  const groupBy = (key2) => { const out = {}; for (const h of held) (out[key2(h)] ??= []).push(h); return out; };
  const zOf = (h) => Math.abs((h.o.y - h.p.mu) / h.sd);
  calibration.byMatrix = Object.fromEntries(Object.entries(groupBy((h) => S.matrix(h.o.m))).sort().map(([cls, hs]) => [cls, {
    held: hs.length,
    likelyCoverage: r3(hs.filter((h) => within(h, zLikely, calLikely)).length / hs.length),
    plausibleCoverage: r3(hs.filter((h) => within(h, zPlausible, calPlausible)).length / hs.length),
    likelyScale: r3(quantile(hs.map(zOf), model.levels.likely) / zLikely), plausibleScale: r3(quantile(hs.map(zOf), model.levels.plausible) / zPlausible),
  }]));
  // How well the grade predictions state a chance (D165): where each hidden value fell in its predictive distribution
  // (the probability integral transform, u), and, for each limit the presets ask of the headline (estimate-model.json
  // reliabilityLimits), the predicted chance of meeting it in tenths beside how often the hidden value met it.
  const limits = model.properties[key].reliabilityLimits ?? [];
  if (held.length && limits.length) {
    const t = model.properties[key].scale === 'log' ? Math.log : (v) => v;
    const sdOf = (h) => Math.sqrt((h.p.sd * calLikely) ** 2 + h.o.noise2);
    const u = held.map((h) => normalCdf((h.o.y - h.p.mu) / sdOf(h)));
    const bins = Array.from({ length: 10 }, () => ({ n: 0, predicted: 0, met: 0 }));
    for (const h of held) for (const l of limits) {
      const z = (t(l.value) - tmMean(h.o.m) - h.p.mu) / sdOf(h);
      const chance = l.operator === '>=' ? 1 - normalCdf(z) : normalCdf(z);
      const met = l.operator === '>=' ? h.o.y >= t(l.value) - tmMean(h.o.m) : h.o.y <= t(l.value) - tmMean(h.o.m);
      const b = bins[Math.min(9, Math.floor(chance * 10))];
      b.n++; b.predicted += chance; b.met += met ? 1 : 0;
    }
    calibration.reliability = {
      medianU: r3(median(u)),
      bins: bins.map((b, i) => ({ from: i / 10, n: b.n, predicted: b.n ? r3(b.predicted / b.n) : null, observed: b.n ? r3(b.met / b.n) : null })),
    };
  }
  const order = [...new Set(S.pool.map((m) => m.id))].sort();
  const foldOf = new Map(order.map((id, i) => [id, i % cfg.folds]));
  calibration.byFold = Object.entries(groupBy((h) => foldOf.get(h.o.m.id))).sort().map(([, hs]) => ({ held: hs.length,
    plausibleCoverage: r3(hs.filter((h) => within(h, zPlausible, calPlausible)).length / hs.length) }));
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
 * What each formulation's own measurements prove a headline is at least (lower-bounds.js), as a function of the
 * formulation key: the list a grade's range is floored by. Built once per headline from the snapshot's usable
 * measurements, so a twin that prints its sibling's table is floored by that table too.
 */
export function formulationFloors(def, S) {
  const byF = new Map();
  if (def?.lowerBounds) {
    for (const list of S.byMaterial.values()) for (const x of list) {
      const f = S.fkey(x.gradeId);
      if (!byF.has(f)) byF.set(f, []);
      byF.get(f).push(x);
    }
  }
  const floors = new Map([...byF].map(([f, own]) => [f, lowerBoundsOf(def, own)]));
  return (f) => floors.get(f) ?? [];
}

/**
 * What each formulation's own moulded or undescribed values cap a headline at (lower-bounds.js ownCeilingsOf, D160),
 * for a headline the model caps so (estimate-model.json ownCeiling): the ceilings a grade's range is held under.
 */
export function formulationCeilings(def, S, rows, model) {
  const byF = new Map();
  if (model.properties[def?.key]?.ownCeiling) {
    for (const list of S.byMaterial.values()) for (const x of list) {
      const f = S.fkey(x.gradeId);
      if (!byF.has(f)) byF.set(f, []);
      byF.get(f).push(x);
    }
  }
  const ceilings = new Map([...byF].map(([f, own]) => [f, ownCeilingsOf(def, own, rows)]));
  return (f) => ceilings.get(f) ?? [];
}

/**
 * The estimate of every active grade of every material in the pool, for one headline: attached to the grade as
 * `estimate[key]`. Grades that share a formulation share one posterior and say so.
 */
export function attachGradeEstimates({ key, model, S, obs, P, hp, tmMean, inv, rangeFor, ownerOfF, floorsOf, ceilingsOf = () => [], centres = null }) {
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
    // The model's centre before any bound, for the unstated-direction back-test (directions.js), read rather than predicted twice.
    if (centres) centres.set(`${m.id}|${f}`, inv(p.mu));
    // Every grade takes the bounds its own sheets publish, and the floors its own measurements prove: a yield or break
    // stress under its ultimate strength, a heat deflection at 1.8 MPa under the one at 0.45 MPa (bounds.js, D126).
    const { centre, range, wide } = rangeFor(m, subject, p, h.unit, { formulation: f, implied: floorsOf(f), ceilings: ceilingsOf(f) });
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
      impliedBounds: floorsOf(f),
      ...(ceilingsOf(f).length ? { ownCeilings: ceilingsOf(f).map((c) => ({ measurementId: c.measurementId, hi: sig3(c.hi, 1), rule: c.rule })) } : {}),
      ownShare: total > 0 ? Math.round(Math.max(0, Math.min(1, ownWeight / total)) * 100) / 100 : 0,
      evidence: own.map(({ o }) => ({ kind: o.kind, measurementIds: o.items.map((x) => x.measurementId).filter(Boolean),
        converted: sig3(inv(o.y + tmMean(o.m))), conflict: !!o.conflict })),
      basis: strength === 'this-grade' ? "this grade's own measurements, with its material and the family model"
        : strength === 'this-material' ? `its material's other grades and the family model (${identityOf(m)})`
          : `the family model only (${identityOf(m)})`,
    };
    for (const g of grades) {
      // A product with a comparable value of its own shows that value; an estimate would only sit beside it (D83). The
      // value is the as-printed dry one: a product that publishes the headline only after annealing has an as-printed
      // part nobody measured, and is estimated as printed (D162), as product screening already reads it (D137).
      if (g.states?.find((s) => !s.treatment && s.moisture === 'dry')?.values?.[key]?.level === 'comparable') continue;
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
    version: 2,
    levels: model.levels,
    method: 'The Gaussian model of every observation, predicted at the grade\'s own row (its formulation and its maker as test house); likely and plausible ranges calibrated by hiding each grade\'s own published values and predicting them from the rest (DECISIONS D81).',
    decides: 'Never PASS. Independently certified product bounds may exclude in as-printed/dry contexts using the reserved complete-scenario budget; uncertified classes remain UNKNOWN (D137).',
  };
}
