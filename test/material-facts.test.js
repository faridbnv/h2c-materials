// The contracts the material drawer and the static material pages share through app/js/ui/material-facts.js (the facts
// layer, documented in docs/audits/2026-10-16-material-pages-round/FACTS-API.md): the context a material is read through,
// the counts the drawer's tab strip prints, the rule that says which materials have a page, the active-products list the
// rule reads, the one scale rule, the product's name, the rank table of the pages' context strip, and the per-database
// index. A later change to the facts layer must not quietly make the drawer and the pages disagree; each test below
// names the pair it keeps together.
//
// Rendering is the cost (verify:fast has a budget), so the drawer is rendered once per sampled material and every test
// reads that copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDrawer } from '../app/js/ui/detail.js';
import { productName as buildProductName } from '../build/src/products.js';
import { useRegistry } from '../app/js/ui/registry.js';
import { setH2cBaseline } from '../app/js/ui/labels.js';
import { indexDb, materialContext, tabCounts, productName, productNameOrId, rankTable } from '../app/js/ui/material-facts.js';
import { PAGE_RULE, pageOf, pageFacts } from '../app/js/ui/page-rule.js';
import { stripScale } from '../app/js/ui/scales.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
setH2cBaseline(db.meta.h2cBaseline);

const REAL = db.materials.filter((m) => !m.familyEntry);
const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence'];

// ---------------------------------------------------------------------------------------------------------------------
// 1. The context

// The keys of `c`, as FACTS-API.md section 2 lists them. A key added or dropped is a change to the contract both the
// drawer and the pages read, so it is made here, in the same commit, on purpose.
const CONTEXT_KEYS = ['m', 'ms', 'ev', 'poly', 'cov', 'profiles', 'grades', 'prices', 'evaluation', 'summary', 'db', 'guide', 'tested',
  'highlight', 'highlightSource', 'showEstimates', 'policy', 'sourceById', 'evidenceById', 'materialById', 'gradeById', 'chosen',
  'msById', 'knowHowById', 'documents', 'counts'];
const ids = (rows) => rows.map((r) => r.id);

test('materialContext is null for a family entry and the drawer\'s context for every other material', () => {
  assert.ok(db.materials.some((m) => m.familyEntry), 'the database has family entries to test against');
  for (const m of db.materials) {
    const c = materialContext(db, m.id);
    if (m.familyEntry) { assert.equal(c, null, `${m.id} is a family entry and has no context`); continue; }
    assert.ok(c, `${m.id} has a context`);
    assert.deepEqual(Object.keys(c).sort(), [...CONTEXT_KEYS].sort(), `${m.id}: the keys of c`);
    assert.equal(c.m.id, m.id);
    assert.deepEqual(ids(c.grades), ids(db.grades.filter((g) => g.materialId === m.id && !g.retired)), `${m.id}: its non-retired grades`);
    assert.deepEqual(ids(c.ms), ids(db.measurements.filter((x) => x.materialId === m.id)), `${m.id}: its measurements`);
    assert.deepEqual(ids(c.profiles), ids(db.profiles.filter((p) => p.materialId === m.id && !p.retired)), `${m.id}: its non-retired profiles`);
    // No scenario was asked, so the material is untested and nothing is chosen.
    assert.equal(c.tested, false, `${m.id}: untested`);
    assert.ok(c.evaluation == null, `${m.id}: no evaluation`);
    assert.equal(c.chosen.size, 0, `${m.id}: nothing chosen`);
  }
  assert.equal(materialContext(db, 'M-NOT-A-MATERIAL'), null, 'an unknown ID has no context');
});

// ---------------------------------------------------------------------------------------------------------------------
// 2. The tab counts

// The drawer is rendered the way drawer-comparisons.test.js renders it (the same fake host and state), but in a context
// that also holds the resin's reference records, as main.js's does: a context without them gives the Environment tab only
// the material's own statements, and the facts layer's default (the database's own groups) counts both.
const group = (rows) => { const m = new Map(); for (const r of rows ?? []) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = {
  measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage),
  polymerEvidenceByMaterial: group(db.polymerEvidence),
};
function stripOf(materialId) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
  renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: 'Overview', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
  // Each tab button is `<button role="tab" data-tab="KEY" …><span data-label="LABEL">LABEL</span><span class="n">N</span></button>`;
  // Overview carries no count.
  const counts = {};
  for (const t of host.innerHTML.matchAll(/data-tab="(\w+)"[^>]*>\s*<span data-label="[^"]*">[^<]*<\/span>(?:<span class="n">(\d+)<\/span>)?\s*<\/button>/g)) counts[t[1]] = t[2] === undefined ? null : Number(t[2]);
  return counts;
}

const SAMPLE = [...new Set([...REAL.filter((_, i) => i % 7 === 0).map((m) => m.id), 'M001', 'M020', 'M110', 'M097'])].filter((id) => REAL.some((m) => m.id === id));
const strips = new Map(SAMPLE.map((id) => [id, stripOf(id)]));

