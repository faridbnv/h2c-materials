// The write service's command pipeline (WP-10; WP-17 adds every other command; pack 04 sections 5 and 7, 02 section 9.1).
//
// One command, one SQLite transaction: the same opId twice is applied once; the base and the expectation are checked; every
// guard runs; all the related cells are written together; one change record is appended; then COMMIT. A refusal changes
// nothing and says why (a code and the words to act on). Anything that is not a refusal (a disk error, a bug) is thrown, never
// returned as a result: a command that did not complete must not look as if it did.
//
// A command kind is a planner (write-rows.ts for rows, write-schema.ts for the schema) that checks the command and returns a Plan; this
// file runs it. Kinds: correctValue, addMeasurement, addRecord, retireRecord, moveGrade, reviseProfile, reclassifyProduct, addVocab, addColumn,
// schemaEdit. The three proposal commands wait for WP-28 and are refused as `unsupported-kind`.
//
// The guards, ported from the old apply path (scripts/lib/source-edits.mjs, scripts/data/table-io.mjs, scripts/ingest/apply.mjs):
//   expect names the value it replaces        table-io `expect`, source-edits `correct`   stale, expectation-empty, expectation-partial
//   the record cites the evidence's source    source-edits `correct`                      evidence-source-mismatch
//   hash, retrieved and cited                 apply APPLY-HASH                            source-hash-mismatch, source-not-retrieved
//   the quote is on the hash-checked page     apply APPLY-NUMBER-NOT-ON-PAGE              quote-not-on-page (not run without the store)
//   the value is a number its line prints     apply APPLY-VALUE-NOT-IN-EVIDENCE/-ROLE     value-not-printed
//   normalized unit is the property's         apply APPLY-UNIT                            unit-mismatch
//   nothing is deleted, a key is never moved  table-io `set` on a primary key             delete-refused
//   an append is a new key and a new fact     table-io `append`, records newRecord         duplicate-key
import type { AlsoChanged, ChangeLogEntry, ChangeRecord, CommandResult, Sha256, WriteCommand } from '@atlas/domain/contracts';
import { canonicalJson, changeRecordIdOf, isOpId, isSha256, sha256Of } from './digest.ts';
import type { Json } from './digest.ts';
import type { Db } from './driver.ts';
import type { TableName } from './generated/columns.ts';
import { parseChangeRecord, parseCommand } from './parse.ts';
import type { Parsed } from './parse.ts';
import type { SchemaModel } from './schema-model.ts';
import { isTableName, storageOf } from './storage.ts';
import { Refusal, RULE_TABLES, StaleRefusal, cellAt, commandJson, plainJson, putMeta, readMeta, resultOf, tierOf, writeRows } from './write-core.ts';
import type { ApplyOptions, BaseStamp, Env, MergedOps, Plan, RowWrite, WriteContext } from './write-core.ts';
import { planAdd, planCorrectValue, planMoveGrade, planReclassifyProduct, planRetire, planReviseProfile } from './write-rows.ts';
import { planAddColumn, planAddVocab, planSchemaEdit } from './write-schema.ts';

export { RULE_TABLES, putMeta, readMeta };
export type { ApplyOptions, BaseStamp, MergedOps, WriteContext };

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

/** Create the workspace tables and record the approved base's snapshot digest in the stamp. */
export function initWorkspaceTables(db: Db, snapshotDigest: Sha256): void {
  db.transaction((tx) => {
    tx.exec(WORKSPACE_DDL);
    putMeta(tx, 'snapshot_digest', snapshotDigest);
  });
}

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

// ---------------------------------------------------------------- the pipeline

/**
 * Run one command. Returns applied, duplicate or refused; throws for anything that is not a refusal. `applied` means the
 * transaction committed and the cells read back as written.
 */
export function applyCommand(ctx: WriteContext, command: WriteCommand, options: ApplyOptions = {}): CommandResult {
  return execute(ctx, command, options, false);
}

/**
 * For the change-set coverage measurement only (coverage.ts): the judgement guards (evidence, Notes tokens, rulings, reviewers, natural keys,
 * the measurements rules) are off, because the history it replays holds data that today's judgement would refuse; the structural guards
 * (expectation, keys, types, references) stay on. A negative test shows each judgement guard fires for the same command in normal mode.
 */
export function applyLegacyCommand(ctx: WriteContext, command: WriteCommand, options: ApplyOptions = {}): CommandResult {
  return execute(ctx, command, options, true);
}

