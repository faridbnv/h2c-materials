// A headline is a selected measurement. Every way a selection can be wrong stops the build.
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
const row = (wb, materialId, key) => wb.Headlines.rows.find((r) => r.MaterialID === materialId && r.HeadlineKey === key && r.Use === 'value');

test('the value comes from the selected measurement, and no selection means Not published', () => {
  const { db, errors } = errorsWith(() => {});
  assert.deepEqual(errors, []);
  const petg = db.materials.find((m) => m.id === 'M020');
  assert.equal(petg.headline.tensileModulusXY.value, db.measurements.find((m) => m.id === 'V000384').value);
  assert.equal(petg.headline.tensileStrengthXY.known, false);
  assert.equal(petg.headline.tensileStrengthXY.missing, 'not-published');
});

test('a selection of another grade, property, direction or material is an error', () => {
  const cases = [
    ['a measurement of another grade', (wb) => { row(wb, 'M020', 'tensileModulusXY').MeasurementID = 'V000400'; }, /not the representative grade|measures|is a .* measurement/],
    ['a different property', (wb) => { row(wb, 'M020', 'density').MeasurementID = 'V000384'; }, /V000384 measures Tensile modulus/],
    ['another material', (wb) => { row(wb, 'M020', 'density').MeasurementID = 'V000001'; }, /V000001 is a measurement of M001/],
    ['a missing measurement', (wb) => { row(wb, 'M020', 'density').MeasurementID = 'V999999'; }, /V999999 is not an active measurement/],
    // A headline describes a dry, as-printed part (audit 2026-09-15, C-05).
    ['a film specimen', (wb) => { meas(wb, 'V000384')['Specimen type'] = 'Film specimen (ASTM D882); not a printed or moulded bar'; }, /V000384 is a film specimen, not a printed part/],
    ['a moulded bar', (wb) => { meas(wb, 'V000384')['Specimen type'] = 'Raw material value'; }, /V000384 is a moulded specimen/],
    ['a conditioned value', (wb) => { const m = meas(wb, 'V000384'); m['Moisture condition'] = 'Conditioned: 70% RH'; m['Moisture state'] = 'conditioned'; }, /V000384 was measured after moisture conditioning/],
    ['an annealed value beside the as-printed one', (wb) => { row(wb, 'M068', 'hdt045').MeasurementID = 'V001933'; }, /V001933 is annealed, and grade G068-02 publishes the property as printed/],
  ];
  for (const [label, edit, expected] of cases) {
    const { errors } = errorsWith(edit);
    assert.ok(errors.some((e) => expected.test(e)), `${label}: ${errors.join(' | ')}`);
  }
});

test('two value selections for one headline are an error', () => {
  const { errors } = errorsWith((wb) => { wb.Headlines.rows.push({ ...row(wb, 'M020', 'density'), MeasurementID: 'V000383' }); });
  assert.ok(errors.some((e) => /density selects 2 values/.test(e)), errors.join(' | '));
});

test('context citations reach the evidence list but never the value', () => {
  const { db } = errorsWith(() => {});
  const silk = db.materials.find((m) => m.id === 'M008');
  assert.equal(silk.headline.hdt045.known, false);
  assert.deepEqual(silk.headlineEvidence.thermal, ['V001914']);
});
