// Clean reconstruction (WP-09; pack 04 section 8): a fresh SQLite database from the committed CSV files, the generated DDL
// and the views, with nothing carried over from any earlier workspace. SQLite is never a second master: this reads
// data/tables and data/manifest.json and writes only a disposable file (.workspace/atlas.sqlite, git-ignored).
//
// What makes it a reconstruction and not a copy: every table must exist and match the manifest's row count and SHA-256;
// every row must satisfy STRICT types, CHECK constraints (vocabularies, patterns, number shapes) and foreign keys;
// `_ord` must run 1..n; `integrity_check` must say ok. Any failure stops the rebuild and names the file, line and record;
// the file already in place is left untouched (the new one is built beside it and renamed into place only when complete).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { constraintKind, open } from './driver.ts';
import type { Db } from './driver.ts';
import { CsvError, parseCsv } from './csv.ts';
import type { CsvRecord } from './csv.ts';
import { BASE_MODEL, REPO_ROOT, STORAGE_DDL } from './schema-model.ts';
import type { SchemaModel } from './schema-model.ts';
import { countRows, headerMatches, isTableName, quoteIdent, storageOf } from './storage.ts';

export { REPO_ROOT, STORAGE_DDL };
export const DEFAULT_DATA_DIR = join(REPO_ROOT, 'data');
export const WORKSPACE_DB = join(REPO_ROOT, '.workspace/atlas.sqlite');
const VIEWS_DIR = join(REPO_ROOT, 'db/views');
const MAX_PROBLEMS = 20;
/** Throws on a byte sequence that is not UTF-8, instead of replacing it: a replaced byte would hide a damaged file from the compare. */
const UTF8 = new TextDecoder('utf-8', { fatal: true });

export const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');

/** The committed data does not satisfy the schema, the manifest or the database's constraints. Every problem found is listed. */
export class DataInputError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[], options?: ErrorOptions) {
    const shown = problems.slice(0, MAX_PROBLEMS);
    super(`${problems.length} problem(s) in the data:\n${shown.map((p) => `  ${p}`).join('\n')}${problems.length > shown.length ? `\n  ... and ${problems.length - shown.length} more` : ''}`, options);
    this.name = 'DataInputError';
    this.problems = problems;
  }
}

export interface TableInput {
  readonly table: TableName;
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly records: readonly CsvRecord[];
}

export interface Inputs {
  /** Tables that read and parsed; a table with a problem is absent. */
  readonly tables: ReadonlyMap<TableName, TableInput>;
  /** Everything wrong with the inputs, across all tables: empty means the data may be loaded. */
  readonly problems: readonly string[];
  /** Per table that has a problem, what it is (for a per-table report). */
  readonly byTable: ReadonlyMap<string, string>;
  /** Problems that belong to no one table (the manifest). */
  readonly general: readonly string[];
  readonly manifestSha256: string | null;
}

interface Manifest { readonly tables: Readonly<Record<string, { readonly rows: number; readonly sha256: string }>> }

const isManifest = (value: unknown): value is Manifest =>
  typeof value === 'object' && value !== null && 'tables' in value && typeof value.tables === 'object' && value.tables !== null;

