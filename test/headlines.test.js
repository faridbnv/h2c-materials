// A material's headline is its products' spread, and a product's value is chosen by rule (D83). headlines.csv only
// pins a product's value where the rule chooses wrongly; every way a pin can be wrong stops the build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));

function errorsWith(edit) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}
const meas = (wb, id) => wb.Properties.rows.find((r) => r.MeasurementID === id);
const pin = (wb, MaterialID, HeadlineKey, MeasurementID) => wb.Headlines.rows.push({ MaterialID, HeadlineKey, MeasurementID, Reason: 'test' });

test('a material\'s headline is the median of its products\' comparable values, and none means Not published', () => {
  const { db, errors } = errorsWith(() => {});
  assert.deepEqual(errors, []);
  const petg = db.materials.find((m) => m.id === 'M020');
  const values = petg.gradeIds.map((id) => db.grades.find((g) => g.id === id))
    .filter((g) => !g.variant && g.headline?.tensileModulusXY?.level === 'comparable').map((g) => g.headline.tensileModulusXY.value).sort((a, b) => a - b);
  const mid = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  assert.equal(petg.headline.tensileModulusXY.value, Number(mid.toPrecision(12)));
  assert.equal(petg.headline.tensileModulusXY.spread.n, values.length);
  assert.ok(petg.gradeIds.includes(petg.headline.tensileModulusXY.typical.gradeId));
  // A material none of whose products publishes a comparable value has no headline of its own; PA66 has no products.
  const pa66 = db.materials.find((m) => m.name === 'PA66');
  assert.equal(pa66.headline.tensileStrengthXY.known, false);
  assert.equal(pa66.headline.tensileStrengthXY.missing, 'not-published');
});

test('a pin moves one product\'s value, and the material\'s spread follows', () => {
  // G020-02 publishes two printed XY moduli, 2.1168 (V000398, the rule's) and 1.472 (V003638).
  const { db, errors } = errorsWith((wb) => pin(wb, 'M020', 'tensileModulusXY', 'V003638'));
  assert.deepEqual(errors, []);
  const g = db.grades.find((x) => x.id === 'G020-02');
  assert.deepEqual([g.headline.tensileModulusXY.measurementId, g.headline.tensileModulusXY.value, g.headline.tensileModulusXY.pinned], ['V003638', 1.472, true]);
  assert.equal(errorsWith(() => {}).db.grades.find((x) => x.id === 'G020-02').headline.tensileModulusXY.measurementId, 'V000398');
});

test('a pin of another material, property, specimen or state is an error', () => {
  const cases = [
    ['a different property', (wb) => pin(wb, 'M020', 'density', 'V000384'), /V000384 cannot be density: measures Tensile modulus/],
    ['another material', (wb) => pin(wb, 'M020', 'density', 'V000001'), /V000001 is a measurement of M001/],
    ['a missing measurement', (wb) => pin(wb, 'M020', 'density', 'V999999'), /V999999 is not an active measurement/],
    // A product value describes a dry, as-printed part (audit 2026-09-15, C-05).
    ['a film specimen', (wb) => { pin(wb, 'M020', 'tensileModulusXY', 'V000384'); meas(wb, 'V000384')['Specimen type'] = 'Film specimen (ASTM D882); not a printed or moulded bar'; }, /V000384 cannot be tensileModulusXY: a film specimen, not a printed part/],
    ['a moulded bar', (wb) => { pin(wb, 'M020', 'tensileModulusXY', 'V000384'); meas(wb, 'V000384')['Specimen type'] = 'Raw material value'; }, /V000384 cannot be tensileModulusXY: a moulded specimen/],
    ['a conditioned value', (wb) => { pin(wb, 'M020', 'tensileModulusXY', 'V000384'); const m = meas(wb, 'V000384'); m['Moisture condition'] = 'Conditioned: 70% RH'; m['Moisture state'] = 'conditioned'; }, /V000384 cannot be tensileModulusXY: measured after moisture conditioning/],
    ['an annealed value beside the as-printed one', (wb) => pin(wb, 'M068', 'hdt045', 'V001933'), /V001933 cannot be hdt045: annealed, and the product publishes it as printed/],
    ['an unknown headline', (wb) => pin(wb, 'M020', 'stiffness', 'V000384'), /Headline key "stiffness" is not a measurement headline/],
  ];
  for (const [label, edit, expected] of cases) {
    const { errors } = errorsWith(edit);
    assert.ok(errors.some((e) => expected.test(e)), `${label}: ${errors.join(' | ')}`);
  }
});

test('two pins for one product and headline are an error', () => {
  const { errors } = errorsWith((wb) => { pin(wb, 'M020', 'tensileModulusXY', 'V000398'); pin(wb, 'M020', 'tensileModulusXY', 'V003638'); });
  assert.ok(errors.some((e) => /G020-02 tensileModulusXY is pinned twice/.test(e)), errors.join(' | '));
});
