// What every command of the write service shares (WP-10, WP-17; pack 04 sections 5 and 7): the refusals, the context a command runs in,
// the expectation and the guards (evidence, typed words, ownership, Notes, rule rows, reviewers), and the two ways a row is written.
// A command kind is a planner (write-rows.ts, write-schema.ts) that checks and returns a Plan; write.ts runs the plan in one transaction.
import type {
  Actor, CanonicalCells, ChangeRecord, CommandResult, CurrentState, EvidenceRef, Expectation, LedgerRow, QuoteCheck, RefusalCode, Sha256,
  WriteCommand,
} from '@atlas/domain/contracts';
import type { JsonValue } from '@atlas/domain/contracts';
import { canonicalJson, isSha256, rowHash, sha256Of } from './digest.ts';
import type { Json } from './digest.ts';
import { constraintKind } from './driver.ts';
import type { Db } from './driver.ts';
import { countInEvidence, isNumberCell, quoteOnPage, valueInEvidence } from './evidence.ts';
import type { PageTextStore } from './evidence.ts';
import type { ColumnInfo, TableName } from './generated/columns.ts';
import { baseSchemaHolder } from './schema-model.ts';
import type { SchemaHolder, SchemaModel } from './schema-model.ts';
import { assignmentsOf, isTableName, quoteIdent, readRow, storageOf, textExpression } from './storage.ts';

// ---------------------------------------------------------------- the workspace stamp

export interface BaseStamp { readonly snapshotDigest: Sha256; readonly commit: string; readonly schemaSha256: Sha256 }

export type MergedOps = ReadonlyMap<string, ChangeRecord>;

// ---------------------------------------------------------------- context and options

export interface WriteContext {
  readonly db: Db;
  /** The private text store; null when there is none, and then a quote is "not run", never "verified". */
  readonly store: PageTextStore | null;
  /** The IDs of docs/next/rulings.csv. */
  readonly rulings: ReadonlySet<string>;
  /** opId to the record of everything already in a merged change set (04 section 3, mechanism 2). */
  readonly mergedOps: MergedOps;
  readonly now: () => Date;
  /** The schema the database holds. A schema command replaces its model once it has committed. Default: the repository's own. */
  readonly schema?: SchemaHolder;
}

export interface ApplyOptions {
  /** Replaying a draft onto a newer approved base (the open check, drafts:import): the stale-base check is skipped and the record takes the new base; `expect` still decides. */
  readonly rebase?: boolean;
}

/** What only the coverage measurement may ask for (coverage.ts): the judgement guards off, the structural ones on. Not reachable from the workspace. */
export interface RunOptions extends ApplyOptions {
  readonly legacy?: boolean;
}

/** One command's view of the world while it runs. */
export interface Env {
  readonly ctx: WriteContext;
  readonly db: Db;
  readonly model: SchemaModel;
  readonly stamp: BaseStamp;
  readonly rebase: boolean;
  readonly legacy: boolean;
  /** Set by a schema command: the model to install once the transaction has committed. */
  pendingModel: SchemaModel | null;
}

export const holderOf = (ctx: WriteContext): SchemaHolder => ctx.schema ?? baseSchemaHolder();

// ---------------------------------------------------------------- refusals

export class Refusal extends Error {
  readonly code: Exclude<RefusalCode, 'stale'>;
  constructor(code: Exclude<RefusalCode, 'stale'>, detail: string) {
    super(detail);
    this.name = 'Refusal';
    this.code = code;
  }
}

export class StaleRefusal extends Error {
  readonly expected: Expectation;
  readonly current: CurrentState;
  constructor(detail: string, expected: Expectation, current: CurrentState) {
    super(detail);
    this.name = 'StaleRefusal';
    this.expected = expected;
    this.current = current;
  }
}

export const resultOf = (error: Refusal | StaleRefusal): Extract<CommandResult, { status: 'refused' }> =>
  error instanceof StaleRefusal
    ? { status: 'refused', code: 'stale', detail: error.message, expected: error.expected, current: error.current }
    : { status: 'refused', code: error.code, detail: error.message };

// ---------------------------------------------------------------- helpers

