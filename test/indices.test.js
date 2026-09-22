// Performance-index and Pareto tests.
//
// The index slopes are the load-bearing part: an index of the form P^n / rho plots as a straight
// line of slope 1/n on log-log axes, and a line drawn at the wrong slope silently misranks every
// candidate. Each index's drawn geometry is checked against the slope it declares.
//
// The Pareto tests also pin down that a point missing either coordinate is excluded from the front
// rather than treated as zero, which would put it on the frontier by accident.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INDICES, indexById, indexValue, selectionLine, countAbove, rankByIndex, PRICE_CAVEAT, priceCaveat } from '../app/js/engine/indices.js';
import { paretoFront, sortFront } from '../app/js/engine/pareto.js';

const mat = (id, E, rho, sigma, price) => ({
  id,
  headline: {
    tensileModulusXY: E == null ? { known: false } : { known: true, value: E },
    density: rho == null ? { known: false } : { known: true, value: rho },
    tensileStrengthXY: sigma == null ? { known: false } : { known: true, value: sigma },
    priceCADkg: price == null ? { known: false } : { known: true, value: price },
  },
});

// The wiki states this directly for the beam case: a guideline of slope 2 defines the grid of
// lines for E^(1/2)/rho. Every index's drawn line must match its declared slope.
test('every selection line has the slope the index declares', () => {
  for (const index of INDICES) {
    const [p1, p2] = selectionLine(index, 0.01, [1000, 2000]);
    const measured = (Math.log10(p2.y) - Math.log10(p1.y)) / (Math.log10(p2.x) - Math.log10(p1.x));
    assert.ok(Math.abs(measured - index.slope) < 1e-9, `${index.id}: drew slope ${measured}, declared ${index.slope}`);
  }
});

test('the classic three stiffness indices have slopes 1, 2 and 3', () => {
  assert.equal(indexById('tie-stiffness').slope, 1);
  assert.equal(indexById('beam-stiffness').slope, 2);
  assert.equal(indexById('panel-stiffness').slope, 3);
});

test('index value is computed, and is null when any input is missing', () => {
  const m = mat('A', 4, 1000);
  assert.ok(Math.abs(indexValue(m, indexById('tie-stiffness')) - 0.004) < 1e-12);
  assert.ok(Math.abs(indexValue(m, indexById('beam-stiffness')) - 0.002) < 1e-12);
  assert.equal(indexValue(mat('B', null, 1000), indexById('tie-stiffness')), null);
  assert.equal(indexValue(mat('C', 4, null), indexById('tie-stiffness')), null);
});

test('a cost index needs a price and returns null without one', () => {
  const withPrice = mat('A', 4, 1000, 100, 50);
  const without = mat('B', 4, 1000, 100, null);
  assert.ok(indexValue(withPrice, indexById('beam-stiffness-cost')) > 0);
  assert.equal(indexValue(without, indexById('beam-stiffness-cost')), null);
});

test('a material on the line counts as above it', () => {
  const idx = indexById('tie-stiffness');
  const ms = [mat('A', 4, 1000), mat('B', 2, 1000), mat('C', 8, 1000)];
  assert.equal(countAbove(ms, idx, 0.004), 2, 'A sits exactly on M=0.004 and C is above it');
  assert.equal(rankByIndex(ms, idx)[0].material.id, 'C');
});

test('a material missing an input is ranked nowhere rather than ranked last', () => {
  const ms = [mat('A', 4, 1000), mat('B', null, 1000)];
  const ranked = rankByIndex(ms, indexById('tie-stiffness'));
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].material.id, 'A');
});

test('pareto front for light and stiff: minimise x, maximise y', () => {
  const pts = [
    { id: 'light-stiff', x: 1000, y: 5 },
    { id: 'heavy-stiff', x: 2000, y: 5 },
    { id: 'light-floppy', x: 1000, y: 2 },
    { id: 'dominated', x: 1500, y: 3 },
    { id: 'heaviest-stiffest', x: 2500, y: 9 },
  ];
  const front = paretoFront(pts, 'min', 'max').map((p) => p.id).sort();
  assert.deepEqual(front, ['heaviest-stiffest', 'light-stiff']);
});

test('points missing either coordinate are excluded from the front, not treated as zero', () => {
  const pts = [{ id: 'A', x: 1000, y: 5 }, { id: 'B', x: 1000, y: null }, { id: 'C', x: undefined, y: 9 }];
  assert.deepEqual(paretoFront(pts, 'min', 'max').map((p) => p.id), ['A']);
});

test('the front sorts for drawing', () => {
  const pts = [{ x: 3, y: 1 }, { x: 1, y: 5 }, { x: 2, y: 3 }];
  assert.deepEqual(sortFront(pts, 'min').map((p) => p.x), [1, 2, 3]);
});

test('the price caveat counts the materials it is shown for', () => {
  const ms = [mat('a', 3, 1200, 50, 40), mat('b', 3, 1200, 50, null), mat('c', 3, 1200, 50, 30)];
  assert.equal(priceCaveat(ms), 'Price is available for 2 of 3 materials.');
  assert.ok(INDICES.filter((i) => i.costForm).every((i) => i.caveats.includes(PRICE_CAVEAT)));
});
