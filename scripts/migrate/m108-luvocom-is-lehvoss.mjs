#!/usr/bin/env node
// Migration m108 (2026-09-21): LUVOCOM 3F is LEHVOSS's, whoever sells it (R096).
//
// Five grades name 3D4Makers as the maker of a LUVOCOM 3F filament: PEEK 9581, PEKK 50082, PEI 50236 GY, PPS CF
// 9938 BK and PA CF 9742 BK. Every one of their sheets is LEHVOSS's own preliminary data sheet, headed with the
// LUVOCOM brand and signed "Lehmann&Voss&Co. KG, LEHVOSS North America, LEHVOSS (Shanghai)"; 3D4Makers hosts them.
// FormFutura hosts the same line in its partner library (batch b28), and one product — LUVOCOM 3F PEEK 9581 —
// is on both shelves. With two makers it would have entered as two products, which is the duplicate D44 exists
// to prevent. The maker is the one the sheet names (R074), so the five grades take LEHVOSS, and the three stored
// Grades coverage rows that count their material's makers are recounted: 3D4Makers stays a maker of PEEK, PEKK
// and PEI for its own grades beside these, and LEHVOSS joins.
//
//   node scripts/migrate/m108-luvocom-is-lehvoss.mjs

import { openTables } from '../data/table-io.mjs';

const GRADES = ['G097-04', 'G098-04', 'G099-05', 'G073-05', 'G048-03'];
const COVERAGE = [
  { id: 'C01292', count: ['5', '6'], finding: [
    '5 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, Ensinger, SUNLU, iSANMATE. Recounted 2026-09-20 (m90-batch-b19) after the grades this batch added.',
    '6 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, Ensinger, LEHVOSS, SUNLU, iSANMATE. Recounted 2026-09-21 (m108) after LUVOCOM 3F PEEK 9581 was given to LEHVOSS, whose sheet it is (R096).'] },
  { id: 'C01295', count: ['3', '4'], finding: [
    '3 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, Ensinger. Recounted 2026-09-20 (m90-batch-b19) after the grades this batch added.',
    '4 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, Ensinger, LEHVOSS. Recounted 2026-09-21 (m108) after LUVOCOM 3F PEKK 50082 was given to LEHVOSS, whose sheet it is (R096).'] },
  { id: 'C01301', count: ['5', '6'], finding: [
    '5 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, Prusa Research, Stratasys, iSANMATE. Recounted 2026-09-21 (m96-batch-b24) after the grades this batch added.',
    '6 distinct manufacturer(s) documented against target 3: 3D4Makers, 3DXTECH, LEHVOSS, Prusa Research, Stratasys, iSANMATE. Recounted 2026-09-21 (m108) after LUVOCOM 3F PEI 50236 GY was given to LEHVOSS, whose sheet it is (R096).'] },
];

const t = openTables();
let changed = 0;
for (const id of GRADES) {
  const g = t.get('grades', id);
  if (g.Manufacturer === 'LEHVOSS') continue;
  if (!/LUVOCOM/i.test(g['Product name'])) throw new Error(`m108: ${id} is "${g['Product name']}", not a LUVOCOM grade`);
  t.set('grades', id, 'Manufacturer', 'LEHVOSS', { expect: '3D4Makers' });
  changed++;
}
for (const c of COVERAGE) {
  const row = t.get('coverage', c.id);
  if (row['Manufacturer count'] === c.count[1] && row.Finding === c.finding[1]) continue;
  t.set('coverage', c.id, 'Manufacturer count', c.count[1], { expect: c.count[0] });
  t.set('coverage', c.id, 'Finding', c.finding[1], { expect: c.finding[0] });
  changed++;
}
if (changed) t.save();
console.log(`m108: ${changed} record(s) changed`);
