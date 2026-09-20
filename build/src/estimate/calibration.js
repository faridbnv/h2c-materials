// Fitting a headline's model with conflicting evidence down-weighted, and calibrating its ranges: every measured
// headline is hidden in turn and predicted from everything else, and the likely and plausible ranges are scaled until
// they hold the hidden value as often as they claim (DECISIONS D43).

import { median, quantile } from './numerics.js';
import { HEAD, transform, sig3 } from './model.js';
import { fitModel, posterior, predict, hyperparameters, spreadObservations } from './gaussian.js';
import { conversions, betweenProductSpread } from './conversions.js';

/**
 * A prediction of material m's product f with observations `hide` hidden, as if the hidden headlines had never been
 * published (audit 2026-09-15, C-09). Hiding observations in the posterior is exact, but what the model learns from all
 * data had seen them:
 *
 *   The spreads. The materials are split into calibration.folds folds, and a hold-out of a material is predicted with
 *   spreads refitted without its fold's headlines, the between-product spread included. The refit starts from the full
 *   fit's spreads and makes one sweep of the grid, which matched a full three-sweep search to within 0.01 on every
 *   calibration scale. With the spreads fitted once on all data, elongation's hold-out errors were 25% narrower in the tail.
 *   The conversion offsets that turn the remaining values into the headline's semantics. They are refitted without the
 *   hidden products' pairs (the product, or with `wholeMaterial` every product of the material), and the prediction is
 *   corrected exactly for the shift: every observation of a changed kind moves by the change in its offset, and the
 *   prediction moves by those shifts weighted as the posterior weights them, plus the shift of the fit's mean.
 *
 * Conflict down-weighting is still decided once, on all data.
 */
export function makeHoldOut({ key, raw, model, conv, obs, S, hp: fullSpreads }) {
  const k = model.calibration.folds;
  const foldOf = new Map([...S.pool].sort((a, b) => a.id.localeCompare(b.id)).map((m, i) => [m.id, i % k]));
  const fits = new Map();
  const byHp = new Map();
  const fitFor = (fold) => {
    if (!fits.has(fold)) {
      const hidden = (o) => foldOf.get(o.m.id) === fold && o.kind === HEAD[key];
      const between = betweenProductSpread(key, raw.filter((o) => !hidden(o)), S);
      const fixedW = between.pairs >= model.fitting.minBetweenProductPairs ? Math.max(between.sd, model.properties[key].floors.w) : null;
      const hp = hyperparameters(key, spreadObservations(key, obs.filter((o) => !hidden(o)), model.fitting.spreadSampleMax), S, model, fixedW, { start: { ...fullSpreads, ...(fixedW != null ? { w: fixedW } : {}) }, sweeps: 1 });
      // The fit itself is over every observation: a fold hides its materials in `predict`, not in the fit, so two
      // folds whose hyperparameters land on the same grid point are the same fit. Sharing it is exact, and it is
      // most of the cost: a full fit is a dense n x n Cholesky, and there is one per fold per headline.
      const signature = JSON.stringify(Object.entries(hp).sort());
      if (!byHp.has(signature)) byHp.set(signature, posterior(fitModel(key, obs, S, model, hp)));
      fits.set(fold, { hp, P: byHp.get(signature) });
    }
    return fits.get(fold);
  };
  const productsOf = new Map();
  for (const o of raw) { if (!productsOf.has(o.m.id)) productsOf.set(o.m.id, new Set()); productsOf.get(o.m.id).add(`${o.m.id}|${o.f}`); }
  const refitted = new Map();
  return (m, f, manufacturer, hide, { wholeMaterial = false } = {}) => {
    const { P, hp } = fitFor(foldOf.get(m.id));
    const p = predict(P, hp, m, f, manufacturer, hide);
    const groups = wholeMaterial ? new Set([...(productsOf.get(m.id) ?? []), `${m.id}|${f}`]) : new Set([`${m.id}|${f}`]);
    const cacheKey = [...groups].sort().join(' ');
    if (!refitted.has(cacheKey)) {
      const without = conversions(key, raw, model, { without: groups });
      const shift = new Map();
      for (const [kind, c] of Object.entries(conv)) if (without[kind] && without[kind].offset !== c.offset) shift.set(kind, without[kind].offset - c.offset);
      refitted.set(cacheKey, shift);
    }
    const shift = refitted.get(cacheKey);
    if (!shift.size) return p;
    let meanShift = 0, weighted = 0, weightSum = 0;
    for (let i = 0; i < obs.length; i++) {
      const d = shift.get(obs[i].kind) ?? 0;
      meanShift += d;
      weighted += p.weights[i] * d;
      weightSum += p.weights[i];
    }
    meanShift /= obs.length;
    return { ...p, mu: p.mu + meanShift * (1 - weightSum) + weighted };
  };
}

