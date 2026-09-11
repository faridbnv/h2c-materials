// Pareto analysis over the current candidate set.
//
// The frontier is conditional on the active filters and the two chosen axes. It is not a ranking
// and must never be presented as one.

/** @param {'min'|'max'} goal */
export function paretoFront(points, xGoal = 'min', yGoal = 'max') {
  const better = (a, b, goal) => (goal === 'min' ? a < b : a > b);
  const atLeast = (a, b, goal) => (goal === 'min' ? a <= b : a >= b);

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
export function sortFront(front, xGoal = 'min') {
  return [...front].sort((a, b) => (xGoal === 'min' ? a.x - b.x : b.x - a.x));
}