function execute(ctx: WriteContext, command: WriteCommand, options: ApplyOptions, legacy: boolean): CommandResult {
  const holder = ctx.schema;
  const installs: SchemaModel[] = [];
  try {
    const result = ctx.db.transaction(() => {
      const env = envOf(ctx, holder.model, options, legacy);
      const out = run(env, command);
      if (env.pendingModel !== null) installs.push(env.pendingModel);
      return out;
    });
    // The new schema takes effect only once its transaction has committed.
    const next = installs.at(-1);
    if (next !== undefined) holder.model = next;
    return result;
  } catch (error) {
    if (error instanceof Refusal || error instanceof StaleRefusal) return resultOf(error);
    throw error;
  }
}

function envOf(ctx: WriteContext, model: SchemaModel, options: ApplyOptions, legacy: boolean): Env {
  return { ctx, db: ctx.db, model, stamp: baseStampOf(ctx.db), rebase: options.rebase === true, legacy, pendingModel: null };
}

const proposalRefusal = (kind: WriteCommand['kind']): Refusal => new Refusal('unsupported-kind', `${kind} is not run by the write service yet (the proposal commands arrive with WP-28)`);

function plan(env: Env, command: WriteCommand): Plan {
  switch (command.kind) {
    case 'correctValue': return planCorrectValue(env, command);
    case 'addMeasurement':
    case 'addRecord': return planAdd(env, command);
    case 'retireRecord': return planRetire(env, command);
    case 'moveGrade': return planMoveGrade(env, command);
    case 'reviseProfile': return planReviseProfile(env, command);
    case 'reclassifyProduct': return planReclassifyProduct(env, command);
    case 'addVocab': return planAddVocab(env, command);
    case 'addColumn': return planAddColumn(env, command);
    case 'schemaEdit': return planSchemaEdit(env, command);
    case 'acceptProposal':
    case 'rejectProposal':
    case 'holdProposal':
      throw proposalRefusal(command.kind);
  }
}

type Done = Extract<CommandResult, { status: 'applied' | 'duplicate' }>;

function run(env: Env, command: WriteCommand): Done {
  const { db } = env;
  if (!isOpId(command.opId)) throw new Refusal('opid-invalid', `opId ${JSON.stringify(command.opId)} is not a ULID (26 characters of Crockford base32)`);
  if (command.kind === 'acceptProposal' || command.kind === 'rejectProposal' || command.kind === 'holdProposal') throw proposalRefusal(command.kind);

  // 1. Idempotency (04 section 7): a retried opId writes nothing, and says what it was before.
  const digest = sha256Of(commandJson(command));
  const earlier = earlierResult(env, command, digest);
  if (earlier !== null) return earlier;

  // 2. The command checks itself against every guard and says what it will write.
  const decided = plan(env, command);

  // 3. Write all the related cells together (or rebuild the schema), then prove they read back as written.
  if (decided.perform !== undefined) decided.perform(); else writeRows(env, decided.writes);

  // 4. The change record, in the same transaction.
  const base = env.rebase ? { snapshotDigest: env.stamp.snapshotDigest, commit: env.stamp.commit } : command.base;
  const next = Number(db.prepare('SELECT coalesce(max("seq"), 0) + 1 AS n FROM "change_log"').get()?.n);
  const recordId = changeRecordIdOf(command.opId);
  const record = recordOf(command, decided, { id: recordId, seq: next, base, time: env.ctx.now().toISOString() });
  db.prepare(`INSERT INTO "change_log" ("op_id", "change_record_id", "status", "command_sha256", "command_json", "record_json", "table_name", "record_id", "kind", "applied_at")
    VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`).run(command.opId, recordId, digest, commandJson(command), canonicalJson(plainJson(record)), record.table, record.recordId, command.kind, record.at);
  return { status: 'applied', changeRecordIds: [recordId], impact: { snapshotDigest: env.stamp.snapshotDigest, recordIds: [decided.recordId] } };
}

const pick = (cells: Readonly<Record<string, string | null>> | null, names: readonly string[]): Readonly<Record<string, string | null>> =>
  Object.fromEntries(names.map((name) => [name, cells === null ? null : cellAt(cells, name)]));

function alsoChangedOf(writes: readonly RowWrite[]): AlsoChanged[] {
  return writes.slice(1).map((w) => ({ table: w.table, recordId: w.id, before: pick(w.before, w.changed), after: pick(w.after, w.changed) }));
}

