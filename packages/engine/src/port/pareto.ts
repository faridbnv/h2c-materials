// Pareto analysis over the current candidate set.
//
// The frontier is conditional on the active filters and the two chosen axes. It is not a ranking
// and must never be presented as one.

export type Goal = 'min' | 'max';
export interface Point { readonly x: number; readonly y: number }

/** @param {'min'|'max'} goal */
export function paretoFront<P extends Point>(points: readonly P[], xGoal: Goal = 'min', yGoal: Goal = 'max'): P[] {
  const better = (a: number, b: number, goal: Goal): boolean => (goal === 'min' ? a < b : a > b);
  const atLeast = (a: number, b: number, goal: Goal): boolean => (goal === 'min' ? a <= b : a >= b);

  return points.filter((p) => {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    // p is dominated if some q is at least as good on both axes and strictly better on one.
    return !points.some((q) => {
      if (q === p || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return false;
      const noWorse = atLeast(q.x, p.x, xGoal) && atLeast(q.y, p.y, yGoal);
      const strictly = better(q.x, p.x, xGoal) || better(q.y, p.y, yGoal);
      return noWorse && strictly;
    });
  });
}

/** Order the front for drawing as a line. */
export function sortFront<P extends { readonly x: number }>(front: readonly P[], xGoal: Goal = 'min'): P[] {
  return [...front].sort((a, b) => (xGoal === 'min' ? a.x - b.x : b.x - a.x));
}