/** What a value is, for a message: the text in quotes, or "empty". */
export const shown = (cell: string | null): string => (cell === null ? 'empty' : JSON.stringify(cell));

/** A cell by column name; a column the cells do not hold reads as empty. */
export const cellAt = (cells: CanonicalCells, name: string): string | null => cells[name] ?? null;

export function columnOf(env: Env, table: TableName, name: string): ColumnInfo | undefined {
  return env.model.tables[table].columns.find((c) => c.name === name);
}

export const isNumericColumn = (column: ColumnInfo): boolean => column.type === 'number' || column.type === 'integer';

/**
 * The columns that identify a record, as table-io does (`set` on a primary key; `update` on the first unique key of a table that has none):
 * a changed key is the record leaving under one key and arriving under another. A unique key beside a primary key does not identify the
 * record (a source's URL and SHA-256 are unique, and a source whose URL is corrected is still the same source); the database refuses a duplicate.
 */
export function keyColumns(env: Env, table: TableName): ReadonlySet<string> {
  const info = env.model.tables[table];
  return new Set(info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? []));
}

export function plainJson(value: unknown): Json {
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
export const commandJson = (command: WriteCommand): string => canonicalJson(plainJson(command));

/** A command's input as the JSON a record keeps (`undefined` members left out). */
export const jsonValue = (value: unknown): JsonValue => plainJson(value);

/** The table a command names, or the refusal that says it is not one of the schema's. */
export function knownTable(table: string): TableName {
  if (!isTableName(table)) throw new Refusal('unknown-target', `${JSON.stringify(table)} is not a table of the schema`);
  return table;
}

/** The key columns a table is addressed by: its primary key, else its first unique key. */
export function addressKey(env: Env, table: TableName): readonly string[] {
  const info = env.model.tables[table];
  const key = info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? []);
  if (key.length === 0) throw new Refusal('unknown-target', `${table} has no primary or unique key to address a record by`);
  return key;
}

/** The ID a row has: its key cells joined by " | ". */
export function idOfRow(env: Env, table: TableName, cells: CanonicalCells): string | null {
  const parts = addressKey(env, table).map((name) => cells[name] ?? null);
  return parts.every((part): part is string => part !== null) ? parts.join(' | ') : null;
}

/** The row a target names: its `_ord`, or null. The ID is the primary key, or the first unique key's values joined by " | ". */
export function locate(env: Env, table: TableName, id: string): number | null {
  const key = addressKey(env, table);
  const parts = key.length === 1 ? [id] : id.split(' | ');
  if (parts.length !== key.length) throw new Refusal('unknown-target', `${table} is addressed by ${key.join(' | ')}; "${id}" gives ${parts.length} value(s) separated by " | "`);
  const where = key.map((name) => `${textExpression(table, name, env.model)} = ?`).join(' AND ');
  const rows = env.db.prepare(`SELECT _ord FROM ${quoteIdent(table)} WHERE ${where}`).all(...parts);
  if (rows.length > 1) throw new Refusal('unknown-target', `${table} "${id}" names ${rows.length} records; a record must be addressed by exactly one`);
  const ord = rows[0]?._ord;
  return typeof ord === 'number' ? ord : null;
}

/** A row's cells by column name, or null when there is no row at `ord`. */
export function cellsOfRow(env: Env, table: TableName, ord: number): CanonicalCells | null {
  const cells = readRow(env.db, table, ord, env.model);
  return cells === null ? null : Object.fromEntries(storageOf(table, env.model).header.map((name, k) => [name, cells[k] ?? null]));
}

// ---------------------------------------------------------------- the rule tables

export const RULE_TABLES: ReadonlySet<TableName> = new Set<TableName>(['class_limits', 'conversions', 'chamber_bands', 'chamber_need', 'plausibility_windows']);
const isRuleTableName = (name: unknown): boolean => [...RULE_TABLES].some((rule) => rule === name);

