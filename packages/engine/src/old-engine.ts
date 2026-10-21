// The old engine, loaded and never edited (app/js/engine, imported read-only), and the shapes it hands back.
//
// The engine is plain JavaScript. This file is the one place that touches it untyped: `import()` gives `any`, which is
// assigned straight to the interfaces below (no cast, no `any` keyword). The interfaces describe what constraints.js,
// products.js, indices.js and scenario.js return today; the wrapper (boundary.ts) checks every value that becomes a
// branded ID or a word-list member before it leaves, and keeps every other field as the engine wrote it.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ScenarioConstraint, ScenarioV2 } from '@atlas/domain';
import { ENGINE_DIR } from './paths.ts';
import { activePorts, stageEngine } from './port/stage.ts';
import type { PortableModule } from './port/stage.ts';

export { ENGINE_DIR, REPO_ROOT } from './paths.ts';

/** A requirement as the engine holds it: a scenario's own object, or the engine's TREATMENT singleton. */
export interface RawConstraint {
  readonly kind: string;
  readonly mandatory?: boolean;
  readonly [field: string]: unknown;
}

/** One requirement's answer (constraints.js evaluateConstraint, productResult). */
export interface RawResult {
  readonly criterion: string;
  readonly status: string;
  readonly reason: string;
  readonly constraint: RawConstraint;
  readonly measurementId?: string | null;
  readonly [field: string]: unknown;
}

export interface RawState {
  readonly id: string;
  readonly treatment: { readonly tempC: number | null; readonly hours: number | null } | null;
  readonly moisture: string;
}

/** A product's answer inside a material's evaluation (constraints.js productEntry). */
export interface RawProduct {
  readonly gradeId: string;
  readonly verdict: string;
  readonly group: string;
  readonly likely: boolean;
  readonly screened: boolean;
  readonly failedBy: readonly string[];
  readonly state: RawState;
  readonly results: readonly RawResult[];
  readonly states?: readonly (RawState & { readonly verdict: string })[];
  readonly [field: string]: unknown;
}

/** A material's evaluation (constraints.js evaluateProducts, or evaluateMaterial for a material judged on its own). */
export interface RawEvaluation {
  readonly materialId: string;
  readonly verdict: string;
  readonly group: string;
  readonly likely: boolean;
  readonly groupReason: string;
  readonly eligible: boolean;
  readonly needsVerification: boolean;
  readonly screened: boolean;
  readonly screenedBy: readonly string[];
  readonly results: readonly RawResult[];
  readonly failed: readonly RawResult[];
  readonly unresolved: readonly RawResult[];
  readonly failedBy: readonly string[];
  readonly heldBy: readonly string[];
  readonly counts?: { readonly products: number; readonly pass: number; readonly fail: number; readonly untested: number; readonly screened: number } | null;
  readonly share?: 'all' | 'some' | 'none' | null;
  readonly shortfall?: number;
  readonly usesEstimate?: boolean;
  readonly usesPolymer?: boolean;
  readonly someFail?: true;
  readonly products?: readonly RawProduct[];
  readonly gradeId?: string;
  readonly state?: RawState;
  readonly [field: string]: unknown;
}

export interface RawSelection {
  readonly evaluations: readonly RawEvaluation[];
  readonly counts: { readonly pass: number; readonly fail: number; readonly unknown: number; readonly screened: number; readonly total: number };
  readonly candidates: readonly RawEvaluation[];
}

/** A material as the engine reads it; the engine reads far more of it than the wrapper does. */
export interface RawMaterial {
  readonly id: string;
  readonly familyEntry?: unknown;
  readonly [field: string]: unknown;
}

export interface RawRanking {
  readonly byMaterial: ReadonlyMap<string, { readonly place: number }>;
  readonly unranked: readonly { readonly materialId: string }[];
}

export interface RawIndex { readonly id: string }

/** The context the engine reads (main.js buildContext and recompute). A misspelt field would change the engine's behaviour without an error, so every one the wrapper sets is declared. */
export interface RawContext {
  readonly db: object;
  readonly measurementsByMaterial: ReadonlyMap<string, readonly object[]>;
  readonly evidenceByMaterial: ReadonlyMap<string, readonly object[]>;
  readonly polymerEvidenceByMaterial: ReadonlyMap<string, readonly object[]>;
  readonly coverageByMaterial: ReadonlyMap<string, readonly object[]>;
  readonly productsByMaterial: ReadonlyMap<string, readonly object[]>;
  readonly measurementById: ReadonlyMap<string, object>;
  readonly gradeById: ReadonlyMap<string, object>;
  readonly unknownPolicy: string;
  readonly useEstimates: boolean;
  readonly showEstimates: boolean;
  readonly evidence: string;
  readonly anneal: boolean;
  readonly annealMaxC: number | null;
  readonly moisture: 'dry' | 'conditioned';
}

export interface OldEngine {
  readonly constraints: {
    readonly TREATMENT: RawConstraint;
    normalizePolicy(value: unknown): string;
    runSelection(materials: readonly RawMaterial[], constraints: readonly ScenarioConstraint[], ctx: RawContext): RawSelection;
  };
  readonly products: {
    productsByMaterial(db: object): ReadonlyMap<string, readonly object[]>;
  };
  readonly indices: {
    readonly INDICES: readonly RawIndex[];
    rankingFor(rows: readonly { readonly material: RawMaterial; readonly evaluation: RawEvaluation }[], ctx: RawContext, index: RawIndex): RawRanking | null;
  };
  readonly scenario: {
    applyAssumptions(material: RawMaterial, assumptions: readonly unknown[], units: Readonly<Record<string, string>>): { readonly material: RawMaterial };
    newScenario(meta?: unknown): ScenarioV2;
  };
}

/** Import the engine files of a directory. The same directory twice shares instances; a byte copy in another directory gives fresh ones. */
export async function loadOldEngine(dir: string = ENGINE_DIR): Promise<OldEngine> {
  const load = (file: string) => import(pathToFileURL(join(dir, file)).href);
  const [constraints, products, indices, scenario]: [OldEngine['constraints'], OldEngine['products'], OldEngine['indices'], OldEngine['scenario']] =
    await Promise.all([load('constraints.js'), load('products.js'), load('indices.js'), load('scenario.js')]);
  return { constraints, products, indices, scenario };
}

/**
 * The engine with the ported modules switched in (WP-18): a staged directory (port/stage.ts) holds the old files and the
 * ports, and a fresh set of module instances is imported from it. With no module ported it is the old engine, unedited.
 */
export function loadPortedEngine(ports: readonly PortableModule[] = activePorts()): Promise<OldEngine> {
  return loadOldEngine(stageEngine(ports));
}

/** The engine the wrapper runs, loaded once: the old files, and the modules the port switch names from their TypeScript port. */
export const defaultEngine: OldEngine = await loadPortedEngine();
