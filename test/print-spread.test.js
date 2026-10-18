// Print temperatures across products (D139): the closed heading at the top of the Printing tab, off app/js/ui/print-spread.js
// and printTemperatures in detail.js. Each dot must be a product's own setting as its print gate reads it, the table and the
// median line the spread of those dots, the "outside the H2C's limits" line the gate's own verdicts, the counts square
// with the products, and the H2C's limit drawn only where it is near the values.
//
// Rendering is the cost (verify:fast has a budget), so each material's Printing tab is rendered once, here, and every test
// reads that copy. The expectations are worked out from the products' own `print` (what the build says), not from
// printSpread, except where a test names printSpread as the thing the page must agree with.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDrawer } from '../app/js/ui/detail.js';
import { useRegistry } from '../app/js/ui/registry.js';
import { setH2cBaseline } from '../app/js/ui/labels.js';
import { esc, fmtNumber, fmtBounded } from '../app/js/ui/format.js';
import { printSpread, rowSummary, PRINT_AXES, OUTSIDE } from '../app/js/ui/print-spread.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
setH2cBaseline(db.meta.h2cBaseline);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
const WJ = '⁠'; // the word joiner the page puts round the dash of a range
const HEADING = 'Print temperatures across products';
const LIMITS = { nozzle: db.meta.h2cBaseline.nozzleC, bed: db.meta.h2cBaseline.bedC, chamber: db.meta.h2cBaseline.chamberC };
const TEMPERATURE = ['nozzle', 'bed', 'chamber'];
const LABEL = Object.fromEntries(PRINT_AXES.map((a) => [a.axis, a.label]));

