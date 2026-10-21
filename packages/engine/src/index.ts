// @atlas/engine: the old engine behind the typed contracts (WP-11). See context.ts, boundary.ts and impact/.
export { createContext, runEngine } from './context.ts';
export type { EngineContext, EngineOptions, EngineOutput, IndexRanking, RunOptions, SelectionCounts } from './context.ts';
export { ENGINE_DIR, REPO_ROOT, defaultEngine, loadOldEngine, loadPortedEngine } from './old-engine.ts';
export { PORTABLE, PORT_DIR, PORT_ENV, WIRED, activePorts, importStaged, stageEngine } from './port/stage.ts';
export type { EngineModule, EngineModuleName, PortableModule } from './port/stage.ts';
export type { OldEngine } from './old-engine.ts';
export { BoundaryError } from './guards.ts';
export { TREATMENT_ID } from './constraint-ids.ts';
export { reasonCodeOf } from './reasons.ts';
export { scenarioFrom, isScenarioConstraint } from './scenario.ts';
export type { Question } from './scenario.ts';
