// Change records and change sets (02 section 9.2). Types only. The export that writes them is WP-10.

import type { TableName } from '@atlas/data';
import type { ChangeRecordId, ChangeSetId, OpId, Sha256 } from './ids.ts';
import type { Actor, CanonicalCells, CommandBase, EvidenceRef, OtherWriteKind, RulingRef } from './write.ts';
import type { ChangeStatus } from './vocab.ts';

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
  readonly moved: number;
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
  readonly impact: { readonly answersMoved: DecisionDiffSummary; readonly reportPath: string };
  readonly generator?: GeneratorRef;
};
