// The chart's marks and colours: a marker shape by filler class, and a colour by polymer family, one for every chart (C43). Split out of format.ts so that the first screen,
// which prints no chart, does not carry them.

import type { Loose } from '../loose.ts';
import { fillerName } from './labels.ts';

/** Marker shapes by filler class: colour is never the only channel. */
export const FILLER_SYMBOL: Record<string, Loose> = {
  'carbon-fibre': 'diamond',
  'glass-fibre': 'square',
  'unfilled': 'circle',
  'esd': 'triangle-up',
  'foaming': 'star',
  // Its own shape, filled: a hollow mark means "could not be settled" on the Ashby chart (D110).
  'undisclosed': 'hexagon',
};

export const FILLER_LABEL: Record<string, Loose> = {
  'carbon-fibre': 'Carbon fibre', 'glass-fibre': 'Glass fibre', 'unfilled': 'Unfilled',
  'esd': 'ESD', 'foaming': 'Foaming', 'undisclosed': 'Undisclosed variant',
};
/**
 * A filler the materials table names (aramid fibre, ceramic, PTFE …; engine/filler.js) takes one shape of its own, and
 * its name where a point is named: the charts had drawn those 18 materials as "Undisclosed variant" (OPEN-PROBLEMS §37.8).
 * Eight more shapes, one per filler of one to five materials, would be eight more to learn.
 */
export const NAMED_FILLER_SYMBOL = 'triangle-down';
export const NAMED_FILLER_KEY = 'Other filler, as named';
export const fillerSymbol = (f: Loose) => FILLER_SYMBOL[f] ?? (f ? NAMED_FILLER_SYMBOL : 'circle');
export const fillerLabel = (f: Loose) => FILLER_LABEL[f] ?? fillerName(f);
