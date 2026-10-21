// WP-18: the engine port, module by module. Each ported module answers as the old one on its own exports, on real data and on
// seeded awkward inputs, in the places the P-engine surfaces (engine, ties, links) never reach: they ask the engine one
// scenario at a time and do not call search, coverage or pareto at all. The label proof is P-erase (remake/p-erase.json,
// tests/remake/ratchet-and-erase.test.mjs); this file is the behavioural one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkDb } from '@atlas/data';
import { PORTABLE, PORT_DIR, PORT_ENV, WIRED, activePorts, importStaged, stageEngine } from '@atlas/engine';
import { runParity } from '../../packages/parity/src/compare.ts';
import { createNewAdapter } from '../../packages/parity/src/new-adapter.ts';
import { historicLinks } from '../../packages/parity/src/historic-links.ts';
import { linkUnits, runLinks } from '../../packages/parity/src/links.ts';
import { createOld, createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { corpus, db, root } from './helpers.mjs';

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

// --- ledger -----------------------------------------------------------------------------------------------------------------

/** Every ledger contribution list the compiled database holds, one per product, state and headline. */
const contributionLists = () => db.grades.flatMap((g) => (g.states ?? []).flatMap((s) => Object.values(s.bounds ?? {}).map((b) => b.by)));

test('ledger: numbers, intervals and every sentence are the old module\'s, on the real contributions and on seeded ties', async () => {
  const ledger = await ported('ledger');
  const was = old('ledger');
  const next = seeded(1801);

  for (const x of [0, -0, 1, -1.5, 0.1 + 0.2, 1 / 3, 2 / 3, 1e-7, 123456.789012345, 1e21, Number.MAX_VALUE, Number.MIN_VALUE]) assert.equal(Object.is(ledger.tidy(x), was.tidy(x)), true, String(x));
  const figs = [0, -0, 0.5, 0.0049, 9.995, 10.04, 99.95, 99.994, 100, 100.5, 999.5, 1000, 1234.5, 12345.678, -1234567.8, 1e-9, 1.15, 4.81149, 1e21, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let i = 0; i < 4000; i++) figs.push((next() - 0.5) * 10 ** Math.floor(next() * 9 - 3));
  for (const n of figs) assert.equal(Object.is(ledger.fig(n), was.fig(n)), true, String(n));

  const lists = contributionLists();
  assert.ok(lists.length > 1000, `the real ledger lists: ${lists.length}`);
  const units = ['GPa', 'MPa', '°C', 'kg/m³'];
  let intervals = 0, sentences = 0;
  for (const by of lists) {
    for (const evidence of [undefined, 'comparable', 'as-published']) {
      const options = evidence === undefined ? undefined : { evidence };
      const got = ledger.ledgerInterval(by, options);
      const want = was.ledgerInterval(by, options);
      assert.deepEqual(got, want);
      if (want) { assert.equal(got.loBy, want.loBy); assert.equal(got.hiBy, want.hiBy); }
      intervals++;
    }
    for (const b of by) {
      for (const evidence of [undefined, 'as-published']) assert.equal(ledger.usable(b, evidence), was.usable(b, evidence));
      for (const unit of units) {
        for (const words of [undefined, null, 'its HDT at 1.8 MPa, a harsher load']) {
          assert.equal(ledger.contributionWords(b, unit, words), was.contributionWords(b, unit, words));
          assert.equal(ledger.contributionSentence(b, unit, words), was.contributionSentence(b, unit, words));
          for (const verdict of ['pass', 'fail', 'line']) for (const operator of ['>=', '<=', '>', '<']) for (const asPrinted of [undefined, true, false]) {
            const c = { operator, value: 1234.5678 };
            const margin = verdict === 'fail' && next() < 0.5 ? undefined : { words: '±5 %' };
            const spec = { unit, words, verdict, c, margin, ...(asPrinted === undefined ? {} : { asPrinted }) };
            assert.equal(ledger.ledgerReason(b, spec), was.ledgerReason(b, spec));
            sentences++;
          }
        }
      }
    }
    const iv = was.ledgerInterval(by);
    if (iv) {
      for (const unit of units) assert.equal(ledger.knownNote(iv, { unit, c: { value: 12345.6789 } }), was.knownNote(iv, { unit, c: { value: 12345.6789 } }));
      if (iv.loBy && iv.hiBy) for (const unit of units) {
        const wordsOf = (b) => `${b.rule} words`;
        assert.equal(ledger.disagreeReason(iv.loBy, iv.hiBy, { unit, wordsOf }), was.disagreeReason(iv.loBy, iv.hiBy, { unit, wordsOf }));
      }
    }
  }
  assert.ok(intervals > 3000 && sentences > 10_000, `a real comparison: ${intervals} intervals, ${sentences} reasons`);

  // Ties: the first contribution in the list sets an end, an open end beats a closed one at the same value.
  for (let round = 0; round < 3000; round++) {
    const by = Array.from({ length: Math.floor(next() * 6) }, (_, i) => ({
      id: i, status: next() < 0.8 ? 'deciding' : 'reported', level: next() < 0.8 ? 'comparable' : 'as-published',
      lo: next() < 0.25 ? null : Math.floor(next() * 4), hi: next() < 0.25 ? null : Math.floor(next() * 4) + 2, openLow: next() < 0.5, openHigh: next() < 0.5,
    }));
    for (const evidence of ['comparable', 'as-published']) {
      const got = ledger.ledgerInterval(by, { evidence });
      const want = was.ledgerInterval(by, { evidence });
      assert.deepEqual(got, want);
      if (want) { assert.equal(got.loBy, want.loBy); assert.equal(got.hiBy, want.hiBy); }
    }
  }
  assert.equal(ledger.ledgerInterval(undefined), was.ledgerInterval(undefined));
  assert.equal(ledger.ledgerInterval(null), was.ledgerInterval(null));
  assert.equal(ledger.ledgerInterval([]), was.ledgerInterval([]));
});

test('ledger: a conversion or class limit by its identifier, from one table per database, as before', async () => {
  const ledger = await ported('ledger');
  const was = old('ledger');
  const ids = [...(db.conversions ?? []), ...(db.classLimits ?? [])].map((r) => r.id);
  assert.ok(ids.length > 5);
  for (const id of ['nope', '', 'constructor']) assert.equal(ledger.ledgerRow(db, id), was.ledgerRow(db, id));
  for (const id of ids) assert.deepEqual(ledger.ledgerRow(db, id), was.ledgerRow(db, id));
  assert.equal(ledger.ledgerRow(null, 'x'), null);
  assert.equal(ledger.ledgerRow(undefined, 'x'), null);
  assert.equal(ledger.ledgerRow({}, 'x'), null);
  const first = ledger.ledgerRow(db, ids[0]);
  assert.equal(ledger.ledgerRow(db, ids[0]), first, 'one table per database: the same row object comes back');
  assert.equal(ledger.requirementWords({ operator: '>=', value: 1500.25 }, 'kg/m³'), was.requirementWords({ operator: '>=', value: 1500.25 }, 'kg/m³'));
  for (const operator of ['>', '<', '<=', '>=', '==', undefined]) for (const value of [0, 1500, 12345.678901, -3]) {
    assert.equal(ledger.requirementWords({ operator, value }, 'MPa'), was.requirementWords({ operator, value }, 'MPa'), `${operator} ${value}`);
  }
});

// --- products ---------------------------------------------------------------------------------------------------------------

test('products: states, headlines, gates and views of every product of the catalogue are the old module\'s, in every service state', async () => {
  const products = await ported('products');
  const was = old('products');
  const measurementById = new Map(db.measurements.map((m) => [m.id, m]));
  const gradeToMaterial = new Map(db.materials.flatMap((m) => (m.gradeIds ?? []).map((id) => [id, m])));
  const contexts = [
    {}, { db, measurementById }, { db, measurementById, evidence: 'as-published' },
    { db, measurementById, anneal: true }, { db, measurementById, anneal: true, annealMaxC: 100 }, { db, measurementById, anneal: true, annealMaxC: 250, moisture: 'conditioned' },
    { db, measurementById, moisture: 'conditioned', evidence: 'as-published' }, { anneal: 'yes', annealMaxC: Number.NaN, moisture: 'wet' },
  ];
  assert.deepEqual(products.SHARE, was.SHARE);
  assert.deepEqual(products.EVIDENCE, was.EVIDENCE);
  for (const v of ['as-published', 'comparable', undefined, null, 'x', 1]) assert.equal(products.normalizeEvidence(v), was.normalizeEvidence(v));

  const byMaterial = products.productsByMaterial(db);
  const byMaterialWas = was.productsByMaterial(db);
  assert.deepEqual([...byMaterial.keys()], [...byMaterialWas.keys()]);
  for (const [id, list] of byMaterialWas) {
    assert.equal(byMaterial.get(id).length, list.length);
    list.forEach((g, i) => assert.equal(byMaterial.get(id)[i], g, `${id} keeps the material's product order`));
  }

  const ids = new Set(['', 'as-printed', 'conditioned', 'annealed:120:16', 'annealed:120:16+conditioned', 'annealed:x:x', 'annealed:x:16+conditioned', 'annealed:1:2:3', 'annealed:a:2', 'dry', 'conditioned+conditioned', 'as-printed+as-printed', '+', undefined, null, 5, {}]);
  let views = 0, headlines = 0;
  for (const g of db.grades) {
    const m = gradeToMaterial.get(g.id);
    for (const s of g.states ?? []) ids.add(s.id);
    assert.deepEqual(products.firstState(g), was.firstState(g));
    if (g.states?.length) assert.equal(products.firstState(g), g.states[0], 'the product\'s own first state, not a copy');
    for (const ctx of contexts) {
      assert.deepEqual(products.statePolicy(ctx), was.statePolicy(ctx));
      const a = products.scenarioStates(g, ctx);
      const b = was.scenarioStates(g, ctx);
      assert.deepEqual(a, b);
      a.forEach((st, i) => { if (g.states?.includes(b[i])) assert.equal(st, b[i], 'a state the product publishes comes back as itself'); });
    }
    if (!m) continue;
    for (const st of [null, ...(g.states ?? [])]) {
      for (const ctx of contexts.slice(1, 5)) {
        const a = products.productView(m, g, ctx, st);
        const b = was.productView(m, g, ctx, st);
        assert.ok(isDeepStrictEqual(a.headline, b.headline), `${g.id} ${st?.id} headline`);
        assert.ok(isDeepStrictEqual(a.gates, b.gates), `${g.id} gates`);
        assert.equal(a.product, b.product);
        assert.equal(a.buy, b.buy);
        if (st) { assert.equal(a.state, st); assert.equal(b.state, st); } else assert.deepEqual(a.state, b.state);
        assert.deepEqual(Object.keys(a), Object.keys(b));
        views++;
        for (const key of Object.keys(m.headline ?? {})) {
          const x = products.productHeadline(m, g, key, ctx, st);
          const y = was.productHeadline(m, g, key, ctx, st);
          assert.ok(isDeepStrictEqual(x, y), `${g.id} ${key}`);
          assert.ok(isDeepStrictEqual(products.valueStateOf(g, key, st, ctx), was.valueStateOf(g, key, st, ctx)));
          assert.ok(isDeepStrictEqual(products.stateBounds(g, key, st, ctx), was.stateBounds(g, key, st, ctx)));
          headlines++;
        }
      }
    }
    assert.deepEqual(products.productGates(m, g), was.productGates(m, g));
  }
  for (const id of ids) {
    assert.deepEqual(products.parseStateId(id), was.parseStateId(id), String(id));
    for (const g of db.grades.filter((_, i) => i % 7 === 0)) assert.deepEqual(products.stateOf(g, id), was.stateOf(g, id), `${g.id} ${String(id)}`);
  }
  for (const t of [null, undefined, { tempC: 120, hours: 16 }, { tempC: null, hours: null }, { tempC: 0, hours: 0 }]) for (const mo of [undefined, 'dry', 'conditioned', 'x']) assert.equal(products.stateId(t, mo), was.stateId(t, mo));
  for (const m of db.materials) {
    const grades = byMaterialWas.get(m.id);
    assert.deepEqual(products.hardenedShare(grades), was.hardenedShare(grades));
    assert.equal(products.hardenedWords(was.hardenedShare(grades)), was.hardenedWords(was.hardenedShare(grades)));
  }
  assert.deepEqual(products.hardenedShare(undefined), was.hardenedShare(undefined));
  assert.equal(products.hardenedWords(null), was.hardenedWords(null));
  assert.ok(views > 2000 && headlines > 20_000, `a real comparison: ${views} product views, ${headlines} product headlines`);
});

// --- the harness sees a fault in a port ------------------------------------------------------------------------------------

test('a fault planted in a ported module is caught by the new side of the parity harness, so the port is what runs', async () => {
  const cases = [...corpus.cases.filter((c) => c.group === 'template').slice(0, 10), ...corpus.cases.filter((c) => c.group === 'census').slice(0, 8)];
  const typed = checkDb(structuredClone(db));
  assert.ok(typed.ok);
  const faults = [
    // The service state a product is judged in: the wrong moisture is kept.
    ['products', "(s.moisture ?? 'dry') === policy.moisture", "(s.moisture ?? 'dry') !== policy.moisture"],
    // The ledger's words: a number from 100 up is printed to the nearest unit only from 1,000.
    ['ledger', 'const s = a >= 100 ? String(Math.round(n))', 'const s = a >= 1000 ? String(Math.round(n))'],
    // The ledger's rule for which contribution may decide: the wrong half of them.
    ['ledger', "b.status === 'deciding' && (b.level", "b.status !== 'deciding' && (b.level"],
  ];
  for (const [name, find, replace] of faults) {
    const dir = mkdtempSync(join(tmpdir(), 'h2c-port-fault-'));
    try {
      const source = readFileSync(join(PORT_DIR, `${name}.ts`), 'utf8');
      assert.equal(source.split(find).length - 1, 1, `the fault for ${name} finds its line`);
      writeFileSync(join(dir, `${name}.ts`), source.replace(find, replace));
      const engineDir = stageEngine([name], { portDir: dir });
      const faulty = await runParity({ corpusName: 'v0', cases, before: await createOld(structuredClone(db)), after: await createNewAdapter({ db: checkDb(structuredClone(db)).db, engineDir }) });
      assert.equal(faulty.status, 'differs', `${name}: a fault in the port must show`);
      const clean = await runParity({ corpusName: 'v0', cases, before: await createOld(structuredClone(db)), after: await createNewAdapter({ db: checkDb(structuredClone(db)).db, ports: [name] }) });
      assert.equal(clean.status, 'zero', `${name}: the port itself shows no difference`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

// --- indices ----------------------------------------------------------------------------------------------------------------

test('indices: the table, axes, values, lines and rankings are the old module\'s, on the real catalogue', async () => {
  const indices = await ported('indices');
  const was = old('indices');
  for (const name of ['INDICES', 'INDEX_UNITS', 'COST_AXIS', 'STRENGTH_CAVEAT', 'ANISOTROPY_CAVEAT', 'PRICE_CAVEAT']) assert.deepEqual(indices[name], was[name], name);
  const materials = db.materials.filter((m) => !m.familyEntry);
  assert.equal(indices.priceCaveat(materials), was.priceCaveat(materials));
  assert.equal(indices.priceCaveat([]), was.priceCaveat([]));

  const keys = [...db.registry.headlines.map((h) => h.key), was.COST_AXIS, 'nope'];
  for (const [i, index] of was.INDICES.entries()) {
    assert.deepEqual(indices.INDICES[i], index);
    assert.deepEqual(indices.indexAxes(indices.INDICES[i]), was.indexAxes(index));
    assert.deepEqual(indices.indexDisplay(indices.INDICES[i], 0.0123), was.indexDisplay(index, 0.0123));
    assert.deepEqual(indices.indexDisplay(index, null), was.indexDisplay(index, null));
    assert.equal(indices.indexById(index.id), indices.INDICES[i]);
    for (const x of keys) for (const y of keys) assert.equal(indices.indexOrientation(index, x, y), was.indexOrientation(index, x, y));
    for (const orientation of [undefined, 'direct', 'swapped']) for (const M of [0.001, 0.5, 7, 123.456]) {
      assert.deepEqual(indices.selectionLine(index, M, [100, 2000], orientation), was.selectionLine(index, M, [100, 2000], orientation));
    }
    const values = materials.map((m) => indices.indexValue(m, index));
    assert.deepEqual(values, materials.map((m) => was.indexValue(m, index)));
    assert.ok(values.some((v) => v !== null && v > 0), `${index.id} ranks some material`);
    for (const M of [0.0001, 0.001, 0.003, 0.01, 1]) assert.equal(indices.countAbove(materials, index, M), was.countAbove(materials, index, M));
    const ranked = indices.rankByIndex(materials, index);
    const rankedWas = was.rankByIndex(materials, index);
    assert.equal(ranked.length, rankedWas.length);
    ranked.forEach((r, k) => { assert.equal(r.material, rankedWas[k].material); assert.equal(r.value, rankedWas[k].value); });
  }
  assert.deepEqual(indices.indexDisplay(undefined, 3), was.indexDisplay(undefined, 3));
  assert.equal(indices.indexById('nope'), null);
  assert.equal(indices.indexOrientation(null, 'a', 'b'), null);
});

test('indices: the ranking of selected rows by every index, with the products they pass in, is the old module\'s', async () => {
  const indices = await ported('indices');
  const was = old('indices');
  const oldEngine = { constraints: old('constraints'), products: old('products'), scenario: old('scenario') };
  const group = (rows) => rows.reduce((m, r) => m.set(r.materialId, [...(m.get(r.materialId) ?? []), r]), new Map());
  const cases = [...corpus.cases.filter((c) => c.group === 'template').slice(0, 8), ...corpus.cases.filter((c) => c.group === 'census').slice(0, 6)];
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  let ranked = 0;
  for (const c of cases) {
    const q = c.scenario;
    const ctx = {
      db, measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
      coverageByMaterial: group(db.coverage), productsByMaterial: oldEngine.products.productsByMaterial(db), unknownPolicy: oldEngine.constraints.normalizePolicy(q.unknownPolicy),
      useEstimates: false, showEstimates: false, evidence: q.evidence, anneal: q.anneal === true, annealMaxC: q.annealMaxC ?? null, moisture: q.moisture === 'conditioned' ? 'conditioned' : 'dry',
    };
    const candidates = db.materials.filter((m) => !m.familyEntry).map((m) => oldEngine.scenario.applyAssumptions(m, [], units).material);
    const selection = oldEngine.constraints.runSelection(candidates, q.constraints, ctx);
    const rows = selection.evaluations.map((evaluation) => ({ material: candidates.find((m) => m.id === evaluation.materialId), evaluation }));
    for (const index of was.INDICES) {
      const got = indices.rankingFor(rows, ctx, index);
      const want = was.rankingFor(rows, ctx, index);
      assert.deepEqual(got, want, `${c.id} ${index.id}`);
      assert.deepEqual([...got.byMaterial], [...want.byMaterial]);
      ranked += got.order.length;
    }
    assert.equal(indices.rankingFor(rows, ctx, null), null);
    assert.equal(indices.rankingFor(rows, {}, was.INDICES[0]), null);
  }
  assert.ok(ranked > 200, `a real comparison: ${ranked} ranked places`);
});

// --- scenario ---------------------------------------------------------------------------------------------------------------

/** What a decoder did with an input: its answer without the clock it read, or the words it refused with. */
const outcome = (f) => {
  try {
    const r = f();
    if (r === null) return { opened: null };
    const { created, ...scenario } = r.scenario;
    assert.equal(typeof created, 'string');
    return { opened: { scenario, warnings: r.warnings } };
  } catch (err) {
    assert.ok(err instanceof Error);
    return { refused: `${err.constructor.name}: ${err.message}` };
  }
};

test('scenario: the constants, the defaults, serialize and the hash are the old module\'s', async () => {
  const scenario = await ported('scenario');
  const was = old('scenario');
  for (const name of ['SCENARIO_VERSION', 'WORKSPACE_VIEWS', 'DECISIONS_MAX', 'SHORTLIST_MAX']) assert.deepEqual(scenario[name], was[name], name);
  for (const meta of [undefined, null, {}, db.meta, { release: { id: 'abc' }, snapshot: '2026-01-01', build: 'b' }]) {
    const { created, ...a } = scenario.newScenario(meta);
    const { created: c2, ...b } = was.newScenario(meta);
    assert.deepEqual(a, b);
    assert.match(created, /^\d{4}-\d\d-\d\dT/);
    assert.match(c2, /^\d{4}-\d\d-\d\dT/);
  }
  const questions = corpus.cases.filter((c) => c.group === 'template' || c.group === 'census').slice(0, 40).map((c) => c.scenario);
  for (const q of questions) {
    const s = { ...was.newScenario(db.meta), constraints: q.constraints, unknownPolicy: q.unknownPolicy, evidence: q.evidence, moisture: q.moisture, anneal: q.anneal, annealMaxC: q.annealMaxC, created: 'fixed' };
    assert.equal(scenario.serialize(s), was.serialize(s));
    assert.equal(scenario.toHash(s), was.toHash(s));
    assert.deepEqual(outcome(() => scenario.fromHash(was.toHash(s), db.meta)), outcome(() => was.fromHash(was.toHash(s), db.meta)));
    assert.deepEqual(outcome(() => scenario.deserialize(was.serialize(s), db.meta)), outcome(() => was.deserialize(was.serialize(s), db.meta)));
  }
});

test('scenario: the historic links and the saved files of seeded edits are read, warned about and refused as the old module does', async () => {
  const scenario = await ported('scenario');
  const was = old('scenario');
  const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);
  const options = {
    materialIds: new Set(db.materials.map((m) => m.id)), headlineKeys: new Set(db.registry.headlines.filter((h) => !h.drawerOnly).map((h) => h.key)),
    gradeIds: new Set(db.grades.map((g) => g.id)),
  };
  for (const l of historicLinks(TEMPLATES)) {
    const text = l.text ?? readFileSync(join(root, l.read.path), 'utf8');
    for (const o of [undefined, options]) {
      const read = l.kind === 'hash' ? (m) => m.fromHash(text, db.meta, o) : (m) => m.deserialize(text, db.meta, o);
      assert.deepEqual(outcome(() => read(scenario)), outcome(() => read(was)), l.id);
    }
  }
  assert.equal(scenario.fromHash('', db.meta), null);
  assert.equal(scenario.fromHash(undefined, db.meta), null);

  const next = seeded(1802);
  const pick = (xs) => xs[Math.floor(next() * xs.length)];
  const weird = [null, 0, 1, 2, 3, -1, 1.5, 1e9, '', 'x', 'table', 'ashby', 'exploration', 'strict', 'conditioned', 'as-published', true, false, [], [1], ['M001', 'nope', 7, 'M001'], {}, { a: 1 }, 'M001', 'G001-01'];
  const base = { ...was.newScenario(db.meta), created: 'fixed' };
  const keys = [...Object.keys(base), 'stages', 'unknownField'];
  const plotKeys = [...Object.keys(base.plot), 'detail', 'pointLevel', 'comparability', 'index', 'indexSlider', 'parallelAxes'];
  const constraint = () => pick([
    { kind: 'numeric', property: pick(['tensileModulusXY', 'density', 'noSuchHeadline', 3]), operator: pick(['>=', '<=', '>', '<', '==']), value: pick([0, 1, 100, Number.NaN, 'x', null]), mandatory: pick([true, false, undefined]) },
    { kind: 'gate', gate: pick(['nozzle', 'bed', 'warp', 5]) }, { kind: 'facet', facet: pick(['filler', 'esd', 'wibble']), in: pick([['a'], [], 'a']) },
    { kind: 'environment', category: pick(['Alcohols', 'nothing', 7]), require: ['resistant', 'limited'] }, { kind: 'evidence' }, { kind: 'wibble' }, null, 5, 'x', [], { kind: pick([1, null]) },
  ]);
  let refused = 0, opened = 0, warned = 0;
  for (let round = 0; round < 6000; round++) {
    const input = structuredClone(base);
    for (let k = 0, n = 1 + Math.floor(next() * 4); k < n; k++) {
      const r = next();
      if (r < 0.45) input[pick(keys)] = pick(weird);
      else if (r < 0.6) delete input[pick(keys)];
      else if (r < 0.75) input.plot = { ...input.plot, [pick(plotKeys)]: pick([...weird, { failed: true, front: 1, unresolved: false }, ['a', 'b']]) };
      else if (r < 0.85) input.constraints = Array.from({ length: Math.floor(next() * 5) }, constraint);
      else if (r < 0.9) input.assumptions = Array.from({ length: Math.floor(next() * 3) }, () => pick([{ materialId: pick(['*', 'M001', 5]), property: pick(['density', 3]), value: pick([1, 'x', null]), unit: 'u' }, null, 'x']));
      else if (r < 0.95) input.decisions = Array.from({ length: Math.floor(next() * 14) }, (_, i) => pick([{ gradeId: pick(['G001-01', 'nope', 5]), stateId: pick(['as-printed', '', null, 4]), tests: pick([[{ date: 'd', result: ' ok ', extra: 1 }], 'x', [5, null], undefined]), note: pick(['n', '  ', null]) }, null, { gradeId: `G${i}` }]));
      else input.stages = pick([[{ index: 'tie-stiffness', cutoff: 0.5 }, { index: 'x', cutoff: -1 }, 3], 'x', [], null]);
    }
    if (next() < 0.3) input.version = pick([undefined, 1, 2, 3, '2', null]);
    for (const o of [undefined, options]) {
      const got = outcome(() => scenario.validateScenario(structuredClone(input), db.meta, o));
      const want = outcome(() => was.validateScenario(structuredClone(input), db.meta, o));
      assert.deepEqual(got, want, JSON.stringify(input).slice(0, 400));
      if (want.refused) refused++; else { opened++; if (want.opened.warnings.length) warned++; }
    }
    const text = JSON.stringify(input);
    assert.deepEqual(outcome(() => scenario.deserialize(text, db.meta, options)), outcome(() => was.deserialize(text, db.meta, options)));
    const hash = encodeURIComponent(JSON.stringify({ x: pick([2, 1, 3, undefined]), c: input.constraints, u: input.unknownPolicy, s: input.shortlist, p: input.plot, h: pick([[['G001-01', null, null, null]], 5, undefined]), n: pick([true, 120, undefined]), g: pick([[['tie-stiffness', 0.4]], undefined]), v: pick(['as-published', undefined]) }));
    assert.deepEqual(outcome(() => scenario.fromHash(hash, db.meta, options)), outcome(() => was.fromHash(hash, db.meta, options)));
  }
  for (const bad of ['%7B', '[]', '"x"', 'null', '%E0%A4%A', '{"x":2', 'true']) {
    assert.deepEqual(outcome(() => scenario.fromHash(bad, db.meta)), outcome(() => was.fromHash(bad, db.meta)), bad);
    assert.deepEqual(outcome(() => scenario.deserialize(bad, db.meta)), outcome(() => was.deserialize(bad, db.meta)), bad);
  }
  assert.ok(refused > 300 && opened > 3000 && warned > 500, `the edits reach both outcomes: ${opened} opened (${warned} with warnings), ${refused} refused`);
});

test('scenario: an assumption stands in for a missing value, never over a known one, a non-applicable one or another material\'s', async () => {
  const scenario = await ported('scenario');
  const was = old('scenario');
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  const keys = db.registry.headlines.map((h) => h.key);
  let standIns = 0;
  for (const m of db.materials) {
    const sets = [
      [], [{ materialId: 'other', property: 'density', value: 1 }],
      ...keys.map((property) => [{ materialId: m.id, property, value: 42.5 }]),
      [{ materialId: '*', property: keys[0], value: 7, unit: 'u', note: 'n' }, { materialId: m.id, property: keys[1], value: 8 }, { materialId: '*', property: 'noSuchHeadline', value: 9 }],
    ];
    for (const assumptions of sets) {
      for (const u of [undefined, units]) {
        const got = scenario.applyAssumptions(m, assumptions, u);
        const want = was.applyAssumptions(m, assumptions, u);
        assert.deepEqual(got, want);
        assert.equal(got.material === m, want.material === m, 'the same material back exactly when nothing applied');
        standIns += want.assumed.length;
      }
    }
  }
  assert.ok(standIns > 100, `assumptions that applied: ${standIns}`);
});

test('scenario: the historic-link corpus opens and replays with zero differences through the wrapper on the ported scenario', async () => {
  const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);
  const units = linkUnits(historicLinks(TEMPLATES), []);
  const run = await runLinks({ units, before: await createOld(readDb()), after: await createNewAdapter({ db: checkDb(readDb()).db, ports: ['scenario'] }) });
  assert.equal(run.openings.status, 'zero', JSON.stringify(run.openings.differences?.slice(0, 3)));
  assert.equal(run.openings.unitsCompared, units.length);
  assert.equal(run.replay.status, 'zero');
  assert.ok(run.replayCases >= 10);
  // The old adapter over a staged engine with the port in (its own reading of the engine, not the wrapper's) says the same.
  const staged = await createOldAdapter({ name: 'old API on the ported scenario', db: readDb(), engineDir: stageEngine(['scenario']) });
  const again = await runLinks({ units, before: await createOld(readDb()), after: staged });
  assert.equal(again.openings.status, 'zero');
  assert.equal(again.replay.status, 'zero');
});
