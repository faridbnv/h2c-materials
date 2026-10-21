// WP-19 step 4: requirements by ID, not by object identity. The engine port puts the ID of the requirement on every result and
// matches by it; a structured clone of the requirements, of the answer, or the same requirement twice, changes no answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { identify } from '@atlas/domain';
import { importStaged, stageEngine } from '@atlas/engine';
import { corpus, db } from './helpers.mjs';

const [ported, old] = await Promise.all([importStaged(stageEngine()), importStaged(stageEngine([]))]).then(([a, b]) => [a, b].map((m) => ({ constraints: m.get('constraints'), products: m.get('products') })));
const materials = db.materials.filter((m) => !m.familyEntry);
const ctxOf = (engine, extra = {}) => ({
  db, productsByMaterial: engine.products.productsByMaterial(db), measurementById: new Map(db.measurements.map((m) => [m.id, m])), gradeById: new Map(db.grades.map((g) => [g.id, g])),
  measurementsByMaterial: new Map(), evidenceByMaterial: new Map(), polymerEvidenceByMaterial: new Map(), coverageByMaterial: new Map(),
  unknownPolicy: 'exploration', useEstimates: false, evidence: 'comparable', anneal: true, annealMaxC: 150, moisture: 'dry', ...extra,
});
const template = corpus.cases.find((c) => c.id === 'template/outdoor-structural-part/explore-estimates-anneal-conditioned').scenario.constraints;
const ADDED = new Set(['reasonCode', 'constraintId']);
const stripped = (v) => (Array.isArray(v) ? v.map(stripped) : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
  ? Object.fromEntries(Object.entries(v).filter(([k]) => !ADDED.has(k)).map(([k, x]) => [k, k === 'constraint' ? x : stripped(x)])) : v);

test('every result names its requirement by ID: its place in the list, or treatment for the annealing a state needs', () => {
  const ids = identify(template).map((x) => x.id);
  assert.deepEqual(ids, template.map((_, i) => `c${i}`));
  const { evaluations } = ported.constraints.runSelection(materials, template, ctxOf(ported));
  const seen = new Set();
  for (const e of evaluations) for (const r of [...e.results, ...e.products.flatMap((p) => p.results)]) {
    assert.ok(r.constraintId === 'treatment' || ids.includes(r.constraintId), r.constraintId);
    assert.equal(r.constraint === template[ids.indexOf(r.constraintId)] || r.constraintId === 'treatment', true);
    seen.add(r.constraintId);
  }
  assert.ok(seen.has('treatment') && ids.every((id) => seen.has(id)), `all IDs appear: ${[...seen]}`);
});

test('a structured clone of the answer is matched to the requirements by ID, where identity finds nothing', () => {
  const { evaluations } = ported.constraints.runSelection(materials, template, ctxOf(ported));
  const clone = structuredClone(evaluations);
  const requirements = structuredClone(template);
  const ids = identify(requirements).map((x) => x.id);
  let byId = 0, byObject = 0;
  for (const e of clone) for (const r of e.results) {
    if (ids.includes(r.constraintId)) byId++;
    if (requirements.includes(r.constraint)) byObject++;
  }
  assert.ok(byId > 1000, `${byId} results matched`);
  assert.equal(byObject, 0, 'identity is gone after a clone');
});

test('asking with a clone of the requirements, or with one requirement twice, gives the old engine\'s answer', () => {
  const ctx = ctxOf(ported), was = ctxOf(old);
  const clone = structuredClone(template);
  assert.ok(isDeepStrictEqual(stripped(ported.constraints.runSelection(materials, clone, ctx)), stripped(old.constraints.runSelection(materials, clone, was))));
  const numeric = template.find((c) => c.kind === 'numeric');
  for (const list of [[numeric, numeric], [numeric, { ...numeric }, ...template], [...template, template[3]]]) {
    assert.ok(isDeepStrictEqual(stripped(ported.constraints.runSelection(materials, list, ctx)), stripped(old.constraints.runSelection(materials, list, was))), 'duplicates');
    assert.ok(isDeepStrictEqual(ported.constraints.explainExclusions(materials, list, ctx).map((x) => [x.removed, x.held, x.screened, x.recovered]), old.constraints.explainExclusions(materials, list, was).map((x) => [x.removed, x.held, x.screened, x.recovered])), 'explain');
  }
});

test('two requirements may not share an ID, nor may one take the annealing requirement\'s', () => {
  const a = { ...template[3], id: 'same' }, b = { ...template[4], id: 'same' };
  assert.throws(() => ported.constraints.runSelection(materials.slice(0, 3), [a, b], ctxOf(ported)), /two requirements share the ID same/);
  const t = { ...template[3], id: 'treatment' };
  assert.throws(() => ported.constraints.runSelection(materials, [t], ctxOf(ported)), /share the ID treatment/);
  const named = [{ ...template[3], id: 'stiff' }];
  assert.equal(ported.constraints.runSelection(materials.slice(0, 3), named, ctxOf(ported)).evaluations[0].results[0].constraintId, 'stiff');
});
