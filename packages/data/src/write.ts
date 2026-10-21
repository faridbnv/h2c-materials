// The write service's command pipeline (WP-10; pack 04 sections 5 and 7, 02 section 9.1).
//
// One command, one SQLite transaction: the same opId twice is applied once; the base and the expectation are checked; every
// guard runs; all the related cells are written together; one change record is appended; then COMMIT. A refusal changes
// nothing and says why (a code and the words to act on). Anything that is not a refusal (a disk error, a bug) is thrown, never
// returned as a result: a command that did not complete must not look as if it did.
//
// Only `correctValue` runs in v1; every other kind is refused as `unsupported-kind` until WP-17 adds it.
//
// The guards, ported from the old apply path (scripts/lib/source-edits.mjs, scripts/data/table-io.mjs, scripts/ingest/apply.mjs):
//   expect names the value it replaces        table-io `expect`, source-edits `correct`   stale, expectation-empty, expectation-partial
//   the record cites the evidence's source    source-edits `correct`                      evidence-source-mismatch
//   hash, retrieved and cited                 apply APPLY-HASH                            source-hash-mismatch, source-not-retrieved
//   the quote is on the hash-checked page     apply APPLY-NUMBER-NOT-ON-PAGE              quote-not-on-page (not run without the store)
//   the value is a number its line prints     apply APPLY-VALUE-NOT-IN-EVIDENCE/-ROLE     value-not-printed
//   normalized unit is the property's         apply APPLY-UNIT                            unit-mismatch
//   nothing is deleted, a key is never moved  table-io `set` on a primary key             delete-refused
import type {
  CanonicalCells, ChangeLogEntry, ChangeRecord, CommandResult, CorrectValueCommand, CurrentState, EvidenceRef, Expectation, QuoteCheck,
  RefusalCode, Sha256, WriteCommand,
} from '@atlas/domain/contracts';
import { canonicalJson, changeRecordIdOf, isOpId, isSha256, rowHash, sha256Of } from './digest.ts';
import type { Json } from './digest.ts';
import { constraintKind } from './driver.ts';
import type { Db } from './driver.ts';
import { countInEvidence, isNumberCell, quoteOnPage, valueInEvidence } from './evidence.ts';
import type { PageTextStore } from './evidence.ts';
import { TABLES } from './generated/columns.ts';
import type { ColumnInfo, TableName } from './generated/columns.ts';
import { parseChangeRecord, parseCommand } from './parse.ts';
import type { Parsed } from './parse.ts';
import { assignmentsOf, isTableName, quoteIdent, readRow, storageOf, textExpression } from './storage.ts';

// ---------------------------------------------------------------- the workspace tables (04 section 4.3)

/** Workspace-only tables: not in the CSV snapshot, created after the rebuild. `change_log` is the journal; drafts live in it. */
const WORKSPACE_DDL = `
CREATE TABLE "change_log" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "op_id" TEXT NOT NULL UNIQUE,
  "change_record_id" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL CHECK ("status" IN ('draft', 'exported', 'merged')),
  "command_sha256" TEXT NOT NULL,
  "command_json" TEXT NOT NULL,
  "record_json" TEXT NOT NULL,
  "table_name" TEXT NOT NULL,
  "record_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "applied_at" TEXT NOT NULL,
  "change_set_id" TEXT
) STRICT;
CREATE TABLE "change_conflicts" (
  "op_id" TEXT NOT NULL PRIMARY KEY,
  "command_json" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "found_at" TEXT NOT NULL
) STRICT;
`;

export const RULE_TABLES: ReadonlySet<TableName> = new Set<TableName>(['class_limits', 'conversions', 'chamber_bands', 'chamber_need', 'plausibility_windows']);

export function putMeta(db: Db, key: string, value: string): void {
  db.prepare('INSERT INTO "_meta" ("key", "value") VALUES (?, ?) ON CONFLICT ("key") DO UPDATE SET "value" = excluded."value"').run(key, value);
}

export function readMeta(db: Db, key: string): string | undefined {
  const value = db.prepare('SELECT "value" FROM "_meta" WHERE "key" = ?').get(key)?.value;
  return typeof value === 'string' ? value : undefined;
}

/** Create the workspace tables and record the approved base's snapshot digest in the stamp. */
export function initWorkspaceTables(db: Db, snapshotDigest: Sha256): void {
  db.transaction((tx) => {
    tx.exec(WORKSPACE_DDL);
    putMeta(tx, 'snapshot_digest', snapshotDigest);
  });
}

