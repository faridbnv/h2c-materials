// A material answered by its products (D83, re-center phase 2): each product is judged on every requirement at once,
// and the material says whether all, some or none of the products that could be judged pass. These use small
// hand-built materials so each rule is visible; build/snapshot/templates.csv shows what they do to the data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSelection, explainExclusions, evaluateProducts, STATUS, UNKNOWN_POLICY, SHARE } from '../app/js/engine/constraints.js';
import { productView, EVIDENCE } from '../app/js/engine/products.js';

const EXPLORE = { unknownPolicy: UNKNOWN_POLICY.EXPLORATION };
const STRICT = { unknownPolicy: UNKNOWN_POLICY.STRICT };
const missing = (unit) => ({ known: false, missing: 'not-published', unit });
const within = { verdict: 'within', reason: 'Needs up to 230 °C, within the H2C\'s 350 °C' };
const recipe = (over = {}) => ({ profileIds: ['P1'], nozzle: { ...within, state: 'range', min: 200, max: 230, profileId: 'P1' },
  bed: { ...within, state: 'range', min: 50, max: 60, profileId: 'P1' }, chamber: { ...within, state: 'not-required', min: null, max: null, profileId: 'P1' },
  enclosure: 'unknown', hardenedNozzle: null, drying: null, anneal: [], ...over });

// A material whose own headline knows nothing, with products that publish.
const material = (grades, over = {}) => ({
  id: 'M1', name: 'Test', excluded: false, gradeIds: grades.map((g) => g.id),
  headline: { tensileModulusXY: missing('GPa'), hdt045: missing('°C') },
  summary: { tensileModulusXY: { products: grades.length, n: grades.filter((g) => g.headline.tensileModulusXY?.level === 'comparable').length } },
  gates: { scope: 'within', nozzle: within, bed: within, chamber: within, abrasive: 'unknown', drying: 'unknown' },
  facets: { reinforcement: { value: 'unfilled', origin: 'source' } },
  ...over,
});
const grade = (id, values, print = recipe()) => ({ id, materialId: 'M1', headline: values, print });
const v = (value, level = 'comparable', caveat) => ({ value, level, measurementId: 'V000001', ...(caveat ? { caveat } : {}) });
const stiff = { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 };
const hot = { kind: 'numeric', property: 'hdt045', operator: '>=', value: 100 };
const run = (m, constraints, ctx) => runSelection([m], constraints, { ...ctx, productsByMaterial: new Map([[m.id, m.gradeIds.map((id) => m.__grades.find((g) => g.id === id))]]) }).evaluations[0];
const withGrades = (grades, over) => Object.assign(material(grades, over), { __grades: grades });

test('a material passes when one product meets every requirement, and says whether all or only some do', () => {
  const some = withGrades([grade('G1', { tensileModulusXY: v(3.4) }), grade('G2', { tensileModulusXY: v(2.1) }), grade('G3', {})]);
  const e = run(some, [stiff], STRICT);
  assert.equal(e.verdict, STATUS.PASS);
  assert.equal(e.share, SHARE.SOME);
  assert.deepEqual(e.counts, { products: 3, pass: 1, fail: 1, untested: 1, screened: 0 });
  assert.equal(e.gradeId, 'G1', 'the reasons are the passing product\'s');
  const all = withGrades([grade('G1', { tensileModulusXY: v(3.4) }), grade('G3', {})]);
  assert.equal(run(all, [stiff], STRICT).share, SHARE.ALL, 'an untested product does not stop "all that could be judged"');
});

test('requirements are met together on one product, never one by one across products', () => {
  // G1 is stiff and not hot, G2 hot and not stiff. Pooled, the material would look as if it met both.
  const m = withGrades([grade('G1', { tensileModulusXY: v(3.4), hdt045: v(80) }), grade('G2', { tensileModulusXY: v(2.1), hdt045: v(120) })]);
  const e = run(m, [stiff, hot], EXPLORE);
  assert.equal(e.verdict, STATUS.FAIL);
  assert.equal(e.share, SHARE.NONE);
});