function recordOf(command: WriteCommand, decided: Plan, meta: { readonly id: ChangeRecord['id']; readonly seq: number; readonly base: ChangeRecord['base']; readonly time: string }): ChangeRecord {
  const also = alsoChangedOf(decided.writes);
  const common = {
    id: meta.id, opId: command.opId, seq: meta.seq, table: decided.table, recordId: decided.recordId, before: decided.recordBefore, after: decided.recordAfter,
    reason: command.reason, rulings: decided.rulings, actor: command.actor, reviewedBy: decided.reviewedBy, base: meta.base, at: meta.time,
    ...(decided.cellsApart === undefined ? {} : { cellsApart: decided.cellsApart }),
    ...(decided.quoteCheck === undefined ? {} : { quoteCheck: decided.quoteCheck }),
    ...(decided.args === undefined ? {} : { args: decided.args }),
    ...(also.length ? { alsoChanged: also } : {}),
    ...(decided.ledger === undefined ? {} : { ledger: decided.ledger }),
    ...(decided.duplicateOf === undefined ? {} : { duplicateOf: decided.duplicateOf }),
    tier: tierOf(command.kind, decided.table, decided.reviewedBy),
  };
  if (command.kind === 'correctValue' || command.kind === 'addMeasurement') {
    if (decided.evidence === undefined) throw new Error(`internal: a ${command.kind} reached its record without evidence`);
    return { ...common, kind: command.kind, evidence: decided.evidence };
  }
  return { ...common, kind: command.kind, ...(decided.evidence === undefined ? {} : { evidence: decided.evidence }) };
}

// ---------------------------------------------------------------- idempotency

/** What makes two commands "the same change": the kind and the cells or arguments they carry, not who wrote them, when, or why. */
function payloadOf(model: SchemaModel, command: WriteCommand): Json {
  const { table, id } = command.target;
  switch (command.kind) {
    case 'correctValue':
    case 'reviseProfile':
    case 'reclassifyProduct':
      return plainJson({ kind: command.kind, table, id, set: command.set });
    case 'addMeasurement':
    case 'addRecord': {
      const header = storageOf(table, model).header;
      return plainJson({ kind: command.kind, table, row: Object.fromEntries(header.map((name) => [name, cellAt(command.row, name)])) });
    }
    case 'retireRecord': return plainJson({ kind: command.kind, table, id, retire: command.retire });
    case 'moveGrade': return plainJson({ kind: command.kind, table, id, moveTo: command.moveTo });
    case 'addVocab': return plainJson({ kind: command.kind, table, vocab: command.vocab });
    case 'addColumn': return plainJson({ kind: command.kind, table, column: command.column });
    case 'schemaEdit': return plainJson({ kind: command.kind, table, schema: command.schema });
    case 'acceptProposal':
    case 'rejectProposal':
    case 'holdProposal': return plainJson({ kind: command.kind, table, id });
  }
}

/** A retried opId is a duplicate (logged, or already in a merged change set); a changed retry or a held conflict is refused. Null for a new opId. */
function earlierResult(env: Env, command: WriteCommand, digest: Sha256): Done | null {
  const logged = env.db.prepare('SELECT "change_record_id", "command_sha256" FROM "change_log" WHERE "op_id" = ?').get(command.opId);
  if (logged !== undefined) {
    if (logged.command_sha256 !== digest) throw new Refusal('opid-conflict', `opId ${command.opId} was applied before with different content; a retry repeats the command exactly, a new change needs a new opId`);
    return duplicate(logged.change_record_id, command, env.stamp);
  }
  const merged = env.ctx.mergedOps.get(command.opId);
  if (merged !== undefined) {
    // A merged opId is a retry only if it is the same change: same kind, same record, same cells.
    const same = merged.kind === command.kind && canonicalJson(payloadOf(env.model, commandOfRecord(merged))) === canonicalJson(payloadOf(env.model, command));
    if (!same) {
      throw new Refusal('opid-conflict', `opId ${command.opId} is in a merged change set as a change to ${merged.table} ${merged.recordId}, not this command; a retry repeats the command exactly, a new change needs a new opId`);
    }
    return duplicate(merged.id, command, env.stamp);
  }
  const conflict = env.db.prepare('SELECT "code", "detail" FROM "change_conflicts" WHERE "op_id" = ?').get(command.opId);
  if (conflict !== undefined) throw new Refusal('stale-base', `opId ${command.opId} is held as a conflict (${String(conflict.code)}: ${String(conflict.detail)}); write the correction again against what the record holds now, with a new opId`);
  return null;
}

function duplicate(loggedAs: unknown, command: WriteCommand, stamp: BaseStamp): Done {
  const recordId = changeRecordIdOf(command.opId);
  if (String(loggedAs) !== recordId) throw new Error(`internal: ${command.opId} is logged under ${String(loggedAs)}, not ${recordId}`);
  return { status: 'duplicate', changeRecordIds: [recordId], impact: { snapshotDigest: stamp.snapshotDigest, recordIds: command.target.id === undefined ? [] : [command.target.id] } };
}

// ---------------------------------------------------------------- a batch (generators)

export type BatchResult =
  | { readonly status: 'applied'; readonly results: readonly Done[] }
  | { readonly status: 'refused'; readonly index: number; readonly opId: string; readonly result: Extract<CommandResult, { status: 'refused' }> };

