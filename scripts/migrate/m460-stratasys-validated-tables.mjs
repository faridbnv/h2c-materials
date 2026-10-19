#!/usr/bin/env node
// Migration m460 (2026-10-19): Stratasys PC-ABS's and PC's "Validated Materials" tables, read on their page images (the
// clean-up round, OPEN-PROBLEMS §33.3).
//
// Each appendix page prints two colour-and-printer tables side by side in XZ and ZX: PC-ABS p. 8 Table 6 (Red, Fortus
// 450mc) and Table 7 (Red, F900); PC p. 11 Table 8 (Black, Fortus 450mc) and Table 9 (Red, Fortus 450mc). The held XZ
// elongations (PC-ABS 3.2 and 6.0 %, PC 5.3 and 6.4 %) are Table 6's and Table 8's, as their print parameters said; the
// other table's XZ elongations (3.3 and 9.8 %, 4.8 and 4.9 %), which a reader had taken for a disagreement, were never
// recorded. Each held row's Locator names its table now, and the other table's two XZ elongations are added beside
// their ZX siblings, with the standard deviation the page prints in brackets ("Values in parentheses are standard
// deviations"). Every quote is checked on the cached page; a re-run is a no-op.
//
//   node scripts/migrate/m460-stratasys-validated-tables.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from '../lib/read-proposals-apply.mjs';
import { addValue } from '../lib/source-edits.mjs';

const MIGRATION = 'm460';
const t = openTables();
const PCABS = 'R-STRATASYS-mds-fdm-pc-abs-0823a', PC = 'R-STRATASYS-mds-fdm-pc-0426a';
let located = 0, added = 0;

for (const [id, locator] of [
  ['V009347', 'p. 8: Elongation @ Break % (Table 6. Mechanical Properties of PC-ABS Red, Fortus 450mc, T16, XZ Orientation)'],
  ['V009434', 'p. 11: Elongation @ Yield % (Table 8: Mechanical Properties of PC Black, Fortus 450mc, T16, XZ Orientation)'],
  ['V009435', 'p. 11: Elongation @ Break % (Table 8: Mechanical Properties of PC Black, Fortus 450mc, T16, XZ Orientation)'],
]) {
  const m = t.get('measurements', id);
  if (m.Locator === locator) continue;
  t.set('measurements', id, 'Locator', locator, { expect: m.Locator, migration: MIGRATION });
  located++;
}

onCachedSheet(t, PCABS, 'Table 7. Mechanical Properties of PC-ABS Red, F900, T16', MIGRATION);
onCachedSheet(t, PC, 'Table 9: Mechanical Properties of PC Red, Fortus 450mc, T16', MIGRATION);
const ROWS = [
  { like: 'V014334', source: PCABS, property: 'Elongation at yield', raw: '3.3 (0.070)', value: '3.3', sd: '0.07', table: 'Table 7. Mechanical Properties of PC-ABS Red, F900, T16', label: 'Elongation @ Yield %', page: 8 },
  { like: 'V014334', source: PCABS, property: 'Elongation at break', raw: '9.8 (1.0)', value: '9.8', sd: '1', table: 'Table 7. Mechanical Properties of PC-ABS Red, F900, T16', label: 'Elongation @ Break %', page: 8 },
  { like: 'V014322', source: PC, property: 'Elongation at yield', raw: '4.8 (0.2)', value: '4.8', sd: '0.2', table: 'Table 9: Mechanical Properties of PC Red, Fortus 450mc, T16', label: 'Elongation @ Yield %', page: 11 },
  { like: 'V014322', source: PC, property: 'Elongation at break', raw: '4.9 (0.24)', value: '4.9', sd: '0.24', table: 'Table 9: Mechanical Properties of PC Red, Fortus 450mc, T16', label: 'Elongation @ Break %', page: 11 },
];
for (const r of ROWS) {
  onCachedSheet(t, r.source, r.raw, MIGRATION);
  const like = t.get('measurements', r.like);
  const id = addValue(t, {
    like: r.like, migration: MIGRATION, date: '2026-10-19', why: 'published in the source, never transcribed.',
    note: `Read on the page image: the ${r.table.split(/[.:]/)[0]}'s XZ column (OPEN-PROBLEMS §33.3).`,
    set: {
      Property: r.property, 'Raw value': r.raw, 'Raw numeric': r.value, 'Normalized value': r.value, 'Raw uncertainty ±': r.sd, 'Normalized uncertainty ±': r.sd,
      Direction: 'XZ', 'Standard / load': `ASTM D638; std dev=${r.raw.match(/\(([^)]+)\)/)[1]}`, Standards: 'ASTM D638',
      'Specimen / print parameters': like['Specimen / print parameters'], Locator: `p. ${r.page}: ${r.label} (${r.table}, XZ Orientation)`,
    },
  });
  if (id) added++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, located, added, written: false })); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, located, added }));