// ---- the page's own small helpers, restated: detail.js does not export them ----
const stated = (v) => v && !/^(not published|not applicable|not stated|not recorded|n\/a)\b/i.test(String(v).trim());
const gradeName = (g) => {
  if (!g) return '';
  const product = stated(g.product) ? g.product : '';
  const maker = stated(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker;
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
};
const gradeLabel = (g) => gradeName(g) || g.id;
const lower = (t) => (/^[A-Z][A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (html) => unesc(html.replace(/<[^>]+>/g, ''));
const isProduct = (g) => !/-R\d+$/.test(g.id);
const windowText = (lo, hi) => (lo != null && hi == null ? `at least ${fmtNumber(lo)}` : lo == null ? `up to ${fmtNumber(hi)}`
  : lo === hi ? fmtNumber(lo) : `${fmtNumber(lo)}${WJ}–${WJ}${fmtNumber(hi)}`);
const OUTSIDE_WORDS = { exceeds: '', 'exceeds-recommended': ', its recommended setting above', partial: ', part of its window above' };
const NOT_DRAWN_WORDS = {
  unknown: 'say nothing', 'not-required': 'need none', enclosed: 'ask for an enclosure and give no temperature (the H2C\'s heated chamber counts)',
  recommended: 'recommend an enclosure and give no temperature', ambient: 'print at room temperature', 'no-setpoint': 'give no set point',
  'not-needed': 'say none is needed', 'no-temperature': 'give no temperature',
};
const NOT_DRAWN_ONE = {
  unknown: 'says nothing', 'not-required': 'needs none', enclosed: 'asks for an enclosure and gives no temperature (the H2C\'s heated chamber counts)',
  recommended: 'recommends an enclosure and gives no temperature', ambient: 'prints at room temperature', 'no-setpoint': 'gives no set point',
  'not-needed': 'says none is needed', 'no-temperature': 'gives no temperature',
};

// ---- an independent reading of the spread, straight off the products ----
const medianOf = (xs) => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const quantileOf = (xs, p) => { const s = [...xs].sort((a, b) => a - b), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo]); };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} against ${b}`);

/** One setting of a material's products, read from `g.print` alone: { rows: { key: [entry] }, notDrawn: Map, oneEnd, entries }. */
function readSetting(products, axis) {
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const rows = axis === 'drying' ? { drying: [] } : { [`${axis}Low`]: [], [`${axis}High`]: [] };
  const notDrawn = new Map();
  const count = (why) => notDrawn.set(why, (notDrawn.get(why) ?? 0) + 1);
  const oneEnd = { low: 0, high: 0 };
  for (const g of products) {
    const v = g.print?.[axis];
    const base = { g, origin: g.print?.from?.[axis]?.origin ?? 'own', variant: !variantOnly && !!g.variant };
    if (axis === 'drying') {
      if (v?.tempC != null && v.need !== 'not-needed') rows.drying.push({ ...base, value: v.tempC, profileId: v.profileId ?? null });
      else count(!v ? 'unknown' : v.need === 'not-needed' ? 'not-needed' : 'no-temperature');
      continue;
    }
    const enclosure = axis === 'chamber' && (v?.state ?? 'unknown') === 'unknown' ? ({ required: 'enclosed', recommended: 'recommended' })[g.print?.enclosure] : null;
    if (v?.state !== 'range') { count(enclosure ?? v?.state ?? 'unknown'); continue; }
    if (v.min != null) rows[`${axis}Low`].push({ ...base, value: v.min, profileId: v.profileId ?? null }); else oneEnd.high++;
    if (v.max != null) rows[`${axis}High`].push({ ...base, value: v.max, profileId: v.profileId ?? null }); else oneEnd.low++;
  }
  const entries = Object.values(rows).flat();
  return { axis, rows, notDrawn, oneEnd, entries, drawn: entries.length > 1 && entries.some((e) => e.origin !== 'guide') };
}

// ---- the rendered Printing tab of every material, once ----
const rendered = new Map();
function printing(materialId) {
  if (!rendered.has(materialId)) {
    const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
    renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: 'Printing', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
    rendered.set(materialId, host.innerHTML);
  }
  return rendered.get(materialId);
}
/** The heading's closed <details>, up to its matching close, or null. */
function headingOf(html) {
  const open = new RegExp(`<details class="prop-block imp-block print-block"[^>]*>\\s*<summary><span class="maker-name">${HEADING}</span>`).exec(html);
  if (!open) return null;
  assert.equal(html.split(`<span class="maker-name">${HEADING}</span>`).length - 1, 1, 'one heading');
  let depth = 0;
  for (const t of html.slice(open.index).matchAll(/<details\b|<\/details>/g)) {
    depth += t[0] === '</details>' ? -1 : 1;
    if (!depth) return html.slice(open.index, open.index + t.index + t[0].length);
  }
  throw new Error('the heading never closes');
}

let collected = null;
/** Every non-family material: its products (the page's: active, not a reference grade), what the page printed, and the
 *  independent and printSpread readings of them. */
function materials() {
  if (collected) return collected;
  collected = db.materials.filter((m) => !m.familyEntry).map((m) => {
    const grades = db.grades.filter((g) => g.materialId === m.id && !g.retired);
    const products = grades.filter(isProduct);
    const html = printing(m.id);
    const heading = headingOf(html);
    const settings = Object.fromEntries(PRINT_AXES.map(({ axis }) => [axis, readSetting(products, axis)]));
    return { m, products, html, heading, settings, spread: printSpread(products) };
  });
  return collected;
}
const withHeading = () => materials().filter((x) => x.heading);

/** The dots of a row of the heading, in page order. */
function dotsOf(heading, key) {
  const at = heading.indexOf(`<div class="imp-row" data-headline="${key}">`);
  if (at < 0) return null;
  const row = heading.slice(at, heading.indexOf('</div>', at));
  return [...row.matchAll(/<button type="button" class="imp-dot([^"]*)" (?:data-profile="([^"]+)"|(data-guide)="1") data-grade="([^"]+)"\s+style="[^"]*" title="([^"]*)"/g)]
    .map((d) => ({ cls: d[1].split(/\s+/).filter(Boolean), profile: d[2] ?? null, guide: !!d[3], gid: d[4], title: d[5] }));
}
/** The paragraphs of the heading that follow the table, as plain text. */
const footLines = (heading) => [...heading.matchAll(/<p class="fine imp-foot">([\s\S]*?)<\/p>/g)].map((p) => text(p[1]));
/** The table's rows by label: { n, median, middle, range } as the page prints them. */
function tableOf(heading) {
  const rows = new Map();
  for (const r of heading.matchAll(/<tr><th scope="row">([^<]*)<\/th><td class="num">([^<]*)<\/td><td class="num">([^<]*)<\/td>\s*<td class="num">([^<]*)<\/td><td class="num">([^<]*)<\/td><\/tr>(\s*<tr class="imp-apart"><td colspan="5">([^<]*)<\/td><\/tr>)?/g)) {
    rows.set(unesc(r[1]), { n: r[2], median: unesc(r[3]), middle: unesc(r[4]), range: unesc(r[5]), apart: r[7] ? unesc(r[7]) : null });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------------

test('rowSummary counts the middle of the compared values: odd and even counts, quartiles from four, and the guide and special formulations kept apart', () => {
  const own = (...vs) => vs.map((value) => ({ value, origin: 'own', variant: false }));
  assert.deepEqual(rowSummary([]), { n: 0 });
  assert.deepEqual(rowSummary(own(210)), { n: 1, min: 210, max: 210, median: 210 });
  assert.deepEqual(rowSummary(own(250, 200, 230)), { n: 3, min: 200, max: 250, median: 230 }, 'three values: a median and no quartiles');
  assert.deepEqual(rowSummary(own(200, 220)), { n: 2, min: 200, max: 220, median: 210 }, 'two values: the median is their mean');
  assert.deepEqual(rowSummary(own(40, 10, 30, 20)), { n: 4, min: 10, max: 40, median: 25, q1: 17.5, q3: 32.5 }, 'four values: linear between the nearest two');
  assert.deepEqual(rowSummary(own(5, 1, 3, 2, 4)), { n: 5, min: 1, max: 5, median: 3, q1: 2, q3: 4 });
  assert.deepEqual(rowSummary(own(1, 2, 3, 4, 5, 6)), { n: 6, min: 1, max: 6, median: 3.5, q1: 2.25, q3: 4.75 });
  const mixed = rowSummary([
    ...own(200, 210, 220),
    { value: 300, origin: 'guide', variant: false },
    { value: 280, origin: 'guide', variant: false },
    { value: 150, origin: 'own', variant: true },
    { value: 400, origin: 'twin', variant: true },
  ]);
  assert.equal(mixed.n, 3, 'the guide and the special formulations are not counted');
  assert.equal(mixed.median, 210);
  assert.equal(mixed.max, 220, 'nor do they widen the range');
  assert.equal('q1' in mixed, false);
  assert.deepEqual(mixed.guide, { n: 2, min: 280, max: 300 });
  assert.deepEqual(mixed.variants, { n: 2, min: 150, max: 400 }, 'a special formulation read from the guide is a special formulation first');
  assert.equal(rowSummary([{ value: 300, origin: 'guide', variant: false }]).n, 0, 'a row of the guide alone has no compared value');
  assert.equal(rowSummary(own(0.1, 0.2, 0.3, 0.4, 0.5)).q1, 0.2, 'the quartile is tidied of floating point noise');
});

test('printSpread reads each product\'s own, shared and guide settings into rows, and counts what it does not draw', () => {
  const rangeOf = (min, max, extra = {}) => ({ verdict: 'within', state: 'range', min, max, profileId: 'P1', ...extra });
  const product = (id, print, variant = null) => ({ id, variant, print: { nozzle: rangeOf(190, 220), bed: rangeOf(50, 60), chamber: { verdict: 'within', state: 'not-required', min: null, max: null },
    drying: { need: 'required', tempC: 50, profileId: 'P1' }, from: {}, ...print } });
  const products = [
    product('G1', {}),
    product('G2', { nozzle: rangeOf(200, 230, { profileId: 'P2' }), from: { nozzle: { origin: 'twin', label: 'data sheet shared with G1' } } }),
    product('G3', { nozzle: rangeOf(250, 260, { profileId: null }), from: { nozzle: { origin: 'guide', label: 'guide' } } }),
    product('G4', { bed: rangeOf(60, null) }),
    product('G5', { chamber: { verdict: 'within', state: 'range', min: 40, max: 60, profileId: 'P5' }, drying: { need: 'not-needed', tempC: null } }),
    product('G6', { chamber: { verdict: 'recommended', state: 'recommended', min: null, max: null }, drying: { need: 'required', tempC: null } }),
    product('G7', { nozzle: rangeOf(300, 380, { verdict: 'partial' }), chamber: undefined, drying: undefined }),
  ];
  const out = Object.fromEntries(printSpread(products).map((a) => [a.axis, a]));
  assert.deepEqual(Object.keys(out), ['nozzle', 'bed', 'chamber', 'drying']);
  assert.deepEqual(out.nozzle.rows.map((r) => r.key), ['nozzleLow', 'nozzleHigh']);
  assert.deepEqual(out.drying.rows.map((r) => r.key), ['drying']);
  assert.equal(out.drying.limit, false);
  assert.equal(out.nozzle.limit, true);

  const low = out.nozzle.rows[0].entries, high = out.nozzle.rows[1].entries;
  assert.deepEqual(low.map((e) => [e.g.id, e.value, e.origin]), [['G1', 190, 'own'], ['G2', 200, 'twin'], ['G3', 250, 'guide'], ['G4', 190, 'own'], ['G5', 190, 'own'], ['G6', 190, 'own'], ['G7', 300, 'own']]);
  assert.deepEqual(high.map((e) => [e.g.id, e.value]), [['G1', 220], ['G2', 230], ['G3', 260], ['G4', 220], ['G5', 220], ['G6', 220], ['G7', 380]]);
  assert.deepEqual(low.map((e) => e.profileId), ['P1', 'P2', null, 'P1', 'P1', 'P1', 'P1'], 'a dot names the profile of its own setting');
  assert.equal(low[1].label, 'data sheet shared with G1', 'a twin says whose sheet it is');
  assert.equal(out.nozzle.rows[0].summary.n, 6, 'the guide\'s value is drawn and not counted');
  assert.deepEqual(out.nozzle.rows[0].summary.guide, { n: 1, min: 250, max: 250 });
  assert.equal(out.nozzle.rows[0].summary.median, 190);

  assert.deepEqual(out.nozzle.outside.map((o) => [o.g.id, o.verdict, o.min, o.max]), [['G7', 'partial', 300, 380]], 'the outside list is the gate\'s verdict');
  assert.equal(out.bed.outside.length, 0);

  assert.deepEqual(out.bed.rows[0].entries.map((e) => e.g.id), ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7']);
  assert.deepEqual(out.bed.rows[1].entries.map((e) => e.g.id), ['G1', 'G2', 'G3', 'G5', 'G6', 'G7'], 'an open window has no value on its open end');
  assert.deepEqual(out.bed.oneEnd, { low: 1, high: 0 }, 'and is counted as a window that gives only its lowest setting');

  assert.deepEqual(out.chamber.rows[0].entries.map((e) => [e.g.id, e.value]), [['G5', 40]]);
  assert.deepEqual([...out.chamber.notDrawn], [['not-required', 4], ['recommended', 1], ['unknown', 1]], 'a chamber that is not a range is counted by its state');
  assert.equal(out.chamber.rows[1].entries.length, 1);

  assert.deepEqual(out.drying.rows[0].entries.map((e) => [e.g.id, e.value]), [['G1', 50], ['G2', 50], ['G3', 50], ['G4', 50]]);
  assert.deepEqual([...out.drying.notDrawn], [['not-needed', 1], ['no-temperature', 1], ['unknown', 1]], 'drying that is not needed, has no temperature or is unknown is counted');
  for (const a of Object.values(out)) {
    const drawn = new Set(a.rows.flatMap((r) => r.entries.map((e) => e.g.id)));
    const notDrawn = [...a.notDrawn.values()].reduce((s, n) => s + n, 0);
    assert.equal(drawn.size + notDrawn, products.length, `${a.axis}: every product is drawn or counted as not drawn`);
  }
});

test('printSpread sets no special formulation apart where every product is one, and sets it apart beside others', () => {
  const g = (id, variant) => ({ id, variant, print: { nozzle: { verdict: 'within', state: 'range', min: 200, max: 220, profileId: 'P' }, from: {} } });
  const all = printSpread([g('G1', 'lightweight'), g('G2', 'dense')]).find((a) => a.axis === 'nozzle');
  assert.ok(all.rows.every((r) => r.entries.every((e) => !e.variant)), 'all variants: none is set apart');
  assert.equal(all.rows[0].summary.n, 2);
  assert.equal(all.rows[0].summary.variants, undefined);
  const some = printSpread([g('G1', null), g('G2', 'lightweight')]).find((a) => a.axis === 'nozzle');
  assert.deepEqual(some.rows[0].entries.map((e) => e.variant), [false, true]);
  assert.equal(some.rows[0].summary.n, 1);
  assert.deepEqual(some.rows[0].summary.variants, { n: 1, min: 200, max: 200 });
  assert.equal(printSpread([]).every((a) => a.rows.every((r) => r.summary.n === 0)), true, 'no products, no values');
});

test('printSpread lists a product outside the limits for each verdict in OUTSIDE and for no other', () => {
  const verdicts = ['within', 'exceeds', 'exceeds-recommended', 'partial', 'unknown', undefined];
  const products = verdicts.map((verdict, i) => ({ id: `G${i}`, print: { bed: { verdict, state: 'range', min: 100, max: 130, profileId: 'P' } } }));
  const bed = printSpread(products).find((a) => a.axis === 'bed');
  assert.deepEqual(bed.outside.map((o) => o.g.id), products.filter((g) => OUTSIDE.includes(g.print.bed.verdict)).map((g) => g.id));
  assert.deepEqual(OUTSIDE, ['exceeds', 'exceeds-recommended', 'partial']);
});

// ---------------------------------------------------------------------------------------------------------------------

test('the Printing tab of every material is rendered, and some materials draw the heading and some do not', () => {
  const all = materials();
  assert.ok(all.length > 100, `${all.length} materials rendered`);
  const drawn = withHeading();
  assert.ok(drawn.length > 20, `${drawn.length} materials draw the heading`);
  assert.ok(drawn.length < all.length, 'and not every one does');
  for (const x of drawn) assert.ok(x.heading.includes('<div class="imp-strips">'), `${x.m.id}: a heading holds a graph`);
});

test('the heading is drawn exactly where some setting has two values and one of them is a sheet\'s own', () => {
  for (const x of materials()) {
    const expected = Object.values(x.settings).some((s) => s.drawn);
    assert.equal(!!x.heading, expected, `${x.m.id}: the heading ${expected ? 'is' : 'is not'} drawn`);
    const bySpread = x.spread.some((a) => {
      const n = a.rows.reduce((t, r) => t + r.entries.length, 0);
      return n > 1 && a.rows.some((r) => r.entries.some((e) => e.origin !== 'guide'));
    });
    assert.equal(bySpread, expected, `${x.m.id}: printSpread agrees about what is drawn`);
    if (x.heading) {
      const graphs = x.heading.split('<div class="imp-strips">').length - 1;
      assert.equal(graphs, Object.values(x.settings).filter((s) => s.drawn).length, `${x.m.id}: one graph per drawn setting`);
    }
  }
});

test('a setting not drawn but with a value gets its one-product line, and a drawn setting gets none', () => {
  let single = 0;
  for (const x of withHeading()) {
    const lines = footLines(x.heading).filter((l) => /: only /.test(l)).join(' ');
    for (const [axis, s] of Object.entries(x.settings)) {
      const has = lines.includes(`${LABEL[axis]}: only `);
      if (!s.drawn && s.entries.length) { assert.ok(has, `${x.m.id}: ${axis} has ${s.entries.length} value(s) and no graph, so it needs its one-product line`); single++; }
      else assert.equal(has, false, `${x.m.id}: ${axis} needs no one-product line`);
    }
  }
  assert.ok(single > 0, 'some material has a setting with one value, drawn in a line');
});

// ---------------------------------------------------------------------------------------------------------------------

test('the dots are each product\'s own setting: its value, its profile and its source, and a hollow dot is the guide\'s', () => {
  const seen = { materials: 0, rows: 0, dots: 0, guide: 0, twin: 0, variant: 0 };
  for (const x of withHeading()) {
    seen.materials++;
    for (const a of x.spread) {
      const n = a.rows.reduce((t, r) => t + r.entries.length, 0);
      const drawn = n > 1 && a.rows.some((r) => r.entries.some((e) => e.origin !== 'guide'));
      for (const r of a.rows) {
        const dots = dotsOf(x.heading, r.key);
        if (!drawn || !r.entries.length) { assert.equal(dots, null, `${x.m.id} ${r.key}: a row only where its setting is drawn and it has a value`); continue; }
        assert.ok(dots, `${x.m.id} ${r.key}: a row`);
        seen.rows++;
        assert.equal(dots.length, r.entries.length, `${x.m.id} ${r.key}: a dot for each product`);
        const key = (gid, profile, guide, open, variant) => `${gid}|${profile ?? ''}|${guide ? 'guide' : ''}|${open ? 'open' : ''}|${variant ? 'variant' : ''}`;
        const expected = r.entries.map((e) => key(e.g.id, e.profileId, e.origin === 'guide', e.origin === 'guide', e.variant)).sort();
        const got = dots.map((d) => key(d.gid, d.profile, d.guide, d.cls.includes('open'), d.cls.includes('variant'))).sort();
        assert.deepEqual(got, expected, `${x.m.id} ${r.key}: the dots are the products' own settings, guide values hollow, special formulations marked`);
        for (const e of r.entries) {
          const d = dots.find((y) => y.gid === e.g.id);
          assert.ok(d, `${x.m.id} ${r.key}: ${e.g.id} has a dot`);
          assert.ok(d.title.startsWith(esc(`${gradeLabel(e.g)}: ${fmtBounded(e.value, '°C')}`)), `${x.m.id} ${r.key} ${e.g.id}: the dot says its own value (${e.value}) and product, not "${unesc(d.title)}"`);
          assert.equal(e.profileId ?? null, e.g.print[a.axis].profileId ?? null, `${x.m.id} ${r.key} ${e.g.id}: the profile is the product's print[${a.axis}].profileId`);
          if (e.origin === 'guide') { assert.equal(d.guide, true, `${x.m.id} ${r.key} ${e.g.id}: a guide value opens the guide`); seen.guide++; }
          else {
            assert.equal(d.guide, false, `${x.m.id} ${r.key} ${e.g.id}: a sheet's value opens a profile, not the guide`);
            assert.ok(d.profile, `${x.m.id} ${r.key} ${e.g.id}: a profile to open`);
            assert.ok(x.html.includes(`class="profile-block" data-profile-id="${d.profile}"`), `${x.m.id} ${r.key} ${e.g.id}: profile ${d.profile} is in the same tab`);
          }
          if (e.origin === 'twin') seen.twin++;
          if (e.variant) seen.variant++;
          seen.dots++;
        }
      }
    }
  }
  assert.ok(seen.dots > 1000 && seen.rows > 100, JSON.stringify(seen));
  assert.ok(seen.guide > 0 && seen.twin > 0, `guide and twin dots are checked: ${JSON.stringify(seen)}`);
});