// D100 revises D83's "none passes and one fails is a failure": one measured failure beside an unmeasured product is
// unresolved, and fails only when every product fails (test/metamorphic.test.js holds the counterexample).
test('every product failing is a failure; one failing beside one unmeasured is unresolved; nothing judged is unknown', () => {
  const allFail = withGrades([grade('G1', { tensileModulusXY: v(2.1) }), grade('G2', { tensileModulusXY: v(2.4) })]);
  assert.equal(run(allFail, [stiff], EXPLORE).verdict, STATUS.FAIL);
  const fails = withGrades([grade('G1', { tensileModulusXY: v(2.1) }), grade('G2', {})]);
  const mixed = run(fails, [stiff], EXPLORE);
  assert.equal(mixed.verdict, STATUS.UNKNOWN);
  assert.equal(mixed.someFail, true, 'no demonstrated pass, and one product that was judged fails');
  assert.deepEqual([mixed.counts.pass, mixed.counts.fail, mixed.counts.untested], [0, 1, 1]);
  assert.equal(mixed.eligible, true, 'Include uncertain keeps it');
  assert.equal(run(fails, [stiff], STRICT).eligible, false, 'Confirmed only does not');
  const silent = withGrades([grade('G1', {}), grade('G2', {})]);
  const e = run(silent, [stiff], EXPLORE);
  assert.equal(e.verdict, STATUS.UNKNOWN);
  assert.equal(e.eligible, true, 'Include uncertain keeps it, flagged');
  assert.equal(run(silent, [stiff], STRICT).eligible, false);
});

test('a value published without the direction decides only when the reader admits such values (D84)', () => {
  const m = withGrades([grade('G1', { tensileModulusXY: v(3.4, 'as-published', 'unstated-direction') })]);
  const e = run(m, [stiff], EXPLORE);
  assert.equal(e.verdict, STATUS.UNKNOWN);
  assert.match(e.unresolved[0].reason, /without the specimen orientation/);
  assert.equal(run(m, [stiff], { ...EXPLORE, evidence: EVIDENCE.AS_PUBLISHED }).verdict, STATUS.PASS);
});

test("a product is judged on its own print recipe, and one without a profile is unknown, never a pass", () => {
  const nozzle = { kind: 'gate', gate: 'nozzle' };
  const hotNozzle = recipe({ nozzle: { verdict: 'exceeds', reason: 'Requires up to 400 °C, the H2C provides 350 °C', state: 'range', min: 380, max: 400, profileId: 'P2' } });
  const m = withGrades([grade('G1', { tensileModulusXY: v(3.4) }, hotNozzle), grade('G2', { tensileModulusXY: v(3.2) }, null)]);
  const e = run(m, [stiff, nozzle], STRICT);
  // The stiff product cannot be printed; the other has no recipe, so it is unresolved and holds the material (D100).
  assert.equal(e.verdict, STATUS.UNKNOWN, 'the stiff product cannot be printed; the other has no recipe');
  assert.deepEqual(e.counts, { products: 2, pass: 0, fail: 1, untested: 1, screened: 0 });
  const view = productView(m, m.__grades[1]);
  assert.equal(view.gates.nozzle.verdict, 'unknown');
});

test("the material's estimate stands in only where none of its products publishes a comparable value", () => {
  const estimate = { lo: 1.5, hi: 2.2, plausible: { lo: 1.2, hi: 2.5 }, screenRange: { lo: 1.2, hi: 2.5 }, canScreen: true, unit: 'GPa' };
  const headline = { tensileModulusXY: { ...missing('GPa'), estimate, impliedBounds: [] }, hdt045: missing('°C') };
  const none = withGrades([grade('G1', {}), grade('G2', {})], { headline, summary: { tensileModulusXY: { products: 2, n: 0 } } });
  const e = run(none, [stiff], { ...EXPLORE, useEstimates: true });
  assert.equal(e.screened, true, 'no product publishes, so the estimate screens for all of them');
  const some = withGrades([grade('G1', { tensileModulusXY: v(2.0) }), grade('G2', {})], { headline, summary: { tensileModulusXY: { products: 2, n: 1 } } });
  const f = run(some, [stiff], { ...EXPLORE, useEstimates: true });
  assert.equal(f.verdict, STATUS.UNKNOWN, 'one product fails; the silent one is untested, which leaves the material unresolved (D100)');
  assert.equal(f.screened, false, 'and an untested product is not screened by an estimate that stands for none of them');
  assert.equal(productView(some, some.__grades[1]).headline.tensileModulusXY.estimate, undefined, 'a silent product beside a sibling that publishes is untested, not estimated');
});

