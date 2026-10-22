// The marks of every figure, drawn from one hidden symbol sprite (shell.js writes it once per page, before any figure).
// The figures' own marks are the dv-* shapes (kit.js DV_SHAPES): a dot, a square, a diamond and four edge chevrons; the
// mk-* shapes are the drawer's dot vocabulary (D133, D139, D140). Colour comes from the stylesheet only.

/** The sprite, once per page, before any figure. Each shape is centred on 0,0, so a <use> at x, y is centred there. */
export const SPRITE = '<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>'
  + '<circle id="mk-dot" r="4.5"/>'
  + '<rect id="mk-square" x="-4.1" y="-4.1" width="8.2" height="8.2" rx="1"/>'
  + '<path id="mk-diamond" d="M0 -5.6L5.6 0L0 5.6L-5.6 0Z"/>'
  // The figures' marks (pages-reimagined round, kit.js DV_SHAPES): a 7 px dot, a square, a diamond.
  + '<circle id="dv-dot" r="3.6"/><rect id="dv-sq" x="-3.5" y="-3.5" width="7" height="7" rx="1"/><path id="dv-dia" d="M0 -4.8L4.8 0L0 4.8L-4.8 0Z"/>'
  // A value beyond its axis: a chevron at the edge, pointing the way the value lies.
  + '<path id="dv-chev-r" d="M-2.5 -4.5L2.5 0L-2.5 4.5"/><path id="dv-chev-l" d="M2.5 -4.5L-2.5 0L2.5 4.5"/>'
  + '<path id="dv-chev-u" d="M-4.5 2.5L0 -2.5L4.5 2.5"/><path id="dv-chev-d" d="M-4.5 -2.5L0 2.5L4.5 -2.5"/>'
  + '</defs></svg>';