export interface BaseStamp { readonly snapshotDigest: Sha256; readonly commit: string; readonly schemaSha256: Sha256 }

function stampDigest(db: Db, key: string, what: string): Sha256 {
  const value = readMeta(db, key);
  if (value === undefined || !isSha256(value)) throw new Error(`the workspace has no ${what} (_meta.${key}); rebuild it with npm run db:rebuild`);
  return value;
}

export function baseStampOf(db: Db): BaseStamp {
  return {
    snapshotDigest: stampDigest(db, 'snapshot_digest', 'base stamp'),
    commit: readMeta(db, 'commit') ?? 'unknown',
    schemaSha256: stampDigest(db, 'schema_sha256', 'schema digest'),
  };
}

// ---------------------------------------------------------------- context and results

export type MergedOps = ReadonlyMap<string, ChangeRecord>;

export interface WriteContext {
  readonly db: Db;
  /** The private text store; null when there is none, and then a quote is "not run", never "verified". */
  readonly store: PageTextStore | null;
  /** The IDs of docs/next/rulings.csv. */
  readonly rulings: ReadonlySet<string>;
  /** opId to the record of everything already in a merged change set (04 section 3, mechanism 2). */
  readonly mergedOps: MergedOps;
  readonly now: () => Date;
}

export interface ApplyOptions {
  /** Replaying a draft onto a newer approved base (the open check, drafts:import): the stale-base check is skipped and the record takes the new base; `expect` still decides. */
  readonly rebase?: boolean;
}

class Refusal extends Error {
  readonly code: Exclude<RefusalCode, 'stale'>;
  constructor(code: Exclude<RefusalCode, 'stale'>, detail: string) {
    super(detail);
    this.name = 'Refusal';
    this.code = code;
  }
}

class StaleRefusal extends Error {
  readonly expected: Expectation;
  readonly current: CurrentState;
  constructor(detail: string, expected: Expectation, current: CurrentState) {
    super(detail);
    this.name = 'StaleRefusal';
    this.expected = expected;
    this.current = current;
  }
}

const resultOf = (error: Refusal | StaleRefusal): CommandResult =>
  error instanceof StaleRefusal
    ? { status: 'refused', code: 'stale', detail: error.message, expected: error.expected, current: error.current }
    : { status: 'refused', code: error.code, detail: error.message };

// ---------------------------------------------------------------- helpers

/** What a value is, for a message: the text in quotes, or "empty". */
const shown = (cell: string | null): string => (cell === null ? 'empty' : JSON.stringify(cell));

/** A cell by column name; a column the cells do not hold reads as empty. */
const cellAt = (cells: CanonicalCells, name: string): string | null => cells[name] ?? null;

function columnOf(table: TableName, name: string): ColumnInfo | undefined {
  return TABLES[table].columns.find((c) => c.name === name);
}

const isNumericColumn = (column: ColumnInfo): boolean => column.type === 'number' || column.type === 'integer';

/** The columns that identify a record: its primary key and every declared unique key. */
function keyColumns(table: TableName): ReadonlySet<string> {
  const info = TABLES[table];
  return new Set([...info.primaryKey, ...info.uniqueKeys.flat()]);
}

function plainJson(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item: unknown) => plainJson(item));
  if (typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value)) if (item !== undefined) out[key] = plainJson(item);
    return out;
  }
  throw new Error(`a command holds a ${typeof value}, which JSON cannot carry`);
}

/** The canonical JSON of a command; its digest is what "the same opId with the same content" means. */
function commandJson(command: WriteCommand): string { return canonicalJson(plainJson(command)); }

/** The row a target names: its `_ord`, or null. The ID is the primary key, or the first unique key's values joined by " | ". */
function locate(db: Db, table: TableName, id: string): number | null {
  const info = TABLES[table];
  const key = info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? []);
  if (key.length === 0) throw new Refusal('unknown-target', `${table} has no primary or unique key to address a record by`);
  const parts = key.length === 1 ? [id] : id.split(' | ');
  if (parts.length !== key.length) throw new Refusal('unknown-target', `${table} is addressed by ${key.join(' | ')}; "${id}" gives ${parts.length} value(s) separated by " | "`);
  const where = key.map((name) => `${textExpression(table, name)} = ?`).join(' AND ');
  const rows = db.prepare(`SELECT _ord FROM ${quoteIdent(table)} WHERE ${where}`).all(...parts);
  if (rows.length > 1) throw new Refusal('unknown-target', `${table} "${id}" names ${rows.length} records; a record must be addressed by exactly one`);
  const ord = rows[0]?._ord;
  return typeof ord === 'number' ? ord : null;
}

