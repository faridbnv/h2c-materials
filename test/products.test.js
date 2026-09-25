// A product's own values and print recipe are chosen by rule, and a material is the spread of its products
// (build/src/products.js; docs/GOALS.md, D83 and D84 decided; re-center phase 1). These assert the rules over every
// product, not particular records: build/snapshot/products.csv and summaries.csv hold the values themselves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { measurementHeadlines } from '../build/src/registry.js';
import { assess, LEVEL, ruleValue } from '../build/src/products.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));

// The core database: product values are compiled, and the estimate stage neither writes nor reads them.
function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false });
  return { db, wb, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}
const { db } = build();
const defs = new Map(measurementHeadlines(db.registry).map((d) => [d.key, d]));
const measurementById = new Map(db.measurements.map((m) => [m.id, m]));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));

test('every product value is a measurement of that product that the headline accepts, at the level it says', () => {
  let checked = 0;
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (key === 'priceCADkg') continue;
      const m = measurementById.get(v.measurementId);
      assert.equal(m?.gradeId, g.id, `${g.id} ${key} cites ${v.measurementId}, not a measurement of ${g.id}`);
      assert.equal(v.value, m.value);
      const own = db.measurements.filter((x) => x.gradeId === g.id);
      const a = assess(m, defs.get(key), own);
      assert.ok(!a.excluded, `${g.id} ${key} ${m.id}: ${a.excluded}`);
      assert.equal(v.level, a.level, `${g.id} ${key}`);
      checked++;
    }
  }
  assert.ok(checked > 3000, `only ${checked} product values`);
});

test('no product value is a Z, moulded, film, filament, conditioned or implausible value', () => {
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (!v.measurementId) continue;
      const m = measurementById.get(v.measurementId);
      assert.ok(!['moulded', 'film', 'filament'].includes(m.specimenForm), `${g.id} ${key} ${m.id} is a ${m.specimenForm} specimen`);
      assert.ok(!['Z', 'XZ', 'ZX'].includes(m.direction), `${g.id} ${key} ${m.id} is ${m.direction}`);
      assert.notEqual(m.moistureState, 'conditioned', `${g.id} ${key} ${m.id}`);
      assert.ok(!m.implausible, `${g.id} ${key} ${m.id}`);
    }
  }
});

test('a value is as published exactly when the source leaves the direction or the load unstated', () => {
  const hdt = defs.get('hdt045');
  const modulus = defs.get('tensileModulusXY');
  const m = (over) => ({ id: 'V999999', gradeId: 'G999-01', numeric: true, dataStatus: 'Published value', property: 'Tensile modulus', unit: 'GPa', value: 3,
    implausible: false, specimenType: 'Printed specimen', specimenForm: 'printed', moistureState: 'not-stated', postProcessingState: 'not-stated', direction: 'XY', ...over });
  assert.deepEqual(assess(m({}), modulus, []), { level: LEVEL.COMPARABLE, caveat: null });
  assert.deepEqual(assess(m({ direction: 'unknown' }), modulus, []), { level: LEVEL.AS_PUBLISHED, caveat: 'unstated-direction' });
  assert.ok(assess(m({ direction: 'Z' }), modulus, []).excluded);
  assert.ok(assess(m({ direction: 'horizontal-source-label' }), modulus, []).excluded, 'a source\'s own label is not XY');
  const heat = (thermal) => m({ property: 'HDT', unit: '°C', value: 80, direction: 'not-applicable', thermal });
  assert.equal(assess(heat({ loadStated: true, loadMPa: 0.455 }), hdt, []).level, LEVEL.COMPARABLE, 'ASTM D648\'s 0.455 MPa is the 0.45 MPa test');
  assert.deepEqual(assess(heat({ loadStated: false, loadMPa: null }), hdt, []), { level: LEVEL.AS_PUBLISHED, caveat: 'load-not-stated' });
  assert.ok(assess(heat({ loadStated: true, loadMPa: 1.8 }), hdt, []).excluded);
});

test('a comparable value is preferred to one published without a direction, whatever else the other has', () => {
  const g = db.grades.find((x) => x.headline?.tensileModulusXY?.level === LEVEL.COMPARABLE
    && db.measurements.some((m) => m.gradeId === x.id && m.property === 'Tensile modulus' && m.direction === 'unknown'));
  assert.ok(g, 'a product publishing both exists');
  assert.equal(g.headline.tensileModulusXY.level, LEVEL.COMPARABLE);
});

