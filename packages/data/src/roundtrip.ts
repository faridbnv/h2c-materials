// The round trip (WP-09; pack 04 section 14, DP-1): committed CSV -> fresh SQLite -> canonical CSV, compared byte for byte
// with the committed files, for every table of the schema. It passes only when ALL of them are identical: a table that is
// missing, unreadable, absent from the database, extra, or simply not checked is a failure, never a skip.
import { performance } from 'node:perf_hooks';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { open } from './driver.ts';
import type { Db } from './driver.ts';
import { buildDatabase, DEFAULT_DATA_DIR, readInputs } from './rebuild.ts';
import type { BuildReport } from './rebuild.ts';
import { BASE_MODEL } from './schema-model.ts';
import type { SchemaModel } from './schema-model.ts';
import { countRows, exportTable, isTableName } from './storage.ts';

export type TableStatus = 'identical' | 'differs' | 'problem' | 'missing-table' | 'not-checked';

export interface TableResult {
  readonly table: string;
  readonly status: TableStatus;
  readonly rows: number;
  readonly bytes: number;
  readonly detail: string;
}

export interface RoundtripResult {
  readonly ok: boolean;
  /** How many tables the schema has: the number that must be identical. */
  readonly expected: number;
  readonly identical: number;
  readonly tables: readonly TableResult[];
  /** Whole-run problems that are not about one table. */
  readonly problems: readonly string[];
  readonly build: BuildReport | null;
  readonly ms: { readonly read: number; readonly load: number; readonly export: number; readonly total: number };
}

export interface RoundtripOptions {
  readonly dataDir?: string;
  /** The schema the data is held under. Default the repository's; a schema edit's export is round-tripped under the schema it brings. */
  readonly model?: SchemaModel;
  /** Test hook: runs on the rebuilt database before it is exported, to prove a fault in storage is caught. */
  readonly afterLoad?: (db: Db) => void;
}

const clip = (text: string): string => (text.length > 70 ? `${text.slice(0, 70)}...` : text);

/** Where two texts first differ, in words a reviewer can act on. */
export function firstDifference(file: string, exported: string): string {
  const a = file.split('\n');
  const b = exported.split('\n');
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return `line ${i + 1}: the file has ${JSON.stringify(clip(a[i] ?? ''))}, the export gives ${JSON.stringify(clip(b[i] ?? ''))}`;
  }
  return a.length === b.length ? 'the texts are equal' : `the file has ${a.length} line(s), the export ${b.length}`;
}

export function roundtrip(options: RoundtripOptions = {}): RoundtripResult {
  const t0 = performance.now();
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const model = options.model ?? BASE_MODEL;
  const inputs = readInputs(dataDir, model);
  const tRead = performance.now();
  const results: TableResult[] = [];
  const problems: string[] = [...inputs.general];

  if (inputs.problems.length) {
    // The data cannot be loaded, so nothing was exported: every table is reported as failed, with its own reason if it has one.
    for (const table of TABLE_NAMES) {
      const why = inputs.byTable.get(table);
      results.push({ table, status: why === undefined ? 'not-checked' : 'problem', rows: 0, bytes: 0, detail: why ?? 'not exported: other tables could not be read' });
    }
    for (const [table, why] of inputs.byTable) if (!isTableName(table)) results.push({ table, status: 'problem', rows: 0, bytes: 0, detail: why });
    return finish(results, problems, null, { read: tRead - t0, load: 0, export: 0, total: performance.now() - t0 });
  }

  const db = open(':memory:');
  try {
    const build = buildDatabase(db, inputs, model);
    options.afterLoad?.(db);
    const tLoad = performance.now();
    const present = new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all().map((row) => String(row.name)));
    for (const name of present) {
      if (!name.startsWith('sqlite_') && name !== '_meta' && !isTableName(name)) problems.push(`the database has a table ${name} that is not in the schema`);
    }
    for (const table of TABLE_NAMES) results.push(compareTable(db, table, present, inputs.tables.get(table)?.bytes, model));
    return finish(results, problems, build, { read: tRead - t0, load: tLoad - tRead, export: performance.now() - tLoad, total: performance.now() - t0 });
  } finally {
    db.close();
  }
}

function compareTable(db: Db, table: TableName, present: ReadonlySet<string>, bytes: Buffer | undefined, model: SchemaModel): TableResult {
  if (!bytes) return { table, status: 'problem', rows: 0, bytes: 0, detail: 'the CSV bytes were not read' };
  if (!present.has(table)) return { table, status: 'missing-table', rows: 0, bytes: bytes.length, detail: 'the rebuilt database has no such table' };
  const exported = exportTable(db, table, model);
  const rows = countRows(db, table);
  if (Buffer.from(exported, 'utf8').equals(bytes)) return { table, status: 'identical', rows, bytes: bytes.length, detail: '' };
  return { table, status: 'differs', rows, bytes: bytes.length, detail: firstDifference(bytes.toString('utf8'), exported) };
}

function finish(tables: TableResult[], problems: string[], build: BuildReport | null, ms: RoundtripResult['ms']): RoundtripResult {
  const identical = tables.filter((t) => t.status === 'identical').length;
  // All or nothing: one result per table of the schema (an extra table adds a result), every one identical, nothing else wrong.
  const ok = identical === TABLE_NAMES.length && tables.length === TABLE_NAMES.length && problems.length === 0 && build !== null;
  return { ok, expected: TABLE_NAMES.length, identical, tables, problems, build, ms };
}
