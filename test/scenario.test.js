// Scenario tests: what a saved file or a shared link may and may not do to a running session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deserialize, validateScenario, toHash, fromHash, newScenario, serialize, SHORTLIST_MAX } from '../app/js/engine/scenario.js';

const meta = { snapshot: '2026-09-10', build: 'test' };
const ids = { materialIds: new Set(['M001', 'M002', 'M003', 'M004', 'M005', 'M006', 'M007']) };

// Regression: {"version":1,"constraints":null} loaded, replaced the session and then threw while
// rendering, destroying the work the file was meant to restore.
test('a structurally invalid scenario is refused before anything is committed', () => {
  assert.throws(() => deserialize('{"version":1,"constraints":null}', meta, ids), /constraints/);
  assert.throws(() => deserialize('{"version":1,"constraints":[{"kind":"wish"}]}', meta, ids), /unknown kind/);
  assert.throws(() => deserialize('{"version":1,"constraints":[{"kind":"numeric","property":"density","operator":">=","value":"heavy"}]}', meta, ids), /numeric value/);
  assert.throws(() => deserialize('not json', meta, ids), /not valid JSON/);
  assert.throws(() => deserialize('{"version":2}', meta, ids), /version 2/);
  assert.throws(() => deserialize('{"version":1,"assumptions":[{"materialId":"M001"}]}', meta, ids), /Assumption 1/);
});

test('unknown materials are dropped with a warning and the shortlist is capped', () => {
  const raw = { version: 1, shortlist: ['M001', 'GONE', 'M002', 'M003', 'M004', 'M005', 'M006', 'M007'], baseline: 'GONE', openMaterial: 'M002' };
  const { scenario, warnings } = validateScenario(raw, meta, ids);
  assert.equal(scenario.shortlist.length, SHORTLIST_MAX);
  assert.ok(!scenario.shortlist.includes('GONE'));
  assert.equal(scenario.baseline, null);
  assert.equal(scenario.openMaterial, 'M002');
  assert.equal(warnings.length, 2);
});

test('a saved file round-trips every committed setting', () => {
  const s = {
    ...newScenario(meta), lens: 'compare', baseline: 'M001', columnSet: 'printing', useEstimates: false,
    openMaterial: 'M003', shortlist: ['M002'], unknownPolicy: 'exploration', template: 'Indoor prototype',
    constraints: [{ kind: 'numeric', property: 'density', operator: '<=', value: 1200, mandatory: false }],
    assumptions: [{ materialId: 'M002', property: 'hdt045', value: 90, unit: '°C' }],
  };
  const { scenario } = deserialize(serialize(s), meta, ids);
  for (const k of ['lens', 'baseline', 'columnSet', 'useEstimates', 'openMaterial', 'shortlist', 'unknownPolicy', 'template', 'constraints', 'assumptions']) {
    assert.deepEqual(scenario[k], s[k], k);
  }
});

// Regression: a link dropped assumptions and the snapshot, so it silently reproduced a different
// result whenever an assumption was in play or the database had moved on.
test('a link carries assumptions and warns about a different snapshot', () => {
  const s = { ...newScenario({ snapshot: '2026-01-01' }), assumptions: [{ materialId: 'M001', property: 'hdt045', value: 90 }] };
  const { scenario, warnings } = fromHash(toHash(s), meta, ids);
  assert.deepEqual(scenario.assumptions, s.assumptions);
  assert.match(warnings.join(' '), /2026-01-01/);
  assert.throws(() => fromHash('%7Bbroken', meta, ids), /damaged/);
  assert.equal(fromHash('', meta, ids), null);
});

test('an old link that accepted limited resistance is not carried forward', () => {
  const raw = { version: 1, constraints: [{ kind: 'environment', category: 'acid', require: ['resistant', 'limited'] }] };
  assert.equal(validateScenario(raw, meta, ids).scenario.constraints[0].require, undefined);
});

test('a requirement this build cannot evaluate, or a second one on a property, is left out with a warning (A-05, A-06)', () => {
  const meta = { snapshot: 'x', environmentCategories: { acid: 'Acid' } };
  const { scenario, warnings } = validateScenario({ version: 1, constraints: [
    { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80 },
    { kind: 'numeric', property: 'hdt045', operator: '<=', value: 120 },
    { kind: 'numeric', property: 'notAHeadline', operator: '>=', value: 1 },
    { kind: 'gate', gate: 'warp' },
    { kind: 'facet', facet: 'reinforcement', in: [] },
    { kind: 'environment', category: 'lava' },
    { kind: 'gate', gate: 'nozzle' },
  ] }, meta, { headlineKeys: new Set(['hdt045', 'density']) });
  assert.deepEqual(scenario.constraints.map((c) => c.property ?? c.gate), ['hdt045', 'nozzle']);
  assert.equal(warnings.length, 5);
  assert.match(warnings.join(' '), /second requirement on "hdt045"/);
});

test('an assumption never overrides "not applicable", takes the headline unit, and reads as assumed (A-02, A-03)', async () => {
  const { applyAssumptions } = await import('../app/js/engine/scenario.js');
  const { evaluateConstraint, STATUS } = await import('../app/js/engine/constraints.js');
  const tpu = { id: 'M1', headline: { hdt045: { known: false, notApplicable: { reason: 'elastomer' } }, tensileModulusXY: { known: false, missing: 'not-published', unit: 'GPa' } } };
  const { material } = applyAssumptions(tpu, [{ materialId: '*', property: 'hdt045', value: 150 }, { materialId: 'M1', property: 'tensileModulusXY', value: 2 }], { tensileModulusXY: 'GPa' });
  assert.equal(material.headline.hdt045.known, false);
  assert.equal(material.headline.tensileModulusXY.unit, 'GPa');
  const r = evaluateConstraint(material, { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 1 });
  assert.equal(r.status, STATUS.PASS);
  assert.match(r.reason, /^Assumed 2 GPa \(a scenario assumption, not published\)/);
});
