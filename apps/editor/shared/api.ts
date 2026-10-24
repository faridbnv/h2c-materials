// What the editor's service says and the interface reads (WP-13). Types only, so the Node service and the Vue interface
// share one description without sharing code. Everything on the wire is JSON.
import type { RefusalCode } from '@atlas/domain/contracts';

export type Cells = Readonly<Record<string, string | null>>;

/** Why the editor itself (not the write service) turned a request down. */
export type EditorRefusalCode = 'source-unavailable' | 'bad-request' | 'not-found' | 'export-refused' | 'busy' | 'restart-needed';

export interface ApiError {
  readonly error: string;
  readonly message: string;
}

// ---------------------------------------------------------------- the workspace strip (05 section 11.3)

export interface WorkspaceState {
  readonly sandbox: true;
  /** The data commit the workspace was built from. */
  readonly commit: string;
  readonly snapshotDigest: string;
  /** Why Git has moved since the workspace was built, or null. */
  readonly behind: string | null;
  readonly drafts: number;
  readonly conflicts: number;
  readonly lastBackupAt: string | null;
  /** What the open check did when this session started, or null when nothing had moved. */
  readonly rebased: { readonly reason: string; readonly applied: number; readonly merged: number; readonly conflicts: number } | null;
  readonly exportDir: string;
  readonly source: { readonly available: boolean; readonly note: string };
  readonly impact: { readonly available: boolean; readonly note: string };
}

// ---------------------------------------------------------------- find and record

export interface ProductHit {
  readonly gradeId: string;
  readonly materialId: string;
  readonly manufacturer: string;
  readonly productName: string;
  readonly materialName: string;
  readonly status: string;
}

export interface MeasurementRow {
  readonly id: string;
  readonly property: string;
  readonly rawValue: string | null;
  readonly rawUnit: string | null;
  readonly normalizedValue: string | null;
  readonly normalizedUnit: string | null;
  /** The conditions the value was measured under, in plain order: direction, test temperature, standard, moisture. */
  readonly conditions: readonly string[];
  readonly dataStatus: string | null;
  readonly sourceId: string | null;
  readonly locator: string | null;
  readonly draft: boolean;
}

export interface ProductDetail {
  readonly product: ProductHit;
  readonly details: readonly { readonly label: string; readonly value: string }[];
  readonly measurements: readonly MeasurementRow[];
}

export type SourceAvailability = 'available' | 'no-store' | 'not-in-store' | 'not-retrieved' | 'no-digest' | 'unknown-source';

export interface SourceInfo {
  readonly sourceId: string;
  readonly title: string | null;
  readonly publisher: string | null;
  readonly revision: string | null;
  readonly accessState: string | null;
  readonly sha256: string | null;
  readonly availability: SourceAvailability;
  /** Plain words on why the page cannot be shown, or what the viewer shows. */
  readonly note: string;
  readonly pageCount: number | null;
  /** Pages the private store also holds an image of. */
  readonly imagePages: readonly number[];
}

export interface SourcePage {
  readonly sourceId: string;
  readonly page: number;
  readonly pageCount: number;
  readonly lines: readonly string[];
}

export interface MeasurementDetail {
  readonly id: string;
  readonly property: string;
  /** The whole record as the workspace holds it, by column name. */
  readonly cells: Cells;
  /** The approved base the writer saw (the command is written against it). */
  readonly base: { readonly snapshotDigest: string; readonly commit: string };
  readonly source: SourceInfo | null;
  /** The page the locator names, when it names one. */
  readonly pageHint: number | null;
  /** Normalized = raw numeric x factor, when the record has a plain factor. */
  readonly factor: string | null;
  readonly pendingDraft: boolean;
}

// ---------------------------------------------------------------- the correction

export interface CorrectionRequest {
  readonly measurementId: string;
  /** The values the writer saw (the write service refuses when the record no longer holds them). */
  readonly expect: Cells;
  /** The new values: raw value, raw numeric and normalized value, together. */
  readonly set: Cells;
  readonly reason: string;
  readonly evidence: { readonly page: number; readonly locator: string; readonly quote: string };
  readonly base: { readonly snapshotDigest: string; readonly commit: string };
}

export interface QuoteCheckResult {
  readonly status: 'verified' | 'not-run';
  readonly reason: string | null;
}

export type CorrectionResponse =
  | { readonly status: 'applied' | 'duplicate'; readonly opId: string; readonly quoteCheck: QuoteCheckResult | null }
  | { readonly status: 'refused'; readonly code: RefusalCode | EditorRefusalCode; readonly detail: string;
      /** For a stale edit: what the writer expected and what the record holds now. */
      readonly stale?: { readonly expected: Cells; readonly current: Cells | null } };

// ---------------------------------------------------------------- drafts and conflicts

export interface DraftEntry {
  readonly seq: number;
  readonly opId: string;
  readonly status: 'draft' | 'exported';
  readonly changeSetId: string | null;
  readonly table: string;
  readonly recordId: string;
  readonly label: string;
  readonly before: Cells;
  readonly after: Cells;
  readonly reason: string;
  readonly evidence: { readonly sourceId: string; readonly page: number; readonly locator: string; readonly quote: string } | null;
  readonly quoteCheck: QuoteCheckResult | null;
  readonly at: string;
}

export interface ConflictEntry {
  readonly opId: string;
  readonly code: string;
  readonly detail: string;
  readonly foundAt: string;
  readonly table: string;
  readonly recordId: string;
  readonly label: string;
  /** The values the draft expected, the values now in the data, and the values the draft wanted (by column). */
  readonly expected: Cells;
  readonly now: Cells | null;
  readonly wanted: Cells;
  readonly reason: string;
  readonly evidence: { readonly sourceId: string; readonly page: number; readonly quote: string } | null;
}

export type ConflictAction = 'apply-mine' | 'discard';

// ---------------------------------------------------------------- impact

export interface ImpactMove {
  readonly case: string;
  readonly record: string;
  readonly materialId: string;
  readonly changes: readonly { readonly field: string; readonly before: string; readonly after: string }[];
}

export type ImpactResponse =
  | { readonly status: 'unavailable'; readonly reason: string }
  | { readonly status: 'nothing-pending'; readonly reason: string }
  | { readonly status: 'failed'; readonly reason: string }
  | {
      readonly status: 'ready';
      readonly mode: string;
      readonly moved: number;
      readonly estimatesPending: boolean;
      /** How many questions were put to the engine, how many it answered, and how many wait for the estimate stage. */
      readonly questions: { readonly asked: number; readonly answered: number; readonly estimatesPending: number };
      readonly byTemplate: Readonly<Record<string, number>>;
      readonly listingShifts: number;
      readonly materials: readonly string[];
      readonly moves: readonly ImpactMove[];
      readonly seconds: number;
    };

// ---------------------------------------------------------------- backups and export

export interface BackupEntry {
  readonly name: string;
  readonly at: string | null;
  readonly reason: string;
}

export interface ExportRequest {
  readonly title: string;
}

export interface ExportResponse {
  readonly changeSetId: string;
  readonly changeSetPath: string;
  readonly exportDir: string;
  readonly tables: readonly string[];
  readonly files: readonly string[];
  readonly records: number;
}
