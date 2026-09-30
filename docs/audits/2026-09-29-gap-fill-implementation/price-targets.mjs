// Where a price would decide something: the products that pass at least one of the frozen default questions (the six
// templates and the acceptance scenarios, FROZEN-QUESTIONS.json), and how many of them have a price the comparison can
// use. It is the count the owner was shown on 2026-09-30 when price was kept waiting (GOALS), and the first list a
// later price pass would work from.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/price-targets.mjs     prints the counts; needs npm run build
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const { runSelection, UNKNOWN_POLICY } = await import(join(root, 'app/js/engine/constraints.js'));
const { productsByMaterial } = await import(join(root, 'app/js/engine/products.js'));
const { useRegistry } = await import(join(root, 'app/js/ui/registry.js'));
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
const { questions } = JSON.parse(readFileSync(join(here, 'FROZEN-QUESTIONS.json'), 'utf8'));

useRegistry(db.registry);
const group = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.materialId)) m.set(r.materialId, []); m.get(r.materialId).push(r); } return m; };
const ctx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []),
  measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage), unknownPolicy: UNKNOWN_POLICY.STRICT };
const materials = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const grades = new Map(db.grades.map((g) => [g.id, g]));
const priced = new Set(db.prices.filter((p) => !p.quarantined && p.eligibleForMedian).map((p) => p.gradeId));
const passing = new Set(), passingMaterials = new Set();
for (const q of questions.filter((x) => x.lane === 'default')) {
  for (const e of runSelection(materials, q.constraints, { ...ctx, ...q.policy }).evaluations) {
    if (e.verdict === 'PASS') passingMaterials.add(e.materialId);
    for (const p of e.products ?? []) if (p.verdict === 'PASS') passing.add(p.gradeId);
  }
}
const pricedMaterial = (id) => db.materials.find((m) => m.id === id)?.headline?.priceCADkg?.value != null;
const makers = {};
for (const id of passing) if (!priced.has(id)) { const g = grades.get(id); makers[g.manufacturer] = (makers[g.manufacturer] ?? 0) + 1; }
console.log(JSON.stringify({
  release: db.meta.release.id, questions: questions.filter((x) => x.lane === 'default').length,
  passingProducts: passing.size, passingProductsPriced: [...passing].filter((id) => priced.has(id)).length,
  passingMaterials: passingMaterials.size, passingMaterialsPriced: [...passingMaterials].filter(pricedMaterial).length,
  unpricedPassingProductsByMaker: Object.fromEntries(Object.entries(makers).sort((a, b) => b[1] - a[1])),
}, null, 1));
