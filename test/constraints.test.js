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

test('a mean ± band is judged on its mean, and a threshold inside the band is flagged close to the limit (D54)', () => {
  const m = { id: 'M1', headline: { tensileStrengthXY: {
    known: true, value: 35, unit: 'MPa', uncertainty: 4,
    interval: { lo: 31, hi: 39, kind: 'uncertainty' }, measurementId: 'V1',
  } } };
  const at = (operator, value) => evaluateConstraint(m, { kind: 'numeric', property: 'tensileStrengthXY', operator, value });
  assert.equal(at('>=', 33).status, STATUS.PASS);
  assert.equal(at('>=', 33).closeToLimit, true);
  assert.match(at('>=', 33).reason, /Close to the limit/);
  assert.equal(at('>=', 36).status, STATUS.FAIL);
  assert.equal(at('>=', 36).closeToLimit, true);
  assert.equal(at('>=', 30).closeToLimit, false);
  assert.equal(at('<=', 35).status, STATUS.PASS);
  // A published range is still a range.
  const r = { id: 'M2', headline: { tensileStrengthXY: { known: true, value: 42, unit: 'MPa', interval: { lo: 42, hi: 52, kind: 'range' }, measurementId: 'V2' } } };
  const inRange = evaluateConstraint(r, { kind: 'numeric', property: 'tensileStrengthXY', operator: '>=', value: 45 });
  assert.equal(inRange.status, STATUS.INDETERMINATE);
  assert.match(inRange.reason, /straddles/);
});

test('missing data is UNKNOWN and never zero', () => {
  const m = { id: 'M1', headline: { hdt045: { known: false, missing: 'not-published' } } };
  const r = evaluateConstraint(m, { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 });
  assert.equal(r.status, STATUS.UNKNOWN);
  assert.equal(r.observed, undefined, 'no value is invented for a missing measurement');
});

test('a value published without its load decides only as published, and says so', () => {
  // A product view carries such a value only when the reader includes values published that way (D84, products.js).
  const m = { id: 'M1', headline: { hdt045: {
    known: true, value: 186, unit: '°C', caveat: 'load-not-stated', level: 'as-published', interval: point(186), measurementId: 'V2',
  } } };
  const r = evaluateConstraint(m, { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 });
  assert.equal(r.status, STATUS.PASS);
  assert.match(r.reason, /^Published 186 °C, test load not stated/);
});

test('a chamber recommendation does not fail a candidate', () => {
  const required = { id: 'A', gates: { chamber: { verdict: 'exceeds', reason: 'r' } } };
  const recommended = { id: 'B', gates: { chamber: { verdict: 'exceeds-recommended', reason: 'r' } } };
  assert.equal(evaluateConstraint(required, { kind: 'gate', gate: 'chamber' }).status, STATUS.FAIL);
  assert.equal(evaluateConstraint(recommended, { kind: 'gate', gate: 'chamber' }).status, STATUS.INDETERMINATE);
});

