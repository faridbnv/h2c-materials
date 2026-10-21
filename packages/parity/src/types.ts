// The parity contract: what an adapter returns and what a report says (WP-05 a; pack 07 section 5, pack 02 section 9.8).
// Erasable TypeScript only (type annotations, `import type`), so Node runs it directly with type stripping.

/** The four tiers. Pack 07 section 5.3 calls them T0 decision, T1 presentation, T2 evidence, T3 wording. */
export const TIERS = ['decision', 'presentation', 'evidence', 'wording'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * A value an adapter reports for one field of one record. Composite values (lists, objects) are encoded to a canonical
 * string by canon() before they get here, so a field is always one atom. Numbers are compared with Object.is.
 * `undefined` (present but undefined) and an absent field are different things on purpose.
 */
export type Atom = string | number | boolean | null | undefined;

/** A field the adapter could not produce. It is never equal to anything, including another NotComputable, and never zero. */
export interface NotComputable {
  readonly notComputable: true;
  readonly reason: string;
}
export type Value = Atom | NotComputable;

/** One record's fields, by tier. A record is one material, product, requirement result, or the case summary. */
export type RecordFacts = Partial<Record<Tier, Record<string, Value>>>;

/** The scenario a corpus case asks. Every field is explicit, so no side relies on a default. */
export interface CorpusScenario {
  constraints: object[];
  unknownPolicy: 'strict' | 'exploration';
  useEstimates: boolean;
  evidence: 'comparable' | 'as-published';
  moisture: 'dry' | 'conditioned';
  anneal: boolean;
  annealMaxC: number | null;
}

export interface CorpusCase {
  /** Stable across runs and across corpus versions: group/name/mode. Reports and transitions are keyed by it. */
  id: string;
  group: 'template' | 'census' | 'random';
  name: string;
  scenario: CorpusScenario;
}

export interface Corpus {
  corpus: string;
  version: number;
  generatedFrom: { release: string | null; snapshot: string | null };
  seed: number;
  counts: Record<string, number>;
  cases: CorpusCase[];
}

/**
 * What an adapter says about one case. `computed` carries records keyed by stable IDs:
 *   case                          the counts and the candidate order
 *   material:<M>                  one per material
 *   product:<M>/<G>               one per product judged for the material
 *   req:<M>/<G>/<c#:key>          one per product and requirement
 *   mreq:<M>/<c#:key>             one per material-level requirement result
 * `not-computable` is the whole case: the adapter could not answer. It is its own outcome, never zero, never a pass.
 */
export type NormalizedCase =
  | { caseId: string; outcome: 'computed'; records: Record<string, RecordFacts> }
  | { caseId: string; outcome: 'not-computable'; reason: string };

/** An engine under test, old or new. `evaluate` must not throw for a case it cannot answer; it returns not-computable. */
export interface Adapter {
  readonly name: string;
  evaluate(corpusCase: CorpusCase): NormalizedCase | Promise<NormalizedCase>;
  close?(): void;
}

/** One observed difference. before and after are display strings from show(), so a transition file is plain JSON. */
export interface Difference {
  case: string;
  record: string;
  tier: Tier;
  field: string;
  before: string;
  after: string;
}

/** A place where the comparison could not be made. Listed apart from differences; never counted as equal. */
export interface NotComputableItem {
  case: string;
  record: string | null;
  tier: Tier | null;
  field: string | null;
  side: 'before' | 'after' | 'both';
  reason: string;
}

/** The outcome words of pack 07 section 5.5. */
export type Status = 'zero' | 'matches-transition' | 'differs' | 'not-computable';

export interface TransitionFile {
  id: string;
  kind: 'science' | 'determinism' | 'display' | 'wording';
  description: string;
  /** The owner ruling or decision record that allows this exact change. */
  ruling: string;
  corpus: string;
  differences: Difference[];
  /** sha256 over the sorted difference list; see transitions.ts. */
  digest: string;
}

export interface TransitionMatch {
  files: string[];
  expected: number;
  /** Observed but not listed. Any of these fails the run. */
  unexpected: Difference[];
  /** Listed but not observed. Any of these fails the run. */
  missing: Difference[];
}

export interface ParityReport {
  corpus: string;
  before: string;
  after: string;
  casesInCorpus: number;
  casesCompared: number;
  casesNotComputable: number;
  recordsCompared: number;
  /** One per (record, tier) block that both sides produced and the comparer looked at. */
  blocksCompared: number;
  differences: Difference[];
  differencesByTier: Record<Tier, number>;
  movedRecords: string[];
  notComputable: NotComputableItem[];
  transitions: TransitionMatch | null;
  status: Status;
  timingsMs: { before: number; after: number; compare: number; total: number };
}