const NOTES_TOKENS: readonly RegExp[] = [
  /(?<![A-Za-z0-9])m\d{2,4}(?![A-Za-z0-9])/g, // a migration, "m413"
  /(?<![A-Za-z0-9-])\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4}(?![A-Za-z0-9-])/g, // a change set, "2026-11-04-pla-basic-density-7f3a"
  /CR-[0-7][0-9A-HJKMNP-TV-Z]{25}/g, // a change record
];

const idTokensIn = (text: string): string[] => NOTES_TOKENS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0]));

/** Identifier tokens in `text` that `previous` does not already carry (count for count): the dated correction note stays; an ID does not. */
function newIdTokens(previous: string | null, text: string): string[] {
  const seen = new Map<string, number>();
  for (const token of idTokensIn(previous ?? '')) seen.set(token, (seen.get(token) ?? 0) + 1);
  const fresh: string[] = [];
  for (const token of idTokensIn(text)) {
    const left = seen.get(token) ?? 0;
    if (left > 0) seen.set(token, left - 1); else fresh.push(token);
  }
  return fresh;
}

// The measurements guards (04 section 5.1). Names are the schema's.
const RAW_NAMES: readonly string[] = ['Raw numeric', 'Raw uncertainty ±', 'Raw upper bound'];
const ROLE_FIELDS: readonly string[] = [...RAW_NAMES, 'Anneal °C', 'Anneal h', 'Test temperature °C'];
const TOGETHER: readonly (readonly string[])[] = [['Raw value', 'Raw numeric', 'Normalized value']];
const NUMBER_SHAPE = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

// ---------------------------------------------------------------- the pipeline

/**
 * Run one command. Returns applied, duplicate or refused; throws for anything that is not a refusal. `applied` means the
 * transaction committed and the cells read back as written.
 */
export function applyCommand(ctx: WriteContext, command: WriteCommand, options: ApplyOptions = {}): CommandResult {
  try {
    return ctx.db.transaction(() => run(ctx, command, options));
  } catch (error) {
    if (error instanceof Refusal || error instanceof StaleRefusal) return resultOf(error);
    throw error;
  }
}

