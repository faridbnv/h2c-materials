// Plottable axes. Only normalized numeric headline properties appear here, so the picker cannot
// offer a nonsensical pair. "better" drives the Pareto direction.
//
// `measurement` maps an axis onto the raw Properties rows, for the evidence plot mode. An axis
// with no measurement mapping (price) simply cannot be drawn at measurement level.
// Filled from the registry at start-up (registry.js, useRegistry): every headline, with its axis label,
// unit, Pareto direction, and the value properties, direction and load that map it onto measurements.

import type { Loose } from '../loose.ts';
export const AXIS_DEFS: Loose[] = [];

export { measurementMatches, pairCompatibility } from './axis-pairs.ts';
