// Generators (WP-17; pack 04 section 5 "Generators", 02 section 9.1 rule 5, ADR-03 decision 5).
//
// About 28% of the migrations were rule-driven sweeps. A sweep here is a generator: a function that LOOKS at the workspace (read only: it is
// handed rows, never the database) and EMITS explicit commands, one per cell edit or row, each with its own `expect`. It states how many it
// expects (`expectCount`) and is refused when it emits another number. It never writes a table. Its output travels to the write service as one
// batch (all or none), and the change set names the generator. A sweep is NEVER replayed: re-running code on a moved base could match other
// cells, so a replay applies the recorded commands, and after a rebase the author runs the sweep again on purpose and reviews the new list.
import { createHash } from 'node:crypto';
import type { Actor, CanonicalCells, CommandBase, EvidenceRef, GeneratorRef, OpId, Sha256, WriteCommand } from '@atlas/domain/contracts';
import { isOpId } from './digest.ts';
import { TABLES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { parseCommand } from './parse.ts';
import { readCells, storageOf } from './storage.ts';
import type { BatchResult } from './write.ts';
import type { Workspace } from './workspace.ts';

/** What a sweep sees: the rows as they are, in file order, and the base its commands are written against. Nothing it can write with. */
export interface SweepView {
  readonly base: CommandBase;
  readonly schemaDigest: Sha256;
  /** Every record of a table as its cells by column name, in `_ord` order. */
  rows(table: TableName): CanonicalCells[];
  /**
   * The ID of the `index`-th command of this run: the same from the same generator, arguments, base and index, so a sweep retried after a crash
   * produces the same commands and the retry is a duplicate, never a second edit (DP-9).
   */
  opId(index: number): OpId;
}

export interface Sweep {
  /** Where the generator lives (a script path or a module name): it is in the change set. */
  readonly path: string;
  readonly version: string;
  readonly args: readonly string[];
  /** How many commands the author expects. A different number is a refusal, before anything is applied. */
  readonly expectCount: number;
  emit(view: SweepView): Iterable<WriteCommand>;
}

/** A sweep that emitted another number of commands than it said it would. Nothing was written. */
export class SweepCountError extends Error {
  readonly expected: number;
  readonly found: number;
  constructor(sweep: Pick<Sweep, 'path' | 'expectCount'>, found: number) {
    super(`${sweep.path} expected ${sweep.expectCount} command(s) and emitted ${found}; nothing was applied. A sweep that moved is read again and its new list reviewed, never applied on a guess`);
    this.name = 'SweepCountError';
    this.expected = sweep.expectCount;
    this.found = found;
  }
}

/** A sweep that emitted something that is not an explicit, well-formed command. */
export class SweepOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SweepOutputError';
  }
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A ULID-shaped opId made from a seed: the same seed, the same ID. The first character is kept within the ULID time range (0 to 7). */
export function opIdFromSeed(seed: string): OpId {
  const bytes = createHash('sha256').update(seed).digest();
  const chars = [...bytes.subarray(0, 26)].map((byte, k) => CROCKFORD.charAt(k === 0 ? byte % 8 : byte % 32));
  const id = chars.join('');
  if (!isOpId(id)) throw new Error(`internal: ${id} is not a ULID`);
  return id;
}

export function viewOf(ws: Workspace, sweep: Pick<Sweep, 'path' | 'version' | 'args'>): SweepView {
  const stamp = ws.stamp();
  const base: CommandBase = { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit };
  const seed = [sweep.path, sweep.version, ...sweep.args, base.snapshotDigest, stamp.schemaSha256].join('\0');
  return {
    base,
    schemaDigest: stamp.schemaSha256,
    rows(table) {
      const header = storageOf(table, ws.schema).header;
      return [...readCells(ws.db, table, ws.schema)].map((cells) => Object.fromEntries(header.map((name, k) => [name, cells[k] ?? null])));
    },
    opId: (index) => opIdFromSeed(`${seed}\0${index}`),
  };
}

