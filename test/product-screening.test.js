import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateProducts } from '../app/js/engine/constraints.js';
import { productHeadline } from '../app/js/engine/products.js';
import { sortRows, toCSV, productsCSV } from '../app/js/ui/table.js';
import { useRegistry } from '../app/js/ui/registry.js';
import { modelWith } from '../build/src/estimate/model.js';
import { snapshot, rawObservations } from '../build/src/estimate/observations.js';
import { certifyProductCases, wrongRateUpper, partition, screeningGroups, screeningTraining } from '../build/src/estimate/product-screening.js';

const ctx = { unknownPolicy: 'exploration', useEstimates: true };
const missing = { known: false, unit: 'GPa', missing: 'not-published' };
const material = { id: 'M1', headline: { tensileModulusXY: missing, hdt045: { ...missing, unit: '°C' } },
  summary: { tensileModulusXY: { n: 1 } }, gates: {} };
const v = (value) => ({ value, level: 'comparable' });
const stiff = { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 5 };
const hot = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 90 };
const prediction = (lo = 1, hi = 3, centre = 2) => ({ kind: 'product-model', centre, lo, hi, unit: 'GPa',
  plausible: { lo, hi }, screenRange: { lo, hi }, canScreen: true, screening: { context: 'as-printed+dry', maxNumericTests: 5 },
  evidence: [], screenLimit: 'test certificate' });
const grade = (id, values = {}, estimates = {}) => ({ id, materialId: 'M1', headline: values, estimate: estimates,
  print: { profileIds: ['P1'], ...Object.fromEntries(['nozzle', 'bed', 'chamber'].map((a) => [a, { verdict: 'within', reason: 'within' }])) },
  states: [{ id: 'as-printed', treatment: null, moisture: 'dry', values }] });
const run = (gs, cs = [stiff], context = ctx) => evaluateProducts(material, gs, cs, context);

test('twins and repeated source bytes remain one independent screening group', () => {
  const raw = ['F1', 'F2', 'F2', 'F3', 'F4'].map((f, i) => ({ f, items: [{ measurementId: `V${i}` }] }));
  const measurements = ['S1', 'S2', 'S3', 'S3', 'S4'].map((sourceId, i) => ({ id: `V${i}`, sourceId }));
  const sources = ['S1', 'S2', 'S3', 'S4'].map((id, i) => ({ id, sha256: (i < 2 ? 'a' : i === 2 ? 'b' : 'c').repeat(64) }));
  const groups = screeningGroups(raw, measurements, sources);
  assert.equal(groups.get('F1'), groups.get('F2'));
  assert.equal(groups.get('F2'), groups.get('F3'));
  assert.notEqual(groups.get('F1'), groups.get('F4'));
});

test('product predictions survive measured sibling coverage and never overwrite a measured value', () => {
  const g = grade('G2', {}, { tensileModulusXY: prediction() });
  assert.equal(productHeadline(material, g, 'tensileModulusXY', ctx).estimate.centre, 2);
  g.states[0].values.tensileModulusXY = v(6);
  assert.equal(productHeadline(material, g, 'tensileModulusXY', ctx).value, 6);
  assert.equal(productHeadline(material, g, 'tensileModulusXY', ctx).estimate, undefined);
});

test('AND requirements belong to one product; a failure dominates missing evidence and preferences do not exclude', () => {
  assert.equal(run([grade('G1', { tensileModulusXY: v(6), hdt045: v(75) }), grade('G2', { tensileModulusXY: v(3), hdt045: v(110) })], [stiff, hot]).verdict, 'FAIL');
  assert.equal(run([grade('G1', { tensileModulusXY: v(3) })], [stiff, hot]).verdict, 'FAIL');
  assert.equal(run([grade('G1', { tensileModulusXY: v(6) })], [stiff, { ...hot, mandatory: false }]).verdict, 'PASS');
});

test('all unresolved products must be screened; crossing a threshold and insufficient calibration retain UNKNOWN', () => {
  const failed = grade('G1', { tensileModulusXY: v(2) });
  const low = grade('G2', {}, { tensileModulusXY: prediction() });
  assert.equal(run([failed, low]).screened, true);
  const crossing = grade('G3', {}, { tensileModulusXY: prediction(1, 5.06) });
  assert.equal(run([failed, low, crossing]).screened, false);
  low.estimate.tensileModulusXY.canScreen = false;
  assert.equal(run([low]).eligible, true);
  assert.equal(run([low]).verdict, 'UNKNOWN');
});

test('uncertified bounds and incompatible printing/service states have no exclusion permission', () => {
  const low = grade('G1', {}, { tensileModulusXY: prediction(), hdt045: { ...prediction(30, 60), unit: '°C' } });
  low.estimate.tensileModulusXY.canScreen = false;
  low.estimate.hdt045.canScreen = false;
  assert.equal(run([low], [stiff, hot]).screened, false);
  assert.equal(run([low], [stiff, { kind: 'gate', gate: 'drying' }]).screened, false);
  low.estimate.tensileModulusXY.canScreen = true;
  low.print.nozzle.verdict = 'unknown';
  assert.equal(run([low], [stiff]).screened, false);
  low.print.nozzle.verdict = 'within';
  assert.equal(run([low], [stiff], { ...ctx, moisture: 'conditioned' }).screened, false);
  low.states.push({ id: 'annealed:100:2', treatment: { tempC: 100, hours: 2 }, moisture: 'dry', values: {} });
  assert.equal(run([low], [stiff], { ...ctx, anneal: true }).screened, false);
});

