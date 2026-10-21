// WP-11: the typed engine wrapper (packages/engine). Parity (tests/parity/new-adapter.test.mjs) holds its answers equal to the
// old engine's; these tests hold the contract it adds: branded IDs, requirements by ID, reason codes beside unchanged text,
// RowResult rows, one createContext, and loud refusals. Needs dist/db.json (npm run build).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDb } from '@atlas/data';
import { isGradeId, isMaterialId } from '@atlas/domain';
import { BoundaryError, createContext, defaultEngine, runEngine, scenarioFrom } from '@atlas/engine';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import { REPO_ROOT } from '../../packages/engine/src/old-engine.ts';

const typedDb = () => {
  const checked = checkDb(JSON.parse(readFileSync(join(REPO_ROOT, 'dist', 'db.json'), 'utf8')));
  assert.ok(checked.ok, 'dist/db.json must satisfy the typed contract (run npm run build)');
  return checked.db;
};
const db = typedDb();
const corpus = loadCorpus();
const byId = (id) => corpus.cases.find((c) => c.id === id);
const ask = (id, options) => {
  const scenario = scenarioFrom(structuredClone(byId(id).scenario), db.meta);
  return { scenario, output: createContext(db, scenario, options).run() };
};
const STRICT = 'template/outdoor-structural-part/strict';
const EXPLORE = 'template/outdoor-structural-part/explore-estimates-anneal-conditioned';

test('createContext(db, scenario).run() answers every candidate: a material row, then a row for each of its products', () => {
  const { output } = ask(EXPLORE);
  const candidates = db.materials.filter((m) => !m.familyEntry);
  assert.equal(output.evaluations.length, candidates.length);
  assert.equal(output.counts.total, candidates.length);
  assert.equal(output.release, db.meta.release.id);
  let at = 0;
  for (const e of output.evaluations) {
    const material = output.rows[at++];
    assert.equal(material.materialId, e.materialId);
    assert.equal(material.productId, undefined);
    assert.equal(material.stateId, undefined);
    for (const p of e.products ?? []) {
      const row = output.rows[at++];
      assert.deepEqual([row.materialId, row.productId, row.stateId], [e.materialId, p.gradeId, p.state.id]);
    }
  }
  assert.equal(at, output.rows.length);
});

test('IDs at the boundary are the schema\'s: materials, grades, constraints (by position), and the engine\'s own treatment', () => {
  const { scenario, output } = ask(EXPLORE);
  assert.deepEqual(output.constraintIds, scenario.constraints.map((_, i) => `c${i}`));
  const known = new Set([...output.constraintIds, 'treatment']);
  for (const row of output.rows) {
    assert.ok(isMaterialId(row.materialId));
    if (row.productId !== undefined) assert.ok(isGradeId(row.productId));
    for (const r of row.requirements) assert.ok(known.has(r.constraintId), `${r.criterion} names ${r.constraintId}`);
  }
  // A result names its requirement by ID, and the body beside the ID is that requirement.
  for (const e of output.evaluations) {
    for (const r of e.results) {
      if (r.constraintId === 'treatment') assert.equal(r.constraint.kind, 'treatment');
      else assert.deepEqual(r.constraint, scenario.constraints[output.constraintIds.indexOf(r.constraintId)]);
    }
  }
});

test('requirements are matched by ID after a structured clone, where object identity is gone', () => {
  const { scenario, output } = ask(EXPLORE);
  const clone = structuredClone(output);
  assert.deepStrictEqual(clone, output, 'the whole answer is plain data');
  const sample = clone.evaluations.flatMap((e) => e.results).find((r) => r.constraintId === 'c0');
  assert.notStrictEqual(sample.constraint, scenario.constraints[0], 'the clone holds a copy, not the scenario\'s own object');
  assert.deepEqual(sample.constraint, scenario.constraints[0]);
  assert.equal(clone.constraintIds.indexOf(sample.constraintId), 0);
});

// The sentence each code names (reason-codes.ts comments); a code on a sentence it does not name is a wrong code.
const STEMS = {
  'scope.within-h2c': /^Within H2C capability$/,
  'scope.beyond-h2c': /^Beyond H2C capability: more heat than the H2C gives$/,
  'nozzle.hardened-available': /^A hardened nozzle prints abrasive and non-abrasive filament$/,
  'price.listed': /, seen \S+$/,
  'price.out-of-stock': /lists it, but no sampled offer of (this product|this material) was in stock on /,
  'price.not-listed': /^No sampled Canadian retailer listed (this product|this material) when sampled$/,
  'drying.stated': /^Drying (schedule published|optional|not needed)/,
  'drying.no-statement': /^No drying statement in the sampled sources$/,
  'facet.not-recorded': /^Facet not recorded$/,
  'facet.filler-recorded': /^Recorded as /,
  'facet.recorded': /^Recorded as /,
  'facet.role': /^A (support or interface|build) material$/,
  'evidence.no-criterion': /^No evidence criterion set$/,
  'evidence.checks': /./,
  'treatment.as-printed': /^Used as printed$/,
  'treatment.schedule-incomplete': /^Its values in this state come from bars annealed /,
  'treatment.annealing-allowed': /^Needs annealing /,
};