test('tabCounts equals the counts the drawer prints on its tab strip', () => {
  assert.ok(SAMPLE.length >= 25, `the sample is ${SAMPLE.length} materials`);
  for (const id of SAMPLE) {
    const printed = strips.get(id);
    assert.deepEqual(Object.keys(printed), TABS, `${id}: the drawer's tabs`);
    const facts = tabCounts(materialContext(db, id));
    assert.deepEqual(facts, printed, `${id}: the facts' counts are the drawer's`);
    assert.equal(printed.Overview, null, `${id}: Overview is not counted`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// 3. The page rule

test('the page rule is three products and twenty values, and pageOf applies it to non-family materials only', () => {
  assert.deepEqual(PAGE_RULE, { minProducts: 3, minValues: 20 });
  const ix = indexDb(db);
  let pages = 0;
  for (const m of db.materials) {
    const ms = ix.measurementsByMaterial.get(m.id) ?? [];
    const f = pageFacts(m, ms);
    const expected = !m.familyEntry && m.gradeIds.length >= 3 && ms.filter((x) => x.numeric).length >= 20 ? `materials/${m.id}.html` : null;
    assert.equal(pageOf(m, ms), expected, `${m.id}: ${f.products} products, ${f.values} values`);
    if (expected) pages++;
  }
  // A floor, not an equality: 76 today, and new data may add pages. Fewer would mean the rule or the data lost some.
  assert.ok(pages >= 70, `${pages} materials have a page`);
});

test('M001 and M020 have a page; a material with one product and a family entry do not', () => {
  const ix = indexDb(db);
  const byId = (id) => db.materials.find((m) => m.id === id);
  for (const id of ['M001', 'M020']) assert.equal(pageOf(byId(id), ix.measurementsByMaterial.get(id) ?? []), `materials/${id}.html`, id);
  const single = REAL.find((m) => m.gradeIds.length === 1);
  assert.ok(single, 'the database has a material with one product');
  assert.equal(pageOf(single, ix.measurementsByMaterial.get(single.id) ?? []), null, `${single.id} has one product`);
  const family = db.materials.find((m) => m.familyEntry);
  assert.equal(pageOf(family, ix.measurementsByMaterial.get(family.id) ?? []), null, `${family.id} is a family entry`);
  // A family entry has no page even if it were given enough products and values: the rule reads the flag first.
  const stuffed = { ...family, gradeIds: ['a', 'b', 'c'] };
  assert.equal(pageOf(stuffed, Array.from({ length: 30 }, () => ({ numeric: true }))), null, 'a family entry never has a page');
});

// ---------------------------------------------------------------------------------------------------------------------
// 4. Active products

test('materials[].gradeIds are the active products: not retired, not a reference grade, in database order', () => {
  for (const m of db.materials) {
    const expected = db.grades.filter((g) => g.materialId === m.id && !g.retired && !/-R\d+$/.test(g.id)).map((g) => g.id);
    assert.deepEqual(m.gradeIds ?? [], expected, `${m.id}: gradeIds`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// 5. The one scale rule

test('stripScale is logarithmic, ticked at 1, 2 and 5, once the largest value is more than ten times the smallest', () => {
  const s = stripScale([3, 72], 'kJ/m²');
  assert.equal(s.log, true);
  assert.deepEqual(s.ticks, [2, 5, 10, 20, 50, 100]);
  assert.equal(s.from, 2);
  assert.equal(s.hi, 100);
  assert.equal(s.pct(2), 0);
  assert.equal(s.pct(100), 100);
  assert.equal(s.pct(1), 0, 'clamped below the track');
  assert.equal(s.pct(1000), 100, 'clamped above the track');
  // The track is even in the logarithm: 2 to 100 is a factor of 50, and 10 sits log10(5) / log10(50) of the way.
  assert.ok(Math.abs(s.pct(10) - (100 * Math.log10(5)) / Math.log10(50)) < 1e-9);
  // Across more decades, every decade has its 1, 2 and 5.
  assert.deepEqual(stripScale([0.4, 450], 'MPa').ticks, [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]);
});

test('stripScale is linear from zero up to a ratio of ten, at ten exactly, and wherever a value is not positive', () => {
  // "More than" ten times: exactly ten is still linear.
  const ten = stripScale([2, 20], 'kJ/m²');
  assert.equal(ten.log, false);
  assert.equal(ten.from, 0);
  assert.deepEqual(ten.ticks, [0, 5, 10, 15, 20]);
  assert.equal(ten.pct(10), 50);
  const six = stripScale([3, 20], 'MPa');
  assert.equal(six.log, false);
  assert.deepEqual(six.ticks, [0, 5, 10, 15, 20]);
  // A zero cannot sit on a logarithmic track, so a set holding one is linear however wide it is.
  const zero = stripScale([0, 100], 'MPa');
  assert.equal(zero.log, false);
  assert.deepEqual(zero.ticks, [0, 20, 40, 60, 80, 100]);
  // One value is linear too.
  assert.equal(stripScale([42], 'MPa').log, false);
});

test('stripScale for a temperature is linear, starts at a round step at or below the lowest value and spans at least 10 °C', () => {
  // Two products 15 °C apart: a step of 5, from the lowest.
  const wide = stripScale([215, 230], '°C');
  assert.equal(wide.log, false);
  assert.deepEqual(wide.ticks, [215, 220, 225, 230]);
  assert.equal(wide.pct(215), 0);
  assert.equal(wide.pct(230), 100);
  // Two products a degree apart are not drawn at the ends of the track: the scale spans 10 °C about them.
  const near = stripScale([220, 221], '°C');
  assert.deepEqual(near.ticks, [214, 216, 218, 220, 222, 224, 226]);
  assert.ok(near.hi - near.from >= 10, 'at least 10 °C');
  assert.ok(near.from <= 220 && near.hi >= 221);
  // One value alone: 10 °C about it.
  const one = stripScale([100], '°C');
  assert.deepEqual(one.ticks, [94, 96, 98, 100, 102, 104, 106]);
  assert.equal(one.log, false);
  // A wide set that would be logarithmic in another unit stays linear, and a set below zero starts below its lowest value.
  const wideRatio = stripScale([5, 300], '°C');
  assert.equal(wideRatio.log, false);
  assert.deepEqual(wideRatio.ticks, [0, 100, 200, 300]);
  const cold = stripScale([-45, 60], '°C');
  assert.equal(cold.log, false);
  assert.deepEqual(cold.ticks, [-50, -25, 0, 25, 50, 75]);
});

// ---------------------------------------------------------------------------------------------------------------------
// 6. Product names

// The facts layer's productName treats the database's missing states (Not published, Not applicable, Not stated, Not
// recorded, N/A, any case) as unstated and gives '' where neither the product nor the maker is stated; productNameOrId
// then supplies the ID. The build's productName treats any value starting "Not " as unstated and falls back to the ID.
// They differ by design on a product or maker cell reading "N/A" (unstated here, a name there) and on a cell starting
// "Not " that is no listed missing state (a name here, unstated there). No grade in today's database is such a case, so
// the two names agree on every grade.
test('productName agrees with the build\'s on every grade (the facts layer\'s name or the grade ID)', () => {
  assert.ok(db.grades.length > 1000, `${db.grades.length} grades`);
  for (const g of db.grades) {
    assert.equal(productNameOrId(g), buildProductName(g), `${g.id}: ${JSON.stringify([g.manufacturer, g.product])}`);
    if (productName(g) !== '') assert.equal(productName(g), buildProductName(g), `${g.id}: the stated name`);
  }
  assert.equal(productName(undefined), '', 'a missing grade has no name');
});

// ---------------------------------------------------------------------------------------------------------------------
// 7. The rank table

test('rankTable lists, for each headline, every material with a measured median once, ascending by value', () => {
  const rank = rankTable(db);
  const keys = db.registry.headlines.map((h) => h.key);
  assert.deepEqual(Object.keys(rank), keys, 'one entry per registry headline');
  const materialById = new Map(db.materials.map((m) => [m.id, m]));
  let listed = 0;
  for (const key of keys) {
    const { entries } = rank[key];
    assert.equal(rank[key].key, key);
    for (let i = 1; i < entries.length; i++) assert.ok(entries[i - 1].value <= entries[i].value, `${key}: ascending at ${i}`);
    const seen = new Set();
    for (const e of entries) {
      const m = materialById.get(e.id);
      assert.ok(m, `${key}: ${e.id} is a material`);
      assert.ok(!m.familyEntry, `${key}: ${e.id} is a family entry`);
      assert.ok(!seen.has(e.id), `${key}: ${e.id} listed twice`);
      seen.add(e.id);
    }
    for (const m of REAL) {
      const h = m.headline?.[key];
      const at = entries.filter((e) => e.id === m.id);
      if (h?.known) {
        assert.equal(at.length, 1, `${key}: ${m.id} appears once`);
        assert.equal(at[0].value, h.value, `${key}: ${m.id}'s value`);
        listed++;
      } else assert.equal(at.length, 0, `${key}: ${m.id} has no known value and is not listed`);
    }
  }
  assert.ok(listed > 0, 'some material has a known value');
});

// ---------------------------------------------------------------------------------------------------------------------
// 8. The index

test('indexDb is cached per database object', () => {
  assert.equal(indexDb(db), indexDb(db), 'the same db gives the same index');
  assert.notEqual(indexDb({ ...db }), indexDb(db), 'another object is indexed afresh');
  assert.equal(materialContext(db, 'M001').materialById, indexDb(db).materialById, 'the context reads the cached index');
});
