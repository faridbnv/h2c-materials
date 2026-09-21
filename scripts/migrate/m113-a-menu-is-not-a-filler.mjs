#!/usr/bin/env node
// Migration m113 (2026-09-21): four unfilled TPUs that a page's menu filed as carbon-fibre TPU.
//
// Siraya Tech's product pages carry the maker's whole range in their navigation — "Flex Family TPU-GF TPU 85A …",
// "Fibreheart Family PET-CF PET-GF PETG-CF Pro PPA PPA-CF …" — and the reader, reading the page's words for a
// filler, took the carbon fibre of the menu for the product's own. Flex TPU 95A, 85A, 64D and Air are unfilled
// TPUs, and they were applied under TPU-CF (M129), where their 18 values have been pulling a carbon-fibre family's
// estimates toward an unfilled elastomer's. The reader now treats a family menu line as the page's furniture
// (propose.mjs, A_RANGE_MENU), and an identity census over all 1,655 cached documents moved these four, two held
// Roamr TPU sheets, three held Rebound PEBA sheets and nothing else.
//
// The four are re-filed under TPU (M039) the way m25 re-filed HyperLite PP: nothing is deleted, the old grades and
// their measurements are retired as duplicates naming their twins, and no headline rested on any of them.
//
//   node scripts/migrate/m113-a-menu-is-not-a-filler.mjs

import { openTables } from '../data/table-io.mjs';
import { refileGrade, recountGrades } from '../data/records.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm113';
const WHY = "Siraya Tech's Flex TPU is an unfilled TPU; it was filed as carbon-fibre TPU from the range menu its product page carries (\"Flex Family TPU-GF …\").";
const t = openTables();
const moved = [];
for (const grade of ['G129-03', 'G129-04', 'G129-05', 'G129-06']) {
  const to = refileGrade(t, grade, 'M039', { migration: MIGRATION, date: DATE, why: WHY });
  if (to) moved.push(`${grade} -> ${to}`);
}
// TPU gains Siraya Tech as a maker and TPU-CF loses it: each stored Grades row that no longer counts true is
// superseded by one that does.
const recounted = ['M039', 'M129'].map((m) => recountGrades(t, m, { migration: MIGRATION, date: DATE, because: 'after Siraya Tech\u2019s Flex TPU grades were re-filed from TPU-CF to TPU' })).filter(Boolean);
if (moved.length || recounted.length) t.save();
console.log(`m113: ${moved.length ? moved.join(', ') : 'no grade to re-file'}; coverage recounted: ${recounted.join(', ') || 'none'}`);
