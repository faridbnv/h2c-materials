// A proposal: one reading of a source, before anyone accepts it (02 section 9.4). Types only.
// Every extraction method produces this one shape; accepting it is a write command (acceptProposal) with every guard.

import type { GradeId, ProposalId, Sha256, SourceId } from './ids.ts';
import type { ProposalState } from './vocab.ts';

/** How it was read. An AI reading names its model and prompt; the rule reader checks AI readings, never the reverse. */
export type ReadingMethod =
  | { readonly kind: 'rule'; readonly reader: string; readonly runId: string }
  | { readonly kind: 'ai'; readonly reader: string; readonly modelId: string; readonly promptSha256: Sha256; readonly runId: string };

/** Only a held proposal carries a reason, and it always does. */
export type ProposalStatus =
  | { readonly state: Exclude<ProposalState, 'held'> }
  | { readonly state: Extract<ProposalState, 'held'>; readonly heldReason: string };

export type Proposal = {
  readonly id: ProposalId;
  /** The source and the digest of the exact bytes read: what acceptProposal's EvidenceRef needs. */
  readonly sourceId: SourceId;
  readonly sourceSha256: Sha256;
  readonly page: number;
  readonly locator: string;
  readonly view: 'line' | 'reading' | 'ocr';
  /** The raw words on the page. */
  readonly quote: string;
  /** The product it is about, or the words that name it when the identity is not resolved yet. */
  readonly target: { readonly productId: GradeId; readonly unresolvedIdentity?: never } | { readonly unresolvedIdentity: string; readonly productId?: never };
  readonly interpretation: {
    readonly property: string;
    /** As printed: text, never a parsed number. */
    readonly value: string;
    readonly unit: string;
    readonly conditions: Readonly<Record<string, string>>;
  };
  readonly method: ReadingMethod;
  readonly secondRead?: 'agreed' | 'disagreed' | 'not-run';
  /** A record-tier fact never feeds a decision. */
  readonly tier: 'decision' | 'record';
  readonly status: ProposalStatus;
};
