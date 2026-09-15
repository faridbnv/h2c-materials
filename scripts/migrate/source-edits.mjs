// Guarded edits for migrations that correct the tables against re-read sources (D35). Every edit names the
// value it replaces, so a re-run is a no-op and a run after the data moved stops instead of overwriting; every
// changed measurement gets a dated note saying what changed and where the source says so.

import { nextId } from '../data/table-io.mjs';

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
  if (rows.some((r) => r.SourceID === template.SourceID && r.Locator === set.Locator && r['Data status'] !== 'Retired duplicate record')) return null;
  const row = {
    ...template,
    Direction: NA, Notch: NA, 'Moisture condition': 'Not published', 'Test temperature': 'Not published', 'Test load MPa': NA,
    'Raw uncertainty ±': NA, 'Normalized uncertainty ±': NA, 'Raw upper bound': NA, 'Normalized upper bound': NA,
    Operator: '=', 'Conversion factor': '1', 'Data status': 'Published value', 'Parse review': NA,
    ...set,
    MeasurementID: nextId('measurements', rows.map((r) => r.MeasurementID)),
    Notes: `Added ${date} (${migration}): ${why}${note ? ` ${note}` : ''}`,
  };
  for (const k of ['Stress max MPa', 'Stress min MPa', 'Stress amplitude MPa', 'Frequency Hz', 'Load ratio R', 'Run-out']) if (!(k in set)) row[k] = NA;
  t.append('measurements', row);
  return row.MeasurementID;
}
