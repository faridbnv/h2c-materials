// A material's headline is its products' spread, and a product's value is chosen by rule (D83). headlines.csv only
// pins a product's value where the rule chooses wrongly; every way a pin can be wrong stops the build.
//
// The fixtures are chosen from the data by what each case needs (a product with two values the headline could take,
// an annealed value beside its as-printed twin), never by ID, so a batch that moves a record cannot break the proof
// that a check still fires. The median itself is products.test.js's rule over every material.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { measurementHeadlines } from '../build/src/registry.js';
import { assess, LEVEL } from '../build/src/products.js';
import { annealedBesideAsPrinted } from '../build/src/normalize/specimen.js';

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

const { db } = errorsWith(() => {});
const defs = new Map(measurementHeadlines(db.registry).map((d) => [d.key, d]));
const ownOf = (gradeId) => db.measurements.filter((x) => x.gradeId === gradeId);
// A product whose stiffness the rule chose from two comparable values: the one it chose, and the one a pin could.
const twoModuli = (() => {
  for (const g of db.grades.filter((x) => !x.retired && x.headline?.tensileModulusXY?.level === LEVEL.COMPARABLE && !x.headline.tensileModulusXY.pinned)) {
    const own = ownOf(g.id);
    const other = own.find((x) => x.id !== g.headline.tensileModulusXY.measurementId && x.value !== g.headline.tensileModulusXY.value
      && !assess(x, defs.get('tensileModulusXY'), own).excluded && assess(x, defs.get('tensileModulusXY'), own).level === LEVEL.COMPARABLE);
    if (other) return { grade: g, chosen: g.headline.tensileModulusXY.measurementId, other };
  }
  return null;
})();

test('a pin moves one product\'s value, and the material\'s spread follows', () => {
  assert.ok(twoModuli, 'no product publishes two comparable stiffness values to test a pin with');
  const { grade, chosen, other } = twoModuli;
  const { db: pinned, errors } = errorsWith((wb) => pin(wb, grade.materialId, 'tensileModulusXY', other.id));
  assert.deepEqual(errors, []);
  const g = pinned.grades.find((x) => x.id === grade.id);
  assert.deepEqual([g.headline.tensileModulusXY.measurementId, g.headline.tensileModulusXY.value, g.headline.tensileModulusXY.pinned], [other.id, other.value, true]);
  assert.equal(db.grades.find((x) => x.id === grade.id).headline.tensileModulusXY.measurementId, chosen);
  // The material's spread is its products' values, the pinned one among them.
  const m = pinned.materials.find((x) => x.id === grade.materialId);
  if (!grade.variant && m.summary.tensileModulusXY.n > 0) assert.ok(m.summary.tensileModulusXY.min <= other.value && other.value <= m.summary.tensileModulusXY.max, m.name);
});

test('a pin of another material, property, specimen or state is an error', () => {
  // A product's stiffness value, which the rule itself accepts: each case below breaks exactly one thing about it.
  const g = db.grades.find((x) => !x.retired && x.headline?.tensileModulusXY?.level === LEVEL.COMPARABLE);
  const x = g.headline.tensileModulusXY.measurementId;
  const M = g.materialId;
  const foreign = db.measurements.find((y) => y.materialId !== M && y.property === 'Density');
  // An annealed heat deflection whose product also publishes it as printed, at the headline's load.
  const annealed = db.measurements.find((y) => y.property === 'HDT' && y.postProcessingState === 'annealed' && Math.abs((y.thermal?.loadMPa ?? 0) - 0.45) <= 0.01 && annealedBesideAsPrinted(y, ownOf(y.gradeId)));
  assert.ok(foreign && annealed, 'the fixtures this test needs are not in the data');
  const cases = [
    ['a different property', (wb) => pin(wb, M, 'density', x), new RegExp(`${x} cannot be density: measures Tensile modulus`)],
    ['another material', (wb) => pin(wb, M, 'density', foreign.id), new RegExp(`${foreign.id} is a measurement of ${foreign.materialId}`)],
    ['a missing measurement', (wb) => pin(wb, M, 'density', 'V999999'), /V999999 is not an active measurement/],
    // A product value describes a dry, as-printed part (audit 2026-09-15, C-05).
    ['a film specimen', (wb) => { pin(wb, M, 'tensileModulusXY', x); meas(wb, x)['Specimen type'] = 'Film specimen (ASTM D882); not a printed or moulded bar'; }, new RegExp(`${x} cannot be tensileModulusXY: a film specimen, not a printed part`)],
    ['a moulded bar', (wb) => { pin(wb, M, 'tensileModulusXY', x); meas(wb, x)['Specimen type'] = 'Raw material value'; }, new RegExp(`${x} cannot be tensileModulusXY: a moulded specimen`)],
    ['a conditioned value', (wb) => { pin(wb, M, 'tensileModulusXY', x); const r = meas(wb, x); r['Moisture condition'] = 'Conditioned: 70% RH'; r['Moisture state'] = 'conditioned'; }, new RegExp(`${x} cannot be tensileModulusXY: measured after moisture conditioning`)],
    ['an annealed value beside the as-printed one', (wb) => pin(wb, annealed.materialId, 'hdt045', annealed.id), new RegExp(`${annealed.id} cannot be hdt045: annealed, and the product publishes it as printed`)],
    ['an unknown headline', (wb) => pin(wb, M, 'stiffness', x), /Headline key "stiffness" is not a measurement headline/],
  ];
  for (const [label, edit, expected] of cases) {
    const { errors } = errorsWith(edit);
    assert.ok(errors.some((e) => expected.test(e)), `${label}: ${errors.join(' | ')}`);
  }
});

test('two pins for one product and headline are an error', () => {
  assert.ok(twoModuli, 'no product publishes two comparable stiffness values to test a pin with');
  const { grade, chosen, other } = twoModuli;
  const { errors } = errorsWith((wb) => { pin(wb, grade.materialId, 'tensileModulusXY', chosen); pin(wb, grade.materialId, 'tensileModulusXY', other.id); });
  assert.ok(errors.some((e) => e.includes(`${grade.id} tensileModulusXY is pinned twice`)), errors.join(' | '));
});
