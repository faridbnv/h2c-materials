#!/usr/bin/env node
// Migration m378 (2026-10-05): three statements read for rows they do not speak for, swept over every row of their
// pattern (check round 3, D131; each row read on its page image by a Claude Sonnet reader,
// docs/audits/2026-10-05-check-round-3/sweep/verdicts.csv, and decided by Claude Opus).
//
// The round's readers found each pattern on one or two rows; the sweep read every other row of it on its own page.
// - Polymaker's and Fiberon's sheets print "*All specimens were annealed at 120°C for 10h." under their mechanical
//   table, and the import put it on the rows of the thermal table too. The readers judged it by where it stands, and
//   found it under the mechanical table on 28 thermal rows. Its words say "All specimens", and a heat deflection or Vicat
//   value is measured on a specimen bar: on Fiberon PPS-CF10 the 252.5 °C heat deflection stands 155 °C above the
//   sheet's own glass transition, which only a crystallised (annealed) bar reaches. So the 24 heat-deflection and Vicat
//   rows keep the footnote, and a value measured annealed stands for the annealed product (D99); the 4 rows measured on
//   no bar (density, and DSC's glass transition, melting and crystallisation) now state no treatment. A row the sheet
//   itself prints "(annealed)" keeps it (14).
// - SUNLU's ISO sheets print "[1] Test specimens were printed at ..." for the mechanical tests; the density line names no
//   specimen. 33 densities typed "Printed specimen" now say the sheet does not establish the specimen.
// - Stratasys's sheets print heat deflection in a "Physical Properties - Printed" table with XY and XZ (or ZX, or "XZ/ZX")
//   columns: 22 values now carry their column (an "XZ/ZX" column is "Stated, not a usable direction"), and 6 the printed
//   specimen. A value printed once across both columns, or in a single-column table, keeps none (21).
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m378-what-a-statement-reaches.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';
import { readCsv } from '../../build/src/csv.js';

const MIGRATION = 'm378';
const DATE = '2026-10-05';
const WHY = {
  'footnote-scope': 'the annealing footnote sits under the mechanical table, not this row\'s table',
  'density-specimen': 'the sheet\'s printed-specimen note speaks for the mechanical tests; the density line names no specimen',
  'stratasys-direction': 'the value sits in an orientation column of the sheet\'s printed-properties table',
};
const t = openTables();
// A footnote on "All specimens" speaks for every bar the sheet tested, wherever it stands; a DSC or density reading is
// not taken on a bar.
const ON_A_BAR = /^(?:HDT|Vicat softening temperature)$/;
const verdicts = readCsv(new URL('../../docs/audits/2026-10-05-check-round-3/sweep/verdicts.csv', import.meta.url).pathname).records.map((r) => r.values)
  .filter((v) => v.decision === 'fix' && !(v.family === 'footnote-scope' && ON_A_BAR.test(t.get('measurements', v.record).Property)));
const checked = new Set();
let cells = 0;
const rows = new Set();

for (const v of verdicts) {
  const m = t.get('measurements', v.record);
  if (m[v.column] === v.value) continue;
  for (const q of v.quote.split(' | ').map((x) => x.trim()).filter(Boolean)) {
    const key = `${m.SourceID}\u0000${q}`;
    if (!checked.has(key)) { onCachedSheet(t, m.SourceID, q, MIGRATION); checked.add(key); }
  }
  t.set('measurements', v.record, v.column, v.value, { expect: v.expect, migration: MIGRATION });
  cells++;
  rows.add(v.record);
}
for (const id of rows) {
  const m = t.get('measurements', id);
  const family = verdicts.find((v) => v.record === id).family;
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Corrected ${DATE} (${MIGRATION}) on the page image: ${WHY[family]}.`), { expect: m.Notes, migration: MIGRATION });
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) on ${rows.size} value(s) read again for what their sheet's statement reaches`);
