import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareInterval, evaluateConstraint, evaluateMaterial, runSelection, explainExclusions,
  STATUS, UNKNOWN_POLICY,
} from '../app/js/engine/constraints.js';

const point = (v) => ({ lo: v, hi: v, kind: 'point' });
const range = (lo, hi) => ({ lo, hi, kind: 'range' });

// Section 10.3 of the architecture brief, worked through verbatim.
test('range against a threshold: pass, fail, indeterminate', () => {
  assert.equal(compareInterval(range(110, 130), '>=', 100), STATUS.PASS);
  assert.equal(compareInterval(range(70, 90), '>=', 100), STATUS.FAIL);
  assert.equal(compareInterval(range(90, 120), '>=', 100), STATUS.INDETERMINATE);
});

test('a threshold exactly on a boundary', () => {
  assert.equal(compareInterval(point(100), '>=', 100), STATUS.PASS);
  assert.equal(compareInterval(point(100), '>', 100), STATUS.FAIL);
  assert.equal(compareInterval(point(100), '<=', 100), STATUS.PASS);
  assert.equal(compareInterval(point(100), '<', 100), STATUS.FAIL);
});

test('bounded measurements: ">650 %" and "<0.8 %"', () => {
  const gt650 = { lo: 650, hi: null, openLow: true };
  assert.equal(compareInterval(gt650, '>=', 100), STATUS.PASS, 'a lower bound above the threshold passes');
  assert.equal(compareInterval(gt650, '<=', 100), STATUS.FAIL);
  const lt08 = { lo: null, hi: 0.8, openHigh: true };
  assert.equal(compareInterval(lt08, '<=', 1), STATUS.PASS);
  assert.equal(compareInterval(lt08, '<=', 0.5), STATUS.INDETERMINATE, 'the bound straddles a tighter threshold');
  assert.equal(compareInterval(lt08, '>=', 1), STATUS.FAIL);
});

test('uncertainty that straddles the threshold is indeterminate, not a pass', () => {
  const m = { id: 'M1', headline: { tensileModulusXY: {
    known: true, value: 2.98, unit: 'GPa', uncertainty: 0.09,
    interval: { lo: 2.89, hi: 3.07, kind: 'uncertainty' }, measurementId: 'V1',
  } } };
  const r = evaluateConstraint(m, { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 });
  assert.equal(r.status, STATUS.INDETERMINATE);
  assert.match(r.reason, /straddles/);
});

test('missing data is UNKNOWN and never zero', () => {
  const m = { id: 'M1', headline: { hdt045: { known: false, missing: 'not-published' } } };
  const r = evaluateConstraint(m, { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 });
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.equal(r.observed, undefined, 'no value is invented for a missing measurement');
});

test('an HDT headline with an unstated load cannot assert a load-specific pass', () => {
  const m = { id: 'M1', headline: { hdt045: {
    known: true, value: 186, unit: '°C', loadStated: false, interval: point(186), measurementId: 'V2',
  } } };
  const r = evaluateConstraint(m, { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 });
  assert.equal(r.status, STATUS.INDETERMINATE);
  assert.equal(r.caveat, 'load-not-stated');
});

test('a chamber recommendation does not fail a candidate', () => {
  const required = { id: 'A', gates: { chamber: { verdict: 'exceeds', reason: 'r' } } };
  const recommended = { id: 'B', gates: { chamber: { verdict: 'exceeds-recommended', reason: 'r' } } };
  assert.equal(evaluateConstraint(required, { kind: 'gate', gate: 'chamber' }).status, STATUS.FAIL);
  assert.equal(evaluateConstraint(recommended, { kind: 'gate', gate: 'chamber' }).status, STATUS.INDETERMINATE);
});

test('an indicator environment category never manufactures a PASS', () => {
  const ctx = { db: { meta: { environmentCategories: { 'uv-outdoor': { kind: 'indicator', usable: 0 } } } } };
  const r = evaluateConstraint({ id: 'M1' }, { kind: 'environment', category: 'uv-outdoor' }, ctx);
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.ok(r.indicatorOnly);
});

test('strict mode holds unknowns out, exploration keeps them flagged', () => {
  const m = { id: 'M1', excluded: false, headline: { hdt045: { known: false, missing: 'not-published' } }, gates: {} };
  const cs = [{ kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 }];
  const strict = evaluateMaterial(m, cs, { unknownPolicy: UNKNOWN_POLICY.STRICT });
  assert.equal(strict.eligible, false);
  assert.deepEqual(strict.heldBy, ['hdt045 >= 100'], 'held by an unresolved criterion, not a failure');
  assert.equal(strict.failed.length, 0);

  const explore = evaluateMaterial(m, cs, { unknownPolicy: UNKNOWN_POLICY.EXPLORATION });
  assert.equal(explore.eligible, true);
  assert.equal(explore.needsVerification, true);
});