test('reason codes sit beside the unchanged text, and each names the sentence it sits on', () => {
  const ids = [...corpus.cases.filter((c) => c.group === 'template').map((c) => c.id), ...corpus.cases.filter((c) => c.group === 'random').slice(0, 120).map((c) => c.id)];
  const seen = new Map();
  let results = 0, coded = 0;
  for (const id of ids) {
    for (const row of ask(id).output.rows) {
      assert.equal(row.reasons.length, row.requirements.length);
      row.requirements.forEach((r, i) => {
        results++;
        assert.equal(row.reasons[i].text, r.reason, 'the entry carries the engine\'s text, word for word');
        assert.equal(row.reasons[i].code, r.reasonCode);
        assert.deepEqual(row.reasons[i].params, {});
        if (r.reasonCode === undefined) return;
        coded++;
        seen.set(r.reasonCode, (seen.get(r.reasonCode) ?? 0) + 1);
        assert.ok(STEMS[r.reasonCode], `no stem for ${r.reasonCode}`);
        assert.match(r.reason, STEMS[r.reasonCode], `${r.reasonCode} on "${r.reason}"`);
      });
    }
  }
  assert.ok(seen.size >= 10, `only ${seen.size} different codes were exercised: ${[...seen.keys()].join(', ')}`);
  assert.ok(coded > 0 && coded < results, 'some results carry a code (structure settles it) and the numeric ones do not yet (WP-19)');
});

test('a print-gate or numeric result whose sentence has several sources gets no code: it is never guessed from the text', () => {
  const { output } = ask(EXPLORE);
  const numeric = output.rows.flatMap((r) => r.requirements).filter((r) => r.constraint.kind === 'numeric');
  assert.ok(numeric.length > 0);
  assert.ok(numeric.every((r) => r.reasonCode === undefined));
  const printer = output.rows.flatMap((r) => r.requirements).filter((r) => r.constraint.kind === 'gate' && ['nozzle', 'bed', 'chamber'].includes(r.constraint.gate));
  assert.ok(printer.every((r) => r.reasonCode === undefined));
});

test('RowResult: counts, Best and listing places agree with the evaluation they come from', () => {
  for (const id of [STRICT, EXPLORE]) {
    const { output } = ask(id);
    const materialRows = output.rows.filter((r) => r.productId === undefined);
    const places = materialRows.map((r) => r.listingRank).sort((a, b) => a - b);
    assert.deepEqual(places, places.map((_, i) => i + 1), `${id}: listing places are 1..N once each`);
    for (const e of output.evaluations) {
      const row = materialRows.find((r) => r.materialId === e.materialId);
      assert.equal(row.best, e.gradeId);
      assert.deepEqual(row.counts, e.counts ? { pass: e.counts.pass, fail: e.counts.fail, untested: e.counts.untested } : { pass: 0, fail: 0, untested: 0 });
      for (const p of e.products ?? []) {
        const prow = output.rows.find((r) => r.productId === p.gradeId);
        assert.equal(prow.listingRank, row.listingRank, 'a product sits at its material\'s place');
        assert.equal(prow.counts.pass + prow.counts.fail + prow.counts.untested, p.results.length);
      }
    }
    if (id === STRICT) assert.deepEqual(materialRows.map((r) => r.materialId), output.evaluations.map((e) => e.materialId), 'Strict lists in the engine\'s order');
  }
});

test('a material with no product on record is judged on its own headline and says so', () => {
  const { output } = ask(EXPLORE);
  const none = output.evaluations.filter((e) => e.counts === null);
  assert.ok(none.length > 0, 'the data holds materials with no product on record');
  for (const e of none) assert.deepEqual([e.products, e.share], [[], null]);
});

test('the wrapper never edits the database it is given', () => {
  const before = JSON.stringify(db);
  ask(EXPLORE);
  ask(STRICT);
  assert.equal(JSON.stringify(db), before);
});

