#!/usr/bin/env node
// Migration m160 (2026-09-25): a hardness whose scale the sheet does not publish is judged against both Shore scales,
// not flagged for being what its unit already says (re-center phase 5, part 4).
//
// W0079 flagged every Hardness recorded in "Shore (scale not specified by source)", whatever its number: "the missing
// scale is the finding". The unit is that finding. It is the state the reader writes where a sheet's unit column names
// both durometer scales ("HA/HD", ISO 868) and the number carries neither (scripts/ingest/propose.mjs), and it is what
// the thirty-one rows holding it say. Each of the thirty-one was re-read, found to print exactly that, and accepted
// with one of three wordings of one sentence: the scale is the sheet's gap, and the unit records it. Nothing reads such
// a row to decide: the estimate model takes an elastomer's stiffness from Shore A and Shore D only
// (build/src/estimate/observations.js), and hardness is no headline.
//
// What a window can still say about a number with no scale is whether it could be a Shore reading at all. So W0079
// becomes the union of the two windows it could belong to: impossible only where it is impossible on the A scale
// (W0075, 20 to 100) and on the D scale (W0076, 10 to 95), surprising only where it would surprise on both (below 25 D,
// above 98 A). A temperature read as a hardness ("ISO 868 23℃" read as 23) is still surprising. Nothing is widened
// beyond the two windows it is drawn from, and the thirty-one acceptances leave data/review/accepted-findings.csv
// because they no longer occur.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m160-a-hardness-whose-scale-is-not-published.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm160-a-hardness-whose-scale-is-not-published';
const t = openTables();

const BEFORE = {
  'Hard low': 'Not applicable', 'Soft low': 'Not applicable', 'Soft high': 'Not applicable', 'Hard high': 'Not applicable', 'Always flag': 'TRUE',
  Basis: 'The missing scale is the finding: a hardness with no scale cannot be compared with anything, whatever its number.',
};
const AFTER = {
  'Hard low': '10', 'Soft low': '25', 'Soft high': '98', 'Hard high': '100', 'Always flag': 'FALSE',
  Basis: 'The union of the two scales the number could be on, because the sheet does not say which: impossible only where it is impossible on the A scale (W0075) and on the D scale (W0076), surprising only where it would surprise on both. The unit already records that the scale is missing, and nothing reads a hardness without its scale (the estimate model takes Shore A and Shore D only), so the missing scale is not a finding of its own (m160).',
};
// The two windows the union is drawn from, as they stood when it was drawn.
const FROM = { W0075: ['Shore A', '20', '45', '98', '100'], W0076: ['Shore D', '10', '25', '88', '95'] };

for (const [id, [unit, ...bounds]] of Object.entries(FROM)) {
  const w = t.get('plausibility_windows', id);
  const now = [w['Normalized unit'], w['Hard low'], w['Soft low'], w['Soft high'], w['Hard high']];
  if (now.join('|') !== [unit, ...bounds].join('|')) throw new Error(`${migration}: ${id} is ${now.join(', ')}, not the window W0079 is drawn from; the data moved`);
}

const w = t.get('plausibility_windows', 'W0079');
if (w.Property !== 'Hardness' || w['Normalized unit'] !== 'Shore (scale not specified by source)') throw new Error(`${migration}: W0079 is not the unspecified-scale hardness window`);
let changed = 0;
for (const [field, to] of Object.entries(AFTER)) {
  if (w[field] === to) continue;
  t.set('plausibility_windows', 'W0079', field, to, { expect: BEFORE[field] });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed ? `W0079 is the union of W0075 and W0076 (${changed} field(s))` : 'already applied'}`);
