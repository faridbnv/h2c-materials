// The pure helpers of scripts/audit/table-detectors.mjs: the negation matcher, the qualifier vocabulary and the product
// name normaliser. The detectors themselves read the whole database and are judged by their candidates, not by a test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { negationHits, qualifiersOf, gradeQualifiers, productNames } from '../scripts/audit/table-detectors.mjs';

test('negationHits separates denials from conditions', () => {
  assert.deepEqual(negationHits('Not required (Closure Chamber: No needed)').strong, ['not', 'no']);
  assert.deepEqual(negationHits('Nicht benötigt, 50 °C empfohlen').strong, ['nicht']);
  assert.deepEqual(negationHits('Dry only if wet').weak, ['only if']);
  assert.deepEqual(negationHits('40–60 °C Heated Bed Optional').weak, ['optional']);
  assert.deepEqual(negationHits('All specimens were annealed at 80 °C for 12 h'), { strong: [], weak: [] });
});

test('negationHits ignores the missing-state phrases', () => {
  assert.deepEqual(negationHits('Not published'), { strong: [], weak: [] });
  assert.deepEqual(negationHits('Not applicable'), { strong: [], weak: [] });
});

test('qualifiersOf finds the words that change a formulation, and not "Polycarbonate" for carbon', () => {
  assert.deepEqual([...qualifiersOf('PLA Silk')], ['silk']);
  assert.deepEqual([...qualifiersOf('Hyper Speed PLA Pro')].sort(), ['high-speed', 'tough/pro/+']);
  assert.deepEqual([...qualifiersOf('Polycarbonate')], []);
  assert.deepEqual([...qualifiersOf('PA6-CF')], ['carbon']);
});

test('gradeQualifiers ignores a Composition that is a bed-surface line', () => {
  const g = { product: 'PETG', variant: 'Not applicable', composition: 'Build Surface Material Tempered glass, PEI, Carbon fiber plate (p. 2, as the sheet states it)' };
  assert.equal(gradeQualifiers(g).comp.size, 0);
  assert.deepEqual([...gradeQualifiers({ product: 'PETG', variant: 'Not applicable', composition: '20 % carbon fibre' }).comp], ['carbon']);
});

test('productNames drops the maker and keeps the trade name', () => {
  const n = productNames('Polymaker PolyLite™ PLA Pro', 'Polymaker');
  assert.equal(n.full, 'polylite pla pro');
  assert.deepEqual(n.distinctive, ['polylite']);
});
