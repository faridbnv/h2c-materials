// createContext(db, scenario): the one place the engine's context is built (replacing the hand-built copies in main.js
// buildContext and recompute, scripts/trace.mjs pageContext, the census, the snapshot and the parity old-side adapter), and
// run(): the old engine's selection, checked and typed (boundary.ts), with the rows and the listing order the harness reads.
//
// Behaviour is the page's, not new: the same context fields, the family entries dropped, assumptions applied to copies of
// the materials, the evaluations of runSelection, the rankings of rankingFor. The scenario's own requirement objects go
// into the engine (it matches them by identity); the results come back with `constraintId` beside them.
//
// The body is in context-core.ts, which takes the engine as a parameter and touches no Node module, so the browser runs it with the
// ported modules (browser.ts). This file is the Node side: it gives the in-tree engine, staged with its ports (old-engine.ts).
import type { CoreReadModel, EngineInput, ScenarioV2 } from '@atlas/domain';
import { createContextWith, runEngineWith } from './context-core.ts';
import type { EngineContext, EngineOptions, EngineOutput } from './context-core.ts';
import { defaultEngine } from './old-engine.ts';

export type { EngineContext, EngineOptions, EngineOutput, IndexRanking, RunOptions, SelectionCounts } from './context-core.ts';

export function createContext(db: CoreReadModel, scenario: ScenarioV2, options: EngineOptions = {}): EngineContext {
  return createContextWith(options.engine ?? defaultEngine, db, scenario, options);
}

/** The engine's contract (02 section 9.5): plain validated parts in, one answer out. Every part must name the input's release. */
export function runEngine(input: EngineInput, options: Omit<EngineOptions, 'release'> = {}): EngineOutput {
  return runEngineWith(options.engine ?? defaultEngine, input, options);
}
