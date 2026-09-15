// The Gaussian model: its kernel (identity pulled towards its chemical group, reinforcement by matrix, declared
// variants, test house, melting point, the material's and the product's own deviations), the fit, the posterior,
// prediction with observations hidden, and the empirical-Bayes spreads.

import { cholesky, inverseFromCholesky, invertSmall } from './numerics.js';
import { identityOf, HEAD } from './model.js';

/**
 * Heat deflection of a polymer that crystallises while printing rises with its melting point: a fibre
 * network carries the bar to within a fixed margin of it (slope 1), an unfilled bar part of the way.
 * The documented slope is the model's mean, so thin data can adjust it but not reverse it.
 */
export function meltingPoint(key, S, model) {
  const slope = model.bounds.meltingPointSlope;
  const covariate = (m) => (key === 'hdt045' && S.info(m).fastCrystallising && S.tmOf(m) != null ? (S.tmOf(m) - slope.reference) / 50 : null);
  const offset = (m) => { const c = covariate(m); return c == null ? 0 : c * 50 * (S.fibre(m) ? slope.fibre : slope.unfilled); };
  return { covariate, offset };
}

export function makeKernel(key, S, model) {
  const scale = model.properties[key].scaleUnit;
  const tmCovariate = meltingPoint(key, S, model).covariate;
  const columns = (m, formulation, manufacturer) => {
    const id = identityOf(m), info = S.info(m), f = S.reinforcement(m);
    const x = new Map([['1', 1], [`g:${info.group}`, 1], [`p:${id}`, 1]]);
    // Reinforcement acts through the matrix: a fibre network lifts a semicrystalline bar's heat
    // deflection towards its melting point but an amorphous bar's only a little past Tg.
    if (f !== 'unfilled') { if (key !== 'hdt045') x.set(`f:${f}`, 1); x.set(`fx:${f}:${info.morphology}`, 1); }
    // A declared commercial variant class (materials.csv Variant class: silk, particle-filled) has its own effect.
    if (m.variantClass) x.set(`v:${m.variantClass}`, 1);
    // A variant product explains its own offset (a lightweight additive, an undisclosed filler) rather than moving its family.
    if (S.variantOf(formulation)) x.set(`v:grade:${S.variantOf(formulation)}`, 1);
    if (manufacturer) x.set(`s:${manufacturer}`, 1);
    if (tmCovariate(m) != null) x.set(S.fibre(m) ? 'tm:fibre' : 'tm:unfilled', tmCovariate(m));
    return x;
  };
  const sdOf = (c, hp) => (c === '1' ? 10 * scale : c[0] === 'g' ? hp.tg : c[0] === 'p' ? hp.tp : c.startsWith('fx:') ? hp.tfx
    : c[0] === 'f' ? hp.tf : c.startsWith('v:grade:') ? model.gradeVariants.spreadInScaleUnits * scale : c[0] === 'v' ? hp.tv : c.startsWith('tm:') ? hp.ttm : c[0] === 's' ? hp.tm : 0);
  const productSd = (m, hp) => (S.info(m).morphology === 'elastomer' ? hp.we : hp.w);
  const point = (m, f, manufacturer) => ({ m, f, x: columns(m, f, manufacturer) });
  const cov = (a, b, hp) => {
    let s = 0;
    for (const [c, v] of a.x) { const w = b.x.get(c); if (w !== undefined) { const t = sdOf(c, hp); s += v * w * t * t; } }
    if (a.m.id === b.m.id) s += hp.sm * hp.sm;
    if (a.f && a.f === b.f) s += productSd(a.m, hp) ** 2;
    return s;
  };
  return { point, cov };
}

export function fitModel(key, obs, S, model, hp) {
  const { point, cov } = makeKernel(key, S, model);
  const n = obs.length;
  const pts = obs.map((o) => point(o.m, o.f, S.grades.get(o.gradeId)?.manufacturer));
  const mean = obs.reduce((a, o) => a + o.y, 0) / n;
  const r = obs.map((o) => o.y - mean);
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { const v = cov(pts[i], pts[j], hp) + (i === j ? obs[i].noise2 + 1e-9 : 0); K[i * n + j] = v; K[j * n + i] = v; }
  const L = cholesky(K, n);
  if (!L) return null;
  let logLik = 0; { const z = new Float64Array(n); for (let i = 0; i < n; i++) { let s = r[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * z[k]; z[i] = s / L[i * n + i]; logLik += -0.5 * z[i] * z[i] - Math.log(L[i * n + i]); } }
  return { logLik, n, pts, mean, r, L, cov, point };
}

export function posterior(fit) {
  const { n, L, r } = fit;
  const Ki = inverseFromCholesky(L, n);
  const alpha = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Ki[i * n + j] * r[j]; alpha[i] = s; }
  return { ...fit, Ki, alpha };
}

