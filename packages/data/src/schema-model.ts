// The schema the data layer works against (WP-17; pack 04 sections 4.2 and 5, 03 ADR-02: a shape change is a `schemaEdit` command that
// changes the schema file and the data in one change set).
//
// Until now the schema was the generated module (generated/columns.ts) and nothing else. A `schemaEdit` changes the schema inside a
// sandbox workspace, so the workspace needs the facts of the EDITED schema (columns, keys, the storage DDL) without anyone editing the
// repository's schema/ or regenerating its files. A `SchemaModel` is those facts. `BASE_MODEL` is the repository's own (the generated
// module and db/generated/storage.sql, so the common path costs nothing); `modelWith(overlay)` is the repository's schema with some
// files replaced, built by the very generator that writes the generated files (remake/tools/types-gen.mjs), so the two cannot disagree.
//
// An overlay is the text of the schema files that differ from the repository's: 'schema/tables/<table>.schema.json' and
// 'schema/vocab/<vocabulary>.csv'. It is what the workspace stores (in `_meta`) and what an export writes beside the data.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CanonicalCells } from '@atlas/domain/contracts';
import { describeSchema } from '../../../remake/tools/types-gen.mjs';
import { TABLES, TABLE_NAMES } from './generated/columns.ts';
import type { ColumnInfo, ColumnType, TableInfo, TableName } from './generated/columns.ts';
import { isObject } from './json-patch.ts';

export const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
export const STORAGE_DDL = join(REPO_ROOT, 'db/generated/storage.sql');

/** Schema file text by repository-relative path ('schema/tables/grades.schema.json'). */
export type SchemaFiles = Readonly<Record<string, string>>;

export interface VocabularyInfo {
  readonly values: readonly string[];
  /** The columns that take their words from it. */
  readonly users: readonly { readonly table: TableName; readonly column: string }[];
}

export interface SchemaModel {
  readonly tables: Readonly<Record<TableName, TableInfo>>;
  /** The STRICT storage DDL for these tables (what db/generated/storage.sql holds for the repository's schema). */
  readonly storageDdl: string;
  /** SHA-256 over the schema's table and vocabulary files in name order: `_meta.schema_sha256`, `expect.schemaDigest`. */
  readonly digest: string;
  /** The schema files that differ from the repository's; empty for the repository's own. */
  readonly overlay: SchemaFiles;
  /** The columns that make a new append a duplicate (declared by the table's schema file as "naturalKey"), or null. */
  naturalKey(table: TableName): readonly string[] | null;
  vocabulary(stem: string): VocabularyInfo | null;
  /** The five generated files for this schema, by repository-relative path. */
  generated(): Readonly<Record<string, string>>;
  /** The effective text of a schema file, or null when there is none. */
  fileText(path: string): string | null;
}

const TABLE_DIR = 'schema/tables';
const VOCAB_DIR = 'schema/vocab';

const isTableName = (name: string): name is TableName => TABLE_NAMES.some((table) => table === name);
const COLUMN_TYPES: readonly ColumnType[] = ['string', 'number', 'integer', 'boolean', 'date', 'list'];
const isColumnType = (value: unknown): value is ColumnType => COLUMN_TYPES.some((type) => type === value);
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.every((item) => typeof item === 'string');

/** The columns a record of a table is addressed by: its primary key, else its first unique key (empty for a table that has neither). */
export function addressKeyOf(info: TableInfo): readonly string[] {
  return info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? []);
}

/** A record's ID: the cells of its address key joined by " | ", or null when one of them is empty. */
export function recordIdOf(key: readonly string[], cells: CanonicalCells): string | null {
  const parts = key.map((name) => cells[name] ?? null);
  return parts.every((part): part is string => part !== null) ? parts.join(' | ') : null;
}

/** A path a schema file may have: the data layer reads and writes nothing else of the schema. */
export function isSchemaFilePath(path: string): boolean {
  return /^schema\/tables\/[a-z0-9_]+\.schema\.json$/.test(path) || /^schema\/vocab\/[a-z0-9-]+\.csv$/.test(path);
}

// ---------------------------------------------------------------- the repository's own schema files

let baseFileCache: ReadonlyMap<string, string> | null = null;

/** Every table and vocabulary file of the repository's schema/, by relative path. Read once. */
function baseFiles(): ReadonlyMap<string, string> {
  if (baseFileCache === null) {
    const files = new Map<string, string>();
    for (const dir of [TABLE_DIR, VOCAB_DIR]) {
      for (const name of readdirSync(join(REPO_ROOT, dir)).sort()) files.set(`${dir}/${name}`, readFileSync(join(REPO_ROOT, dir, name), 'utf8'));
    }
    baseFileCache = files;
  }
  return baseFileCache;
}

