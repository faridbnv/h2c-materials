// The estimate stage: inference for headlines no source publishes, applied to a compiled database as an overlay.
//
// The core build (compile.js) produces a complete, valid database in which a missing headline is `known: false` with
// its missing state, related evidence and implied bounds. This stage adds, and only adds:
//
//   headline.estimate        a calibrated range with its evidence, precision and the range it may screen on
//   headline.notApplicable   where the model knows the property does not apply (an elastomer's heat deflection)
//   hdt045.loadBracket       the 0.45 MPa range of a heat deflection whose load the source never stated
//   print.nozzleEstimate, print.bedEstimate   windows inferred from peers where none is published; they decide nothing
//   meta.estimateCoverage, meta.estimateModel, meta.printEstimates   diagnostics and calibration
//
// The model is one Gaussian model per headline (build/mappings/estimate-model.json, DECISIONS D43):
//
//   value of a product = identity (pulled towards its chemical group) + reinforcement
//                        + reinforcement in a semicrystalline matrix + declared variant + test house
//                        [+ melting point, for the heat deflection of fast-crystallising polymers]
//                        + this material's deviation + this product's deviation
//
// on the natural-log scale for density, stiffness, strength and elongation and in °C for heat deflection. Every
// observation of a material enters it converted to the headline's semantics (conversions.js). Each measured headline
// is then hidden and predicted to calibrate the ranges (calibration.js), and each evidence class is back-tested to
// decide whether it may screen (screening.js). An estimate never passes a material; what it may do is decided in
// app/js/engine/constraints.js.
//
// A case the model cannot express is a not-applicable reason or a reviewed finding that says more data is needed,
// never a new special case in code (DECISIONS D58).
//
// Files: model.js (configuration, shared names), numerics.js, observations.js (conversion kinds, the snapshot),
// conversions.js, gaussian.js (kernel, fit, prediction), calibration.js, bounds.js (the ranges and their limits),
// screening.js (back-test, brackets, the range that decides), print.js (nozzle and bed windows), validate.js (checks and
// report section).

import { normalQuantile } from './numerics.js';
import { ESTIMATE_MODEL, HEAD, estimateKeys, identityOf, modelWith, untransform, sig3 } from './model.js';
import { snapshot, rawObservations } from './observations.js';
import { conversions, convert, betweenProductSpread } from './conversions.js';
import { meltingPoint, hyperparameters, spreadObservations, predict } from './gaussian.js';
import { fitWithConflicts, calibrate, makeHoldOut } from './calibration.js';
import { makeRangeFor } from './bounds.js';
import { attachLoadBrackets, backTest, screenDecision } from './screening.js';
import { attachPrintEstimates } from './print.js';

export { ESTIMATE_MODEL, estimateKeys, identityOf } from './model.js';

/**
 * Estimates for every missing headline of every in-scope material, attached in place; returns the model's diagnostics.
 * `model` is the configuration with its polymer identities (model.js modelWith).
 */
