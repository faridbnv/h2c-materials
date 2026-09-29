// Evidence pairs (D107; the review of 2026-09-28, A03): two measurements share a strict point only when they describe one
// product in one condition, from one document. Hand-built measurements, each differing in one condition.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairCompatibility } from '../app/js/ui/axes.js';

const mechanical = { moisture: true, annealing: true, specimen: true };
const density = { moisture: false, annealing: false, specimen: false };
const m = (over = {}) => ({ gradeId: 'G1', direction: 'XY', moistureState: 'dry', postProcessingState: 'as-printed', anneal: null, specimenForm: 'printed', sourceId: 'S1', ...over });
const strict = (a, b, inv = { a: mechanical, b: mechanical }) => pairCompatibility(a, b, 'strict', inv);

test('one product, one condition, one document: a strict pair', () => {
  const fit = strict(m(), m());
  assert.deepEqual([fit.ok, fit.conflicts, fit.missing], [true, [], []]);
});

test('an explicit contradiction keeps a pair out of strict, and mixed exploration names it', () => {
  const cases = [
    [m(), m({ moistureState: 'conditioned' }), 'dry against conditioned'],
    [m(), m({ postProcessingState: 'annealed', anneal: { tempC: 120, hours: 16 } }), 'as-printed against annealed'],
    [m({ postProcessingState: 'annealed', anneal: { tempC: 90, hours: 4 } }), m({ postProcessingState: 'annealed', anneal: { tempC: 120, hours: 16 } }), 'two annealing schedules'],
    [m(), m({ direction: 'Z' }), 'directions XY and Z'],
    [m(), m({ specimenForm: 'moulded' }), 'printed against moulded specimens'],
    [m(), m({ sourceId: 'S2' }), 'two documents, two test recipes'],
  ];
  for (const [a, b, conflict] of cases) {
    const fit = strict(a, b);
    assert.equal(fit.ok, false, conflict);
    assert.ok(fit.conflicts.includes(conflict), `${conflict}: ${JSON.stringify(fit.conflicts)}`);
    const mixed = pairCompatibility(a, b, 'broad', { a: mechanical, b: mechanical });
    assert.deepEqual([mixed.ok, mixed.conflicts.includes(conflict)], [true, true]);
  }
});

test('an unstated condition is missing context, said so, never read as a match or a conflict', () => {
  const fit = strict(m(), m({ moistureState: 'not-stated' }));
  assert.equal(fit.ok, true);
  assert.deepEqual(fit.missing, ['moisture stated on one value only']);
  assert.deepEqual(strict(m({ postProcessingState: 'not-stated' }), m({ postProcessingState: 'not-stated' })).missing, ['treatment not stated']);
});

test('a density the registry declares unchanged by moisture and annealing may pair across states and sheets, and says so', () => {
  const fit = strict(m({ moistureState: 'not-stated', postProcessingState: 'not-stated', specimenForm: 'moulded', sourceId: 'S9', direction: 'not-applicable' }),
    m({ moistureState: 'conditioned' }), { a: density, b: mechanical });
  assert.equal(fit.ok, true, JSON.stringify(fit.conflicts));
  assert.ok(fit.basis.some((b) => /moisture does not change/.test(b)) && fit.basis.some((b) => /two of the product's sheets/.test(b)));
});