/** The effective files: the repository's with the overlay's replacing or adding. */
function effectiveFiles(overlay: SchemaFiles): Map<string, string> {
  const files = new Map(baseFiles());
  for (const [path, text] of Object.entries(overlay)) {
    if (!isSchemaFilePath(path)) throw new Error(`${JSON.stringify(path)} is not a schema table or vocabulary file`);
    files.set(path, text);
  }
  return files;
}

/** The same digest `schemaDigest()` of rebuild.ts takes: each table then each vocabulary file in name order, name and bytes. */
function digestOfFiles(files: ReadonlyMap<string, string>): string {
  const hash = createHash('sha256');
  for (const dir of [TABLE_DIR, VOCAB_DIR]) {
    const sub = dir.slice('schema/'.length);
    for (const path of [...files.keys()].filter((p) => p.startsWith(`${dir}/`)).sort()) {
      hash.update(`${sub}/${path.slice(dir.length + 1)}\0`).update(files.get(path) ?? '').update('\n');
    }
  }
  return hash.digest('hex');
}

// ---------------------------------------------------------------- reading what the generator described

function columnOf(raw: unknown, where: string): ColumnInfo {
  if (!isObject(raw) || typeof raw.name !== 'string' || typeof raw.sqlName !== 'string' || !isColumnType(raw.type) || typeof raw.role !== 'string'
    || typeof raw.required !== 'boolean' || !isTextList(raw.missing)) {
    throw new Error(`${where}: the schema generator described a column in a shape the data layer does not read`);
  }
  return { name: raw.name, sqlName: raw.sqlName, type: raw.type, role: raw.role, required: raw.required, missing: raw.missing };
}

function tableOf(name: string, raw: unknown): TableInfo {
  if (!isObject(raw) || !isTextList(raw.primaryKey) || !Array.isArray(raw.uniqueKeys) || !raw.uniqueKeys.every(isTextList) || !Array.isArray(raw.columns)) {
    throw new Error(`${name}: the schema generator described a table in a shape the data layer does not read`);
  }
  return { primaryKey: raw.primaryKey, uniqueKeys: raw.uniqueKeys, columns: raw.columns.map((c: unknown) => columnOf(c, name)) };
}

/** A schema the generator refuses (an unknown vocabulary, a key that is not a column, a table added or removed...). Anything else that goes wrong is not this. */
export class SchemaInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaInvalidError';
  }
}

interface Described {
  readonly tables: Record<TableName, TableInfo>;
  readonly naturalKeys: ReadonlyMap<TableName, readonly string[]>;
  readonly vocabularies: ReadonlyMap<string, VocabularyInfo>;
  readonly storageDdl: string;
  readonly files: Readonly<Record<string, string>>;
}

/** Run the generator over a schema root and read its answer. A schema the generator refuses throws the generator's message. */
function describe(root: string): Described {
  let raw;
  try {
    raw = describeSchema(root);
  } catch (error) {
    throw new SchemaInvalidError(error instanceof Error ? error.message : String(error));
  }
  const names: readonly string[] = raw.tableNames;
  const known = names.filter(isTableName);
  if (known.length !== names.length || known.length !== TABLE_NAMES.length || TABLE_NAMES.some((t) => !known.includes(t))) {
    throw new SchemaInvalidError('the schema adds or removes a table; the write service changes the columns, keys and vocabularies of the 36 tables it has (a new table is a change for the schema owner)');
  }
  const tables = Object.fromEntries(known.map((name) => [name, tableOf(name, raw.tables[name])]));
  const naturalKeys = new Map<TableName, readonly string[]>();
  for (const name of known) {
    const key: unknown = raw.tables[name]?.naturalKey;
    if (isTextList(key)) naturalKeys.set(name, key);
  }
  const vocabularies = new Map<string, VocabularyInfo>();
  for (const [stem, info] of Object.entries(raw.vocabularies)) {
    if (!isObject(info) || !isTextList(info.values) || !Array.isArray(info.users)) throw new Error(`vocabulary ${stem}: the generator described it in a shape the data layer does not read`);
    const users = info.users.flatMap((u: unknown) => (isObject(u) && typeof u.table === 'string' && isTableName(u.table) && typeof u.column === 'string' ? [{ table: u.table, column: u.column }] : []));
    vocabularies.set(stem, { values: info.values, users });
  }
  const files: Record<string, string> = {};
  for (const [path, text] of Object.entries(raw.files)) if (typeof text === 'string') files[path] = text;
  return { tables: pickTables(tables), naturalKeys, vocabularies, storageDdl: String(raw.storageDdl), files };
}

