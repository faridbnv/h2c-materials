// Untested-rules question 3 (S06-11): the reference layer and the familiar baseline are never candidates.
// The reference layer (dist/reference.json: steel, aluminium, wood and the like, "shown for scale only; never part of the
// candidate set") is drawn on request. A familiar material chosen as a baseline (PLA, PETG, ABS, ASA or PC) is drawn beside
// the results. Neither may appear in the candidate list, the counts, the rows or the shortlist. Asserted on the built data
// (dist/db.json and dist/reference.json) and on the engine's output, through the typed wrapper over the old engine, for the
// same question asked three ways: with both off, with the reference layer on and a baseline chosen, and with a reference set
// handed to the engine. The old files are read, never edited.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createContext, runEngine, scenarioFrom } from '../../packages/engine/src/index.ts';
import { TEMPLATES } from '../../app/js/ui/templates.js';
import { newScenario, validateScenario } from '../../app/js/engine/scenario.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];
let db, reference;

before(() => {
  if (!existsSync(join(root, 'dist/db.json')) || !existsSync(join(root, 'dist/reference.json'))) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  reference = JSON.parse(readFileSync(join(root, 'dist/reference.json'), 'utf8'));
});

const question = (constraints) => ({ constraints, unknownPolicy: 'strict', useEstimates: false, evidence: 'comparable', moisture: 'dry', anneal: false, annealMaxC: null });
const templateQuestion = (name) => question(TEMPLATES.find((t) => t.name === name).constraints);
const baselineIds = () => BASELINE_NAMES.map((n) => db.materials.find((m) => m.name === n)?.id);

// ---- the built data ---------------------------------------------------------------------------------------------------
test('the reference layer is a separate file of reference materials, and none of it is in the compiled database', () => {
  assert.ok(!('reference' in db) && !('references' in db), 'dist/db.json has no reference section');
  assert.ok(reference.materials.length > 50 && reference.materials.length === reference.meta.count, `${reference.materials.length} reference materials`);
  assert.match(reference.meta.caveat, /never part of the candidate set/);
  for (const m of reference.materials) {
    assert.equal(m.isReference, true, m.id);
    assert.match(m.id, /^REF-/, m.id);
    assert.ok(!m.grades && !m.gates && !m.profileIds, `${m.id} carries products or print gates, which only a candidate does`);
  }
  const refIds = new Set(reference.materials.map((m) => m.id));
  assert.equal(refIds.size, reference.materials.length, 'reference ids are unique');
  for (const m of db.materials) {
    assert.ok(!m.isReference && !refIds.has(m.id) && !String(m.id).startsWith('REF-'), `${m.id} is a reference material inside the compiled database`);
  }
  for (const table of ['grades', 'measurements', 'profiles', 'evidence', 'coverage', 'prices']) {
    for (const row of db[table] ?? []) assert.ok(!refIds.has(row.materialId), `${table} row ${row.id} sits under reference material ${row.materialId}`);
  }
});

test('the five familiar baselines are real candidate materials, so the baseline is a choice among candidates and not a candidate of its own', () => {
  const ids = baselineIds();
  assert.ok(ids.every(Boolean), `every baseline name is a material: ${ids}`);
  assert.equal(new Set(ids).size, 5);
  const source = readFileSync(join(root, 'app/js/ui/table.js'), 'utf8');
  assert.match(source, /const BASELINE_NAMES = \['PLA', 'PETG', 'ABS', 'ASA', 'PC'\];/, 'the old page offers exactly these five');
});

test('a saved scenario or link cannot make a reference material a baseline, a shortlist entry or a focus', () => {
  const meta = db.meta;
  const known = new Set(db.materials.map((m) => m.id));
  const refId = reference.materials[0].id;
  const raw = { ...newScenario(meta), baseline: refId, openMaterial: refId, shortlist: [refId, db.materials[0].id], plot: { ...newScenario(meta).plot, focus: [refId] } };
  const { scenario } = validateScenario(raw, meta, { materialIds: known, gradeIds: new Set() });
  assert.equal(scenario.baseline, null, 'a reference material is not a baseline');
  assert.equal(scenario.openMaterial, null);
  assert.ok(!scenario.shortlist.includes(refId), 'a reference material is not on the shortlist');
  assert.deepEqual(scenario.plot.focus, []);
  const ok = validateScenario({ ...newScenario(meta), baseline: baselineIds()[0] }, meta, { materialIds: known, gradeIds: new Set() }).scenario;
  assert.equal(ok.baseline, baselineIds()[0], 'a familiar baseline is kept: the check is not simply refusing everything');
});

