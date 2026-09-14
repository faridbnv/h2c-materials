#!/usr/bin/env node
// One-time conversion, step 0: write the frozen workbooks out as data/tables/*.csv.
//
//   node scripts/migrate/dump-workbook.mjs [xlsx-path] [reference-xlsx-path]
//
// It uses the production extractor, so every cell is written as the text the build read from the
// workbook: displayed formatting, cached formula results and all. The one deliberate difference is
// Properties "Conversion factor", written at full native precision, because the display rounds small
// factors (0.0000980665 shows as 0.0001) and the build already reads the native number.
//
// The input SHA-256 values are recorded in data/tables/SOURCE.json so the dump can be re-run and
// checked against a newer workbook before cutover.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractWorkbook, extractReference } from '../../build/src/extract.js';
import { REFERENCE_PROPERTIES } from '../../build/src/reference-properties.js';
import { TABLES, tablePath } from '../../build/src/load.js';
import { writeCsv } from '../../build/src/csv.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/** Write the workbooks as CSV tables under <dataDir>/tables. Returns the row counts. */
export function dumpWorkbook({ xlsx = join(root, 'data/H2C_FDM_Material_Database.xlsx'), refXlsx = join(root, 'data/Generic_Materials_Reference.xlsx'), dataDir = join(root, 'data') } = {}) {
  mkdirSync(join(dataDir, 'tables'), { recursive: true });
  const wb = extractWorkbook(xlsx);
  const counts = {};

  for (const { file, sheet } of TABLES) {
    if (!wb[sheet]) continue; // a table the migrations create, not a workbook sheet
    const { header, rows } = wb[sheet];
    const out = rows.map((r) => {
      const o = {};
      for (const h of header) o[h] = r[h];
      if (sheet === 'Properties' && r.__numbers['Conversion factor'] !== undefined) {
        o['Conversion factor'] = String(r.__numbers['Conversion factor']);
      }
      return o;
    });
    writeCsv(tablePath(dataDir, file), header, out);
    counts[file] = out.length;
  }

  const refHeader = ['Category', 'Name', ...REFERENCE_PROPERTIES.flatMap((p) => [`${p.key} min`, `${p.key} max`])];
  const refRows = extractReference(refXlsx).map((r) => {
    const o = { Category: r.category, Name: r.name };
    for (const p of REFERENCE_PROPERTIES) {
      o[`${p.key} min`] = r.properties[p.key] ? String(r.properties[p.key].min) : null;
      o[`${p.key} max`] = r.properties[p.key] ? String(r.properties[p.key].max) : null;
    }
    return o;
  });
  writeCsv(tablePath(dataDir, 'reference'), refHeader, refRows);
  counts.reference = refRows.length;

  writeFileSync(join(dataDir, 'tables/SOURCE.json'), JSON.stringify({
    note: 'Converted from the workbooks below by scripts/migrate/dump-workbook.mjs, then scripts/migrate/m*.mjs in order. The workbooks are retired; their history is in git.',
    workbook: { file: 'data/H2C_FDM_Material_Database.xlsx', sha256: sha(xlsx) },
    reference: { file: 'data/Generic_Materials_Reference.xlsx', sha256: sha(refXlsx) },
    rows: counts,
  }, null, 2) + '\n');
  return counts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(dumpWorkbook({
    ...(process.argv[2] ? { xlsx: resolve(process.argv[2]) } : {}),
    ...(process.argv[3] ? { refXlsx: resolve(process.argv[3]) } : {}),
  }));
}
