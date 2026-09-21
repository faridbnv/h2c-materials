#!/usr/bin/env node
// Migration m119 (2026-09-21): a notch is what the row says, and nothing where it says nothing.
//
// The reader gave every unqualified Charpy or Izod row a notch the sheet never printed: "an unqualified Charpy row
// is the unnotched one". The second read (R085) disagreed on eleven sampled rows for exactly that — Flashforge's
// "Izod Impact Strength (X-Y) ISO 180", eSUN's, Creality's, Eryone's "Charpy Impact strenght 2.75J" — and on four
// more where the row says the opposite in words the reader did not know: colorFabb's method column "Izod Notch" and
// "Charpy Notch", QIDI's 缺口冲击强度 (notched impact strength), Extrudr's Kerbschlagzähigkeit, ISO 180/A.
//
// The reader now takes the notch from the row's own words in any of those forms, from the method's letter, or
// not at all (propose.mjs, property-labels.csv, fixture tests). Every recorded source was re-read with it and each
// recorded impact row matched to its fresh reading; where the two differ the fresh reading is written, pinned in
// m119-a-notch-is-what-the-row-says.csv: 180 rows lose a notch no sheet printed, 47 gain the one the row names.
// No value moves. Impact strength backs no headline and is not estimated.
//
//   node scripts/migrate/m119-a-notch-is-what-the-row-says.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm119-a-notch-is-what-the-row-says';
const edits = readCsv(join(dirname(fileURLToPath(import.meta.url)), `${migration}.csv`)).records.map((r) => r.values);
const t = openTables();
let changed = 0;
for (const e of edits) {
  const said = e.Fresh === 'Not published' ? `the row names no notch ("${e.Locator.replace(/^p\. \d+:\s*/, '')}"), so none is recorded` : `the row names it ${e.Fresh.toLowerCase()} (${e.FreshLocator})`;
  changed += correct(t, { source: e.SourceID, ids: [e.MeasurementID], set: { Notch: [e.Recorded, e.Fresh] }, migration, date: '2026-09-21', note: `${said}; the value is unchanged.` });
}
if (changed) t.save();
console.log(`${migration}: ${changed} row(s) now carry the notch their sheet states, or none`);