/** Read data/tables/*.csv and data/manifest.json under `dataDir` and check them against the schema's table list. */
export function readInputs(dataDir: string, model: SchemaModel = BASE_MODEL): Inputs {
  const problems: string[] = [];
  const general: string[] = [];
  const byTable = new Map<string, string>();
  const note = (message: string): void => { problems.push(message); general.push(message); };
  const fail = (table: string, message: string): void => { problems.push(`${table}: ${message}`); byTable.set(table, message); };
  const tables = new Map<TableName, TableInput>();
  const tableDir = join(dataDir, 'tables');
  const files = existsSync(tableDir) ? readdirSync(tableDir).filter((f) => f.endsWith('.csv')).map((f) => f.slice(0, -4)) : [];
  for (const name of files) if (!isTableName(name)) fail(name, 'data/tables has a CSV file that is not a table of the schema');

  let manifest: Manifest | null = null;
  let manifestSha256: string | null = null;
  const manifestPath = join(dataDir, 'manifest.json');
  if (!existsSync(manifestPath)) note('manifest.json: missing');
  else {
    const bytes = readFileSync(manifestPath);
    manifestSha256 = sha256(bytes);
    try {
      const parsed: unknown = JSON.parse(bytes.toString('utf8'));
      if (isManifest(parsed)) manifest = parsed; else note('manifest.json: has no "tables" object');
    } catch (error) {
      note(`manifest.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (manifest) {
    for (const name of Object.keys(manifest.tables)) if (!isTableName(name)) fail(name, 'the manifest lists a table that is not in the schema');
  }

  for (const table of TABLE_NAMES) {
    const path = join(tableDir, `${table}.csv`);
    if (!existsSync(path)) { fail(table, 'the CSV file is missing'); continue; }
    const bytes = readFileSync(path);
    let parsed;
    try {
      parsed = parseCsv(UTF8.decode(bytes), `data/tables/${table}.csv`);
    } catch (error) {
      if (error instanceof CsvError) fail(table, error.message);
      else if (error instanceof TypeError) fail(table, 'the file is not valid UTF-8');
      else throw error;
      continue;
    }
    if (!headerMatches(table, parsed.header, model)) {
      fail(table, `the header is [${parsed.header.join(' | ')}] but the schema's columns are [${storageOf(table, model).header.join(' | ')}]`);
      continue;
    }
    const digest = sha256(bytes);
    const entry = manifest?.tables[table];
    if (manifest && !entry) { fail(table, 'the manifest does not list this table'); continue; }
    if (entry && entry.sha256 !== digest) { fail(table, `SHA-256 ${digest.slice(0, 12)} differs from the manifest's ${String(entry.sha256).slice(0, 12)} (a hand edit without npm run data:fmt?)`); continue; }
    if (entry && entry.rows !== parsed.records.length) { fail(table, `${parsed.records.length} rows but the manifest says ${entry.rows}`); continue; }
    tables.set(table, { table, bytes, sha256: digest, records: parsed.records });
  }
  return { tables, problems, byTable, general, manifestSha256 };
}

// ---------------------------------------------------------------- the load

const META_DDL = 'CREATE TABLE "_meta" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL) STRICT;';

export interface BuildReport {
  readonly tables: readonly { readonly table: TableName; readonly rows: number; readonly bytes: number; readonly sha256: string }[];
  readonly rows: number;
  readonly views: readonly { readonly view: string; readonly rows: number }[];
  /** Every check that ran and what it found; a check that did not run is not listed. */
  readonly checks: readonly string[];
  readonly stamp: Readonly<Record<string, string>>;
  readonly ms: { readonly read: number; readonly load: number; readonly verify: number; readonly total: number };
}

function readViewSql(): string[] {
  return readdirSync(VIEWS_DIR).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(VIEWS_DIR, f), 'utf8'));
}

export function schemaDigest(): string {
  const hash = createHash('sha256');
  for (const sub of ['tables', 'vocab']) {
    const dir = join(REPO_ROOT, 'schema', sub);
    for (const f of readdirSync(dir).sort()) hash.update(`${sub}/${f}\0`).update(readFileSync(join(dir, f))).update('\n');
  }
  return hash.digest('hex');
}

/** The commit the working tree is on and whether the files a rebuild reads are exactly that commit's; the reason if git cannot say. */
function gitState(): { commit: string; tree: string } {
  const git = (...args: string[]): string => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    const commit = git('rev-parse', 'HEAD');
    return { commit, tree: git('status', '--porcelain', '--', 'data', 'schema', 'db', 'packages') === '' ? 'clean' : 'dirty' };
  } catch (error) {
    const why = error instanceof Error ? error.message.split('\n')[0] : String(error);
    return { commit: 'unknown', tree: `unknown (git failed: ${why})` };
  }
}