test('a soft preference never removes a candidate', () => {
  const m = { id: 'M1', headline: { priceCADkg: { known: true, value: 200, unit: 'CAD/kg', interval: point(200) } }, gates: {} };
  const e = evaluateMaterial(m, [{ kind: 'numeric', property: 'priceCADkg', operator: '<=', value: 80, mandatory: false }], {});
  assert.equal(e.verdict, STATUS.PASS);
  assert.equal(e.results[0].status, STATUS.FAIL, 'the criterion still reports its own failure');
});

test('exclusions are ranked by how many candidates each criterion actually costs', () => {
  const mk = (id, hdt, rho) => ({
    id, excluded: false, gates: {},
    headline: { hdt045: { known: true, value: hdt, unit: '°C', loadStated: true, interval: point(hdt) },
                density: { known: true, value: rho, unit: 'kg/m³', interval: point(rho) } },
  });
  const materials = [mk('A', 180, 1100), mk('B', 60, 1100), mk('C', 60, 1900), mk('D', 50, 1800)];
  const cs = [
    { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 },
    { kind: 'numeric', property: 'density', operator: '<=', value: 1400 },
  ];
  const ranked = explainExclusions(materials, cs, {});
  assert.equal(ranked[0].constraint.property, 'hdt045');
  assert.equal(ranked[0].removed, 3);
  assert.equal(runSelection(materials, cs, {}).candidates.length, 1);
});

// Regression: an unrecognised policy string made the verdict and the eligibility test disagree.
// Unresolved candidates were reported as UNKNOWN, which the status bar rendered as Explore, while
// eligibility still held them out as if Strict.
test('an unrecognised unknown-data policy falls back to strict, consistently', () => {
  const m = { id: 'M1', excluded: false, gates: {}, headline: { hdt045: { known: false, missing: 'not-published' } } };
  const cs = [{ kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 }];
  for (const bogus of ['explore', 'Exploration', '', undefined, null, 'loose']) {
    const e = evaluateMaterial(m, cs, { unknownPolicy: bogus });
    assert.equal(e.verdict, STATUS.FAIL, String(bogus));
    assert.equal(e.eligible, false, String(bogus));
  }
  const good = evaluateMaterial(m, cs, { unknownPolicy: 'exploration' });
  assert.equal(good.verdict, STATUS.UNKNOWN);
  assert.equal(good.eligible, true);
});

// --- family estimates -------------------------------------------------------
// An estimate is inference drawn from a material's relatives. It exists to stop a material falling
// into a category it clearly does not belong to, and for nothing else.

const estimated = (lo, hi) => ({
  id: 'M1', excluded: false, gates: {},
  headline: { elongationXY: { known: false, missing: 'not-published', unit: '%',
    estimate: { lo, hi, unit: '%', peerCount: 14, basis: 'PLA, unreinforced grades', peers: [] } } },
});

test('an estimate can rule a material out of a requirement its relatives cannot meet', () => {
  const m = estimated(2.8, 15.3);
  const c = { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100 };
  const r = evaluateConstraint(m, c, { useEstimates: true });
  assert.equal(r.status, STATUS.FAIL);
  assert.ok(r.estimated);
  assert.match(r.reason, /measured peers/);
});

test('an estimate never confirms a requirement, even when every peer would meet it', () => {
  const m = estimated(2.8, 15.3);
  const c = { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 2 };
  const r = evaluateConstraint(m, c, { useEstimates: true });
  assert.equal(r.status, STATUS.UNKNOWN, 'a passing estimate is still not evidence');
  assert.equal(r.plausible, STATUS.PASS);
  assert.ok(r.estimated);
});

test('a straddling estimate holds rather than deciding', () => {
  const r = evaluateConstraint(estimated(2.8, 15.3), { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 10 }, { useEstimates: true });
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.equal(r.plausible, STATUS.INDETERMINATE);
});

test('estimates are invisible unless explicitly enabled, so Strict never sees them', () => {
  const m = estimated(2.8, 15.3);
  const c = { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100 };
  const off = evaluateConstraint(m, c, {});
  assert.equal(off.status, STATUS.UNKNOWN);
  assert.equal(off.estimated, undefined);
  assert.match(off.reason, /Not published/);
});

test('a material ruled out only by an estimate says so', () => {
  const m = estimated(2.8, 15.3);
  const e = evaluateMaterial(m, [{ kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100 }],
    { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.EXPLORATION });
  assert.equal(e.verdict, STATUS.FAIL);
  assert.equal(e.eligible, false);
  assert.ok(e.ruledOutByEstimate);
  assert.ok(e.usesEstimate);
});

test('a material that fails on real evidence is not attributed to an estimate', () => {
  const m = { id: 'M2', excluded: false, gates: {}, headline: { elongationXY: { known: true, value: 5, unit: '%', interval: { lo: 5, hi: 5 } } } };
  const e = evaluateMaterial(m, [{ kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100 }], { useEstimates: true });
  assert.equal(e.verdict, STATUS.FAIL);
  assert.equal(e.ruledOutByEstimate, false);
  assert.equal(e.usesEstimate, false);
});
