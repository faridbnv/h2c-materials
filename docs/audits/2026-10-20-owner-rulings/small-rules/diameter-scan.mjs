// The owner's ruling of 2026-10-20 (item 8): a product found only in 2.85 mm stays, with a warning that the H2C takes
// 1.75 mm. This scan reads every product's documents (the cached, hash-checked text of each source its grade, its
// measurements, profiles, notes, evidence, claims and listings cite) for the diameters they print, with the reader m471
// and the import share (scripts/lib/diameters.mjs), and writes one row per grade: what each diameter's first mention
// says, whether a listing prices it, and the Diameter that reading gives. It decides nothing: m471 writes the column,
// and every product it reads as larger only was read on its pages first. Run where the source cache is.
//
//   node docs/audits/2026-10-20-owner-rulings/small-rules/diameter-scan.mjs > docs/audits/2026-10-20-owner-rulings/small-rules/diameter-scan.csv
import { readCsv } from '../../../../build/src/csv.js';
import { diameterCell, gradeDocuments } from '../../../../scripts/lib/diameters.mjs';

const rows = (t) => readCsv(new URL(`../../../../data/tables/${t}.csv`, import.meta.url).pathname).records.map((r) => r.values);

const documentsOf = gradeDocuments(rows);
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const first = (read, k) => read.filter((d) => d[k]).map((d) => `${d.id}: ${d[k]}`).join(' | ');
console.log(['GradeID', 'MaterialID', 'Status', 'Manufacturer', 'Product', 'Priced', 'Sources', 'Read', 'Quote 1.75', 'Quote 2.85', 'Quote 3 mm', 'Reading', 'Diameter compatibility'].map(csv).join(','));
for (const g of rows('grades')) {
  const { ids, read, priced } = documentsOf(g.GradeID);
  console.log([g.GradeID, g.MaterialID, g.Status, g.Manufacturer, g['Product name'], priced ? 'TRUE' : 'FALSE', ids.join('; '), read.length,
    first(read, 'mm175'), first(read, 'mm285'), first(read, 'mm300'), diameterCell(read, { priced }), g['Diameter compatibility']].map(csv).join(','));
}
