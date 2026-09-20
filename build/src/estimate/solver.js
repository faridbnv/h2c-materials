// Solving the kernel. The model's covariance is a sum of column terms, and almost every column belongs to one
// chemical group: a polymer identity sits in one group, a material has one identity, a product has one material.
// So the matrix is block-diagonal in the groups, plus a few dozen columns that reach across them — the global
// mean, the fill classes, fill by morphology, the declared variant classes, the test houses and the two
// melting-point covariates. That is D + UU', and Woodbury solves it for the sum of the blocks' cubes instead of
// the whole matrix's: 21 to 31 times less arithmetic on today's data, and the gap widens as the corpus grows,
// because n grows and the number of groups does not (DECISIONS D79, and D77 which named this).
//
// Which columns are local and which are shared is read off the data, not off the column's name. It has to be:
// `v:grade:undisclosed dense filler` is a product-level column by its name and spans two groups in fact, and a
// manufacturer who sells into one group only is a shared column by its name and local in fact. A column whose
// observations fall in one block is local; every other column is in U. Nothing here knows what a polymer is.
//
// The arithmetic is the dense solve's, in a different order. It is exact in the sense that matters — the same
// matrix, factored differently — but floating-point addition is not associative, so results agree to about
// 1e-12 relative rather than bit for bit. test/estimate-solver.test.js is what holds that.

import { cholesky, inverseFromCholesky } from './numerics.js';

/** Forward and back substitution against a Cholesky factor, in place on `x`. */
function solveInPlace(L, x, m, at = 0) {
  for (let i = 0; i < m; i++) { let s = x[at + i]; const ri = i * m; for (let k = 0; k < i; k++) s -= L[ri + k] * x[at + k]; x[at + i] = s / L[ri + i]; }
  for (let i = m - 1; i >= 0; i--) { let s = x[at + i]; for (let k = i + 1; k < m; k++) s -= L[k * m + i] * x[at + k]; x[at + i] = s / L[i * m + i]; }
}

/**
 * A solver for K = Z Z' + diag(noise), given the observations' blocks.
 *
 *   rows      n sparse rows: { idx, val }, the column indices and the values already multiplied by their spread
 *   blockOf   the block each observation belongs to (any integer labels; they are renumbered here)
 *   noise     the diagonal added to K
 *
 * Returns null where a block is not positive definite, which is what the dense Cholesky returns in the same case.
 */