test('a material with no product is judged on its own headline, as before', () => {
  const m = withGrades([], { headline: { tensileModulusXY: { known: true, value: 3.5, unit: 'GPa', interval: { lo: 3.5, hi: 3.5, kind: 'point' } }, hdt045: missing('°C') } });
  const e = evaluateProducts(m, [], [stiff], STRICT);
  assert.equal(e.verdict, STATUS.PASS);
  assert.equal(e.share, null);
});

test('why excluded counts a material removed only when none of its products meets the requirement', () => {
  const pass = withGrades([grade('G1', { tensileModulusXY: v(3.4) }), grade('G2', { tensileModulusXY: v(2.1) })]);
  const fail = Object.assign(withGrades([grade('G3', { tensileModulusXY: v(2.0) })]), { id: 'M2' });
  const ctx = { ...STRICT, productsByMaterial: new Map([['M1', pass.__grades], ['M2', fail.__grades]]) };
  const [x] = explainExclusions([pass, fail], [stiff], ctx);
  assert.equal(x.removed, 1);
  assert.equal(x.productsRemoved, 2);
});

test('a material ranks by the median index of its passing products, computed product by product', async () => {
  const { rankMaterials, indexById } = await import('../app/js/engine/indices.js');
  const withDensity = (id, e, rho) => grade(id, { tensileModulusXY: v(e), density: v(rho) });
  const m = withGrades([withDensity('G1', 3.0, 1000), withDensity('G2', 4.0, 2000), withDensity('G3', 1.0, 1000)]);
  m.headline.density = missing('kg/m³');
  const pbm = new Map([['M1', m.__grades]]);
  const { evaluations } = runSelection([m], [{ kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2 }], { ...STRICT, productsByMaterial: pbm });
  const [r] = rankMaterials(evaluations, [m], pbm, indexById('tie-stiffness'), (mat, g) => productView(mat, g));
  // G1: 3.0/1000 = 0.003, G2: 4.0/2000 = 0.002; G3 fails and does not count. A median of medians would give 3.5/1000.
  assert.equal(r.products, 2);
  assert.equal(r.value, 0.0025);
  assert.equal(r.best.gradeId, 'G1');
});

test('a link carries the goal and the evidence level only when set, and an old link reads as it did', async () => {
  const { toHash, fromHash, newScenario } = await import('../app/js/engine/scenario.js');
  const s = { ...newScenario({ snapshot: 'x' }), rankBy: 'tie-stiffness', evidence: 'as-published' };
  const back = fromHash(toHash(s), { snapshot: 'x' }).scenario;
  assert.equal(back.rankBy, 'tie-stiffness');
  assert.equal(back.evidence, 'as-published');
  const plain = newScenario({ snapshot: 'x' });
  assert.ok(!/"r"|"v"/.test(decodeURIComponent(toHash(plain))), 'defaults add nothing to a link');
  const bad = fromHash(encodeURIComponent(JSON.stringify({ c: [], r: 'no-such-index', v: 'anything' })), { snapshot: 'x' }).scenario;
  assert.equal(bad.rankBy, null);
  assert.equal(bad.evidence, 'comparable');
});

test("a reader's assumption stands in for a product with no value that may decide, and never over one that does", () => {
  const assumed = { known: true, value: 0.175, unit: 'GPa', assumption: true, interval: { lo: 0.175, hi: 0.175, kind: 'point' } };
  const m = withGrades([grade('G1', { tensileModulusXY: v(3.4, 'as-published', 'unstated-direction') }), grade('G2', { tensileModulusXY: v(3.2) })],
    { headline: { tensileModulusXY: assumed, hdt045: missing('°C') } });
  assert.equal(productView(m, m.__grades[0]).headline.tensileModulusXY.assumption, true, 'a value that is not comparable does not decide, so the assumption does');
  assert.equal(productView(m, m.__grades[0], { evidence: EVIDENCE.AS_PUBLISHED }).headline.tensileModulusXY.value, 3.4, 'admitted, the published value decides');
  assert.equal(productView(m, m.__grades[1]).headline.tensileModulusXY.value, 3.2, 'a comparable value is never overridden');
});

