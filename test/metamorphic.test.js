// Invariants of the selection (the version 2.1 plan, section 5): a change to the question or the data that cannot make
// an answer better must not, whatever the numbers are. Each is stated as a relation between two runs, so it holds for
// data nobody has written a case for. Where an invariant waited on a work package when it was written, it says which.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runSelection, STATUS, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { rankMaterials, indexById } from '../app/js/engine/indices.js';
import { productView } from '../app/js/engine/products.js';
import { loadTables } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { TEMPLATES } from '../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = { unknownPolicy: UNKNOWN_POLICY.STRICT };
const EXPLORE = { unknownPolicy: UNKNOWN_POLICY.EXPLORATION };
const within = { verdict: 'within', reason: 'within' };
const recipe = { profileIds: ['P1'], nozzle: { ...within, state: 'range' }, bed: { ...within, state: 'range' }, chamber: { ...within, state: 'ambient' },
  enclosure: 'unknown', hardenedNozzle: null, drying: null, anneal: [] };
const missing = (unit) => ({ known: false, missing: 'not-published', unit });
const v = (value, id = 'V1') => ({ value, level: 'comparable', measurementId: id });
const grade = (id, headline = {}) => ({ id, materialId: 'M1', headline, print: recipe });
const material = (grades) => ({
  id: 'M1', name: 'Test', excluded: false, gradeIds: grades.map((g) => g.id),
  headline: { tensileModulusXY: missing('GPa') }, summary: {},
  gates: { scope: 'within', nozzle: within, bed: within, chamber: within, abrasive: 'unknown', drying: 'unknown' },
  facets: { reinforcement: { value: 'unfilled' } },
});
const judge = (grades, constraints, ctx = STRICT, extra = {}) => runSelection([material(grades)], constraints, { ...ctx, ...extra, productsByMaterial: new Map([['M1', grades]]) }).evaluations[0];
const stiff = { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 };
const acid = { kind: 'environment', category: 'acid' };
const evidence = (...records) => ({ evidenceByMaterial: new Map([['M1', records.map((r) => ({ materialId: 'M1', category: 'acid', ...r }))]]) });

test('a failing product cannot remove a material whose other product is unresolved (D100)', () => {
  const before = judge([grade('G1')], [stiff], EXPLORE);
  const after = judge([grade('G1'), grade('G2', { tensileModulusXY: v(2) })], [stiff], EXPLORE);
  assert.equal(before.verdict, STATUS.UNKNOWN);
  assert.equal(after.verdict, STATUS.UNKNOWN, 'G1 is still unresolved');
  assert.equal(after.eligible, true, 'and still explored');
  assert.deepEqual([after.counts.pass, after.counts.fail, after.counts.untested], [0, 1, 1]);
});

test('every product failing is a failure', () => {
  const e = judge([grade('G1', { tensileModulusXY: v(2) }), grade('G2', { tensileModulusXY: v(2.5) })], [stiff], EXPLORE);
  assert.equal(e.verdict, STATUS.FAIL);
});

test("a sibling's positive record cannot confirm a product that has none (D98)", () => {
  const grades = [grade('G1'), grade('G2')];
  const e = judge(grades, [acid], STRICT, evidence({ id: 'Q1', gradeId: 'G2', verdict: 'resistant' }));
  const g1 = e.products.find((p) => p.gradeId === 'G1');
  assert.equal(g1.verdict, STATUS.UNKNOWN, "G2's record is not G1's");
  assert.equal(e.products.find((p) => p.gradeId === 'G2').verdict, STATUS.PASS);
});

test("a product's own contrary record is not hidden by a sibling's positive one (D98)", () => {
  const grades = [grade('G1'), grade('G2')];
  const e = judge(grades, [acid], STRICT, evidence({ id: 'Q1', gradeId: 'G1', verdict: 'not-resistant' }, { id: 'Q2', gradeId: 'G2', verdict: 'resistant' }));
  assert.equal(e.products.find((p) => p.gradeId === 'G1').verdict, STATUS.FAIL);
  assert.equal(e.verdict, STATUS.PASS, 'the material passes on G2, and says only some of its products do');
});

