// Load: read the canonical CSV tables into the row objects the compiler consumes.
//
// The CSV files under data/tables/ are the source of truth. This loader returns the same shape the
// workbook extractor returned, { [sheet]: { header, rows } }, so compile, validate and the estimate
// model read the data exactly as before. No interpretation happens here.

import { join } from 'node:path';
import { readCsv } from './csv.js';
import { REFERENCE_PROPERTIES } from './reference-properties.js';

// Table file -> the sheet name the compiler addresses it by.
export const TABLES = [
  { file: 'materials', sheet: 'Materials' },
  { file: 'grades', sheet: 'Grades' },
  { file: 'profiles', sheet: 'Print setup' },
  { file: 'measurements', sheet: 'Properties' },
  { file: 'evidence', sheet: 'Use & durability' },
  { file: 'prices', sheet: 'Prices CA' },
  { file: 'sources', sheet: 'Sources' },
  { file: 'coverage', sheet: 'Coverage' },
  { file: 'method', sheet: 'Method' },
  { file: 'headlines', sheet: 'Headlines' },
];

const NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

/**
 * The snapshot date, read from the Method sheet's Scope / Snapshot row rather than typed into the
 * build. It was a constant, so the workbook could move to a new snapshot while every file, filename
 * and "data" label still named the old one.
 */
export function snapshotDate(methodRows) {
  const row = methodRows.find((r) => r.Section === 'Scope' && r.Topic === 'Snapshot');
  const date = String(row?.['Definition / rule'] ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw new Error('The Method sheet has no Scope / Snapshot row starting with a YYYY-MM-DD date');
  return date;
}

export function tablePath(dataDir, file) {
  return join(dataDir, 'tables', `${file}.csv`);
}

function toRows(path, file) {
  const { header, records } = readCsv(path);
  const rows = records.map(({ values, line }) => {
    const row = { ...values, __file: `data/tables/${file}.csv`, __row: line, __numbers: {} };
    for (const [k, v] of Object.entries(values)) {
      if (v != null && NUMBER_RE.test(v)) row.__numbers[k] = Number(v);
    }
    return row;
  });
  return { header, rows };
}

export function loadTables(dataDir) {
  const out = {};
  for (const { file, sheet } of TABLES) out[sheet] = toRows(tablePath(dataDir, file), file);
  return out;
}

/** The generic reference envelopes: [{category, name, properties, __row}]. */
export function loadReference(dataDir) {
  const { records } = readCsv(tablePath(dataDir, 'reference'));
  return records.map(({ values, line }) => {
    const properties = {};
    for (const p of REFERENCE_PROPERTIES) {
      const lo = values[`${p.key} min`] == null ? null : Number(values[`${p.key} min`]);
      const hi = values[`${p.key} max`] == null ? null : Number(values[`${p.key} max`]);
      properties[p.key] = Number.isFinite(lo) && Number.isFinite(hi) ? { min: lo, max: hi, unit: p.unit } : null;
    }
    return { category: values.Category, name: values.Name, properties, __row: line };
  });
}
