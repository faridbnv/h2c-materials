// A lower bound a sheet prints ("> 300 %", V011516) is a product's value with an open interval, and the build keeps it
// one. The page drew it as "300 %*" or "300 %": the sheet's own sign dropped, so a limit read as a measurement
// (OPEN-PROBLEMS, "A published bound shows as its number"). Wherever a value is shown, a bound says so.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fmtBounded, renderValue } from '../app/js/ui/format.js';
import { toCSV, productsCSV, passingValues } from '../app/js/ui/table.js';
import { useRegistry, exportHeadlines } from '../app/js/ui/registry.js';
import { evaluateConstraint, STATUS } from '../app/js/engine/constraints.js';

const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
useRegistry(db.registry);
const open = (iv) => !!iv && (iv.lo == null) !== (iv.hi == null);
const lower = { lo: 300, hi: null, openLow: true };

test('a published bound reads as one in a number cell, with its words in the accessible name and the hover', () => {
  assert.equal(fmtBounded(300, '%', lower), '> 300 %');
  assert.equal(fmtBounded(0.8, '%', { lo: null, hi: 0.8, openHigh: true }), '< 0.8 %');
  assert.equal(fmtBounded(5, 'GPa', { lo: 5, hi: null }), '≥ 5 GPa');
  // A point, a range and a mean with a band are numbers.
  for (const iv of [null, { lo: 300, hi: 300, kind: 'point' }, { lo: 4, hi: 6, kind: 'range' }, { lo: 28, hi: 32, kind: 'uncertainty' }]) {
    assert.equal(fmtBounded(300, '%', iv), '300 %');
  }
  const html = renderValue({ known: true, value: 300, unit: '%', measurementId: 'V011516', interval: lower }, { showUnit: true });
  assert.match(html, /&gt; 300 %/);
  assert.match(html, /aria-label="more than 300 %, open the measurement in Sources"/);
  assert.match(html, /Published as a bound: the source prints &quot;more than 300 %&quot;/);
  assert.doesNotMatch(renderValue({ known: true, value: 300, unit: '%', measurementId: 'V1', interval: { lo: 300, hi: 300, kind: 'point' } }, { showUnit: true }), /bound/);
});

test('a measurement shown only as related keeps its bound, in the cell and in the hover', () => {
  const best = { measurementId: 'V011516', gradeId: 'G167-12', value: 300, unit: '%', property: 'Elongation at break', direction: 'unknown', why: 'direction not stated', interval: lower };
  const html = renderValue({ known: false, missing: 'not-published', related: { count: 1, grades: 1, best, items: [best] } }, { showUnit: true });
  assert.match(html, /<span class="rv">&gt; 300 %<\/span>/);
  assert.match(html, /Nearest value on file: &gt; 300 %/);
  assert.match(html, /Published as a bound/);
});

test('every bound in the release is drawn as one: a product value, a related hint, and a material whose number or range end is one', () => {
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  let products = 0, hints = 0, medians = 0, ends = 0;
  for (const g of db.grades) {
    for (const v of Object.values(g.headline ?? {})) {
      if (!open(v.interval)) continue;
      products++;
      assert.match(renderValue({ known: true, unit: '', ...v }), /&[gl]t; |≥|≤/, `${g.id} ${v.measurementId}`);
    }
  }
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline ?? {})) {
      if (!h.known && open(h.related?.best?.interval)) {
        hints++;
        assert.match(renderValue(h), /<span class="rv">&[gl]t; /, `${m.id} ${key}`);
      }
      if (!h.known || !h.spread) continue;
      // The build counts the bounds among the values the median is of, and says which end of the range is one.
      const bounds = m.gradeIds.map((id) => gradeById.get(id))
        .filter((g) => g?.headline?.[key]?.level === 'comparable' && !g.variant && open(g.headline[key].interval));
      assert.equal(h.spread.bounds?.n ?? 0, bounds.length, `${m.id} ${key}`);
      if (!bounds.length) continue;
      const html = renderValue(h, { compact: true });
      // A material of one product is drawn as that product's value (the evidence button), not as a spread: the bound is in
      // the button's text. Reader round (m342), 2026-10-04: M114's only product prints "> 300 %" (V011861).
      if (h.typical.interval) { medians++; assert.match(html, h.spread.n > 1 ? /<span class="sv">&[gl]t; / : /<span class="[^"]*">&[gl]t; /, `${m.id} ${key}`); }
      if (h.spread.bounds.max && h.spread.n > 1) { ends++; assert.match(html, /<span class="spread"[^>]*>[^<]*(\+|&lt;)/, `${m.id} ${key}`); }
    }
  }
  assert.ok(products >= 40 && hints >= 4, `only ${products} product bounds and ${hints} hints in the release`);
  assert.ok(medians >= 1 && ends >= 1, 'no median or range end that is a bound to check');
});

