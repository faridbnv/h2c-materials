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

// --- filler -----------------------------------------------------------------------------------------------------------------

test('filler: the class of every material of the catalogue, and of awkward modifiers and facets, is the old module\'s', async () => {
  const filler = await ported('filler');
  const was = old('filler');
  const sources = [...db.materials, null, undefined, {}, { facets: null }, { facets: { reinforcement: null } }, { facets: { reinforcement: {} } }];
  for (const modifier of [undefined, null, '', '  ', 'undisclosed', 'Undisclosed filler', 'Not published', 'not applicable', 'Aramid fibre', ' PTFE 10 % ', 'Metal powder (Cu)', 0, 12, '--', 'Glass fibre']) {
    for (const value of [undefined, null, 'undisclosed', 'carbon-fibre', 'unfilled', 'esd']) {
      sources.push({ modifier, facets: { reinforcement: { value } } });
    }
  }
  for (const m of sources) assert.equal(filler.fillerOf(m), was.fillerOf(m), JSON.stringify(m)?.slice(0, 80));
  const classes = new Set([...db.materials.map((m) => was.fillerOf(m)), null, undefined, '', 'undisclosed', ...was.FILLER_CLASSES, 'aramid-fibre']);
  for (const c of classes) assert.equal(filler.isNamedFiller(c), was.isNamedFiller(c), String(c));
  assert.deepEqual(filler.FILLER_CLASSES, was.FILLER_CLASSES);
  assert.equal(filler.UNDISCLOSED, was.UNDISCLOSED);
});

// --- search -----------------------------------------------------------------------------------------------------------------

test('search: every material against every word, prefix and pair of words it can be found by, with and without its products', async () => {
  const search = await ported('search');
  const was = old('search');
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const productsOf = (m) => (m.gradeIds ?? []).map((id) => gradeById.get(id)).filter(Boolean);
  const queries = new Set(['', '  ', 'pla', 'PLA', 'tpu 95', '95', 'pa6 cf', 'cf', 'support', 'polymaker', 'Prusament', 'polylite', 'x y z', 'no-such-word', '-', 'pla+']);
  for (const m of db.materials) {
    const found = was.searchableWords(m, productsOf(m));
    for (const w of found.slice(0, 40)) {
      queries.add(w);
      queries.add(w.slice(0, Math.max(1, w.length - 2)));
    }
    queries.add(`${found[0] ?? ''} ${found.at(-1) ?? ''}`);
  }
  let compared = 0;
  for (const m of db.materials) {
    const products = productsOf(m);
    for (const q of queries) {
      assert.equal(search.matchesQuery(m, q, products), was.matchesQuery(m, q, products), `${m.id} ${q}`);
      assert.equal(search.matchesQuery(m, q), was.matchesQuery(m, q), `${m.id} ${q} (no products)`);
      const got = search.matchingProducts(m, q, products);
      const want = was.matchingProducts(m, q, products);
      assert.equal(got.length, want.length, `${m.id} ${q}`);
      got.forEach((g, i) => assert.equal(g, want[i]));
      compared++;
    }
    assert.deepEqual(search.searchableWords(m, products), was.searchableWords(m, products));
  }
  for (const v of [undefined, null, 0, 12.5, 'Ünï-cødé', 'a/b-c_d', {}, ['a', 'b'], true]) assert.deepEqual(search.words(v), was.words(v));
  for (const q of [undefined, null, 5, ['pla']]) assert.equal(search.matchesQuery({ name: 'PLA' }, q), was.matchesQuery({ name: 'PLA' }, q));
  assert.ok(compared > 100_000, `a real comparison: ${compared} (material, query) pairs`);
});

// --- coverage ---------------------------------------------------------------------------------------------------------------

test('coverage: the matrix, completeness, evidence summary and availability of the real catalogue are the old module\'s', async () => {
  const coverage = await ported('coverage');
  const was = old('coverage');
  assert.deepEqual(coverage.COVERAGE_STATUS_RANK, was.COVERAGE_STATUS_RANK);
  assert.deepEqual(coverage.COVERAGE_DOMAINS, was.COVERAGE_DOMAINS);
  assert.deepEqual(coverage.coverageMatrix(db.materials, db.coverage), was.coverageMatrix(db.materials, db.coverage));
  assert.deepEqual(coverage.coverageMatrix(db.materials.slice(5, 9), db.coverage, ['Thermal', 'Nowhere']), was.coverageMatrix(db.materials.slice(5, 9), db.coverage, ['Thermal', 'Nowhere']));
  // Equal statuses and statuses the rank does not know: the first of the worst wins.
  const m = [{ id: 'M1', name: 'one' }, { id: 'M2', name: 'two' }];
  const records = [
    { materialId: 'M1', domain: 'Thermal', status: 'Resolved', id: 'a' }, { materialId: 'M1', domain: 'Thermal', status: 'Resolved', id: 'b' },
    { materialId: 'M2', domain: 'Thermal', status: 'Odd', id: 'c' }, { materialId: 'M2', domain: 'Thermal', status: 'Strange', id: 'd' },
    { materialId: 'M2', domain: 'Thermal', status: 'Gap', id: 'e' }, { materialId: 'M2', domain: 'Mechanical', status: 'Gap', id: 'f' },
  ];
  assert.deepEqual(coverage.coverageMatrix(m, records), was.coverageMatrix(m, records));
  assert.equal(coverage.coverageMatrix(m, records)[0].cells.find((c) => c.domain === 'Thermal').records[0], records[0]);

  const keys = db.registry.headlines.map((h) => h.key);
  const everyone = db.materials.filter((m) => !m.familyEntry);
  for (const material of db.materials) {
    assert.deepEqual(coverage.headlineCompleteness(material, keys), was.headlineCompleteness(material, keys), material.id);
    assert.deepEqual(coverage.evidenceSummary(material, db), was.evidenceSummary(material, db), material.id);
  }
  for (const key of [...keys, 'noSuchKey']) {
    for (const set of [db.materials, everyone, everyone.slice(10, 40), []]) assert.deepEqual(coverage.availability(set, key), was.availability(set, key), key);
  }
  // A headline measured at an unstated load: the dead read still counts (OPEN-PROBLEMS: loadStated is in no headline shape).
  const stated = [{ headline: { k: { known: true, loadStated: false } } }, { headline: { k: { known: true, loadStated: true } } }, { headline: { k: { known: true, notApplicable: { rule: 'r' } } } }, {}];
  assert.deepEqual(coverage.availability(stated, 'k'), was.availability(stated, 'k'));
  assert.equal(coverage.availability(stated, 'k').caveats, 1);
});