test('a hypothetical certified exclusion is monotone when extra AND requirements are added', () => {
  const low = grade('G1', {}, { tensileModulusXY: prediction() });
  assert.equal(run([low], [stiff]).screened, true);
  assert.equal(run([low], [stiff, hot]).screened, true);
  assert.equal(run([low], [stiff, { kind: 'gate', gate: 'drying' }]).screened, true);
  assert.equal(run([low], [stiff, hot]).verdict, 'UNKNOWN', 'inferred exclusion never becomes a measured FAIL');
});

test('estimated candidates are UNKNOWN and centre-based suggestions never create PASS', () => {
  const g = grade('G1', {}, { tensileModulusXY: prediction(3, 8, 6) });
  const e = run([g]);
  assert.equal(e.verdict, 'UNKNOWN');
  assert.equal(e.shortlistGroup, 'estimated');
  assert.equal(run([g], [stiff, hot]).shortlistGroup, 'insufficient');
  assert.equal(run([g], [stiff], { ...ctx, unknownPolicy: 'strict' }).eligible, false);
});

test('exact independent-evaluation risk gate rejects sparse cases and excess tail errors', () => {
  const cfg = { maxWrongRate: 0.1, confidence: 0.9 };
  const cases = (n, u) => Array.from({ length: n }, () => ({ u, beyond: { above: false, below: false } }));
  assert.ok(Math.abs(wrongRateUpper(0, 22, 0.9) - (1 - 0.1 ** (1 / 22))) < 1e-12);
  assert.equal(certifyProductCases(cases(21, 0.4), cases(100, 0.3), cfg, 0).certified, false);
  assert.equal(certifyProductCases(cases(100, 0.4), cases(100, 0.3), cfg, 0).certified, true);
  assert.equal(certifyProductCases(cases(100, 0.4), cases(100, 0.8), cfg, 0).certified, false);
  assert.equal(partition('one-formulation'), partition('one-formulation'));
});

test('ASA-GF stays unresolved at 5 GPa and iSANMATE is not excluded by a range crossing the limit', () => {
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
  assert.ok(db.grades.every((g) => Object.values(g.estimate ?? {}).every((e) => !e.canScreen)), 'no complete-scenario class meets the reserved risk gate in this release');
  const m = db.materials.find((x) => x.id === 'M034');
  const gs = db.grades.filter((g) => g.materialId === m.id && !g.retired);
  const e = evaluateProducts(m, gs, [stiff], { ...ctx, db });
  assert.equal(e.verdict, 'UNKNOWN');
  assert.equal(e.screened, false);
  assert.ok(gs.find((g) => g.id === 'G034-02').estimate.tensileModulusXY.plausible.hi >= 5);
  useRegistry(db.registry);
  const rows = [{ material: m, evaluation: e }];
  assert.match(toCSV(rows, db.meta, { scenario: { constraints: [stiff] } }), /Candidate group/);
  assert.match(toCSV(rows, db.meta), /insufficient/);
  const csv = productsCSV(rows, db, { productsByMaterial: new Map([[m.id, gs]]) });
  for (const g of gs) assert.ok(csv.includes(g.id), `exports retain unresolved product ${g.id}`);
});

test('uncertain table groups preserve column order within each group', () => {
  const rows = [['A', 9, 'insufficient'], ['B', 3, 'estimated'], ['C', 1, 'supported'], ['D', 5, 'estimated']]
    .map(([id, value, shortlistGroup]) => ({ material: { id, name: id, headline: { tensileModulusXY: { known: true, value } } }, evaluation: { shortlistGroup } }));
  const sorted = sortRows(rows, { scenario: { unknownPolicy: 'exploration', constraints: [stiff] }, sort: { key: 'tensileModulusXY', dir: 'desc' }, columnSet: 'properties', ctx: {} });
  assert.deepEqual(sorted.map((r) => r.material.id), ['C', 'D', 'B', 'A']);
});


test('withholding strength also removes qualifying break/yield values rather than leaking the answer as an input', () => {
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
  const S = snapshot(db.materials, db.grades, db.measurements, modelWith(db.polymers));
  const { raw } = rawObservations('tensileStrengthXY', S, modelWith(db.polymers));
  const x = db.measurements.find((m) => m.id === 'V000002');
  assert.ok(raw.some((o) => o.items.some((i) => i.measurementId === x.id)));
  const training = screeningTraining({ key: 'tensileStrengthXY', raw, S, withheld: new Set([S.fkey(x.gradeId)]),
    definition: db.registry.headlines.find((h) => h.key === 'tensileStrengthXY') });
  assert.ok(!training.some((o) => o.items.some((i) => i.measurementId === x.id)));
  assert.ok(training.length > 0, 'unrelated training formulations stay available');
});