class BatchStop extends Error {
  readonly index: number;
  readonly opId: string;
  readonly result: Extract<CommandResult, { status: 'refused' }>;
  constructor(index: number, opId: string, result: Extract<CommandResult, { status: 'refused' }>) {
    super(`command ${index + 1} was refused (${result.code})`);
    this.name = 'BatchStop';
    this.index = index;
    this.opId = opId;
    this.result = result;
  }
}

const SCHEMA_KINDS: ReadonlySet<WriteCommand['kind']> = new Set<WriteCommand['kind']>(['addVocab', 'addColumn', 'schemaEdit']);

/**
 * Many commands, all or none: one transaction around them, so the first refusal rolls back every command before it and the batch reports which
 * one it was. A generator's output travels this way (a sweep is reviewed as a whole). A schema command is applied alone, never in a batch.
 */
export function applyBatch(ctx: WriteContext, commands: readonly WriteCommand[], options: ApplyOptions = {}): BatchResult {
  const holder = ctx.schema;
  const schemaAt = commands.findIndex((command) => SCHEMA_KINDS.has(command.kind));
  const first = commands[schemaAt];
  if (first !== undefined) {
    return { status: 'refused', index: schemaAt, opId: first.opId, result: { status: 'refused', code: 'not-for-command', detail: `${first.kind} changes the schema and is applied alone, never in a batch` } };
  }
  try {
    const results = ctx.db.transaction(() => commands.map((command, index) => {
      try {
        return run(envOf(ctx, holder.model, options, false), command);
      } catch (error) {
        if (error instanceof Refusal || error instanceof StaleRefusal) throw new BatchStop(index, command.opId, resultOf(error));
        throw error;
      }
    }));
    return { status: 'applied', results };
  } catch (error) {
    if (error instanceof BatchStop) return { status: 'refused', index: error.index, opId: error.opId, result: error.result };
    throw error;
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

/**
 * A change record as the command that made it, for replay. A correction keeps its expectation in `before` and its cells in `after`; every other
 * kind keeps its `expect` and its own arguments in `args`. The command is read back through the same parser a command file goes through, so
 * a record that does not make a whole command is an error, not a guess.
 */
export function commandOfRecord(record: ChangeRecord): WriteCommand {
  const args = record.args ?? {};
  const common = {
    opId: record.opId, kind: record.kind, reason: record.reason, ...(record.rulings.length ? { rulings: record.rulings } : {}), actor: record.actor,
    ...(record.reviewedBy.length ? { reviewedBy: record.reviewedBy } : {}), base: record.base,
    expect: args.expect ?? { cells: record.before },
    ...(record.evidence === undefined ? {} : { evidence: record.evidence }),
    ...(record.cellsApart === undefined ? {} : { apart: record.cellsApart }),
  };
  const target = { table: record.table, id: record.recordId };
  const body = (): Record<string, unknown> => {
    switch (record.kind) {
      case 'correctValue':
      case 'reviseProfile':
      case 'reclassifyProduct': return { target, set: record.after };
      case 'addMeasurement':
      case 'addRecord': return { target: { table: record.table }, row: record.after, ...(record.duplicateOf === undefined ? {} : { duplicateOf: record.duplicateOf }) };
      case 'retireRecord': return { target, retire: args.retire };
      case 'moveGrade': return { target, moveTo: args.moveTo, expectMaterial: args.expectMaterial };
      case 'addVocab': return { target: { table: record.table, id: record.recordId }, vocab: args.vocab };
      case 'addColumn': return { target: { table: record.table }, column: args.column };
      case 'schemaEdit': return { target: { table: record.table }, schema: args.schema };
      case 'acceptProposal':
      case 'rejectProposal':
      case 'holdProposal': throw new Error(`record ${record.id} is a ${record.kind}; the proposal commands arrive with WP-28`);
    }
  };
  const parsed = parseCommand({ ...common, ...body() });
  if (!parsed.ok) throw new Error(`record ${record.id} (${record.kind}) does not make a command: ${parsed.problems.join('; ')}`);
  return parsed.value;
}

/** The tables whose CSV a record changes: its own and a cascade's, or, for a schema command, the tables it reshaped. */
export function tablesTouched(record: ChangeRecord): TableName[] {
  const reshaped = record.args?.tables;
  if (record.kind === 'addVocab' || record.kind === 'addColumn' || record.kind === 'schemaEdit') {
    return Array.isArray(reshaped) ? reshaped.flatMap((t) => (typeof t === 'string' && isTableName(t) ? [t] : [])) : [];
  }
  return [record.table, ...(record.alsoChanged ?? []).map((c) => c.table)];
}