/** Whether `tables` has every table of the schema (the check that lets a record keyed by text stand as one keyed by TableName). */
function hasEveryTable(tables: Record<string, TableInfo>): tables is Record<TableName, TableInfo> {
  return TABLE_NAMES.every((name) => name in tables);
}

function pickTables(tables: Record<string, TableInfo>): Record<TableName, TableInfo> {
  if (!hasEveryTable(tables)) throw new Error('internal: the schema generator described fewer tables than the schema has');
  return tables;
}

// ---------------------------------------------------------------- the models

class Model implements SchemaModel {
  readonly tables: Readonly<Record<TableName, TableInfo>>;
  readonly storageDdl: string;
  readonly digest: string;
  readonly overlay: SchemaFiles;
  readonly #files: ReadonlyMap<string, string>;
  readonly #describe: () => Described;
  #described: Described | null = null;

  constructor(parts: { tables: Readonly<Record<TableName, TableInfo>>; storageDdl: string; overlay: SchemaFiles; files: ReadonlyMap<string, string>; describe: () => Described }) {
    this.tables = parts.tables;
    this.storageDdl = parts.storageDdl;
    this.overlay = parts.overlay;
    this.#files = parts.files;
    this.digest = digestOfFiles(parts.files);
    this.#describe = parts.describe;
  }

  #detail(): Described {
    this.#described ??= this.#describe();
    return this.#described;
  }

  naturalKey(table: TableName): readonly string[] | null { return this.#detail().naturalKeys.get(table) ?? null; }
  vocabulary(stem: string): VocabularyInfo | null { return this.#detail().vocabularies.get(stem) ?? null; }
  generated(): Readonly<Record<string, string>> { return this.#detail().files; }
  fileText(path: string): string | null { return this.#files.get(path) ?? null; }
}

/** The repository's own schema: the generated module and db/generated/storage.sql. */
export const BASE_MODEL: SchemaModel = new Model({
  tables: TABLES,
  storageDdl: readFileSync(STORAGE_DDL, 'utf8'),
  overlay: {},
  files: baseFiles(),
  describe: () => describe(REPO_ROOT),
});

const built = new Map<string, SchemaModel>();

/** Write the effective schema files under a scratch root (db.schema.json beside them, which the generator reads too). */
function materialize(root: string, files: ReadonlyMap<string, string>): void {
  for (const [path, text] of files) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const dbSchema = join(REPO_ROOT, 'schema/db.schema.json');
  if (existsSync(dbSchema)) writeFileSync(join(root, 'schema/db.schema.json'), readFileSync(dbSchema));
}

/**
 * The repository's schema with `overlay`'s files in place of its own. Throws the generator's message when the result is not a valid
 * schema (an unknown vocabulary, a key that is not a column, a missing-state word that leaks into an ordinary column, and so on).
 */
export function modelWith(given: SchemaFiles): SchemaModel {
  // A file that is the repository's own text is not an edit: an edit that was undone leaves the repository's schema, not a model that only looks edited.
  const overlay = Object.fromEntries(Object.entries(given).filter(([path, text]) => baseFiles().get(path) !== text));
  if (Object.keys(overlay).length === 0) return BASE_MODEL;
  const key = createHash('sha256').update(JSON.stringify(Object.entries(overlay).sort(([a], [b]) => (a < b ? -1 : 1)))).digest('hex');
  const known = built.get(key);
  if (known !== undefined) return known;
  const files = effectiveFiles(overlay);
  const root = mkdtempSync(join(tmpdir(), 'atlas-schema-'));
  try {
    materialize(root, files);
    const described = describe(root);
    const model = new Model({ tables: described.tables, storageDdl: described.storageDdl, overlay, files, describe: () => described });
    built.set(key, model);
    return model;
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/** The overlay an export directory holds: every schema table and vocabulary file under `<root>/schema/` that differs from the repository's. */
export function readOverlay(root: string): SchemaFiles {
  const out: Record<string, string> = {};
  for (const dir of [TABLE_DIR, VOCAB_DIR]) {
    const full = join(root, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full).sort()) {
      const path = `${dir}/${name}`;
      if (!isSchemaFilePath(path)) continue;
      const text = readFileSync(join(full, name), 'utf8');
      if (baseFiles().get(path) !== text) out[path] = text;
    }
  }
  return out;
}

/** The holder a write context keeps its schema in: a schema command replaces the model, and everything after it sees the new one. */
export interface SchemaHolder { model: SchemaModel }

export const baseSchemaHolder = (): SchemaHolder => ({ model: BASE_MODEL });
