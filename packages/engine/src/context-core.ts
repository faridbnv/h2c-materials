// The engine's context, built from an engine given (WP-26: the browser's is the ported modules, Node's is context.ts's default).
// createContext(db, scenario): the one place the engine's context is built (replacing the hand-built copies in main.js
// buildContext and recompute, scripts/trace.mjs pageContext, the census, the snapshot and the parity old-side adapter), and
// run(): the old engine's selection, checked and typed (boundary.ts), with the rows and the listing order the harness reads.
//
// Behaviour is the page's, not new: the same context fields, the family entries dropped, assumptions applied to copies of
// the materials, the evaluations of runSelection, the rankings of rankingFor. The scenario's own requirement objects go
// into the engine (it matches them by identity); the results come back with `constraintId` beside them.
import type { ConstraintId, CoreReadModel, EngineInput, Evaluation, MaterialId, ReleaseId, RowResult, ScenarioV2 } from '@atlas/domain';
import { toEvaluation } from './boundary.ts';
import { indexConstraints } from './constraint-ids.ts';
import { BoundaryError, materialIdOf, releaseIdOf } from './guards.ts';
import type { OldEngine, RawContext, RawEvaluation, RawMaterial } from './old-engine.ts';
import { defaultTableState, sortRows } from './table.ts';
import { rowsOf } from './rows.ts';

export type SelectionCounts = { readonly pass: number; readonly fail: number; readonly unknown: number; readonly screened: number; readonly total: number };

/** One performance index's ranking (indices.js rankingFor): the place of each ranked material, and the ones left unranked. */
export type IndexRanking = {
  readonly index: string;
  readonly places: readonly { readonly materialId: MaterialId; readonly place: number }[];
  readonly unranked: readonly MaterialId[];
};

/** What the engine says to one scenario on one release. Plain data: it survives a structured clone (a worker, a store) whole. */
export type EngineOutput = {
  readonly release: ReleaseId;
  /** The scenario's requirements, in order. A result names its requirement by one of these, or by `TREATMENT_ID` for the engine's own annealing requirement. */
  readonly constraintIds: readonly ConstraintId[];
  readonly evaluations: readonly Evaluation[];
  readonly counts: SelectionCounts;
  readonly candidates: readonly MaterialId[];
  /** In the engine's order: each material, followed by its products. `listingRank` gives the live table's default order (table.ts). */
  readonly rows: readonly RowResult[];
  readonly rankings: readonly IndexRanking[];
};

export interface EngineOptions {
  /** The engine to run: the in-tree one by default; a byte copy in another directory has its own module instances. */
  readonly engine?: OldEngine;
  /** Required when `db.meta.release` is absent (a core compiled for a preview); must equal it when both are there. */
  readonly release?: string;
}

export interface RunOptions {
  /** The Ashby rankings cost about as much as the selection itself; a caller that reads only decisions can leave them out. */
  readonly rankings?: boolean;
}

export interface EngineContext {
  readonly release: ReleaseId;
  readonly scenario: ScenarioV2;
  run(options?: RunOptions): EngineOutput;
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
}

function releaseOf(db: CoreReadModel, asked: string | undefined): ReleaseId {
  const own = db.meta.release?.id;
  if (own !== undefined && asked !== undefined && own !== asked) throw new BoundaryError(`the database is release ${own}, the input asks for ${asked}`);
  const id = own ?? asked;
  if (id === undefined) throw new BoundaryError('no release: the database carries none and none was given');
  return releaseIdOf(id);
}

/** What a run reads, built once from the database and the scenario: the engine's context, and the candidates with the scenario's assumptions applied. */
export interface Setup {
  readonly release: ReleaseId;
  readonly policy: string;
  readonly ctx: RawContext;
  /** A family entry owns no product and is never a candidate. Assumptions are the scenario's: copies, never the database. */
  readonly materials: readonly RawMaterial[];
}

/** What a context holds that does not depend on the scenario: the database's rows grouped the way the engine looks them up. Built once per database. */
export type BaseContext = Pick<RawContext, 'db' | 'measurementsByMaterial' | 'evidenceByMaterial' | 'polymerEvidenceByMaterial' | 'coverageByMaterial' | 'productsByMaterial' | 'measurementById' | 'gradeById'>;

export function baseContextOf(engine: OldEngine, db: CoreReadModel): BaseContext {
  return {
    db,
    measurementsByMaterial: groupBy(db.measurements, (m) => m.materialId),
    evidenceByMaterial: groupBy(db.evidence, (m) => m.materialId),
    polymerEvidenceByMaterial: groupBy(db.polymerEvidence ?? [], (m) => m.materialId),
    coverageByMaterial: groupBy(db.coverage, (m) => m.materialId),
    productsByMaterial: engine.products.productsByMaterial(db),
    measurementById: new Map(db.measurements.map((m) => [m.id, m])),
    gradeById: new Map(db.grades.map((g) => [g.id, g])),
  };
}

