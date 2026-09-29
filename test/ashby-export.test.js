// The data behind the Ashby picture (D107, D108): the chart's CSV carries the question, the axes and scales, the goal, its
// line, every population with its own count, and what each kind of range means; its rows are the marks, each with its
// identity, state, inputs and verdict, and a confirmed product that cannot be drawn says why. The workspace's own fixture
// (test/fixtures/workspace-fixture.js), read as the page reads it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useRegistry } from '../app/js/ui/registry.js';
import { chartDataCSV, workspaceFor } from '../app/js/ui/decision.js';
import { REGISTRY, v, price, st, product, material, ask, scope } from './fixtures/workspace-fixture.js';

// The page's registry carries labels the fixture's need not: the ones the chart's words read.
useRegistry({ headlines: REGISTRY.headlines.map((h) => ({ ...h, kind: h.key === 'priceCADkg' ? 'price' : 'measurement', valueProperties: [], labels: { short: h.labels.plain, plain: h.labels.plain, technical: h.labels.plain, hint: '', axis: h.labels.plain, export: h.labels.plain }, filter: { group: 'Mechanical', operator: '>=', example: '', nonNegative: true } })), properties: [] });

function pageState({ plot = {}, rankBy = 'beam-stiffness' } = {}) {
  const grades = [
    product('GA', 'MA', [st({ tensileModulusXY: v(4), density: v(1000), priceCADkg: price(20) })]),
    product('GB', 'MB', [st({ tensileModulusXY: v(9), density: v(1500) })]),
    product('GC', 'MB', [st({ density: v(1450) })]),
  ];
  const ms = [material('MA', [grades[0]]), material('MB', grades.slice(1))];
  const q = ask(ms, [scope, { kind: 'numeric', property: 'density', operator: '<=', value: 1600 }]);
  q.ctx.db.meta = { release: { id: 'fixture-1' }, snapshot: '2026-09-29', build: 'test' };
  q.ctx.db.materials = ms;
  const scenario = { constraints: [scope, { kind: 'numeric', property: 'density', operator: '<=', value: 1600 }], rankBy, anneal: false, moisture: 'dry',
    plot: { x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true, view: 'decision', layers: {}, indexM: 0.002, focus: [], ...plot } };
  return { db: q.ctx.db, scenario, ctx: q.ctx, rows: q.rows, examined: q.all, estimates: { ranges: [], unavailable: [] } };
}

test('the chart data says what the picture is: release, question, axes, line, populations and range meanings', () => {
  const state = pageState();
  const ws = workspaceFor(state);
  const csv = chartDataCSV(state, ws, { view: 'decision' });
  const head = csv.split('\n').filter((l) => l.startsWith('#')).join('\n');
  for (const want of [/release fixture-1/, /required: .*Density at most 1600/, /x: Density \(kg\/m³\), log; y: Stiffness \(GPa\), log/,
    /goal: Beam, minimum mass, stiffness prescribed, M = E\^\(1\/2\) \/ rho/, /line at M = 0\.002: 2 products from 2 materials on the better side \(a product on the line included\); a guide, which keeps and removes nothing/,
    /populations: 2 products from 2 materials drawn; 1 passing product not drawable/, /ranges: a material's box is the middle half of its products on each axis \(all of them under four\), whiskers to the lowest and highest, declared variants apart/]) {
    assert.match(head, want);
  }
  const rows = csv.split('\n').filter((l) => !l.startsWith('#')).slice(1);
  assert.equal(rows.length, 3, 'two decision marks and the product that cannot be drawn');
  const gc = rows.find((r) => r.includes(',GC,'));
  assert.match(gc, /^gap,/);
  assert.match(gc, /no comparable stiffness published in this state/);
  const ga = rows.find((r) => r.includes(',GA,'));
  assert.match(ga, /^decision,MA,Material MA,GA,Maker GA,,"as printed, dry",PASS,1000,V\d+,as-printed,4,V\d+,as-printed,0\.002,/);
});

test('the line in the data is a guide: each mark says whether it is on the better side, and nothing is set aside', () => {
  // GA: sqrt(4)/1000 = 0.002; GB: sqrt(9)/1500 = 0.002. At 0.0021 neither is on the better side; both are still drawn.
  const state = pageState({ plot: { indexM: 0.0021 } });
  const csv = chartDataCSV(state, workspaceFor(state), { view: 'decision' });
  assert.match(csv, /# line at M = 0\.0021: 0 products from 0 materials on the better side/);
  assert.doesNotMatch(csv, /stage|Kept by/);
  const rows = csv.split('\n').filter((l) => !l.startsWith('#')).slice(1);
  assert.equal(rows.filter((r) => r.startsWith('decision,')).length, 2);
  const at = pageState({ plot: { indexM: 0.002 } });
  const csv2 = chartDataCSV(at, workspaceFor(at), { view: 'decision' });
  assert.match(csv2.split('\n').find((r) => r.includes(',GA,')), /,0\.002,1,yes,/, 'GA: M, its material\'s rank, on the better side');
});

test('a cost goal names its price basis, and an unpriced product is a named gap, never a zero', () => {
  const state = pageState({ rankBy: 'beam-stiffness-cost', plot: { x: 'materialCostPerVolume', indexM: null } });
  const ws = workspaceFor(state);
  const csv = chartDataCSV(state, ws, { view: 'decision' });
  assert.match(csv, /# cost per volume: the product's own CAD\/kg price \(observed listings, dated\) x its own density; shipping excluded; no currency conversion/);
  assert.match(csv.split('\n').find((r) => r.includes(',GB,')), /no current Canadian price of its own/);
  // GA: 20 CAD/kg x 1000 kg/m³ = 20,000 CAD/m³.
  assert.match(csv.split('\n').find((r) => r.includes(',GA,')), /,20000,V\d+ CA\d+,as-printed,/, 'the density measurement and the price listing both');
});
