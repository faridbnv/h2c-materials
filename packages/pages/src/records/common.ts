// A measurement's conditions in words, for the Products page's cards (products/card.js): its orientation, specimen and
// standard, and the other conditions its record states as chips. What is left of the retired records page's helpers
// (D145). Every name is labels.js's or the facts layer's, and everything interpolated is escaped.

import type { Loose } from '../loose.ts';

import { esc } from '../html.ts';
import { stated } from '../facts/material-facts.ts';
import { DIRECTION_WORDS, specimenSaid } from '../facts/labels.ts';
import { changedState, testGuessHead } from '../facts/material-words.ts';

/**
 * A chip: a short fact. With `more`, it opens on a tap or a click to the words behind it. `kind` names the condition it
 * states (moisture, treatment, temperature, notch, test, print), so a document group can say which of the conditions in
 * its heading a row leaves unstated.
 */
const chip = (words: Loose, more = '', kind = '') => {
  const k = kind ? ` data-c="${esc(kind)}"` : '';
  return more && more.trim() !== words
    ? `<details class="ch"${k}><summary>${esc(words)}</summary><span>${esc(more)}</span></details>`
    : `<span class="ch"${k}>${esc(words)}</span>`;
};

/** The condition a chip states (its data-c), or ''. */
export const chipKind = (html: Loose) => /data-c="(\w+)"/.exec(html)?.[1] ?? '';

/**
 * What a row says where a document group's heading states a condition of a kind the row's own record leaves unstated
 * ("Unless a row says otherwise: as printed" over a density the sheet gives with no treatment): the heading must not
 * speak for it. Null for a condition that only some properties have (a notch, which test), which a row of another
 * property cannot lack.
 */
const UNSTATED: Record<string, Loose> = { moisture: 'moisture state not stated', treatment: 'treatment not stated', temperature: 'test temperature not stated', print: 'print settings not stated' };
export const unstatedChip = (kind: Loose): Loose => (UNSTATED[kind] ? `<span class="ch ch--none" data-c="${esc(kind)}">${esc(UNSTATED[kind])}</span>` : null);

/** A measurement's orientation in words, or '' where the property has none (density, a glass transition). */
export const orientationWords = (x: Loose) => (!x.direction || x.direction === 'not-applicable' ? ''
  : x.direction === 'unknown' ? 'not stated' : (DIRECTION_WORDS as Record<string, Loose>)[x.direction] ?? x.direction);

/** The readings of a bar along or across the build axis (the Direction vocabulary's Z family). */
const Z_FAMILY = new Set(['Z', 'ZX', 'XZ', 'ZY', 'YZ']);
/** A two-axis code a sheet prints for such a bar ("ZX", "X-Z", "Z-X"), as its row's locator quotes it. */
const SHEET_CODE = /(?<![A-Za-z])(Z\s?[-–]?\s?[XY]|[XY]\s?[-–]?\s?Z)(?![A-Za-z])/i;

/**
 * The code the sheet itself prints for a bar of the Z family, where it reads differently from the bar as recorded: a
 * "ZX" or "X-Z" column the sheet shows or says stood upright is recorded Z (D92, m191; Eryone's "X-Z", D123), and the
 * reader is owed the sheet's own label beside that reading (the final review of the material pages, OPEN-PROBLEMS
 * §37.18). Null where the sheet prints the reading's own letters, prints no code, or the bar is not of the Z family. How
 * a bar is classified is the data's (D143); this only shows the label it was read from.
 */
export function sheetCode(x: Loose): Loose {
  if (!Z_FAMILY.has(x?.direction)) return null;
  const m = SHEET_CODE.exec(String(x.locator ?? ''));
  if (!m) return null;
  const code = m[1]!.toUpperCase().replace(/\s+/g, '').replace('–', '-');
  return code.replace(/-/g, '') === x.direction ? null : code;
}

/**
 * A bar's orientation as the pages label it: the reading, and beside a Z-family reading the sheet's own code where it
 * differs ("Z (ZX)", "Z (X-Z)"), one form wherever such a bar is labelled (a card's row, a per-sheet table, the layers
 * figure, a strip's mark).
 */
export const directionLabel = (x: Loose) => { const o = orientationWords(x); const code = sheetCode(x); return code ? `${o} (${code})` : o; };

/** What the bar was: the specimen in words ("printed specimen", "specimen not stated"). */
export const specimenWords = (x: Loose) => specimenSaid(x);

/** The standards the build reads for a value (measurements[].standards, typed from the sheet's words), or null. */
export const standardWords = (x: Loose) => { const s = (x.standards ?? []).filter(stated); return s.length ? s.join(', ') : null; };

/**
 * The standards a value was tested to, as a card's Conditions cell says them: the typed standards the build reads
 * ("ISO 1183, GB/T 1033"), where the sheet's own string was set in a table cell's order and read raw ("1183 ISO1183
 * GB/T1033", the final review, OPEN-PROBLEMS §37.19). Where the sheet's words say more than the list (a test load, a
 * rate, a method with no standard) they are a tap or a click away, as a condition chip's are; a sheet that names no
 * standard says so. HTML.
 */
export function standardHtml(x: Loose) {
  const typed = standardWords(x);
  const raw = stated(x.standardText) ? String(x.standardText).trim() : '';
  const words = typed ?? (raw ? 'no standard named' : 'no standard stated');
  const same = (a: Loose, b: Loose) => a.replace(/[\s,;.:_-]/g, '').toLowerCase() === b.replace(/[\s,;.:_-]/g, '').toLowerCase();
  if (!raw || same(raw, words)) return esc(words);
  return `<details class="ch ch--std"><summary>${esc(words)}</summary><span>${esc(`As the sheet prints it: ${raw}`)}</span></details>`;
}

/** The same chips as a list, one HTML string each, so a group of values can state the ones they share once. */
export function conditionChipList(x: Loose): Loose {
  const out: Loose[] = [];
  const state = changedState(x, null);
  if (x.moistureState === 'dry') out.push(chip('dry', stated(x.moisture) ? x.moisture : '', 'moisture'));
  else if (x.moistureState === 'conditioned') out.push(chip('after moisture conditioning', stated(x.moisture) ? x.moisture : '', 'moisture'));
  else if (stated(x.moisture)) out.push(chip('moisture', x.moisture, 'moisture'));
  const annealed = state.find((s: Loose) => s.startsWith('annealed'));
  if (annealed) out.push(chip(annealed, stated(x.postProcessing) ? x.postProcessing : '', 'treatment'));
  else if (x.postProcessingState === 'as-printed') out.push(chip('as printed', stated(x.postProcessing) ? x.postProcessing : '', 'treatment'));
  else if (stated(x.postProcessing)) out.push(chip('post-processing', x.postProcessing, 'treatment'));
  if (stated(x.testTemperature)) out.push(chip(`tested at ${String(x.testTemperature).trim()}`, '', 'temperature'));
  if (x.notch === 'Notched' || x.notch === 'Unnotched') out.push(chip(x.notch.toLowerCase(), '', 'notch'));
  if (x.testGuess) out.push(chip(testGuessHead(x.testGuess).replace(/\.$/, ''), '', 'test'));
  if (stated(x.printParameters)) out.push(chip('print settings', x.printParameters, 'print'));
  return out;
}
