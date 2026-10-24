// WP-19: characterization of the rules of constraints.js that no earlier test reaches (docs/next/constraints-rules.md, the
// UNTESTED list), and of the reason code each kind of answer carries. Every case is asked of the old module and of the port, and
// the two must agree on everything but the fields the port adds beside the old ones; then the case says what the answer is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { importStaged, stageEngine } from '@atlas/engine';

const [ported, old] = await Promise.all([importStaged(stageEngine(['constraints', 'products', 'ledger', 'filler'])), importStaged(stageEngine([]))])
  .then(([a, b]) => [a.get('constraints'), b.get('constraints')]);

const ADDED = new Set(['reasonCode', 'constraintId']);
const stripped = (v) => {
  if (Array.isArray(v)) return v.map(stripped);
  if (v === null || typeof v !== 'object' || Object.getPrototypeOf(v) !== Object.prototype) return v;
  return Object.fromEntries(Object.entries(v).filter(([k]) => !ADDED.has(k)).map(([k, x]) => [k, stripped(x)]));
};
/** The result from the port, after checking the old module gives the same one apart from the added fields. */
function ask(call) {
  const a = call(ported);
  assert.ok(isDeepStrictEqual(stripped(a), call(old)), 'the port answers as the old module does');
  return a;
}

const numeric = { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 };
const material = (headline, extra = {}) => ({ id: 'M1', headline: { tensileModulusXY: headline }, gates: { scope: 'within', abrasive: 'unknown', drying: 'unknown' }, facets: { reinforcement: { value: 'unfilled' } }, ...extra });
const missing = { known: false, missing: 'not-published', unit: 'GPa' };
const estimate = { lo: 1, hi: 2, unit: 'GPa', plausible: { lo: 0.5, hi: 2.5 }, canScreen: false, screenRange: { lo: null, hi: null }, centre: 1.5 };

test('the closed upper bound is "at most", the open one "less than"; no interval is unknown; a kind or an operator the engine does not know throws', () => {
  assert.deepEqual(ask((c) => c.boundOf({ lo: null, hi: 5, openHigh: false })), { sign: '≤', words: 'at most' });
  assert.deepEqual(ask((c) => c.boundOf({ lo: null, hi: 5, openHigh: true })), { sign: '<', words: 'less than' });
  assert.equal(ask((c) => c.compareInterval(null, '>=', 1)), 'UNKNOWN');
  assert.throws(() => ported.compareInterval({ lo: 1, hi: 1 }, '==', 1), /Unsupported operator "=="/);
  assert.throws(() => old.compareInterval({ lo: 1, hi: 1 }, '==', 1), /Unsupported operator "=="/);
  assert.throws(() => ported.evaluateConstraint(material(missing), { kind: 'wish' }), /Unsupported constraint kind "wish"/);
  assert.throws(() => old.evaluateConstraint(material(missing), { kind: 'wish' }), /Unsupported constraint kind "wish"/);
});

test('the filler facet: not recorded is unknown, a filler in the list passes, one outside fails, a named filler says so', () => {
  const facet = { kind: 'facet', facet: 'filler', in: ['carbon-fibre', 'aramid-fibre'] };
  const bare = ask((c) => c.evaluateConstraint({ id: 'M1', gates: {} }, facet));
  assert.deepEqual([bare.status, bare.reason, bare.reasonCode], ['UNKNOWN', 'Facet not recorded', 'facet.not-recorded']);
  const carbon = ask((c) => c.evaluateConstraint({ id: 'M1', gates: {}, facets: { reinforcement: { value: 'carbon-fibre' } } }, facet));
  assert.deepEqual([carbon.status, carbon.reason, carbon.reasonCode], ['PASS', 'Recorded as carbon-fibre', 'facet.filler-recorded']);
  const glass = ask((c) => c.evaluateConstraint({ id: 'M1', gates: {}, facets: { reinforcement: { value: 'glass-fibre' } } }, facet));
  assert.deepEqual([glass.status, glass.reason], ['FAIL', 'Recorded as glass-fibre']);
  const named = ask((c) => c.evaluateConstraint({ id: 'M1', gates: {}, modifier: 'Aramid fibre', facets: { reinforcement: { value: 'undisclosed' } } }, facet));
  assert.deepEqual([named.status, named.reason], ['PASS', 'Recorded as aramid-fibre, the filler its Modifier / filler names']);
});