function run(ctx: WriteContext, command: WriteCommand, options: ApplyOptions): CommandResult {
  const { db } = ctx;
  if (!isOpId(command.opId)) throw new Refusal('opid-invalid', `opId ${JSON.stringify(command.opId)} is not a ULID (26 characters of Crockford base32)`);
  if (command.kind !== 'correctValue') throw new Refusal('unsupported-kind', `${command.kind} is not run by write service v1 (only correctValue is); WP-17 adds the other kinds`);
  const stamp = baseStampOf(db);

  // 1. Idempotency (04 section 7): a retried opId writes nothing, and says what it was before.
  const digest = sha256Of(commandJson(command));
  const earlier = earlierResult(ctx, command, digest, stamp);
  if (earlier !== null) return earlier;

  // 2. The command itself.
  const { table, id } = command.target;
  if (!isTableName(table)) throw new Refusal('unknown-target', `${JSON.stringify(table)} is not a table of the schema`);
  if (typeof id !== 'string' || id === '') throw new Refusal('unknown-target', 'a correction names the record it changes (target.id)');
  const names = Object.keys(command.set);
  if (names.length === 0) throw new Refusal('no-change', 'set is empty: a correction sets at least one cell');
  for (const name of names) {
    if (!columnOf(table, name)) throw new Refusal('unknown-target', `${table} has no column "${name}"`);
    const value = command.set[name];
    if (value !== null && (typeof value !== 'string' || value === '' || value !== value.trim())) {
      throw new Refusal('not-canonical', `${table}.${name}: ${JSON.stringify(value)} is not canonical cell text (trimmed text, or null for an empty cell)`);
    }
  }

  // 3. The expectation is required, and names the value of every cell being replaced (04 section 5; table-io `expect`).
  const { rowHash: wantHash, cells: wantCells, schemaDigest: wantSchema } = command.expect;
  const wantNames = Object.keys(wantCells ?? {});
  if (wantHash === undefined && wantNames.length === 0 && wantSchema === undefined) throw new Refusal('expectation-empty', 'expect names nothing to check: give the row hash or the cells as the writer saw them');
  const unnamed = wantHash === undefined ? names.filter((name) => !wantNames.includes(name)) : [];
  if (unnamed.length) throw new Refusal('expectation-partial', `expect does not name the value of ${unnamed.join(', ')}; every cell a correction replaces is named, or the row hash is given`);
  for (const name of wantNames) if (!columnOf(table, name)) throw new Refusal('unknown-target', `${table} has no column "${name}" (named in expect)`);

  // 4. Stale: the approved base, the schema, then the record (04 section 7: STALE_BASE, STALE_EXPECT).
  const rebase = options.rebase === true;
  if (!rebase && command.base.snapshotDigest !== stamp.snapshotDigest) {
    throw new Refusal('stale-base', `the command was written against snapshot ${command.base.snapshotDigest.slice(0, 12)} (commit ${command.base.commit.slice(0, 12)}); this workspace's approved base is ${stamp.snapshotDigest.slice(0, 12)} (commit ${stamp.commit.slice(0, 12)}). Reopen the workspace so the open check runs, then write the correction against what it holds`);
  }
  const noRecord = { rowHash: null, cells: null, schemaDigest: stamp.schemaSha256 };
  if (wantSchema !== undefined && wantSchema !== stamp.schemaSha256) {
    throw new StaleRefusal(`the schema moved: the command expected ${wantSchema.slice(0, 12)}, the workspace holds ${stamp.schemaSha256.slice(0, 12)}`, command.expect, noRecord);
  }
  const ord = locate(db, table, id);
  const cellsNow = ord === null ? null : readRow(db, table, ord);
  if (ord === null || cellsNow === null) {
    throw new StaleRefusal(`${table} has no record "${id}": it was never there on this base, or the ID is wrong`, command.expect, noRecord);
  }
  const current: CanonicalCells = Object.fromEntries(storageOf(table).header.map((name, k) => [name, cellsNow[k] ?? null]));
  const currentHash = rowHash(table, cellsNow);
  const moved: string[] = [];
  if (wantHash !== undefined && wantHash !== currentHash) moved.push(`the record's hash is ${currentHash.slice(0, 12)}, not the expected ${wantHash.slice(0, 12)}`);
  for (const [name, expected] of Object.entries(wantCells ?? {})) {
    if (cellAt(current, name) !== expected) moved.push(`${name}: expected ${shown(expected)}, found ${shown(cellAt(current, name))}`);
  }
  if (moved.length) {
    throw new StaleRefusal(`${table} ${id} has changed since the command was written: ${moved.join('; ')}. Read the record again and write the correction against what it holds now`,
      command.expect, { rowHash: currentHash, cells: current, schemaDigest: stamp.schemaSha256 });
  }

  // 5. Nothing is deleted and no key moves (rule 3; table-io `set` on a primary key).
  const changed = names.filter((name) => command.set[name] !== cellAt(current, name));
  const keys = keyColumns(table);
  const rekeyed = changed.find((name) => keys.has(name));
  if (rekeyed !== undefined) {
    throw new Refusal('delete-refused', `${table}.${rekeyed} identifies the record; changing it would remove ${id} under its old key, and nothing is deleted (re-keying needs the removal ledger, a later command)`);
  }
  if (changed.length === 0) throw new Refusal('no-change', `every cell already holds the value the command sets (${names.join(', ')}); there is nothing to record`);
  const after: CanonicalCells = { ...current, ...command.set };

  // 6. Rule rows cite a ruling and travel alone (rule 4; EV-04).
  const rulings = command.rulings ?? [];
  checkRuleRows(ctx, table, id, rulings);

  // 7. New Notes text carries no change-set or migration ID (rule 6, OQ-16 A).
  const notes = command.set.Notes;
  if (typeof notes === 'string') {
    const found = newIdTokens(cellAt(current, 'Notes'), notes);
    if (found.length) throw new Refusal('notes-id-token', `new Notes text carries ${found.map((t) => JSON.stringify(t)).join(', ')}; a Notes cell says what was corrected and when, and never names a change set or a migration`);
  }

  // 8. Typed cells, and the measurements rules.
  checkTypedWords(table, changed, after);
  if (table === 'measurements') checkMeasurements(db, command, after);

  // 9. Evidence (rule 2): a correction always carries it (the contract), and it is always checked.
  const quoteCheck = checkEvidence(ctx, command, table, changed, after);

  // 10. Write all the related cells together, then prove they read back as written.
  writeCells(db, table, id, ord, changed, command.set);

  // 11. The change record, in the same transaction.
  const base = rebase ? { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit } : command.base;
  const next = Number(db.prepare('SELECT coalesce(max("seq"), 0) + 1 AS n FROM "change_log"').get()?.n);
  const recordId = changeRecordIdOf(command.opId);
  const record: ChangeRecord = {
    id: recordId, opId: command.opId, seq: next, kind: 'correctValue', table, recordId: id,
    before: Object.fromEntries(names.map((name) => [name, cellAt(current, name)])),
    after: Object.fromEntries(names.map((name) => [name, cellAt(command.set, name)])),
    evidence: command.evidence, reason: command.reason, rulings, actor: command.actor, reviewedBy: [], base, at: ctx.now().toISOString(),
    ...(command.apart === undefined ? {} : { cellsApart: command.apart }),
    quoteCheck,
  };
  db.prepare(`INSERT INTO "change_log" ("op_id", "change_record_id", "status", "command_sha256", "command_json", "record_json", "table_name", "record_id", "kind", "applied_at")
    VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`).run(command.opId, recordId, digest, commandJson(command), canonicalJson(plainJson(record)), table, id, 'correctValue', record.at);
  return { status: 'applied', changeRecordIds: [recordId], impact: { snapshotDigest: stamp.snapshotDigest, recordIds: [id] } };
}