test("a value or a print gate read from a twin's sheet or a printer maker's guide decides like the product's own, and says where it came from (D88, D89)", () => {
  const twin = { origin: 'twin', gradeId: 'G1', label: 'data sheet shared with Maker One' };
  const guide = { origin: 'guide', guideId: 'PG001', sourceId: 'S-GUIDE', guide: "Maker's Filament Guide for T", label: "from Maker's Filament Guide for T" };
  const read = { profileIds: [], nozzle: { ...within, reason: `${within.reason} (${guide.label})`, state: 'range', min: 200, max: 230, profileId: null },
    bed: { verdict: 'unknown', reason: 'No print profile recorded for this product', state: 'unknown', min: null, max: null, profileId: null },
    chamber: { verdict: 'unknown', reason: 'No print profile recorded for this product', state: 'unknown', min: null, max: null, profileId: null },
    enclosure: 'unknown', hardenedNozzle: true, drying: null, anneal: [], from: { nozzle: guide, hardenedNozzle: guide } };
  const m = withGrades([grade('G1', { tensileModulusXY: v(3.4) }, null), grade('G2', { tensileModulusXY: { ...v(3.4), from: twin } }, read)]);
  const e = run(m, [stiff, { kind: 'gate', gate: 'nozzle' }], STRICT);
  assert.equal(e.verdict, STATUS.PASS, "the twin passes on its sibling's value and the guide's nozzle window");
  assert.deepEqual(e.counts, { products: 2, pass: 1, fail: 0, untested: 1, screened: 0 });
  const view = productView(m, m.__grades[1]);
  assert.match(view.gates.nozzle.reason, /from Maker's Filament Guide for T/);
  assert.equal(view.gates.bed.verdict, 'unknown', 'a part neither its own sheet nor the guide states stays unknown');
  const abrasive = evaluateProducts(m, m.__grades.slice(1), [{ kind: 'gate', gate: 'abrasive' }], STRICT);
  assert.equal(abrasive.verdict, STATUS.FAIL);
  assert.match(abrasive.results[0].reason, /from Maker's Filament Guide for T/);
  const value = evaluateProducts(m, m.__grades.slice(1), [stiff], STRICT);
  assert.match(value.results[0].reason, /data sheet shared with Maker One/);
});

test('one ranking for every lens: only passing products rank, in the state they pass in, and a candidate that cannot rank says so (D102)', async () => {
  const { rankingFor, indexById } = await import('../app/js/engine/indices.js');
  const dense = (id, e, rho) => grade(id, { tensileModulusXY: v(e), density: v(rho) });
  // G2 fails the requirement, and its index would be the best: it must not lift its material.
  const m = withGrades([dense('G1', 3.0, 1000), dense('G2', 1.0, 100)]);
  m.headline.density = missing('kg/m³');
  const alone = withGrades([dense('G1', 3.0, 1000)]);
  alone.headline.density = missing('kg/m³');
  const req = [{ kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 2 }];
  const rowsOf = (mat) => { const e = run(mat, req, STRICT); return [{ material: mat, evaluation: e }]; };
  const ctxOf = (mat) => ({ productsByMaterial: new Map([['M1', mat.__grades]]) });
  const r1 = rankingFor(rowsOf(m), ctxOf(m), indexById('tie-stiffness'));
  const r2 = rankingFor(rowsOf(alone), ctxOf(alone), indexById('tie-stiffness'));
  assert.equal(r1.order[0].value, r2.order[0].value, "a failing product's better index does not improve the rank");
  assert.equal(r1.order[0].best.gradeId, 'G1');
  // A passing product that publishes no density cannot rank, and the ranking says so rather than dropping it silently.
  const bare = withGrades([grade('G1', { tensileModulusXY: v(3.0) })]);
  bare.headline.density = missing('kg/m³');
  const r3 = rankingFor(rowsOf(bare), ctxOf(bare), indexById('tie-stiffness'));
  assert.equal(r3.order.length, 0);
  assert.deepEqual(r3.unranked.map((u) => u.materialId), ['M1']);
  assert.match(r3.unranked[0].reason, /density/);
});
