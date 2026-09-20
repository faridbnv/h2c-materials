#!/usr/bin/env node
// Migration m80 (2026-09-20): a second revision of one product, read as a second product.
//
// b11 registered Polymaker's Fiberon PET-GF15 sheet v2.0 as a new grade, G068-03, beside the v1.0 the database
// already held as G068-02. It was not caught at the gate because the reader had named the product after the
// first line of the sheet's description ("PET-GF15 is the bridge of the gap between every"); m78 gave it the
// name its maker gives it, and the duplicate became visible at once (GRADE-PRODUCT-DUPLICATE).
//
// A revision of a registered product is a new source whose rows go on the same grade, and only for the values
// that differ or are new. Of the 22 rows the v2.0 sheet gives, 20 are the v1.0 values again and two are its
// own: a surface resistivity of >10^12 Ohm and a decomposition temperature of 422.8 degrees C, neither of which
// the earlier sheet prints. Those two move to G068-02. The 20 that repeat are retired, each naming its twin,
// and the grade goes with them.
//
// The v2.0 source stays cited: it is what the two moved rows were read from, and the sheet is a real document.
//
//   node scripts/migrate/m80-fiberon-pet-gf15-revision.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const DATE = '2026-09-20';
const MOVE = ['V006217', 'V006220'];
const RETIRE = [
  ['V006215', 'V001925'], ['V006216', 'V001926'], ['V006218', 'V001927'], ['V006219', 'V001928'],
  ['V006221', 'V001929'], ['V006222', 'V001932'], ['V006223', 'V001933'], ['V006224', 'V001934'],
  ['V006225', 'V001935'], ['V006226', 'V001936'], ['V006227', 'V001937'], ['V006228', 'V001938'],
  ['V006229', 'V001939'], ['V006230', 'V001940'], ['V006231', 'V001941'], ['V006232', 'V001942'],
  ['V006233', 'V001943'], ['V006234', 'V001944'], ['V006235', 'V001945'], ['V006236', 'V001946'],
];

let n = 0;
for (const id of MOVE) {
  const row = t.rows('measurements').find((r) => r.MeasurementID === id);
  if (!row || row.GradeID !== 'G068-03') continue;
  t.set('measurements', id, 'GradeID', 'G068-02', { expect: 'G068-03' });
  t.set('measurements', id, 'Notes', `${row.Notes} Moved ${DATE} (m80) to G068-02: the v2.0 sheet is a revision of the product that grade already holds, and this is a value its v1.0 does not print.`, { expect: row.Notes });
  n += 2;
}
for (const [id, twin] of RETIRE) {
  const row = t.rows('measurements').find((r) => r.MeasurementID === id);
  if (!row || row['Data status'] !== 'Published value') continue;
  t.set('measurements', id, 'Data status', 'Retired duplicate record', { expect: 'Published value' });
  t.set('measurements', id, 'Notes', `${row.Notes} Retired ${DATE} (m80): the v2.0 sheet republishes this value unchanged and ${twin} on G068-02 is the record that stays.`, { expect: row.Notes });
  n += 2;
}
// The source names the grades its rows are on, and two of them are now G068-02's (AUDIT-SOURCE-SCOPE).
const source = t.rows('sources').find((r) => r.SourceID === 'R-POLYMAKER-FIBERON-TDS-FIBERON-PET-GF15-v2-0-2026-02-02');
if (source && source['Applicable grades'] === 'G068-03') {
  t.set('sources', source.SourceID, 'Applicable grades', 'G068-02; G068-03', { expect: 'G068-03' });
  n += 1;
}

const grade = t.rows('grades').find((g) => g.GradeID === 'G068-03');
if (grade && grade.Status === 'active') {
  t.set('grades', 'G068-03', 'Status', 'retired', { expect: 'active' });
  t.set('grades', 'G068-03', 'Availability', 'Retired mapping; audit trail only', { expect: grade.Availability });
  n += 2;
}

if (n) t.save();
console.log(`${n} cell(s) written`);
