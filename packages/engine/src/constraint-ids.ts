// Requirements by ID, not by object identity (15-TYPESCRIPT-PLAN section 2, addition 6).
//
// The old engine found a result's requirement with `===` on the scenario's own object. The ported engine gives every result the
// ID of the requirement it answers (the rule is the shared core's, packages/domain/src/core/constraint-ids.ts), so a result
// survives a structured clone, a store or JSON and is still matched. This file turns those IDs into the branded ones and checks
// them against the scenario. An engine that sets none (the old files, which the harness' self-tests still wrap) is read by the
// scenario's own objects, as before.
import { TREATMENT_ID as TREATMENT, identify } from '@atlas/domain';
import type { ConstraintId, ScenarioConstraint } from '@atlas/domain';
import { BoundaryError, constraintIdOf } from './guards.ts';
import type { RawConstraint, RawResult } from './old-engine.ts';

export const TREATMENT_ID: ConstraintId = constraintIdOf(TREATMENT);

export interface ConstraintIndex {
  /** The scenario's requirements, in order. A result may also name `TREATMENT_ID`, the engine's own annealing requirement. */
  readonly ids: readonly ConstraintId[];
  /** The ID of the requirement a result answers. Throws for one the engine was not given. */
  idOf(raw: RawResult): ConstraintId;
}

export function indexConstraints(constraints: readonly ScenarioConstraint[], treatment: RawConstraint): ConstraintIndex {
  if (treatment.kind !== 'treatment') throw new BoundaryError(`the engine's TREATMENT requirement has kind ${JSON.stringify(treatment.kind)}`);
  let identified;
  try {
    identified = identify(constraints);
  } catch (error) {
    throw new BoundaryError(error instanceof Error ? error.message : String(error));
  }
  const ids = identified.map(({ id }) => constraintIdOf(id));
  if (ids.includes(TREATMENT_ID)) throw new BoundaryError(`two requirements share the ID ${TREATMENT_ID}`);
  const known = new Set<string>([TREATMENT, ...identified.map(({ id }) => id)]);
  let byObject: Map<object, ConstraintId> | undefined;
  const objects = (): Map<object, ConstraintId> => {
    if (byObject) return byObject;
    byObject = new Map<object, ConstraintId>([[treatment, TREATMENT_ID]]);
    identified.forEach(({ constraint, id }, position) => {
      if (byObject?.has(constraint)) throw new BoundaryError(`requirement ${position} is the same object as an earlier one: an engine that sets no IDs could not tell them apart`);
      byObject?.set(constraint, constraintIdOf(id));
    });
    return byObject;
  };
  return {
    ids,
    idOf(raw) {
      if (raw.constraintId !== undefined) {
        if (!known.has(raw.constraintId)) throw new BoundaryError(`a result names the requirement ${JSON.stringify(raw.constraintId)}, which the scenario did not hold`);
        return constraintIdOf(raw.constraintId);
      }
      const id = objects().get(raw.constraint);
      if (!id) throw new BoundaryError(`a result names a ${JSON.stringify(raw.constraint.kind)} requirement the scenario did not hold`);
      return id;
    },
  };
}
