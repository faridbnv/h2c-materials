// Selection-engine tests.
//
// These cover the rules that decide what a user sees: the four constraint states, how a range that
// straddles a threshold is reported, what Strict and Explore each do with an unresolved criterion,
// and the rule that peer context never determines an unmeasured material's eligibility.
//
// Several are marked as regressions. Those encode a bug that shipped, and the comment says what
// went wrong, because the behaviour looks arbitrary without it.
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

// A window the chamber only partly reaches is not a failure and not a pass: the source cannot say
// whether the reachable part is enough.
test('a partly reachable chamber window is unresolved', () => {
  const partial = { id: 'C', gates: { chamber: { verdict: 'partial', reason: 'r' } } };
  assert.equal(evaluateConstraint(partial, { kind: 'gate', gate: 'chamber' }).status, STATUS.INDETERMINATE);
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
    assert.equal(e.verdict, STATUS.UNKNOWN, String(bogus));
    assert.equal(e.eligible, false, String(bogus));
    assert.equal(e.needsVerification, false, `${bogus}: held out, so not flagged as a candidate to verify`);
    assert.equal(e.heldBy.length, 1, String(bogus));
  }
  const good = evaluateMaterial(m, cs, { unknownPolicy: 'exploration' });
  assert.equal(good.verdict, STATUS.UNKNOWN);
  assert.equal(good.eligible, true);
});

// --- estimates ----------------------------------------------------------------
// An estimate is inference, so it never changes a verdict. It may change eligibility in one direction
// only: in Explore, an estimate that can screen and whose plausible range wholly fails holds a material
// out, unless one of the material's own measurements of that property could meet the requirement (D43).
// The likely range is what the reader sees; the plausible range is what decides.

const estimated = (lo, hi, { canScreen = true, related = null, plausible = null } = {}) => ({
  id: 'M1', excluded: false, gates: {},
  headline: { elongationXY: { known: false, missing: 'not-published', unit: '%', related,
    estimate: { kind: 'model', strength: 'family', precision: 'fair', lo, hi, centre: (lo + hi) / 2, plausible: plausible ?? { lo, hi },
      unit: '%', basis: 'the family model only: PLA', method: 'Gaussian model', evidence: [],
      canScreen, screenLimit: canScreen ? null : 'no evidence of this material, and PLA is measured on fewer than 2 products' } } },
});
const elongation = (value, operator = '>=') => ({ kind: 'numeric', property: 'elongationXY', operator, value });
const explore = { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.EXPLORATION };

// Regression: PLA Lite once sat among the elastomers in a search for elongation at least 100%.
test('an estimate whose whole range fails screens the material out of Explore, without failing it', () => {
  const e = evaluateMaterial(estimated(2.2, 32.9), [elongation(100)], explore);
  assert.equal(e.verdict, STATUS.UNKNOWN, 'inference never becomes a FAIL');
  assert.equal(e.screened, true);
  assert.equal(e.eligible, false);
  assert.deepEqual(e.screenedBy, ['elongationXY >= 100']);
  assert.match(e.results[0].reason, /Screened out; not measured/);
  const s = runSelection([estimated(2.2, 32.9)], [elongation(100)], explore);
  assert.deepEqual(s.counts, { pass: 0, fail: 0, unknown: 1, screened: 1, total: 1 });
});

test('an estimate never passes a requirement, even when its whole range meets it', () => {
  const r = evaluateConstraint(estimated(2.2, 32.9), elongation(2), explore);
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.equal(r.plausible, STATUS.PASS);
  assert.equal(r.screened, false);
});

test('a straddling estimate neither screens nor decides', () => {
  const r = evaluateConstraint(estimated(2.2, 32.9), elongation(10), explore);
  assert.equal(r.plausible, STATUS.INDETERMINATE);
  assert.equal(r.screened, false);
});

test('an estimate that may not screen only informs', () => {
  const e = evaluateMaterial(estimated(2.2, 32.9, { canScreen: false }), [elongation(100)], explore);
  assert.equal(e.screened, false);
  assert.equal(e.eligible, true);
  assert.match(e.results[0].reason, /fewer than 2 products/);
});

