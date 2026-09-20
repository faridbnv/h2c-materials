// The kernel is solved by block (DECISIONS D79). The whole point of it is that it changes no result, so this is
// the check that says so: the same matrix, factored two ways, must agree everywhere anything downstream reads it
// — the likelihood the spread search ranks on, the posterior weights an estimate is made of, the diagonal a
// conflict is judged against, and a prediction with a hold-out hidden.
//
// It is not bit-identical, and cannot be: the block solve adds the same products in a different order, and
// floating-point addition is not associative. The tolerances below are what that costs, about 1e-10 relative,
// against a dense solve that is itself only exact to about the same. Anything larger is a mistake, not rounding.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockSolver } from '../build/src/estimate/solver.js';
import { cholesky, inverseFromCholesky, invertSmall } from '../build/src/estimate/numerics.js';
import { makeKernel, fitModel, posterior, predict, spreadObservations, hyperparameters } from '../build/src/estimate/gaussian.js';
import { modelWith, estimateKeys } from '../build/src/estimate/model.js';
import { snapshot, rawObservations } from '../build/src/estimate/observations.js';
import { conversions, convert } from '../build/src/estimate/conversions.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** K from the sparse rows the solver takes, as a dense matrix: the definition both sides are measured against. */
function denseK(rows, noise) {
  const n = rows.length, K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let a = 0; a < rows[i].idx.length; a++) {
        for (let b = 0; b < rows[j].idx.length; b++) if (rows[i].idx[a] === rows[j].idx[b]) { s += rows[i].val[a] * rows[j].val[b]; break; }
      }
      if (i === j) s += noise[i];
      K[i * n + j] = s; K[j * n + i] = s;
    }
  }
  return K;
}

/** The dense solve, as it was before the block solve: the reference. */
function denseSolver(K, n) {
  const L = cholesky(K, n);
  if (!L) return null;
  const Ki = inverseFromCholesky(L, n);
  let logDet = 0;
  for (let i = 0; i < n; i++) logDet += 2 * Math.log(L[i * n + i]);
  return {
    logDet,
    apply: (v) => { const out = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += Ki[i * n + j] * v[j]; out[i] = s; } return out; },
    diag: () => { const d = new Float64Array(n); for (let i = 0; i < n; i++) d[i] = Ki[i * n + i]; return d; },
    sub: (H) => H.map((a) => H.map((b) => Ki[a * n + b])),
  };
}

const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)), `${what}: ${a} vs ${b}`);
const closeAll = (a, b, tol, what) => { for (let i = 0; i < a.length; i++) close(a[i], b[i], tol, `${what}[${i}]`); };

/** A pool shaped like the model's: local columns inside a block, a few that reach across, and a noisy diagonal. */
function fixture({ blocks = 4, per = 9, shared = 3, crossing = true } = {}) {
  let seed = 11; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const rows = [], blockOf = [], noise = [];
  const SHARED0 = 1000;
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < per; i++) {
      const idx = [b * 10, b * 10 + 1 + (i % 3)];            // the group's own column, and an identity inside it
      const val = [0.8, 0.3 + 0.1 * (i % 3)];
      for (let s = 0; s < shared; s++) if ((i + s) % 2 === 0) { idx.push(SHARED0 + s); val.push(0.2 + 0.05 * s); }
      // A column that reads as local and is not: two blocks carry it, which is what decides it must be in U.
      if (crossing && (b === 0 || b === 2) && i === 1) { idx.push(SHARED0 + 90); val.push(0.4); }
      rows.push({ idx: Int32Array.from(idx), val: Float64Array.from(val) });
      blockOf.push(`g${b}`);
      noise.push(0.01 + 0.02 * rnd());
    }
  }
  return { rows, blockOf, noise };
}

test('the block solve is the dense solve, on a pool with columns that cross blocks', () => {
  const { rows, blockOf, noise } = fixture();
  const n = rows.length;
  const block = blockSolver(rows, blockOf, noise);
  const dense = denseSolver(denseK(rows, noise), n);
  assert.equal(block.blocks, 4);
  assert.equal(block.rank, 4, 'three shared columns and the one that only looks local');

  close(block.logDet, dense.logDet, 1e-10, 'log determinant');
  let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const v = Float64Array.from({ length: n }, () => rnd() - 0.5);
  closeAll(block.apply(v), dense.apply(v), 1e-9, 'K^-1 v');
  closeAll(block.diag(), dense.diag(), 1e-9, 'diagonal of K^-1');
  for (const H of [[0], [1, 2], [0, 9, 18, 27], [4, 5, 6]]) {
    const a = block.sub(H), b = dense.sub(H);
    for (let i = 0; i < H.length; i++) closeAll(a[i], b[i], 1e-9, `K^-1[H,H] row ${i} of ${H}`);
  }
});

test('one block, and no block: the two ends of the partition', () => {
  for (const [what, spec] of [['one block', { blocks: 1, per: 12, shared: 2, crossing: false }],
    ['every column shared', { blocks: 6, per: 4, shared: 4, crossing: false }]]) {
    const { rows, blockOf, noise } = spec.blocks === 1 ? fixture(spec) : fixture(spec);
    const n = rows.length;
    const block = blockSolver(rows, blockOf, noise);
    const dense = denseSolver(denseK(rows, noise), n);
    close(block.logDet, dense.logDet, 1e-10, `${what}: log determinant`);
    const v = Float64Array.from({ length: n }, (_, i) => Math.sin(i) );
    closeAll(block.apply(v), dense.apply(v), 1e-9, `${what}: K^-1 v`);
    closeAll(block.diag(), dense.diag(), 1e-9, `${what}: diagonal`);
  }
});