export interface SweepRun {
  readonly commands: readonly WriteCommand[];
  readonly ref: GeneratorRef;
}

/**
 * Run a sweep without applying it: its commands, and the reference the change set will carry. Throws SweepCountError when the count differs
 * from `expectCount`, and SweepOutputError for a command that is not explicit JSON the service understands or that repeats an opId.
 */
export function runSweep(ws: Workspace, sweep: Sweep): SweepRun {
  const emitted = [...sweep.emit(viewOf(ws, sweep))];
  if (emitted.length !== sweep.expectCount) throw new SweepCountError(sweep, emitted.length);
  const seen = new Set<string>();
  const commands = emitted.map((command, index) => {
    // A command must survive being written down and read back: that is the form it is reviewed and kept in.
    const parsed = parseCommand(JSON.parse(JSON.stringify(command)));
    if (!parsed.ok) throw new SweepOutputError(`${sweep.path}: command ${index + 1} is not a command the write service reads: ${parsed.problems.join('; ')}`);
    if (seen.has(parsed.value.opId)) throw new SweepOutputError(`${sweep.path}: commands ${index + 1} and an earlier one share the opId ${parsed.value.opId}; each change has its own`);
    seen.add(parsed.value.opId);
    return parsed.value;
  });
  return { commands, ref: { path: sweep.path, version: sweep.version, args: [...sweep.args], expectCount: sweep.expectCount } };
}

export type SweepApplied =
  | { readonly status: 'applied'; readonly ref: GeneratorRef; readonly applied: number; readonly duplicates: number }
  | { readonly status: 'refused'; readonly ref: GeneratorRef; readonly batch: Extract<BatchResult, { status: 'refused' }> };

/** Run a sweep and apply what it emitted as one batch: every command or none. The reference goes to `exportChangeSet({ generator })`. */
export function applySweep(ws: Workspace, sweep: Sweep): SweepApplied {
  const { commands, ref } = runSweep(ws, sweep);
  const batch = ws.applyBatch(commands);
  if (batch.status === 'refused') return { status: 'refused', ref, batch };
  return { status: 'applied', ref, applied: batch.results.filter((r) => r.status === 'applied').length, duplicates: batch.results.filter((r) => r.status === 'duplicate').length };
}

// ---------------------------------------------------------------- a sweep for the commonest job: one cell, wherever it holds one value

export interface CellSweepSpec {
  readonly path: string;
  readonly version: string;
  readonly table: TableName;
  readonly column: string;
  readonly from: string;
  readonly to: string;
  readonly expectCount: number;
  readonly reason: string;
  readonly actor: Actor;
  readonly evidence: EvidenceRef;
}

/** "Set <column> of <table> to <to> wherever it is <from>": one explicit correction per record, each expecting the value it replaces. */
export function cellSweep(spec: CellSweepSpec): Sweep {
  return {
    path: spec.path,
    version: spec.version,
    args: [spec.table, spec.column, spec.from, spec.to],
    expectCount: spec.expectCount,
    emit(view) {
      const key = view.rows(spec.table);
      return key.flatMap((row, index) => {
        if (row[spec.column] !== spec.from) return [];
        const id = idOf(spec.table, row);
        return [{
          opId: view.opId(index), kind: 'correctValue' as const, target: { table: spec.table, id },
          expect: { cells: { [spec.column]: spec.from } }, set: { [spec.column]: spec.to }, evidence: spec.evidence, reason: spec.reason, actor: spec.actor, base: view.base,
        }];
      });
    },
  };
}

/** The record ID of a row as the journal names it: the first key column's cell, or the unique key's cells joined by " | ". */
function idOf(table: TableName, row: CanonicalCells): string {
  const info = TABLES[table];
  const key = info.primaryKey.length ? info.primaryKey : (info.uniqueKeys[0] ?? []);
  const parts = key.map((name) => row[name] ?? null);
  if (key.length === 0 || parts.some((part) => part === null)) throw new SweepOutputError(`${table} has a row with no key to address it by`);
  return parts.join(' | ');
}
