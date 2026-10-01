#!/usr/bin/env node
// Migration m281 (2026-10-01): products of one material whose sheets print one table share one formulation key (R053).
//
// GRADE-VALUES-TWIN found pairs of active grades of one material sharing at least 80 % of at least five published
// values with no key between them: a maker printing one table under two names (EASY and R PET-G), one product's two
// sheet revisions or languages, a reseller's or rebrander's reprint of the maker's table. The estimate model counted
// each such table once per grade (it reads observations by key, D12), and the products could not read each other's
// values where their own sheet is silent (D89). An agent read the two sheets of each pair from the cache
// (data audit 2026-10-01, RC5; the verdicts are in m281-twin-keys.csv); pairs linked through a shared product form one
// cluster and take one key, the key of the sheet the readers named as the original most often. Pairs across two
// materials keep their keys (R166: a key never spans materials), and the pairs the readers found distinct are accepted
// with that reason in data/review/accepted-findings.csv. The one pair a reader could not tell (Fiberlogy ABS and R ABS)
// and the three tough PLAs no reader saw (they twinned once MatterHackers' misprinted modulus was flagged in m280) are
// decided from the values, by Claude Opus.
//
// A grade that already shared its old key with a twin of its own (R053) carries that twin along. Polymaker's PolyMax
// PC FR (G035-08) was filed under unfilled PC, beside its own other sheet revision under PC FR (G036-02): it moves to PC
// FR first (moveGrade, D86), where it is that product's twin, and a flame-retardant product no longer answers for PC.
//
//   node scripts/migrate/m281-twin-keys.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { moveGrade } from '../data/records.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm281';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const grades = t.rows('grades');
let n = 0;
moveGrade(t, 'G035-08', 'M036', { migration: MIGRATION });
for (const d of rowsOf(join(here, `${MIGRATION}-twin-keys.csv`))) {
  const g = t.get('grades', d.grade);
  if (g['Shared formulation key'] === d.key) continue;
  if (g['Shared formulation key'] !== d.expect) throw new Error(`${MIGRATION}: ${d.grade} key is "${g['Shared formulation key']}", expected "${d.expect}"; the data moved`);
  const along = grades.filter((x) => x.GradeID !== d.grade && x.MaterialID === g.MaterialID && x.Status === 'active' && x['Shared formulation key'] === d.expect);
  for (const x of [g, ...along]) {
    t.set('grades', x.GradeID, 'Shared formulation key', d.key, { expect: d.expect, migration: MIGRATION });
    n++;
  }
}
t.save();
console.log(`${MIGRATION}: ${n} grades now share their twin's formulation key`);
