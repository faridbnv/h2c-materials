// Change records and change sets (02 section 9.2). Types only. The export that writes them is WP-10.

import type { TableName } from '@atlas/data';
import type { ChangeRecordId, ChangeSetId, OpId, Sha256 } from './ids.ts';
import type { Actor, CanonicalCells, CommandBase, DuplicateOf, EvidenceRef, OtherWriteKind, RulingRef } from './write.ts';
import type { ChangeStatus } from './vocab.ts';

/**
 * What the quote check found when the command was applied (04 section 5.1, "without the store"). `verified` means the
 * quote was found on the hash-checked page of the private store; `not-run` means it could not be looked for (no store, or
 * no text for that document), which is never a pass. CI shows "verified locally (ops digest X; not re-checkable in CI)",
 * "stale" when the digest no longer matches the record, or "not run: store absent".
 */
export type QuoteCheck = {
  readonly status: 'verified' | 'not-run';
  /** SHA-256 of the canonical JSON of what was checked: table, record, new cells and evidence. */
  readonly opsDigest: Sha256;
  readonly commit: string;
  /** Why it did not run. */
  readonly reason?: string;
};

/** JSON, for what a record keeps of its command beyond cells. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** One more row a command changed (a cascade: moving a grade moves the records filed under it). */
export type AlsoChanged = { readonly table: TableName; readonly recordId: string; readonly before: CanonicalCells; readonly after: CanonicalCells };

/** A row of data/review/removed-records.csv (D72): a record leaving its key, with where it went. `Migration` is filled with the change set's ID at export. */
export type LedgerRow = { readonly Table: string; readonly Record: string; readonly Where: string };

type ChangeRecordCommon = {
  readonly id: ChangeRecordId;
  readonly opId: OpId;
  /** Order within its change set, from 1. */
  readonly seq: number;
  readonly table: TableName;
  readonly recordId: string;
  readonly before: CanonicalCells;
  readonly after: CanonicalCells;
  readonly reason: string;
  readonly rulings: readonly RulingRef[];
  readonly actor: Actor;
  /** Each reviewer with their kind (OQ-17 A). */
  readonly reviewedBy: readonly Actor[];
  readonly base: CommandBase;
  /** ISO 8601 time it was applied. */
  readonly at: string;
  /** Present when the command gave a reason why raw, numeric and normalized cells changed apart. */
  readonly cellsApart?: string;
  /** Present on a record that has evidence. */
  readonly quoteCheck?: QuoteCheck;
  /**
   * What the command was given beyond the cells: its `expect` and its kind's own fields, so a record replays as the command that made it
   * (a correction needs none: its `before` is its expectation). Absent on records of write service v1.
   */
  readonly args?: { readonly [key: string]: JsonValue };
  /** The rows a cascade changed besides `table`/`recordId`. */
  readonly alsoChanged?: readonly AlsoChanged[];
  /** The D72 ledger rows the command owes. */
  readonly ledger?: readonly LedgerRow[];
  /** 1 when the change needs the owner's eyes: a schema command, a rule row, or a human among the reviewers (04 section 5.1). */
  readonly tier?: 0 | 1;
  /** Present when an append is a twin on purpose. */
  readonly duplicateOf?: DuplicateOf;
};

/**
 * One applied change to one record: the cells before and after, as canonical text. A correction and a new measurement
 * keep their evidence in the record too, since the change set is what CI replays and what is kept.
 */
export type ChangeRecord =
  | (ChangeRecordCommon & { readonly kind: 'correctValue' | 'addMeasurement'; readonly evidence: EvidenceRef })
  | (ChangeRecordCommon & { readonly kind: OtherWriteKind; readonly evidence?: EvidenceRef });

/** A change record in the workspace `change_log` table, with its state. */
export type ChangeLogEntry = ChangeRecord & { readonly status: ChangeStatus };

/** How many answers a change moved (WP-11's impact preview fills it). Loose until then. */
export type DecisionDiffSummary = {
  /** `null` until the impact preview has run (WP-11): an export before that does not claim that nothing moved. */
  readonly moved: number | null;
  /** "estimates pending" while the estimate stage has not rerun (02 section 11). */
  readonly estimatesPending: boolean;
  readonly byTemplate?: Readonly<Record<string, number>>;
};

/** A script that changes many rows is a generator: it emits commands, and says how many (02 section 9.1 rule 5). */
export type GeneratorRef = { readonly path: string; readonly version: string; readonly args: readonly string[]; readonly expectCount: number };

/**
 * One export: a file named by date, topic and short hash, never a counter, so parallel worktrees cannot collide. CI
 * applies it to `base` and requires `result` (replay equality); once merged it is immutable.
 */
export type ChangeSet = {
  readonly id: ChangeSetId;
  readonly title: string;
  readonly records: readonly ChangeRecord[];
  readonly base: { readonly snapshotDigest: Sha256 };
  readonly result: { readonly snapshotDigest: Sha256 };
  readonly impact: { readonly answersMoved: DecisionDiffSummary; readonly reportPath: string | null };
  readonly generator?: GeneratorRef;
  /** The schema's digest before and after, present when the change set edits the schema (the snapshot digest covers the tables, not the schema). */
  readonly schema?: { readonly base: Sha256; readonly result: Sha256 };
};
