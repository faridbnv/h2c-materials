// Which materials have a page of their own (app/js/ui/page-rule.js pageOf: at least 3 products and 20 measured values),
// and which fall short by one product or a few values: written before and after the research intake, so a material that
// crosses the rule is seen and gets its summary.
//
//   node docs/audits/2026-10-19-research-intake/pages-list.mjs dist/db.json > <file.csv>
import { readFileSync } from 'node:fs';
import { pageOf, pageFacts, PAGE_RULE } from '../../../app/js/ui/page-rule.js';

const db = JSON.parse(readFileSync(process.argv[2] ?? 'dist/db.json', 'utf8'));
const ms = new Map();
for (const x of db.measurements) (ms.get(x.materialId) ?? ms.set(x.materialId, []).get(x.materialId)).push(x);
const rows = ['MaterialID,Material,Scope,Products,Values,Page,Short of'];
for (const m of db.materials.filter((x) => !x.familyEntry)) {
  const f = pageFacts(m, ms.get(m.id) ?? []);
  const page = !!pageOf(m, ms.get(m.id) ?? []);
  const short = page ? '' : [f.products < PAGE_RULE.minProducts ? `${PAGE_RULE.minProducts - f.products} product(s)` : '', f.values < PAGE_RULE.minValues ? `${PAGE_RULE.minValues - f.values} value(s)` : ''].filter(Boolean).join(' and ');
  rows.push([m.id, `"${m.name.replace(/"/g, '""')}"`, m.scope, f.products, f.values, page ? 'yes' : 'no', short].join(','));
}
console.log(rows.join('\n'));
