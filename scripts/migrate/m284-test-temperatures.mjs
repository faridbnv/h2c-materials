#!/usr/bin/env node
// Migration m284 (2026-10-01): impact test temperatures printed on the value's own line and not recorded (the data
// audit's R10; D92: an impact value is defined at its test temperature). `npm run audit:context` read only sub-zero
// temperatures until this sweep; taught "@23° C", "at 23 °C" and "(+24°C)" on an impact row, it found 22 rows whose
// line prints one. The wording goes into Test temperature as the line prints it, and its reading into Test temperature
// °C (m175), checked against the cached sheet (m284-test-temperatures.csv, read by Claude Opus).
//
//   node scripts/migrate/m284-test-temperatures.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm284';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
let n = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-test-temperatures.csv`))) {
  onSheet(t, e.source, e.quote, MIGRATION);
  n += correct(t, { source: e.source, ids: [e.id], migration: MIGRATION, date: '2026-10-01', set: { 'Test temperature': [e.expect, e.value] },
    note: `the value's own line prints the test temperature "${e.value}" (re-read by Claude Opus, error-class sweep).` });
}
t.save();
console.log(`${MIGRATION}: ${n} impact rows now carry the test temperature their line prints`);