test('a guide dot opens the guide\'s block and no profile, and the guide block is on the tab', () => {
  let n = 0;
  for (const x of withHeading()) {
    const hollow = [...x.heading.matchAll(/<button type="button" class="imp-dot([^"]*)" data-guide="1"/g)];
    if (!hollow.length) continue;
    n += hollow.length;
    assert.ok(hollow.every((d) => d[1].split(/\s+/).includes('open')), `${x.m.id}: a guide dot is hollow`);
    assert.ok(x.html.includes('class="profile-block guide-block"'), `${x.m.id}: the guide's block is on the tab`);
  }
  assert.ok(n > 0, 'some material draws a guide value');
});

// ---------------------------------------------------------------------------------------------------------------------

test('the table is the spread: each row\'s n, median, middle half and range are those of the dots counted', () => {
  const seen = { rows: 0, quartiles: 0, apart: 0 };
  for (const x of withHeading()) {
    const table = tableOf(x.heading);
    const wanted = x.spread.filter((a) => a.rows.reduce((t, r) => t + r.entries.length, 0) > 1 && a.rows.some((r) => r.entries.some((e) => e.origin !== 'guide')))
      .flatMap((a) => a.rows.filter((r) => r.entries.length));
    assert.deepEqual([...table.keys()], wanted.map((r) => r.label), `${x.m.id}: a table row for each row of dots`);
    for (const r of wanted) {
      const row = table.get(r.label);
      const s = r.summary;
      // The summary against the dots, worked out here.
      const counted = r.entries.filter((e) => !e.variant && e.origin !== 'guide').map((e) => e.value);
      assert.equal(s.n, counted.length, `${x.m.id} ${r.label}: n`);
      if (counted.length) {
        near(s.median, medianOf(counted), `${x.m.id} ${r.label}: median`);
        assert.equal(s.min, Math.min(...counted));
        assert.equal(s.max, Math.max(...counted));
        if (counted.length >= 4) { near(s.q1, quantileOf(counted, 0.25), `${x.m.id} ${r.label}: q1`); near(s.q3, quantileOf(counted, 0.75), `${x.m.id} ${r.label}: q3`); seen.quartiles++; }
        else assert.equal(s.q1, undefined, `${x.m.id} ${r.label}: no quartiles from fewer than four values`);
      }
      // The page against the summary, as the page formats it.
      assert.equal(row.n, String(s.n), `${x.m.id} ${r.label}: n printed`);
      assert.equal(row.median, s.n ? fmtNumber(s.median) : '—', `${x.m.id} ${r.label}: median printed`);
      assert.equal(row.middle, s.q1 != null ? (s.q1 === s.q3 ? fmtNumber(s.q1) : `${fmtNumber(s.q1)}–${fmtNumber(s.q3)}`) : '—', `${x.m.id} ${r.label}: middle half printed`);
      assert.equal(row.range, s.n ? (s.min === s.max ? fmtNumber(s.min) : `${fmtNumber(s.min)}${WJ}–${WJ}${fmtNumber(s.max)}`) : '—', `${x.m.id} ${r.label}: range printed`);
      const guide = r.entries.filter((e) => !e.variant && e.origin === 'guide'), variants = r.entries.filter((e) => e.variant);
      assert.equal(row.apart !== null, guide.length + variants.length > 0, `${x.m.id} ${r.label}: a line for the values drawn and not counted`);
      if (row.apart) {
        seen.apart++;
        if (guide.length) assert.ok(row.apart.includes(`${guide.length} from the guide (`), `${x.m.id} ${r.label}: ${row.apart}`);
        if (variants.length) assert.ok(row.apart.includes(`${plural(variants.length, 'special formulation')} (`), `${x.m.id} ${r.label}: ${row.apart}`);
      }
      seen.rows++;
    }
  }
  assert.ok(seen.rows > 100 && seen.quartiles > 20 && seen.apart > 0, JSON.stringify(seen));
});

