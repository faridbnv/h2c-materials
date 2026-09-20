// Numbers a sheet prints and this reader could not read, or read as something else. Each case below reached the
// applier as a NaN or as a standard that does not exist, and each is asserted as the rule rather than as the
// document it was found on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rawNumber } from '../build/src/measurement-rules.js';
import { parseTemperature } from '../build/src/normalize/process.js';

test('a comma group that could not be a thousands separator is a decimal comma', () => {
  // A thousands separator has exactly three digits behind it and at most three in front of the first group.
  assert.equal(rawNumber('1,1128 g/cc'), 1.1128);     // four behind
  assert.equal(rawNumber('1836,740 MPa'), 1836.74);   // four in front
  assert.equal(rawNumber('1,12 g/cm3'), 1.12);        // one or two behind
});

test('a comma group that could be either is read as the thousands, and settled against the property elsewhere', () => {
  // "2,865 MPa" is a tensile modulus of 2865 on an American sheet and of 2.865 on a European one. Only the
  // property can say which, so this returns one reading and `couldBe` decides (propose.mjs).
  assert.equal(rawNumber('2,865 MPa'), 2865);
  assert.equal(rawNumber('1,238 g/cc'), 1238);
  assert.equal(rawNumber('1,234,567'), 1234567);
});

test('a tolerance is centred on its nominal setting, with or without the unit between the two', () => {
  // Nobufil prints "Print temperature 260°C ± 10" on fourteen sheets; read as a range it was 10 to 260, which is
  // what PARSE-MISMATCH refused.
  for (const text of ['260°C ± 10', '260 ± 10', '260 C +/- 10']) {
    const r = parseTemperature(text);
    assert.equal(r.min, 250, text);
    assert.equal(r.max, 270, text);
  }
});

test('a range is still a range, and a single setting is still itself', () => {
  assert.deepEqual([parseTemperature('220-240 °C').min, parseTemperature('220-240 °C').max], [220, 240]);
  assert.deepEqual([parseTemperature('210 °C').min, parseTemperature('210 °C').max], [210, 210]);
});
