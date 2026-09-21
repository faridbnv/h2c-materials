#!/usr/bin/env node
// Migration m114 (2026-09-21): what stands between a unit column and its value.
//
// Yousu prints its melt-flow rows unit first, then the test condition, then the value:
//
//   Melt Flow Rate ASTM D1238 g/10min 210℃, 2.16Kg 7
//
// The reader took a condition there only when it was written hard against its unit and followed by a space, and
// Yousu ends it with a comma. So the first number after the unit was the value, and five melt-flow rates entered
// as their test temperatures: 210, 190, 230, 190 and 190 g/10 min, where the sheets print 7, 5.6, 12 to 15, 6 and
// 2.9. The reader now reads the condition (propose.mjs, CONDITION_UNIT, with a fixture); each row below is its line
// re-read from the cached, hash-checked source, and the census over every transcribed sheet moved these five rows
// and nothing else.
//
// The same rows, and ten more of Extrudr's, Anycubic's and Yousu's, recorded "10min" at the head of their method:
// the tail of the unit "g/10min", which an earlier reader left in the method column. The method is the standard
// the sheet names, and the current reader writes exactly that.
//
//   node scripts/migrate/m114-what-a-unit-column-carries.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm114-what-a-unit-column-carries';
const date = '2026-09-21';
const t = openTables();
let changed = 0;

// 1. A melt-flow rate that was its test temperature.
const MFR = [
  ['V006570', 'R-YOUSU-YOUSUPLATDS-081b', '210', '7', null, '210°C', '10min ASTM D1238', '210℃ 2.16Kg ASTM D1238', 'ASTM D1238 g/10min', '210℃, 2.16Kg'],
  ['V006968', 'R-YOUSU-YOUSUWOODTDS-eb4e', '190', '5.6', null, '190°C', '10min ASTM D1238', '190 ℃ 2.16Kg ASTM D1238', 'ASTM D1238 g/10min', '190 ℃, 2.16Kg'],
  ['V007024', 'R-YOUSU-YOUSU3DPPTDS-4872', '230', '12', '15', '230°C', '10min GB/T 3682-2000', '230℃ 2.16Kg GB/T 3682-2000', 'GB/T 3682-2000 g/10min', '230℃, 2.16Kg'],
  ['V007260', 'R-YOUSU-YOUSUSILKPLATDS-81c3', '190', '6', null, '190°C', '10min D1238', '190℃ 2.16Kg D1238', 'D1238 g/10min', '190℃, 2.16Kg'],
  ['V007382', 'R-YOUSU-YOUSUPVATDS-6752', '190', '2.9', null, '190°C', '10min GB/T 3682-2000', '190℃ 2.16Kg GB/T 3682-2000', 'GB/T 3682-2000 g/10min', '190℃, 2.16Kg'],
];
for (const [id, source, was, value, upper, temperature, method, printed, head, condition] of MFR) {
  const raw = upper ? `${value}-${upper} g/10min` : `${value} g/10min`;
  const set = {
    'Raw value': [`${was} g/10min`, raw],
    'Raw numeric': [was, value],
    'Normalized value': [was, value],
    'Test temperature': ['Not published', temperature],
    'Standard / load': [method, printed],
    Locator: [`p. 1: Melt Flow Rate ${head}`, `p. 1: Melt Flow Rate ${head} ${condition}`],
  };
  if (upper) Object.assign(set, { 'Raw upper bound': ['Not applicable', upper], 'Normalized upper bound': ['Not applicable', upper] });
  changed += correct(t, { source, ids: [id], migration, date, set,
    note: `the line prints "Melt Flow Rate ${head} ${condition} ${upper ? `${value}~${upper}` : value}": the unit, the test condition, then the value. ${was} g/10 min was the test temperature.` });
}

// 2. A method that began with the unit's "10min".
const METHOD = [
  ['V007081', 'R-YOUSU-YOUSUABSTDS-cc2f', 'GB/T 3682-2000'],
  ['V008610', 'R-EXTRUDR-pla-basic-cf-TDS-de-3', 'ASTM D1238'],
  ['V004183', 'R-EXTRUDR-petg-bundle-TDS-en', 'ISO 1133'],
  ['V006444', 'R-EXTRUDR-petg-TDS-en', 'ISO 1133'],
  ['V004253', 'R-EXTRUDR-pla-nx2-matt-TDS-en', 'ISO 1133'],
  ['V006174', 'R-EXTRUDR-pla-nx2-matt-TDS-it', 'ISO 1133'],
  ['V004262', 'R-EXTRUDR-pla-basic-TDS-en', 'ASTM D1238'],
  ['V006416', 'R-EXTRUDR-pla-basic-cmyk-TDS-en', 'ASTM D1238'],
  ['V008565', 'R-EXTRUDR-pla-nx2-TDS-en', 'ISO 1133'],
  ['V008812', 'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA', 'ISO 1133'],
];
for (const [id, source, standard] of METHOD) {
  changed += correct(t, { source, ids: [id], migration, date,
    set: { 'Standard / load': [`10min ${standard}`, standard] },
    note: `the method is the standard the sheet names, ${standard}; "10min" was the tail of the unit g/10min.` });
}

if (changed) t.save();
console.log(`${migration}: ${changed} row(s) corrected`);
