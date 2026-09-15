#!/usr/bin/env node
// Migration m31: the six fatigue columns (stresses, frequency, load ratio, run-out) were "Not applicable" on 2,191 of
// 2,233 measurement rows. They move to data/tables/fatigue_tests.csv, one row per Fatigue life measurement, and leave
// measurements.csv. A property family with its own test parameters (creep, UL 94, tribology) is a child table like this
// one, not a column block on every measurement. The values move unchanged (npm run build:diff: no difference).
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';

export const FATIGUE_COLUMNS = ['Stress max MPa', 'Stress min MPa', 'Stress amplitude MPa', 'Frequency Hz', 'Load ratio R', 'Run-out'];

export function migrate(t) {
  if (t.tables().includes('fatigue_tests') && !t.header('measurements').includes('Stress max MPa')) return;
  const rows = t.rows('measurements').filter((r) => r.Property === 'Fatigue life')
    .map((r) => Object.fromEntries([['MeasurementID', r.MeasurementID], ...FATIGUE_COLUMNS.map((k) => [k, r[k]])]));
  const orphans = t.rows('measurements').filter((r) => r.Property !== 'Fatigue life' && FATIGUE_COLUMNS.some((k) => r[k] !== 'Not applicable'));
  if (orphans.length) throw new Error(`m31: fatigue loading on non-fatigue rows ${orphans.map((r) => r.MeasurementID).join(', ')}; nothing moved`);
  if (!t.tables().includes('fatigue_tests')) t.createTable('fatigue_tests', ['MeasurementID', ...FATIGUE_COLUMNS], rows);
  for (const k of FATIGUE_COLUMNS) t.dropColumn('measurements', k);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(projectRoot, { allowMissing: true });
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
