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

test('no product value is in another direction than its headline\'s, or a moulded, film, filament, conditioned or implausible value', () => {
  for (const g of db.grades) {
    for (const [key, v] of Object.entries(g.headline ?? {})) {
      if (!v.measurementId) continue;
      const m = measurementById.get(v.measurementId);
      const def = defs.get(key);
      assert.ok(!['moulded', 'film', 'filament', 'off-recipe'].includes(m.specimenForm), `${g.id} ${key} ${m.id} is a ${m.specimenForm} specimen`);
      // A Z value is only ever the layer strength's, and the layer strength is only ever a Z value (D92).
      if (def.direction) assert.ok([def.direction, 'unknown', 'not-applicable'].includes(m.direction), `${g.id} ${key} ${m.id} is ${m.direction}`);
      if (['Z', 'XZ', 'ZX'].includes(m.direction)) assert.equal(def.direction, m.direction, `${g.id} ${key} ${m.id} is ${m.direction}`);
      assert.notEqual(m.moistureState, 'conditioned', `${g.id} ${key} ${m.id}`);
      assert.ok(!m.implausible, `${g.id} ${key} ${m.id}`);
    }
  }
});

test('a bar printed off its product\'s recipe backs no product value or bound, and stands beside the recipe\'s own value (D95)', () => {
  const off = db.measurements.filter((m) => m.specimenForm === 'off-recipe');
  assert.ok(off.length, 'the unfoamed columns of colorFabb\'s lightweight PETs are recorded');
  const offIds = new Set(off.map((m) => m.id));
  for (const g of db.grades) for (const [key, v] of Object.entries(g.headline ?? {})) assert.ok(!offIds.has(v.measurementId), `${g.id} ${key} is ${v.measurementId}`);
  for (const mat of db.materials) {
    for (const [key, h] of Object.entries(mat.headline ?? {})) for (const b of h?.impliedBounds ?? []) assert.ok(!offIds.has(b.measurementId), `${mat.id} ${key} is bounded by ${b.measurementId}`);
  }
  // Recorded beside the value the product is meant to be printed at: the same product, source and property, printed.
  for (const m of off) {
    assert.ok(db.measurements.some((x) => x.gradeId === m.gradeId && x.sourceId === m.sourceId && x.property === m.property && x.specimenForm === 'printed'),
      `${m.id} (${m.gradeId} ${m.property}) has no value of the product's own recipe beside it`);
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

// D92: three selectable properties. Each rule below is over every product of every headline that sets the condition,
// not over particular records: build/snapshot/products.csv holds the values themselves.
const valuesOf = (def) => db.grades.filter((g) => !g.retired && g.headline?.[def.key])
  .map((g) => ({ g, v: g.headline[def.key], m: measurementById.get(g.headline[def.key].measurementId) }));

test('an impact value is a notched bar of the headline\'s own test, in its unit, struck at room temperature or at one the source leaves unstated', () => {
  const impact = [...defs.values()].filter((d) => d.notch);
  assert.ok(impact.length, 'a headline sets a notch');
  for (const def of impact) {
    const values = valuesOf(def);
    assert.ok(values.length > 100, `${def.key}: only ${values.length} product values`);
    for (const { g, v, m } of values) {
      const where = `${g.id} ${def.key} ${m.id}`;
      assert.ok(def.valueProperties.includes(m.property), `${where} is ${m.property}: an Izod value is never a Charpy value, nor a Charpy value an Izod one`);
      // A value that names a standard names the headline's own (D94): ASTM D256 in kJ/m² is a J/m value converted.
      if (def.standard && m.standards.length) assert.ok(m.standards.includes(def.standard), `${where} is to ${m.standards.join(', ')}`);
      assert.equal(m.unit, def.unit, `${where}: J/m does not become kJ/m² without the bar's thickness`);
      assert.equal(m.notch, def.notch, `${where} is ${m.notch}`);
      assert.ok(m.testTemperatureC == null || Math.abs(m.testTemperatureC - def.testTemperatureC) <= 2, `${where} was struck at ${m.testTemperatureC} °C`);
      assert.equal(v.level, m.direction === def.direction ? LEVEL.COMPARABLE : LEVEL.AS_PUBLISHED, where);
    }
  }
});

test('a headline that excludes an unstated direction holds only values the source says are in its direction, all comparable', () => {
  const strict = [...defs.values()].filter((d) => d.unstatedDirection === 'excluded');
  assert.ok(strict.length, 'a headline excludes an unstated direction');
  for (const def of strict) {
    const values = valuesOf(def);
    assert.ok(values.length > 100, `${def.key}: only ${values.length} product values`);
    for (const { g, v, m } of values) {
      assert.equal(m.direction, def.direction, `${g.id} ${def.key} ${m.id}`);
      assert.equal(v.level, LEVEL.COMPARABLE, `${g.id} ${def.key}`);
    }
  }
});

test('a headline with no direction and no load has only comparable values, never a resin supplier\'s', () => {
  const plain = [...defs.values()].filter((d) => !d.direction && d.loadMPa == null);
  assert.ok(plain.some((d) => valuesOf(d).length > 300), 'the glass transition and the density have hundreds');
  for (const def of plain) {
    for (const { g, v, m } of valuesOf(def)) {
      assert.equal(v.level, LEVEL.COMPARABLE, `${g.id} ${def.key}`);
      assert.notEqual(m.specimenForm, 'moulded', `${g.id} ${def.key} ${m.id}`);
    }
  }
});

test('a product whose own measurement a headline accepts has a value for it, at the best level it has', () => {
  // The converse of the first rule: the rule misses nothing. Every active product, every headline that applies to it.
  const byGrade = new Map();
  for (const m of db.measurements) (byGrade.get(m.gradeId) ?? byGrade.set(m.gradeId, []).get(m.gradeId)).push(m);
  let checked = 0;
  for (const g of db.grades.filter((x) => !x.retired)) {
    const own = byGrade.get(g.id) ?? [];
    for (const def of defs.values()) {
      const levels = own.map((m) => assess(m, def, own)).filter((a) => !a.excluded).map((a) => a.level);
      if (!levels.length) continue;
      const v = g.headline?.[def.key];
      if (!v && db.materials.find((x) => x.id === g.materialId)?.headline?.[def.key]?.notApplicable) continue;
      assert.ok(v, `${g.id} publishes a value ${def.key} accepts, and has none`);
      if (levels.includes(LEVEL.COMPARABLE) && !v.from && !v.pinned) assert.equal(v.level, LEVEL.COMPARABLE, `${g.id} ${def.key}`);
      checked++;
    }
  }
  assert.ok(checked > 3000, `only ${checked}`);
});

test('the notch, the test temperature and an excluded unstated direction are conditions of a value, as the direction and the load are', () => {
  const impact = [...defs.values()].find((d) => d.notch);
  const layer = [...defs.values()].find((d) => d.unstatedDirection === 'excluded');
  const bar = (over) => ({ id: 'V999999', gradeId: 'G999-01', numeric: true, dataStatus: 'Published value', property: impact.valueProperties[0], unit: impact.unit, value: 5,
    implausible: false, specimenType: 'Printed specimen', specimenForm: 'printed', moistureState: 'not-stated', postProcessingState: 'not-stated', direction: 'XY', notch: impact.notch, ...over });
  assert.deepEqual(assess(bar({}), impact, []), { level: LEVEL.COMPARABLE, caveat: null });
  assert.equal(assess(bar({ testTemperatureC: 25 }), impact, []).level, LEVEL.COMPARABLE, '25 °C is inside the laboratory\'s 23 ± 2 °C');
  assert.deepEqual(assess(bar({ direction: 'not-applicable' }), impact, []), { level: LEVEL.AS_PUBLISHED, caveat: 'unstated-direction' });
  assert.match(assess(bar({ testTemperatureC: -30 }), impact, []).excluded, /-30 °C/);
  assert.match(assess(bar({ notch: 'Unnotched' }), impact, []).excluded, /unnotched/);
  assert.match(assess(bar({ notch: 'Not published' }), impact, []).excluded, /does not state whether the bar was notched/);
  assert.ok(assess(bar({ property: 'Izod impact strength' }), impact, []).excluded);
  assert.ok(assess(bar({ property: 'Izod impact strength', unit: 'J/m' }), impact, []).excluded);
  // The two impact tests are never mixed (D94): each headline refuses the other's property, and one naming its standard
  // refuses a value that names only another.
  const tests = [...defs.values()].filter((d) => d.notch);
  assert.equal(new Set(tests.flatMap((d) => d.valueProperties)).size, tests.flatMap((d) => d.valueProperties).length, 'two impact headlines share a property');
  for (const def of tests) {
    for (const other of tests.filter((d) => d !== def)) assert.ok(assess(bar({ property: other.valueProperties[0] }), def, []).excluded, `${def.key} takes ${other.valueProperties[0]}`);
    if (!def.standard) continue;
    const own = (over) => bar({ property: def.valueProperties[0], unit: def.unit, ...over });
    assert.equal(assess(own({ standards: [def.standard] }), def, []).level, LEVEL.COMPARABLE);
    assert.equal(assess(own({ standards: [] }), def, []).level, LEVEL.COMPARABLE, 'a value naming no standard counts');
    assert.match(assess(own({ standards: ['ASTM D256'] }), def, []).excluded, /ASTM D256/);
  }
  const pulled = (over) => bar({ property: layer.valueProperties[0], unit: layer.unit, value: 20, notch: 'Not applicable', direction: layer.direction, ...over });
  assert.deepEqual(assess(pulled({}), layer, []), { level: LEVEL.COMPARABLE, caveat: null });
  for (const direction of ['unknown', 'not-applicable', 'XY', 'XZ', 'ZX']) assert.ok(assess(pulled({ direction }), layer, []).excluded, direction);
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
      const values = products.map((g) => g.headline?.[key]).filter((v) => v?.level === LEVEL.COMPARABLE && !apart(v)).map((v) => v.value).sort((a, b) => a - b);
      assert.equal(s.products, products.length, `${m.id} ${key}`);
      assert.equal(s.n, values.length, `${m.id} ${key}`);
      // What is counted apart: a value published without its direction or load (D84), and a declared variant's (D57).
      const span = (list) => (list.length ? { n: list.length, min: Math.min(...list), max: Math.max(...list) } : undefined);
      const asPublished = products.map((g) => g.headline?.[key]).filter((v) => v?.level === LEVEL.AS_PUBLISHED && !apart(v)).map((v) => v.value);
      assert.deepEqual(s.asPublished, span(asPublished), `${m.id} ${key}: as published, counted apart`);
      const variants = variantOnly ? [] : all.filter((g) => g.headline?.[key] && (g.variant || apart(g.headline[key]))).map((g) => g.headline[key].value);
      assert.deepEqual(s.variants, span(variants), `${m.id} ${key}: variants, counted apart`);
      if (!values.length) { assert.equal(s.median, undefined); continue; }
      assert.equal(s.min, values[0]);
      assert.equal(s.max, values.at(-1));
      const mid = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
      assert.equal(s.median, Number(mid.toPrecision(12)), `${m.id} ${key}: the median of its products' comparable values`);
      assert.equal(values.length >= 4, s.q1 !== undefined, `${m.id} ${key}: quartiles from four values`);
      assert.ok(products.includes(gradeById.get(s.typical)), `${m.id} ${key}: typical ${s.typical}`);
    }
  }
  // The rule once had a test per case that found it: PETG's median (headlines.test.js), eSUN PLA-Lite's unstated-load
  // heat deflection counted apart in PLA, and PLA's metal-filled grades counted apart from its range.
  const counted = (part) => db.materials.some((m) => Object.values(m.summary ?? {}).some((s) => s[part]?.n > 0));
  assert.ok(counted('asPublished') && counted('variants'), 'nothing is counted apart, so that half of the rule is untested');
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

// D90: where a printer maker's guide asks for an enclosure on its own enclosed printers, its row declares the chamber
// "enclosed" and the H2C's heated chamber meets it; a row that asks without declaring it leaves the chamber unknown.
test("a guide's enclosure is the H2C's chamber only where its row declares it, and never over a product's own statement", () => {
  let read = 0;
  for (const guide of db.printGuide) {
    if (guide.chamber.state === 'enclosed') {
      assert.equal(guide.enclosureState, 'recommended', `${guide.id}: declares the chamber enclosed but asks for no enclosure`);
      assert.equal(guide.gates.chamber.verdict, 'within', guide.id);
    }
    for (const { materialId } of guide.materials) {
      for (const g of db.grades.filter((x) => isProduct(x) && x.materialId === materialId)) {
        const from = g.print?.from?.chamber;
        if (from?.origin !== 'guide') continue;
        const expected = guide.chamber.state === 'enclosed' ? 'within'
          : guide.enclosureState === 'recommended' && guide.chamber.state === 'unknown' ? 'unknown' : guide.gates.chamber.verdict;
        assert.equal(g.print.chamber.verdict, expected, `${g.id}: its chamber is the guide row's`);
        if (guide.chamber.state === 'enclosed') {
          read++;
          assert.match(g.print.chamber.reason, /enclosure/, g.id);
          assert.ok(g.print.chamber.reason.endsWith(`(${from.label})`), `${g.id}: the reason names the guide`);
        }
      }
    }
  }
  assert.ok(read > 100, `only ${read} products read the guide's enclosure as the H2C's chamber`);
});

// D93: a maker's own "enclosure needed" or "recommended", with no temperature, reads as the guide's tick does, for the
// types the guide asks an enclosure for, labelled as the maker's words; a stated chamber still decides.
test("a maker's own enclosure with no temperature is the H2C's chamber for the guide's enclosure types, in its words", () => {
  const profileById = new Map(db.profiles.map((p) => [p.id, p]));
  const guideOf = (materialId) => db.printGuide.find((x) => x.materials.some((y) => y.materialId === materialId));
  const printed = (c) => !/^(not published)?$/i.test(String(c.text ?? '').trim());
  const own = (id) => db.profiles.filter((p) => p.gradeId === id && !p.retired);
  let makers = 0;
  for (const g of db.grades.filter(isProduct)) {
    if (g.print?.chamber?.state !== 'enclosed' || g.print.from?.chamber?.origin === 'guide') continue;
    // Where it is not the guide's, it is a profile of the product's own, or of its twin's, that asks for an enclosure,
    // prints no chamber row, and is of a type the guide declares enclosed; the reason quotes its words.
    const p = profileById.get(g.print.chamber.profileId);
    const holder = g.print.from?.chamber?.origin === 'twin' ? g.print.from.chamber.gradeId : g.id;
    assert.equal(p?.gradeId, holder, `${g.id}: its enclosed chamber is not a profile of ${holder}`);
    assert.equal(p.enclosureState, 'recommended', `${g.id} ${p.id}`);
    assert.ok(!printed(p.chamber), `${g.id} ${p.id}: its chamber row prints "${p.chamber.text}"`);
    assert.equal(guideOf(g.materialId)?.chamber.state, 'enclosed', `${g.id}: its type's guide asks no enclosure`);
    assert.ok(g.print.chamber.reason.includes(`"${p.enclosure}"`), `${g.id}: the reason does not quote the maker's words`);
    assert.equal(g.print.chamber.verdict, 'within', g.id);
    assert.ok(own(holder).every((q) => q === p || (!printed(q.chamber) && ['unknown', 'enclosed'].includes(q.chamber.state))), `${g.id}: another of its profiles states the chamber`);
    makers++;
  }
  // The converse: no product of those types whose own sheets ask for an enclosure and print no chamber stays unknown.
  for (const g of db.grades.filter((x) => isProduct(x) && guideOf(x.materialId)?.chamber.state === 'enclosed')) {
    const mine = own(g.id);
    if (!mine.some((p) => p.enclosureState === 'recommended') || mine.some((p) => printed(p.chamber) || !['unknown', 'enclosed'].includes(p.chamber.state))) continue;
    assert.notEqual(g.print.chamber.verdict, 'unknown', `${g.id}: its maker asks for an enclosure and states no temperature, and it stays unknown`);
  }
  assert.ok(makers > 20, `only ${makers} products read their maker's enclosure as the H2C's chamber`);
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