/** A retried opId is a duplicate (logged, or already in a merged change set); a changed retry or a held conflict is refused. Null for a new opId. */
function earlierResult(ctx: WriteContext, command: CorrectValueCommand, digest: Sha256, stamp: BaseStamp): CommandResult | null {
  const logged = ctx.db.prepare('SELECT "change_record_id", "command_sha256" FROM "change_log" WHERE "op_id" = ?').get(command.opId);
  if (logged !== undefined) {
    if (logged.command_sha256 !== digest) throw new Refusal('opid-conflict', `opId ${command.opId} was applied before with different content; a retry repeats the command exactly, a new change needs a new opId`);
    return duplicate(logged.change_record_id, command, stamp);
  }
  const merged = ctx.mergedOps.get(command.opId);
  if (merged !== undefined) {
    // A merged opId is a retry only if it is the same change: same record, same cells.
    const sameCells = Object.keys(command.set).length === Object.keys(merged.after).length && Object.entries(command.set).every(([name, cell]) => merged.after[name] === cell);
    if (merged.table !== command.target.table || merged.recordId !== command.target.id || !sameCells) {
      throw new Refusal('opid-conflict', `opId ${command.opId} is in a merged change set as a change to ${merged.table} ${merged.recordId}, not this command; a retry repeats the command exactly, a new change needs a new opId`);
    }
    return duplicate(merged.id, command, stamp);
  }
  const conflict = ctx.db.prepare('SELECT "code", "detail" FROM "change_conflicts" WHERE "op_id" = ?').get(command.opId);
  if (conflict !== undefined) throw new Refusal('stale-base', `opId ${command.opId} is held as a conflict (${String(conflict.code)}: ${String(conflict.detail)}); write the correction again against what the record holds now, with a new opId`);
  return null;
}

function duplicate(loggedAs: unknown, command: WriteCommand, stamp: BaseStamp): CommandResult {
  const recordId = changeRecordIdOf(command.opId);
  if (String(loggedAs) !== recordId) throw new Error(`internal: ${command.opId} is logged under ${String(loggedAs)}, not ${recordId}`);
  return { status: 'duplicate', changeRecordIds: [recordId], impact: { snapshotDigest: stamp.snapshotDigest, recordIds: command.target.id === undefined ? [] : [command.target.id] } };
}

const isRuleTableName = (name: unknown): boolean => [...RULE_TABLES].some((rule) => rule === name);

