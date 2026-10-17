// A measurement's conditions in words, for the Products page's cards (products/card.js): its orientation, specimen and
// standard, and the other conditions its record states as chips. What is left of the retired records page's helpers
// (D145). Every name is labels.js's or the facts layer's, and everything interpolated is escaped.

import { esc } from '../html.js';
import { stated } from '../../js/ui/material-facts.js';
import { DIRECTION_WORDS, SPECIMEN_WORDS } from '../../js/ui/labels.js';
import { changedState, testGuessHead } from '../../js/ui/material-words.js';

/** A chip: a short fact. With `more`, it opens on a tap or a click to the words behind it. */
const chip = (words, more = '') => (more && more.trim() !== words
  ? `<details class="ch"><summary>${esc(words)}</summary><span>${esc(more)}</span></details>`
  : `<span class="ch">${esc(words)}</span>`);

/** A measurement's orientation in words, or '' where the property has none (density, a glass transition). */
export const orientationWords = (x) => (!x.direction || x.direction === 'not-applicable' ? ''
  : x.direction === 'unknown' ? 'not stated' : DIRECTION_WORDS[x.direction] ?? x.direction);

/** What the bar was: the specimen in words ("printed specimen", "specimen not stated"). */
export const specimenWords = (x) => (!stated(x.specimenType) ? 'specimen not stated' : SPECIMEN_WORDS[x.specimenType] ?? x.specimenType);

/** The standard the sheet names, or null. */
export const standardWords = (x) => (stated(x.standardText) ? x.standardText : null);

/** The same chips as a list, one HTML string each, so a group of values can state the ones they share once. */
export function conditionChipList(x) {
  const out = [];
  const state = changedState(x, null);
  if (x.moistureState === 'dry') out.push(chip('dry', stated(x.moisture) ? x.moisture : ''));
  else if (x.moistureState === 'conditioned') out.push(chip('after moisture conditioning', stated(x.moisture) ? x.moisture : ''));
  else if (stated(x.moisture)) out.push(chip('moisture', x.moisture));
  const annealed = state.find((s) => s.startsWith('annealed'));
  if (annealed) out.push(chip(annealed, stated(x.postProcessing) ? x.postProcessing : ''));
  else if (x.postProcessingState === 'as-printed') out.push(chip('as printed', stated(x.postProcessing) ? x.postProcessing : ''));
  else if (stated(x.postProcessing)) out.push(chip('post-processing', x.postProcessing));
  if (stated(x.testTemperature)) out.push(chip(`tested at ${String(x.testTemperature).trim()}`));
  if (x.notch === 'Notched' || x.notch === 'Unnotched') out.push(chip(x.notch.toLowerCase()));
  if (x.testGuess) out.push(chip(testGuessHead(x.testGuess).replace(/\.$/, '')));
  if (stated(x.printParameters)) out.push(chip('print settings', x.printParameters));
  return out;
}