// Regression, found while designing this model: a class envelope screened CPE out of "elongation at
// least 100%" although its own data sheet reports 150% in an unstated direction.
test('the material\'s own measurement vetoes a screen, whatever its direction or endpoint', () => {
  const related = { intervals: [{ measurementId: 'V9', lo: 150, hi: 150 }] };
  const e = evaluateMaterial(estimated(2.2, 32.9, { related }), [elongation(100)], explore);
  assert.equal(e.screened, false);
  assert.equal(e.eligible, true);
  assert.deepEqual(e.results[0].vetoedBy, ['V9']);
  // A failing own measurement vetoes nothing.
  const low = evaluateMaterial(estimated(2.2, 32.9, { related: { intervals: [{ measurementId: 'V8', lo: 40, hi: 40 }] } }), [elongation(100)], explore);
  assert.equal(low.screened, true);
});

test('estimates are invisible unless enabled, and never screen in Strict', () => {
  const off = evaluateConstraint(estimated(2.2, 32.9), elongation(100), {});
  assert.equal(off.estimated, undefined);
  assert.match(off.reason, /Not published/);
  const strict = evaluateMaterial(estimated(2.2, 32.9), [elongation(100)], { useEstimates: true, unknownPolicy: UNKNOWN_POLICY.STRICT });
  assert.equal(strict.screened, false);
  assert.equal(strict.eligible, false, 'Strict holds it out for missing data, not because of the estimate');
});

test('a material that fails on real evidence is a FAIL, never "screened"', () => {
  const m = { id: 'M2', excluded: false, gates: {}, headline: { elongationXY: { known: true, value: 5, unit: '%', interval: { lo: 5, hi: 5 } } } };
  const e = evaluateMaterial(m, [elongation(100)], explore);
  assert.equal(e.verdict, STATUS.FAIL);
  assert.equal(e.screened, false);
  assert.equal(e.usesEstimate, false);
});

test('the plausible range decides a screen, not the narrower likely range the reader sees', () => {
  // Likely 20-40%, plausibly 12-60%: a requirement of 50% fails the likely range but not the plausible one.
  const m = estimated(20, 40, { plausible: { lo: 12, hi: 60 } });
  const r = evaluateConstraint(m, elongation(50), explore);
  assert.equal(r.screened, false);
  assert.equal(r.plausible, STATUS.INDETERMINATE);
  assert.match(r.reason, /Estimated 20 to 40 %.*plausibly 12 to 60/);
  assert.equal(evaluateMaterial(m, [elongation(70)], explore).screened, true);
});

// Regression: PLA Lite (53 °C, load not stated) stayed a candidate for "heat resistance at least 100 °C",
// because a value at an unstated load was treated as bounded below only.
test('an unstated-load heat value is bracketed: a requirement above the bracket screens, never fails', () => {
  const pla = { id: 'L', excluded: false, gates: {}, headline: { hdt045: { known: true, value: 53, unit: '°C',
    interval: { lo: 53, hi: 53, kind: 'point' }, loadStated: false, loadBracket: { lo: 53, hi: 62.7, unit: '°C' } } } };
  const hdt = (value, operator = '>=') => ({ kind: 'numeric', property: 'hdt045', operator, value });
  const far = evaluateMaterial(pla, [hdt(100)], explore);
  assert.equal(far.verdict, STATUS.UNKNOWN, 'inference never becomes a FAIL');
  assert.equal(far.screened, true);
  assert.match(far.results[0].reason, /53 to 62\.7 °C, which cannot meet this requirement/);
  // Inside the bracket it stays unresolved and visible; without estimates nothing is screened.
  assert.equal(evaluateMaterial(pla, [hdt(60)], explore).screened, false);
  assert.equal(evaluateMaterial(pla, [hdt(100)], { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }).screened, false);
  // It never passes, even below its own value.
  assert.equal(evaluateConstraint(pla, hdt(50), explore).status, STATUS.INDETERMINATE);
});

