// `db:diff -- --against <ref>` (WP-09): what the working database holds that a committed snapshot does not, record by record.
// The database is exported to its canonical cells and compared with data/tables/*.csv as they were at the git ref. After a
// fresh rebuild of a commit, the diff against that commit is 0; after an edit, it lists exactly the edit (pack 04 DP-17).
import { execFileSync } from 'node:child_process';
import { TABLE_NAMES, TABLES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import type { Db } from './driver.ts';
import { parseCsv } from './csv.ts';
import { REPO_ROOT } from './rebuild.ts';
import { storageOf, readCells } from './storage.ts';

export interface CellChange { readonly key: string; readonly column: string; readonly before: string | null; readonly after: string | null }

export interface TableDiff {
  readonly table: string;
  readonly status: 'unchanged' | 'changed' | 'added-table' | 'removed-table';
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changes: readonly CellChange[];
  readonly changedRecords: number;
  /** The same records in a different order (row order is data). */
  readonly reordered: boolean;
  readonly differences: number;
}

export interface DiffResult {
  readonly ref: string;
  readonly sha: string;
  readonly tables: readonly TableDiff[];
  readonly differences: number;
}

const git = (args: readonly string[], cwd: string): string => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

/** The commit a ref names, or a thrown error: a ref that does not resolve is never read as "no differences". */
export function resolveRef(ref: string, repo: string = REPO_ROOT): string {
  if (ref.startsWith('-')) throw new Error(`"${ref}" is not a git ref`);
  try {
    return git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], repo).trim();
  } catch {
    throw new Error(`"${ref}" is not a commit in this repository (git rev-parse --verify failed)`);
  }
}

type Cells = readonly (string | null)[];

function keyColumns(table: TableName): number[] {
  const info = TABLES[table];
  const names: readonly string[] = info.columns.map((c) => c.name);
  const key: readonly string[] = info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? names);
  return key.map((name) => names.indexOf(name));
}

/** Records by their key, in file order; a repeated key is told apart by an occurrence number. */
function byKey(table: TableName, rows: readonly Cells[]): { order: string[]; map: Map<string, Cells> } {
  const columns = keyColumns(table);
  const map = new Map<string, Cells>();
  const order: string[] = [];
  for (const row of rows) {
    const base = columns.map((k) => row[k] ?? '(empty)').join(' | ');
    let key = base;
    for (let n = 2; map.has(key); n++) key = `${base} #${n}`;
    map.set(key, row);
    order.push(key);
  }
  return { order, map };
}

export function compareRows(table: TableName, ours: readonly Cells[], theirs: readonly Cells[]): TableDiff {
  const header = storageOf(table).header;
  const a = byKey(table, ours);
  const b = byKey(table, theirs);
  const added = a.order.filter((k) => !b.map.has(k));
  const removed = b.order.filter((k) => !a.map.has(k));
  const changes: CellChange[] = [];
  const changedKeys = new Set<string>();
  for (const [key, row] of a.map) {
    const was = b.map.get(key);
    if (!was) continue;
    header.forEach((column, k) => {
      if ((row[k] ?? null) !== (was[k] ?? null)) { changes.push({ key, column, before: was[k] ?? null, after: row[k] ?? null }); changedKeys.add(key); }
    });
  }
  const common = (order: readonly string[], other: Map<string, Cells>) => order.filter((k) => other.has(k));
  const left = common(a.order, b.map);
  const right = common(b.order, a.map);
  const reordered = left.some((k, i) => k !== right[i]);
  const differences = added.length + removed.length + changedKeys.size + (reordered ? 1 : 0);
  return { table, status: differences ? 'changed' : 'unchanged', added, removed, changes, changedRecords: changedKeys.size, reordered, differences };
}

/** Compare the database's tables with the committed CSV at `ref` of the git repository `repo`. Every table of the schema is compared; none is skipped. */
export function diffAgainstRef(db: Db, ref: string, repo: string = REPO_ROOT): DiffResult {
  const sha = resolveRef(ref, repo);
  const listed = git(['ls-tree', '-r', '--name-only', sha, '--', 'data/tables'], repo).split('\n').filter(Boolean);
  if (!listed.length) throw new Error(`${ref} (${sha.slice(0, 8)}) has no data/tables: it is not a data snapshot`);
  const atRef = new Set(listed.filter((f) => f.endsWith('.csv')).map((f) => f.slice('data/tables/'.length, -4)));
  const tables: TableDiff[] = [];
  for (const table of TABLE_NAMES) {
    if (!atRef.has(table)) {
      const rows = [...readCells(db, table)];
      tables.push({ table, status: 'added-table', added: rows.map((r) => r[0] ?? ''), removed: [], changes: [], changedRecords: 0, reordered: false, differences: 1 });
      continue;
    }
    const theirs = parseCsv(git(['show', `${sha}:data/tables/${table}.csv`], repo), `${sha.slice(0, 8)}:data/tables/${table}.csv`);
    const want = storageOf(table).header;
    if (theirs.header.length !== want.length || theirs.header.some((h, k) => h !== want[k])) {
      throw new Error(`${table}: the columns at ${ref} differ from the schema's, so the two cannot be compared record by record; run types:gen on that commit's schema first`);
    }
    tables.push(compareRows(table, [...readCells(db, table)], theirs.records.map((r) => r.cells)));
  }
  for (const name of atRef) {
    if (!TABLE_NAMES.some((t) => t === name)) tables.push({ table: name, status: 'removed-table', added: [], removed: [], changes: [], changedRecords: 0, reordered: false, differences: 1 });
  }
  return { ref, sha, tables, differences: tables.reduce((sum, t) => sum + t.differences, 0) };
}