test('an estimate that cannot screen says so, one a record vetoes says that, a withheld one is told after the related values', () => {
  const ctx = { useEstimates: true };
  const cannot = ask((c) => c.evaluateConstraint(material({ ...missing, estimate }), numeric, ctx));
  assert.equal(cannot.reasonCode, 'numeric.estimate-cannot-screen');
  assert.match(cannot.reason, /would fail, but this estimate cannot screen/);
  const vetoed = ask((c) => c.evaluateConstraint(material({ ...missing, estimate: { ...estimate, canScreen: true, screenRange: { lo: 0, hi: 2 } }, impliedBounds: [{ lo: 4, property: 'Tensile modulus at 23 C', unit: 'GPa', measurementId: 'V7' }] }), numeric, ctx));
  assert.equal(vetoed.reasonCode, 'numeric.estimate-vetoed');
  assert.deepEqual(vetoed.vetoedBy, ['V7']);
  const withheld = ask((c) => c.evaluateConstraint(material({ ...missing, related: ['density 1.2 kg/m³ (Printed specimen, XY)'], withheld: { ownBand: { lo: 3, hi: 4 }, centre: 5 } }), numeric, ctx));
  assert.equal(withheld.reasonCode, 'numeric.related-values-only');
  assert.match(withheld.reason, /Published related values: density 1\.2 kg\/m³ \(Printed specimen, XY\)\. Its own values put it at 3 to 4 GPa once converted, where its kind's estimate is 5 GPa, so no estimate is shown\./);
});

test('an assumption, a ledger whose sheets disagree and a treatment with none each carry their code', () => {
  const assumed = ask((c) => c.evaluateConstraint(material({ known: true, value: 3.5, unit: 'GPa', assumption: true, interval: { lo: 3.5, hi: 3.5, kind: 'point' } }), numeric));
  assert.deepEqual([assumed.status, assumed.reasonCode], ['PASS', 'numeric.assumed']);
  const by = [
    { rule: 'CV90', kind: 'floor', status: 'deciding', level: 'comparable', lo: 10, hi: null },
    { rule: 'CV91', kind: 'ceiling', status: 'deciding', level: 'comparable', lo: null, hi: 5 },
  ];
  const disagree = ask((c) => c.evaluateConstraint(material({ ...missing, ledger: { lo: 10, hi: 5, openLow: false, openHigh: false, by } }), numeric));
  assert.deepEqual([disagree.status, disagree.reasonCode], ['INDETERMINATE', 'ledger.sheets-disagree']);
  assert.ok(disagree.sheetsDisagree);
  // A state with no treatment is only reached by asking directly (the engine adds the requirement for an annealed state).
  const asPrinted = ask((c) => c.evaluateConstraint({ id: 'M1', gates: {}, state: { id: 'as-printed', treatment: null, moisture: 'dry', values: {} } }, ported.TREATMENT));
  assert.deepEqual([asPrinted.status, asPrinted.reason, asPrinted.reasonCode], ['PASS', 'Used as printed', 'treatment.as-printed']);
});

test('a print gate whose reason is "No requirement published" carries that code, and no sentence of another family carries it', () => {
  const gate = { kind: 'gate', gate: 'nozzle' };
  const silent = ask((c) => c.evaluateConstraint(material(missing, { gates: { nozzle: { verdict: 'unknown', reason: 'No requirement published' } } }), gate));
  assert.deepEqual([silent.status, silent.reasonCode], ['UNKNOWN', 'gate.no-requirement-published']);
  const none = ask((c) => c.evaluateConstraint(material(missing, { gates: {} }), gate));
  assert.deepEqual([none.reason, none.reasonCode], ['No print profile recorded', 'gate.no-print-profile']);
  const odd = ask((c) => c.evaluateConstraint(material(missing, { gates: { nozzle: { verdict: 'unknown', reason: 'Something the build never wrote' } } }), gate));
  assert.equal(odd.reasonCode, undefined, 'a sentence of no family has no code');
});