/** A rule row cites rulings that exist and is the only pending change; any other row waits while a rule row is pending. */
export function checkRuleRows(ctx: WriteContext, table: TableName, id: string, rulings: readonly string[]): void {
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

/** A ruling the command cites must exist, whatever the table (a column drop needs one). */
export function requireRuling(ctx: WriteContext, rulings: readonly string[], why: string): void {
  if (rulings.length === 0) throw new Refusal('ruling-missing', `${why}: cite the ruling it rests on (docs/next/rulings.csv)`);
  const unknown = rulings.filter((ruling) => !ctx.rulings.has(ruling));
  if (unknown.length) throw new Refusal('ruling-missing', `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not in docs/next/rulings.csv`);
}

// ---------------------------------------------------------------- the expectation (rule 1)

/**
 * The expectation of a command on a record, or (id null) on the schema alone. Required and complete: it names the value of every cell
 * being replaced, or the row hash, or (for a new record or a schema command) the schema digest. Then the approved base, the schema
 * and the record are compared (04 section 7: STALE_BASE, STALE_EXPECT). Returns the record's place and cells, or null for id null.
 */
export function checkExpectation(
  env: Env, command: WriteCommand, target: { readonly table: TableName; readonly id: string | null }, replaced: readonly string[],
): { readonly ord: number; readonly current: CanonicalCells; readonly currentHash: Sha256 } | null {
  const { table, id } = target;
  const { rowHash: wantHash, cells: wantCells, schemaDigest: wantSchema } = command.expect;
  const wantNames = Object.keys(wantCells ?? {});
  if (wantHash === undefined && wantNames.length === 0 && wantSchema === undefined) throw new Refusal('expectation-empty', 'expect names nothing to check: give the row hash or the cells as the writer saw them');
  if (id === null && wantSchema === undefined) throw new Refusal('expectation-empty', 'a new record or a schema change expects the schema it was written against: give expect.schemaDigest');
  const unnamed = wantHash === undefined && id !== null ? replaced.filter((name) => !wantNames.includes(name)) : [];
  if (unnamed.length) throw new Refusal('expectation-partial', `expect does not name the value of ${unnamed.join(', ')}; every cell a correction replaces is named, or the row hash is given`);
  for (const name of wantNames) if (!columnOf(env, table, name)) throw new Refusal('unknown-target', `${table} has no column "${name}" (named in expect)`);

  const { stamp } = env;
  if (!env.rebase && command.base.snapshotDigest !== stamp.snapshotDigest) {
    throw new Refusal('stale-base', `the command was written against snapshot ${command.base.snapshotDigest.slice(0, 12)} (commit ${command.base.commit.slice(0, 12)}); this workspace's approved base is ${stamp.snapshotDigest.slice(0, 12)} (commit ${stamp.commit.slice(0, 12)}). Reopen the workspace so the open check runs, then write the correction against what it holds`);
  }
  const noRecord = { rowHash: null, cells: null, schemaDigest: stamp.schemaSha256 };
  if (wantSchema !== undefined && wantSchema !== stamp.schemaSha256) {
    throw new StaleRefusal(`the schema moved: the command expected ${wantSchema.slice(0, 12)}, the workspace holds ${stamp.schemaSha256.slice(0, 12)}`, command.expect, noRecord);
  }
  if (id === null) return null;
  const ord = locate(env, table, id);
  const current = ord === null ? null : cellsOfRow(env, table, ord);
  if (ord === null || current === null) {
    throw new StaleRefusal(`${table} has no record "${id}": it was never there on this base, or the ID is wrong`, command.expect, noRecord);
  }
  const header = storageOf(table, env.model).header;
  const currentHash = rowHashOf(env, table, header.map((name) => current[name] ?? null));
  const moved: string[] = [];
  if (wantHash !== undefined && wantHash !== currentHash) moved.push(`the record's hash is ${currentHash.slice(0, 12)}, not the expected ${wantHash.slice(0, 12)}`);
  for (const [name, expected] of Object.entries(wantCells ?? {})) {
    if (cellAt(current, name) !== expected) moved.push(`${name}: expected ${shown(expected)}, found ${shown(cellAt(current, name))}`);
  }
  if (moved.length) {
    throw new StaleRefusal(`${table} ${id} has changed since the command was written: ${moved.join('; ')}. Read the record again and write the correction against what it holds now`,
      command.expect, { rowHash: currentHash, cells: current, schemaDigest: stamp.schemaSha256 });
  }
  return { ord, current, currentHash };
}

const rowHashOf = (env: Env, table: TableName, cells: readonly (string | null)[]): Sha256 => rowHash(table, cells, env.model);

// ---------------------------------------------------------------- Notes (rule 6)

const NOTES_TOKENS: readonly RegExp[] = [
  /(?<![A-Za-z0-9])m\d{2,4}(?![A-Za-z0-9])/g, // a migration, "m413"
  /(?<![A-Za-z0-9-])\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4}(?![A-Za-z0-9-])/g, // a change set, "2026-11-04-pla-basic-density-7f3a"
  /CR-[0-7][0-9A-HJKMNP-TV-Z]{25}/g, // a change record
];

