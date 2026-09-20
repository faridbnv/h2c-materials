// Numerics of the estimate model: the normal distribution, soft-bounded quantiles, small linear algebra and the
// binomial tail the screening back-test uses. No knowledge of materials.

const erf = (x) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
export const normalCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Inverse standard normal (Acklam). */
export function normalQuantile(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) return -normalQuantile(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}


/**
 * Quantile p of normal(mu, sd) multiplied by soft upper and lower limits: each limit is a normal CDF
 * centred on its value with its own spread, because a melting point or a glass transition plus a margin
 * is itself approximate. A hard truncation would pile an estimate against the limit with no width.
 */
export function boundedQuantile(mu, sd, bounds, p) {
  return boundedQuantiles(mu, sd, bounds, [p])[0];
}

/** The soft-bounded density of boundedQuantile on its integration grid. */
function boundedDensity(mu, sd, bounds) {
  const n = 801, lo = mu - 7 * sd, step = (14 * sd) / (n - 1);
  const dens = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x = lo + i * step;
    let d = Math.exp(-0.5 * ((x - mu) / sd) ** 2);
    for (const b of bounds) d *= b.side === 'upper' ? normalCdf((b.value - x) / b.sd) : normalCdf((x - b.value) / b.sd);
    dens[i] = d; total += d;
  }
  return { n, lo, step, dens, total };
}

/** Several quantiles of the same soft-bounded distribution, integrating it once. */
export function boundedQuantiles(mu, sd, bounds, ps) {
  if (!bounds.length) return ps.map((p) => mu + sd * normalQuantile(p));
  const { n, lo, step, dens, total } = boundedDensity(mu, sd, bounds);
  if (!(total > 0)) return ps.map((p) => mu + sd * normalQuantile(p));
  return ps.map((p) => {
    let acc = 0;
    for (let i = 0; i < n; i++) { acc += dens[i] / total; if (acc >= p) return lo + i * step; }
    return lo + (n - 1) * step;
  });
}

/** P(X <= x) under the soft-bounded distribution of boundedQuantile: where a true value falls in a prediction. */
export function boundedCdf(mu, sd, bounds, x) {
  if (!bounds.length) return normalCdf((x - mu) / sd);
  const { n, lo, step, dens, total } = boundedDensity(mu, sd, bounds);
  if (!(total > 0)) return normalCdf((x - mu) / sd);
  let acc = 0;
  for (let i = 0; i < n && lo + i * step <= x; i++) acc += dens[i] / total;
  return Math.min(1, acc);
}

export { median } from '../normalize/values.js';
export const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };

/**
 * The Cholesky factor, and most of what the estimate stage costs: one per fit, and hundreds of fits per
 * headline. Two columns of the row are taken together so that L[i][k], which both of their sums read, is loaded
 * once instead of twice; each sum still runs over k in the same order it did, so the factor is bit for bit the
 * one the single-column loop gives and `npm run build:diff` shows no difference.
 */
export function cholesky(K, n) {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    const ri = i * n;
    let j = 0;
    for (; j + 1 < i; j += 2) {
      const rj = j * n, rj1 = rj + n;
      let s0 = K[ri + j], s1 = K[ri + j + 1];
      for (let k = 0; k < j; k++) { const a = L[ri + k]; s0 -= a * L[rj + k]; s1 -= a * L[rj1 + k]; }
      const d0 = s0 / L[rj + j];
      L[ri + j] = d0;
      s1 -= d0 * L[rj1 + j];
      L[ri + j + 1] = s1 / L[rj1 + j + 1];
    }
    for (; j < i; j++) {
      const rj = j * n;
      let s = K[ri + j];
      for (let k = 0; k < j; k++) s -= L[ri + k] * L[rj + k];
      L[ri + j] = s / L[rj + j];
    }
    let d = K[ri + i];
    for (let k = 0; k < i; k++) d -= L[ri + k] * L[ri + k];
    if (!(d > 0)) return null;
    L[ri + i] = Math.sqrt(d);
  }
  return L;
}
export function inverseFromCholesky(L, n) {
  const Li = new Float64Array(n * n), A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    Li[i * n + i] = 1 / L[i * n + i];
    for (let j = 0; j < i; j++) { let s = 0; for (let k = j; k < i; k++) s -= L[i * n + k] * Li[k * n + j]; Li[i * n + j] = s / L[i * n + i]; }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = 0; for (let k = i; k < n; k++) s += Li[k * n + i] * Li[k * n + j]; A[i * n + j] = s; A[j * n + i] = s; }
  return A;
}
export function invertSmall(B) {
  const n = B.length, A = B.map((r, i) => [...r, ...B.map((_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    const d = A[i][i]; for (let j = 0; j < 2 * n; j++) A[i][j] /= d;
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((r) => r.slice(n));
}

/** P(X >= k) for X ~ Binomial(n, p). */
export function binomialTail(n, p, k) {
  if (k <= 0) return 1;
  let term = Math.pow(1 - p, n), cdf = 0;
  for (let i = 0; i < k; i++) { cdf += term; term = term * ((n - i) / (i + 1)) * (p / (1 - p)); }
  return Math.max(0, 1 - cdf);
}

/** P(X <= k) for X ~ Binomial(n, p). */
export function binomialCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n || p <= 0) return 1;
  if (p >= 1) return 0;
  let term = Math.pow(1 - p, n), cdf = 0;
  for (let i = 0; i <= k; i++) { cdf += term; term = term * ((n - i) / (i + 1)) * (p / (1 - p)); }
  return Math.min(1, cdf);
}

/**
 * The one-sided Clopper-Pearson upper confidence bound on a rate: the largest p that k events in n trials do not rule
 * out at the given confidence, i.e. P(X <= k | n, p) = 1 - confidence. With no events it is 1 - (1 - confidence)^(1/n).
 */
export function binomialUpperBound(k, n, confidence) {
  if (!(n > 0) || k >= n) return 1;
  let lo = k / n, hi = 1;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (binomialCdf(k, n, mid) > 1 - confidence) lo = mid; else hi = mid; }
  return hi;
}