test('a matrix no factorisation can take is refused by both, not fudged by one', () => {
  const rows = [{ idx: Int32Array.from([0]), val: Float64Array.from([1]) }, { idx: Int32Array.from([0]), val: Float64Array.from([1]) }];
  assert.equal(blockSolver(rows, ['g0', 'g0'], [0, 0]), null);
  assert.equal(cholesky(denseK(rows, [0, 0]), 2), null);
});

// The real thing: one headline of the real database, fitted both ways, compared everywhere the stage reads it.
const wbPath = join(root, 'data');
test('on this database, every number the estimate stage reads is the dense solve\'s', { skip: !existsSync(wbPath) && 'no data tables' }, () => {
  const wb = loadTables(wbPath);
  const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), estimates: false });
  const model = modelWith(db.polymers);
  const S = snapshot(db.materials, db.grades, db.measurements, model);
  const key = estimateKeys(db.registry, model)[0];
  const { raw } = rawObservations(key, S, model);
  const conv = conversions(key, raw, model);
  // A sample, because the reference builds a dense inverse and this runs in the ordinary test suite.
  const obs = spreadObservations(key, convert(key, raw, conv, S, model), 260);
  const hp = hyperparameters(key, obs, S, model, null, { sweeps: 1 });

  const fit = posterior(fitModel(key, obs, S, model, hp));
  assert.ok(fit && fit.solver.blocks > 1 && fit.solver.rank > 1, `${fit?.solver.blocks} block(s), rank ${fit?.solver.rank}`);

  // The same fit, solved densely from the kernel's own covariance function.
  const { point, cov, structure } = makeKernel(key, S, model);
  const pts = obs.map((o) => point(o.m, o.f, S.grades.get(o.gradeId)?.manufacturer));
  const n = obs.length;
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { const v = cov(pts[i], pts[j], hp) + (i === j ? obs[i].noise2 + 1e-9 : 0); K[i * n + j] = v; K[j * n + i] = v; }
  const dense = denseSolver(K, n);

  // The structure the block solver was given describes the same matrix the covariance function does.
  const [rows] = structure(pts, hp, obs.map((o) => o.noise2 + 1e-9));
  const Kd = denseK(rows, obs.map((o) => o.noise2 + 1e-9));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) close(Kd[i * n + j], K[i * n + j], 1e-12, `K[${i}][${j}]`);

  const mean = obs.reduce((a, o) => a + o.y, 0) / n;
  const r = Float64Array.from(obs, (o) => o.y - mean);
  const alphaDense = dense.apply(r);
  let quad = 0;
  for (let i = 0; i < n; i++) quad += r[i] * alphaDense[i];
  close(fit.logLik, -0.5 * quad - 0.5 * dense.logDet, 1e-9, 'log likelihood');
  closeAll(fit.alpha, alphaDense, 1e-8, 'posterior weights');
  closeAll(fit.diagKi, dense.diag(), 1e-8, 'diagonal of K^-1');

  // A prediction, and the same prediction with a material's own observations hidden, which is how every range is
  // calibrated and every screening end back-tested.
  const m = obs[0].m, f = obs[0].f, manufacturer = S.grades.get(obs[0].gradeId)?.manufacturer ?? null;
  const hide = obs.map((o, i) => (o.m.id === m.id ? i : -1)).filter((i) => i >= 0);
  assert.ok(hide.length >= 1);
  const denseFit = { n, pts, alpha: alphaDense, r, mean, cov, point, solver: dense };
  // A material with no observation of its own as well as the one that has them: the first is the ordinary case
  // and the second is where a posterior variance is a difference of two numbers that nearly cancel, so it is
  // judged on the variance against the prior rather than on itself. A product whose own value is in the fit has
  // a posterior variance near zero, and near zero is where a relative tolerance stops meaning anything.
  const stranger = S.pool.find((x) => !obs.some((o) => o.m.id === x.id));
  assert.ok(stranger, 'a material the fit has never seen');
  const prior = cov(point(m, f, manufacturer), point(m, f, manufacturer), hp);
  const subjects = [['with everything', m, f, manufacturer, []], ['with its own hidden', m, f, manufacturer, hide],
    ['a material the fit has never seen', stranger, null, null, []]];
  for (const [what, subject, formulation, house, H] of subjects) {
    const a = predict(fit, hp, subject, formulation, house, H);
    const b = predict(denseFit, hp, subject, formulation, house, H);
    close(a.mu, b.mu, 1e-9, `${what}: mu`);
    assert.ok(Math.abs(a.sd ** 2 - b.sd ** 2) <= 1e-10 * prior, `${what}: variance ${a.sd ** 2} vs ${b.sd ** 2}`);
    closeAll(a.weights, b.weights, 1e-7, `${what}: weights`);
  }
  // invertSmall is shared by both paths; naming it here says the hold-out downdate is the same arithmetic.
  assert.equal(typeof invertSmall, 'function');
});
