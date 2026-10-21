// The write command, its result, and who acts (02 sections 9.1 and 3.1; owner rulings OQ-16 A, OQ-17 A). Types only.
// The write service that runs them is WP-10.

import type { TableName } from '@atlas/data';
import type { ChangeRecordId, OpId, SourceId, Sha256 } from './ids.ts';
import type { ActorKind } from './vocab.ts';

/**
 * Cells as canonical CSV text (02 section 9.3): the exact text the file holds, `null` for an empty cell. Never a parsed
 * number, so "4.30" stays "4.30".
 */
export type CanonicalCells = Readonly<Record<string, string | null>>;

/** Who acted. An agent always names its model (OQ-17 A: the reviewer's kind is recorded from now on). */
export type Actor =
  | { readonly kind: Extract<ActorKind, 'human'>; readonly name: string }
  | { readonly kind: Extract<ActorKind, 'agent'>; readonly name: string; readonly model: string; readonly session?: string };

/** The page and words a decision-reading value rests on: a hash-checked page of a retrieved source (02 section 9.1 rule 2). */
export type EvidenceRef = {
  readonly sourceId: SourceId;
  readonly sha256: Sha256;
  /** 1-based page of the hash-checked document. */
  readonly page: number;
  readonly locator: string;
  /** The source's own words, which must be on that page. */
  readonly quote: string;
};

/** The approved state a command was written against (02 section 9.1). */
export type CommandBase = { readonly snapshotDigest: Sha256; readonly commit: string };

/**
 * What the writer saw. Required (rule 1): a command whose expectation no longer holds is refused as stale. At least one
 * of the three is given. An empty `cells` expects nothing and is refused (`expectation-empty`), which a type cannot say.
 */
export type Expectation =
  | { readonly rowHash: Sha256; readonly cells?: CanonicalCells; readonly schemaDigest?: Sha256 }
  | { readonly rowHash?: Sha256; readonly cells: CanonicalCells; readonly schemaDigest?: Sha256 }
  | { readonly rowHash?: Sha256; readonly cells?: CanonicalCells; readonly schemaDigest: Sha256 };

export type WriteKind =
  | 'correctValue' | 'addMeasurement' | 'retireRecord' | 'moveGrade' | 'reviseProfile'
  | 'reclassifyProduct' | 'acceptProposal' | 'rejectProposal' | 'holdProposal'
  | 'addVocab' | 'addColumn' | 'schemaEdit';

/** A ruling's ID in docs/next/rulings.csv (docs/rulings.csv after cutover). */
export type RulingRef = string;

type CommandCommon<K extends WriteKind> = {
  /** The same opId twice is applied once. */
  readonly opId: OpId;
  readonly kind: K;
  readonly target: { readonly table: TableName; readonly id?: string };
  readonly expect: Expectation;
  readonly reason: string;
  /** Required on rule rows (class limits, conversions, chamber rows, plausibility windows), which travel alone (rule 4). */
  readonly rulings?: readonly RulingRef[];
  readonly actor: Actor;
  readonly base: CommandBase;
};

/** A value correction. It changes a decision-reading column, so it always carries its evidence (rule 2). */
export type CorrectValueCommand = CommandCommon<'correctValue'> & { readonly set: CanonicalCells; readonly evidence: EvidenceRef };
/** A new measurement row, appended at the end of its table, with its evidence. */
export type AddMeasurementCommand = CommandCommon<'addMeasurement'> & { readonly row: CanonicalCells; readonly evidence: EvidenceRef };
/**
 * Every other kind, one member per kind so a handler can narrow to its own. Evidence is required whenever a
 * decision-reading column changes (checked by the service, WP-10).
 */
export type OtherWriteKind = Exclude<WriteKind, 'correctValue' | 'addMeasurement'>;
export type OtherWriteCommand = {
  [K in OtherWriteKind]: CommandCommon<K> & { readonly set?: CanonicalCells; readonly evidence?: EvidenceRef };
}[OtherWriteKind];

export type WriteCommand = CorrectValueCommand | AddMeasurementCommand | OtherWriteCommand;

/**
 * Why a command was refused. PLACEHOLDER, named from the rules of 02 section 9.1; WP-10 fixes the list with one test
 * per guard and per refusal.
 */
export type RefusalCode =
  | 'stale'                  // rule 1: the expectation no longer holds
  | 'expectation-empty'      // rule 1: `expect` names nothing to check (an empty cells object)
  | 'source-hash-mismatch'   // rule 2: the hash does not match the source row
  | 'source-not-retrieved'   // rule 2: the source is not retrieved and cited
  | 'quote-not-on-page'      // rule 2: the quote is not on the hash-checked page
  | 'value-not-printed'      // rule 2 (D97): not a number its own line prints in one role
  | 'cells-not-together'     // rule 2: raw, numeric and normalized cells must change together
  | 'evidence-missing'       // rule 2: a decision-reading column changes without evidence
  | 'delete-refused'         // rule 3: nothing is deleted
  | 'ruling-missing'         // rule 4: a rule row cites no existing ruling
  | 'rule-row-not-alone'     // rule 4: a rule row shares its change set
  | 'notes-id-token'         // rule 6 (OQ-16 A): new Notes text carries a change-set or migration ID
  | 'writer-locked';         // one writer at a time (WP-10 slice a)

/**
 * What the record and schema hold now, for a stale refusal beside what the command expected. A record that does not
 * exist (or an appended row) has no hash and no cells.
 */
export type CurrentState = { readonly rowHash: Sha256 | null; readonly cells: CanonicalCells | null; readonly schemaDigest: Sha256 };

/** What the impact preview is asked to run after a write (02 section 11; WP-11 designs it). Loose. */
export type ImpactRequest = { readonly snapshotDigest: Sha256; readonly recordIds: readonly string[] };

export type CommandResult =
  | { readonly status: 'applied' | 'duplicate'; readonly changeRecordIds: readonly ChangeRecordId[]; readonly impact: ImpactRequest }
  | { readonly status: 'refused'; readonly code: 'stale'; readonly detail: string; readonly expected: Expectation; readonly current: CurrentState }
  | { readonly status: 'refused'; readonly code: Exclude<RefusalCode, 'stale'>; readonly detail: string };
