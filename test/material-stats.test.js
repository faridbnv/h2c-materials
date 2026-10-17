// The display statistics the material pages draw and the drawer does not (app/js/ui/material-stats.js): each pinned
// against the compiled fields it reads, or against the facts layer function it must agree with, over every material
// with a page. They decide nothing; these tests keep them saying what the build compiled.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useRegistry, REGISTRY } from '../app/js/ui/registry.js';
import { setH2cBaseline, h2cLimit } from '../app/js/ui/labels.js';
import { indexDb, materialContext, rankTable, rankOf, comparisonsOf, shareOf, isProduct } from '../app/js/ui/material-facts.js';
import { printSpread } from '../app/js/ui/print-spread.js';
import { pageOf } from '../app/js/ui/page-rule.js';
import {
  percentileAmong, propertyProfile, materialMap, layerPairs, printWindows, acceptedAt, dryingStats, heatLadder, summarise,
} from '../app/js/ui/material-stats.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
setH2cBaseline(db.meta.h2cBaseline);
const ix = indexDb(db);
const PAGED = db.materials.filter((m) => !m.familyEntry && pageOf(m, ix.measurementsByMaterial.get(m.id) ?? []));
const ranks = rankTable(db);
const contexts = new Map(PAGED.map((m) => [m.id, materialContext(db, m.id, { showEstimates: true })]));

test('percentileAmong counts the other materials\' medians below a value, a tie as half, as rankOf counts them', () => {
  for (const [key, rank] of Object.entries(ranks)) {
    for (const e of rank.entries.slice(0, 40)) {
      const p = percentileAmong(rank, e.id, e.value);
      const r = rankOf(rank, e.id);
      const others = rank.entries.length - 1;
      if (!others) { assert.equal(p, null, `${key} ${e.id}: no other material`); continue; }
      // rankOf counts this material's own value among the level ones; percentileAmong leaves it out.
      assert.equal(p.below, r.below, `${key} ${e.id}: below`);
      assert.equal(p.above, r.above, `${key} ${e.id}: above`);
      assert.equal(p.others, others, `${key} ${e.id}: the others`);
      assert.ok(Math.abs(p.pct - ((p.below + p.level / 2) / others) * 100) < 1e-9, `${key} ${e.id}: the per cent`);
      assert.ok(p.pct >= 0 && p.pct <= 100);
    }
  }
});

test('propertyProfile reads each key property\'s compiled median and quartiles, and places them in order', () => {
  for (const m of PAGED) {
    for (const r of propertyProfile(m, ranks)) {
      const e = m.headline?.[r.key];
      assert.equal(r.known, !!e?.known, `${m.id} ${r.key}: known as the build says`);
      if (!r.known) continue;
      assert.equal(r.median, e.value, `${m.id} ${r.key}: the median is the build's`);
      assert.equal(r.n, e.spread?.n ?? m.summary?.[r.key]?.n ?? 1, `${m.id} ${r.key}: the products counted`);
      if (r.lo != null) {
        // The place of a quartile is never past the place of the median: the per cent is monotone in the value.
        assert.ok(r.lo <= r.at.pct + 1e-9 && r.at.pct <= r.hi + 1e-9, `${m.id} ${r.key}: ${r.lo} ≤ ${r.at.pct} ≤ ${r.hi}`);
      }
    }
  }
});

test('layerPairs gives shareOf\'s shares, product by product, for every pair of orientations', () => {
  let pairs = 0;
  for (const m of PAGED) {
    const c = contexts.get(m.id);
    for (const f of comparisonsOf(m, c, 'Mechanical')) {
      for (const p of f.pairs) {
        const [a, b] = p.gr.rows;
        const lp = layerPairs(a, b, f.byKey, c);
        assert.deepEqual(lp.map((x) => x.ratio), shareOf(a, b, f.byKey, c) ?? [], `${m.id} ${a.key}/${b.key}`);
        for (const x of lp) {
          assert.equal(x.ratio, x.z.v.value / x.xy.v.value);
          assert.equal(x.xy.g.id, x.z.g.id, 'one product');
        }
        pairs += lp.length;
      }
    }
  }
  assert.ok(pairs > 100, `${pairs} products with both orientations`);
});

