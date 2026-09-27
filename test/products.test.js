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

test('every product value is a measurement of that product, or of its twin, that the headline accepts, at the level it says', () => {
  let checked = 0;
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (key === 'priceCADkg') continue;
      const m = measurementById.get(v.measurementId);
      // A twin's value is its sibling's measurement (D89); every other value is the product's own.
      const holder = v.from?.origin === 'twin' ? v.from.gradeId : g.id;
      assert.equal(m?.gradeId, holder, `${g.id} ${key} cites ${v.measurementId}, not a measurement of ${holder}`);
      assert.equal(v.value, m.value);
      const own = db.measurements.filter((x) => x.gradeId === holder);
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
    const variantOnly = all.every((g) => g.variant);
    const products = variantOnly ? all : all.filter((g) => !g.variant);
    // A twin's value is its sibling's, and is set apart where the sibling is a declared variant (D57, D89).
    const apart = (v) => !variantOnly && v?.from?.origin === 'twin' && !!gradeById.get(v.from.gradeId).variant;
    for (const [key, s] of Object.entries(m.summary)) {
      const values = products.map((g) => g.headline?.[key]).filter((v) => v?.level === LEVEL.COMPARABLE && !apart(v)).map((v) => v.value);
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
  // A twin reading a declared variant's sheet is set apart with it (D89): SUNLU's High Speed Matte PLA prints PLA Lite's.
  const apart = (g) => g.variant || (g.headline?.density?.from && gradeById.get(g.headline.density.from.gradeId).variant);
  const variantDensities = pla.gradeIds.map((id) => gradeById.get(id)).filter((g) => apart(g) && g.headline?.density).map((g) => g.headline.density.value);
  assert.ok(variantDensities.some((v) => v > pla.summary.density.max), 'a metal-filled PLA is denser than any plain one');
  assert.equal(pla.summary.density.variants.n, variantDensities.length);
});

test("a product's print recipe comes from its own profiles, never a union across its material", () => {
  for (const g of db.grades.filter((x) => x.print?.profileIds.length)) {
    const own = db.profiles.filter((p) => p.gradeId === g.id && !p.retired);
    assert.deepEqual(g.print.profileIds, own.map((p) => p.id), g.id);
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const a = g.print[axis];
      // A part read from a twin's sheet or a printer maker's guide is checked by the D88 and D89 tests below.
      if (a.state !== 'range' || g.print.from?.[axis]) continue;
      const p = own.find((x) => x.id === a.profileId);
      assert.ok(p, `${g.id} ${axis}: ${a.profileId} is not its own profile`);
      assert.deepEqual([a.min, a.max], [p[axis].min, p[axis].max], `${g.id} ${axis}`);
    }
  }
});

test('a product with no profile, no annealed value and nothing read from a twin or a guide has no recipe, and a retired grade has neither values nor recipe', () => {
  const bare = db.grades.filter((g) => !g.retired && !db.profiles.some((p) => p.gradeId === g.id) && g.print);
  assert.ok(bare.every((g) => g.print.anneal.length || g.print.from), bare.map((g) => g.id).join(', '));
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

// Twins (D89): products of one material under one Shared formulation key print one table (R053), recorded once.
const isProduct = (g) => !g.retired && !/-R\d+$/.test(g.id);
const sameKey = (a, b) => a.materialId === b.materialId && a.formulationKey === b.formulationKey && !/^Not /.test(a.formulationKey ?? 'Not');
const ownMeasurements = (id) => db.measurements.filter((x) => x.gradeId === id);

test("a twin reads only a same-material sibling's own value, only where it publishes none, and never a price", () => {
  let read = 0;
  for (const g of db.grades.filter(isProduct)) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (!v.from) continue;
      read++;
      assert.notEqual(key, 'priceCADkg', `${g.id}: a price is what the product's own listings cost`);
      assert.equal(v.from.origin, 'twin', `${g.id} ${key}`);
      const t = gradeById.get(v.from.gradeId);
      assert.ok(t && isProduct(t) && t !== g && sameKey(t, g), `${g.id} ${key} reads ${v.from.gradeId}, not an active product of its material under its key (R166 reprints read nothing)`);
      assert.equal(ruleValue(g, defs.get(key), ownMeasurements(g.id)), null, `${g.id} ${key}: its own value always wins`);
      assert.equal(t.headline[key].from, undefined, `${g.id} ${key}: a twin reads its sibling's own value, never one the sibling read`);
      assert.equal(v.measurementId, t.headline[key].measurementId, `${g.id} ${key}`);
      assert.equal(v.value, t.headline[key].value, `${g.id} ${key}`);
      assert.equal(v.pinned, undefined, `${g.id} ${key}: a pin is the sibling's`);
      assert.match(v.from.label, /^same sheet as /);
    }
  }
  assert.ok(read > 100, `only ${read} values read from a twin`);
});

