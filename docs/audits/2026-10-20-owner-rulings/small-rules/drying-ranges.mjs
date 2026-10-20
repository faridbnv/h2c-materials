// What showing a printed drying range as the range moved (D175, m472): each product whose drying now reads as a range,
// with what it read before (the upper ends alone), and each material whose typical drying span moved. It reads the
// built database and the pages' own words, so it says what a reader sees.
//
//   npm run build && node docs/audits/2026-10-20-owner-rulings/small-rules/drying-ranges.mjs > <out.csv>
import { readFileSync } from 'node:fs';
import { dryingWords } from '../../../../app/js/ui/format.js';
import { dryingSchedule } from '../../../../app/js/ui/material-highlights.js';
import { dryingSpanWords } from '../../../../app/js/ui/print-brief.js';

const db = JSON.parse(readFileSync(new URL('../../../../dist/db.json', import.meta.url), 'utf8'));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const upperOnly = (d) => (({ tempMinC, hoursMin, ...u }) => u)(d);
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
console.log(['Kind', 'Record', 'MaterialID', 'Name', 'Read from', 'Before', 'After'].map(csv).join(','));
for (const g of db.grades) {
  const d = g.print?.drying;
  if (!d || g.retired || (d.tempMinC == null && d.hoursMin == null)) continue;
  console.log(['product', g.id, g.materialId, `${g.manufacturer} ${g.product}`, g.print.from?.drying?.origin ?? 'own', dryingWords(upperOnly(d)), dryingWords(d)].map(csv).join(','));
}
for (const m of db.materials) {
  if (m.familyEntry) continue;
  const products = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired && !/-R\d+$/.test(g.id));
  const after = dryingSchedule(products);
  const before = dryingSchedule(products.map((g) => (g.print?.drying ? { ...g, print: { ...g.print, drying: upperOnly(g.print.drying) } } : g)));
  const [a, b] = [after, before].map((s) => (s ? dryingSpanWords(s) : ''));
  if (a !== b) console.log(['material', m.id, m.id, m.name, 'its products', b, a].map(csv).join(','));
}