export interface BuildOptions {
  /** Create db/views too (default). A measurement over old snapshots, whose columns the current views may not know, turns them off. */
  readonly views?: boolean;
}

/** Create the views of db/views and prove each can be queried; returns them with their row counts. */
export function createViews(db: Db): { readonly viewSql: readonly string[]; readonly views: { readonly view: string; readonly rows: number }[] } {
  const viewSql = readViewSql();
  for (const sql of viewSql) db.exec(sql);
  const views = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'view' ORDER BY name").all().map((row) => {
    const name = String(row.name);
    return { view: name, rows: countRows(db, name) };
  });
  if (views.length !== viewSql.length) throw new DataInputError([`db/views has ${viewSql.length} files but the database has ${views.length} views`]);
  return { viewSql, views };
}

/** Load the inputs into an empty database and verify everything. Throws DataInputError on any problem. */
export function buildDatabase(db: Db, inputs: Inputs, model: SchemaModel = BASE_MODEL, options: BuildOptions = {}): BuildReport {
  if (inputs.problems.length) throw new DataInputError(inputs.problems);
  const t0 = performance.now();
  const checks: string[] = [];
  const storageDdl = model.storageDdl;
  db.exec(storageDdl);
  db.exec(META_DDL);

  const problems: string[] = [];
  db.transaction((tx) => {
    tx.exec('PRAGMA defer_foreign_keys = ON');
    for (const table of TABLE_NAMES) {
      const input = inputs.tables.get(table);
      if (!input) throw new Error(`internal: ${table} passed the input checks but has no data`);
      const storage = storageOf(table, model);
      const insert = tx.prepare(storage.insertSql);
      input.records.forEach((record, k) => {
        try {
          insert.run(...storage.encode(k + 1, record.cells));
        } catch (error) {
          // A constraint failure is a problem with the data, collected so one run lists them all. Anything else (disk full,
          // out of memory, a bug) is not the data's fault and stops the run as a crash.
          if (constraintKind(error) === null) throw error;
          problems.push(`data/tables/${table}.csv:${record.line} (${record.cells[0] ?? 'empty first cell'}): ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`);
        }
      });
    }
    if (!problems.length) problems.push(...foreignKeyProblems(tx, inputs, model));
    if (problems.length) throw new DataInputError(problems);
  });
  checks.push(`loaded ${TABLE_NAMES.length} tables under STRICT types, CHECK constraints and foreign keys (${inputs.tables.size} of ${TABLE_NAMES.length} inputs)`);
  const t1 = performance.now();

  const verifyProblems = verifyStored(db, inputs, checks);
  if (verifyProblems.length) throw new DataInputError(verifyProblems);
  const { viewSql, views } = options.views === false ? { viewSql: [], views: [] } : createViews(db);
  checks.push(options.views === false ? 'views not created (an old snapshot)' : `${views.length} views created and queried`);

  const rows = [...inputs.tables.values()].reduce((sum, t) => sum + t.records.length, 0);
  const info = db.info();
  const git = gitState();
  const stamp: Record<string, string> = {
    commit: git.commit,
    tree: git.tree,
    manifest_sha256: inputs.manifestSha256 ?? 'unknown',
    schema_sha256: model.digest,
    storage_ddl_sha256: sha256(storageDdl),
    // What the repository's own schema is, beside the schema this database holds: they differ only after a schemaEdit (WP-17). The open check
    // compares the repository's, so a workspace whose schema a pending edit changed is not mistaken for one that is behind Git.
    base_schema_sha256: BASE_MODEL.digest,
    base_storage_ddl_sha256: sha256(BASE_MODEL.storageDdl),
    ...(Object.keys(model.overlay).length ? { schema_overlay: JSON.stringify(model.overlay) } : {}),
    views_sha256: sha256(viewSql.join('\0')),
    sqlite_version: info.sqlite,
    node_version: info.node,
    driver_class: info.className,
    tables: String(TABLE_NAMES.length),
    rows: String(rows),
  };
  const putMeta = db.prepare('INSERT INTO "_meta" ("key", "value") VALUES (?, ?)');
  db.transaction(() => { for (const [key, value] of Object.entries(stamp)) putMeta.run(key, value); });
  const t2 = performance.now();

  return {
    tables: TABLE_NAMES.map((table) => {
      const input = inputs.tables.get(table);
      return { table, rows: input?.records.length ?? 0, bytes: input?.bytes.length ?? 0, sha256: input?.sha256 ?? '' };
    }),
    rows,
    views,
    checks,
    stamp,
    ms: { read: 0, load: t1 - t0, verify: t2 - t1, total: t2 - t0 },
  };
}