/** A rule row cites rulings that exist and is the only pending change; any other row waits while a rule row is pending. */
function checkRuleRows(ctx: WriteContext, table: TableName, id: string, rulings: readonly string[]): void {
  const pending = ctx.db.prepare(`SELECT "table_name", "record_id" FROM "change_log" WHERE "status" IN ('draft', 'exported')`).all();
  if (!RULE_TABLES.has(table)) {
    if (pending.some((row) => isRuleTableName(row.table_name))) {
      throw new Refusal('rule-row-not-alone', 'a rule row is pending in this workspace and travels alone in its change set; merge it before other corrections');
    }
    return;
  }
  if (rulings.length === 0) throw new Refusal('ruling-missing', `${table} is a rule table: a write to it cites the ruling it rests on (docs/next/rulings.csv)`);
  const unknown = rulings.filter((ruling) => !ctx.rulings.has(ruling));
  if (unknown.length) throw new Refusal('ruling-missing', `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not in docs/next/rulings.csv`);
  const others = pending.filter((row) => row.table_name !== table || row.record_id !== id);
  if (others.length) throw new Refusal('rule-row-not-alone', `${table} ${id} is a rule row and travels alone in its change set, but ${others.length} other pending change(s) are in this workspace; export and merge them first`);
}

/** One UPDATE for all the changed cells (a constraint failure is a refusal), then a read-back that must give the cells as written. */
function writeCells(db: Db, table: TableName, id: string, ord: number, changed: readonly string[], set: CanonicalCells): void {
  const assignments = changed.flatMap((name) => assignmentsOf(table, name, cellAt(set, name)));
  try {
    const sets = assignments.map(([column]) => `${quoteIdent(column)} = ?`).join(', ');
    const written = db.prepare(`UPDATE ${quoteIdent(table)} SET ${sets} WHERE _ord = ?`).run(...assignments.map(([, value]) => value), ord);
    if (Number(written.changes) !== 1) throw new Error(`internal: the update of ${table} ${id} changed ${String(written.changes)} rows, not 1`);
  } catch (error) {
    const kind = constraintKind(error);
    const why = error instanceof Error ? error.message : String(error);
    if (kind === 'foreign-key') throw new Refusal('reference-missing', `${table} ${id}: a reference has no parent row (${why}); a value that names another record names one that exists`);
    if (kind !== null) throw new Refusal('schema-violation', `${table} ${id}: the database refuses these cells (${kind}: ${why}); check the column's type, vocabulary and pattern in the schema`);
    throw error;
  }
  const readBack = readRow(db, table, ord);
  if (readBack === null) throw new Error(`internal: ${table} ${id} is gone after its update; the write is rolled back`);
  const { header } = storageOf(table);
  for (const name of changed) {
    const stored = readBack[header.indexOf(name)] ?? null;
    if (stored !== cellAt(set, name)) {
      throw new Error(`internal: ${table} ${id} ${name} reads back as ${shown(stored)}, not as written ${shown(cellAt(set, name))}; the write is rolled back`);
    }
  }
}

/** A typed column holds a number or one of the words it declares, never another word; a word never stands as a number (04 section 4.2). */
function checkTypedWords(table: TableName, changed: readonly string[], after: CanonicalCells): void {
  for (const name of changed) {
    const column = columnOf(table, name);
    const cell = cellAt(after, name);
    if (!column || cell === null || !isNumericColumn(column)) continue;
    if (column.missing.includes(cell) || NUMBER_SHAPE.test(cell)) continue;
    const words = column.missing.length ? ` or one of ${column.missing.join(', ')}` : '';
    throw new Refusal('schema-violation', `${table}.${name} holds a number${words}; ${JSON.stringify(cell)} is neither (a missing value is one of the column's words, never another word, and never 0)`);
  }
}

