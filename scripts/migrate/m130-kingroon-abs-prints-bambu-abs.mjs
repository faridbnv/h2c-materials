#!/usr/bin/env node
// Migration m130 (2026-09-21): Kingroon's ABS sheet prints Bambu Lab's ABS table (R053).
//
// Once m129 recorded the annealing both sheets state ("All KINGROON ABS test specimens were annealed and dried at
// 80 °C for 12 hours prior to testing", Bambu's "... at 80 °C for 12 h before testing"), MEAS-CROSS-SOURCE-TWIN
// could compare them: Kingroon's ABS Technical Data Sheet V1.0 prints Bambu Lab's ABS table value for value, all 18
// of them, through the Charpy impacts in both directions. The two products are one material (ABS, M027), so this
// is R053, not R166: Kingroon's grade keeps its own sheet and shares the formulation key of the sheet that carries
// the values, and its 18 rows are retired as duplicates naming the twin that stays, so each number counts once.
//
//   node scripts/migrate/m130-kingroon-abs-prints-bambu-abs.mjs

import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const migration = 'm130-kingroon-abs-prints-bambu-abs';
const date = '2026-09-21';
const COPY = 'R-3DJAKE-KINGROON-ABS-Technical-Data-Sheet-V1-0';
const ORIGINAL = 'B-abs-filament-TDS';
const t = openTables();
let changed = 0;

const grade = t.get('grades', 'G027-47');
if (grade['Shared formulation key'] !== ORIGINAL) {
  t.set('grades', 'G027-47', 'Shared formulation key', ORIGINAL, { expect: COPY });
  changed++;
}
const theirs = t.rows('measurements').filter((m) => m.SourceID === ORIGINAL && /^Published value/.test(m['Data status']));
const same = (a, b) => ['Property', 'Normalized value', 'Normalized unit', 'Direction', 'Test load MPa'].every((k) => a[k] === b[k]);
for (const m of t.rows('measurements').filter((x) => x.SourceID === COPY)) {
  if (m['Data status'] === 'Retired duplicate record') continue;
  const twins = theirs.filter((b) => same(m, b));
  if (twins.length !== 1) throw new Error(`${migration}: ${m.MeasurementID} (${m.Property} ${m['Normalized value']}) has ${twins.length} twins on ${ORIGINAL}`);
  t.set('measurements', m.MeasurementID, 'Data status', 'Retired duplicate record', { expect: m['Data status'] });
  t.set('measurements', m.MeasurementID, 'Notes', withNote(m.Notes, `Retired ${date} (${migration}, R053): Kingroon's ABS sheet prints Bambu Lab's ABS table value for value; the twin that stays is ${twins[0].MeasurementID} (${ORIGINAL}), and grade G027-47 shares its formulation key.`), { expect: m.Notes });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} record(s) changed`);
