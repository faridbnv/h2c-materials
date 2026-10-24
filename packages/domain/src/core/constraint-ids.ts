// Requirements by ID, not by object identity (15-TYPESCRIPT-PLAN section 2, addition 6; engine.md section 8, hazard 5).
//
// The old engine found a result's requirement with `===` on the scenario's own object (constraints.js measuredMiss,
// everyMeasuredMisses, explainExclusions; main.js, filters.js, explain.js). Anything that copies a requirement (a worker's
// structured clone, a store, JSON) broke that without an error. A requirement now has an ID: its own `id` where a scenario
// holds one, else its place in the list ("c0", "c1", ...). The engine puts the ID on every result it makes, and anything that
// matches a result to its requirement matches the ID. The engine's own annealing requirement is `treatment`.
//
// Used by the engine port and by the wrapper, so there is one rule. The engine port runs from a staged directory, so this file
// imports nothing at run time.

/** The ID of the requirement a state needs to be annealed (constraints.js TREATMENT): the engine's own, held by no scenario. */
export const TREATMENT_ID = 'treatment';

/** What an ID is derived from: the kind of requirement and the ID a scenario may give it. */
export type Identifiable = { readonly kind: string; readonly id?: string | undefined };

/** A requirement beside its ID. */
export type Identified<C extends Identifiable> = { readonly constraint: C; readonly id: string };

/**
 * Each requirement of a list beside its ID, in order. The ID is the requirement's own `id`, else `c<position>`; the annealing
 * requirement is `treatment`. Two requirements may not share an ID: that would be the very confusion IDs end.
 */
export function identify<C extends Identifiable>(constraints: readonly C[]): Identified<C>[] {
  const taken = new Set<string>();
  return constraints.map((constraint, position) => {
    const id = constraint.kind === 'treatment' ? TREATMENT_ID : (constraint.id ?? `c${position}`);
    if (taken.has(id)) throw new Error(`two requirements share the ID ${id}`);
    taken.add(id);
    return { constraint, id };
  });
}
