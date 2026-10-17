// Small markup helpers for the material pages. Every string a page interpolates goes through `esc` (format.js's, the one
// the drawer uses): the shared sentences come back unescaped (material-words.js), and some of them hold apostrophes and
// quotes from a maker's own words.

import { esc, fmtNumber } from '../js/ui/format.js';

export { esc };

/** A count with its noun, its number as a data sheet prints it: "1 product", "2,430 measured values". */
export const count = (n, word, many = `${word}s`) => `${fmtNumber(n)} ${n === 1 ? word : many}`;

/** A place on a track, in per cent, to two decimals: "41.23%". Figures are fluid because x is never in pixels. */
export const pct = (v) => `${Number(Math.max(0, Math.min(100, v)).toFixed(2))}%`;

/**
 * About how wide a label is in Inter at `size` px: capitals and digits wider than lower case, punctuation narrower. The
 * figures place and thin their labels by it; a flat 6.3 px a character let capitals and tabular digits at 12.5 px run
 * into each other (the 2026-10-17 blind read at 390 px).
 */
export function textPx(text, size = 12.5) {
  let w = 0;
  for (const ch of String(text)) w += /[A-Z]/.test(ch) ? 8.6 : /[0-9]/.test(ch) ? 7.4 : /[a-z]/.test(ch) ? 6.7 : /[\s.,:;'’()\/-]/.test(ch) ? 3.8 : /[−–—%°+]/.test(ch) ? 7.6 : 7;
  return (w * size) / 12.5;
}

/** Attributes from an object, escaped; null, undefined and false are left out, true is a bare attribute. */
export const attrs = (o = {}) => Object.entries(o)
  .filter(([, v]) => v != null && v !== false && v !== '')
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

/** A JSON island a classic script reads (`<script type="application/json">`), safe against a closing tag in the data. */
export const jsonIsland = (id, value) => `<script type="application/json" id="${esc(id)}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;

/** A data table inside its own sideways scroll box, so a wide table never scrolls the page on a phone. */
export const tableBox = (html, cls = '') => `<div class="table-box${cls ? ` ${cls}` : ''}">${html}</div>`;

/** The records page of a material, and an anchor on it. */
export const recordsHref = (id, anchor = '') => `${id}-records.html${anchor}`;