function checkMeasurements(db: Db, command: CorrectValueCommand, after: CanonicalCells): void {
  const touched = (name: string): boolean => name in command.set;
  const apart = (command.apart ?? '').trim();
  for (const group of TOGETHER) {
    const given = group.filter(touched);
    if (given.length > 0 && given.length < group.length && apart === '') {
      throw new Refusal('cells-not-together', `${group.join(', ')} change together (the raw wording, its number and the normalized value are one fact), but the command sets only ${given.join(', ')}; set them all, or say in "apart" why they change apart`);
    }
  }
  // A number cannot rest on a missing word.
  if ((touched('Normalized value') || touched('Raw numeric')) && isNumberCell(cellAt(after, 'Normalized value')) && !isNumberCell(cellAt(after, 'Raw numeric'))) {
    throw new Refusal('missing-as-number', `Normalized value ${shown(cellAt(after, 'Normalized value'))} would rest on Raw numeric ${shown(cellAt(after, 'Raw numeric'))}, which is a missing-state word; a missing value never becomes a number`);
  }
  if (touched('Normalized unit') || touched('Property')) {
    const units = db.prepare(`SELECT ${textExpression('properties', 'Units')} AS u FROM "properties" WHERE ${textExpression('properties', 'Property')} = ?`).get(cellAt(after, 'Property'));
    if (units !== undefined) {
      const allowed = String(units.u ?? '').split(';').map((u) => u.trim());
      if (!allowed.includes(cellAt(after, 'Normalized unit') ?? '')) throw new Refusal('unit-mismatch', `${shown(cellAt(after, 'Normalized unit'))} is not a unit of ${String(after.Property)} (${allowed.join(', ')})`);
    }
  }
  if (touched('GradeID') || touched('MaterialID')) {
    const grade = db.prepare(`SELECT ${textExpression('grades', 'MaterialID')} AS m FROM "grades" WHERE ${textExpression('grades', 'GradeID')} = ?`).get(cellAt(after, 'GradeID'));
    if (grade !== undefined && grade.m !== after.MaterialID) throw new Refusal('ownership-mismatch', `grade ${String(after.GradeID)} belongs to ${String(grade.m)}, not ${String(after.MaterialID)} (D36)`);
  }
}

const RETRIEVED = new Set(['retrieved', 'retrieved-copy']);

/** The evidence guards (04 section 5.1). Returns the quote check to keep on the record. */
function checkEvidence(ctx: WriteContext, command: CorrectValueCommand, table: TableName, changed: readonly string[], after: CanonicalCells): QuoteCheck {
  // The type says a correction has evidence; a command read from JSON or built by a caller that ignores the type may not.
  const evidence: EvidenceRef | null | undefined = command.evidence;
  if (!evidence) throw new Refusal('evidence-missing', `a correction of ${table} ${changed.join(', ')} carries the source, page, locator and quote it rests on (rule 2)`);
  const isText = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';
  const fields: readonly (readonly [string, boolean])[] = [
    ['sourceId', isText(evidence.sourceId)],
    ['sha256 (64 lowercase hex)', isSha256(evidence.sha256)],
    ['page', Number.isInteger(evidence.page) && evidence.page >= 1],
    ['locator', isText(evidence.locator)],
    ['quote', isText(evidence.quote)],
  ];
  const missing = fields.filter(([, present]) => !present).map(([field]) => field);
  if (missing.length) throw new Refusal('evidence-missing', `the evidence is incomplete: ${missing.join(', ')}`);

  const column = (name: string): string => textExpression('sources', name);
  const source = ctx.db.prepare(`SELECT ${column('Access state')} AS access, ${column('Citation role')} AS role, ${column('SHA256')} AS sha FROM "sources" WHERE ${column('SourceID')} = ?`).get(evidence.sourceId);
  if (source === undefined) throw new Refusal('source-not-retrieved', `the evidence names source ${evidence.sourceId}, which sources does not list`);
  if (!RETRIEVED.has(String(source.access)) || source.role !== 'cited') {
    throw new Refusal('source-not-retrieved', `source ${evidence.sourceId} is "${String(source.access)}" with citation role "${String(source.role)}"; a value is corrected from a source that was retrieved (retrieved or retrieved-copy) and is cited`);
  }
  if (source.sha !== evidence.sha256) {
    throw new Refusal('source-hash-mismatch', `the evidence hash ${evidence.sha256.slice(0, 12)} is not source ${evidence.sourceId}'s recorded SHA-256 (${String(source.sha).slice(0, 12)}); the page was read from another document than the one the database cites`);
  }
  if (columnOf(table, 'SourceID') && after.SourceID !== evidence.sourceId) {
    throw new Refusal('evidence-source-mismatch', `${table} ${command.target.id ?? ''} cites ${shown(cellAt(after, 'SourceID'))}, but the evidence names ${evidence.sourceId}; a record is corrected from the source it cites`);
  }

  checkValuesPrinted(table, changed, after, evidence.quote);

  // The quote is on the hash-checked page. Without the private store this is "not run", never a pass.
  const lookup = quoteOnPage(ctx.store, evidence.sha256, evidence.page, evidence.quote);
  if ('found' in lookup && !lookup.found) throw new Refusal('quote-not-on-page', `${lookup.why}: ${JSON.stringify(evidence.quote)} (source ${evidence.sourceId}, page ${evidence.page})`);
  const opsDigest = sha256Of(canonicalJson(plainJson({ table, id: command.target.id, set: command.set, evidence })));
  const { commit } = command.base;
  return 'notRun' in lookup ? { status: 'not-run', opsDigest, commit, reason: lookup.notRun } : { status: 'verified', opsDigest, commit };
}

