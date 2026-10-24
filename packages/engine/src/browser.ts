// The engine in the browser (WP-26): the ported modules (port/), assembled in the shape the typed wrapper takes (OldEngine) and
// imported by name, with no Node module on the way. The page runs the same code the Node side runs once it is staged (port/stage.ts
// copies these files and the old ones that are not ported; every module is ported now, so the two are the same text).
import * as constraints from './port/constraints.ts';
import * as indices from './port/indices.ts';
import * as products from './port/products.ts';
import * as scenario from './port/scenario.ts';
import type { OldEngine } from './old-engine.ts';

/**
 * A module's export read without its static type. The engine seam is typed by the raw shapes of old-engine.ts (what the wrapper checks
 * on the way out), the ported modules by their own precise types; the two meet here, as they meet in Node where the modules are imported
 * by name and arrive untyped.
 */
const exported = (module: object, name: string) => Reflect.get(module, name);

export const browserEngine: OldEngine = {
  constraints: { TREATMENT: exported(constraints, 'TREATMENT'), normalizePolicy: exported(constraints, 'normalizePolicy'), runSelection: exported(constraints, 'runSelection') },
  products: { productsByMaterial: exported(products, 'productsByMaterial') },
  indices: { INDICES: exported(indices, 'INDICES'), rankingFor: exported(indices, 'rankingFor') },
  scenario: { applyAssumptions: exported(scenario, 'applyAssumptions'), newScenario: exported(scenario, 'newScenario'), fromHash: exported(scenario, 'fromHash'), deserialize: exported(scenario, 'deserialize') },
};

export { baseContextOf, candidatesOf, contextOf, createContextWith, setupOf } from './context-core.ts';
export type { BaseContext, EngineContext, EngineOptions, EngineOutput, IndexRanking, RunOptions, SelectionCounts, Setup } from './context-core.ts';
export { sortRows, defaultTableState, sortValue } from './table.ts';
export type { Ranks, SortEvaluation, SortMaterial, TableColumn, TableRow, TableState } from './table.ts';
