// Fitting a headline's model with conflicting evidence down-weighted, and calibrating its ranges: every measured
// headline is hidden in turn and predicted from everything else, and the likely and plausible ranges are scaled until
// they hold the hidden value as often as they claim (DECISIONS D43).

import { median, quantile } from './numerics.js';
import { HEAD, transform, sig3 } from './model.js';
import { fitModel, posterior, predict } from './gaussian.js';

/** The posterior of a headline's model, with evidence that contradicts everything else down-weighted and reported, twice at most. */
export function fitWithConflicts(key, observations, S, model, hp) {
  let obs = observations;
  let P = posterior(fitModel(key, obs, S, model, hp));
  for (let pass = 0; pass < 2; pass++) {
    const flagged = [];
    // A material's only evidence for this headline is never down-weighted: the check stops one odd sheet pulling
    // other materials, not a material's own data yielding to a family made of other compounds (PP's own 0.39 GPa and
    // 460 %, a soft copolymer, once gave way to PP-CF, PP-GF and two variants: 1.5-4.5 GPa; audit 2026-09-15).
    const sole = (i) => !obs.some((o, j) => j !== i && o.m.id === obs[i].m.id);
    for (let i = 0; i < P.n; i++) if (!obs[i].conflict && !sole(i) && Math.abs(P.alpha[i] / Math.sqrt(P.Ki[i * P.n + i])) > 3.5) flagged.push(i);
    if (!flagged.length) break;
    obs = obs.map((o, i) => (flagged.includes(i) ? { ...o, conflict: true, noise2: o.noise2 * 25 } : o));
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
export function calibrate({ key, model, S, obs, P, hp, tmMean, inv, zLikely, zPlausible }) {
  const { likely, plausible } = model.levels;
  const loo = [];
  for (const m of S.pool) {
    const h = m.headline[key];
    if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
    const f = S.fkey(h.gradeId);
    const hide = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
    if (!hide.length) continue;
    const p = predict(P, hp, m, f, S.grades.get(h.gradeId)?.manufacturer, hide);
    const rest = obs.some((o, i) => o.m.id === m.id && !hide.includes(i));
    loo.push({ m, y: transform(key, model)(h.value) - tmMean(m), p, rest });
  }
  const zs = loo.map((l) => Math.abs((l.y - l.p.mu) / l.p.sd));
  const calLikely = loo.length >= 20 ? Math.min(3, Math.max(0.6, quantile(zs, likely) / zLikely)) : 1.3;
  const calPlausible = loo.length >= 20 ? Math.min(3, Math.max(0.75, quantile(zs, plausible) / zPlausible)) : 1.3;
  const within = (l, z, cal) => Math.abs(l.y - l.p.mu) <= z * cal * l.p.sd;
  const width = (l) => (model.properties[key].scale === 'log' ? Math.exp(2 * zLikely * calLikely * l.p.sd) : 2 * zLikely * calLikely * l.p.sd);
  const outliers = [];
  for (const l of loo) {
    const z = (l.y - l.p.mu) / (l.p.sd * calPlausible);
    if (Math.abs(z) > 3) {
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
