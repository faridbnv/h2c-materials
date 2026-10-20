// A heat treatment at or below its polymer's annealing threshold leaves the part as printed (D158).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeHeatTreatments } from '../build/src/normalize/specimen.js';
import { printedStateOf } from '../build/src/registry.js';
import { printsAsItsType } from '../build/src/variants.js';
import { lowerBoundsOf } from '../build/src/lower-bounds.js';

test('a headline whose lower bound takes printed bars only is floored by none whose sheet does not describe it (D161)', () => {
  const bar = (id, specimenForm, value) => ({ id, gradeId: 'G1', property: 'Elongation at yield', value, unit: '%', numeric: true, specimenForm, postProcessingState: 'as-printed', moistureState: 'dry' });
  const own = [bar('a', 'printed', 4), bar('b', 'not-stated', 9), bar('c', 'moulded', 12)];
  const def = (forms) => ({ lowerBounds: { properties: ['Elongation at yield'], loadMPa: null, excludeMoisture: [], forms } });
  assert.deepEqual(lowerBoundsOf(def(['printed']), own).map((b) => b.measurementId), ['a']);
  assert.deepEqual(lowerBoundsOf(def(['printed', 'not-stated']), own).map((b) => b.measurementId), ['a', 'b']);
  assert.deepEqual(lowerBoundsOf(def(['printed']), own, { forms: ['printed', 'not-stated'] }).map((b) => b.measurementId), ['a', 'b']);
});

test('a material prints as its polymer solidifies in a print: PLA and PET glassy, PPA glassy unless fibre-filled (D158)', () => {
  const pla = { Morphology: 'semicrystalline', 'As printed': 'prints amorphous' };
  const ppa = { Morphology: 'semicrystalline', 'As printed': 'prints amorphous unless fibre-filled' };
  assert.equal(printedStateOf(pla, 'Unfilled / unspecified'), 'glassy');
  assert.equal(printedStateOf(pla, 'Carbon fibre'), 'glassy');
  assert.equal(printedStateOf(ppa, 'Unfilled / unspecified'), 'glassy');
  assert.equal(printedStateOf(ppa, 'Glass fibre'), 'crystalline');
  assert.equal(printedStateOf({ Morphology: 'semicrystalline', 'As printed': 'crystallises while printing' }, 'Unfilled / unspecified'), 'crystalline');
  assert.equal(printedStateOf({ Morphology: 'amorphous', 'As printed': 'Not applicable' }, 'Carbon fibre'), 'glassy');
  assert.equal(printedStateOf({ Morphology: 'elastomer' }, 'Unfilled / unspecified'), 'rubbery');
});

test('a crystallising grade and a filler for looks print as their type; every other variant does not (D129, D158, D175)', () => {
  assert.equal(printsAsItsType({ variant: null }), true);
  assert.equal(printsAsItsType({ variant: 'crystallising grade' }), true);
  assert.equal(printsAsItsType({ variant: 'cosmetic dense filler' }), true);
  assert.equal(printsAsItsType({ variant: 'undisclosed dense filler' }), false);
  assert.equal(printsAsItsType({ variant: 'declared dense filler' }), false);
  assert.equal(printsAsItsType({ variant: 'luminescent pigment' }), false);
});

const row = (id, materialId, state, anneal) => ({ id, materialId, postProcessingState: state, anneal });
const threshold = new Map([['M-PLA', 55], ['M-ABS', null]]);

test('a schedule at or below the threshold is judged as printed and says what was done', () => {
  const xs = [
    row('a', 'M-PLA', 'annealed', { tempC: 55, hours: 8 }),
    row('b', 'M-PLA', 'annealed', { tempC: 50, hours: null }),
    row('c', 'M-PLA', 'annealed', { tempC: 110, hours: 0.25 }),
    row('d', 'M-PLA', 'annealed', { tempC: null, hours: null }),
    row('e', 'M-ABS', 'annealed', { tempC: 80, hours: 12 }),
    row('f', 'M-PLA', 'as-printed', null),
  ];
  assert.equal(judgeHeatTreatments(xs, (m) => threshold.get(m) ?? null), 2);
  assert.deepEqual(xs.map((x) => x.postProcessingState), ['as-printed', 'as-printed', 'annealed', 'annealed', 'annealed', 'as-printed']);
  assert.deepEqual(xs[0].heatTreatment, { tempC: 55, hours: 8, thresholdC: 55, recorded: 'annealed' });
  assert.equal(xs[0].anneal, null);
  // Above the threshold, of unstated temperature, or of a polymer with no threshold (an amorphous one): an annealing.
  for (const i of [2, 3, 4, 5]) assert.equal(xs[i].heatTreatment, undefined);
  assert.deepEqual(xs[2].anneal, { tempC: 110, hours: 0.25 });
});