export function buildEstimates(materials, { grades = [], measurements = [], registry } = {}, model) {
  const ESTIMATE_KEYS = estimateKeys(registry, model);
  const S = snapshot(materials, grades, measurements, model);
  const { likely, plausible } = model.levels;
  const zLikely = normalQuantile(0.5 + likely / 2), zPlausible = normalQuantile(0.5 + plausible / 2);
  const diagnostics = { levels: model.levels, properties: {}, rejected: [], bounds: [], conflicts: [], outliers: [] };

  for (const key of ESTIMATE_KEYS) {
    const inv = untransform(key, model);
    const { raw, rejected, bounds: oneSided, ownerOfF } = rawObservations(key, S, model);
    diagnostics.rejected.push(...rejected);
    diagnostics.bounds.push(...oneSided);
    const conv = conversions(key, raw, model);
    const converted = convert(key, raw, conv, S, model);
    const tmMean = meltingPoint(key, S, model).offset;
    const floors = model.properties[key].floors;
    const between = betweenProductSpread(key, raw, S);
    const fixedW = between.pairs >= model.fitting.minBetweenProductPairs ? Math.max(between.sd, floors.w) : null;

    const hp = hyperparameters(key, spreadObservations(key, converted, model.fitting.spreadSampleMax), S, model, fixedW);

    const { P, obs, conflicts } = fitWithConflicts(key, converted, S, model, hp);
    diagnostics.conflicts.push(...conflicts);
    const holdOut = makeHoldOut({ key, raw, model, conv, obs, S, hp });

    const { loo, calLikely, calPlausible, outliers, calibration } = calibrate({ key, model, S, obs, tmMean, inv, zLikely, zPlausible, holdOut });
    diagnostics.outliers.push(...outliers);
    const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
    diagnostics.properties[key] = {
      observations: obs.length, formulations: new Set(obs.map((o) => o.f)).size,
      betweenProduct: { sd: r3(between.sd), pairs: between.pairs, used: r3(hp.w), estimated: fixedW == null },
      spreads: Object.fromEntries(Object.entries(hp).map(([k, v]) => [k, r3(v)])),
      calibration,
      conversions: Object.fromEntries(Object.entries(conv).filter(([k]) => k !== HEAD[key]).map(([k, c]) => [k, { offset: r3(c.offset), sd: r3(c.sd), pairs: c.pairs }])),
    };

    if (key === 'hdt045') diagnostics.bracketScreening = attachLoadBrackets({ raw, conv, S, model, zPlausible });

    const rangeFor = makeRangeFor({ key, model, S, oneSided, inv, calLikely, calPlausible });
    const certification = backTest({ key, model, S, obs, tmMean, rangeFor, holdOut });
    diagnostics.properties[key].screening = certification;

    for (const m of S.pool) {
      const h = m.headline[key];
      if (!h || h.known || h.notApplicable) continue;
      const rep = m.representativeGrade && S.grades.has(m.representativeGrade) ? m.representativeGrade : null;
      const f = rep ? S.fkey(rep) : null;
      // Its own measurements, and those of its representative product filed under another material.
      const mine = obs.map((o, i) => ({ o, i })).filter(({ o }) => o.m.id === m.id || (f && o.f === f));
      const support = m.facets.supportMaterial?.value === true;
      if ((!mine.length && support) || (key === 'hdt045' && S.info(m).morphology === 'elastomer')) {
        h.notApplicable = { reason: support ? model.notApplicable.support : model.notApplicable.elastomerHdt };
        continue;
      }
      const manufacturer = rep ? S.grades.get(rep).manufacturer ?? null : null;
      // One product has one value: a representative product filed under another material is predicted
      // as that material's, so PA-CF and PA12-CF cannot disagree about CarbonX CF PA12.
      const owner = f && ownerOfF.get(f) && ownerOfF.get(f) !== m.id ? S.inPool.get(ownerOfF.get(f)) : null;
      const subject = owner ?? m;
      const p = predict(P, hp, subject, f, manufacturer);
      p.mu += tmMean(subject);

      const { bounds, centre, range, wide, at } = rangeFor(m, subject, p, h.unit);

      const onThisGrade = mine.some(({ o }) => o.f === f && f);
      const strength = onThisGrade ? 'this-grade' : mine.length ? 'this-material' : 'family';
      const totalWeight = p.weights.reduce((a, v) => a + v, 0);
      const ownWeight = mine.reduce((a, { i }) => a + p.weights[i], 0);
      const ownShare = totalWeight > 0 ? Math.max(0, Math.min(1, ownWeight / totalWeight)) : 0;
      const spread = model.properties[key].scale === 'log' ? range[1] / range[0] : range[1] - range[0];
      const precision = spread <= model.properties[key].precision.good ? 'good' : spread <= model.properties[key].precision.fair ? 'fair' : 'poor';
      // Converted to the headline's own scale: the melting-point term the model subtracts is added back (it was left
      // out, so PA12's own 94.7 °C read as converted to 108 °C).
      const convertedValue = (o) => inv(o.y + tmMean(o.m));
      let familyRange = null;
      const familyAt = (q) => {
        if (!familyRange) {
          const pf = predict(P, hp, subject, f, manufacturer, mine.map(({ i }) => i));
          pf.mu += tmMean(subject);
          familyRange = rangeFor(m, subject, pf, h.unit, { ownBounds: false });
        }
        return familyRange.at(q);
      };
      const own = mine.map(({ o }) => ({ value: convertedValue(o), bound: o.items.find((x) => x.bound)?.bound, measurementId: o.items.map((x) => x.measurementId).find(Boolean) }));
      const screen = screenDecision({ strength, certification, at, familyAt, own, unit: h.unit });

      const evidence = mine.map(({ o }) => ({
        kind: o.kind, gradeId: o.gradeId, sameGrade: !!f && o.f === f,
        items: o.items, converted: sig3(convertedValue(o)), conversion: o.conversion.why, conflict: !!o.conflict,
      }));
      const family = [identityOf(m), m.facets.reinforcement.value !== 'unfilled' ? m.facets.reinforcement.value : null, S.variantOf(f),
        manufacturer ? `tested by ${manufacturer}` : null].filter(Boolean).join(', ');
      h.estimate = {
        kind: 'model', strength, precision, unit: h.unit,
        sharedWith: owner ? { materialId: owner.id, name: owner.name } : null,
        centre: sig3(centre), lo: sig3(range[0], -1), hi: sig3(range[1], 1),
        plausible: { lo: sig3(wide[0], -1), hi: sig3(wide[1], 1) },
        levels: model.levels, ownShare: Math.round(ownShare * 100) / 100,
        evidence, family, bounds,
        basis: strength === 'this-grade' ? "this grade's related measurements, with the family model"
          : strength === 'this-material' ? "this material's other grades, with the family model"
          : `the family model only: ${family}`,
        method: `Gaussian model of every observation in the snapshot, each converted to this headline; ${Math.round(likely * 100)}% and ${Math.round(plausible * 100)}% ranges calibrated by predicting ${loo.length} hidden measured headlines`,
        ...screen,
      };
    }
  }
  return diagnostics;
}

/** Coverage summary for the validation report and meta. */
export function summariseEstimates(materials, registry) {
  const pool = materials.filter((m) => !m.excluded && !m.familyEntry);
  const out = {};
  for (const key of estimateKeys(registry)) {
    const missing = pool.filter((m) => !m.headline[key]?.known);
    const row = { missing: missing.length, 'this-grade': 0, 'this-material': 0, family: 0, notApplicable: 0, none: 0, canScreen: 0 };
    for (const m of missing) {
      const h = m.headline[key];
      if (h.notApplicable) row.notApplicable++;
      else if (h.estimate) { row[h.estimate.strength]++; if (h.estimate.canScreen) row.canScreen++; }
      else row.none++;
    }
    out[key] = row;
  }
  return out;
}

/** Apply the estimate stage to a compiled database in place. */
export function attachEstimates(db) {
  const model = modelWith(db.polymers);
  const estimateModel = buildEstimates(db.materials, { grades: db.grades, measurements: db.measurements, registry: db.registry }, model);
  const printEstimates = attachPrintEstimates(db.materials, model);
  db.meta.estimateCoverage = summariseEstimates(db.materials, db.registry);
  db.meta.estimateModel = estimateModel;
  db.meta.printEstimates = printEstimates;
  return db;
}
