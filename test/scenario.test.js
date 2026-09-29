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
  // A version this build does not know is refused; version 1 is read and migrated, version 2 is this build's (D107).
  assert.throws(() => deserialize('{"version":3}', meta, ids), /version 3/);
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

// ------------------------------------------------------------------ version 2: the decision workspace (D107)

test('a version 1 scenario keeps its whole question, and its chart is not silently turned into a decision picture (T12)', () => {
  const v1 = {
    version: 1, release: 'r-old', dbSnapshot: '2026-09-10', unknownPolicy: 'exploration', useEstimates: true,
    constraints: [{ kind: 'numeric', property: 'density', operator: '<=', value: 1250 }], assumptions: [{ materialId: 'M001', property: 'hdt045', value: 90 }],
    anneal: true, annealMaxC: 120, moisture: 'conditioned', shortlist: ['M002'], lens: 'ashby', rankBy: 'beam-stiffness',
    decisions: [{ gradeId: 'G001-01', stateId: 'annealed:120:16', release: 'r-old', chosenOn: '2026-09-20' }],
    plot: { x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true, index: 'tie-stiffness', indexM: 0.004, detail: 'products' },
  };
  const { scenario, warnings } = validateScenario(v1, { ...meta, release: { id: 'r-now' } }, { ...ids, gradeIds: new Set(['G001-01']) });
  assert.equal(scenario.version, 2);
  for (const k of ['constraints', 'assumptions', 'shortlist', 'unknownPolicy', 'useEstimates', 'anneal', 'annealMaxC', 'moisture']) assert.deepEqual(scenario[k], v1[k], k);
  assert.deepEqual(scenario.decisions.map((d) => [d.gradeId, d.stateId]), [['G001-01', 'annealed:120:16']]);
  // One goal: the table's ranking wins over the chart's guide line, and the reader is told.
  assert.equal(scenario.rankBy, 'beam-stiffness');
  assert.equal(scenario.plot.index, undefined);
  assert.equal(scenario.plot.indexM, null, 'a line position belonged to the guide that lost');
  assert.ok(warnings.some((w) => /one goal/.test(w) && /Tie/.test(w) && /Beam/.test(w)), JSON.stringify(warnings));
  // It was on the chart: it opens in the catalogue view it was saved with, said so, with the decision workspace offered.
  assert.equal(scenario.plot.view, 'catalogue');
  assert.ok(warnings.some((w) => /before the decision workspace/.test(w) && /Decision products/.test(w)));
  assert.ok(warnings.some((w) => /r-old/.test(w) && /r-now/.test(w)), 'the release note still says the release differs');
  assert.deepEqual(scenario.stages, []);
});

test('a version 1 guide line alone becomes the goal; a scenario that never used the chart opens the decision workspace', () => {
  const guided = validateScenario({ version: 1, lens: 'table', plot: { index: 'panel-stiffness' } }, meta, ids);
  assert.equal(guided.scenario.rankBy, 'panel-stiffness');
  const plain = validateScenario({ version: 1, lens: 'table', plot: { x: 'density', y: 'tensileModulusXY', pointLevel: 'headline' } }, meta, ids);
  assert.equal(plain.scenario.plot.view, 'decision');
  assert.ok(!plain.warnings.some((w) => /decision workspace/.test(w)), 'nothing to preserve, nothing to say');
  const measured = validateScenario({ version: 1, lens: 'ashby', plot: { pointLevel: 'measurements', comparability: 'broad' } }, meta, ids);
  assert.equal(measured.scenario.plot.view, 'measured-mixed');
});

test('a version 2 link and file carry the goal, the view, its layers, the line, a focus and the objective stages', () => {
  const s = {
    ...newScenario(meta), rankBy: 'beam-stiffness', lens: 'ashby',
    plot: { ...newScenario(meta).plot, view: 'overview', xLog: true, yLog: true, indexM: 0.00173, layers: { failed: true, unresolved: false, setAside: true, front: true }, showEstimates: true, focus: ['M002'] },
    stages: [{ index: 'beam-stiffness', cutoff: 0.0017 }, { index: 'tie-strength', cutoff: 0.04 }],
  };
  for (const { scenario, warnings } of [fromHash(toHash(s), meta, ids), deserialize(serialize(s), meta, ids)]) {
    assert.deepEqual(warnings, []);
    assert.equal(scenario.rankBy, 'beam-stiffness');
    assert.deepEqual(scenario.stages, s.stages);
    for (const k of ['view', 'indexM', 'layers', 'showEstimates', 'focus', 'xLog', 'yLog']) assert.deepEqual(scenario.plot[k], s.plot[k], k);
  }
});

test('a stage this build cannot read is left out and said so; there are at most three', () => {
  const { scenario, warnings } = validateScenario({ version: 2, stages: [
    { index: 'beam-stiffness', cutoff: 0.0017 }, { index: 'no-such-index', cutoff: 1 }, { index: 'tie-stiffness', cutoff: -1 },
    { index: 'tie-stiffness', cutoff: 0.003 }, { index: 'panel-stiffness', cutoff: 0.01 }, { index: 'beam-strength', cutoff: 0.01 },
  ] }, meta, ids);
  assert.deepEqual(scenario.stages.map((st) => st.index), ['beam-stiffness', 'tie-stiffness', 'panel-stiffness']);
  assert.ok(warnings.some((w) => /objective stage/.test(w)));
  assert.throws(() => validateScenario({ version: 2, stages: 'all' }, meta, ids), /stages/);
});
