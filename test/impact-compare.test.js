// Notched Charpy beside notched Izod in the drawer (D133): one heading with a row of dots per test, a product each, on
// one scale, a table of what each median is of, then every record under its property. The rows must be the material's
// spread exactly (build/src/products.js), each dot the product's own value, the record it stands for saying where it
// sits, and a bar's state the one the build reads, a page's statement included (D116).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDrawer } from '../app/js/ui/detail.js';
import { useRegistry } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) };
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const msById = new Map(db.measurements.map((x) => [x.id, x]));
const IMPACT = db.registry.headlines.filter((h) => h.drawerComparison === 'Impact tests');

function mechanical(materialId) {
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (s) => ['#drawer-close', '#drawer-pin'].includes(s) ? { addEventListener() {} } : null };
  renderDrawer(host, { db, selectedMaterialId: materialId, drawerTab: 'Mechanical', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' }, ctx }, {});
  return host.innerHTML;
}
const section = (html) => html.slice(html.indexOf('<section class="imp-compare"'), html.indexOf('</section>', html.indexOf('<section class="imp-compare"')));
/** Each headline's row of dots, as [measurementId, gradeId, classes] triples, in the order the headlines are drawn. */
const rowsOf = (html) => section(html).split('<div class="imp-row">').slice(1, 1 + IMPACT.length)
  .map((r) => [...r.matchAll(/<button type="button" class="imp-dot([^"]*)" data-row="([^"]+)" data-grade="([^"]+)"/g)].map((d) => ({ cls: d[1], mid: d[2], gid: d[3] })));

/** The records in the impact heading, each with the "On the graph" lines it carries: [{ mid, key, text }]. */
const graphLines = (html) => html.split('<div class="evidence-row').slice(1).flatMap((r) => {
  const mid = r.match(/data-mid="([^"]+)"/)[1];
  return [...r.matchAll(/<div class="cond on-graph" data-on-graph="([^"]+)">([\s\S]*?)<\/span><\/div>/g)].map((l) => ({ mid, key: l[1], text: l[2].replace(/<[^>]+>/g, '') }));
});
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

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
    assert.ok(at < html.indexOf('maker-name">Charpy impact strength<'), `${id}: it comes before the Charpy records`);
    rowsOf(html).forEach((dots, i) => {
      const key = IMPACT[i].key, s = m.summary?.[key];
      assert.equal(dots.length, (s?.n ?? 0) + (s?.asPublished?.n ?? 0) + (s?.variants?.n ?? 0) + (s?.claimed?.setApart ? s.claimed.n : 0), `${id} ${key}: a dot per product the spread counts, those set apart included`);
      for (const d of dots) {
        const v = gradeById.get(d.gid).headline[key];
        assert.equal(d.mid, v.measurementId, `${id} ${key} ${d.gid}: its own value`);
        assert.equal(msById.get(d.mid).value, v.value, `${id} ${key} ${d.gid}: drawn at its record's value`);
        assert.equal(/\bannealed\b/.test(d.cls), !!v.anneal, `${id} ${key} ${d.gid}: square only when annealed`);
        assert.equal(/\bopen\b/.test(d.cls), v.level === 'as-published', `${id} ${key} ${d.gid}: hollow only with no stated orientation`);
      }
    });
  }
});

test('a schedule its page states once for the table is the bar\'s state, never "not stated" (D116)', () => {
  // Polymaker's Fiberon PA6 GF25 sheet: "all specimens annealed at 100°C for 16h" under the table (page_context PC00069).
  const g = db.grades.find((x) => gradeById.get(x.id) && /FIBERON PA6 GF25$/.test(x.product ?? '') && x.materialId === 'M051');
  const mid = g.headline.charpyNotched?.measurementId ?? g.headline.izodNotched.measurementId;
  const line = graphLines(mechanical('M051')).find((l) => l.mid === mid);
  assert.ok(line, 'the record its dot stands for says so');
  assert.match(line.text, /annealed at 100 °C for 16 h \(stated once on its page\)/);
  assert.doesNotMatch(line.text, /not stated/);
});

