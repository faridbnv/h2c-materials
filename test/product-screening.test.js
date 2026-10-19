import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateProducts } from '../app/js/engine/constraints.js';
import { productHeadline, productsByMaterial } from '../app/js/engine/products.js';
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

test('a likely estimate is UNKNOWN, orders "Not enough data" and never creates a PASS (D155)', () => {
  // Its likely (80 %) range meets the limit: likely. A range that crosses it, or a second open number with nothing to go
  // on, is not.
  const g = grade('G1', {}, { tensileModulusXY: prediction(5.5, 8, 6) });
  const e = run([g]);
  assert.equal(e.verdict, 'UNKNOWN');
  assert.equal(e.group, 'not-enough-data');
  assert.equal(e.likely, true);
  assert.match(e.groupReason, /^Not enough data, likely: G1, tensileModulusXY estimated 5\.5 to 8 GPa$/);
  const crossing = grade('G2', {}, { tensileModulusXY: prediction(3, 8, 6) });
  assert.equal(run([crossing]).likely, false, 'a centre that meets the limit is not enough: the range shown must');
  assert.equal(run([g], [stiff, hot]).likely, false);
  assert.equal(run([g], [stiff, hot]).group, 'not-enough-data');
  assert.equal(run([g], [stiff], { ...ctx, unknownPolicy: 'strict' }).eligible, false);
  // A product's own estimate that wholly misses (its plausible range fails, though no product estimate may hide): unlikely.
  const low = grade('G3', {}, { tensileModulusXY: { ...prediction(1, 3, 2), canScreen: false } });
  const u = run([low]);
  assert.equal(u.group, 'unlikely-to-meet');
  assert.equal(u.screened, false);
  assert.equal(u.eligible, true, 'unlikely to meet is listed and counted, never hidden');
});