test('not applicable holds a material out of Explore and never passes, and is silent without estimates', () => {
  const tpu = { id: 'T', excluded: false, gates: {}, headline: { hdt045: { known: false, missing: 'not-published', unit: '°C',
    notApplicable: { reason: 'Heat deflection is a rigid-bar test' } } } };
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 60 };
  const e = evaluateMaterial(tpu, [hdt], explore);
  assert.equal(e.verdict, STATUS.UNKNOWN);
  assert.equal(e.screened, true);
  assert.match(e.results[0].reason, /^Not applicable/);
  assert.equal(evaluateMaterial(tpu, [hdt], {}).screened, false);
});

// The availability gate. Absence of an offer is not proof a material cannot be bought: the sample
// is three Canadian retailers on one day. So a material nobody listed is held as UNKNOWN, and only
// a sampled offer that was out of stock is positive enough evidence to fail.
test('availability distinguishes "nobody sampled it" from "it was out of stock"', () => {
  const listed = { id: 'A', gates: {}, buy: { retailer: 'R', perKg: 30, accessDate: '2026-09-10', anyInStock: true } };
  const sold = { id: 'B', gates: {}, buy: { retailer: 'R', perKg: 30, accessDate: '2026-09-10', anyInStock: false } };
  const absent = { id: 'C', gates: {}, buy: null };

  const any = { kind: 'gate', gate: 'buyable' };
  const stocked = { kind: 'gate', gate: 'buyable', inStock: true };

  assert.equal(evaluateConstraint(listed, any).status, STATUS.PASS);
  assert.equal(evaluateConstraint(sold, any).status, STATUS.PASS);
  assert.equal(evaluateConstraint(absent, any).status, STATUS.UNKNOWN);

  assert.equal(evaluateConstraint(listed, stocked).status, STATUS.PASS);
  assert.equal(evaluateConstraint(sold, stocked).status, STATUS.FAIL);
  assert.equal(evaluateConstraint(absent, stocked).status, STATUS.UNKNOWN);
});

// Regression: Strict turned "could not be checked" into FAIL, so the FAIL count and every export
// mixed materials that failed a test with materials nobody had measured. The verdict now describes
// the evidence; the policy only decides eligibility.
test('strict mode reports unchecked materials as UNKNOWN, not FAIL', () => {
  const measured = { id: 'A', gates: {}, headline: { hdt045: { known: true, value: 60, unit: '°C', interval: point(60) } } };
  const unmeasured = { id: 'B', gates: {}, headline: { hdt045: { known: false, missing: 'not-published' } } };
  const cs = [{ kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 }];
  const s = runSelection([measured, unmeasured], cs, { unknownPolicy: UNKNOWN_POLICY.STRICT });
  assert.deepEqual(s.counts, { pass: 0, fail: 1, unknown: 1, screened: 0, total: 2 });
  assert.equal(s.candidates.length, 0);
  const [a, b] = s.evaluations;
  assert.deepEqual(a.failedBy, ['hdt045 >= 100']);
  assert.deepEqual(b.failedBy, []);
});

// --- hardware ---------------------------------------------------------------

const abrasive = (gate, filler) => ({ id: 'M', gates: { abrasive: gate }, facets: { reinforcement: { value: filler } }, headline: {} });

// Regression: "I have a hardened nozzle" removed the 75 materials with no abrasion guidance. More
// hardware can never make fewer materials printable.
test('owning a hardened nozzle never removes a material', () => {
  const c = { kind: 'gate', gate: 'abrasive', hardenedAvailable: true };
  for (const m of [abrasive('requires-hardened', 'carbon-fibre'), abrasive('unknown', 'undisclosed'), abrasive('unknown', 'unfilled')]) {
    assert.equal(evaluateConstraint(m, c).status, STATUS.PASS);
  }
});

