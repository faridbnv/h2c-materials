// The Ashby decision workspace (D107) against hand-worked fixtures: ACCEPTANCE.json of the makeover package
// (docs/audits/2026-09-29-ashby-makeover/ACCEPTANCE.md), T01 to T12.
//
// Every expected number below was worked by hand from the fixture's own values, and its arithmetic is written beside it.
// None is computed by the production index function, so a wrong exponent, a borrowed state or a marginal corner taken
// for a product fails here even where the chart and the engine agree with each other.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stateOf, parseStateId } from '../app/js/engine/products.js';
import { v, price, st, product, material, ask, scope, near } from './fixtures/workspace-fixture.js';
import { INDICES, indexById, selectionLine, rankingFor } from '../app/js/engine/indices.js';
import { buildWorkspace, estimateContext, indexSensitivity, judgedProducts, COST_AXIS } from '../app/js/engine/workspace.js';

// ------------------------------------------------------------------ fixture (test/fixtures/workspace-fixture.js)

// ------------------------------------------------------------------ T01, T02: index arithmetic and line geometry

// A: E 4 GPa, rho 1000 kg/m³; B: E 9 GPa, rho 1500 kg/m³; C: E 1 GPa, rho 1000 kg/m³.
// Beam, stiffness: M = E^(1/2) / rho. A: sqrt(4)/1000 = 2/1000 = 0.002. B: sqrt(9)/1500 = 3/1500 = 0.002.
// C: sqrt(1)/1000 = 0.001. At a cutoff of 0.002, A and B are at or above it (equality counts), C is not.
const trio = () => {
  const grades = [
    product('GA', 'MA', [st({ tensileModulusXY: v(4), density: v(1000) })]),
    product('GB', 'MB', [st({ tensileModulusXY: v(9), density: v(1500) })]),
    product('GC', 'MC', [st({ tensileModulusXY: v(1), density: v(1000) })]),
  ];
  return grades.map((g) => material(g.materialId, [g]));
};

test('T01: the beam index of each exact product, the line through it, and the count at or above it, by hand', () => {
  const { ctx, rows } = ask(trio(), [scope]);
  const beam = indexById('beam-stiffness');
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beam, lineM: 0.002 });
  const M = Object.fromEntries(ws.decision.map((p) => [p.gradeId, p.M]));
  assert.ok(near(M.GA, 0.002) && near(M.GB, 0.002) && near(M.GC, 0.001), JSON.stringify(M));
  assert.deepEqual(ws.decision.map((p) => [p.gradeId, p.x.value, p.y.value]), [['GA', 1000, 4], ['GB', 1500, 9], ['GC', 1000, 1]]);
  assert.equal(ws.line.orientation, 'direct');
  assert.equal(ws.line.drawable, true);
  assert.deepEqual([ws.line.above.pairs, ws.line.above.materials], [2, 2], 'A and B sit on the line; equality is at or above');
  assert.deepEqual(ws.line.above.keys.sort(), ['MA|GA|as-printed', 'MB|GB|as-printed']);
  // The line at rho = 1200: E = (M rho)^(1/n) = (0.002 x 1200)^2 = 2.4^2 = 5.76 GPa.
  const [p1, p2] = selectionLine(beam, 0.002, [1200, 2400]);
  assert.ok(near(p1.y, 5.76, 1e-12), `${p1.y}`);
  // Slope on log-log axes: (log 23.04 - log 5.76) / (log 2400 - log 1200) = log 4 / log 2 = 2.
  assert.ok(near((Math.log10(p2.y) - Math.log10(p1.y)) / (Math.log10(p2.x) - Math.log10(p1.x)), 2, 1e-12));
});

