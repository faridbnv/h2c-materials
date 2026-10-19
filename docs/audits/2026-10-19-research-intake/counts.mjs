// The figures the research intake is meant to move, from a compiled database (dist/db.json): print gaps, fibre loads,
// priced products and materials, material pages. Written before and after the round.
//
//   node docs/audits/2026-10-19-research-intake/counts.mjs dist/db.json
import { readFileSync } from 'node:fs';
import { pageOf } from '../../../app/js/ui/page-rule.js';

const db = JSON.parse(readFileSync(process.argv[2] ?? 'dist/db.json', 'utf8'));
const products = db.grades.filter((g) => !g.retired && !/-R\d/.test(g.id));
const unknown = (w) => !w || w.state === 'unknown' || w.verdict === 'unknown';
const ms = new Map();
for (const x of db.measurements) (ms.get(x.materialId) ?? ms.set(x.materialId, []).get(x.materialId)).push(x);
const fibreFilled = new Set(db.materials.filter((m) => /fibre/i.test(m.modifier ?? '')).map((m) => m.id));
const fibreRows = new Set(db.measurements.filter((x) => x.property === 'Fibre content' && !/Retired/.test(x.dataStatus ?? '')).map((x) => x.gradeId));
const out = {
  release: db.meta.release?.id,
  products: products.length,
  noNozzle: products.filter((g) => unknown(g.print?.nozzle)).length,
  noBed: products.filter((g) => unknown(g.print?.bed)).length,
  chamberUnanswered: products.filter((g) => !g.print?.chamber || g.print.chamber.verdict === 'unknown').length,
  noDrying: products.filter((g) => !g.print?.drying?.need).length,
  fibreFilledProducts: products.filter((g) => fibreFilled.has(g.materialId)).length,
  fibreFilledWithOwnLoad: products.filter((g) => fibreFilled.has(g.materialId) && fibreRows.has(g.id)).length,
  pricedProducts: new Set(db.prices.filter((x) => !x.quarantined && x.headlineSample).map((x) => x.gradeId)).size,
  pricedMaterials: new Set(db.prices.filter((x) => !x.quarantined && x.headlineSample).map((x) => x.materialId)).size,
  materialPages: db.materials.filter((m) => pageOf(m, ms.get(m.id) ?? [])).length,
  sources: db.sources.length,
  measurements: db.measurements.length,
  profiles: db.profiles.length,
};
console.log(JSON.stringify(out, null, 2));
