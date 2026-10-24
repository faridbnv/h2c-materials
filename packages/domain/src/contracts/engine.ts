// The engine's input and output (02 section 9.5), and the public types the interface reads. Types only.
//
// A requirement's answer is one type per kind of check (WP-19, 15-TYPESCRIPT-PLAN section 2): the fields the old engine kept
// in one bag of about forty optional fields are partitioned by the check that sets them.
// Words keep the engine's spelling: a status is 'PASS', not 'pass', so parity compares like with like.

import type { Db } from '@atlas/data';
import type { CORE_FIELDS } from '../core/core-fields.ts';
import type { Picked } from './field-spec.ts';
import type { ConstraintId, GradeId, MaterialId, MeasurementId, ReleaseId, StateId } from './ids.ts';
import type { ReasonCode } from './reason-codes.ts';
import type { EnvironmentConstraint, EvidenceConstraint, FacetConstraint, GateConstraint, NumericConstraint, ScenarioConstraint, ScenarioV2 } from './scenario.ts';
import type { PRODUCT_SHARES } from '../core/vocab.ts';
import type { EngineMissing, Group, ServiceMoisture, Status, Verdict } from './vocab.ts';

/**
 * Every field any mode reads, and no other: the compiled database cut down to the declaration CORE_FIELDS (core/core-fields.ts).
 * The type is derived from that one object, and the same object is the field list of the published `core` part (02 section 9.6),
 * so what the engine may read and what the page downloads cannot disagree. The whole compiled database fits it.
 */
export type CoreReadModel = Picked<Db, typeof CORE_FIELDS>;

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
export type TreatmentConstraint = {
  readonly kind: 'treatment';
  readonly mandatory: boolean;
  readonly __group: string;
};

/** Every requirement the engine answers: the scenario's five kinds and its own treatment. */
export type Requirement = ScenarioConstraint | TreatmentConstraint;

// ------------------------------------------------------------------ what a value says about itself (the compiled database's, as the engine reads it)

/** An annealing schedule; an end the sheet does not state is null. */
export type Treatment = { readonly tempC: number | null; readonly hours: number | null };
/** What a reader admitted unstated (GOALS 2026-09-28, decision 5). */
export type Admitted = 'direction' | 'specimen' | 'moisture' | 'treatment' | 'bar';
/** Why a value is set apart (D172). */
export type Caveat = 'not-described' | 'unstated-direction' | 'load-not-stated';
/** The range a value stands for: a point, a mean with a band, a range, or a one-sided bound. */
export type Interval =
  | { readonly lo: number; readonly hi: number; readonly kind: 'point' | 'uncertainty' | 'range'; readonly openLow?: boolean; readonly openHigh?: boolean }
  | { readonly lo: number; readonly hi: null; readonly openLow: boolean; readonly kind?: undefined; readonly openHigh?: undefined }
  | { readonly lo: null; readonly hi: number; readonly openHigh: boolean; readonly kind?: undefined; readonly openLow?: undefined };
/** A record that contradicts a value, with where it puts it (C40, D153). */
export type Doubt = { readonly rule: string; readonly lo: number | null; readonly hi: number | null; readonly measurementId?: string };
/** An end of a range, open where null. */
export type Band = { readonly lo: number | null; readonly hi: number | null };
/** Where the product's own values and its kind's model disagree, band by band (D167). */
export type OwnBand = {
  readonly disagree: boolean;
  readonly bands: readonly { readonly lo: number | null; readonly hi: number | null; readonly measurementIds?: readonly string[] }[];
  readonly lo?: number;
  readonly hi?: number;
};
/** The estimate stage's value for one headline (D43, D48, D59, D137, D167). Never a measurement. */
export type Prediction = {
  readonly lo: number;
  readonly hi: number;
  readonly unit: string;
  readonly centre?: number;
  readonly plausible?: { readonly lo: number; readonly hi: number };
  readonly screenRange?: Band | null;
  readonly canScreen?: boolean;
  readonly screenLimit?: string;
  readonly screening?: { readonly context?: unknown };
  readonly impliedBounds?: readonly unknown[];
  readonly ownBand?: OwnBand;
  readonly evidence?: readonly { readonly measurementIds?: readonly string[] }[];
  readonly [field: string]: unknown;
};
/** A value the product publishes in a state this scenario does not judge it in (D99). */
export type Elsewhere = {
  readonly stateId: string;
  readonly treatment: Treatment | null;
  readonly moisture?: ServiceMoisture | undefined;
  readonly value: number;
  readonly measurementId: string | null;
  readonly setApart?: boolean;
};
/** A value the reader sets apart and never uses to pass (D172). */
export type AsPublished = { readonly value: number; readonly caveat?: Caveat | undefined; readonly measurementId?: string | null | undefined };
/** A ledger contribution as an answer cites it: its rule, kind and record, and the bound it set. */
export type LedgerRef = {
  readonly rule: string;
  readonly kind: 'floor' | 'ceiling' | 'band' | 'equal' | 'demote-to-ceiling' | 'neat-density range';
  readonly measurementId?: string;
  readonly bound: number | null;
};

