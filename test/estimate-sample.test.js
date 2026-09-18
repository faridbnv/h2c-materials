// The spread search sees a sample of the observations (D77). What it must never do: drop a measured headline,
// starve a small polymer to feed a large one, or make the build depend on anything but its inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spreadObservations } from '../build/src/estimate/gaussian.js';
import { HEAD } from '../build/src/estimate/model.js';

const key = 'density';
const head = HEAD[key];
// A pool shaped like the one the import will build: one material with a product from every manufacturer, a long
// tail of materials with one or two, and a material at the end of the identifier range with only two.
const observations = [];
for (let i = 0; i < 120; i++) observations.push({ m: { id: 'M001' }, f: `pla-${i}`, kind: i % 3 === 0 ? head : 'flexuralModulusXY', y: i });
for (let i = 0; i < 80; i++) observations.push({ m: { id: `M${String(100 + i).padStart(3, '0')}` }, f: `other-${i}`, kind: 'flexuralModulusXY', y: i });
for (let i = 0; i < 2; i++) observations.push({ m: { id: 'M999' }, f: `pom-${i}`, kind: 'mouldedDensity', y: i });

test('every measured headline survives the sample', () => {
  const sampled = spreadObservations(key, observations, 60);
  const heads = observations.filter((o) => o.kind === head);
  assert.equal(sampled.filter((o) => o.kind === head).length, heads.length);
  assert.ok(sampled.length <= 60 || sampled.length === heads.length, `${sampled.length}`);
});

test('a material with two products is heard before one with a hundred is heard twice', () => {
  const sampled = spreadObservations(key, observations, 80);
  assert.ok(sampled.some((o) => o.m.id === 'M999'), 'the small material lost its only observations');
  const perMaterial = new Map();
  for (const o of sampled.filter((o) => o.kind !== head)) perMaterial.set(o.m.id, (perMaterial.get(o.m.id) ?? 0) + 1);
  assert.ok(Math.max(...perMaterial.values()) - Math.min(...perMaterial.values()) <= 1, [...perMaterial].join(' '));
});

test('the sample is a stride, not a draw: the same observations give the same sample', () => {
  const a = spreadObservations(key, observations, 60).map((o) => `${o.m.id}|${o.f}|${o.kind}`);
  const b = spreadObservations(key, [...observations], 60).map((o) => `${o.m.id}|${o.f}|${o.kind}`);
  assert.deepEqual(a, b);
});

test('below the cap nothing is sampled at all, so the build as it stands is unchanged', () => {
  const all = spreadObservations(key, observations);
  const capped = spreadObservations(key, observations, 10000);
  assert.deepEqual(capped, all);
});

test('the thinning that was always there still holds: one kind per formulation beside its headline', () => {
  const pair = [
    { m: { id: 'M1' }, f: 'p1', kind: head }, { m: { id: 'M1' }, f: 'p1', kind: 'flexuralModulusXY' },
    { m: { id: 'M2' }, f: 'p2', kind: 'flexuralModulusXY' },
  ];
  assert.deepEqual(spreadObservations(key, pair).map((o) => o.kind), [head, 'flexuralModulusXY']);
});
