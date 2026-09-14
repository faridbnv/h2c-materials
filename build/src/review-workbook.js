// A generated, read-only Excel view of the data tables, for reviewing in a spreadsheet.
//
// The CSV tables are the source of truth; this workbook is regenerated from them and nothing reads it
// back. It has a README sheet saying so (with the commit and data hash), a Headlines sheet joining each
// headline to its measurement, grade and source, one sheet per table with typed numbers, filters and
// column widths, and a Columns sheet with every column's type, role and meaning from the schema.

import XLSX from 'xlsx';
import { join } from 'node:path';
import { readCsv } from './csv.js';
import { loadSchemas, TABLE_ORDER } from './schema.js';

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
// Excel sheet names: at most 31 characters, none of []:*?/\
const sheetName = (s) => s.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);

function sheetFrom(rows, header, numberColumns = new Set()) {
  const aoa = [header, ...rows.map((r) => header.map((h) => {
    const v = r[h];
    if (v == null) return null;
    return numberColumns.has(h) && NUMBER_RE.test(v) ? Number(v) : v;
  }))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: header.length - 1 } }) };
  ws['!cols'] = header.map((h) => ({ wch: Math.min(60, Math.max(h.length + 2, ...rows.slice(0, 200).map((r) => String(r[h] ?? '').length + 1))) }));
  return ws;
}

/** Build the workbook object. `provenance` is { commit, dataManifestSha256, generated }. */
export function reviewWorkbook(root, provenance) {
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  const names = Object.keys(schemas).sort((a, b) => TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b));
  const tables = Object.fromEntries(names.map((n) => {
    const { header, records } = readCsv(join(root, 'data/tables', `${n}.csv`));
    return [n, { header, rows: records.map((r) => r.values) }];
  }));
  const wb = XLSX.utils.book_new();

  const readme = [
    ['H2C material data: review workbook'],
    [],
    ['This workbook is generated from data/tables/*.csv. It is for reading, filtering and sorting only.'],
    ['Edits made here are not imported. Change the CSV tables (see AGENTS.md), then regenerate with: npm run data:export-xlsx'],
    [],
    ['Commit', provenance.commit ?? 'unknown'],
    ['Data manifest SHA-256', provenance.dataManifestSha256],
    ['Generated', provenance.generated],
    [],
    ['Sheet', 'Rows', 'What it holds'],
    ['Headlines view', null, 'Each material headline joined to the measurement it shows, its grade and its source'],
    ...names.map((n) => [sheetName(n), tables[n].rows.length, schemas[n].description]),
    ['Columns', null, 'Every column of every table: type, role and meaning, from schema/tables'],
  ];
  const rs = XLSX.utils.aoa_to_sheet(readme);
  rs['!cols'] = [{ wch: 28 }, { wch: 66 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, rs, 'README');

  const byId = (table, key) => new Map(tables[table].rows.map((r) => [r[key], r]));
  const materials = byId('materials', 'MaterialID'), measurements = byId('measurements', 'MeasurementID');
  const grades = byId('grades', 'GradeID'), sources = byId('sources', 'SourceID');
  const viewHeader = ['MaterialID', 'Material', 'HeadlineKey', 'Use', 'MeasurementID', 'Property', 'Value', 'Unit', 'Direction', 'Data status',
    'GradeID', 'Product', 'SourceID', 'Source title', 'Locator', 'URL'];
  const view = tables.headlines.rows.map((h) => {
    const m = measurements.get(h.MeasurementID) ?? {}, g = grades.get(m.GradeID) ?? {}, s = sources.get(m.SourceID) ?? {};
    return {
      MaterialID: h.MaterialID, Material: materials.get(h.MaterialID)?.['Original name'], HeadlineKey: h.HeadlineKey, Use: h.Use,
      MeasurementID: h.MeasurementID, Property: m.Property, Value: m['Normalized value'], Unit: m['Normalized unit'], Direction: m.Direction,
      'Data status': m['Data status'], GradeID: m.GradeID, Product: [g.Manufacturer, g['Product name']].filter(Boolean).join(' '),
      SourceID: m.SourceID, 'Source title': s.Title, Locator: m.Locator, URL: s.URL,
    };
  });
  XLSX.utils.book_append_sheet(wb, sheetFrom(view, viewHeader, new Set(['Value'])), 'Headlines view');

  for (const n of names) {
    const numbers = new Set(schemas[n].fields.filter((f) => f.type === 'number' || f.type === 'integer').map((f) => f.name));
    XLSX.utils.book_append_sheet(wb, sheetFrom(tables[n].rows, tables[n].header, numbers), sheetName(n));
  }

  const columns = names.flatMap((n) => schemas[n].fields.map((f) => ({
    Table: n, Column: f.name, Type: f.type, Role: f.role, Required: f.constraints?.required ? 'yes' : 'no',
    'Missing states': (f.missing ?? []).join('; '), Vocabulary: f.vocabulary ?? f.item?.vocabulary ?? '',
    References: [f.reference, f.item?.reference].flat().filter(Boolean).map((r) => `${r.table}.${r.field}`).join('; '),
    Meaning: f.description,
  })));
  XLSX.utils.book_append_sheet(wb, sheetFrom(columns, ['Table', 'Column', 'Type', 'Role', 'Required', 'Missing states', 'Vocabulary', 'References', 'Meaning']), 'Columns');
  return wb;
}

export function writeReviewWorkbook(root, path, provenance) {
  const wb = reviewWorkbook(root, provenance);
  XLSX.writeFile(wb, path, { compression: true });
  return wb;
}

/** Row counts per table sheet, read back from a written workbook (for the check against the manifest). */
export function workbookRowCounts(path) {
  const wb = XLSX.readFile(path);
  return Object.fromEntries(wb.SheetNames.map((s) => [s, XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, blankrows: false }).length - 1]));
}
