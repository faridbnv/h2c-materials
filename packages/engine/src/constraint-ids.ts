// Requirements by ID, not by object identity (15-TYPESCRIPT-PLAN section 2, addition 6).
//
// The old engine finds a result's requirement with `===` on the scenario's own object (constraints.js measuredMiss,
// everyMeasuredMisses, explainExclusions; main.js, filters.js, explain.js). Anything that copies a requirement (a worker's
// structured clone, a store, JSON) breaks that without an error. Here the engine still receives the scenario's own objects,
// because it must; every result that leaves the wrapper carries `constraintId` beside its `constraint`, and a consumer
// matches by that ID.
import type { ConstraintId, ScenarioConstraint, TreatmentConstraint } from '@atlas/domain';
import { BoundaryError, constraintIdOf } from './guards.ts';
import type { RawConstraint } from './old-engine.ts';

export const TREATMENT_ID: ConstraintId = constraintIdOf('treatment');

export interface ConstraintEntry {
  readonly id: ConstraintId;
  /** The requirement as the scenario (or the engine, for treatment) holds it. */
  readonly body: ScenarioConstraint | TreatmentConstraint;
}

export interface ConstraintIndex {
  /** The scenario's requirements, in order. A result may also name `TREATMENT_ID`, the engine's own annealing requirement. */
  readonly ids: readonly ConstraintId[];
  /** The ID and body of the requirement a raw result names. Throws for one the engine was not given. */
  lookup(raw: RawConstraint): ConstraintEntry;
}

const isTreatment = (c: RawConstraint): c is RawConstraint & TreatmentConstraint => c.kind === 'treatment';

export function indexConstraints(constraints: readonly ScenarioConstraint[], treatment: RawConstraint): ConstraintIndex {
  if (!isTreatment(treatment)) throw new BoundaryError(`the engine's TREATMENT requirement has kind ${JSON.stringify(treatment.kind)}`);
  const byObject = new Map<object, ConstraintEntry>([[treatment, { id: TREATMENT_ID, body: treatment }]]);
  const taken = new Set<ConstraintId>([TREATMENT_ID]);
  const ids = constraints.map((body, position) => {
    const id = constraintIdOf(body.id ?? `c${position}`);
    if (taken.has(id)) throw new BoundaryError(`two requirements share the ID ${id}`);
    if (byObject.has(body)) throw new BoundaryError(`requirement ${position} is the same object as an earlier one: the engine could not tell them apart`);
    taken.add(id);
    byObject.set(body, { id, body });
    return id;
  });
  return {
    ids,
    lookup(raw) {
      const entry = byObject.get(raw);
      if (!entry) throw new BoundaryError(`a result names a ${JSON.stringify(raw.kind)} requirement the scenario did not hold`);
      return entry;
    },
  };
}