test('T02: every supported index has the exponent and log-log slope its algebra gives, and its line passes through (M rho)^(1/n)', () => {
  // n and slope 1/n, from the derivations in 03-DATA-AND-MATH-CONTRACT §6, written out here rather than read from INDICES.
  const expected = {
    'tie-stiffness': [1, 1], 'beam-stiffness': [1 / 2, 2], 'panel-stiffness': [1 / 3, 3],
    'tie-strength': [1, 1], 'beam-strength': [2 / 3, 3 / 2], 'panel-strength': [1 / 2, 2],
    'beam-stiffness-cost': [1 / 2, 2], 'tie-strength-cost': [1, 1],
  };
  for (const [id, [n, slope]] of Object.entries(expected)) {
    const index = indexById(id);
    assert.ok(index, id);
    assert.ok(near(index.exponent, n), `${id}: n`);
    assert.ok(near(index.slope, slope), `${id}: slope`);
    // At M = 0.01 and rho = 1000 the property on the line is (0.01 x 1000)^(1/n) = 10^(1/n): 10, 100 or 1000 GPa or MPa.
    const [p] = selectionLine(index, 0.01, [1000, 2000]);
    assert.ok(near(p.y, 10 ** (1 / n), 1e-9), `${id}: ${p.y} against ${10 ** (1 / n)}`);
    // Swapped axes (the property across, rho up): rho = P^n / M, so at P = 10^(1/n) the line is at rho = 10 / 0.01 = 1000.
    const [q] = selectionLine(index, 0.01, [10 ** (1 / n), 1], 'swapped');
    assert.ok(near(q.y, 1000, 1e-9), `${id} swapped: ${q.y}`);
  }
  assert.equal(INDICES.length, Object.keys(expected).length, 'a new index needs its hand-worked row here');
  // Strength indices say they rank on a strength proxy: the database's strength is tensile with its endpoint mostly unstated.
  for (const index of INDICES) assert.equal(!!index.strengthProxy, index.numerator === 'tensileStrengthXY', index.id);
});

// ------------------------------------------------------------------ T03: no synthetic conditioned fallback

test('T03: a dry product asked about the conditioned state passes its gates and is unranked, never ranked on dry stiffness', () => {
  const g = product('GA', 'MA', [st({ tensileModulusXY: v(4), density: v(1000) })]);
  const m = material('MA', [g]);
  const { ctx, rows, selection } = ask([m], [scope], { ctx: { moisture: 'conditioned' } });
  const entry = selection.evaluations[0].products[0];
  assert.equal(entry.verdict, 'PASS', 'the scope gate is not a mechanical value');
  assert.equal(entry.state.id, 'conditioned', 'judged in the state the question asks about');
  // The state it names holds no values; it is not the dry first state.
  const conditioned = stateOf(g, 'conditioned');
  assert.equal(conditioned.id, 'conditioned');
  assert.deepEqual(conditioned.values, {});
  assert.equal(conditioned.synthetic, true);
  assert.equal(stateOf(g, null).id, 'as-printed', 'no name at all is the first state');
  const ranking = rankingFor(rows, ctx, indexById('beam-stiffness'));
  assert.equal(ranking.order.length, 0, 'no conditioned modulus, so no rank');
  assert.deepEqual(ranking.unranked.map((u) => u.materialId), ['MA']);
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: indexById('beam-stiffness') });
  assert.equal(ws.decision.length, 0, 'nothing drawn at a dry coordinate');
  assert.equal(ws.gaps.length, 1);
  const [gap] = ws.gaps;
  assert.deepEqual(gap.missing.map((x) => [x.axis, x.reason]), [['y', 'other-state']], 'the modulus is published only in another state');
  assert.equal(gap.missing[0].elsewhere[0].stateId, 'as-printed');
  // Density is the registry's invariant: it may be read from the first state, and says so.
  const pair = ws.pairs[0];
  assert.equal(pair.x.value, 1000);
  assert.equal(pair.x.sourceStateId, 'as-printed');
  assert.equal(pair.x.stateInvariantByRegistry, true);
});

test('a state identifier is read back into its parts, and one it could not have written is refused', () => {
  assert.deepEqual(parseStateId('annealed:120:16+conditioned'), { treatment: { tempC: 120, hours: 16 }, moisture: 'conditioned' });
  assert.deepEqual(parseStateId('annealed:x:4'), { treatment: { tempC: null, hours: 4 }, moisture: 'dry' });
  assert.deepEqual(parseStateId('as-printed'), { treatment: null, moisture: 'dry' });
  assert.equal(parseStateId('annealed:hot:4'), null);
  const g = product('GA', 'MA', [st({ hdt045: v(80) })]);
  const missingAnneal = stateOf(g, 'annealed:120:16');
  assert.deepEqual([missingAnneal.treatment, missingAnneal.values], [{ tempC: 120, hours: 16 }, {}], 'an annealed state it does not publish borrows nothing');
});

// ------------------------------------------------------------------ T04 (fixture form): the judged state's coordinate