test('the old page builds its candidates from the compiled materials alone: recompute() never reads the baseline or the reference layer', () => {
  const main = readFileSync(join(root, 'app/js/main.js'), 'utf8');
  const start = main.indexOf('function recompute()');
  assert.ok(start > 0, 'recompute() is in main.js');
  const end = main.indexOf('\n}\n', start);
  const body = main.slice(start, end);
  assert.match(body, /const candidates = db\.materials\.filter\(\(m\) => !m\.familyEntry\);/);
  assert.match(body, /state\.selection = runSelection\(materials, scenario\.constraints, state\.ctx\);/);
  assert.doesNotMatch(body, /baseline|showReference|reference|isReference/i, 'recompute() mentions the baseline or the reference layer');
});

// ---- the engine's output ----------------------------------------------------------------------------------------------
/** The parts of an engine answer a baseline or a reference layer must not change. */
const answerOf = (out) => ({ candidates: out.candidates, counts: out.counts, evaluations: out.evaluations, rows: out.rows, rankings: out.rankings, constraintIds: out.constraintIds });

for (const name of ['Outdoor structural part', 'Warm environment', 'Flexible component']) {
  test(`${name}: the candidates, counts, rows and rankings are the same with the reference layer on and a baseline chosen as with both off`, () => {
    const plain = scenarioFrom(templateQuestion(name), db.meta);
    assert.equal(plain.baseline, null);
    assert.equal(plain.plot.showReference, false);
    const before = createContext(db, plain).run();
    assert.ok(before.candidates.length > 0 && before.candidates.length < db.materials.length, `${before.candidates.length} candidates`);
    const baselines = baselineIds();
    const failing = before.evaluations.find((e) => baselines.includes(e.materialId) && e.verdict !== 'PASS');
    // Choose a baseline the question does not pass (so its absence from the candidates is a fact), and one it does if there is one.
    const chosen = [failing?.materialId ?? baselines[0], ...baselines.filter((id) => before.candidates.includes(id)).slice(0, 1)];
    for (const baseline of new Set(chosen)) {
      const withBoth = { ...plain, baseline, plot: { ...plain.plot, showReference: true }, shortlist: [baseline] };
      const after = createContext(db, withBoth).run();
      assert.deepEqual(answerOf(after), answerOf(before), `baseline ${baseline}`);
      assert.equal(after.counts.total, db.materials.filter((m) => !m.familyEntry).length, 'every candidate is a compiled material, counted once');
      assert.equal(after.evaluations.filter((e) => e.materialId === baseline).length, 1, 'the baseline is judged as the one material it is, not added as another');
    }
    const refIds = new Set(reference.materials.map((m) => m.id));
    for (const e of before.evaluations) assert.ok(!refIds.has(e.materialId), `${e.materialId} is a reference material in the evaluations`);
    for (const id of before.candidates) assert.ok(!refIds.has(id) && !String(id).startsWith('REF-'), `${id} is a reference material in the candidates`);
  });
}

test('a reference set handed to the engine (Ashby only) changes no candidate, count or row, and a stale one is refused', () => {
  const scenario = scenarioFrom(templateQuestion('Outdoor structural part'), db.meta);
  const release = db.meta.release.id;
  const input = { release, core: db, scenario: { ...scenario, plot: { ...scenario.plot, showReference: true } } };
  const without = runEngine(input);
  const withReference = runEngine({ ...input, reference: { release, ...reference } });
  assert.deepEqual(answerOf(withReference), answerOf(without));
  assert.ok(withReference.candidates.every((id) => !String(id).startsWith('REF-')));
  assert.throws(() => runEngine({ ...input, reference: { release: '000000000000', ...reference } }), /reference is release 000000000000/);
});

test('even with every question dropped, the candidate list is the compiled materials that are not family entries, and none of the reference layer', () => {
  const out = createContext(db, scenarioFrom(question([]), db.meta)).run({ rankings: false });
  const expected = db.materials.filter((m) => !m.familyEntry).map((m) => m.id).sort();
  assert.deepEqual(out.evaluations.map((e) => e.materialId).sort(), expected);
});