export function blockSolver(rows, blockOf, noise) {
  const n = rows.length;

  // The blocks, renumbered from zero, each with the observations that belong to it.
  const label = new Map();
  const block = new Int32Array(n);
  for (let i = 0; i < n; i++) { const b = blockOf[i]; if (!label.has(b)) label.set(b, label.size); block[i] = label.get(b); }
  const nb = label.size;
  const members = Array.from({ length: nb }, () => []);
  const slot = new Int32Array(n);            // where an observation sits inside its own block
  for (let i = 0; i < n; i++) { slot[i] = members[block[i]].length; members[block[i]].push(i); }

  // A column is local where every observation carrying it is in one block, and shared otherwise.
  let width = 0;
  for (const r of rows) for (const c of r.idx) if (c + 1 > width) width = c + 1;
  const only = new Int32Array(width).fill(-1);   // -1 unseen, -2 shared, else the one block
  for (let i = 0; i < n; i++) {
    const b = block[i];
    for (const c of rows[i].idx) { if (only[c] === -1) only[c] = b; else if (only[c] !== b) only[c] = -2; }
  }
  const sharedAt = new Int32Array(width).fill(-1);
  let p = 0;
  for (let c = 0; c < width; c++) if (only[c] === -2) sharedAt[c] = p++;

  // D, one dense block each: the local columns and the noise. Built with a scatter array over the columns, so a
  // block costs its own rows times their own columns rather than anything to do with n.
  const factors = [], inverses = new Array(nb).fill(null);
  let logDetD = 0;
  const scatter = new Float64Array(width);
  for (let b = 0; b < nb; b++) {
    const mine = members[b], m = mine.length;
    const D = new Float64Array(m * m);
    for (let a = 0; a < m; a++) {
      const ra = rows[mine[a]];
      for (let t = 0; t < ra.idx.length; t++) if (only[ra.idx[t]] !== -2) scatter[ra.idx[t]] = ra.val[t];
      for (let c = 0; c <= a; c++) {
        const rc = rows[mine[c]];
        let s = 0;
        for (let t = 0; t < rc.idx.length; t++) { const col = rc.idx[t]; if (only[col] !== -2) s += scatter[col] * rc.val[t]; }
        if (a === c) s += noise[mine[a]];
        D[a * m + c] = s; D[c * m + a] = s;
      }
      for (const col of ra.idx) scatter[col] = 0;
    }
    const L = cholesky(D, m);
    if (!L) return null;
    factors.push(L);
    for (let a = 0; a < m; a++) logDetD += 2 * Math.log(L[a * m + a]);
  }

  // U, the shared columns, and W = D^-1 U.
  const U = new Float64Array(n * p);
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    for (let t = 0; t < r.idx.length; t++) { const at = sharedAt[r.idx[t]]; if (at >= 0) U[i * p + at] = r.val[t]; }
  }
  const W = new Float64Array(n * p);
  {
    const col = new Float64Array(n);
    for (let j = 0; j < p; j++) {
      for (let i = 0; i < n; i++) col[i] = U[i * p + j];
      for (let b = 0; b < nb; b++) {
        const mine = members[b], m = mine.length, x = new Float64Array(m);
        for (let a = 0; a < m; a++) x[a] = col[mine[a]];
        solveInPlace(factors[b], x, m);
        for (let a = 0; a < m; a++) W[mine[a] * p + j] = x[a];
      }
    }
  }

  // M = I + U'W, and its factor. K^-1 = D^-1 - W M^-1 W'.
  const M = new Float64Array(p * p);
  for (let a = 0; a < p; a++) M[a * p + a] = 1;
  for (let i = 0; i < n; i++) {
    const ri = i * p;
    for (let a = 0; a < p; a++) { const u = U[ri + a]; if (!u) continue; for (let c = 0; c < p; c++) M[a * p + c] += u * W[ri + c]; }
  }
  const LM = p ? cholesky(M, p) : new Float64Array(0);
  if (p && !LM) return null;
  let logDetM = 0;
  for (let a = 0; a < p; a++) logDetM += 2 * Math.log(LM[a * p + a]);
  let Minv = null;

  const workP = new Float64Array(p);
  /** K^-1 v, written into `out` (a fresh array when none is given). */
  const apply = (v, out = new Float64Array(n)) => {
    for (let b = 0; b < nb; b++) {
      const mine = members[b], m = mine.length, x = new Float64Array(m);
      for (let a = 0; a < m; a++) x[a] = v[mine[a]];
      solveInPlace(factors[b], x, m);
      for (let a = 0; a < m; a++) out[mine[a]] = x[a];
    }
    if (!p) return out;
    workP.fill(0);
    for (let i = 0; i < n; i++) { const x = out[i]; if (!x) continue; const ri = i * p; for (let a = 0; a < p; a++) workP[a] += U[ri + a] * x; }
    solveInPlace(LM, workP, p);
    for (let i = 0; i < n; i++) { const ri = i * p; let s = 0; for (let a = 0; a < p; a++) s += W[ri + a] * workP[a]; out[i] -= s; }
    return out;
  };

  /** The block inverses and M's, computed the first time something asks for an entry of K^-1 by index. */
  const materialise = () => {
    if (Minv) return;
    for (let b = 0; b < nb; b++) inverses[b] = inverseFromCholesky(factors[b], members[b].length);
    Minv = p ? inverseFromCholesky(LM, p) : new Float64Array(0);
  };
  /** (K^-1)[i][j] for two observations, which is zero in D unless they share a block. */
  const entry = (i, j) => {
    let s = 0;
    if (block[i] === block[j]) { const m = members[block[i]].length; s = inverses[block[i]][slot[i] * m + slot[j]]; }
    const ri = i * p, rj = j * p;
    for (let a = 0; a < p; a++) { const w = W[ri + a]; if (!w) continue; for (let c = 0; c < p; c++) s -= w * Minv[a * p + c] * W[rj + c]; }
    return s;
  };

  return {
    n, blocks: nb, rank: p, logDet: logDetD + logDetM, apply,
    /** The diagonal of K^-1, which is what a conflict is judged against. */
    diag() {
      materialise();
      const d = new Float64Array(n);
      for (let i = 0; i < n; i++) d[i] = entry(i, i);
      return d;
    },
    /** (K^-1)[H, H] for a handful of observations: the block a hold-out hides. */
    sub(H) {
      materialise();
      return H.map((a) => H.map((b) => entry(a, b)));
    },
  };
}