// Over the compiled database: a stricter limit can only take passes away.
const compiled = () => JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const contextOf = (db) => {
  const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
  return { db, productsByMaterial: productsByMaterial(db), measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence),
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), coverageByMaterial: group(db.coverage), ...STRICT };
};

test('a stricter limit never creates a pass, on the compiled database', () => {
  const db = compiled();
  const ctx = contextOf(db);
  const materials = db.materials.filter((m) => !m.familyEntry);
  const passing = (value) => new Set(runSelection(materials, [{ kind: 'numeric', property: 'hdt045', operator: '>=', value }], ctx).evaluations
    .flatMap((e) => (e.products ?? []).filter((p) => p.verdict === STATUS.PASS).map((p) => p.gradeId)));
  const loose = passing(80), strict = passing(100);
  assert.ok(strict.size > 0 && loose.size > strict.size);
  assert.deepEqual([...strict].filter((id) => !loose.has(id)), []);
});

test('forbidding a treatment never creates a pass; permitting one never removes one (D99)', () => {
  const db = compiled();
  const ctx = contextOf(db);
  const materials = db.materials.filter((m) => !m.familyEntry);
  const passing = (extra) => new Set(TEMPLATES.flatMap((t) => runSelection(materials, t.constraints, { ...ctx, ...extra }).evaluations
    .flatMap((e) => (e.products ?? []).filter((p) => p.verdict === STATUS.PASS).map((p) => `${t.name}|${p.gradeId}`))));
  const printed = passing({}), annealed = passing({ anneal: true }), cool = passing({ anneal: true, annealMaxC: 60 });
  assert.ok(annealed.size > printed.size, 'annealing permitted adds passes somewhere');
  assert.deepEqual([...printed].filter((k) => !annealed.has(k)), [], 'every product passing as printed still passes with annealing permitted');
  assert.deepEqual([...cool].filter((k) => !annealed.has(k)), [], 'a cooler oven permits no more than any oven');
  assert.deepEqual([...printed].filter((k) => !cool.has(k)), [], 'and no fewer than none');
});

test('ranking the answer never changes it', () => {
  const db = compiled();
  const ctx = contextOf(db);
  const materials = db.materials.filter((m) => !m.familyEntry);
  const constraints = TEMPLATES.find((t) => t.name === 'Warm environment').constraints;
  const before = JSON.stringify(runSelection(materials, constraints, ctx).evaluations.map((e) => [e.materialId, e.verdict, e.eligible]));
  const { evaluations } = runSelection(materials, constraints, ctx);
  rankMaterials(evaluations, materials, ctx.productsByMaterial, indexById('beam-stiffness'), (m, g) => productView(m, g, ctx));
  assert.equal(JSON.stringify(evaluations.map((e) => [e.materialId, e.verdict, e.eligible])), before);
});

// A maker's know-how is the record tier (D85): rewriting a statement moves no answer.
test('rewriting record-tier content moves no scenario answer', () => {
  const answers = (wb) => {
    const { db } = buildDatabase(wb, { estimates: false, cache: false });
    const ctx = contextOf(db);
    const materials = db.materials.filter((m) => !m.familyEntry);
    return TEMPLATES.map((t) => runSelection(materials, t.constraints, ctx).evaluations.map((e) => `${e.materialId}:${e.verdict}:${(e.products ?? []).map((p) => p.verdict).join('')}`).join(' '));
  };
  const wb = loadTables(join(root, 'data'));
  const before = answers(wb);
  const rows = wb['Use & durability'].rows;
  const knowHow = rows.filter((r) => r.Domain === "Makers' know-how").slice(0, 25);
  assert.equal(knowHow.length, 25);
  for (const r of knowHow) r.Finding = `${r.Finding} (rewritten for the invariant)`;
  assert.deepEqual(answers(wb), before);
});