const idTokensIn = (text: string): string[] => NOTES_TOKENS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[0]));

/** Identifier tokens in `text` that `previous` does not already carry (count for count): the dated correction note stays; an ID does not. */
export function newIdTokens(previous: string | null, text: string): string[] {
  const seen = new Map<string, number>();
  for (const token of idTokensIn(previous ?? '')) seen.set(token, (seen.get(token) ?? 0) + 1);
  const fresh: string[] = [];
  for (const token of idTokensIn(text)) {
    const left = seen.get(token) ?? 0;
    if (left > 0) seen.set(token, left - 1); else fresh.push(token);
  }
  return fresh;
}

/** New Notes text carries no change-set or migration ID (rule 6, OQ-16 A). */
export function checkNotes(previous: string | null, notes: string | null | undefined): void {
  if (typeof notes !== 'string') return;
  const found = newIdTokens(previous, notes);
  if (found.length) throw new Refusal('notes-id-token', `new Notes text carries ${found.map((t) => JSON.stringify(t)).join(', ')}; a Notes cell says what was corrected and when, and never names a change set or a migration`);
}

// ---------------------------------------------------------------- typed cells and the measurements rules

const NUMBER_SHAPE = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** A typed column holds a number or one of the words it declares, never another word; a word never stands as a number (04 section 4.2). */
export function checkTypedWords(env: Env, table: TableName, changed: readonly string[], after: CanonicalCells): void {
  for (const name of changed) {
    const column = columnOf(env, table, name);
    const cell = cellAt(after, name);
    if (!column || cell === null || !isNumericColumn(column)) continue;
    if (column.missing.includes(cell) || NUMBER_SHAPE.test(cell)) continue;
    const words = column.missing.length ? ` or one of ${column.missing.join(', ')}` : '';
    throw new Refusal('schema-violation', `${table}.${name} holds a number${words}; ${JSON.stringify(cell)} is neither (a missing value is one of the column's words, never another word, and never 0)`);
  }
}

// The measurements guards (04 section 5.1). Names are the schema's.
export const RAW_NAMES: readonly string[] = ['Raw numeric', 'Raw uncertainty ±', 'Raw upper bound'];
const ROLE_FIELDS: readonly string[] = [...RAW_NAMES, 'Anneal °C', 'Anneal h', 'Test temperature °C'];

/** The cells that change together: all of a group, or the command says why in `apart` (rule 2). */
export type TogetherGroups = readonly (readonly string[])[];

export const MEASUREMENT_TOGETHER: TogetherGroups = [['Raw value', 'Raw numeric', 'Normalized value']];

/**
 * A raw profile cell and the typed cells the build reads from it change together (scripts/lib/profile-settings.mjs TYPED, the groups whose
 * typed cells belong to one raw cell alone).
 */