test('without a hardened nozzle, a recorded requirement fails and a fibre filler stays unresolved', () => {
  const c = { kind: 'gate', gate: 'abrasive', hardenedAvailable: false };
  assert.equal(evaluateConstraint(abrasive('requires-hardened', 'glass-fibre'), c).status, STATUS.FAIL);
  assert.equal(evaluateConstraint(abrasive('unknown', 'carbon-fibre'), c).status, STATUS.UNKNOWN);
  assert.equal(evaluateConstraint(abrasive('unknown', 'unfilled'), c).status, STATUS.PASS);
  const undisclosed = evaluateConstraint(abrasive('unknown', 'undisclosed'), c);
  assert.equal(undisclosed.status, STATUS.PASS);
  assert.match(undisclosed.reason, /check the grade/);
});

// --- environment ------------------------------------------------------------

const envCtx = (records) => ({
  db: { meta: { environmentCategories: { 'organic-solvent': { kind: 'verdict', label: 'Organic solvent resistance' }, 'water-solubility': { kind: 'verdict', label: 'Water solubility' } } } },
  evidenceByMaterial: new Map([['M', records.map((r, i) => ({ id: `E${i}`, materialId: 'M', ...r }))]]),
});

// Regression: the rail asked for ['resistant', 'limited'], so PLA passed "resists solvents" on a
// single record that said its resistance was limited.
test('limited resistance does not pass a resistance requirement', () => {
  const c = { kind: 'environment', category: 'organic-solvent' };
  const m = { id: 'M' };
  assert.equal(evaluateConstraint(m, c, envCtx([{ category: 'organic-solvent', verdict: 'limited' }])).status, STATUS.INDETERMINATE);
  assert.equal(evaluateConstraint(m, c, envCtx([{ category: 'organic-solvent', verdict: 'resistant' }, { category: 'organic-solvent', verdict: 'limited' }])).status, STATUS.INDETERMINATE);
  assert.equal(evaluateConstraint(m, c, envCtx([{ category: 'organic-solvent', verdict: 'resistant' }])).status, STATUS.PASS);
  assert.equal(evaluateConstraint(m, c, envCtx([{ category: 'organic-solvent', verdict: 'not-resistant' }, { category: 'organic-solvent', verdict: 'limited' }])).status, STATUS.FAIL);
});

// Regression: "insoluble" was never an accepted verdict, so the water criterion could not pass.
test('an insoluble record satisfies the water criterion', () => {
  const c = { kind: 'environment', category: 'water-solubility' };
  assert.equal(evaluateConstraint({ id: 'M' }, c, envCtx([{ category: 'water-solubility', verdict: 'insoluble' }])).status, STATUS.PASS);
});

test('a build-material screen removes support materials', () => {
  const c = { kind: 'facet', facet: 'supportMaterial', equals: false };
  assert.equal(evaluateConstraint({ facets: { supportMaterial: { value: true } } }, c).status, STATUS.FAIL);
  assert.equal(evaluateConstraint({ facets: { supportMaterial: { value: false } } }, c).status, STATUS.PASS);
});

// SD-08: an unstated test load cannot determine a result at a specific load in either direction.
test('unstated HDT load cannot confirm either a pass or a failure', () => {
  const material={headline:{hdt045:{known:true,value:60,unit:'°C',loadStated:false}}};
  for(const value of [50,100]) assert.equal(evaluateConstraint(material,{kind:'numeric',property:'hdt045',operator:'>=',value}).status,STATUS.INDETERMINATE);
});

test('strict published bounds are evaluated correctly at the endpoint', () => {
  const lower={lo:650,hi:null,openLow:true}, upper={lo:null,hi:.8,openHigh:true};
  for(const op of ['>','>=']) assert.equal(compareInterval(lower,op,650),STATUS.PASS);
  for(const op of ['<','<=']) assert.equal(compareInterval(lower,op,650),STATUS.FAIL);
  for(const op of ['<','<=']) assert.equal(compareInterval(upper,op,.8),STATUS.PASS);
  for(const op of ['>','>=']) assert.equal(compareInterval(upper,op,.8),STATUS.FAIL);
});
