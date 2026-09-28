#!/usr/bin/env node
// Migration m213 (2026-09-28): a coverage finding names the product it is about (D98; version 2.1, F01).
//
// "Exclude unresolved conflicts" read a material's coverage rows, so C01409, a question about one iSANMATE sheet's
// filler, held out Polymaker's, eSUN's and Nobufil's PLA-GF with it (the review of 2026-09-27, D01). Each finding
// already names what it is about, in its own words: the measurements, the listing or the product. This adds the
// column that says it in a form the engine reads, GradeID, and fills it for the seven Conflict and Quarantined rows
// that are about one product, from the records each Finding names (resolved here, and checked to be printed in the
// Finding). C01411 is about which resin colorFabb's nGen is, the material's identity, and stays the material's. Every
// other row is the material's (Not applicable), as it was read.
//
// The reviewer is an AI agent (claude-opus-5.5). A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m213-a-conflict-names-its-product.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm213-a-conflict-names-its-product';
const NA = 'Not applicable';
// Coverage row, the records its Finding names (a measurement, a listing) or the product it names, and the grade.
const SCOPED = [
  ['C01106', ['V001540'], null, 'G088-02'],
  ['C01108', ['V000343'], null, 'G018-01'],
  ['C01110', ['CA0069'], null, 'G027-01'],
  ['C01409', [], 'iSANMATE PLA Glass Fiber', 'G019-02'],
  ['C01412', ['V007105', 'V007109'], null, 'G008-12'],
  ['C01413', ['V004124', 'V004123'], null, 'G039-14'],
  ['C01414', ['V009742', 'V009738'], null, 'G148-02'],
];

const t = openTables();
if (!t.header('coverage').includes('GradeID')) t.addColumn('coverage', 'GradeID', { after: 'MaterialID', fill: () => NA });
let n = 0;
for (const [id, records, product, gradeId] of SCOPED) {
  const row = t.get('coverage', id);
  if (!['Conflict', 'Quarantined'].includes(row.Status)) throw new Error(`${migration}: ${id} is ${row.Status}, not a conflict or a quarantine`);
  const grade = t.get('grades', gradeId);
  if (grade.MaterialID !== row.MaterialID) throw new Error(`${migration}: ${gradeId} is a product of ${grade.MaterialID}, not of ${row.MaterialID}`);
  for (const r of records) {
    if (!row.Finding.includes(r)) throw new Error(`${migration}: ${id}'s Finding does not name ${r}`);
    const record = r.startsWith('CA') ? t.get('prices', r) : t.get('measurements', r);
    if (record.GradeID !== gradeId) throw new Error(`${migration}: ${r} is ${record.GradeID}'s, not ${gradeId}'s`);
  }
  if (product) {
    if (!row.Finding.includes(product.split(' ')[0])) throw new Error(`${migration}: ${id}'s Finding does not name ${product}`);
    if (`${grade.Manufacturer} ${grade['Product name']}` !== product) throw new Error(`${migration}: ${gradeId} is ${grade.Manufacturer} ${grade['Product name']}, not ${product}`);
  }
  if (row.GradeID === gradeId) continue;
  t.set('coverage', id, 'GradeID', gradeId, { expect: NA });
  n++;
}
t.save();
console.log(`${migration}: ${n} finding(s) scoped to their product`);