// A maker's window says any setting in it works (D151): one whose low end the H2C covers passes, flagged by its verdict
// and reason; one it reaches only at its bottom edge is on the line, unresolved, for the nozzle, the bed and the chamber.
test('a window covered at its low end passes, and one reached only at its edge is on the line', () => {
  for (const gate of ['nozzle', 'bed', 'chamber']) {
    const low = evaluateConstraint({ id: 'C', gates: { [gate]: { verdict: 'within-low-end', reason: 'At the low end' } } }, { kind: 'gate', gate });
    assert.equal(low.status, STATUS.PASS, gate);
    assert.equal(low.reason, 'At the low end', gate);
    assert.equal(low.onTheLine, undefined, gate);
    const edge = evaluateConstraint({ id: 'C', gates: { [gate]: { verdict: 'edge', reason: 'r' } } }, { kind: 'gate', gate });
    assert.deepEqual([edge.status, edge.onTheLine], [STATUS.INDETERMINATE, true], gate);
  }
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

const estimated = (lo, hi, { canScreen = true, impliedBounds = [], plausible = null } = {}) => ({
  id: 'M1', excluded: false, gates: {},
  headline: { elongationXY: { known: false, missing: 'not-published', unit: '%', impliedBounds,
    estimate: { kind: 'model', strength: 'family', precision: 'fair', lo, hi, centre: (lo + hi) / 2, plausible: plausible ?? { lo, hi },
      unit: '%', basis: 'the family model only: PLA', method: 'Gaussian model', evidence: [],
      canScreen, screenLimit: canScreen ? null : 'family-model estimates of this property are not certified to screen: only 3 held cases (20 needed)' } } },
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
  assert.match(e.results[0].reason, /Hidden; not measured/);
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
  assert.match(e.results[0].reason, /not certified to screen/);
});

// Regression, found while designing this model: a class envelope screened CPE out of "elongation at
// least 100%" although its own data sheet reports 150% in an unstated direction.
test('a measurement that bounds the headline from below and meets the requirement vetoes a screen', () => {
  const impliedBounds = [{ measurementId: 'V9', property: 'Elongation at break', direction: 'unknown', lo: 150, unit: '%' }];
  const e = evaluateMaterial(estimated(2.2, 32.9, { impliedBounds }), [elongation(100)], explore);
  assert.equal(e.screened, false);
  assert.equal(e.eligible, true);
  assert.deepEqual(e.results[0].vetoedBy, ['V9']);
  // A failing own measurement vetoes nothing.
  const low = evaluateMaterial(estimated(2.2, 32.9, { impliedBounds: [{ measurementId: 'V8', property: 'Elongation at break', lo: 40, unit: '%' }] }), [elongation(100)], explore);
  assert.equal(low.screened, true);
  // A lower bound says nothing about an upper requirement: at most 10% is still screened by a range of 20-40%.
  const upper = evaluateMaterial(estimated(20, 40, { impliedBounds }), [elongation(10, '<=')], explore);
  assert.equal(upper.screened, true);
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

// D148 (the screening review, C04 and C20): a property that does not apply is a definition, not an inference, so it holds
// a material out of Include whether estimates are on or off, and says so in its own words. It stayed listed with
// estimates off, its reason "Not published in the sampled sources; ask the maker", for an elastomer's HDT.
test('not applicable holds a material out of Include with estimates on or off, never passes, and says "Does not apply"', () => {
  const tpu = { id: 'T', excluded: false, gates: {}, headline: { hdt045: { known: false, missing: 'not-published', unit: '°C',
    notApplicable: { reason: 'Heat deflection is a rigid-bar test' } } } };
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 60 };
  for (const useEstimates of [true, false]) {
    const e = evaluateMaterial(tpu, [hdt], { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates });
    assert.equal(e.verdict, STATUS.UNKNOWN, 'never a FAIL');
    assert.equal(e.screened, true, `hidden with estimates ${useEstimates ? 'on' : 'off'}`);
    assert.equal(e.eligible, false);
    assert.equal(e.results[0].notApplicable, true);
    assert.match(e.results[0].reason, /^Does not apply: Heat deflection is a rigid-bar test/);
    assert.doesNotMatch(e.results[0].reason, /Not published|ask the maker/);
  }
  // Leave out holds it out for missing data, as it holds every unresolved material: never as screened.
  const strict = evaluateMaterial(tpu, [hdt], {});
  assert.equal(strict.screened, false);
  assert.equal(strict.eligible, false);
  assert.match(strict.results[0].reason, /^Does not apply/);
});

// D148 (the screening review, C09): Bambu Lab PLA Silk+ publishes HDT only after annealing, at 60 °C, and was offered
// annealing for a 100 °C bracket. A value in another state that misses the requirement too says so, and offers nothing.
test('a value published only after annealing that also misses the requirement offers no annealing', () => {
  const view = (value) => ({ id: 'P', excluded: false, gates: {}, state: { id: 'as-printed', treatment: null, moisture: 'dry' },
    headline: { hdt045: { known: false, missing: 'not-published', unit: '°C', elsewhere: [{ stateId: 'annealed', treatment: { tempC: 80, hours: 2 }, moisture: 'dry', value }] } } });
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 };
  const misses = evaluateConstraint(view(60), hdt, {});
  assert.equal(misses.status, STATUS.UNKNOWN);
  assert.match(misses.reason, /^Published only after annealing at 80 °C for 2 h \(60 °C\), which also misses it, so annealing would not help$/);
  assert.doesNotMatch(misses.reason, /Allow annealing/);
  const meets = evaluateConstraint(view(120), hdt, {});
  assert.match(meets.reason, /\(120 °C\), and this product is judged as printed\. Allow annealing under Part condition to use it$/);
});

// D148 (the screening review, C07): "Why the rest were excluded" counts a hide only where the page hides the material,
// on its own hide. Outdoor's HDT line counted 22 where the page hid 14: the first product that did not fail HDT was
// hidden on it, though the material failed another requirement.
test('why excluded counts a hide only for a material the whole question hides, and never for a reported requirement', () => {
  const elastomer = (id, rho) => ({ id, excluded: false, gates: {}, headline: {
    hdt045: { known: false, missing: 'not-published', unit: '°C', notApplicable: { reason: 'HDT is a rigid-bar test.' } },
    density: { known: true, value: rho, unit: 'kg/m³', interval: point(rho) } } });
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 };
  const light = { kind: 'numeric', property: 'density', operator: '<=', value: 1500 };
  const ctx = { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: false };
  // A is hidden on HDT alone; B fails density, so the page lists it among the failures, not as hidden.
  const [h] = explainExclusions([elastomer('A', 1200), elastomer('B', 1900)], [hdt, light], ctx).filter((r) => r.constraint === hdt);
  assert.equal(h.screened, 1);
  assert.equal(h.screenedNotApplicable, 1);
  assert.equal(h.screenedByPolymer, 0);
  // Reported, not required, it hides nothing and is counted as hiding nothing.
  const [soft] = explainExclusions([elastomer('A', 1200)], [{ ...hdt, mandatory: false }, light], ctx);
  assert.equal(soft.screened, 0);
});

// The availability gate. Absence of an offer is not proof a material cannot be bought: the sample
// is a few Canadian retailers on the days they were read. So a material nobody listed is held as UNKNOWN, and only
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
  assert.match(undisclosed.reason, /check the product/);
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
test('strict published bounds are evaluated correctly at the endpoint', () => {
  const lower={lo:650,hi:null,openLow:true}, upper={lo:null,hi:.8,openHigh:true};
  for(const op of ['>','>=']) assert.equal(compareInterval(lower,op,650),STATUS.PASS);
  for(const op of ['<','<=']) assert.equal(compareInterval(lower,op,650),STATUS.FAIL);
  for(const op of ['<','<=']) assert.equal(compareInterval(upper,op,.8),STATUS.PASS);
  for(const op of ['>','>=']) assert.equal(compareInterval(upper,op,.8),STATUS.FAIL);
});

// ---------------------------------------------------------------------------------------------------------------------
// On the line (D152): a value measured the way the requirement asks that misses the limit by less than its headline's
// test scatter is unresolved, and one that meets it by less passes with a thin margin.

const SCATTER = { db: { registry: { headlines: [
  { key: 'tensileModulusXY', testScatter: { value: 10, is: 'relative' } },
  { key: 'hdt045', testScatter: { value: 5, is: 'absolute' } },
  { key: 'density', testScatter: { value: 2, is: 'relative' } },
  { key: 'charpyNotched', testScatter: null },
] } } };
const valued = (property, value, unit, extra = {}) => ({ id: 'M1', headline: { [property]: { known: true, value, unit, interval: point(value), measurementId: 'V1', ...extra } } });
const ask = (m, property, operator, value, ctx = SCATTER) => evaluateConstraint(m, { kind: 'numeric', property, operator, value }, ctx);

test('a value just short of the limit is on the line, at the scatter\'s edge and no further (D152)', () => {
  const at = (v) => ask(valued('tensileModulusXY', v, 'GPa'), 'tensileModulusXY', '>=', 5);
  assert.deepEqual([at(4.95).status, at(4.95).onTheLine], [STATUS.INDETERMINATE, true]);
  assert.equal(at(4.95).reason, 'Published 4.95 GPa, just under 5 GPa: within the test scatter (10 %), so on the line; one test bar or a word with the maker settles it');
  assert.deepEqual([at(4.5).status, at(4.5).onTheLine], [STATUS.INDETERMINATE, true], '5 x 0.9 is the edge, and on the line');
  assert.deepEqual([at(4.49).status, at(4.49).onTheLine], [STATUS.FAIL, undefined]);
  // Heat deflection's scatter is 5 °C; density's 2 %, "at most".
  const hdt = (v) => ask(valued('hdt045', v, '°C'), 'hdt045', '>=', 100);
  assert.deepEqual([hdt(95).status, hdt(94.9).status], [STATUS.INDETERMINATE, STATUS.FAIL]);
  assert.match(hdt(97).reason, /just under 100 °C: within the test scatter \(5 °C\), so on the line/);
  const rho = (v) => ask(valued('density', v, 'kg/m³'), 'density', '<=', 1250);
  assert.deepEqual([rho(1275).status, rho(1275.1).status], [STATUS.INDETERMINATE, STATUS.FAIL]);
  assert.match(rho(1260).reason, /^Published 1,260 kg\/m³, just over 1,250 kg\/m³: within the test scatter \(2 %\)/);
  // A strict "more than" fails at the limit itself, which is on the line.
  assert.equal(ask(valued('tensileModulusXY', 5, 'GPa'), 'tensileModulusXY', '>', 5).status, STATUS.INDETERMINATE);
});

test('a value that meets the limit within the scatter passes with a thin margin, and never loses its pass (D152)', () => {
  const at = (v) => ask(valued('tensileModulusXY', v, 'GPa'), 'tensileModulusXY', '>=', 5);
  for (const v of [5, 5.2, 5.5]) assert.deepEqual([at(v).status, at(v).thinMargin], [STATUS.PASS, true], `${v}`);
  assert.match(at(5.2).reason, /\. A thin margin: within the test scatter \(10 %\) of 5 GPa$/);
  assert.deepEqual([at(5.51).status, at(5.51).thinMargin], [STATUS.PASS, undefined]);
  const rho = (v) => ask(valued('density', v, 'kg/m³'), 'density', '<=', 1250);
  assert.deepEqual([rho(1225).thinMargin, rho(1224).thinMargin], [true, undefined]);
});

test('a range, a bound, an assumption, a material\'s median and a headline with no scatter keep today\'s rule (D152)', () => {
  const r = { id: 'M1', headline: { tensileModulusXY: { known: true, value: 4.6, unit: 'GPa', interval: range(4.6, 4.9), measurementId: 'V1' } } };
  assert.deepEqual([ask(r, 'tensileModulusXY', '>=', 5).status, ask(r, 'tensileModulusXY', '>=', 5).onTheLine], [STATUS.FAIL, undefined]);
  const bound = valued('tensileModulusXY', 4.9, 'GPa', { interval: { lo: null, hi: 4.9, openHigh: true } });
  assert.equal(ask(bound, 'tensileModulusXY', '>=', 5).status, STATUS.FAIL);
  assert.equal(ask(valued('tensileModulusXY', 4.95, 'GPa', { assumption: true }), 'tensileModulusXY', '>=', 5).status, STATUS.FAIL);
  assert.equal(ask(valued('tensileModulusXY', 4.95, 'GPa', { spread: { n: 3 } }), 'tensileModulusXY', '>=', 5).status, STATUS.FAIL);
  assert.equal(ask(valued('charpyNotched', 4.9, 'kJ/m²'), 'charpyNotched', '>=', 5).status, STATUS.FAIL);
  assert.equal(ask(valued('tensileModulusXY', 4.95, 'GPa'), 'tensileModulusXY', '>=', 5, {}).status, STATUS.FAIL, 'no registry, no scatter');
});

test('a mean ± band on the line says so once, with its closeness to the limit (D152 and D54)', () => {
  const m = valued('tensileModulusXY', 4.8, 'GPa', { uncertainty: 0.3, interval: { lo: 4.5, hi: 5.1, kind: 'uncertainty' } });
  const e = ask(m, 'tensileModulusXY', '>=', 5);
  assert.deepEqual([e.status, e.onTheLine, e.closeToLimit], [STATUS.INDETERMINATE, true, true]);
  assert.equal(e.reason, 'Published 4.8 ± 0.3 GPa, just under 5 GPa: close to the limit, inside its published scatter and the test scatter (10 %), so on the line; one test bar or a word with the maker settles it');
  const pass = ask(valued('tensileModulusXY', 5.1, 'GPa', { uncertainty: 0.3, interval: { lo: 4.8, hi: 5.4, kind: 'uncertainty' } }), 'tensileModulusXY', '>=', 5);
  assert.deepEqual([pass.status, pass.thinMargin, pass.closeToLimit], [STATUS.PASS, true, true]);
  assert.match(pass.reason, /Close to the limit, a thin margin: the threshold is inside the published scatter and the test scatter \(10 %\)/);
});

test('on the line never creates a pass, and a thin margin never removes one, over a sweep of values and limits (D152)', () => {
  for (const [property, unit] of [['tensileModulusXY', 'GPa'], ['hdt045', '°C'], ['density', 'kg/m³']]) {
    for (const operator of ['>=', '>', '<=', '<']) {
      for (let limit = 1; limit <= 1500; limit *= 3.7) {
        for (let k = 0; k <= 40; k++) {
          const v = Number((limit * (0.8 + k * 0.01)).toFixed(4));
          const without = ask(valued(property, v, unit), property, operator, limit, {}).status;
          const withScatter = ask(valued(property, v, unit), property, operator, limit).status;
          if (withScatter === STATUS.PASS) assert.equal(without, STATUS.PASS, `${property} ${v} ${operator} ${limit}: a pass the scatter made`);
          if (without === STATUS.PASS) assert.equal(withScatter, STATUS.PASS, `${property} ${v} ${operator} ${limit}: a pass the scatter took`);
          if (without !== withScatter) assert.deepEqual([without, withScatter], [STATUS.FAIL, STATUS.INDETERMINATE]);
        }
      }
    }
  }
});
