#!/usr/bin/env node
// Migration m448 (2026-10-18): elongation at break is floored by printed bars only (the screening build's stage 4, the
// screening review's change C26, D161; it amends the owner's D126 choice, approved with the review on 2026-10-18).
//
// D126 let a bar whose sheet states no specimen bound an estimate from below, as a printed bar does. For elongation that
// held estimates too high: 568 of the 761 floors under grade elongation estimates came from such a bar, 413 of them an
// elongation at break, and 429 grade estimates sat at their floor. An undescribed bar's stretch reads like a moulded
// one's, which stretches far further than a printed part. The floor back-test (build/src/estimate/floors.js) held the
// hidden value 67.4 / 82.6 % (likely / plausible) with the old rule on a product's own measurements and 76.7 / 91.9 %
// with printed bars only.
//
//   headline_definitions.csv  a new column, Lower bound specimens: printed for elongationXY, printed or not stated for
//                             every other headline with a lower bound (density, stiffness and strength keep D126's rule;
//                             strength's printed-only rule held 78.8 / 93.9 % against 77.3 / 90.9 %, and stays the
//                             owner's to extend), Not applicable where there is no lower bound.
//   conversions.csv           CV10 and CV11, the ledger's floors from the strain at yield and at strength (reported),
//                             read printed bars only, as the headline's lower bound now does (LEDGER-LB-DRIFT).
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m448-elongation-floored-by-printed-bars.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm448';
const NA = 'Not applicable';
const COLUMN = 'Lower bound specimens';
const t = openTables();
let changed = 0;
if (!t.header('headline_definitions').includes(COLUMN)) {
  t.addColumn('headline_definitions', COLUMN, { after: 'Lower bound excludes', fill: (r) => (r['Lower bound properties'] === NA ? NA : r.HeadlineKey === 'elongationXY' ? 'printed' : 'printed or not stated') });
  changed++;
}
if (t.get('headline_definitions', 'elongationXY')[COLUMN] !== 'printed') throw new Error(`${MIGRATION}: elongationXY's ${COLUMN} moved`);
for (const id of ['CV10', 'CV11']) {
  if (t.get('conversions', id)['Source specimen'] === 'printed') continue;
  t.set('conversions', id, 'Source specimen', 'printed', { expect: 'as target', migration: MIGRATION });
  changed++;
}
t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