/** Latent headline of a product (material m, formulation f, test house), optionally hiding observations S. */
export function predict(P, hp, m, f, manufacturer, hide = []) {
  const { n, pts, Ki, alpha, r, mean, cov, point } = P;
  const t = point(m, f, manufacturer);
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) k[i] = cov(t, pts[i], hp);
  if (!hide.length) {
    let mu = mean, q = 0;
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (!k[i]) continue;
      mu += k[i] * alpha[i];
      let v = 0; for (let j = 0; j < n; j++) v += Ki[i * n + j] * k[j];
      w[i] = v; q += k[i] * v;
    }
    return { mu, sd: Math.sqrt(Math.max(1e-12, cov(t, t, hp) - q)), weights: w };
  }

  // Hiding observations H downdates the inverse: A = Ki - Ki[:,H] B^-1 Ki[H,:] with B = Ki[H,H], zero
  // on H's rows and columns. Only A r and A k are needed, so they are computed as vectors and the n x n
  // matrix is never formed: forming it for every calibration hold-out made calibration cubic in the
  // number of observations (13 s of a 13.6 s compile at twice today's data).
  const h = hide.length;
  const hidden = new Set(hide);
  const Binv = invertSmall(hide.map((a) => hide.map((b) => Ki[a * n + b])));
  for (const i of hide) k[i] = 0;
  // Ki[H_q, visible columns] against r and against k, then B^-1 applied to each.
  const tr = new Float64Array(h), tk = new Float64Array(h);
  for (let q = 0; q < h; q++) {
    const row = hide[q] * n;
    let sr = 0, sk = 0;
    for (let j = 0; j < n; j++) { if (hidden.has(j)) continue; sr += Ki[row + j] * r[j]; sk += Ki[row + j] * k[j]; }
    tr[q] = sr; tk[q] = sk;
  }
  const cr = new Float64Array(h), ck = new Float64Array(h);
  for (let p = 0; p < h; p++) for (let q = 0; q < h; q++) { cr[p] += Binv[p][q] * tr[q]; ck[p] += Binv[p][q] * tk[q]; }

  let mu = mean, q2 = 0;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!k[i]) continue;
    const row = i * n;
    let ar = 0, ak = 0;
    for (let j = 0; j < n; j++) { if (hidden.has(j)) continue; ar += Ki[row + j] * r[j]; ak += Ki[row + j] * k[j]; }
    for (let p = 0; p < h; p++) { ar -= Ki[row + hide[p]] * cr[p]; ak -= Ki[row + hide[p]] * ck[p]; }
    mu += k[i] * ar;
    w[i] = ak; q2 += k[i] * ak;
  }
  return { mu, sd: Math.sqrt(Math.max(1e-12, cov(t, t, hp) - q2)), weights: w };
}

/**
 * The observations the spreads are estimated on: the headline and the single most direct kind per formulation, which
 * identifies them as well as the full set does at a fraction of the cost.
 */
export function spreadObservations(key, obs) {
  const hasHead = new Set(obs.filter((o) => o.kind === HEAD[key]).map((o) => `${o.m.id}|${o.f}`));
  return obs.filter((o) => o.kind === HEAD[key] || !hasHead.has(`${o.m.id}|${o.f}`));
}

/**
 * Empirical Bayes: each free spread in turn over a grid, three sweeps, above its documented floor. `start` (a fit's
 * spreads) and `sweeps` let a refit on nearly the same data start from where the full fit ended.
 */
export function hyperparameters(key, obs, S, model, fixedW, { start = null, sweeps = 3 } = {}) {
  const scale = model.properties[key].scaleUnit, floors = model.properties[key].floors;
  const hp = start ? { ...start } : { tg: scale, tp: scale / 2, tf: scale, tfx: scale / 2, tv: scale / 2, tm: scale / 3, ttm: scale / 2, sm: scale / 3, w: fixedW ?? scale / 2, we: scale };
  for (const [k, v] of Object.entries(floors)) if (k in hp) hp[k] = Math.max(hp[k], v);
  // The melting-point slope's spread is documented, not learned: a handful of unfilled polymers cannot
  // be allowed to reverse a physical relation (PVDF deflects near its melting point, PA66 far below).
  if (floors.ttm != null) hp.ttm = floors.ttm;
  const free = Object.keys(hp).filter((k) => !(k === 'w' && fixedW != null) && k !== 'ttm');
  const grid = [0.01, 0.05, 0.12, 0.25, 0.4, 0.6, 0.85, 1.2, 1.7, 2.5, 4].map((g) => g * scale);
  const score = (h) => fitModel(key, obs, S, model, h)?.logLik ?? -Infinity;
  let best = score(hp);
  for (let sweep = 0; sweep < sweeps; sweep++) {
    for (const k of free) {
      for (const v of grid) {
        if (v < (floors[k] ?? 0)) continue;
        const trial = { ...hp, [k]: v }, s = score(trial);
        if (s > best) { best = s; hp[k] = v; }
      }
    }
  }
  return hp;
}
