// Corpus v0 and the old-side adapter's context.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus, censusCases, randomCases, templateCases } from '../../packages/parity/src/corpus.ts';
import { createOld, readDb } from '../../packages/parity/src/old-adapter.ts';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { corpus, db, root } from './helpers.mjs';

const { TEMPLATES } = await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href);

test('corpus v0 sizes: 6 templates x 5 modes, the 138-case census on and off, 1,000 seeded scenarios', () => {
  assert.equal(TEMPLATES.length, 6);
  const by = (g) => corpus.cases.filter((c) => c.group === g).length;
  assert.equal(by('template'), 30);
  assert.equal(by('census'), 276);
  assert.equal(by('random'), 1000);
  assert.equal(corpus.cases.length, 1306);
  assert.equal(new Set(corpus.cases.map((c) => c.id)).size, 1306);
  assert.equal(corpus.seed, 7);
});

test('the census is 138 cases, each with estimates on and off', () => {
  const c = censusCases(TEMPLATES);
  assert.equal(c.length, 276);
  assert.equal(c.filter((x) => x.scenario.useEstimates).length, 138);
});

test('generation is deterministic (same seed, same db, same cases)', () => {
  assert.deepEqual(randomCases(db), randomCases(db));
  assert.deepEqual(templateCases(TEMPLATES), templateCases(TEMPLATES));
});

test('the committed corpus equals a fresh build on this db (data unchanged) or names the release it came from', async () => {
  const fresh = await buildCorpus(db);
  if (fresh.generatedFrom.release === corpus.generatedFrom.release) assert.deepEqual(fresh, corpus);
  else assert.ok(corpus.generatedFrom.release, 'corpus must record the release its random edges came from');
});

test('corpus holds scenarios only: no outputs', () => {
  for (const c of corpus.cases) assert.deepEqual(Object.keys(c).sort(), ['group', 'id', 'name', 'scenario']);
});

test('the adapter builds the context the way scripts/trace.mjs pageContext does', async () => {
  const { pageContext } = await import(pathToFileURL(join(root, 'scripts/trace.mjs')).href);
  const { runSelection } = await import(pathToFileURL(join(root, 'app/js/engine/constraints.js')).href);
  const adapter = await createOld(readDb());
  const mats = db.materials.filter((m) => !m.familyEntry);
  for (const c of [corpus.cases[0], corpus.cases[3], corpus.cases[4], corpus.cases.find((x) => x.group === 'census' && x.scenario.anneal && x.scenario.moisture === 'conditioned')]) {
    const s = structuredClone(c.scenario);
    const { evaluations, counts } = runSelection(mats, s.constraints, pageContext(db, s));
    const got = adapter.evaluate(c).records;
    assert.equal(got.case.decision['counts.pass'], counts.pass, c.id);
    assert.equal(got.case.decision['counts.unknown'], counts.unknown, c.id);
    for (const e of evaluations) {
      const m = got[`material:${e.materialId}`].decision;
      assert.equal(m.verdict, e.verdict, `${c.id} ${e.materialId}`);
      assert.equal(m.group, e.group);
      assert.equal(m.gradeId, e.gradeId);
    }
  }
});

test('the adapter reports requirements by stable keys, including two requirements on one property', async () => {
  const adapter = await createOld(readDb());
  const c = { id: 'x', group: 'random', name: 'x', scenario: { constraints: [
    { kind: 'numeric', property: 'density', operator: '>=', value: 900, mandatory: true },
    { kind: 'numeric', property: 'density', operator: '<=', value: 1500, mandatory: true }], unknownPolicy: 'exploration', useEstimates: true, evidence: 'comparable', moisture: 'dry', anneal: false, annealMaxC: null } };
  const r = adapter.evaluate(c).records;
  const keys = Object.keys(r).filter((k) => k.startsWith('req:'));
  assert.ok(keys.some((k) => k.endsWith('/c0:density')) && keys.some((k) => k.endsWith('/c1:density')));
});