test('every hand-picked headline is the product value of its grade, and the rule alone reproduces each one', () => {
  const { wb } = build();
  for (const s of wb.Headlines.rows.filter((r) => r.Use === 'value')) {
    const m = measurementById.get(s.MeasurementID);
    const v = gradeById.get(m.gradeId).headline[s.HeadlineKey];
    assert.equal(v?.measurementId, m.id, `${s.MaterialID} ${s.HeadlineKey}: the product value is not the pick`);
    assert.equal(v.pinned, true);
    const own = db.measurements.filter((x) => x.gradeId === m.gradeId);
    assert.equal(ruleValue(gradeById.get(m.gradeId), defs.get(s.HeadlineKey), own)?.value, m.value, `${s.MaterialID} ${s.HeadlineKey}: the rule would choose another value`);
  }
});

test("a material's summary is the spread of its procurement products that are not variants", () => {
  for (const m of db.materials.filter((x) => x.summary)) {
    // A material whose every product is a declared variant (PP Lightweight) is its variants.
    const all = m.gradeIds.map((id) => gradeById.get(id));
    const products = all.every((g) => g.variant) ? all : all.filter((g) => !g.variant);
    for (const [key, s] of Object.entries(m.summary)) {
      const values = products.map((g) => g.headline?.[key]).filter((v) => v?.level === LEVEL.COMPARABLE).map((v) => v.value);
      assert.equal(s.products, products.length, `${m.id} ${key}`);
      assert.equal(s.n, values.length, `${m.id} ${key}`);
      if (!values.length) { assert.equal(s.median, undefined); continue; }
      assert.equal(s.min, Math.min(...values));
      assert.equal(s.max, Math.max(...values));
      assert.ok(s.min <= s.median && s.median <= s.max, `${m.id} ${key}`);
      assert.equal(values.length >= 4, s.q1 !== undefined, `${m.id} ${key}: quartiles from four values`);
      assert.ok(products.includes(gradeById.get(s.typical)), `${m.id} ${key}: typical ${s.typical}`);
    }
  }
});

test("a declared variant stays out of its material's range, and is counted apart", () => {
  const pla = db.materials.find((m) => m.id === 'M001');
  const variantDensities = pla.gradeIds.map((id) => gradeById.get(id)).filter((g) => g.variant && g.headline?.density).map((g) => g.headline.density.value);
  assert.ok(variantDensities.some((v) => v > pla.summary.density.max), 'a metal-filled PLA is denser than any plain one');
  assert.equal(pla.summary.density.variants.n, variantDensities.length);
});

test("a product's print recipe comes from its own profiles, never a union across its material", () => {
  for (const g of db.grades.filter((x) => x.print?.profileIds.length)) {
    const own = db.profiles.filter((p) => p.gradeId === g.id && !p.retired);
    assert.deepEqual(g.print.profileIds, own.map((p) => p.id), g.id);
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const a = g.print[axis];
      if (a.state !== 'range') continue;
      const p = own.find((x) => x.id === a.profileId);
      assert.ok(p, `${g.id} ${axis}: ${a.profileId} is not its own profile`);
      assert.deepEqual([a.min, a.max], [p[axis].min, p[axis].max], `${g.id} ${axis}`);
    }
  }
});

test('a product with no profile and no annealed value has no recipe, and a retired grade has neither values nor recipe', () => {
  const bare = db.grades.filter((g) => !g.retired && !db.profiles.some((p) => p.gradeId === g.id) && g.print);
  assert.ok(bare.every((g) => g.print.anneal.length), bare.map((g) => g.id).join(', '));
  for (const g of db.grades.filter((x) => x.retired)) assert.equal(g.headline, undefined, g.id);
});

test("a material's headline is its products' median with their spread, and none publishing leaves it missing", () => {
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  let known = 0;
  for (const m of db.materials.filter((x) => x.summary)) {
    for (const [key, s] of Object.entries(m.summary)) {
      const h = m.headline[key];
      // A price listed only for a declared variant is the market's for the material, not a plain product's (PA6).
      if (!(s.n > 0)) { if (key !== 'priceCADkg') assert.equal(h.known, false, `${m.id} ${key}`); continue; }
      known++;
      assert.deepEqual([h.value, h.spread.n, h.spread.min, h.spread.max, h.typical.gradeId], [s.median, s.n, s.min, s.max, s.typical], `${m.id} ${key}`);
      assert.equal(h.typical.value, gradeById.get(s.typical).headline[key].value, `${m.id} ${key}`);
      // One product: its value is the material's, citing its measurement as a single value always did.
      if (s.n === 1) assert.equal(h.measurementId, h.typical.measurementId, `${m.id} ${key}`);
    }
  }
  assert.ok(known > 400, `only ${known} headlines from products`);
});