test('T04 (fixture): an annealed pass is drawn at its annealed heat deflection, and its density is read, labelled, from the first state', () => {
  // As printed: HDT 81.6 °C, no modulus as printed. Annealed at 120 °C for 16 h: modulus 4.1442 GPa, HDT 133.7 °C.
  const g = product('GF', 'MF', [
    st({ density: v(1430), hdt045: v(81.6, { measurementId: 'VP-HDT' }) }),
    st({ tensileModulusXY: v(4.1442), hdt045: v(133.7, { measurementId: 'VA-HDT' }) }, { treatment: { tempC: 120, hours: 16 } }),
  ]);
  const m = material('MF', [g]);
  const req = [scope, { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 4 }, { kind: 'numeric', property: 'hdt045', operator: '>=', value: 80 }];
  const dry = ask([m], req, { ctx: { unknownPolicy: 'exploration' } });
  assert.equal(dry.selection.evaluations[0].products[0].verdict, 'UNKNOWN', 'no oven: its modulus is published only annealed');
  const oven = ask([m], req, { ctx: { anneal: true, annealMaxC: 120 } });
  const entry = oven.selection.evaluations[0].products[0];
  assert.deepEqual([entry.verdict, entry.state.id], ['PASS', 'annealed:120:16']);
  const ws = buildWorkspace({ rows: oven.rows, ctx: oven.ctx, xKey: 'density', yKey: 'hdt045', xLog: true, yLog: false });
  const [p] = ws.decision;
  assert.deepEqual([p.y.value, p.y.measurementId, p.y.sourceStateId], [133.7, 'VA-HDT', 'annealed:120:16']);
  assert.deepEqual([p.x.value, p.x.sourceStateId, p.x.stateInvariantByRegistry], [1430, 'as-printed', true]);
});

// ------------------------------------------------------------------ T06: a marginal corner is not a product

test('T06: a material overview spans its products on each axis, and the attractive corner is no product and no rank', () => {
  const grades = [product('G1', 'M1', [st({ density: v(1000), tensileModulusXY: v(1) })]), product('G2', 'M1', [st({ density: v(1500), tensileModulusXY: v(9) })])];
  const m = material('M1', grades);
  const { ctx, rows } = ask([m], [scope]);
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: indexById('beam-stiffness') });
  const [summary] = ws.materialSummaries;
  assert.deepEqual([summary.x.lo, summary.x.hi, summary.y.lo, summary.y.hi], [1000, 1500, 1, 9]);
  assert.deepEqual(ws.decision.map((p) => [p.x.value, p.y.value]), [[1000, 1], [1500, 9]], 'the two paired products');
  assert.ok(!ws.decision.some((p) => p.x.value === 1000 && p.y.value === 9), 'no product at the phantom corner (1000, 9)');
  // The corner would score sqrt(9)/1000 = 0.003; the products score sqrt(1)/1000 = 0.001 and sqrt(9)/1500 = 0.002.
  // The material ranks by the median of its products: (0.001 + 0.002) / 2 = 0.0015, never 0.003.
  assert.ok(near(ws.ranking.order[0].value, 0.0015));
  assert.ok(near(ws.ranking.order[0].best.value, 0.002));
});

// ------------------------------------------------------------------ T07: measured spread with an estimated property

