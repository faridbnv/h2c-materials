#!/usr/bin/env node
// Migration m465 (2026-10-20): what an XY headline reads where a bar's source states no orientation (the owner's ruling
// of 2026-10-20, D172).
//
// headline_definitions.csv's Unstated direction said `as-published` for the in-plane headlines: a value with no stated
// orientation was counted apart and decided only where the reader admitted such values (D84). The ruling sets apart for
// good a value nothing on its document indicates is the filament's as printed, and keeps deciding one that something
// does: a printed bar (Specimen type printed, stated or implied by its document, m463) whose sheet states no orientation
// is read flat, the way makers print their test bars unless they say otherwise (D91's reading), and a bar its document
// does not describe is set apart. The vocabulary value that says so is `flat if printed`
// (schema/tables/headline_definitions.schema.json). The layer strength and the other Z headlines keep `excluded` (D92).
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m465-a-printed-bar-is-read-flat.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm465';
const t = openTables();
let n = 0;
for (const r of t.rows('headline_definitions')) {
  if (r['Unstated direction'] !== 'as-published') continue;
  t.set('headline_definitions', r.HeadlineKey, 'Unstated direction', 'flat if printed', { expect: 'as-published', migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} headline(s) read a printed bar with no stated orientation as flat`);