test('materialMap places every material with both medians, and names the eight with most products and the base polymer', () => {
  for (const m of PAGED.slice(0, 30)) {
    const map = materialMap(db, ranks, 'tensileModulusXY', 'tensileStrengthXY', m.id);
    const both = ranks.tensileModulusXY.entries.filter((e) => ranks.tensileStrengthXY.entries.some((f) => f.id === e.id));
    assert.equal(map.points.length, both.length, `${m.id}: every material with both`);
    assert.ok(!map.landmarks.includes(m.id), `${m.id}: never named as a landmark itself`);
    const others = map.points.filter((p) => !p.self).sort((a, b) => b.products - a.products || a.name.localeCompare(b.name));
    assert.deepEqual(map.landmarks.slice(0, 8), others.slice(0, 8).map((p) => p.id), `${m.id}: the eight with the most products`);
    const base = others.find((p) => db.materials.find((x) => x.id === p.id).name === m.basePolymer);
    if (base) assert.ok(map.landmarks.includes(base.id), `${m.id}: its base polymer ${base.name} is named`);
    assert.ok(map.landmarks.length <= 9);
  }
});

test('printWindows counts each degree the counted windows include, and its spans hold what they say', () => {
  for (const m of PAGED) {
    const c = contexts.get(m.id);
    const products = c.grades.filter(isProduct);
    const spread = printSpread(products);
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      const pw = printWindows(products, axis);
      assert.equal(pw.limit, h2cLimit(axis));
      const counted = pw.windows.filter((w) => w.counted);
      assert.equal(pw.n, counted.length);
      // Each window is the product's own gate, as print-spread reads it.
      for (const w of pw.windows) assert.deepEqual([w.min, w.max], [w.g.print[axis].min, w.g.print[axis].max], `${m.id} ${axis} ${w.g.id}`);
      // The windows with both ends are print-spread's entries on both rows; those with one end, its one-end count.
      const a = spread.find((x) => x.axis === axis);
      assert.equal(pw.windows.length + pw.oneEnd, a.rows[0].entries.length + a.oneEnd.high, `${m.id} ${axis}: windows and one-ended ones`);
      assert.equal(pw.oneEnd, a.oneEnd.low + a.oneEnd.high, `${m.id} ${axis}: one-ended windows`);
      if (!pw.n) { assert.equal(pw.peak, null); continue; }
      for (const t of [pw.runs[0].from, pw.peak.from, pw.runs.at(-1).to]) {
        assert.equal(acceptedAt(pw, t), counted.filter((w) => w.min <= t && t <= w.max).length, `${m.id} ${axis} at ${t}`);
      }
      assert.equal(pw.peak.k, Math.max(...pw.runs.map((r) => r.k)), `${m.id} ${axis}: the peak is the most`);
      if (pw.most) for (let t = pw.most.from; t <= pw.most.to; t++) assert.ok(acceptedAt(pw, t) > pw.n / 2, `${m.id} ${axis}: ${t} in the most span`);
      if (pw.every) for (let t = pw.every.from; t <= pw.every.to; t++) assert.equal(acceptedAt(pw, t), pw.n, `${m.id} ${axis}: ${t} in every window`);
    }
    const d = dryingStats(products);
    assert.deepEqual(d.temps, spread.find((x) => x.axis === 'drying').rows[0].summary, `${m.id}: drying as print-spread summarises it`);
  }
});

test('heatLadder takes the key properties\' compiled summaries as they are, and orders the rungs by median', () => {
  for (const m of PAGED) {
    const rows = heatLadder(m, contexts.get(m.id), ['Vicat softening temperature', 'Melting temperature']);
    for (const r of rows) {
      if (r.compared) assert.equal(r.summary, m.summary[r.h.key], `${m.id} ${r.id}: the build's own summary`);
      else assert.ok(!REGISTRY.allHeadlines.some((h) => h.key === r.id), `${m.id} ${r.id}: a property as published`);
      assert.ok(r.summary.n > 0);
    }
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].summary.median <= rows[i].summary.median, `${m.id}: lowest first`);
  }
  assert.deepEqual(summarise([3, 1, 2, 4]), { n: 4, min: 1, max: 4, median: 2.5, q1: 1.75, q3: 3.25 });
});