test('T07: estimate context keeps the measured product span, draws no centre, ranks nothing, and bounds the index over its rectangle', () => {
  const g = product('G1', 'M1', [st({ density: v(1150) })]);
  const m = material('M1', [g], {
    density: { known: true, value: 1150, unit: 'kg/m³', spread: { n: 7, min: 1130, max: 1200 } },
    tensileModulusXY: { known: false, missing: 'not-published', unit: 'GPa', estimate: { lo: 1, hi: 4, centre: 2.45, plausible: { lo: 0.5, hi: 6 }, screenRange: { lo: 0.5, hi: 6 }, precision: 'poor', strength: 'this-material', basis: 'its products', unit: 'GPa' } },
  });
  const { ctx, all } = ask([m], [scope], { ctx: { unknownPolicy: 'exploration' } });
  const beam = indexById('beam-stiffness');
  const { ranges } = estimateContext(all, ctx, { xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beam, orientation: 'direct' });
  assert.equal(ranges.length, 1);
  const [r] = ranges;
  assert.deepEqual([r.x.lo, r.x.hi, r.y.lo, r.y.hi], [1130, 1200, 1, 4], 'the density is its seven products\' span, not the median 1150');
  assert.equal(r.x.kind, 'product-span');
  assert.equal(r.y.kind, 'estimate');
  assert.ok(!('value' in r) && !('centre' in r.x), 'no centre point');
  // Endpoint sensitivity: M_low = sqrt(1)/1200 = 0.000833..., M_high = sqrt(4)/1130 = 0.00176991...
  assert.ok(near(r.sensitivity.lo, 1 / 1200) && near(r.sensitivity.hi, 2 / 1130), JSON.stringify(r.sensitivity));
  assert.ok(near(r.sensitivity.lo, 0.0008333333333333334) && near(r.sensitivity.hi, 0.0017699115044247787));
  // The likely, plausible and screening ranges travel apart.
  assert.deepEqual([r.y.plausible, r.y.screenRange], [{ lo: 0.5, hi: 6 }, { lo: 0.5, hi: 6 }]);
  const ws = buildWorkspace({ rows: all, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beam });
  assert.equal(ws.confirmed.length, 0, 'an estimate never confirms');
  assert.equal(ws.ranking.order.length, 0, 'and never ranks');
  // A dry estimate is not a conditioned one.
  const wet = estimateContext(all, { ...ctx, moisture: 'conditioned' }, { xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true });
  assert.deepEqual([wet.ranges.length, wet.unavailable[0].reason], [0, 'conditioned']);
  // Open, or reaching zero on a Log axis: unavailable, never drawn at a made-up end.
  assert.equal(indexSensitivity(beam, 'direct', { lo: 1130, hi: 1200 }, { lo: null, hi: 4 }), null);
});

// ------------------------------------------------------------------ T08: the cost axis is one product's

test('T08: cost per volume is one product\'s own price times its own density; an unpriced product is listed, and a twin\'s price is not read', () => {
  // A: E 4 GPa, rho 1000 kg/m³, 20 CAD/kg: x = 20 x 1000 = 20,000 CAD/m³; M = sqrt(4)/20,000 = 0.0001.
  // B: E 9 GPa, rho 1500 kg/m³, 10 USD/kg at the fixture's 1.4 CAD per USD = 14 CAD/kg: x = 14 x 1500 = 21,000 CAD/m³;
  //    M = sqrt(9)/21,000 = 1.4285714...e-4. B is better. (A fixture rate, not a current exchange rate; the page holds CAD
  //    prices only, and a price in another currency reaches it only through the gap-fill plan's dated conversion.)
  const a = product('GA', 'MA', [st({ tensileModulusXY: v(4), density: v(1000), priceCADkg: price(20) })]);
  const b = product('GB', 'MB', [st({ tensileModulusXY: v(9), density: v(1500), priceCADkg: price(10 * 1.4) })]);
  // A twin of B: B's sheet (same values, read as D89 reads them) but no offer of its own, so no price.
  const twin = product('GT', 'MB', [st({ tensileModulusXY: { ...v(9), from: { origin: 'twin', gradeId: 'GB', label: 'same sheet as Maker GB' } }, density: v(1500) })]);
  const mA = material('MA', [a]), mB = material('MB', [b, twin]);
  const { ctx, rows } = ask([mA, mB], [scope]);
  const cost = indexById('beam-stiffness-cost');
  const ws = buildWorkspace({ rows, ctx, xKey: COST_AXIS, yKey: 'tensileModulusXY', xLog: true, yLog: true, index: cost });
  const byGrade = Object.fromEntries(ws.decision.map((p) => [p.gradeId, p]));
  assert.ok(near(byGrade.GA.x.value, 20000) && near(byGrade.GB.x.value, 21000));
  assert.ok(near(byGrade.GA.M, 0.0001) && near(byGrade.GB.M, 0.00014285714285714287));
  assert.equal(ws.ranking.order[0].materialId, 'MB', 'B is better');
  assert.equal(ws.line.orientation, 'direct');
  assert.ok(!byGrade.GT, 'the twin has no price of its own, so no cost coordinate');
  assert.deepEqual(ws.gaps.map((g) => [g.gradeId, g.missing[0].reason]), [['GT', 'unpriced']]);
  assert.equal(ws.counts.gaps.unpriced, 1);
});

