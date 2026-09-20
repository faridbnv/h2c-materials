#!/usr/bin/env node
// Migration m74 (2026-09-19): two print-setting cells that hold a sentence.
//
// A setting is a cell in a table. Two sheets state theirs in prose, and the reader took the words after the
// setting's own name: Eryone's ABS-GF enclosure reads "s, and structural components. Note: The glass fiber
// content is 10%." and colorFabb's nGen FLEX nozzle "and build-plate is not too close, the first layer cannot be
// squeezed too much." Neither says what the setting is, and the build says so every time it reads them
// (PARSE-UNREAD). They become Not published, with the reason in Parse review, and the rest of each row — the
// numbers its table does print — stays.
//
//   node scripts/migrate/m74-two-profile-cells-are-prose.mjs

import { openTables } from '../data/table-io.mjs';

const WRONG = [
  ['P0453', 'Enclosure', 's, and structural components. Note: The glass fiber content is 10%.',
    "Eryone's sheet describes its material in a sentence beside its printing table, and the reader took the words after the enclosure's own name. The sheet states no enclosure."],
  ['P0513', 'Nozzle °C', 'and build-plate is not too close, the first layer cannot be squeezed too much.',
    "colorFabb states some settings in prose (\"210 °C nozzle temperature, and 55 °C bed temperature\"), and this row took the advice that follows the nozzle's name. The sheet's own printing table is the row beside this one."],
];

const t = openTables();
let n = 0;
for (const [id, field, was, why] of WRONG) {
  const row = t.rows('profiles').find((p) => p.ProfileID === id);
  if (!row || row[field] !== was) continue;
  t.set('profiles', id, field, 'Not published', { expect: was });
  const review = row['Parse review'];
  t.set('profiles', id, 'Parse review', review === 'Not applicable' ? why : `${review}; ${why}`, { expect: review });
  n += 2;
}
if (n) t.save();
console.log(`${n} cell(s) written`);