test('a product with no value of its own beside a same-key sibling that has one reads it', () => {
  for (const g of db.grades.filter(isProduct)) {
    for (const key of defs.keys()) {
      if (g.headline?.[key] || !g.headline) continue;
      const sibling = db.grades.find((t) => isProduct(t) && t !== g && sameKey(t, g) && t.headline?.[key] && !t.headline[key].from);
      assert.equal(sibling, undefined, `${g.id} ${key} is silent beside ${sibling?.id}, which publishes it`);
    }
  }
});

test("a part of a recipe read from a twin is the twin's own, and only where the product's own profiles are silent", () => {
  const silent = (profiles, axis) => (axis === 'chamber' ? profiles.every((p) => p.chamber.state === 'unknown' && !p.chamber.unparsed && p.enclosureState === 'unknown')
    : axis === 'enclosure' ? profiles.every((p) => p.enclosureState === 'unknown')
      : axis === 'hardenedNozzle' ? profiles.every((p) => p.abrasion.requiresHardened == null && p.abrasion.state !== 'stated')
        : axis === 'drying' ? profiles.every((p) => !p.drying.required)
          : profiles.every((p) => p[axis].state === 'unknown' && !p[axis].unparsed));
  let read = 0;
  for (const g of db.grades.filter((x) => isProduct(x) && x.print?.from)) {
    const own = db.profiles.filter((p) => p.gradeId === g.id && !p.retired);
    for (const [axis, from] of Object.entries(g.print.from)) {
      if (from.origin !== 'twin') continue;
      read++;
      const t = gradeById.get(from.gradeId);
      assert.ok(t && sameKey(t, g), `${g.id} ${axis} reads ${from.gradeId}`);
      if (axis === 'anneal') { assert.equal(ownMeasurements(g.id).some((m) => m.postProcessingState === 'annealed'), false); continue; }
      assert.ok(silent(own, axis), `${g.id} ${axis}: its own profiles speak, and its own statement wins`);
      assert.equal(t.print.from?.[axis], undefined, `${g.id} ${axis}: the twin's own, never what the twin read`);
      const a = g.print[axis], b = t.print[axis];
      if (['nozzle', 'bed', 'chamber'].includes(axis)) {
        assert.deepEqual([a.verdict, a.state, a.min, a.max, a.profileId], [b.verdict, b.state, b.min, b.max, b.profileId], `${g.id} ${axis}`);
        assert.ok(a.reason.endsWith(`(${from.label})`), `${g.id} ${axis}: the reason says where it came from`);
      } else assert.deepEqual(a, b, `${g.id} ${axis}`);
    }
  }
  assert.ok(read > 20, `only ${read} recipe parts read from a twin`);
});