/** The posterior of a headline's model, with evidence that contradicts everything else down-weighted and reported, twice at most. */
export function fitWithConflicts(key, observations, S, model, hp) {
  let obs = observations;
  let P = posterior(fitModel(key, obs, S, model, hp));
  const { conflictZ, conflictNoiseFactor, conflictPasses } = model.fitting;
  for (let pass = 0; pass < conflictPasses; pass++) {
    const flagged = [];
    // A material's only evidence for this headline is never down-weighted: the check stops one odd sheet pulling
    // other materials, not a material's own data yielding to a family made of other compounds (PP's own 0.39 GPa and
    // 460 %, a soft copolymer, once gave way to PP-CF, PP-GF and two variants: 1.5-4.5 GPa; audit 2026-09-15).
    const sole = (i) => !obs.some((o, j) => j !== i && o.m.id === obs[i].m.id);
    for (let i = 0; i < P.n; i++) if (!obs[i].conflict && !sole(i) && Math.abs(P.alpha[i] / Math.sqrt(P.diagKi[i])) > conflictZ) flagged.push(i);
    if (!flagged.length) break;
    obs = obs.map((o, i) => (flagged.includes(i) ? { ...o, conflict: true, noise2: o.noise2 * conflictNoiseFactor } : o));
    P = posterior(fitModel(key, obs, S, model, hp));
  }
  const conflicts = obs.filter((o) => o.conflict).map((o) => ({ key, materialId: o.m.id, material: o.m.name, kind: o.kind, measurementIds: o.items.map((i) => i.measurementId).filter(Boolean), values: o.items.map((i) => i.value) }));
  return { P, obs, conflicts };
}

/**
 * Calibration: hide each measured headline's own observations and predict it from the rest. Returns the scales that
 * make the likely and plausible ranges hold as often as they claim, the measured headlines far from their prediction,
 * and the calibration record the validation report and the build check read.
 */
export function calibrate({ key, model, S, obs, tmMean, inv, zLikely, zPlausible, holdOut }) {
  const { likely, plausible } = model.levels;
  const cfg = model.calibration;
  const loo = [];
  for (const m of S.pool) {
    const h = m.headline[key];
    if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
    const f = S.fkey(h.gradeId);
    const hide = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
    if (!hide.length) continue;
    const p = holdOut(m, f, S.grades.get(h.gradeId)?.manufacturer, hide);
    const rest = obs.some((o, i) => o.m.id === m.id && !hide.includes(i));
    loo.push({ m, y: transform(key, model)(h.value) - tmMean(m), p, rest });
  }
  const zs = loo.map((l) => Math.abs((l.y - l.p.mu) / l.p.sd));
  const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
  const calLikely = loo.length >= cfg.minHeld ? clamp(quantile(zs, likely) / zLikely, cfg.likelyScale) : cfg.defaultScale;
  const calPlausible = loo.length >= cfg.minHeld ? clamp(quantile(zs, plausible) / zPlausible, cfg.plausibleScale) : cfg.defaultScale;
  const within = (l, z, cal) => Math.abs(l.y - l.p.mu) <= z * cal * l.p.sd;
  const width = (l) => (model.properties[key].scale === 'log' ? Math.exp(2 * zLikely * calLikely * l.p.sd) : 2 * zLikely * calLikely * l.p.sd);
  const outliers = [];
  for (const l of loo) {
    const z = (l.y - l.p.mu) / (l.p.sd * calPlausible);
    if (Math.abs(z) > cfg.outlierZ) {
      outliers.push({ key, materialId: l.m.id, material: l.m.name, measured: l.m.headline[key].value, expected: sig3(inv(l.p.mu + tmMean(l.m))), unit: l.m.headline[key].unit, z: Math.round(z * 10) / 10 });
    }
  }
  const r3 = (v) => (v == null ? null : Number(v.toPrecision(3)));
  const calibration = {
    held: loo.length, likelyScale: r3(calLikely), plausibleScale: r3(calPlausible),
    likelyCoverage: loo.length ? r3(loo.filter((l) => within(l, zLikely, calLikely)).length / loo.length) : null,
    plausibleCoverage: loo.length ? r3(loo.filter((l) => within(l, zPlausible, calPlausible)).length / loo.length) : null,
    medianLikelyWidth: r3(median(loo.map(width))),
    medianLikelyWidthWithOwnEvidence: r3(median(loo.filter((l) => l.rest).map(width))),
  };
  return { loo, calLikely, calPlausible, outliers, calibration };
}
