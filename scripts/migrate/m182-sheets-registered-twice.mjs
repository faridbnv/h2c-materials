#!/usr/bin/env node
// Migration m182 (2026-09-26): ten sheets registered beside the maker's own copy of the same table, found when m180 gave
// their rows the conditions their makers state.
//
// MEAS-CROSS-SOURCE-TWIN pairs sources whose values repeat under the same conditions (property, value, unit,
// direction, load, moisture and post-processing), counting only values ten or fewer sources share. Two changes in
// m180 brought ten pairs under it, and in each the two sheets print one table:
//
//   - m180 wrote the Extrudr rows it made moulded with no build direction, as m63 wrote the rows of Extrudr's own
//     sheets in batch b07; the rows of 3DJake's copies (3d.nice-cdn.com) and of the German and Italian editions,
//     until then "Unstated", now match their twins on Extrudr's English sheets.
//   - m180 gave QIDI PETG Rapido's 70 °C and PETG CF's 77 °C their load, which took each out of a tuple ("HDT, 70 °C,
//     load not stated") that eleven sources shared, and 3DJake's copies of Spectrum's THE FILAMENT PETG and PETG CF
//     sheets, every value the same as Spectrum's own, came under the threshold.
//
// One table registered twice is one document (lint recipe, AGENTS.md "Retire a duplicate record"): the maker's own
// English sheet stays, and each copy's row that repeats a row of it is retired naming its twin. A row the copy prints
// and the maker's sheet does not stays where it is. A copy none of whose rows stands is kept as corroboration.
//
// Each twin is checked before anything is written: the same grade, property, value, unit, operator, direction, load,
// moisture and post-processing, and the same Data status. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m182-sheets-registered-twice.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm182-sheets-registered-twice';
const date = '2026-09-26';
const t = openTables();

// [the copy, the maker's own sheet that stays, what the copy is]
const PAIRS = [
  ['S-SPECTRUM-EN-TDS-The-Filament-PETG', 'S-SPECTRUM-eng-tds-the-filament-petg', "3DJake's copy of Spectrum's sheet"],
  ['S-SPECTRUM-ENG-TDS-The-Filament-PETG-CF', 'S-SPECTRUM-eng-tds-the-filament-petg-cf', "3DJake's copy of Spectrum's sheet"],
  ['R-EXTRUDR-flex-hard-cf-TDS-en-7bbe64', 'R-EXTRUDR-flex-hard-cf-TDS-en', "3DJake's copy of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-asa-cf-TDS-en-533984', 'R-EXTRUDR-durapro-asa-cf-TDS-en', "3DJake's copy of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-pa12-cf-TDS-en-11cea4', 'R-EXTRUDR-durapro-pa12-cf-TDS-en', "3DJake's copy of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-pc-pbt-cf-TDS-en-3a6807', 'R-EXTRUDR-durapro-pc-pbt-cf-TDS-en', "3DJake's copy of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-pc-pbt-cf-TDS-it', 'R-EXTRUDR-durapro-pc-pbt-cf-TDS-en', "the Italian edition of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-pc-pbt-TDS-de', 'R-EXTRUDR-durapro-pc-pbt-TDS-en', "the German edition of Extrudr's sheet"],
  ['R-EXTRUDR-durapro-pc-fr-v0-TDS-de', 'R-EXTRUDR-durapro-pc-fr-v0-TDS-en', "the German edition of Extrudr's sheet"],
];
const RETIRED = 'Retired duplicate record';
const FIELDS = ['GradeID', 'Property', 'Normalized value', 'Normalized unit', 'Operator', 'Direction', 'Test load MPa', 'Moisture state', 'Post-processing state', 'Data status'];
const key = (m) => FIELDS.map((f) => m[f]).join('\u0000');

let n = 0;
const tally = [];
for (const [copy, own, what] of PAIRS) {
  if (!t.find('sources', copy) || !t.find('sources', own)) throw new Error(`${migration}: ${copy} or ${own} is not a source`);
  const ownRows = new Map();
  for (const m of t.rows('measurements').filter((x) => x.SourceID === own && x['Data status'] !== RETIRED)) if (!ownRows.has(key(m))) ownRows.set(key(m), m);
  const copyRows = t.rows('measurements').filter((m) => m.SourceID === copy);
  let retired = 0;
  for (const m of copyRows) {
    if (m['Data status'] === RETIRED) continue;
    const twin = ownRows.get(key(m));
    if (!twin) continue;
    t.set('measurements', m.MeasurementID, 'Data status', RETIRED, { expect: m['Data status'] });
    t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Retired ${date} (${migration}): ${copy} is ${what} ${own}, which prints the same table; ${twin.MeasurementID} is the record that stays.`, { expect: m.Notes });
    retired++;
    n++;
  }
  const s = t.get('sources', copy);
  const standing = copyRows.filter((m) => t.get('measurements', m.MeasurementID)['Data status'] !== RETIRED).length;
  if (!standing && s['Citation role'] === 'cited') {
    t.set('sources', copy, 'Citation role', 'corroboration', { expect: 'cited' });
    t.set('sources', copy, 'Source note', `${what[0].toUpperCase()}${what.slice(1)} ${own}: the same table, so its rows are retired as duplicates (${migration}).`, { expect: s['Source note'] });
    n++;
  }
  tally.push(`  ${String(retired).padStart(3)} retired, ${standing} standing  ${copy}`);
}
if (n) t.save();
console.log(tally.join('\n'));
console.log(`${migration}: ${n} record(s) written`);
