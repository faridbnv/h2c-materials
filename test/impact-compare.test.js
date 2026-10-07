// Notched Charpy beside notched Izod in the drawer (D133): a row of dots per test, a product each, on one scale, and a
// table of products with a column per test. The rows must be the material's spread exactly (build/src/products.js),
// each dot the product's own value, and a bar's state the one the build reads, a page's statement included (D116).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDrawer, impactKind } from '../app/js/ui/detail.js';
import { useRegistry } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const IMPACT = db.registry.headlines.filter((h) => h.drawerComparison === 'Impact tests');

function mechanical(materialId) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
  renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: 'Mechanical', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
  return host.innerHTML;
}
const section = (html) => html.slice(html.indexOf('<section class="imp-compare"'), html.indexOf('</section>', html.indexOf('<section class="imp-compare"')));
/** Each headline's row of dots, as [measurementId, gradeId, classes] triples, in the order the headlines are drawn. */
const rowsOf = (html) => section(html).split('<div class="imp-row">').slice(1, 1 + IMPACT.length)
  .map((r) => [...r.matchAll(/<button type="button" class="imp-dot([^"]*)" data-measurement="([^"]+)" data-grade="([^"]+)"/g)].map((d) => ({ cls: d[1], mid: d[2], gid: d[3] })));

test('the impact headlines are the ones the data names, and nothing else is drawn this way', () => {
  assert.deepEqual(IMPACT.map((h) => h.key), ['charpyNotched', 'izodNotched']);
  assert.ok(db.method.some((r) => r.topic === 'Impact tests' && /no value is converted/.test(r.rule)));
});

test('each row is the material\'s spread, a dot per product at its own value, squares exactly the annealed ones', () => {
  for (const id of ['M001', 'M027', 'M051', 'M081']) {
    const m = db.materials.find((x) => x.id === id);
    const html = mechanical(id);
    const at = html.indexOf('<section class="imp-compare"');
    assert.ok(at >= 0, `${id}: the comparison is drawn`);
    assert.ok(at < html.indexOf('Charpy strength'), `${id}: it comes before the Charpy records`);
    rowsOf(html).forEach((dots, i) => {
      const key = IMPACT[i].key, s = m.summary?.[key];
      assert.equal(dots.length, (s?.n ?? 0) + (s?.asPublished?.n ?? 0) + (s?.variants?.n ?? 0) + (s?.claimed?.setApart ? s.claimed.n : 0), `${id} ${key}: a dot per product the spread counts, those set apart included`);
      for (const d of dots) {
        const v = gradeById.get(d.gid).headline[key];
        assert.equal(d.mid, v.measurementId, `${id} ${key} ${d.gid}: its own value`);
        assert.equal(/\bannealed\b/.test(d.cls), !!v.anneal, `${id} ${key} ${d.gid}: square only when annealed`);
        assert.equal(/\bopen\b/.test(d.cls), v.level === 'as-published', `${id} ${key} ${d.gid}: hollow only with no stated orientation`);
      }
    });
  }
});

test('a schedule its page states once for the table is the bar\'s state, never "not stated" (D116)', () => {
  // Polymaker's Fiberon PA6 GF25 sheet: "all specimens annealed at 100°C for 16h" under the table (page_context PC00069).
  const html = section(mechanical('M051'));
  const row = html.match(/<tr><td>Polymaker FIBERON PA6 GF25<\/td>[\s\S]*?<\/tr>/)?.[0];
  assert.ok(row, 'the product has its row');
  assert.match(row, /annealed at 100 °C for 16 h \(stated once on its page\)/);
  assert.doesNotMatch(row, /treatment not stated/);
});

test('a product\'s name is text, never markup', () => {
  const g = gradeById.get('G006-01');
  const was = g.product;
  g.product = 'PLA Tough+ <img src=x onerror=alert(1)>';
  try {
    const html = section(mechanical('M001'));
    assert.ok(!html.includes('<img src=x'), 'escaped');
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  } finally { g.product = was; }
});

test('a material with no impact record draws no comparison', () => {
  const props = new Set(IMPACT.flatMap((h) => [...h.valueProperties, ...h.relatedProperties]));
  const none = db.materials.find((m) => !m.familyEntry && m.gradeIds?.length && !db.measurements.some((x) => x.materialId === m.id && props.has(x.property)));
  assert.ok(none, 'such a material exists');
  assert.ok(!mechanical(none.id).includes('class="imp-compare"'), none.id);
});

test('an impact record is described from its typed fields, never converted', () => {
  const base = { property: 'Izod impact strength', value: 160, unit: 'J/m', notch: 'Notched', direction: 'XY', specimenForm: 'printed', standards: ['ASTM D256'] };
  assert.equal(impactKind(base), 'Notched Izod 160 J/m (ASTM D256)');
  assert.equal(impactKind({ ...base, property: 'Charpy strength', value: 80.6, unit: 'kJ/m²', notch: 'Unnotched', standards: ['ISO 179'], postProcessingState: 'annealed' }),
    'Unnotched Charpy 80.6 kJ/m² (annealed)');
  assert.equal(impactKind({ ...base, property: 'Impact strength', value: 13.8, unit: 'kJ/m²', notch: 'Not published', direction: 'Z', standards: [] }),
    'Impact 13.8 kJ/m² (notch not stated, Z bar)');
  assert.equal(impactKind({ ...base, unit: 'kJ/m²', value: 9, standards: ['ISO 180'], specimenForm: 'moulded', moistureState: 'conditioned', testTemperatureC: -30 }),
    'Notched Izod 9 kJ/m² (moulded bar, after conditioning, struck at -30 °C)');
});