// A printer maker's guide (D88): read for a product's print gate only where its own profiles and its twin's are silent.
test("a part read from a printer maker's guide is its material's guide row, only where the product and its twins are silent", () => {
  const guideOf = new Map(db.printGuide.flatMap((guide) => guide.materials.map((m) => [m.materialId, guide])));
  const speaks = (profiles, axis) => (axis === 'chamber' ? profiles.some((p) => p.chamber.state !== 'unknown' || p.chamber.unparsed || p.enclosureState !== 'unknown')
    : axis === 'enclosure' ? profiles.some((p) => p.enclosureState !== 'unknown')
      : axis === 'hardenedNozzle' ? profiles.some((p) => p.abrasion.requiresHardened != null || p.abrasion.state === 'stated')
        : profiles.some((p) => p[axis].state !== 'unknown' || p[axis].unparsed));
  const profilesOf = (id) => db.profiles.filter((p) => p.gradeId === id && !p.retired);
  let read = 0;
  for (const g of db.grades.filter(isProduct)) {
    const guide = guideOf.get(g.materialId);
    for (const [axis, from] of Object.entries(g.print?.from ?? {})) {
      if (from.origin !== 'guide') continue;
      read++;
      assert.ok(['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle'].includes(axis), `${g.id} ${axis}: the guide fills the print gate only, never drying or annealing`);
      assert.equal(from.guideId, guide?.id, `${g.id} ${axis}: not its material's guide row`);
      assert.ok(!speaks(profilesOf(g.id), axis), `${g.id} ${axis}: its own sheet speaks, and wins`);
      const twins = db.grades.filter((t) => isProduct(t) && t !== g && sameKey(t, g));
      assert.ok(twins.every((t) => !speaks(profilesOf(t.id), axis)), `${g.id} ${axis}: a twin speaks, and its sheet comes first`);
      assert.match(from.label, /^per .+'s .+ for .+, not this (maker's sheet|product's data sheet)$/, `${g.id} ${axis}`);
      if (['nozzle', 'bed', 'chamber'].includes(axis)) {
        const a = g.print[axis];
        assert.deepEqual([a.state, a.min, a.max, a.profileId], [guide[axis].state, guide[axis].min, guide[axis].max, null], `${g.id} ${axis}`);
        assert.ok(a.reason.endsWith(`(${from.label})`), `${g.id} ${axis}: the reason names the guide`);
      }
      if (axis === 'enclosure') assert.equal(g.print.enclosure, guide.enclosureState, g.id);
      if (axis === 'hardenedNozzle') assert.equal(g.print.hardenedNozzle, guide.abrasion.requiresHardened, g.id);
    }
    // A material no guide row speaks for reads nothing from a guide.
    if (!guide) assert.ok(Object.values(g.print?.from ?? {}).every((f) => f.origin !== 'guide'), `${g.id}: its material has no guide row`);
  }
  assert.ok(read > 500, `only ${read} parts read from the guide`);
});

test('a guide that asks for an enclosure and states no chamber temperature leaves the chamber unknown', () => {
  for (const guide of db.printGuide.filter((x) => x.enclosureState === 'recommended' && x.chamber.state === 'unknown')) {
    for (const { materialId } of guide.materials) {
      for (const g of db.grades.filter((x) => isProduct(x) && x.materialId === materialId && x.print?.from?.chamber?.origin === 'guide')) {
        assert.equal(g.print.chamber.verdict, 'unknown', `${g.id}: an enclosure is not proof that 65 °C is enough`);
      }
    }
  }
});

test("a material's spread counts each twin as the product it is, and says how many", () => {
  let twins = 0;
  for (const m of db.materials.filter((x) => x.summary)) {
    const all = m.gradeIds.map((id) => gradeById.get(id));
    const variantOnly = all.every((g) => g.variant);
    for (const [key, s] of Object.entries(m.summary)) {
      const expected = all.filter((g) => (variantOnly || !g.variant) && g.headline?.[key]?.level === LEVEL.COMPARABLE && g.headline[key].from?.origin === 'twin'
        && (variantOnly || !gradeById.get(g.headline[key].from.gradeId).variant)).length;
      assert.equal(s.twins ?? 0, expected, `${m.id} ${key}`);
      if (s.twins) assert.equal(m.headline[key].spread.twins, s.twins, `${m.id} ${key}`);
      // Where a twin and the product whose sheet it is tie for the median, the typical product is the sheet's own.
      if (s.typical) assert.equal(gradeById.get(s.typical).headline[key].from, undefined, `${m.id} ${key}: typical ${s.typical} is a twin`);
      twins += s.twins ?? 0;
    }
  }
  assert.ok(twins > 50, `only ${twins} twin values in the spreads`);
});