// ------------------------------------------------------------------ T09: denominators

test('T09: product states and materials are counted apart, and context is never counted as the decision set', () => {
  const grades = [product('G1', 'M1', [st({ density: v(1000), tensileModulusXY: v(4) })]), product('G2', 'M1', [st({ density: v(1100), tensileModulusXY: v(2) })]),
    product('G3', 'M1', [st({ density: v(1050) })])];
  const other = product('G4', 'M2', [st({ density: v(1200), tensileModulusXY: v(3.5) })]);
  const req = [scope, { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3 }];
  const { ctx, rows } = ask([material('M1', grades), material('M2', [other])], req, { ctx: { unknownPolicy: 'exploration' } });
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY' });
  // G1 and G4 pass; G2 fails (2 < 3); G3 publishes no modulus and is unresolved.
  assert.deepEqual([ws.counts.decision.pairs, ws.counts.decision.materials], [2, 2]);
  assert.deepEqual([ws.counts.failed.pairs, ws.counts.unresolved.pairs, ws.counts.unresolved.products], [1, 0, 1], 'G3 cannot be drawn, but it is counted');
  assert.equal(ws.counts.products, 4);
  assert.ok(ws.frontier.every((k) => ws.decision.some((p) => p.key === k)), 'the front is exact confirmed pairs only');
});

// ------------------------------------------------------------------ T10: the line is a guide (D108)

test('T10: the line counts the products on its better side, equality included, and moving it changes no rank, verdict or mark', () => {
  const beam = indexById('beam-stiffness');
  // Material M1: products at M = sqrt(4)/1000 = 0.002 and sqrt(1)/1000 = 0.001, median 0.0015.
  // Material M2: one product at sqrt(9)/1500 = 0.002. Material M3: one at sqrt(2.25)/1500 = 1.5/1500 = 0.001.
  const ms = [
    material('M1', [product('G1', 'M1', [st({ density: v(1000), tensileModulusXY: v(4) })]), product('G2', 'M1', [st({ density: v(1000), tensileModulusXY: v(1) })])]),
    material('M2', [product('G3', 'M2', [st({ density: v(1500), tensileModulusXY: v(9) })])]),
    material('M3', [product('G4', 'M3', [st({ density: v(1500), tensileModulusXY: v(2.25) })])]),
  ];
  const { ctx, rows } = ask(ms, [scope]);
  const at = (lineM) => buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true, index: beam, lineM });
  const high = at(0.002), low = at(0.0005);
  // At 0.002 (equality included): G1 and G3, from M1 and M2. At 0.0005: all four, from three materials.
  assert.deepEqual([high.line.above.pairs, high.line.above.materials], [2, 2]);
  assert.deepEqual(high.line.above.keys.map((k) => k.split('|')[1]).sort(), ['G1', 'G3']);
  assert.deepEqual([low.line.above.pairs, low.line.above.materials], [4, 3]);
  // Medians: M2 0.002, M1 0.0015, M3 0.001. One material ranks at or above 0.002.
  assert.equal(high.line.rankedAbove, 1);
  for (const ws of [high, low]) {
    assert.deepEqual(ws.ranking.order.map((r) => r.materialId), ['M2', 'M1', 'M3'], 'moving the line re-ranks nothing');
    assert.equal(ws.decision.length, 4, 'and sets no mark aside');
    assert.equal(ws.setAside, undefined);
  }
  assert.deepEqual(rows.map((r) => r.evaluation.verdict), ['PASS', 'PASS', 'PASS'], 'the requirements\' verdicts are the engine\'s');
});

// ------------------------------------------------------------------ material ranges, as the page summarises a material (D108)

