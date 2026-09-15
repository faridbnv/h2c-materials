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
  if (!bounds.length) return mu + sd * normalQuantile(p);
  const n = 801, lo = mu - 7 * sd, step = (14 * sd) / (n - 1);
  const dens = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x = lo + i * step;
    let d = Math.exp(-0.5 * ((x - mu) / sd) ** 2);
    for (const b of bounds) d *= b.side === 'upper' ? normalCdf((b.value - x) / b.sd) : normalCdf((x - b.value) / b.sd);
    dens[i] = d; total += d;
  }
  if (!(total > 0)) return mu + sd * normalQuantile(p);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += dens[i] / total; if (acc >= p) return lo + i * step; }
  return lo + (n - 1) * step;
}

export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
export const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };

export function cholesky(K, n) {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = K[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) { if (!(s > 0)) return null; L[i * n + i] = Math.sqrt(s); } else L[i * n + j] = s / L[j * n + j];
    }
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
