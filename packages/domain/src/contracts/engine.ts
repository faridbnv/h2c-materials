// The engine's input and output (02 section 9.5), and the public types the interface reads. Types only.
//
// Loose first (15-TYPESCRIPT-PLAN section 4): RequirementResult is today's one result bag with every field optional, as
// app/js/engine/constraints.js productResult copies it. It is tightened to one type per kind of check under parity
// (WP-18, WP-19); reasonCode and constraintId stay optional until reason codes and constraint IDs land.
// Words keep the engine's spelling: a status is 'PASS', not 'pass', so parity compares like with like.

import type { Db } from '@atlas/data';
import type { ConstraintId, GradeId, MaterialId, MeasurementId, ReleaseId, StateId } from './ids.ts';
import type { ReasonCode } from './reason-codes.ts';
import type { ScenarioConstraint, ScenarioV2 } from './scenario.ts';
import type { EngineMissing, Group, ServiceMoisture, Status, Verdict } from './vocab.ts';

/**
 * Every field any mode reads. For now the whole compiled database (the typed dist/db.json of WP-06); the field list of
 * `core` is generated from this type when the data is split (02 section 9.6, WP-23).
 */
export type CoreReadModel = Db;

/** The estimate stage's output, needed for Explore with estimates on. Opaque until WP-23 splits the data. */
export type EstimatesArtifact = { readonly release: ReleaseId; readonly status: 'available' | 'withheld'; readonly [field: string]: unknown };
/** One material's detail: drawer, pages, brief, export. Never read by a decision. Opaque until WP-23. */
export type DetailShard = { readonly release: ReleaseId; readonly materialId: MaterialId; readonly [field: string]: unknown };
/** The Ashby chart's reference set. Opaque until WP-23. */
export type ReferenceSet = { readonly release: ReleaseId; readonly [field: string]: unknown };

/** Plain validated objects; the engine never holds a database connection. Every part names the same release. */
export type EngineInput = {
  readonly release: ReleaseId;
  readonly core: CoreReadModel;
  /** Required for Explore with estimates on. */
  readonly estimates?: EstimatesArtifact;
  readonly detail?: ReadonlyMap<MaterialId, DetailShard>;
  /** Ashby only. */
  readonly reference?: ReferenceSet;
  readonly scenario: ScenarioV2;
};

/** A state's parts: what parseStateId reads out of a StateId (core/state-id.ts). */
export type StateParts = {
  readonly treatment: { readonly tempC: number | null; readonly hours: number | null } | null;
  readonly moisture: ServiceMoisture;
};

/**
 * A state as a result names it (constraints.js stateRef): its identifier and its parts. The parts repeat what the
 * identifier encodes, and a type cannot hold the two equal: build one only from parseStateId's answer.
 */
export type StateRef = { readonly id: StateId } & StateParts;

/** The engine's own requirement, which no scenario holds: the annealing a state needs (constraints.js TREATMENT). */
export type TreatmentConstraint = { readonly kind: 'treatment'; readonly mandatory?: boolean; readonly [field: string]: unknown };

/**
 * One requirement's answer for one product (constraints.js productResult) or material (evaluateConstraint). LOOSE:
 * today's bag, open to the fields the material-level results also carry (vetoedBy, notApplicable, plausible, estimate,
 * related, ...), which the engine reads back. The named fields are the ones productResult copies when set, plus the
 * ones parity compares (02 section 9.5). It is split into one type per kind of check under parity (WP-18, WP-19).
 */