test('a material range is the middle half of its products from four up, whiskers to the extremes, a declared variant apart', () => {
  // Five plain products and one wood-filled variant. Densities 1200, 1220, 1240, 1250, 1300 (and the variant's 800);
  // stiffness 1, 2, 2.5, 3, 4 (and 2.6). Sorted, the quartiles at positions (5 - 1) x 0.25 = 1 and x 0.75 = 3 are the
  // second and fourth values: density 1220 and 1250, stiffness 2 and 3; the medians 1240 and 2.5.
  const plain = [[1200, 1], [1220, 2], [1240, 2.5], [1250, 3], [1300, 4]].map(([d, E], i) => product(`G${i + 1}`, 'M1', [st({ density: v(d), tensileModulusXY: v(E) })]));
  const wood = product('G9', 'M1', [st({ density: v(800), tensileModulusXY: v(2.6) })], { variant: 'lightweight additive' });
  const { ctx, rows } = ask([material('M1', [...plain, wood])], [scope]);
  const ws = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true });
  const [s] = ws.materialSummaries;
  assert.deepEqual([s.x.lo, s.x.q1, s.x.median, s.x.q3, s.x.hi, s.x.n], [1200, 1220, 1240, 1250, 1300, 5]);
  assert.deepEqual([s.y.lo, s.y.q1, s.y.median, s.y.q3, s.y.hi], [1, 2, 2.5, 3, 4]);
  assert.equal(s.x.quartiles, true);
  assert.deepEqual(s.variants.map((k) => k.split('|')[1]), ['G9'], 'the variant is drawn apart');
  assert.equal(s.paired.length, 6, 'and every product, the variant too, is a mark');
  assert.ok(!s.inRange.some((k) => k.includes('|G9|')));
  // Fewer than four: the box is the full range, and says so.
  const three = ask([material('M2', plain.slice(0, 3).map((g) => ({ ...g, materialId: 'M2' })))], [scope]);
  const [t] = buildWorkspace({ rows: three.rows, ctx: three.ctx, xKey: 'density', yKey: 'tensileModulusXY', xLog: true, yLog: true }).materialSummaries;
  assert.deepEqual([t.x.q1, t.x.q3, t.x.quartiles], [1200, 1240, false]);
});

// ------------------------------------------------------------------ T11: log axes, open ranges, three kinds of spread

test('T11: a value at or below zero is counted off a Log axis, never clamped; a source ± stays the source\'s', () => {
  const g1 = product('G1', 'M1', [st({ density: v(1100), glassTransition: v(-30) })]);
  const g2 = product('G2', 'M1', [st({ density: v(1200), glassTransition: v(60), tensileModulusXY: v(3, { uncertainty: 0.2, interval: { lo: 2.8, hi: 3.2, kind: 'uncertainty' } }) })]);
  const m = material('M1', [g1, g2]);
  const { ctx, rows } = ask([m], [scope]);
  const logWs = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'glassTransition', xLog: true, yLog: true });
  assert.deepEqual(logWs.decision.map((p) => p.gradeId), ['G2']);
  assert.equal(logWs.counts.offLog, 1, 'counted, not drawn at an epsilon');
  const linWs = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'glassTransition', xLog: true, yLog: false });
  assert.deepEqual(linWs.decision.map((p) => [p.gradeId, p.y.value]), [['G1', -30], ['G2', 60]], 'linear shows it');
  const e = buildWorkspace({ rows, ctx, xKey: 'density', yKey: 'tensileModulusXY' });
  const p = e.decision.find((q) => q.gradeId === 'G2');
  assert.deepEqual([p.y.uncertainty, p.y.interval.kind], [0.2, 'uncertainty'], 'the source\'s own ± term, as published');
});

// ------------------------------------------------------------------ T12: freshness

test('T12: changed data or a changed release is never served from a stale result', () => {
  const g = product('G1', 'M1', [st({ density: v(1000), tensileModulusXY: v(4) })]);
  const m = material('M1', [g]);
  const first = ask([m], [scope]);
  const a = buildWorkspace({ rows: first.rows, ctx: first.ctx, xKey: 'density', yKey: 'tensileModulusXY' });
  // The same rows and context give the same judged products back; a changed judging setting is judged again.
  const once = judgedProducts(first.rows, first.ctx);
  assert.equal(judgedProducts(first.rows, first.ctx), once);
  first.ctx.evidence = 'as-published';
  assert.notEqual(judgedProducts(first.rows, first.ctx), once, 'a changed context is never served from before');
  // A new release with a changed value: new rows, a new answer everywhere.
  g.states[0].values.tensileModulusXY = v(5);
  const second = ask([m], [scope], { release: 'fixture-2' });
  const b = buildWorkspace({ rows: second.rows, ctx: second.ctx, xKey: 'density', yKey: 'tensileModulusXY' });
  assert.deepEqual([a.decision[0].y.value, b.decision[0].y.value], [4, 5]);
  assert.deepEqual([a.releaseId, b.releaseId], ['fixture-1', 'fixture-2']);
});
