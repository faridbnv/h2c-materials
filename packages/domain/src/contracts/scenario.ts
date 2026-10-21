// The scenario: the question a person asks, as a saved file and as a link (02 section 9.7). Types only.
// Shapes read from app/js/engine/scenario.js (newScenario, toHash, fromHash, validateScenario) at the WP-07 base.
// IDs here are plain strings: validateScenario checks material, product and state IDs only when it is handed the sets to
// check them against, so a validated scenario does not promise a valid ID. Branding them is a parity transition.

import type { ConstraintId } from './ids.ts';
import type { ColumnSet, ComparisonOperator, EvidenceLevel, Lens, PlotView, ScenarioKind, ServiceMoisture, UnknownPolicy } from './vocab.ts';

/**
 * One requirement. Loose: the fields beyond `kind` depend on the kind and are typed when the engine's constraints
 * module is converted (WP-18). `id` is the stable constraint ID that does not exist yet (WP-19).
 */
export type ScenarioConstraint = {
  /** scenario.js KINDS: validateScenario refuses any other, including the engine's own 'treatment'. */
  readonly kind: ScenarioKind;
  readonly id?: ConstraintId;
  readonly property?: string;
  readonly operator?: ComparisonOperator;
  readonly value?: number;
  readonly gate?: string;
  readonly mandatory?: boolean;
  readonly [field: string]: unknown;
};

/** A test the team ran on a chosen product: scenario.js TEST_FIELDS, each a trimmed string or null. */
export type ScenarioTest = { readonly [K in 'date' | 'operator' | 'recipe' | 'orientation' | 'conditioning' | 'method' | 'result' | 'notes']: string | null };

/** A product the team chose (D103), as decisionOf writes it: the product, its state, the release and day, a note, tests. */
export type ScenarioDecision = {
  readonly gradeId: string;
  readonly stateId: string | null;
  readonly release: string | null;
  readonly chosenOn: string | null;
  readonly note: string | null;
  readonly tests: readonly ScenarioTest[];
};

/** The chart (D107). Display only: nothing here changes an answer, a count or a rank. */
export type ScenarioPlot = {
  readonly x: string;
  readonly y: string;
  readonly xLog: boolean;
  readonly yLog: boolean;
  readonly view: PlotView;
  readonly showReference: boolean;
  readonly showEstimates: boolean;
  readonly layers: { readonly failed: boolean; readonly unresolved: boolean | null; readonly front: boolean };
  readonly population: 'confirmed' | 'judged';
  readonly indexM: number | null;
  readonly focus: readonly string[];
};

/** Version 2, what the engine reads today (SCENARIO_VERSION = 2). */
export type ScenarioV2 = {
  readonly version: 2;
  /** The release the answers were computed on (D96). Travels with every scenario. */
  readonly release: string | null;
  readonly dbSnapshot: string | null;
  readonly appBuild: string | null;
  readonly created: string;
  readonly constraints: readonly ScenarioConstraint[];
  readonly unknownPolicy: UnknownPolicy;
  readonly preferences: readonly unknown[];
  readonly assumptions: readonly unknown[];
  readonly shortlist: readonly string[];
  readonly plot: ScenarioPlot;
  readonly lens: Lens;
  readonly openMaterial: string | null;
  readonly useEstimates: boolean;
  readonly columnSet: ColumnSet;
  readonly baseline: string | null;
  readonly template: string | null;
  readonly rankBy: string | null;
  readonly evidence: EvidenceLevel;
  readonly anneal: boolean;
  readonly annealMaxC: number | null;
  readonly moisture: ServiceMoisture;
  readonly decisions: readonly ScenarioDecision[];
};

/**
 * Version 1, or no version at all: still opens, and is migrated to version 2 keeping its question (migrateV1, D107).
 * Loose: a saved file is user-edited text, and validateScenario is what checks it.
 */
export type ScenarioV1 = {
  readonly version?: 1;
  readonly constraints?: readonly ScenarioConstraint[];
  readonly [field: string]: unknown;
};

/** What a saved file or a link may hold. The engine reads only version 2, after migration. */
export type AnyScenario = ScenarioV1 | ScenarioV2;

/**
 * The link's compact form (toHash): one-letter keys. `x` is the version; a link without `x: 2` reads as version 1, and
 * so does `x: 3` (scenario.js:334, a known bug carried by parity, 02 section 9.7).
 */
export type ScenarioHash = {
  readonly x?: number;
  readonly c?: ScenarioV2['constraints'];
  readonly u?: UnknownPolicy;
  readonly s?: ScenarioV2['shortlist'];
  readonly p?: ScenarioPlot;
  readonly t?: string | null;
  readonly l?: Lens;
  readonly m?: string | null;
  readonly e?: boolean;
  readonly k?: ColumnSet;
  readonly b?: string | null;
  readonly a?: readonly unknown[];
  readonly d?: string;
  readonly i?: string;
  readonly r?: string;
  /** Annealing permitted: true, or the oven's highest temperature in °C. */
  readonly n?: true | number;
  readonly w?: 'conditioned';
  /** Chosen products: [gradeId, stateId, release, chosenOn]. */
  readonly h?: readonly (readonly [string, string | null, string | null, string | null])[];
  /** Objective stages, as links carried them before D108 (read only to say what became of them). */
  readonly g?: readonly (readonly [string, number])[];
  /** An evidence level a link may still carry. */
  readonly v?: EvidenceLevel;
};
