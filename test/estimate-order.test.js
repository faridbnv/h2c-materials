// The physical order of the numbers shown (D126): an ultimate strength is at least the yield and break stress its own
// measurements print, a strain at break at least the strain at yield, HDT at 0.45 MPa at least HDT at 1.8 MPa, and no
// estimate of a semicrystalline polymer's heat deflection lies above its melting point. The estimates are floored by the
// bounds of a printed bar or one whose source states no specimen, in any direction; a moulded bar, a film and a filament
// strand stay out. A product's value is the greatest of the stress endpoints one test prints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { orderViolations } from '../build/src/estimate/order.js';
import { lowerBoundsOf } from '../build/src/lower-bounds.js';
import { ruleValue } from '../build/src/products.js';

const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
const material = (id) => db.materials.find((m) => m.id === id);
const grade = (id) => db.grades.find((g) => g.id === id);
const def = (key) => db.registry.headlines.find((h) => h.key === key);

test('no estimate lies under what its own measurements prove, and none above its polymer\'s melting point', () => {
  const broken = orderViolations(db).filter((v) => v.kind !== 'grade-value');
  assert.deepEqual(broken.map((v) => v.message), []);
});

test('a one-product material\'s estimate is floored by its break, yield or unspecified strength, whatever the direction (M064, M139)', () => {
  // PA-ESD publishes a break stress of 68 MPa on a bar whose source states no specimen; its estimate ran 44.9 to 66.5.
  const esd = material('M064').headline.tensileStrengthXY;
  assert.ok(esd.impliedBounds.some((b) => b.lo === 68));
  assert.ok(esd.estimate.lo >= 68 && esd.estimate.plausible.lo >= 68 && esd.estimate.centre >= 68);
  // The LCP publishes a yield stress of 200 MPa and a heat deflection of 193 °C at 1.8 MPa: its 0.45 MPa value is no lower.
  const lcp = material('M139');
  assert.ok(lcp.headline.tensileStrengthXY.estimate.plausible.lo >= 200);
  assert.ok(lcp.headline.hdt045.estimate.plausible.lo >= 193 && lcp.headline.hdt045.estimate.lo >= 193);
});

test('a moulded bar bounds nothing: M131 publishes a moulded yield of 70.2 MPa and its estimate is not floored by it', () => {
  const m = material('M131');
  assert.equal(m.headline.tensileStrengthXY.impliedBounds.length, 0);
  assert.ok(db.measurements.some((x) => x.id === 'V004157' && x.specimenForm === 'moulded' && x.value === 70.2));
  assert.deepEqual(lowerBoundsOf(def('tensileStrengthXY'), db.measurements.filter((x) => x.materialId === 'M131')), []);
});

test('a grade\'s estimate is floored by its own formulation\'s measurements, not its siblings\' (G001-10)', () => {
  // The PLA publishes a break stress of 53.5 MPa and a yield of 50.2; its estimate ran 35 to 48.8.
  const e = grade('G001-10').estimate.tensileStrengthXY;
  assert.ok(e.lo >= 53.5 && e.plausible.lo >= 53.5 && e.centre >= 53.5);
  // A sibling's break stress does not floor another grade's: the PLA material is bounded by the highest of its products,
  // its grades by their own.
  const floors = db.grades.filter((g) => g.materialId === 'M001' && g.estimate?.tensileStrengthXY).map((g) => g.estimate.tensileStrengthXY.plausible.lo);
  assert.ok(new Set(floors).size > 1, 'every PLA grade has the same lower end');
});

test('a product\'s strength is the greatest endpoint its test prints, and says which it compared (G020-08)', () => {
  // The PETG's sheet prints a yield of 43 and a break of 52 MPa, both with no stated direction; the rule chose the yield.
  const v = grade('G020-08').headline.tensileStrengthXY;
  assert.equal(v.value, 52);
  assert.equal(v.measurementId, 'V002846');
  assert.deepEqual(v.endpoints.map((e) => [e.property, e.value]).sort(), [['Tensile break strength', 52], ['Tensile yield strength', 43]]);
  // The value is still a measurement the headline may cite.
  assert.equal(db.measurements.find((x) => x.id === v.measurementId).value, v.value);
});

test('another source\'s endpoint is another test and is not compared; a pin keeps its priority', () => {
  const own = db.measurements.filter((x) => x.gradeId === 'G020-08');
  const d = def('tensileStrengthXY');
  const g = grade('G020-08');
  assert.equal(ruleValue(g, d, own).value, 52);
  const elsewhere = own.map((x) => (x.id === 'V002846' ? { ...x, sourceId: 'X-ANOTHER-SHEET' } : x));
  const separate = ruleValue(g, d, elsewhere);
  assert.equal(separate.value, 43);
  assert.equal(separate.endpoints, undefined);
  // A published upper bound ("< 60") proves nothing about the value and is never the maximum.
  const capped = own.map((x) => (x.id === 'V002846' ? { ...x, value: 60, interval: { lo: null, hi: 60, kind: 'range' }, operator: '<' } : x));
  assert.equal(ruleValue(g, d, capped).value, 43);
});

