#!/usr/bin/env node
// Migration m175 (2026-09-26): a measurement's test temperature becomes a typed column, Test temperature °C, beside the
// wording it is read from (the pattern of D49 and D68; phase 6, lane 4, D92).
//
// Test temperature was free text that nothing decided on, which was harmless while no headline depended on it. A
// notched impact bar does: Polymaker's PC PBT prints a notched Charpy strength of 15 kJ/m² at -30 °C on a printed bar
// beside 33 kJ/m² with no temperature stated, and a cold value is the only notched Charpy value of two more of its
// products (PolyMax PC-FR, PolyMide CoPA). The build now reads the typed column and the parser (build/src/normalize/thermal.js
// readTestTemperature) checks it on every build (PARSE-MISMATCH), as Test load MPa is checked against its wording.
//
// The column holds the number the wording states ("23°C", "23 °C" and "-30°C" are 23, 23 and -30), or Not published
// where the source states none or states it only in words ("Room temperature", on 42 fatigue rows). No value changes,
// and the compiled database gains testTemperatureC only on the measurements that state one.
//
// A re-run is a no-op; a run after the data moved stops: a row whose typed cell disagrees with its wording is named.
// After a merge that rewrote measurements.csv without the column, running this again adds it back.
//
//   node scripts/migrate/m175-test-temperature-typed.mjs

import { openTables } from '../data/table-io.mjs';
import { testTemperatureCell } from '../../build/src/typed-values.js';

const migration = 'm175-test-temperature-typed';
const COLUMN = 'Test temperature °C';
const t = openTables();

let changed = 0;
if (!t.header('measurements').includes(COLUMN)) {
  t.addColumn('measurements', COLUMN, { after: 'Test temperature', fill: (r) => testTemperatureCell(r['Test temperature']) });
  changed = t.rows('measurements').length;
} else {
  const moved = t.rows('measurements').filter((r) => r[COLUMN] !== testTemperatureCell(r['Test temperature'])
    && (r['Parse review'] ?? 'Not applicable') === 'Not applicable');
  if (moved.length) throw new Error(`${migration}: ${moved.length} row(s) whose ${COLUMN} disagrees with its wording and has no Parse review (${moved.slice(0, 5).map((r) => r.MeasurementID).join(', ')}); the data moved`);
}
if (changed) t.save();
const stated = t.rows('measurements').filter((r) => r[COLUMN] !== 'Not published').length;
console.log(`${migration}: ${changed ? `${COLUMN} added to ${changed} measurements` : 'already applied'}; ${stated} state a test temperature`);