test('the verdict reason says a value is a bound, and never prints its open end', () => {
  const material = { id: 'M1', name: 'X', gates: {}, headline: { elongationXY: { known: true, value: 300, unit: '%', measurementId: 'V1', interval: lower } } };
  const c = { kind: 'numeric', property: 'elongationXY', operator: '>=', value: 100, mandatory: true };
  const ok = evaluateConstraint(material, c, { useEstimates: false });
  assert.equal(ok.status, STATUS.PASS);
  assert.match(ok.reason, /^Published more than 300 %/);
  const straddle = evaluateConstraint(material, { ...c, value: 500 }, { useEstimates: false });
  assert.equal(straddle.status, STATUS.INDETERMINATE);
  assert.match(straddle.reason, /more than 300 %, a bound/);
  assert.doesNotMatch(straddle.reason, /null/);
  // The passing values a table row shows keep the sign of a passing product's bound.
  const e = { products: [{ verdict: 'PASS', results: [{ constraint: c, observed: 300, interval: lower }, ] }, { verdict: 'PASS', results: [{ constraint: c, observed: 700, interval: { lo: 700, hi: 700, kind: 'point' } }] }] };
  assert.deepEqual(passingValues(e, 'elongationXY'), { min: 300, max: 700, n: 2, minBound: 'lower', maxBound: null });
});

test('both exports keep the number in its column and say, in a qualifier, that it is a bound', () => {
  // M160's elongation is the median of five products, three of which publish "more than": G042-01, G039-18 and G039-70.
  // Reader round (m342), 2026-10-04: three products' values (G039-25, G039-60, G039-70 ">650%") were added from their pages; it was four products, two bounds.
  // Quality round (m403), 2026-10-07: varioShore and varioShore Prosthetic (G039-25, G039-60) foam, so they are variants and leave the seven.
  const m = db.materials.find((x) => x.id === 'M160');
  const evaluation = { verdict: 'PASS', eligible: true, failed: [], unresolved: [] };
  const lines = toCSV([{ material: m, evaluation }], db.meta).split('\n');
  const header = lines.find((l) => l.startsWith('MaterialID,')).split(',');
  const cell = (line, name) => line.split(',')[header.indexOf(name)];
  const row = lines.at(-1);
  assert.match(row, /elongationXY: 3 of 5 product values are published bounds/);
  assert.equal(Number(cell(row, exportHeadlines().find((h) => h.key === 'elongationXY').header)), m.headline.elongationXY.value);

  const grades = m.gradeIds.map((id) => db.grades.find((g) => g.id === id));
  const products = productsCSV([{ material: m, evaluation: null }], db, { productsByMaterial: new Map([[m.id, grades]]) }).split('\n');
  const pHeader = products.find((l) => l.startsWith('MaterialID,')).split(',');
  const q = pHeader.indexOf('Value qualifiers');
  assert.ok(q > 0, 'the products file has a Value qualifiers column');
  const g042 = products.find((l) => l.includes(',G042-01,'));
  assert.match(g042, /elongationXY: > 650/);
  const value = pHeader.indexOf('elongationXY');
  assert.equal(g042.split(',')[value], '650');
});
