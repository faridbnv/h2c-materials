// Canonical CSV reading and writing for the data tables.
//
// One format, so a diff shows only what changed: RFC 4180 quoting (only where a value needs it),
// UTF-8 without a byte-order mark, LF line endings, a trailing newline, and an empty field for a
// missing value. Every value is trimmed text; an empty cell is null, never "".

import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

/**
 * Read a CSV into { header, records }, each record { values: {column: string|null}, line }.
 * `line` is the 1-based file line the record starts on, for error messages.
 */
export function readCsv(path) {
  const text = readFileSync(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) throw new Error(`${path}: starts with a byte-order mark; save as UTF-8 without BOM`);
  const parsed = parse(text, { bom: false, relax_column_count: false, skip_empty_lines: false, info: true });
  if (!parsed.length) throw new Error(`${path}: empty file, expected a header row`);
  const header = parsed[0].record.map((h) => h.trim());
  const records = [];
  for (const { record, info } of parsed.slice(1)) {
    const values = {};
    let any = false;
    header.forEach((h, i) => {
      const v = record[i] == null ? '' : record[i].trim();
      values[h] = v === '' ? null : v;
      if (v !== '') any = true;
    });
    if (any) records.push({ values, line: info.lines });
  }
  return { header, records, text };
}

/** Render rows (objects keyed by header) as canonical CSV text. */
export function csvText(header, rows) {
  const data = rows.map((r) => header.map((h) => (r[h] == null ? '' : String(r[h]))));
  return stringify([header, ...data], { record_delimiter: '\n' });
}

export function writeCsv(path, header, rows) {
  writeFileSync(path, csvText(header, rows));
}
