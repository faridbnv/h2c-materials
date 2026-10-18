// Guarded edits for migrations that correct the tables against re-read sources (D35). Every edit names the
// value it replaces, so a re-run is a no-op and a run after the data moved stops instead of overwriting; every
// changed measurement gets a dated note saying what changed and where the source says so.

import { join } from 'node:path';
import { nextId, projectRoot } from '../data/table-io.mjs';
import { testTemperatureCell } from '../../build/src/typed-values.js';
import { readCsv, csvText } from '../../build/src/csv.js';

const NA = 'Not applicable';

/** Append `text` to a Notes cell once. */
export const withNote = (before, text) => (before == null || before === NA || before === 'Not published' ? text : before.includes(text) ? before : `${before} ${text}`);

/**
 * Set fields of measurement rows. `set` maps field -> [expected, value]; expected may be a RegExp. Rows must
 * cite `source`. Returns the number of rows changed.
 */
export function correct(t, { source, ids, set, note, migration, date = '2026-09-14' }) {
  let changed = 0;
  for (const id of ids) {
    const row = t.get('measurements', id);
    if (row.SourceID !== source) throw new Error(`${migration}: ${id} cites ${row.SourceID}, not ${source}`);
    let edited = false;
    for (const [field, [from, to]] of Object.entries(set)) {
      if (row[field] === to) continue;
      const ok = from instanceof RegExp ? from.test(row[field] ?? '') : row[field] === from;
      if (!ok) throw new Error(`${migration}: ${id} ${field} is "${row[field]}", expected ${from}; the data moved since this correction was written`);
      t.set('measurements', id, field, to, { expect: row[field] });
      edited = true;
    }
    // The typed test temperature follows its wording, unless the edit sets it too (m175).
    if (edited && 'Test temperature' in set && !('Test temperature °C' in set) && t.header('measurements').includes('Test temperature °C')) {
      t.set('measurements', id, 'Test temperature °C', testTemperatureCell(row['Test temperature']));
    }
    if (edited) {
      t.set('measurements', id, 'Notes', withNote(row.Notes, `Corrected ${date} (${migration}) against the source: ${note}`), { expect: row.Notes });
      changed++;
    }
  }
  return changed;
}

/**
 * Add a published value that was never transcribed, copying a row of the same source for its grade and
 * conditions and overriding `set`. Skipped when a row of the source already has this locator.
 */
export function addValue(t, { like, set, note, migration, date = '2026-09-14', why = 'published in the source, never transcribed (npm run audit:sources).' }) {
  const template = t.get('measurements', like);
  const rows = t.rows('measurements');
  if (!set.Locator) throw new Error(`${migration}: an added value needs its Locator`);
  // A row for another source than the template's (set.SourceID) is looked for under its own source.
  if (rows.some((r) => r.SourceID === (set.SourceID ?? template.SourceID) && r.Locator === set.Locator && r['Data status'] !== 'Retired duplicate record')) return null;
  const row = {
    ...template,
    Direction: NA, Notch: NA, 'Moisture condition': 'Not published', 'Test temperature': 'Not published', 'Test load MPa': NA, 'Anneal °C': NA, 'Anneal h': NA,
    'Raw uncertainty ±': NA, 'Normalized uncertainty ±': NA, 'Raw upper bound': NA, 'Normalized upper bound': NA,
    Operator: '=', 'Conversion factor': '1', 'Data status': 'Published value', 'Parse review': NA,
    ...set,
    MeasurementID: nextId('measurements', rows.map((r) => r.MeasurementID)),
    Notes: `Added ${date} (${migration}): ${why}${note ? ` ${note}` : ''}`,
  };
  // The typed test temperature is read from the row's own wording unless `set` gives it (m175).
  if (t.header('measurements').includes('Test temperature °C') && !('Test temperature °C' in set)) row['Test temperature °C'] = testTemperatureCell(row['Test temperature']);
  // Fatigue loading lives in fatigue_tests.csv since m31; an added row carries none.
  for (const k of ['Stress max MPa', 'Stress min MPa', 'Stress amplitude MPa', 'Frequency Hz', 'Load ratio R', 'Run-out']) delete row[k];
  t.append('measurements', row);
  return row.MeasurementID;
}

const ACCEPTED = 'data/review/accepted-findings.csv';
const findingOf = (r) => [r.Code, r.Table, r.Record, r.Field ?? ''].join('\u0000');

/**
 * Settle lint findings in the migration's own save: `accept` rows ({ Code, Table, Record, Field, Reason }) are written
 * with the date, each after the last acceptance of its code (or where its code sorts), and `drop` names acceptances
 * ({ Code, Table, Record, Field }) whose finding the migration removes and that would otherwise stand stale (AGENTS.md:
 * an accepted finding that no longer occurs must be removed). Staged with the tables, so a refused save leaves neither.
 * A re-run adds and drops nothing. Returns { added, dropped }.
 */
export function settleFindings(t, { accept = [], drop = [], date, root = projectRoot }) {
  const file = join(root, ACCEPTED);
  const { header, records } = readCsv(file);
  const gone = new Set(drop.map((d) => findingOf({ Table: 'measurements', Field: 'Normalized value', ...d })));
  const all = records.map((r) => r.values);
  const rows = all.filter((r) => !gone.has(findingOf(r)));
  const dropped = all.length - rows.length;
  const have = new Set(rows.map(findingOf));
  let added = 0;
  for (const a of accept) {
    const row = { Code: a.Code, Table: a.Table ?? 'measurements', Record: a.Record, Field: a.Field ?? 'Normalized value', Reason: a.Reason, Accepted: date };
    if (have.has(findingOf(row))) continue;
    const last = rows.map((r) => r.Code).lastIndexOf(row.Code);
    const next = rows.findIndex((r) => r.Code > row.Code);
    rows.splice(last >= 0 ? last + 1 : next < 0 ? rows.length : next, 0, row);
    have.add(findingOf(row));
    added++;
  }
  if (added || dropped) t.stageFile(file, csvText(header, rows));
  return { added, dropped };
}