export type RequirementResult = {
  readonly criterion: string;
  readonly status: Status;
  /** Word for word what the old engine says. */
  readonly reason: string;
  readonly constraint: ScenarioConstraint | TreatmentConstraint;
  /** Not set by the old engine; arrives with reason codes (WP-19). */
  readonly reasonCode?: ReasonCode;
  /** Not set by the old engine; arrives with constraint IDs (WP-19). */
  readonly constraintId?: ConstraintId;
  /** Null where the engine names no measurement (a result that rests on none). */
  readonly measurementId?: MeasurementId | null;
  readonly evidenceIds?: readonly string[];
  readonly priceIds?: readonly string[];
  readonly contextIds?: readonly string[];
  readonly observed?: number;
  readonly unit?: string;
  readonly closeToLimit?: boolean;
  readonly onTheLine?: boolean;
  readonly thinMargin?: boolean;
  readonly ledger?: unknown;
  readonly sheetsDisagree?: unknown;
  readonly doubtful?: readonly unknown[];
  readonly ceilingOnly?: { readonly measurementId: MeasurementId | null; readonly value: number };
  readonly estimated?: boolean;
  readonly screened?: boolean;
  readonly polymer?: unknown;
  readonly admitted?: readonly string[];
  readonly treatment?: unknown;
  readonly elsewhere?: readonly unknown[];
  readonly missing?: EngineMissing;
  readonly asPublished?: unknown;
  readonly caveat?: string;
  readonly prediction?: unknown;
  readonly notApplicable?: boolean;
  readonly vetoedBy?: readonly string[];
  readonly plausible?: Status;
  readonly estimate?: unknown;
  readonly related?: readonly string[];
  readonly [field: string]: unknown;
};

/** A product's answer inside a material's evaluation (constraints.js productEntry). */
export type ProductView = {
  readonly gradeId: GradeId;
  readonly verdict: Verdict;
  readonly group: Group;
  readonly likely: boolean;
  readonly groupReason?: string;
  readonly screened: boolean;
  readonly failedBy: readonly string[];
  readonly state: StateRef;
  readonly results: readonly RequirementResult[];
  readonly admitted?: readonly string[];
  readonly variant?: string;
  /** Every state it was judged in, when more than one. */
  readonly states?: readonly (StateRef & { readonly verdict: Verdict })[];
};

/** How many of a material's judged products pass (products.js SHARE): all of them, some, or none. */
export type ProductShare = 'all' | 'some' | 'none';

/**
 * A material's evaluation (constraints.js evaluateMaterial, or evaluateProducts when products are judged one by one).
 * Loose: the product-level fields are present only on the products path.
 */
export type Evaluation = {
  readonly materialId: MaterialId;
  readonly verdict: Verdict;
  readonly group: Group;
  readonly likely: boolean;
  readonly groupReason: string;
  readonly shortfall?: number;
  readonly eligible: boolean;
  readonly needsVerification: boolean;
  readonly usesEstimate?: boolean;
  readonly usesPolymer?: boolean;
  readonly screened: boolean;
  readonly screenedBy: readonly string[];
  readonly results: readonly RequirementResult[];
  /** The results that fail, and the open ones (UNKNOWN or INDETERMINATE), among the mandatory requirements. */
  readonly failed?: readonly RequirementResult[];
  readonly unresolved?: readonly RequirementResult[];
  readonly failedBy: readonly string[];
  readonly heldBy?: readonly string[];
  /** Null: the material has no product on record and was judged on its own headline. */
  readonly counts?: { readonly products: number; readonly pass: number; readonly fail: number; readonly untested: number; readonly screened: number } | null;
  /** Null: no product was judged to pass or fail. */
  readonly share?: ProductShare | null;
  readonly products?: readonly ProductView[];
  readonly gradeId?: GradeId;
  readonly state?: StateRef;
  readonly someFail?: true;
};

/** What the UI holds: the scenario it asked, and the evaluations it got. */
export type Scenario = ScenarioV2;

/** A reason with its code beside the old engine's exact text (02 section 9.5). No code until reason codes land (WP-19). */
export type ReasonEntry = { readonly code?: ReasonCode; readonly params: Readonly<Record<string, string | number>>; readonly text: string };

/**
 * One row of the parity harness's record: a material, or one of its products in a state (02 sections 9.5 and 9.8). A
 * product row names its state; a material row judged on its own headline has none.
 */
export type RowResult = RowSubject & {
  readonly verdict: Verdict;
  readonly counts: { readonly pass: number; readonly fail: number; readonly untested: number };
  readonly group: Group;
  readonly likely?: boolean;
  /** The product shown as Best, if any. */
  readonly best?: GradeId;
  readonly listingRank: number;
  readonly reasons: readonly ReasonEntry[];
  readonly requirements: readonly RequirementResult[];
};

export type RowSubject =
  | { readonly materialId: MaterialId; readonly productId: GradeId; readonly stateId: StateId }
  | { readonly materialId: MaterialId; readonly productId?: never; readonly stateId?: never };