export const PROFILE_TOGETHER: TogetherGroups = [
  ['Nozzle °C', 'Nozzle state', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle requirement'],
  ['Bed °C', 'Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'],
  ['Chamber °C', 'Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'],
  ['Enclosure', 'Enclosure state'],
  ['Drying', 'Drying state', 'Drying need', 'Drying min °C', 'Drying °C', 'Drying min hours', 'Drying hours', 'Drying hours open'],
];

export function checkTogether(groups: TogetherGroups, touched: ReadonlySet<string>, apart: string | undefined): void {
  for (const group of groups) {
    const given = group.filter((name) => touched.has(name));
    if (given.length > 0 && given.length < group.length && (apart ?? '').trim() === '') {
      throw new Refusal('cells-not-together', `${group.join(', ')} change together (the raw wording and the cells read from it are one fact), but the command sets only ${given.join(', ')}; set them all, or say in "apart" why they change apart`);
    }
  }
}

/** A normalized number cannot rest on a raw value that is a missing-state word. */
export function checkMissingAsNumber(touched: ReadonlySet<string>, after: CanonicalCells): void {
  if ((touched.has('Normalized value') || touched.has('Raw numeric')) && isNumberCell(cellAt(after, 'Normalized value')) && !isNumberCell(cellAt(after, 'Raw numeric'))) {
    throw new Refusal('missing-as-number', `Normalized value ${shown(cellAt(after, 'Normalized value'))} would rest on Raw numeric ${shown(cellAt(after, 'Raw numeric'))}, which is a missing-state word; a missing value never becomes a number`);
  }
}

/** The normalized unit is one of the property's units. */
export function checkUnit(env: Env, touched: ReadonlySet<string>, after: CanonicalCells): void {
  if (!touched.has('Normalized unit') && !touched.has('Property')) return;
  const units = env.db.prepare(`SELECT ${textExpression('properties', 'Units', env.model)} AS u FROM "properties" WHERE ${textExpression('properties', 'Property', env.model)} = ?`).get(cellAt(after, 'Property'));
  if (units === undefined) return;
  const allowed = String(units.u ?? '').split(';').map((u) => u.trim());
  if (!allowed.includes(cellAt(after, 'Normalized unit') ?? '')) throw new Refusal('unit-mismatch', `${shown(cellAt(after, 'Normalized unit'))} is not a unit of ${String(after.Property)} (${allowed.join(', ')})`);
}

/** A grade belongs to its material (D36): a record that names both agrees with the grade's own row. */
export function checkOwnership(env: Env, table: TableName, touched: ReadonlySet<string>, after: CanonicalCells): void {
  if (!columnOf(env, table, 'GradeID') || !columnOf(env, table, 'MaterialID')) return;
  if (!touched.has('GradeID') && !touched.has('MaterialID')) return;
  const grade = env.db.prepare(`SELECT ${textExpression('grades', 'MaterialID', env.model)} AS m FROM "grades" WHERE ${textExpression('grades', 'GradeID', env.model)} = ?`).get(cellAt(after, 'GradeID'));
  if (grade !== undefined && grade.m !== after.MaterialID) throw new Refusal('ownership-mismatch', `grade ${String(after.GradeID)} belongs to ${String(grade.m)}, not ${String(after.MaterialID)} (D36)`);
}

// ---------------------------------------------------------------- evidence (rule 2)

const RETRIEVED = new Set(['retrieved', 'retrieved-copy']);

/** Whether a changed column is one the build reads for a decision (D85): schema role canonical, raw or key. */
export function decisionReading(env: Env, table: TableName, changed: readonly string[]): boolean {
  return changed.some((name) => ['canonical', 'raw', 'key'].includes(columnOf(env, table, name)?.role ?? ''));
}

/** The evidence guards (04 section 5.1). Returns the quote check to keep on the record. */
export function checkEvidence(
  env: Env, command: WriteCommand, evidenceIn: EvidenceRef | null | undefined, table: TableName, recordId: string | undefined, written: CanonicalCells,
  changed: readonly string[], after: CanonicalCells,
): QuoteCheck {
  // The type says a correction has evidence; a command read from JSON or built by a caller that ignores the type may not.
  const evidence = evidenceIn;
  if (!evidence) throw new Refusal('evidence-missing', `a change to ${table} ${changed.join(', ')} carries the source, page, locator and quote it rests on (rule 2)`);
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

  const column = (name: string): string => textExpression('sources', name, env.model);
  const source = env.db.prepare(`SELECT ${column('Access state')} AS access, ${column('Citation role')} AS role, ${column('SHA256')} AS sha FROM "sources" WHERE ${column('SourceID')} = ?`).get(evidence.sourceId);
  if (source === undefined) throw new Refusal('source-not-retrieved', `the evidence names source ${evidence.sourceId}, which sources does not list`);
  if (!RETRIEVED.has(String(source.access)) || source.role !== 'cited') {
    throw new Refusal('source-not-retrieved', `source ${evidence.sourceId} is "${String(source.access)}" with citation role "${String(source.role)}"; a value is corrected from a source that was retrieved (retrieved or retrieved-copy) and is cited`);
  }
  if (source.sha !== evidence.sha256) {
    throw new Refusal('source-hash-mismatch', `the evidence hash ${evidence.sha256.slice(0, 12)} is not source ${evidence.sourceId}'s recorded SHA-256 (${String(source.sha).slice(0, 12)}); the page was read from another document than the one the database cites`);
  }
  if (columnOf(env, table, 'SourceID') && after.SourceID !== evidence.sourceId) {
    throw new Refusal('evidence-source-mismatch', `${table} ${recordId ?? ''} cites ${shown(cellAt(after, 'SourceID'))}, but the evidence names ${evidence.sourceId}; a record is corrected from the source it cites`);
  }

  checkValuesPrinted(env, table, changed, after, evidence.quote);

  // The quote is on the hash-checked page. Without the private store this is "not run", never a pass.
  const lookup = quoteOnPage(env.ctx.store, evidence.sha256, evidence.page, evidence.quote);
  if ('found' in lookup && !lookup.found) throw new Refusal('quote-not-on-page', `${lookup.why}: ${JSON.stringify(evidence.quote)} (source ${evidence.sourceId}, page ${evidence.page})`);
  const opsDigest = sha256Of(canonicalJson(plainJson({ table, id: recordId, set: written, evidence })));
  const { commit } = command.base;
  return 'notRun' in lookup ? { status: 'not-run', opsDigest, commit, reason: lookup.notRun } : { status: 'verified', opsDigest, commit };
}

/** The value is a number its own line prints, in one role (D97). Needs only the quote, so it always runs. */
function checkValuesPrinted(env: Env, table: TableName, changed: readonly string[], after: CanonicalCells, quote: string): void {
  const bound = table === 'measurements'
    ? changed.filter((name) => RAW_NAMES.includes(name))
    : changed.filter((name) => {
      const column = columnOf(env, table, name);
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

// ---------------------------------------------------------------- reviewers (OQ-17 A) and tiers

/** The columns whose cell names who reviewed, read or wrote the row. */
export const REVIEWER_COLUMNS: readonly string[] = ['Reviewed by', 'Read by', 'Written by'];

/** A cell that names a reviewer is written only with the reviewer's kind (human or agent) recorded beside it. */
export function checkReviewer(env: Env, table: TableName, written: CanonicalCells, reviewedBy: readonly Actor[] | undefined): readonly Actor[] {
  const names = REVIEWER_COLUMNS.filter((name) => columnOf(env, table, name) !== undefined && cellAt(written, name) !== null);
  if (names.length && (reviewedBy === undefined || reviewedBy.length === 0)) {
    throw new Refusal('reviewer-missing', `${table}.${names.join(', ')} names who reviewed the row; give reviewedBy with each reviewer's kind (human or agent), so the record can be queried by it`);
  }
  return reviewedBy ?? [];
}

/** 1 when the change needs the owner's eyes: a schema command, a rule row, or a human among the reviewers. */
export function tierOf(kind: WriteCommand['kind'], table: TableName, reviewedBy: readonly Actor[]): 0 | 1 {
  if (kind === 'addVocab' || kind === 'addColumn' || kind === 'schemaEdit') return 1;
  if (RULE_TABLES.has(table)) return 1;
  return reviewedBy.some((actor) => actor.kind === 'human') ? 1 : 0;
}

// ---------------------------------------------------------------- plans and writing

/** One row a command writes: the record's own, or one a cascade moves with it. */
export interface RowWrite {
  readonly table: TableName;
  readonly id: string;
  readonly mode: 'update' | 'insert';
  /** The row to update; for an insert, the `_ord` it takes (the end of the table). */
  readonly ord: number;
  readonly before: CanonicalCells | null;
  /** The whole row after the write. */
  readonly after: CanonicalCells;
  /** The columns written: those that differ on an update, all of them on an insert. */
  readonly changed: readonly string[];
}

/** What a planner decided: the cells to write, and what the change record will say. */
export interface Plan {
  readonly table: TableName;
  readonly recordId: string;
  readonly recordBefore: CanonicalCells;
  readonly recordAfter: CanonicalCells;
  /** The record's own row first, then any cascade. Empty for a schema command, which brings its own `perform`. */
  readonly writes: readonly RowWrite[];
  /** A schema command rebuilds the tables itself, inside the transaction. */
  readonly perform?: () => void;
  readonly rulings: readonly string[];
  readonly reviewedBy: readonly Actor[];
  readonly evidence?: EvidenceRef;
  readonly quoteCheck?: QuoteCheck;
  readonly cellsApart?: string;
  readonly args?: { readonly [key: string]: JsonValue };
  readonly ledger?: readonly LedgerRow[];
  readonly duplicateOf?: { readonly id: string; readonly reason: string };
}

const failWith = (table: TableName, id: string, error: unknown): never => {
  const kind = constraintKind(error);
  const why = error instanceof Error ? error.message : String(error);
  if (kind === 'foreign-key') throw new Refusal('reference-missing', `${table} ${id}: a reference has no parent row (${why}); a value that names another record names one that exists`);
  if (kind === 'unique' || kind === 'primary-key') throw new Refusal('duplicate-key', `${table} ${id}: the database refuses a second record with this key (${why})`);
  if (kind !== null) throw new Refusal('schema-violation', `${table} ${id}: the database refuses these cells (${kind}: ${why}); check the column's type, vocabulary and pattern in the schema`);
  throw error;
};

/** One UPDATE for all the changed cells (a constraint failure is a refusal), then a read-back that must give the cells as written. */
function updateRow(env: Env, write: RowWrite): void {
  const { table, id, ord, changed, after } = write;
  const assignments = changed.flatMap((name) => assignmentsOf(table, name, cellAt(after, name), env.model));
  try {
    const sets = assignments.map(([column]) => `${quoteIdent(column)} = ?`).join(', ');
    const written = env.db.prepare(`UPDATE ${quoteIdent(table)} SET ${sets} WHERE _ord = ?`).run(...assignments.map(([, value]) => value), ord);
    if (Number(written.changes) !== 1) throw new Error(`internal: the update of ${table} ${id} changed ${String(written.changes)} rows, not 1`);
  } catch (error) { failWith(table, id, error); }
  readBack(env, write);
}

/** One INSERT at the end of the table, then a read-back. */
function insertRow(env: Env, write: RowWrite): void {
  const { table, id, ord, after } = write;
  const storage = storageOf(table, env.model);
  try {
    env.db.prepare(storage.insertSql).run(...storage.encode(ord, storage.header.map((name) => cellAt(after, name))));
  } catch (error) { failWith(table, id, error); }
  readBack(env, write);
}

function readBack(env: Env, write: RowWrite): void {
  const { table, id, ord, changed, after } = write;
  const stored = cellsOfRow(env, table, ord);
  if (stored === null) throw new Error(`internal: ${table} ${id} is gone after its write; the write is rolled back`);
  for (const name of changed) {
    if (cellAt(stored, name) !== cellAt(after, name)) {
      throw new Error(`internal: ${table} ${id} ${name} reads back as ${shown(cellAt(stored, name))}, not as written ${shown(cellAt(after, name))}; the write is rolled back`);
    }
  }
}

export function writeRows(env: Env, writes: readonly RowWrite[]): void {
  for (const write of writes) {
    if (write.mode === 'update') updateRow(env, write); else insertRow(env, write);
  }
}

/** The `_ord` a new row takes: the end of the table. */
export function nextOrd(env: Env, table: TableName): number {
  return Number(env.db.prepare(`SELECT coalesce(max(_ord), 0) + 1 AS n FROM ${quoteIdent(table)}`).get()?.n);
}

/** A row that differs from `current` only in `set`, and which of the set cells really differ. */
export function applySet(current: CanonicalCells, set: CanonicalCells): { readonly after: CanonicalCells; readonly changed: string[] } {
  return { after: { ...current, ...set }, changed: Object.keys(set).filter((name) => set[name] !== cellAt(current, name)) };
}