/** Rows whose reference has no parent, named by file line, column and value. */
function foreignKeyProblems(db: Db, inputs: Inputs, model: SchemaModel): string[] {
  const out: string[] = [];
  const violations = db.prepare('PRAGMA foreign_key_check').all();
  for (const violation of violations.slice(0, MAX_PROBLEMS)) {
    const table = String(violation.table);
    const parent = String(violation.parent);
    const rowid = violation.rowid;
    const link = db.prepare(`PRAGMA foreign_key_list(${quoteIdent(table)})`).all().find((row) => row.id === violation.fkid);
    const column = String(link?.from);
    const value = typeof rowid === 'number' ? db.prepare(`SELECT ${quoteIdent(column)} AS v FROM ${quoteIdent(table)} WHERE rowid = ?`).get(rowid)?.v : undefined;
    const known = isTableName(table) ? table : undefined;
    const line = known && typeof rowid === 'number' ? inputs.tables.get(known)?.records[rowid - 1]?.line : undefined;
    const header = known ? model.tables[known].columns.find((c) => c.sqlName === column)?.name : undefined;
    out.push(`data/tables/${table}.csv:${line ?? '?'}: ${header ?? column} "${String(value)}" has no row in ${parent}`);
  }
  if (violations.length > MAX_PROBLEMS) out.push(`${violations.length - MAX_PROBLEMS} more foreign key violation(s) not described`);
  return out;
}

/** Checks on the stored database itself. Appends what passed to `checks`; returns what failed. */
function verifyStored(db: Db, inputs: Inputs, checks: string[]): string[] {
  const problems: string[] = [];
  let strict = 0;
  for (const row of db.prepare('PRAGMA table_list').all()) {
    const name = String(row.name);
    if (row.schema !== 'main' || name.startsWith('sqlite_') || name === '_meta') continue;
    if (!isTableName(name)) problems.push(`the database has a table ${name} that is not in the schema`);
    else if (row.strict === 1) strict++;
    else problems.push(`${name} is not a STRICT table`);
  }
  if (strict !== TABLE_NAMES.length) problems.push(`${strict} of ${TABLE_NAMES.length} tables are STRICT`);
  else checks.push(`STRICT: ${strict}/${TABLE_NAMES.length} tables`);

  for (const table of TABLE_NAMES) {
    const got = db.prepare(`SELECT count(*) AS n, min(_ord) AS lo, max(_ord) AS hi FROM ${quoteIdent(table)}`).get();
    const want = inputs.tables.get(table)?.records.length;
    if (!got || got.n !== want) problems.push(`${table}: ${String(got?.n)} rows stored, ${String(want)} in the file`);
    else if (want && (got.lo !== 1 || got.hi !== want)) problems.push(`${table}: _ord runs ${String(got.lo)}..${String(got.hi)}, not 1..${want}`);
  }
  if (!problems.length) checks.push(`row counts and _ord 1..n equal the files and the manifest for ${TABLE_NAMES.length} tables; ${TABLE_NAMES.length} SHA-256 digests equal the manifest`);

  const integrity = db.prepare('PRAGMA integrity_check').all().map((row) => String(Object.values(row)[0]));
  if (integrity.length === 1 && integrity[0] === 'ok') checks.push('integrity_check: ok');
  else problems.push(...integrity.map((line) => `integrity_check: ${line}`));
  const dangling = db.prepare('PRAGMA foreign_key_check').all().length;
  if (dangling === 0) checks.push('foreign_key_check: 0 violations');
  else problems.push(`foreign_key_check: ${dangling} violation(s)`);
  return problems;
}

