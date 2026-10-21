// Load: read the tables from the clean SQLite reconstruction into the row objects the compiler consumes (WP-20).
//
// The old build/src/load.js read data/tables/*.csv. The new build reads the same tables back out of the database that
// @atlas/data rebuilds from those files (clean reconstruction: fresh file or memory, STRICT types, CHECK constraints, foreign
// keys, `_ord` 1..n), in the same shape the compiler has always read: { [sheet]: { header, rows } }, each row
// { ...cells, __file, __row, __numbers }. No interpretation happens here.
//
// Order. Every read is `ORDER BY _ord` (storage.ts selectSql), the row's place in its file. The compiler's first-wins and
// tie rules depend on file order (gates.ts takes the first of equals, the preference sort ends on the record ID but several
// reads before it are in row order), so a table is never read in primary-key or insertion order. A test inserts a table in
// the opposite physical order and proves the rows still come back in `_ord` order (tests/remake/build-load.test.mjs).
import type { Db } from '@atlas/data/driver';
import { readCells, storageOf } from '@atlas/data/storage';
import { TABLE_NAMES } from '@atlas/data';
import type { TableName } from '@atlas/data';
import { REFERENCE_PROPERTIES } from './reference-properties.ts';
import type { Dyn, Sheet, SheetRow, Workbook } from './types.ts';

// Table file -> the sheet name the compiler addresses it by.
export const TABLES: readonly { readonly file: TableName; readonly sheet: string }[] = [
  { file: 'materials', sheet: 'Materials' },
  { file: 'grades', sheet: 'Grades' },
  { file: 'profiles', sheet: 'Print setup' },
  { file: 'profile_notes', sheet: 'Print setup notes' },
  { file: 'measurements', sheet: 'Properties' },
  { file: 'evidence', sheet: 'Use & durability' },
  { file: 'prices', sheet: 'Prices' },
  { file: 'fx_rates', sheet: 'FX rates' },
  { file: 'sources', sheet: 'Sources' },
  { file: 'coverage', sheet: 'Coverage' },
  { file: 'material_summaries', sheet: 'Material summaries' },
  { file: 'method', sheet: 'Method' },
  { file: 'headlines', sheet: 'Headlines' },
  { file: 'material_links', sheet: 'Material links' },
  { file: 'properties', sheet: 'Property registry' },
  { file: 'headline_definitions', sheet: 'Headline definitions' },
  { file: 'drawer_comparisons', sheet: 'Drawer comparisons' },
  { file: 'physical_relations', sheet: 'Physical relations' },
  { file: 'conversions', sheet: 'Conversions' },
  { file: 'class_limits', sheet: 'Class limits' },
  { file: 'family_entries', sheet: 'Family entries' },
  { file: 'family_members', sheet: 'Family members' },
  { file: 'chamber_bands', sheet: 'Chamber bands' },
  { file: 'chamber_need', sheet: 'Chamber need' },
  { file: 'polymers', sheet: 'Polymers' },
  { file: 'fatigue_tests', sheet: 'Fatigue tests' },
  { file: 'polymer_environment', sheet: 'Polymer environment' },
  { file: 'know_how_reads', sheet: 'Know-how reads' },
  { file: 'print_guide', sheet: 'Print guide' },
  { file: 'print_guide_materials', sheet: 'Print guide materials' },
  { file: 'page_context', sheet: 'Page context' },
  { file: 'product_claims', sheet: 'Product claims' },
  { file: 'impact_test_guesses', sheet: 'Impact test guesses' },
];

const NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;

/**
 * The snapshot date, read from the Method sheet's Scope / Snapshot row rather than typed into the build. It was a constant,
 * so the workbook could move to a new snapshot while every file, filename and "data" label still named the old one.
 */
export function snapshotDate(methodRows: Dyn[]): string {
  const row = methodRows.find((r) => r.Section === 'Scope' && r.Topic === 'Snapshot');
  const date = String(row?.['Definition / rule'] ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw new Error('The Method sheet has no Scope / Snapshot row starting with a YYYY-MM-DD date');
  return date;
}

/** The file line a record ends on, counting from the header at line 1 (csv-parse's `info.lines`, which the old loader kept). */
function lineAfter(previous: number, cells: readonly (string | null)[]): number {
  let extra = 0;
  for (const cell of cells) if (cell !== null) for (let at = cell.indexOf('\n'); at >= 0; at = cell.indexOf('\n', at + 1)) extra++;
  return previous + 1 + extra;
}

/** One table, its rows in `_ord` order, each as the compiler reads it. */
export function loadSheet(db: Db, file: TableName): Sheet {
  const header = [...storageOf(file).header];
  const rows: SheetRow[] = [];
  let line = 1;
  for (const cells of readCells(db, file)) {
    line = lineAfter(line, cells);
    // Built the way the old loader built it (the cells in header order, spread into a row that then takes __file, __row and
    // __numbers), so the rows have the same shape and the same key order as before.
    const values: Record<string, string | null> = {};
    for (const [k, name] of header.entries()) values[name] = cells[k] ?? null;
    const row: SheetRow = { ...values, __file: `data/tables/${file}.csv`, __row: line, __numbers: {} };
    for (const [name, value] of Object.entries(values)) if (value != null && NUMBER_RE.test(value)) row.__numbers[name] = Number(value);
    rows.push(row);
  }
  return { header, rows };
}

/** The tables the compiler addresses, by sheet name, from tables already loaded. */
export function workbookFrom(sheets: ReadonlyMap<TableName, Sheet>): Workbook {
  return Object.fromEntries(TABLES.map(({ file, sheet }) => {
    const loaded = sheets.get(file);
    if (!loaded) throw new Error(`table ${file} was not loaded`);
    return [sheet, loaded];
  }));
}

/** Every table of the schema, loaded once, in `_ord` order. */
export function loadSheets(db: Db): Map<TableName, Sheet> {
  return new Map<Dyn, Dyn>(TABLE_NAMES.map((file) => [file, loadSheet(db, file)]));
}

/** Every table the compiler addresses, by sheet name. */
export function loadWorkbook(db: Db): Workbook {
  return workbookFrom(loadSheets(db));
}

/**
 * The generic reference envelopes: [{category, name, properties, __row}]. A material's envelopes are its rows of
 * reference_envelopes; the property order is the vocabulary's, not the file's, so every material presents its properties in the
 * same order whatever order its rows were written in.
 */
export function loadReference(db: Db): Dyn[] {
  const envelopes = new Map<string, Map<string, Dyn>>();
  for (const row of loadSheet(db, 'reference_envelopes').rows) {
    if (!envelopes.has(row.Name)) envelopes.set(row.Name, new Map<Dyn, Dyn>());
    envelopes.get(row.Name)?.set(row.Property, row);
  }
  return loadSheet(db, 'reference').rows.map((values) => {
    const own = envelopes.get(values.Name) ?? new Map<string, Dyn>();
    const properties: Dyn = {};
    for (const p of REFERENCE_PROPERTIES) {
      const lo = own.get(p.key!)?.Min == null ? null : Number(own.get(p.key!).Min);
      const hi = own.get(p.key!)?.Max == null ? null : Number(own.get(p.key!).Max);
      properties[p.key!] = Number.isFinite(lo) && Number.isFinite(hi) ? { min: lo, max: hi, unit: p.unit } : null;
    }
    return { category: values.Category, name: values.Name, properties, __row: values.__row };
  });
}