test('the medians line names, for each drawn setting, the medians of its lowest and highest rows', () => {
  let checked = 0;
  for (const x of withHeading()) {
    const parts = [];
    for (const a of x.spread) {
      if (!x.settings[a.axis].drawn) continue;
      const [low, high] = a.rows.map((r) => (r.summary.n ? r.summary.median : null));
      if (low == null && high == null) continue;
      // Two medians of different products can cross; then each is said by name.
      parts.push(low != null && high != null && low > high ? `${lower(a.label)} lowest ${fmtNumber(low)} °C and highest ${fmtNumber(high)} °C, medians of different products`
        : `${lower(a.label)} ${low == null || high == null ? fmtNumber(low ?? high) : windowText(low, high)} °C`);
    }
    const line = footLines(x.heading).find((l) => l.startsWith('Medians of the lowest and highest settings'));
    if (!parts.length) { assert.equal(line, undefined, `${x.m.id}: no window where no row has a counted value`); continue; }
    assert.equal(line, `Medians of the lowest and highest settings: ${andList(parts)}.`, x.m.id);
    // And the medians are the products' own: worked out from g.print here, not from the spread.
    for (const [axis, s] of Object.entries(x.settings)) {
      if (!s.drawn) continue;
      for (const [key, entries] of Object.entries(s.rows)) {
        const counted = entries.filter((e) => !e.variant && e.origin !== 'guide').map((e) => e.value);
        if (!counted.length) continue;
        assert.ok(line.includes(fmtNumber(medianOf(counted))), `${x.m.id} ${key}: the window holds the median ${medianOf(counted)} (${line})`);
      }
    }
    checked++;
  }
  assert.ok(checked > 20, `${checked} medians lines`);
});