// ---------------------------------------------------------------- entry points

/** A complete database in memory, for the round trip and for tests. */
export function buildInMemory(dataDir: string = DEFAULT_DATA_DIR, model: SchemaModel = BASE_MODEL, options: BuildOptions = {}): { db: Db; report: BuildReport; inputs: Inputs } {
  const t0 = performance.now();
  const inputs = readInputs(dataDir, model);
  const read = performance.now() - t0;
  const db = open(':memory:');
  try {
    const report = buildDatabase(db, inputs, model, options);
    return { db, inputs, report: { ...report, ms: { ...report.ms, read, total: report.ms.total + read } } };
  } catch (error) {
    db.close();
    throw error;
  }
}

function flushToDisk(path: string): void {
  const fd = openSync(path, 'r+');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

/** Remove `<db>.partial-<pid>` files left by a rebuild that was killed; one whose process is still alive is another rebuild and stays. */
function removeAbandonedPartials(dbPath: string): void {
  const prefix = `${basename(dbPath)}.partial-`;
  for (const name of readdirSync(dirname(dbPath))) {
    if (!name.startsWith(prefix)) continue;
    const pid = Number.parseInt(name.slice(prefix.length), 10);
    let alive = false;
    try { process.kill(pid, 0); alive = true; } catch (error) { alive = error instanceof Error && 'code' in error && error.code === 'EPERM'; } // EPERM: it exists, and is someone else's
    if (!alive) rmSync(join(dirname(dbPath), name), { force: true });
  }
}

/**
 * Rebuild the workspace file from scratch: build beside it, verify, then rename into place. A failure leaves the file that
 * was there untouched and removes the partial one. The file it replaces is thrown away with its journal and WAL: a workspace
 * that holds drafts is backed up by the write service (WP-10) before it is rebuilt.
 */
export function rebuildWorkspace(options: { readonly dataDir?: string; readonly dbPath?: string; readonly model?: SchemaModel } = {}): BuildReport & { readonly dbPath: string } {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const model = options.model ?? BASE_MODEL;
  const dbPath = options.dbPath ?? WORKSPACE_DB;
  const t0 = performance.now();
  const inputs = readInputs(dataDir, model);
  const read = performance.now() - t0;
  mkdirSync(dirname(dbPath), { recursive: true });
  removeAbandonedPartials(dbPath);
  const partial = `${dbPath}.partial-${process.pid}`;
  const sidecars = (path: string): string[] => [path, `${path}-journal`, `${path}-wal`, `${path}-shm`];
  for (const file of sidecars(partial)) rmSync(file, { force: true });
  const db = open(partial);
  try {
    // The file is disposable until it is renamed into place, so the bulk load skips the journal and the syncs.
    db.exec('PRAGMA journal_mode = OFF');
    db.exec('PRAGMA synchronous = OFF');
    const report = buildDatabase(db, inputs, model);
    db.close();
    flushToDisk(partial); // the load ran with synchronous = OFF; a crash after the rename must not leave a torn file in place
    for (const file of sidecars(dbPath)) rmSync(file, { force: true }); // a stale -wal beside a new file could be replayed onto it
    renameSync(partial, dbPath);
    return { ...report, dbPath, ms: { ...report.ms, read, total: report.ms.total + read } };
  } catch (error) {
    db.close();
    for (const file of sidecars(partial)) rmSync(file, { force: true });
    throw error;
  }
}
