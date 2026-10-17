// The marks of every figure, drawn from one hidden symbol sprite with the drawer's dot vocabulary (D133, D139, D140):
//
//   filled dot     a product's value whose sheet states the orientation or test load its row asks for
//   hollow         no stated orientation or load (or, on a print row, a value read from the Bambu Lab Filament Guide)
//   square         measured after annealing
//   diamond        a special formulation, left out of the median (hollow and grey, as in the drawer)
//   coloured       sold as toughened: the maker's statement (--claim), never a verdict colour
//
// A mark is a <use> of the sprite with its kinds as classes (mk--open, mk--annealed, mk--variant, mk--claimed). Colour
// comes from the stylesheet only; x is in per cent of the track, y in px. The status palette never appears in a figure.

import { attrs } from '../html.js';

/** The sprite, once per page, before any figure. Each shape is centred on 0,0, so a <use> at x, y is centred there. */
export const SPRITE = '<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>'
  + '<circle id="mk-dot" r="4.5"/>'
  + '<rect id="mk-square" x="-4.1" y="-4.1" width="8.2" height="8.2" rx="1"/>'
  + '<path id="mk-diamond" d="M0 -5.6L5.6 0L0 5.6L-5.6 0Z"/>'
  + '</defs></svg>';

/** The shape a mark's kinds call for: a diamond for a special formulation, a square after annealing, else a dot. */
export const shapeOf = (marks) => (marks.includes('variant') ? 'mk-diamond' : marks.includes('annealed') ? 'mk-square' : 'mk-dot');

/** The classes of a mark: "mk mk--open mk--annealed". */
export const markClass = (marks) => ['mk', ...marks.map((k) => `mk--${k}`)].join(' ');

/** One mark on a track or a plot. `x` is a per-cent string, `y` px; `data` its data attributes (grade, record, value). */
export const mark = (marks, x, y, data = {}) => `<use href="#${shapeOf(marks)}" class="${markClass(marks)}" x="${x}" y="${y}"${attrs(data)}/>`;

/** A mark in a figure's key, the same <use> at a fixed size. */
export const keyMark = (marks) => `<svg class="key-mk" width="16" height="14" aria-hidden="true" focusable="false"><use href="#${shapeOf(marks)}" class="${markClass(marks)}" x="8" y="7"/></svg>`;

/** The middle half and the median as they appear in a key. */
export const keyBand = '<svg class="key-mk" width="18" height="14" aria-hidden="true" focusable="false"><rect class="band" x="1" y="1" width="16" height="12"/></svg>';
export const keyMedian = '<svg class="key-mk" width="10" height="14" aria-hidden="true" focusable="false"><line class="median" x1="5" x2="5" y1="0" y2="14"/></svg>';
export const keyLimit = '<svg class="key-mk" width="10" height="14" aria-hidden="true" focusable="false"><line class="limit" x1="5" x2="5" y1="0" y2="14"/></svg>';
export const keyDiagonal = '<svg class="key-mk" width="16" height="14" aria-hidden="true" focusable="false"><line class="diagonal" x1="1" x2="15" y1="13" y2="1"/></svg>';

/** A figure's key: only the marks actually drawn, each [markup, words]. */
export const keyList = (items) => (items.length
  ? `<ul class="fig-key">${items.map(([svg, words]) => `<li>${svg}<span>${words}</span></li>`).join('')}</ul>` : '');
