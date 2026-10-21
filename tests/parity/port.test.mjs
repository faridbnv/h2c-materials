// WP-18: the engine port, module by module. Each ported module answers as the old one on its own exports, on real data and on
// seeded awkward inputs, in the places the P-engine surfaces (engine, ties, links) never reach: they ask the engine one
// scenario at a time and do not call search, coverage or pareto at all. The label proof is P-erase (remake/p-erase.json,
// tests/remake/ratchet-and-erase.test.mjs); this file is the behavioural one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PORTABLE, PORT_ENV, WIRED, activePorts, importStaged, stageEngine } from '@atlas/engine';
import { db } from './helpers.mjs';

const oldModules = await importStaged(stageEngine([]));
const old = (name) => oldModules.get(name);
const ported = async (name) => (await importStaged(stageEngine([name]))).get(name);

/** A small seeded generator (mulberry32): the same inputs on every machine. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('the port switch: the committed list, the environment override, and a refusal of a name that is not ported', () => {
  assert.deepEqual(activePorts({}), WIRED);
  assert.deepEqual(activePorts({ [PORT_ENV]: 'none' }), []);
  assert.deepEqual(activePorts({ [PORT_ENV]: 'all' }), PORTABLE);
  assert.deepEqual(activePorts({ [PORT_ENV]: 'ledger, pareto,ledger' }), ['ledger', 'pareto']);
  assert.throws(() => activePorts({ [PORT_ENV]: 'constraints' }), /not a module WP-18 ports/);
});

test('a staged engine: a ported module is the port\'s own text, an old one is the old file, each re-exported under the other extension', () => {
  const dir = stageEngine(['pareto']);
  const at = (...parts) => readFileSync(join(dir, ...parts), 'utf8');
  assert.equal(at('pareto.ts'), readFileSync(new URL('../../packages/engine/src/port/pareto.ts', import.meta.url), 'utf8'));
  assert.equal(at('pareto.js'), "export * from './pareto.ts';\n");
  assert.equal(at('constraints.js'), readFileSync(new URL('../../app/js/engine/constraints.js', import.meta.url), 'utf8'));
  assert.equal(at('constraints.ts'), "export * from './constraints.js';\n");
  assert.equal(readdirSync(dir).length, 21, 'ten modules under two extensions, and the package file that makes them modules');
});

test('every ported module exports exactly the names the old module does', async () => {
  for (const name of PORTABLE.filter((n) => existsSync(new URL(`../../packages/engine/src/port/${n}.ts`, import.meta.url)))) {
    const port = await ported(name);
    assert.deepEqual(Object.keys(port).sort(), Object.keys(old(name)).sort(), name);
  }
});

// --- pareto -----------------------------------------------------------------------------------------------------------------

test('pareto: front and order are the old module\'s, element for element, on seeded points with ties, duplicates and non-finite values', async () => {
  const pareto = await ported('pareto');
  const was = old('pareto');
  const next = seeded(18);
  const goals = ['min', 'max'];
  for (let round = 0; round < 400; round++) {
    const n = Math.floor(next() * 40);
    const points = Array.from({ length: n }, (_, i) => {
      const pick = next();
      // A coarse grid gives many exact ties; the rest are not finite or are repeated objects with equal values.
      const x = pick < 0.04 ? Number.NaN : pick < 0.07 ? Number.POSITIVE_INFINITY : Math.floor(next() * 6);
      const y = pick > 0.96 ? Number.NEGATIVE_INFINITY : pick > 0.93 ? Number.NaN : Math.floor(next() * 6);
      return { x, y, id: i };
    });
    for (const xGoal of goals) for (const yGoal of goals) {
      const got = pareto.paretoFront(points, xGoal, yGoal);
      const want = was.paretoFront(points, xGoal, yGoal);
      assert.equal(got.length, want.length);
      got.forEach((p, i) => assert.equal(p, want[i]));
      const sorted = pareto.sortFront(got, xGoal);
      const sortedWas = was.sortFront(want, xGoal);
      sorted.forEach((p, i) => assert.equal(p, sortedWas[i]));
    }
    assert.deepEqual(pareto.paretoFront(points).map((p) => p.id), was.paretoFront(points).map((p) => p.id));
  }
});

test('pareto: the real catalogue, density against tensile modulus and strength, on every goal pair', async () => {
  const pareto = await ported('pareto');
  const was = old('pareto');
  for (const y of ['tensileModulusXY', 'tensileStrengthXY', 'priceCADkg']) {
    const points = db.materials.filter((m) => !m.familyEntry).map((m) => ({ id: m.id, x: m.headline?.density?.value, y: m.headline?.[y]?.value }));
    for (const xGoal of ['min', 'max']) for (const yGoal of ['min', 'max']) {
      const got = pareto.paretoFront(points, xGoal, yGoal);
      assert.deepEqual(got.map((p) => p.id), was.paretoFront(points, xGoal, yGoal).map((p) => p.id), `${y} ${xGoal} ${yGoal}`);
      assert.deepEqual(pareto.sortFront(got, xGoal).map((p) => p.id), was.sortFront(was.paretoFront(points, xGoal, yGoal), xGoal).map((p) => p.id));
    }
  }
});