test('a material\'s range contains every product\'s floor and starts at the lowest only where every product has one (PA6, PE-GF)', () => {
  // PA6's products prove tensile floors from 27 to 80 MPa. The range reaches 80 from above; the lowest floor, 27, is a
  // floor only because every active product of the material has one.
  for (const [id, key] of [['M049', 'tensileStrengthXY'], ['M138', 'tensileStrengthXY']]) {
    const h = material(id).headline[key];
    const floors = h.impliedBounds.map((b) => b.lo);
    assert.ok(h.estimate.plausible.hi >= Math.max(...floors) && h.estimate.hi >= Math.max(...floors), id);
    assert.ok(h.estimate.plausible.lo < Math.max(...floors), `${id} is floored at the highest of its products' floors`);
  }
});

// The check itself, on a small database whose numbers are chosen to break each part of it.
const tiny = (estimate, overrides = {}) => ({
  registry: { headlines: [
    { key: 'tensileStrengthXY', estimated: true, unit: 'MPa', lowerBounds: { properties: ['Tensile break strength'], loadMPa: null, excludeMoisture: [] } },
    { key: 'hdt045', estimated: true, unit: '°C', lowerBounds: null },
  ] },
  polymers: [{ id: 'PA', morphology: 'semicrystalline', meltingPointC: 220 }],
  grades: [{ id: 'G1', materialId: 'M1', formulationKey: null, retired: false, headline: {}, estimate: {} }],
  materials: [{ id: 'M1', name: 'X', estimateIdentity: 'PA', gradeIds: ['G1'], headline: { tensileStrengthXY: { known: false, estimate }, hdt045: { known: false, estimate: overrides.hdt } } }],
  measurements: [{ id: 'V1', materialId: 'M1', gradeId: 'G1', property: 'Tensile break strength', value: 68, unit: 'MPa', numeric: true, quarantined: false, implausible: false,
    specimenForm: 'not-stated', operator: '=', postProcessingState: 'not-stated', moistureState: 'not-stated', direction: 'unknown', ...overrides.measurement }],
});
const est = (lo, hi) => ({ centre: (lo + hi) / 2, lo, hi, plausible: { lo: lo - 2, hi: hi + 2 }, unit: 'MPa' });

test('the check names the estimate, the number and the measurement that bounds it', () => {
  const [v] = orderViolations(tiny(est(45, 66)));
  assert.equal(v.kind, 'material-estimate');
  assert.equal(v.measurementId, 'V1');
  // Only the numbers under the floor are named; its plausible upper end of 68 is not under it.
  assert.deepEqual(Object.keys(v.shown).sort(), ['centre', 'likely hi', 'likely lo', 'plausible lo']);
  assert.match(v.message, /lies under 68 MPa, the highest floor among its products, its own tensile break strength \(V1\)/);
  assert.equal(orderViolations(tiny(est(70, 80))).length, 0);
  // Rounded to three figures a floor of 72.04 is shown as 72, which is not a violation.
  assert.equal(orderViolations(tiny(est(74, 80), { measurement: { value: 72.04 } })).length, 0);
});

test('a material is checked against the highest floor of its products from above, and the lowest from below only if each has one', () => {
  const two = (estimate, third = false) => {
    const db = tiny(estimate);
    const bar = (id, gradeId, value) => ({ ...db.measurements[0], id, gradeId, value });
    db.measurements = [bar('V1', 'G1', 68), bar('V2', 'G2', 60), ...(third ? [] : [])];
    db.grades.push({ id: 'G2', materialId: 'M1', formulationKey: null, retired: false, headline: {}, estimate: {} });
    if (third) db.grades.push({ id: 'G3', materialId: 'M1', formulationKey: null, retired: false, headline: {}, estimate: {} });
    return db;
  };
  const e = (lo, hi) => ({ centre: (lo + hi) / 2, lo, hi, plausible: { lo, hi }, unit: 'MPa' });
  assert.equal(orderViolations(two(e(61, 70))).filter((v) => v.kind === 'material-estimate').length, 0);
  const [high] = orderViolations(two(e(61, 66)));
  assert.match(high.message, /highest floor among its products/);
  assert.deepEqual(Object.keys(high.shown), ['likely hi', 'plausible hi']);
  const [low] = orderViolations(two(e(55, 70)));
  assert.match(low.message, /the lowest floor among its products, which every one has/);
  // A third product without a floor leaves nothing to floor the lower end by.
  assert.equal(orderViolations(two(e(55, 70), true)).filter((v) => v.kind === 'material-estimate').length, 0);
});

test('a bar the data quarantines, flags implausible, or states as film or moulded floors nothing', () => {
  for (const measurement of [{ quarantined: true }, { implausible: true }, { specimenForm: 'moulded' }, { specimenForm: 'film' }, { operator: '<' }]) {
    assert.equal(orderViolations(tiny(est(45, 66), { measurement })).length, 0, JSON.stringify(measurement));
  }
});

test('a heat deflection estimate above the melting point of a semicrystalline polymer is a violation', () => {
  const hdt = { centre: 150, lo: 120, hi: 230, plausible: { lo: 100, hi: 240 }, unit: '°C' };
  const [v] = orderViolations(tiny(est(70, 80), { hdt }));
  assert.equal(v.kind, 'melting-point');
  assert.deepEqual(v.shown, { 'likely hi': 230, 'plausible hi': 240 });
  assert.equal(orderViolations(tiny(est(70, 80), { hdt: { ...hdt, hi: 215, plausible: { lo: 100, hi: 220 } } })).length, 0);
});