/** The value is a number its own line prints, in one role (D97). Needs only the quote, so it always runs. */
function checkValuesPrinted(table: TableName, changed: readonly string[], after: CanonicalCells, quote: string): void {
  const bound = table === 'measurements'
    ? changed.filter((name) => RAW_NAMES.includes(name))
    : changed.filter((name) => {
      const column = columnOf(table, name);
      return column !== undefined && isNumericColumn(column) && ['canonical', 'raw'].includes(column.role);
    });
  for (const name of bound) {
    const value = cellAt(after, name);
    if (isNumberCell(value) && !valueInEvidence(quote, value)) {
      throw new Refusal('value-not-printed', `${name} ${value} is not a number the quoted line prints: ${JSON.stringify(quote)}`);
    }
  }
  if (table !== 'measurements') return;

  // A number the line prints once has one role: two fields holding the same number cannot both rest on one printing.
  const claims = new Map<string, string[]>();
  for (const name of ROLE_FIELDS) {
    const value = cellAt(after, name);
    if (!isNumberCell(value)) continue;
    const number = String(Number(value));
    claims.set(number, [...(claims.get(number) ?? []), name]);
  }
  for (const [value, fields] of claims) {
    if (fields.length < 2 || !fields.some((field) => changed.includes(field))) continue;
    const printed = countInEvidence(quote, value);
    if (printed > 0 && printed < fields.length) {
      throw new Refusal('value-not-printed', `${value} is printed ${printed === 1 ? 'once' : `${printed} times`} in the quoted line but is ${fields.join(' and ')}; a number the line prints once has one role`);
    }
  }
}

// ---------------------------------------------------------------- the journal

export interface JournalEntry {
  readonly seq: number;
  readonly status: ChangeLogEntry['status'];
  readonly record: ChangeRecord;
  readonly command: WriteCommand;
  readonly changeSetId: string | null;
}

const STATUSES: readonly ChangeLogEntry['status'][] = ['draft', 'exported', 'merged'];
const isStatus = (value: string): value is ChangeLogEntry['status'] => STATUSES.some((status) => status === value);

function parseOrThrow<T>(parsed: Parsed<T>, what: string): T {
  if (!parsed.ok) throw new Error(`the journal holds a damaged ${what}: ${parsed.problems.join('; ')}`);
  return parsed.value;
}

/** Every logged change in the order applied. `statuses` limits it; a damaged row throws (the journal is never read half-way). */
export function readJournal(db: Db, statuses: readonly ChangeLogEntry['status'][] = STATUSES): JournalEntry[] {
  const rows = db.prepare('SELECT "seq", "status", "command_json", "record_json", "change_set_id" FROM "change_log" ORDER BY "seq"').all();
  const out: JournalEntry[] = [];
  for (const row of rows) {
    const status = String(row.status);
    if (!isStatus(status)) throw new Error(`change_log seq ${String(row.seq)} has status "${status}"`);
    if (!statuses.includes(status)) continue;
    const record = parseOrThrow(parseChangeRecord(JSON.parse(String(row.record_json))), `record at seq ${String(row.seq)}`);
    const command = parseOrThrow(parseCommand(JSON.parse(String(row.command_json))), `command at seq ${String(row.seq)}`);
    out.push({ seq: Number(row.seq), status, record, command, changeSetId: typeof row.change_set_id === 'string' ? row.change_set_id : null });
  }
  return out;
}

/** A change record as the command that made it, for replay (the record keeps `before` as the expectation and `after` as the cells set). */
export function commandOfRecord(record: ChangeRecord): WriteCommand {
  if (record.kind !== 'correctValue') throw new Error(`record ${record.id} is a ${record.kind}; write service v1 replays corrections only`);
  return {
    opId: record.opId, kind: 'correctValue', target: { table: record.table, id: record.recordId }, expect: { cells: record.before }, set: record.after,
    evidence: record.evidence, reason: record.reason, ...(record.rulings.length ? { rulings: record.rulings } : {}), actor: record.actor, base: record.base,
    ...(record.cellsApart === undefined ? {} : { apart: record.cellsApart }),
  };
}
