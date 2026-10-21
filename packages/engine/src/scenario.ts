// A scenario for the engine from a question's explicit fields (the parity corpus' cases, the impact preview's cases).
// The engine's own defaults (newScenario) fill every other field, so nothing here repeats them. No validation or migration
// (validateScenario) runs: the question is asked exactly as written, as the parity old side asks it.
import { SCENARIO_KINDS } from '@atlas/domain';
import type { EvidenceLevel, ScenarioConstraint, ScenarioV2, ServiceMoisture, UnknownPolicy } from '@atlas/domain';
import { BoundaryError } from './guards.ts';
import { defaultEngine } from './old-engine.ts';
import type { OldEngine } from './old-engine.ts';

/** The fields a case states; every one is explicit, so no side relies on a default. */
export interface Question {
  readonly constraints: readonly object[];
  readonly unknownPolicy: UnknownPolicy;
  readonly useEstimates: boolean;
  readonly evidence: EvidenceLevel;
  readonly moisture: ServiceMoisture;
  readonly anneal: boolean;
  readonly annealMaxC: number | null;
}

export const isScenarioConstraint = (x: object): x is ScenarioConstraint => 'kind' in x && SCENARIO_KINDS.some((kind) => kind === x.kind);

/** The question as a ScenarioV2. The requirement objects are the question's own, not copies: the engine matches them by identity. */
export function scenarioFrom(question: Question, meta?: unknown, engine: OldEngine = defaultEngine): ScenarioV2 {
  const constraints = question.constraints.map((x) => {
    if (!isScenarioConstraint(x)) throw new BoundaryError(`a requirement of kind ${JSON.stringify('kind' in x ? x.kind : undefined)} is not one a scenario may hold`);
    return x;
  });
  return {
    ...engine.scenario.newScenario(meta), constraints, unknownPolicy: question.unknownPolicy, useEstimates: question.useEstimates,
    evidence: question.evidence, moisture: question.moisture, anneal: question.anneal, annealMaxC: question.annealMaxC,
  };
}
