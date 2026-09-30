// The price pass's worklist (GOALS, "Decided on 2026-09-30, the price pass"): every material in scope without a
// usable price, and the products that could give it one, in the order the pass tries them. A product that passes one of
// the frozen default questions comes first (it is where a price decides something), then a plain product (a material's
// price is its plain products' spread, D83), then a declared variant. Materials already priced are listed too, with the
// products the pass would add, since the owner asked for products where it can.
//
//   node docs/audits/2026-09-30-price-pass/targets.mjs [out.csv]    writes TARGETS.csv beside it (the worklist as the pass
//                                                                   began, release 26424edd53e5), or out.csv for a recount;
//                                                                   needs npm run build
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../../../build/src/csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const { runSelection, UNKNOWN_POLICY } = await import(join(root, 'app/js/engine/constraints.js'));
const { productsByMaterial } = await import(join(root, 'app/js/engine/products.js'));
const { useRegistry } = await import(join(root, 'app/js/ui/registry.js'));
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const { questions } = JSON.parse(readFileSync(join(root, 'docs/audits/2026-09-29-gap-fill-implementation/FROZEN-QUESTIONS.json'), 'utf8'));

useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage), unknownPolicy: UNKNOWN_POLICY.STRICT };
const inScope = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const passing = new Map();
for (const q of questions.filter((x) => x.lane === 'default')) {
  for (const e of runSelection(inScope, q.constraints, { ...ctx, ...q.policy }).evaluations) {
    for (const p of e.products ?? []) if (p.verdict === 'PASS') passing.set(p.gradeId, (passing.get(p.gradeId) ?? 0) + 1);
  }
}
// A product is priced when it has a price of its own (products.js), which is what the comparison reads.
const priced = new Set(db.grades.filter((g) => g.headline?.priceCADkg?.value != null).map((g) => g.id));
const listed = new Set(db.prices.filter((p) => !p.quarantined).map((p) => p.gradeId));
const rows = [];
for (const m of inScope) {
  const materialPriced = m.headline?.priceCADkg?.known === true;
  const grades = db.grades.filter((g) => g.materialId === m.id && !g.retired && !/-R\d+$/.test(g.id));
  const rank = (g) => (passing.has(g.id) ? 0 : 2) + (g.variant ? 1 : 0);
  const ordered = [...grades].sort((a, b) => rank(a) - rank(b) || (passing.get(b.id) ?? 0) - (passing.get(a.id) ?? 0) || a.id.localeCompare(b.id));
  if (!ordered.length) {
    rows.push({ MaterialID: m.id, Material: m.name, 'Material priced': 'no', Order: 0, GradeID: 'None', Manufacturer: 'Not applicable', Product: 'Not applicable',
      Passing: 'Not applicable', Variant: 'Not applicable', 'Product priced': 'Not applicable', 'Listed before': 'Not applicable', Wave: 'none: no procurement product' });
    continue;
  }
  ordered.forEach((g, i) => rows.push({
    MaterialID: m.id, Material: m.name, 'Material priced': materialPriced ? 'yes' : 'no', Order: i + 1, GradeID: g.id,
    Manufacturer: g.manufacturer, Product: g.product, Passing: passing.has(g.id) ? `yes (${passing.get(g.id)} question(s))` : 'no',
    Variant: g.variant ? 'yes' : 'no', 'Product priced': priced.has(g.id) ? 'yes' : 'no', 'Listed before': listed.has(g.id) ? 'yes' : 'no',
    Wave: priced.has(g.id) ? 'priced' : materialPriced ? '2: product' : '1: material',
  }));
}
writeFileSync(process.argv[2] ?? join(here, 'TARGETS.csv'), csvText(Object.keys(rows[0]), rows));
const unpriced = inScope.filter((m) => m.headline?.priceCADkg?.known !== true);
console.log(JSON.stringify({
  release: db.meta.release.id, materials: inScope.length, materialsPriced: inScope.length - unpriced.length,
  materialsUnpriced: unpriced.length, unpricedWithoutProduct: unpriced.filter((m) => !rows.some((r) => r.MaterialID === m.id && r.GradeID !== 'None')).map((m) => m.id),
  products: rows.filter((r) => r.GradeID !== 'None').length, productsPriced: rows.filter((r) => r['Product priced'] === 'yes').length,
  passingProducts: passing.size, passingProductsPriced: [...passing.keys()].filter((id) => priced.has(id)).length,
}, null, 1));
