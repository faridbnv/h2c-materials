// Legacy: the reader for the retired Excel workbooks (data/H2C_FDM_Material_Database.xlsx and
// data/Generic_Materials_Reference.xlsx, removed from the tree after the 2026-09-14 conversion; they
// remain in git history). Nothing in the build uses it. It exists so the conversion can be replayed and
// checked: scripts/migrate/verify-migration.mjs.
//
// Legacy extract: read the retired workbooks into raw row objects. Used only by the one-time
// conversion (scripts/migrate/dump-workbook.mjs) and the parity check against it.
// The workbook is never written. Header rows were confirmed against the embedded Excel table
// definitions (xl/tables/*.xml): Materials declares A6:AQ108, every other table starts at A3.

import XLSX from 'xlsx';
import { REFERENCE_PROPERTIES } from '../reference-properties.js';

// sheet name -> 0-based index of the header row
export const SHEET_HEADER_ROW = {
  'Materials': 5,
  'Grades': 2,
  'Print setup': 2,
  'Properties': 2,
  'Use & durability': 2,
  'Prices CA': 2,
  'Sources': 2,
  'Coverage': 2,
  'Method': 2,
};



function sheetToRows(ws, headerRowIndex) {
  // raw:false keeps the displayed text; we do our own numeric parsing so that
  // "Not published" and a number are distinguishable downstream.
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null, raw: false });
  const header = (grid[headerRowIndex] || []).map((h) => (h == null ? '' : String(h).trim()));
  const rows = [];
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const line = grid[r] || [];
    const rec = {};
    let any = false;
    for (let c = 0; c < header.length; c++) {
      if (!header[c]) continue;
      const v = line[c];
      const val = v == null || v === '' ? null : String(v).trim();
      rec[header[c]] = val;
      if (val !== null) any = true;
    }
    if (any) {
      rec.__row = r + 1; // 1-based spreadsheet row, for error messages
      // Display formatting can round a conversion factor (0.0000980665 displays as 0.0001).
      // Retain native numeric cells for validation without changing the source-text interface.
      rec.__numbers = {};
      for (let c = 0; c < header.length; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell?.t === 'n' && typeof cell.v === 'number') rec.__numbers[header[c]] = cell.v;
      }
      rows.push(rec);
    }
  }
  return { header, rows };
}

export function extractWorkbook(path) {
  const wb = XLSX.readFile(path, { cellDates: false });
  const out = {};
  for (const [name, headerRow] of Object.entries(SHEET_HEADER_ROW)) {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`Workbook is missing the sheet "${name}"`);
    out[name] = sheetToRows(ws, headerRow);
  }
  return out;
}

// The generic reference workbook has a three-deep header (group / property / min-max),
// a category column that only repeats on the first row of each block, and a sheet range that
// does not start at column A. So locate the "Name" header cell and work in offsets from it.
export { REFERENCE_PROPERTIES };

export function extractReference(path) {
  const wb = XLSX.readFile(path, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: null, raw: false });

  let nameCol = -1, headerRow = -1;
  for (let r = 0; r < Math.min(6, grid.length) && nameCol < 0; r++) {
    const line = grid[r] || [];
    for (let c = 0; c < line.length; c++) {
      if (line[c] != null && String(line[c]).trim().toLowerCase() === 'name') { nameCol = c; headerRow = r; break; }
    }
  }
  if (nameCol < 0) throw new Error('Generic_Materials_Reference.xlsx: could not locate the "Name" header cell');

  const categoryCol = nameCol - 2;
  const rows = [];
  let category = null;
  for (let r = headerRow + 1; r < grid.length; r++) {
    const line = grid[r] || [];
    const cat = line[categoryCol];
    if (cat != null && String(cat).trim()) category = String(cat).trim();
    const name = line[nameCol] == null ? null : String(line[nameCol]).trim();
    if (!name) continue;
    const props = {};
    for (const p of REFERENCE_PROPERTIES) {
      const min = line[nameCol + p.offset];
      const max = line[nameCol + p.offset + 1];
      const lo = min == null || min === '' ? null : Number(min);
      const hi = max == null || max === '' ? null : Number(max);
      props[p.key] = (Number.isFinite(lo) && Number.isFinite(hi)) ? { min: lo, max: hi, unit: p.unit } : null;
    }
    rows.push({ category, name, properties: props, __row: r + 1 });
  }
  return rows;
}
