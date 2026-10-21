// Shared by the WP-08/WP-09 tests (not a test itself): a scratch copy of the real data that a test may damage, and helpers
// that edit one table the way a person with a text editor would, optionally keeping the manifest in step.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseCsv, csvText } from '../../packages/data/src/csv.ts';
import { open } from '../../packages/data/src/driver.ts';
import { TABLES } from '../../packages/data/src/generated/columns.ts';
import { storageOf } from '../../packages/data/src/storage.ts';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export const realData = join(root, 'data');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** A scratch copy of data/ (tables and manifest). Returns { dir, cleanup }. */
export function copyData() {
  const base = mkdtempSync(join(tmpdir(), 'atlas-data-'));
  const dir = join(base, 'data');
  cpSync(join(realData, 'tables'), join(dir, 'tables'), { recursive: true });
  cpSync(join(realData, 'manifest.json'), join(dir, 'manifest.json'));
  return { dir, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/** Rewrite one table file with `change(text) -> text`; `keepManifest` (default) updates the manifest so only the content differs. */
export function editText(dir, table, change, { keepManifest = true } = {}) {
  const path = join(dir, 'tables', `${table}.csv`);
  const text = change(readFileSync(path, 'utf8'));
  writeFileSync(path, text);
  if (keepManifest) {
    const manifestPath = join(dir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.tables[table] = { rows: parseCsv(text, table).records.length, sha256: sha256(Buffer.from(text, 'utf8')) };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

/** Edit a table's records as arrays of cells (header order) and write canonical CSV. */
export function editRecords(dir, table, change, options) {
  editText(dir, table, (text) => {
    const { header, records } = parseCsv(text, table);
    const rows = records.map((r) => [...r.cells]);
    change(rows, header);
    return csvText(header, rows);
  }, options);
}

export const columnIndex = (table, name) => TABLES[table].columns.findIndex((c) => c.name === name);

/** The records of a real table, as arrays of cells. */
export function realRecords(table) {
  return parseCsv(readFileSync(join(realData, 'tables', `${table}.csv`), 'utf8'), table).records.map((r) => r.cells);
}

/** An empty in-memory database with the storage DDL and foreign keys off, for tests that insert single rows. */
export function emptyDb() {
  const db = open(':memory:', { foreignKeys: false });
  db.exec(readFileSync(join(root, 'db/generated/storage.sql'), 'utf8'));
  return db;
}

/** Insert one record (cells in header order) as `ord`. */
export function insertRecord(db, table, ord, cells) {
  const storage = storageOf(table);
  db.prepare(storage.insertSql).run(...storage.encode(ord, cells));
}