/** The context for one scenario: the base and the scenario's settings (the missing-data rule, the estimates switch, the states a product may be judged in). */
export function contextOf(engine: OldEngine, base: BaseContext, scenario: ScenarioV2): RawContext {
  const policy = engine.constraints.normalizePolicy(scenario.unknownPolicy);
  const useEstimates = policy === 'exploration' && scenario.useEstimates !== false;
  return {
    ...base,
    unknownPolicy: policy,
    useEstimates,
    showEstimates: useEstimates,
    evidence: scenario.evidence ?? 'comparable',
    anneal: scenario.anneal === true,
    annealMaxC: scenario.annealMaxC ?? null,
    moisture: scenario.moisture === 'conditioned' ? 'conditioned' : 'dry',
  };
}

/** The candidates of a database: a family entry owns no product and is never one. Assumptions are the scenario's: copies, never the database. */
export function candidatesOf(engine: OldEngine, db: CoreReadModel, scenario: ScenarioV2): readonly RawMaterial[] {
  const candidates: readonly RawMaterial[] = db.materials.filter((m) => !m.familyEntry);
  const units = Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]));
  return scenario.assumptions.length ? candidates.map((m) => engine.scenario.applyAssumptions(m, scenario.assumptions, units).material) : candidates;
}

export function setupOf(engine: OldEngine, db: CoreReadModel, scenario: ScenarioV2, options: EngineOptions = {}): Setup {
  const release = releaseOf(db, options.release);
  const ctx = contextOf(engine, baseContextOf(engine, db), scenario);
  return { release, policy: ctx.unknownPolicy, ctx, materials: candidatesOf(engine, db, scenario) };
}

/** The engine's context for a database and a scenario, with the engine given: `run` is its selection, checked and typed. */
export function createContextWith(engine: OldEngine, db: CoreReadModel, scenario: ScenarioV2, options: EngineOptions = {}): EngineContext {
  const { release, policy, ctx, materials } = setupOf(engine, db, scenario, options);

  function run({ rankings: withRankings = true }: RunOptions = {}): EngineOutput {
    const selection = engine.constraints.runSelection(materials, scenario.constraints, ctx);
    const constraintIndex = indexConstraints(scenario.constraints, engine.constraints.TREATMENT);
    const evaluations = selection.evaluations.map((e) => toEvaluation(e, constraintIndex));
    const materialOf = new Map(materials.map((m) => [m.id, m]));
    const rows = selection.evaluations.map((evaluation): { material: RawMaterial; evaluation: RawEvaluation } => {
      const material = materialOf.get(evaluation.materialId);
      if (!material) throw new BoundaryError(`the engine evaluated ${evaluation.materialId}, which was not among the candidates`);
      return { material, evaluation };
    });
    const rankings = (withRankings ? engine.indices.INDICES : []).flatMap((performanceIndex): IndexRanking[] => {
      const ranking = engine.indices.rankingFor(rows, ctx, performanceIndex);
      if (!ranking) return [];
      return [{
        index: performanceIndex.id,
        places: [...ranking.byMaterial].map(([id, { place }]) => ({ materialId: materialIdOf(id), place })),
        unranked: ranking.unranked.map((u) => materialIdOf(u.materialId)),
      }];
    });
    // The table's order, from the table's own sortRows with the state a page opens on (by name; by group when asked in exploration).
    const goal = scenario.rankBy ? engine.indices.INDICES.find((i) => i.id === scenario.rankBy) : undefined;
    const goalRanks = goal ? engine.indices.rankingFor(rows, ctx, goal)?.byMaterial ?? null : null;
    const shown = sortRows(rows, defaultTableState({ unknownPolicy: policy, constraints: scenario.constraints }, goalRanks, ctx.showEstimates));
    const ranks = new Map(shown.map((row, place) => [row.evaluation.materialId, place + 1]));
    return {
      release, constraintIds: constraintIndex.ids, evaluations, counts: selection.counts,
      candidates: selection.candidates.map((e) => materialIdOf(e.materialId)),
      rows: rowsOf(evaluations, ranks), rankings,
    };
  }

  return { release, scenario, run };
}

/** The engine's contract (02 section 9.5): plain validated parts in, one answer out. Every part must name the input's release. */
export function runEngineWith(engine: OldEngine, input: EngineInput, options: Omit<EngineOptions, 'release'> = {}): EngineOutput {
  const parts: [string, string | undefined][] = [
    ['estimates', input.estimates?.release], ['reference', input.reference?.release],
    ...[...(input.detail ?? [])].map(([id, shard]): [string, string] => [`detail ${id}`, shard.release]),
  ];
  for (const [part, release] of parts) {
    if (release !== undefined && release !== input.release) throw new BoundaryError(`${part} is release ${release}, the input is ${input.release}`);
  }
  return createContextWith(engine, input.core, input.scenario, { ...options, release: input.release }).run();
}