// ------------------------------------------------------------------ the answers, one type per kind of check

/**
 * What every answer carries. `screened` and `onTheLine` are shared because two kinds set them: a numeric limit and a
 * base polymer's behaviour can hide a material (D56, D64), a numeric limit and a print gate can be on the line (D151, D152).
 * `reasonCode` and `constraintId` are the engine's own.
 */
type ResultBase = {
  readonly criterion: string;
  readonly status: Status;
  /** Word for word what the old engine says. */
  readonly reason: string;
  readonly reasonCode?: ReasonCode;
  readonly constraintId?: ConstraintId;
  readonly screened?: boolean | undefined;
  readonly onTheLine?: boolean;
};

/** A limit on a headline. By far the busiest kind: it says what it rests on, and what it could not find. */
export type NumericResult = ResultBase & {
  readonly constraint: NumericConstraint;
  /** Null where the engine names no measurement (a result that rests on none). */
  readonly measurementId?: MeasurementId | null | undefined;
  readonly gradeId?: string | undefined;
  readonly sourceId?: string | null | undefined;
  readonly observed?: number | undefined;
  readonly unit?: string | undefined;
  readonly interval?: Interval;
  readonly direction?: string | undefined;
  readonly closeToLimit?: boolean;
  readonly thinMargin?: boolean;
  readonly admitted?: readonly Admitted[];
  readonly caveat?: Caveat;
  readonly doubtful?: readonly Doubt[];
  readonly ledger?: LedgerRef;
  readonly sheetsDisagree?: { readonly lo: LedgerRef; readonly hi: LedgerRef };
  readonly ceilingOnly?: { readonly measurementId: string | null; readonly value: number };
  readonly asPublished?: AsPublished;
  readonly elsewhere?: readonly Elsewhere[];
  readonly missing?: EngineMissing | undefined;
  readonly notApplicable?: boolean;
  readonly estimated?: boolean;
  readonly estimate?: Prediction;
  readonly plausible?: Status;
  readonly vetoedBy?: readonly string[];
  /** A product's estimate in words the page prints (constraints.js productResult), set when the estimate carries its screening context. */
  readonly prediction?: {
    readonly centre: number | undefined;
    readonly plausible: { readonly lo: number; readonly hi: number } | undefined;
    readonly screenRange: Band | null | undefined;
    readonly canScreen: boolean | undefined;
    readonly scope: unknown;
    readonly limitation: string | undefined;
  };
};
/** A print gate, the scope, the H2C status, abrasion, offers, or a drying statement. */
export type GateResult = ResultBase & {
  readonly constraint: GateConstraint;
  readonly priceIds?: readonly string[];
};
/** A recorded class of the material. */
export type FacetResult = ResultBase & {
  readonly constraint: FacetConstraint;
  readonly derived?: boolean;
};
/** Resistance to a class of agent: the product's records, a twin's, or its base polymer's behaviour standing in (D64). */
export type EnvironmentResult = ResultBase & {
  readonly constraint: EnvironmentConstraint;
  readonly evidenceIds?: readonly string[];
  readonly contextIds?: readonly string[];
  readonly indicatorOnly?: boolean;
  readonly polymer?: boolean;
  readonly polymerId?: string;
  readonly polymerVerdict?: string;
  readonly polymerEvidenceIds?: readonly string[];
  readonly polymerScreen?: boolean;
  readonly vetoedBy?: readonly string[];
};
/** The strength of the evidence itself. */
export type EvidenceResult = ResultBase & {
  readonly constraint: EvidenceConstraint;
};
/** The annealing a state needs: the engine's own requirement. */
export type TreatmentResult = ResultBase & {
  readonly constraint: TreatmentConstraint;
  readonly treatment?: Treatment;
};

/**
 * One requirement's answer for one product (constraints.js productResult) or material (evaluateConstraint): one type per
 * kind of check, told apart by the kind of its `constraint`.
 */
export type RequirementResult = NumericResult | GateResult | FacetResult | EnvironmentResult | EvidenceResult | TreatmentResult;

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
export type ProductShare = (typeof PRODUCT_SHARES)[number];

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

