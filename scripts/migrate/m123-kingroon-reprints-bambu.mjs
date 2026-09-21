#!/usr/bin/env node
// Migration m123 (2026-09-21): Kingroon's PLA Basic and PETG Basic reprint Bambu's tables, across materials.
//
// Batch b31 shaped the two by R053 and gave each a formulation key naming the Bambu source whose numbers they print.
// But those numbers sit on Bambu's own grades under Bambu's own materials — PLA Basic (M002, G002-01) and PETG
// Translucent (M023, G023-01) — while Kingroon's products are plain PLA (M001) and PETG (M020). A key belongs to one
// material (D12, D44), so this is the other shape, R166: each product keeps its own grade and sheet, records no
// values of its own, and a coverage row names the table it reprints. The twins step shaped them as R053 because
// the Bambu grades carry keys of their own, not their source's name; it now asks where a source's values sit.
//
//   node scripts/migrate/m123-kingroon-reprints-bambu.mjs

import { openTables, nextId } from '../data/table-io.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm123-kingroon-reprints-bambu';
const t = openTables();
let changed = 0;
for (const [grade, was, primary, values] of [
  ['G001-192', 'B-PC-Bambu-PLA-Basic-Technical-Data-Sheet', 'B-PC-Bambu-PLA-Basic-Technical-Data-Sheet', 'G002-01 (M002, PLA Basic)'],
  ['G020-72', 'B-PC-Bambu-PETG-Translucent-Technical-Data-Sheet', 'B-PC-Bambu-PETG-Translucent-Technical-Data-Sheet', 'G023-01 (M023, PETG Translucent)'],
]) {
  const g = t.get('grades', grade);
  if (g['Shared formulation key'] === g.SourceID) continue;
  t.set('grades', grade, 'Shared formulation key', g.SourceID, { expect: was });
  const line = `Kingroon ${g['Product name']} (${g.SourceID}) reprints the table ${primary} carries on ${values}`;
  // One R166 row per material: a material that already has one from batch b31 gains the line.
  const row = t.rows('coverage').find((c) => c.MaterialID === g.MaterialID && c.Domain === 'Source conflict' && /\(ruling R166, m122-batch-b31\)/.test(c.Finding));
  if (row) {
    t.set('coverage', row.CoverageID, 'Finding', row.Finding.replace(/\. Each product and its sheet/, `; ${line} (${MIGRATION}). Each product and its sheet`), { expect: row.Finding });
  } else {
    t.append('coverage', { CoverageID: nextId('coverage', t.rows('coverage').map((c) => c.CoverageID)), MaterialID: g.MaterialID, Domain: 'Source conflict', Status: 'Reviewed with limitations', 'Manufacturer count': 'Not applicable',
      Finding: `Reviewed ${DATE} (ruling R166, ${MIGRATION}). ${line}. The product and its sheet are registered; the numbers are Bambu's and are not repeated here.` });
  }
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} grade(s) given their own key and a coverage row`);
