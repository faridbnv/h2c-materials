// What the review of the estimate model corrected (D167): an annealed value never props up an as-printed estimate, an
// annealed conversion learns only from several makers, and a product's own values bound its estimate and its likely tag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { lowerBoundsOf } from '../build/src/lower-bounds.js';
import { ownBand } from '../build/src/estimate/anchor.js';
import { conversions } from '../build/src/estimate/conversions.js';
import { ESTIMATE_MODEL } from '../build/src/estimate/model.js';
import { evaluateProducts } from '../app/js/engine/constraints.js';

const hdt = (id, value, loadMPa, state) => ({ id, gradeId: 'G1', property: 'HDT', value, unit: '°C', numeric: true, specimenForm: 'printed',
  postProcessingState: state, moistureState: 'dry', thermal: { loadStated: true, loadMPa } });
const def = (changesWithAnnealing) => ({ changesWithAnnealing, lowerBounds: { properties: ['HDT'], loadMPa: 1.8, excludeMoisture: [], forms: ['printed', 'not-stated'] } });

test('an annealed value never floors an as-printed headline that changes with annealing (S01)', () => {
  // Bambu Lab PET-CF publishes only annealed values: its annealed 182 °C at 1.8 MPa held its as-printed estimate at 182.
  const own = [hdt('a', 182, 1.8, 'annealed')];
  assert.deepEqual(lowerBoundsOf(def(true), own), []);
  assert.deepEqual(lowerBoundsOf(def(false), own).map((b) => b.measurementId), ['a'], 'a headline annealing does not change keeps it');
  assert.deepEqual(lowerBoundsOf(def(true), [hdt('b', 90, 1.8, 'as-printed')]).map((b) => b.measurementId), ['b']);
});

test('an annealed conversion keeps its documented offset until 5 pairs of 2 makers publish both (S11)', () => {
  const model = { ...ESTIMATE_MODEL, conversions: { hdt045: {
    'HDT 0.45 annealed': { offset: -52, sd: 30, why: 'annealed', learns: 'pairs, several makers' },
    'HDT 1.8 semi-filled': { offset: 27, sd: 21, why: 'at 1.8 MPa', learns: 'pairs' } } } };
  const obs = (m, f, kind, y, maker) => ({ m: { id: m }, f, kind, yRaw: y, maker, items: [] });
  const pair = (i, maker) => [obs(`M${i}`, `F${i}`, 'HDT 0.45', 85, maker), obs(`M${i}`, `F${i}`, 'HDT 0.45 annealed', 190, maker)];
  const one = [1, 2, 3].flatMap((i) => pair(i, 'Siraya Tech'));
  assert.equal(conversions('hdt045', one, model)['HDT 0.45 annealed'].offset, -52, 'three pairs of one maker teach nothing');
  assert.equal(conversions('hdt045', one, model)['HDT 0.45 annealed'].learned, false);
  const several = [1, 2, 3, 4, 5].flatMap((i) => pair(i, i % 2 ? 'A' : 'B'));
  assert.ok(conversions('hdt045', several, model)['HDT 0.45 annealed'].offset < -52, 'five pairs of two makers refine it');
  // An annealed value at 1.8 MPa converts through its as-printed kind and then the annealed offset, never as printed.
  const c = conversions('hdt045', [...one, obs('M9', 'F9', 'HDT 1.8 semi-filled annealed', 120, 'C')], model)['HDT 1.8 semi-filled annealed'];
  assert.equal(c.offset, 27 - 52);
  assert.equal(c.composed, true);
});

test('a product\'s own values make bands; bands that do not meet are sheets that disagree (S02, S03)', () => {
  const model = { properties: { tensileModulusXY: { scale: 'log' } } };
  const head = { valueProperties: ['Tensile modulus'], testScatter: { value: 10, is: 'relative' } };
  const o = (kind, value, sd, conflict = false) => ({ kind, y: Math.log(value), half: 0, conversion: { sd }, conflict, items: [{ measurementId: kind, property: 'Tensile modulus' }] });
  const args = { def: head, model, key: 'tensileModulusXY', centreOf: (x) => x.y, zPlausible: 1.96 };
  // Extrudr DURAPRO PA6 CF: 1.1 GPa on a moulded bar, 6 GPa on an undescribed one.
  const durapro = ownBand({ ...args, own: [o('moulded', 0.954, 0.2, true), o('unk', 5.15, 0.175, true)] });
  assert.equal(durapro.disagree, true);
  const one = ownBand({ ...args, own: [o('unk', 2, 0.175)], scale: 2 });
  assert.equal(one.disagree, false);
  assert.ok(Math.exp(one.lo) < Math.exp(one.bands[0].lo) && Math.exp(one.hi) > Math.exp(one.bands[0].hi), 'the anchor is the band widened by its scale');
  assert.ok(Math.abs(ownBand({ ...args, own: [o('XY', 3, 0)] }).bands[0].hi - Math.log(3 * 1.1)) < 1e-9, 'never narrower than the test scatter');
  assert.equal(ownBand({ ...args, own: [{ ...o('flex', 3, 0.1), items: [{ property: 'Flexural modulus' }] }] }), null, 'another property makes no band');
});