test('one check away: only a printer check open, or one requirement on the line (D155)', () => {
  const silent = grade('G1', { tensileModulusXY: v(6) });
  silent.print.chamber = { verdict: 'unknown', reason: 'No temperature published' };
  const gates = ['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate }));
  const e = run([silent], [stiff, ...gates]);
  assert.equal(e.group, 'one-check-away');
  assert.equal(e.groupReason, 'One check away on 1 of 1 product: G1, its chamber temperature is not stated');
  // With a number open as well, it is not one check away.
  assert.equal(run([silent], [stiff, hot, ...gates]).group, 'not-enough-data');
});

test('a measured miss with no product meeting the number makes the material unlikely; a product that meets it stops that', () => {
  const miss = grade('G1', { tensileModulusXY: v(2) });
  const open = grade('G2', {}, {});
  const e = run([miss, open]);
  assert.equal(e.verdict, 'UNKNOWN');
  assert.equal(e.group, 'unlikely-to-meet');
  assert.match(e.groupReason, /every measured product misses tensileModulusXY at least 5 GPa: 1 of 2; the other one has no value measured that way/);
  const meets = grade('G3', { tensileModulusXY: v(6) }, {});
  meets.print.bed = { verdict: 'unknown', reason: 'No temperature published' };
  const f = run([miss, open, meets], [stiff, { kind: 'gate', gate: 'bed' }]);
  assert.equal(f.group, 'one-check-away');
  assert.equal(f.gradeId, 'G3', 'the deciding product is the one a single check would settle');
});

// Stage 3d: a value only a ceiling for the printed part (CV05) can only fail a minimum, and a bound from another record or
// a limit of its kind is not a measured value, so none holds a material open against a measured miss; each is counted
// apart from the products with no value (R06: PEBA's rubbers that fail on CL01 had read as "no value measured that way").
test('a ceiling-only value, a bound from another record and a limit of its kind never hold a material open; each is counted', () => {
  const miss = grade('G1', { hdt045: { value: 60, level: 'comparable', unit: '°C' } });
  const ceiling = grade('G2', { hdt045: { value: 110, level: 'comparable', unit: '°C', ceilingOnly: true } });
  const open = grade('G3');
  const e = run([miss, ceiling, open], [hot]);
  assert.deepEqual([e.verdict, e.group], ['UNKNOWN', 'unlikely-to-meet']);
  assert.match(e.groupReason, /misses hdt045 at least 90 °C: 1 of 3; 1 publishes only a moulded or undescribed bar's value, the most a print reaches; the other one has no value measured that way$/);
  const bound = (rule, kind, hi) => ({ lo: null, hi, by: [{ rule, kind, status: 'deciding', level: 'comparable', lo: null, hi, ...(rule.startsWith('CL') ? { limit: { lo: null, hi } } : { measurementId: 'V1', sourceValue: hi }) }] });
  const rubber = grade('G4'); rubber.states[0].bounds = { tensileModulusXY: bound('CL01', 'ceiling', 0.5) };
  const banded = grade('G5'); banded.states[0].bounds = { tensileModulusXY: bound('CV08', 'band', 4.81) };
  const measured = grade('G6', { tensileModulusXY: v(0.04) });
  const f = run([measured, rubber, banded, grade('G7')]);
  assert.equal(f.group, 'unlikely-to-meet', 'a band end 4 % short holds nothing open');
  assert.match(f.groupReason, /: 1 of 4; 1 more fails on a limit of its kind of plastic; 1 more fails on a bound from another of its records; the other one has no value measured that way$/);
  // A value measured the way asked, on the line, still holds it open.
  const near = grade('G8', { tensileModulusXY: v(4.8) });
  const ctxLine = { ...ctx, db: { registry: { headlines: [{ key: 'tensileModulusXY', testScatter: { value: 10, is: 'relative' } }] } } };
  assert.notEqual(run([measured, near], [stiff], ctxLine).group, 'unlikely-to-meet');
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
  // iSANMATE's plausible range is a fit that moves with every product the model learns from (it reached 5.05 GPa, then
  // 4.99 once m422 typed the annealing two PETG sheets state), so the requirement that crosses it is read from it: a limit
  // between its likely and its plausible top, which the range crosses whatever the refit.
  const isanmate = gs.find((g) => g.id === 'G034-02').estimate.tensileModulusXY;
  const crossing = { ...stiff, value: Number(((isanmate.hi + isanmate.plausible.hi) / 2).toFixed(2)) };
  assert.ok(isanmate.plausible.lo < crossing.value && crossing.value < isanmate.plausible.hi);
  const across = evaluateProducts(m, gs, [crossing], { ...ctx, db });
  assert.equal(across.verdict, 'UNKNOWN');
  assert.equal(across.screened, false);
  useRegistry(db.registry);
  const rows = [{ material: m, evaluation: e }];
  assert.match(toCSV(rows, db.meta, { scenario: { constraints: [stiff] } }), /Candidate group,Likely/);
  assert.match(toCSV(rows, db.meta, { scenario: { constraints: [stiff] } }), new RegExp(`,${e.group},`));
  const csv = productsCSV(rows, db, { productsByMaterial: new Map([[m.id, gs]]) });
  for (const g of gs) assert.ok(csv.includes(g.id), `exports retain unresolved product ${g.id}`);
});

test('the table groups keep column order, and "Not enough data" puts the likely first, then the nearest (D155)', () => {
  const rows = [['A', 9, 'unlikely-to-meet'], ['B', 3, 'one-check-away'], ['C', 1, 'meets'], ['D', 5, 'one-check-away'],
    ['E', 8, 'not-enough-data', false, 0.3], ['F', 7, 'not-enough-data', true, 0.1], ['G', 6, 'not-enough-data', false, 0.1], ['H', 4, 'not-enough-data', false, Infinity]]
    .map(([id, value, group, likely = false, shortfall = 0]) => ({ material: { id, name: id, headline: { tensileModulusXY: { known: true, value } } }, evaluation: { group, likely, shortfall } }));
  const sorted = sortRows(rows, { scenario: { unknownPolicy: 'exploration', constraints: [stiff] }, sort: { key: 'tensileModulusXY', dir: 'desc' }, columnSet: 'properties', ctx: {} });
  assert.deepEqual(sorted.map((r) => r.material.id), ['C', 'D', 'B', 'F', 'G', 'E', 'H', 'A']);
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

// D148 (the screening review, C03): a material with products is judged product by product, so its own estimate is never
// read for a requirement (productHeadline, estimateVersion 2). The words stopped promising it could exclude one: 117
// estimates marked "may exclude" were never read. Only a material with no product on record is judged on it.
test('the estimate of a material with products is described as never hiding it; one with no product keeps its screen', async () => {
  const { estimateTitle } = await import('../app/js/ui/labels.js');
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
  useRegistry(db.registry);
  const byMaterial = productsByMaterial(db);
  const screens = (m) => Object.entries(m.headline).find(([, x]) => !x.known && x.estimate?.canScreen);
  const withProducts = db.materials.find((m) => byMaterial.get(m.id).length && screens(m));
  const [key, h] = screens(withProducts);
  const d = { lo: '1', hi: '2', centre: '1.5', unit: h.estimate.unit, plausible: ['0.5', '3'], num: String };
  const words = estimateTitle(h.estimate, d);
  assert.match(words, /Context only: this material is judged product by product.*hides nothing/);
  assert.doesNotMatch(words, /excludes this material|hides this material/);
  // The export says "context only" for it, never "can screen".
  const csv = toCSV([{ material: withProducts, evaluation: { verdict: 'UNKNOWN', eligible: true, failed: [], unresolved: [] } }], db.meta,
    { scenario: { constraints: [], unknownPolicy: 'exploration' }, useEstimates: true, productsByMaterial: byMaterial });
  assert.match(csv, new RegExp(`${key} ~[^|]*context only\\)`));
  assert.doesNotMatch(csv, /can screen/);
  // A material with no product on record (PA66-CF, PA612, PA612-GF) is judged on its own estimate, which may hide it.
  const productless = db.materials.find((m) => !m.familyEntry && !byMaterial.get(m.id).length && screens(m));
  assert.match(estimateTitle(screens(productless)[1].estimate, d, { productless: true }), /it hides this material, which has no product on record, from/);
});

// D148 (the screening review, C04): a property that does not apply is named as such, once per material, never as "Screened
// by an estimate". TPC's chip had repeated "HDT at 0.45 MPa at least 100 °C" ten times under that heading.
test('the screened chip names a property that does not apply once per material, apart from estimates', async () => {
  const { screenedChip, screenedByKind, SCREEN_PREFIX } = await import('../app/js/ui/labels.js');
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
  useRegistry(db.registry);
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 };
  const na = (id) => ({ status: 'UNKNOWN', screened: true, notApplicable: true, constraint: hdt, criterion: 'hdt045 >= 100',
    reason: `${id}: Does not apply: HDT is a rigid-bar test. ISO 75 ends at 0.2 % outer-fibre strain.` });
  const e = { screened: true, unresolved: ['G1', 'G2', 'G3'].map(na), products: [] };
  assert.deepEqual(screenedByKind(e), { notApplicable: ['HDT at 0.45 MPa at least 100 °C'], estimate: [], polymer: [] });
  const chip = screenedChip(e);
  assert.equal(chip.text, `${SCREEN_PREFIX.notApplicable}: HDT at 0.45 MPa at least 100 °C (HDT is a rigid-bar test). Not a failure; the property is not defined for it.`);
  assert.equal(chip.head, 'Does not apply');
  assert.doesNotMatch(chip.text, /estimate/);
});

// Stage 3d: the page's words for the groups, a hidden row, a failing row and a nylon judged dry.
test('the page names the UNKNOWN groups, says why a row is hidden or failed, and tags a nylon judged dry', async () => {
  const { unknownGroups, unknownGroupWords, hiddenWhy, failWhy } = await import('../app/js/ui/labels.js');
  const { humidMark, unknownMark, failMark } = await import('../app/js/ui/table.js');
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url)));
  useRegistry(db.registry);
  const ev = [['one-check-away'], ['not-enough-data'], ['not-enough-data'], ['unlikely-to-meet'], ['hidden']].map(([group]) => ({ verdict: 'UNKNOWN', group, unresolved: [] }));
  assert.equal(unknownGroupWords(unknownGroups(ev, { explore: true })), '1 one check away, 2 not enough data, 1 unlikely to meet, 1 hidden');
  assert.equal(unknownGroupWords(unknownGroups([]), { explore: true }), '', 'no sentence for nothing');
  const hdt = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80 };
  const hidden = { verdict: 'UNKNOWN', group: 'hidden', screened: true, unresolved: [{ status: 'UNKNOWN', screened: true, notApplicable: true, constraint: hdt,
    reason: 'Maker X: Does not apply: HDT is a rigid-bar test. ISO 75 ends at 0.2 % outer-fibre strain.' }] };
  assert.equal(hiddenWhy(hidden), 'does not apply: HDT is a rigid-bar test');
  assert.match(unknownMark(hidden), /class="row-sub hidden-why">does not apply: HDT is a rigid-bar test</);
  const bed = { verdict: 'FAIL', failed: [{ status: 'FAIL', constraint: { kind: 'gate', gate: 'bed' }, reason: 'Requires up to 200 °C; the H2C reaches only 120 °C' }] };
  assert.equal(failWhy(bed), 'fails: bed temperature, needs up to 200 °C (the H2C reaches 120 °C)');
  assert.match(failMark(bed), /fail-why/);
  const hot = { verdict: 'FAIL', failed: [{ status: 'FAIL', constraint: { ...hdt, value: 100 }, observed: 90, unit: '°C' }] };
  assert.equal(failWhy(hot), 'fails: HDT at 0.45 MPa at least 100 °C, published 90 °C');
  // A nylon (polymers.csv Water uptake high) passing a stiffness judged dry says so; PA12 (low) and a conditioned part do not.
  const scenario = { constraints: [{ kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true }] };
  const pass = { verdict: 'PASS' };
  assert.match(humidMark({ estimateIdentity: 'PA6' }, pass, { db, scenario }), />judged dry; humid air lowers its stiffness</);
  assert.equal(humidMark({ estimateIdentity: 'PA12' }, pass, { db, scenario }), '');
  assert.equal(humidMark({ estimateIdentity: 'PA6' }, pass, { db, scenario: { ...scenario, moisture: 'conditioned' } }), '');
});
