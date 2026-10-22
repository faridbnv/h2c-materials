// The pages' figures place a value with the one scale rule the drawer uses (app/js/ui/scales.js): logarithmic at 1, 2
// and 5 of each decade once the largest value is more than ten times the smallest, temperatures linear from the round
// step below the lowest. Nothing here adds a rule; it only turns a place in per cent into the units a figure is drawn in.

import type { Loose } from '../loose.ts';

export { stripScale, stack, limitOnScale, roundStep, DOT_GAP } from '../facts/scales.ts';

/** A scale's place for a value, from top to bottom of a plot `height` px tall (the y of a scatter). */
export const yOf = (scale: Loose, v: Loose, height: Loose) => Number(((1 - scale.pct(v) / 100) * height).toFixed(1));