test('no product is tagged likely against its own value, or where its own sheets disagree (S02, S03)', () => {
  const material = { id: 'M1', headline: { tensileModulusXY: { known: false, unit: 'GPa', missing: 'not-published' } }, summary: {}, gates: {} };
  const soft = { kind: 'numeric', property: 'tensileModulusXY', operator: '<=', value: 0.1 };
  const prediction = (ownBand) => ({ kind: 'product-model', centre: 0.03, lo: 0.02, hi: 0.04, unit: 'GPa', plausible: { lo: 0.015, hi: 0.05 },
    screenRange: null, canScreen: false, screening: { context: 'as-printed+dry', maxNumericTests: 5 }, evidence: [], screenLimit: 'test', ...(ownBand ? { ownBand } : {}) });
  const grade = (est) => ({ id: 'G1', materialId: 'M1', headline: {}, estimate: { tensileModulusXY: est },
    print: { profileIds: ['P1'], ...Object.fromEntries(['nozzle', 'bed', 'chamber'].map((a) => [a, { verdict: 'within', reason: 'within' }])) },
    states: [{ id: 'as-printed', treatment: null, moisture: 'dry', values: {} }] });
  const run = (est) => evaluateProducts(material, [grade(est)], [soft], { unknownPolicy: 'exploration', useEstimates: true });
  assert.equal(run(prediction()).likely, true);
  const band = (lo, hi) => ({ kind: 'tensile unk', measurementIds: ['V1'], lo, hi });
  assert.equal(run(prediction({ disagree: false, lo: 0.2, hi: 0.5, bands: [band(0.24, 0.48)] })).likely, false, 'its own band wholly misses');
  // Extrudr FLEX MEDIUM: 0.04 GPa moulded, 0.12 GPa undescribed.
  assert.equal(run(prediction({ disagree: true, bands: [band(0.023, 0.051), band(0.073, 0.146)] })).likely, false, 'its sheets disagree across the limit');
  assert.equal(run(prediction({ disagree: true, bands: [band(0.023, 0.051), band(0.06, 0.09)] })).likely, true, 'disagreeing sheets that both meet it');
});

const dbPath = new URL('../dist/db.json', import.meta.url);
test('the review\'s products, in the compiled database (S01, S02, S03, S05)', { skip: !existsSync(dbPath) }, () => {
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const est = (id, key) => db.grades.find((g) => g.id === id).estimate?.[key];
  // Bambu Lab PET-CF, Polymaker PET-CF17, Raise3D Hyper Speed PET CF publish only annealed heat values.
  for (const id of ['G067-01', 'G067-02', 'G067-07']) {
    const e = est(id, 'hdt045');
    assert.ok(e.centre < 100, `${id} as printed is a glassy PET-CF, not its annealed bar (${e.centre})`);
    assert.deepEqual(e.impliedBounds, []);
  }
  // No heat estimate of zero width (Bambu Lab PETG HF was 69 to 69 °C on its own annealed value).
  for (const g of db.grades) {
    const e = g.estimate?.hdt045;
    if (e) assert.ok(e.plausible.hi - e.plausible.lo >= 1, `${g.id} heat estimate ${e.plausible.lo} to ${e.plausible.hi}`);
  }
  assert.equal(est('G027-26', 'hdt045'), undefined, 'Yousu Modified ABS: its own 65 °C and its kind\'s 100 °C disagree');
  assert.ok(db.grades.find((g) => g.id === 'G027-26').estimateWithheld.hdt045.why);
  assert.equal(est('G050-05', 'tensileModulusXY').ownBand.disagree, true, 'Extrudr DURAPRO PA6 CF: 1.1 and 6 GPa');
  assert.ok(est('G050-05', 'tensileModulusXY').plausible.hi > 5, 'and no longer capped at 1.28 GPa');
});
