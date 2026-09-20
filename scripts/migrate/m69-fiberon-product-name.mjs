#!/usr/bin/env node
// Migration m69 (2026-09-19): two grades whose product name is a file name.
//
// Polymaker's Fiberon PA612-ESD sheet prints its own name letter-spaced ("F I B E R O N  PA 6 1 2 - E S D"),
// which no reader made out, so the batch fell back to the link and wrote "TDS FIBERON PA612 ESD V1 0 EN 1" as
// the product. The sheet's own title line says Fiberon PA612-ESD, and every other Fiberon grade in the database
// is named that way. A product name is what a buyer asks for, so a file name is not one.
//
//   node scripts/migrate/m69-fiberon-product-name.mjs

import { openTables } from '../data/table-io.mjs';

const WRONG = 'TDS FIBERON PA612 ESD V1 0 EN 1';
const RIGHT = 'Fiberon PA612-ESD';

const t = openTables();
let n = 0;
for (const row of t.rows('grades')) {
  if (row['Product name'] !== WRONG) continue;
  t.set('grades', row.GradeID, 'Product name', RIGHT, { expect: WRONG });
  n++;
}
if (n) t.save();
console.log(`${n} grade(s) now carry the name their sheet prints`);
