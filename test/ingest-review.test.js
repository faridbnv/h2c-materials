// What review.mjs holds back for a person, asserted on fixtures. Each of these found a real defect in b19 that
// would otherwise have entered as data, and each is a rule rather than a count: a live-corpus assertion would
// pass or fail with whatever batch ran last and would say nothing about whether the rule is right.
import test from 'node:test';
import assert from 'node:assert/strict';
import { holdsBack } from '../scripts/ingest/review.mjs';

const measurement = (row, evidence = {}) => ({ kind: 'measurement', id: 'm01', row, evidence, confidence: 1 });
const amorphousUnfilled = { window: { matrix: 'amorphous', fill: 'unfilled' } };

test('a modulus a thousandth of what any polymer reaches is held for a person', () => {
  // MatterHackers prints "Flexural Modulus 3.8 MPa" on its PLA sheet, which is its own slip for GPa.
  const held = holdsBack(measurement({ Property: 'Flexural modulus', 'Normalized value': '0.0038', 'Normalized unit': 'GPa' }), amorphousUnfilled);
  assert.ok(held.some((r) => /outside anything this property reaches/.test(r)), held.join(' | '));
});

test('a value inside its window is not held', () => {
  const held = holdsBack(measurement({ Property: 'Flexural modulus', 'Normalized value': '2.4', 'Normalized unit': 'GPa' }), amorphousUnfilled);
  assert.deepEqual(held, []);
});

test('a window judged at "any" is not the window the reading was judged by', () => {
  // Without the proposal's own matrix and fill, every row is weighed at the widest window there is, which is the
  // one that catches nothing. 0.0038 GPa passes a window drawn for elastomers and fails the one for a PLA.
  const elastomer = holdsBack(measurement({ Property: 'Flexural modulus', 'Normalized value': '0.0038', 'Normalized unit': 'GPa' }), { window: { matrix: 'elastomer', fill: 'any' } });
  assert.deepEqual(elastomer, []);
});

test('a property that means nothing for this kind of material says so, rather than blaming the number', () => {
  // An HDT on an elastomer is always flagged (W0059): ISO 75 needs a modulus near 225 MPa to bend the bar at
  // all. Telling a reviewer the number is out of range sends them to check the wrong thing.
  const held = holdsBack(measurement({ Property: 'HDT', 'Normalized value': '52', 'Normalized unit': '°C' }), { window: { matrix: 'elastomer', fill: 'unfilled' } });
  assert.equal(held.length, 1);
  assert.ok(/no meaningful heat deflection temperature/.test(held[0]), held[0]);
  assert.ok(!/outside anything/.test(held[0]), 'an always-flag window is not a failed bound');
});

test('a unit the page prints longer than the row records is held: the exponent is a factor of a thousand', () => {
  // "Notched Izod Impact 7.6J/M2" and the longest unit the lexicon knows inside it is J/m.
  const held = holdsBack(measurement(
    { Property: 'Izod impact strength', 'Raw unit': 'J/M', 'Normalized value': '7.6', 'Normalized unit': 'J/m' },
    { text: 'Notched Izod Impact 7.6J/M2 ISO 180' },
  ), {});
  assert.ok(held.some((r) => /the page prints "J\/M2"/.test(r)), held.join(' | '));
});

test('a unit the page prints as the row records it is not held, superscript or not', () => {
  for (const text of ['Notched Izod Impact 7.6 kJ/m² ISO 180', 'Density 1.24 g/cm³ ISO 1183']) {
    const unit = /kJ/.test(text) ? 'kJ/m²' : 'g/cm³';
    assert.deepEqual(holdsBack(measurement({ Property: 'Density', 'Raw unit': unit, 'Normalized value': '1240', 'Normalized unit': 'kg/m³' }, { text }), {}), []);
  }
});
