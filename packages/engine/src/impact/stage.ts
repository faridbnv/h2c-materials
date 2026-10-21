// Stage the snapshot, then a copy of it with a change set applied. One read of each table file feeds both its digest and
// its staged copy, so the digest names the very bytes the compile will read (a consistent snapshot); the working tree is
// never touched, and a preview of a change set never writes outside the staging directory.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TABLES, TABLE_NAMES } from '@atlas/data';
import type { TableName } from '@atlas/data';
import { csvText, parseCsv } from '@atlas/data/csv';
import type { ChangeRecord } from '@atlas/domain';

export class ImpactRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImpactRefusal';
  }
}

export interface StagedSnapshot {
  /** A directory holding `data/tables/*.csv`: the same bytes the digest names. */
  readonly dir: string;
  /** SHA-256 over the table names and file digests, in table order. */
  readonly digest: string;
  readonly files: ReadonlyMap<TableName, string>;
}

/**
 * One record of a change set as the preview reads it: the row it names, and the cells that row holds before and after.
 * `kind`, when given, says whether the row is new (`addMeasurement`) or must exist (any other); without it a row that is
 * not there and whose `before` is empty is appended.
 */
export type ImpactRecord = Pick<ChangeRecord, 'table' | 'recordId' | 'before' | 'after'> & { readonly kind?: string };

const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const tableFile = (dir: string, table: TableName) => join(dir, 'data', 'tables', `${table}.csv`);
const digestOf = (files: ReadonlyMap<TableName, string>): string =>
  sha256(TABLE_NAMES.map((table) => `${table} ${files.get(table) ?? ''}`).join('\n'));

function newStagingDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-impact-'));
  mkdirSync(join(dir, 'data', 'tables'), { recursive: true });
  return dir;
}

/** Remove a staging directory and everything in it. */
export function removeSnapshot(snapshot: StagedSnapshot): void {
  rmSync(snapshot.dir, { recursive: true, force: true });
}

/** Copy every table of `<root>/data/tables` into a new staging directory, reading each file once. */
export function stageSnapshot(root: string): StagedSnapshot {
  const present = new Set(readdirSync(join(root, 'data', 'tables')));
  const dir = newStagingDir();
  const files = new Map<TableName, string>();
  for (const table of TABLE_NAMES) {
    if (!present.has(`${table}.csv`)) throw new ImpactRefusal(`the snapshot at ${root} has no ${table}.csv`);
    const bytes = readFileSync(tableFile(root, table));
    writeFileSync(tableFile(dir, table), bytes);
    files.set(table, sha256(bytes));
  }
  return { dir, digest: digestOf(files), files };
}

const sameCell = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null);

/**
 * The staged tables with a change set's records applied, in a new directory (hard facts only: a record whose `before`
 * does not match the table now is stale and the whole preview is refused). A record names an existing row by the table's
 * key, and sets the cells it lists; a record naming no existing row appends one (an added measurement).
 */
export function applyRecords(base: StagedSnapshot, records: readonly ImpactRecord[]): StagedSnapshot {
  const dir = newStagingDir();
  try {
    const byTable = new Map<TableName, ImpactRecord[]>();
    for (const record of records) byTable.set(record.table, [...(byTable.get(record.table) ?? []), record]);
    const files = new Map<TableName, string>();
    for (const table of TABLE_NAMES) {
      const text = readFileSync(tableFile(base.dir, table), 'utf8');
      const edits = byTable.get(table);
      const next = edits ? editTable(table, text, edits) : text;
      writeFileSync(tableFile(dir, table), next);
      files.set(table, edits ? sha256(next) : (base.files.get(table) ?? ''));
    }
    return { dir, digest: digestOf(files), files };
  } catch (error) {
    // A refused change set leaves no copy of the tables behind.
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

function editTable(table: TableName, text: string, edits: readonly ImpactRecord[]): string {
  const key = TABLES[table].primaryKey;
  const [keyColumn] = key;
  if (key.length !== 1 || keyColumn === undefined) throw new ImpactRefusal(`${table} is keyed by ${key.join(' + ')}: a record id cannot name one of its rows yet`);
  const { header, records } = parseCsv(text, `${table}.csv`);
  const rows = records.map((r) => [...r.cells]);
  if (csvText(header, rows) !== text) throw new ImpactRefusal(`${table}.csv is not in canonical form, so a rewrite would change more than the record`);
  const column = (name: string): number => {
    const at = header.indexOf(name);
    if (at < 0) throw new ImpactRefusal(`${table} has no column "${name}"`);
    return at;
  };
  const keyAt = column(keyColumn);
  for (const edit of edits) {
    const hits = rows.filter((row) => row[keyAt] === edit.recordId);
    if (hits.length > 1) throw new ImpactRefusal(`${table} has ${hits.length} rows with ${keyColumn} ${edit.recordId}`);
    const row = hits[0];
    const appends = edit.kind === 'addMeasurement' || edit.kind === 'addRecord';
    if (row !== undefined && appends) throw new ImpactRefusal(`${table} ${edit.recordId}: the record adds a row, and the row is already there`);
    if (row === undefined) {
      if (edit.kind !== undefined && !appends) throw new ImpactRefusal(`${table} ${edit.recordId}: stale, the row is gone (a ${edit.kind} record needs the row it changes)`);
      if (Object.values(edit.before).some((v) => v !== null)) throw new ImpactRefusal(`${table} ${edit.recordId}: stale, the row is gone (the record expected cells there)`);
      const added = header.map((name) => (name === keyColumn ? edit.recordId : (edit.after[name] ?? null)));
      for (const name of Object.keys(edit.after)) column(name);
      rows.push(added);
      continue;
    }
    for (const [name, expected] of Object.entries(edit.before)) {
      if (!sameCell(row[column(name)], expected)) {
        throw new ImpactRefusal(`${table} ${edit.recordId}: stale, ${name} is ${JSON.stringify(row[column(name)])} now, the record expected ${JSON.stringify(expected)}`);
      }
    }
    for (const [name, value] of Object.entries(edit.after)) row[column(name)] = value;
  }
  return csvText(header, rows);
}
