// Products their makers sell as toughened (product_claims.csv, D133): a row points at the maker's own statement on the
// product, the spread names the products and what the others give, and nothing that filters or decides reads it. A
// product's name is never the claim: "PETG+CF" and "PLA Tough" with no row are not marked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { attachProductClaims, CLAIM } from '../build/src/product-claims.js';
import { runSelection } from '../app/js/engine/constraints.js';
import { productsByMaterial } from '../app/js/engine/products.js';
import { TEMPLATES } from '../app/js/ui/templates.js';
import { renderValue } from '../app/js/ui/format.js';
import { renderDrawer } from '../app/js/ui/detail.js';
import { useRegistry } from '../app/js/ui/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
useRegistry(db.registry);
const rows = readCsv(join(root, 'data/tables/product_claims.csv')).records.map((r) => r.values);

test('a claim points at the maker\'s own statement on that product, and the statement speaks of toughness', () => {
  const grades = () => [{ id: 'G1' }, { id: 'G2', retired: true }, { id: 'G3' }];
  const statement = (id, gradeId, finding, extra = {}) => ({ EvidenceID: id, GradeID: gradeId, Domain: "Makers' know-how", 'Evidence type': 'Manufacturer statement', Finding: finding, ...extra });
  const evidenceRows = [statement('Q1', 'G1', 'Impact modified to improve toughness.'), statement('Q2', 'G3', 'Impact modified.'),
    statement('Q3', 'G1', 'Easy to print and odourless.'), statement('Q4', 'G1', 'Tough.', { 'Evidence type': 'Independent test' })];
  const claim = (GradeID, EvidenceID) => ({ GradeID, Claim: CLAIM.TOUGHENED, EvidenceID });
  const run = (r) => { const issues = [], gs = grades(); attachProductClaims([r], { grades: gs, evidenceRows, issues }); return { codes: issues.map((i) => i.code), g: gs[0] }; };
  assert.deepEqual(run(claim('G1', 'Q1')).codes, []);
  assert.deepEqual(run(claim('G1', 'Q1')).g.claims, [{ claim: CLAIM.TOUGHENED, evidenceId: 'Q1' }]);
  for (const [r, code] of [[claim('G9', 'Q1'), 'PRODUCT-CLAIM-REFERENCE'], [claim('G2', 'Q1'), 'PRODUCT-CLAIM-REFERENCE'], [claim('G1', 'Q2'), 'PRODUCT-CLAIM-REFERENCE'],
    [claim('G1', 'Q9'), 'PRODUCT-CLAIM-REFERENCE'], [claim('G1', 'Q4'), 'PRODUCT-CLAIM-REFERENCE'], [claim('G1', 'Q3'), 'PRODUCT-CLAIM-WORDS']]) {
    const { codes, g } = run(r);
    assert.deepEqual(codes, [code], JSON.stringify(r));
    assert.equal(g.claims, undefined, 'a refused claim marks nothing');
  }
});

test('only a product with a row is marked, whatever its name says', () => {
  const marked = new Set(rows.map((r) => r.GradeID));
  for (const g of db.grades) assert.equal(!!g.claims?.length, marked.has(g.id), g.id);
  // Names that the withdrawn D132 code read as claims: a "+" that joins a filler, and Tough/Pro with no statement.
  for (const name of [/PETG\+CF/, /PA12\+GF15/, /ABS\+GF10/]) {
    const g = db.grades.find((x) => name.test(x.product) && !x.retired);
    assert.ok(g, String(name));
    assert.equal(g.claims, undefined, g.product);
  }
});

test('the impact spreads set the toughened products apart, and name them, unless they are all there is', () => {
  const pla = db.materials.find((m) => m.id === 'M001');
  const s = pla.summary.charpyNotched, k = s.claimed;
  assert.ok(k?.setApart, 'PLA\'s notched Charpy sets them apart (m390)');
  assert.ok(k.n >= 1 && k.others.n === s.n, 'the median is the other products\'');
  assert.equal(s.median, k.others.median);
  assert.equal(pla.headline.charpyNotched.value, k.others.median, 'the table shows the others\' median');
  for (const id of k.gradeIds) assert.ok(db.grades.find((g) => g.id === id).claims?.length, id);
  // Every comparable value claimed: the products are the range, as a material of variants is its variants.
  for (const m of db.materials) for (const key of ['charpyNotched', 'izodNotched']) {
    const c = m.summary?.[key]?.claimed;
    if (c && !c.others) assert.ok(!c.setApart, `${m.id} ${key}: nothing to set them apart from`);
  }
  // The popover lists them with what it leaves out, and never says it includes them.
  const html = renderValue(pla.headline.charpyNotched, { showUnit: true, materialId: 'M001' });
  assert.match(html, new RegExp(`Left out: [^"]*${k.n} sold as toughened or impact-modified by their makers`));
  assert.doesNotMatch(html, /Included:/);
  assert.doesNotMatch(html, /including different commercial formulations/);
});

test('the drawer quotes the maker beside the product, and marks its dot', () => {
  const group = (list) => { const m = new Map(); for (const r of list) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
  const host = { innerHTML: '', querySelectorAll: () => [], querySelector: (sel) => ['#drawer-close', '#drawer-pin'].includes(sel) ? { addEventListener() {} } : null };
  renderDrawer(host, { db, selectedMaterialId: 'M001', drawerTab: 'Mechanical', selection: { evaluations: [] }, scenario: { shortlist: [], unknownPolicy: 'strict' },
    ctx: { measurementsByMaterial: group(db.measurements), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage) } }, {});
  const tough = db.grades.find((g) => g.id === 'G006-01');
  assert.match(host.innerHTML, new RegExp(`class="imp-dot[^"]*claimed[^"]*" data-measurement="${tough.headline.charpyNotched.measurementId}"`));
  assert.match(host.innerHTML, /Bambu Lab sells it as toughened or impact-modified: &quot;Engineered for real-world impact/);
});

test('no answer reads a claim: the templates give the same answers without them', () => {
  const ctx = { db, productsByMaterial: productsByMaterial(db), unknownPolicy: 'strict' };
  const answers = () => TEMPLATES.map((t) => runSelection(db.materials, t.constraints, ctx).evaluations.map((e) => `${e.materialId} ${e.verdict}`).join('|'));
  const withClaims = answers();
  const held = db.grades.filter((g) => g.claims).map((g) => [g, g.claims]);
  for (const [g] of held) delete g.claims;
  try { assert.deepEqual(answers(), withClaims); } finally { for (const [g, c] of held) g.claims = c; }
});
