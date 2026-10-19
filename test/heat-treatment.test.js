// A heat treatment at or below its polymer's annealing threshold leaves the part as printed (D153).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeHeatTreatments } from '../build/src/normalize/specimen.js';

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