// ---------------------------------------------------------------------------------------------------------------------

test('the products named outside the H2C\'s limits are those whose print gate says so, per setting', () => {
  let named = 0, none = 0;
  const limitsText = andList(PRINT_AXES.filter((a) => a.limit).map((a) => `${lower(a.label)} ${fmtNumber(LIMITS[a.axis])} °C`));
  for (const x of withHeading()) {
    const line = footLines(x.heading).find((l) => /^(Outside|No product's setting is outside) the H2C's limits/.test(l));
    assert.ok(line, `${x.m.id}: the limits line`);
    const segments = [];
    for (const axis of TEMPERATURE) {
      const out = x.products.filter((g) => OUTSIDE.includes(g.print?.[axis]?.verdict));
      if (!out.length) continue;
      segments.push(`${lower(LABEL[axis])}: ${andList(out.map((g) => `${gradeLabel(g)} (${windowText(g.print[axis].min, g.print[axis].max)} °C${OUTSIDE_WORDS[g.print[axis].verdict]})`))}`);
      named += out.length;
    }
    if (!segments.length) { assert.equal(line, `No product's setting is outside the H2C's limits (${limitsText}).`, x.m.id); none++; }
    else assert.equal(line, `Outside the H2C's limits (${limitsText}): ${segments.join('; ')}.`, `${x.m.id}: exactly the products whose verdict is exceeds, exceeds-recommended or partial`);
    // The spread agrees with the gate.
    for (const a of x.spread) {
      assert.deepEqual(a.outside.map((o) => o.g.id), x.products.filter((g) => OUTSIDE.includes(g.print?.[a.axis]?.verdict)).map((g) => g.id), `${x.m.id} ${a.axis}: printSpread's outside list`);
    }
  }
  assert.ok(named > 0 && none > 0, `some materials name products outside (${named}) and some name none (${none})`);
});

test('a product the gate calls outside is named even where its setting is not drawn, and a product within is never named', () => {
  for (const x of withHeading()) {
    const line = footLines(x.heading).find((l) => /^Outside the H2C's limits/.test(l)) ?? '';
    for (const axis of TEMPERATURE) {
      for (const g of x.products) {
        const v = g.print?.[axis]?.verdict;
        const inSegment = line.includes(`${gradeLabel(g)} (${windowText(g.print?.[axis]?.min, g.print?.[axis]?.max)} °C`);
        if (OUTSIDE.includes(v)) assert.ok(inSegment, `${x.m.id} ${g.id}: ${axis} ${v} but not named`);
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------

test('the counts square with the products: drawn plus not drawn is every product, on each setting', () => {
  const seen = { settings: 0, notDrawn: 0, open: 0 };
  for (const x of withHeading()) {
    const missingWanted = [];
    for (const [axis, s] of Object.entries(x.settings)) {
      const notDrawn = [...s.notDrawn.values()].reduce((t, n) => t + n, 0);
      if (axis === 'drying') {
        const drawn = new Set(s.rows.drying.map((e) => e.g.id)).size;
        assert.equal(drawn + notDrawn, x.products.length, `${x.m.id} drying: drawn ${drawn} + not drawn ${notDrawn} = ${x.products.length} products`);
      } else {
        const low = new Set(s.rows[`${axis}Low`].map((e) => e.g.id));
        const highOnly = new Set(s.rows[`${axis}High`].map((e) => e.g.id).filter((id) => !low.has(id)));
        assert.equal(low.size + highOnly.size + notDrawn, x.products.length, `${x.m.id} ${axis}: low ${low.size} + high only ${highOnly.size} + not drawn ${notDrawn} = ${x.products.length} products`);
      }
      // printSpread counts the same.
      const sp = x.spread.find((a) => a.axis === axis);
      assert.deepEqual([...sp.notDrawn], [...s.notDrawn], `${x.m.id} ${axis}: printSpread's not-drawn counts`);
      assert.deepEqual(sp.oneEnd ?? { low: 0, high: 0 }, s.oneEnd, `${x.m.id} ${axis}: windows that give one end`);
      // The page says what printSpread counts.
      const oneEnd = (n, end) => (n ? `${n} ${n === 1 ? 'gives' : 'give'} only a ${end} setting` : null);
      if (s.notDrawn.size || s.oneEnd.low || s.oneEnd.high) {
        missingWanted.push(`${lower(LABEL[axis])}, ${andList([...[...s.notDrawn].map(([why, n]) => `${n} ${(n === 1 ? NOT_DRAWN_ONE : NOT_DRAWN_WORDS)[why]}`),
          oneEnd(s.oneEnd.low, 'lowest'), oneEnd(s.oneEnd.high, 'highest')].filter(Boolean))}`);
        seen.notDrawn += notDrawn;
        seen.open += s.oneEnd.low + s.oneEnd.high;
      }
      seen.settings++;
    }
    const line = footLines(x.heading).find((l) => l.startsWith('Not drawn: '));
    if (missingWanted.length) assert.equal(line, `Not drawn: ${missingWanted.join('; ')}.`, `${x.m.id}: the not-drawn line`);
    else assert.equal(line, undefined, `${x.m.id}: nothing to say is not drawn`);
  }
  assert.ok(seen.settings > 100 && seen.notDrawn > 100 && seen.open > 0, JSON.stringify(seen));
});

test('the products dots stand for are the material\'s products, none missing and none from outside', () => {
  for (const x of withHeading()) {
    const ids = new Set(x.products.map((g) => g.id));
    for (const a of x.spread) for (const r of a.rows) for (const e of r.entries) assert.ok(ids.has(e.g.id), `${x.m.id}: ${e.g.id} is one of the material's products`);
    for (const g of x.products) assert.ok(!/-R\d+$/.test(g.id), 'a reference grade is no product');
    const gids = new Set([...x.heading.matchAll(/data-grade="([^"]+)"/g)].map((d) => d[1]));
    for (const id of gids) assert.ok(ids.has(id), `${x.m.id}: a dot for ${id}, which is no product of the material`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------

test('the H2C\'s limit is drawn where it is near the values, and the axis says where it is when it is far above them', () => {
  const seen = { on: 0, above: 0, none: 0 };
  for (const x of withHeading()) {
    const parts = x.heading.split('<div class="imp-strips">').slice(1);
    const drawn = PRINT_AXES.filter((a) => x.settings[a.axis].drawn);
    assert.equal(parts.length, drawn.length, `${x.m.id}: a graph per drawn setting`);
    drawn.forEach(({ axis, limit }, i) => {
      const part = parts[i].split('<p class="imp-key')[0];
      const values = x.settings[axis].entries.map((e) => e.value);
      const lo = Math.min(...values), hi = Math.max(...values);
      const axisText = unesc(/class="imp-row imp-axis"><span class="fine">([^<]*)</.exec(part)?.[1] ?? '');
      const spans = (part.match(/<span class="imp-limit"/g) ?? []).length;
      const rowsDrawn = Object.values(x.settings[axis].rows).filter((r) => r.length).length;
      if (!limit) {
        assert.equal(spans, 0, `${x.m.id} ${axis}: no limit on drying`);
        assert.equal(axisText, '°C', `${x.m.id} ${axis}: the axis says only °C`);
        seen.none++;
        return;
      }
      const lim = LIMITS[axis];
      const near = lim <= hi + Math.max((hi - lo) / 4, 10);
      if (near) {
        assert.equal(spans, rowsDrawn, `${x.m.id} ${axis}: the limit ${lim} is drawn in each of the ${rowsDrawn} tracks (values ${lo} to ${hi})`);
        assert.equal(axisText, `°C, H2C limit ${fmtNumber(lim)}`, `${x.m.id} ${axis}: axis label`);
        seen.on++;
      } else {
        assert.equal(spans, 0, `${x.m.id} ${axis}: the limit ${lim} is far above the values ${lo} to ${hi} and is not drawn`);
        assert.equal(axisText, `°C; H2C limit ${fmtNumber(lim)} °C, above the scale`, `${x.m.id} ${axis}: axis label`);
        seen.above++;
      }
    });
    // The key names the limit exactly when some track draws it.
    assert.equal(x.heading.includes('imp-limit-key'), x.heading.includes('<span class="imp-limit"'), `${x.m.id}: the key names the limit when it is drawn`);
  }
  assert.ok(seen.on > 0 && seen.above > 0 && seen.none > 0, `all three cases are checked: ${JSON.stringify(seen)}`);
});