test('assumptions are the scenario\'s: applied to copies of the materials, exactly as the page applies them', () => {
  const base = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const scenario = { ...base, assumptions: [{ materialId: '*', property: 'tensileStrengthXY', value: 500 }], constraints: [{ kind: 'numeric', property: 'tensileStrengthXY', operator: '>=', value: 400, mandatory: true }] };
  const plain = createContext(db, { ...scenario, assumptions: [] }).run();
  const assumed = createContext(db, scenario).run();
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  const E = defaultEngine;
  const candidates = db.materials.filter((m) => !m.familyEntry).map((m) => E.scenario.applyAssumptions(m, scenario.assumptions, units).material);
  const direct = E.constraints.runSelection(candidates, scenario.constraints, { ...assumedContext() });
  assert.deepEqual(assumed.evaluations.map((e) => e.verdict), direct.evaluations.map((e) => e.verdict));
  assert.notDeepEqual(assumed.evaluations.map((e) => e.verdict), plain.evaluations.map((e) => e.verdict), 'the assumption must have moved something');
  assert.equal(JSON.stringify(db.materials.find((m) => !m.familyEntry).headline.tensileStrengthXY).includes('"assumption":true'), false, 'the database itself is untouched');

  function assumedContext() {
    const group = (rows) => { const m = new Map(); for (const r of rows) (m.get(r.materialId) ?? m.set(r.materialId, []).get(r.materialId)).push(r); return m; };
    return {
      db, measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
      coverageByMaterial: group(db.coverage), productsByMaterial: E.products.productsByMaterial(db), unknownPolicy: 'strict', useEstimates: false, showEstimates: false,
      evidence: 'comparable', anneal: false, annealMaxC: null, moisture: 'dry',
    };
  }
});

test('a release is required, and every part of the input must name it', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const lean = { ...db, meta: Object.fromEntries(Object.entries(db.meta).filter(([k]) => k !== 'release')) };
  assert.throws(() => createContext(lean, scenario), (e) => e instanceof BoundaryError && /no release/.test(e.message));
  assert.equal(createContext(lean, scenario, { release: '0123456789ab' }).release, '0123456789ab');
  assert.throws(() => createContext(db, scenario, { release: '0123456789ab' }), /the database is release/);
  assert.throws(() => createContext(lean, scenario, { release: 'not-a-release' }), /release ID/);
  const input = { release: db.meta.release.id, core: db, scenario };
  assert.equal(runEngine(input).rows.length > 0, true);
  assert.throws(() => runEngine({ ...input, estimates: { release: '0123456789ab', status: 'withheld' } }), /estimates is release/);
  assert.throws(() => runEngine({ ...input, detail: new Map([['M001', { release: '0123456789ab', materialId: 'M001' }]]) }), /detail M001 is release/);
});

test('what the engine says is checked on the way out: a bad ID, an unknown word or a requirement it was not given is an error', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const tamper = (change) => ({
    ...defaultEngine,
    constraints: { ...defaultEngine.constraints, runSelection: (m, c, ctx) => { const s = defaultEngine.constraints.runSelection(m, c, ctx); return { ...s, evaluations: s.evaluations.map(change) }; } },
  });
  const run = (engine) => createContext(db, scenario, { engine }).run();
  assert.throws(() => run(tamper((e) => ({ ...e, materialId: 'bogus' }))), (e) => e instanceof BoundaryError && /material ID/.test(e.message));
  assert.throws(() => run(tamper((e) => ({ ...e, group: 'sort-of' }))), /group/);
  assert.throws(() => run(tamper((e) => ({ ...e, results: e.results.map((r) => ({ ...r, status: 'MAYBE' })) }))), /requirement status/);
  assert.throws(() => run(tamper((e) => ({ ...e, results: e.results.map((r) => ({ ...r, constraint: { ...r.constraint } })) }))), /did not hold/);
  assert.throws(() => run(tamper((e) => (e.products?.length ? { ...e, products: e.products.map((p) => ({ ...p, state: { ...p.state, id: 'annealed:120:016' } })) } : e))), /state ID/);
});

test('two requirements that are one object, or share an ID, are refused: the engine could not tell them apart', () => {
  const scenario = scenarioFrom(structuredClone(byId(STRICT).scenario), db.meta);
  const [first] = scenario.constraints;
  assert.throws(() => createContext(db, { ...scenario, constraints: [first, first] }).run(), /same object/);
  assert.throws(() => createContext(db, { ...scenario, constraints: [{ ...first, id: 'x' }, { ...scenario.constraints[1], id: 'x' }] }).run(), /share the ID x/);
  assert.throws(() => scenarioFrom({ ...byId(STRICT).scenario, constraints: [{ kind: 'bogus' }] }, db.meta), /not one a scenario may hold/);
  assert.throws(() => createContext(db, { ...scenario, constraints: [{ kind: 'bogus' }] }).run(), /Unsupported constraint kind/);
});