test('every dot\'s record says where it sits, and the ones "in the median" are the median the table prints', () => {
  for (const m of db.materials.filter((x) => !x.familyEntry && IMPACT.some((h) => x.summary?.[h.key]))) {
    const html = mechanical(m.id);
    const lines = graphLines(html);
    IMPACT.forEach((h, i) => {
      const dots = rowsOf(html)[i] ?? [];
      const mine = lines.filter((l) => l.key === h.key);
      assert.equal(mine.length, dots.length, `${m.id} ${h.key}: a line per dot`);
      for (const d of dots) assert.ok(mine.some((l) => l.mid === d.mid), `${m.id} ${h.key} ${d.mid}: its record is listed and marked`);
      for (const l of mine) assert.equal(msById.get(l.mid).property, h.valueProperties[0], `${m.id} ${l.mid}: under its own test`);
      const s = m.summary?.[h.key];
      const inMedian = mine.filter((l) => /: in the median\b/.test(l.text)).map((l) => gradeById.get(rowsOf(html)[i].find((d) => d.mid === l.mid).gid).headline[h.key].value);
      assert.equal(inMedian.length, s?.n ?? 0, `${m.id} ${h.key}: the products in the median`);
      if (s?.n) assert.ok(Math.abs(median(inMedian) - s.median) < 1e-6 * Math.max(1, s.median), `${m.id} ${h.key}: median ${median(inMedian)} = ${s.median}`);
    });
  }
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

test('one closed heading holds everything on impact: the comparison, then every record under its property', () => {
  const html = mechanical('M001');
  assert.equal(html.split('class="prop-block imp-block"').length - 1, 1, 'one impact heading');
  assert.ok(!html.includes('imp-table'), 'no product table repeating the lists');
  const start = html.lastIndexOf('<details', html.indexOf('<section class="imp-compare"'));
  assert.match(html.slice(start, html.indexOf('<section class="imp-compare"')), /<details class="prop-block imp-block" data-search-group>[\s\S]*>Impact tests</, 'closed until opened');
  // Inside it, after the comparison and before the next property's heading: each impact property's block, the
  // unclear one with the note saying why it exists, and the comparison notes said once.
  const end = html.indexOf('>Hardness<', start);
  const inside = html.slice(html.indexOf('</section>', start), end);
  for (const name of ['Charpy impact strength', 'Izod impact strength', 'Impact strength, test unclear']) assert.match(inside, new RegExp(`maker-name">${name}<`), name);
  assert.match(inside, /An impact result whose test is unclear: the sheet names no test, or names both/);
  assert.equal(html.split('<b>Notched Charpy impact.</b>').length - 1, 1, 'the Charpy comparison note once');
  assert.ok(!html.slice(0, start).includes('maker-name">Charpy impact strength<'), 'no Charpy heading outside it');
  // A replaced property holds no values, so it is never listed as not published.
  assert.ok(!html.includes('Izod strength ·') && !/Izod strength\.? A gap/.test(html), 'Izod strength is not "not published"');
});

test('every impact result whose test is unclear carries a reading of which test it probably was, shown beside it', () => {
  const unclear = db.measurements.filter((m) => m.property === 'Impact strength');
  assert.ok(unclear.length > 0);
  for (const m of unclear) assert.ok(m.testGuess?.test && m.testGuess.basis, `${m.id} has a reading`);
  assert.ok(db.measurements.every((m) => !m.testGuess || m.property === 'Impact strength'), 'only an unclear result carries one');
  // Eryone's "Charpy … GB/T 1843" rows read as Izod, on the 2.75 J pendulum only the Izod series has.
  const eryone = unclear.find((m) => /2\.75J GB\/T 1843/.test(m.standardText ?? ''));
  assert.equal(eryone.testGuess.test, 'Izod');
  assert.match(mechanical(eryone.materialId), /Which test: probably Izod\./);
  // A record whose own standard names the test is filed under it.
  assert.ok(!unclear.some((m) => /^ISO 179$|^ISO 180$/.test((m.standards ?? []).join('; ')) && !/charpy|izod/i.test(m.locator)), 'no unclear result whose only standard names the test');
});
