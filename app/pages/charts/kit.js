// What the five figures of the material pages share (pages-reimagined round): the material's alternatives and context,
// held once per render; the product mark; the tick labels of a fluid track; the key; the table twin's cells. A figure
// is drawn at any width: x is in per cent of its track, y in px, and a label that would run into another on a phone's
// narrow track carries the class "alt", which figures.src.css hides there.
//
// The data hooks every mark carries (the page script lights and names them; test/pages.check.js reads them):
//   a product's mark   class "mk" (+ mk--open, mk--annealed, mk--variant, mk--claimed), data-grade, data-key (the headline
//                      key), data-v (the value as compiled), data-kind, data-t (the value as printed, with its unit) and
//                      data-note (its state in words, where it has one). Its name is the page's product-name map's.
//   a material's mark  data-mat, data-key, data-v (its median), data-name, data-t.
//   a shaded run       class "tp", data-t (the words it shows on hover).
// Where a mark holds two values (a map's point, a product's XY against Z), data-key and data-v are the vertical one and
// data-xkey and data-xv the horizontal one.

import { esc, pct, textPx, attrs } from '../html.js';
import { fmtDisplay } from '../numbers.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { indexDb, rankTable, productNameOrId } from '../../js/ui/material-facts.js';
import { peerSet } from '../../js/ui/material-stats.js';
import { materialName } from '../../js/ui/labels.js';
import { pageOf } from '../../js/ui/page-rule.js';

export { esc, pct, textPx, attrs, fmtDisplay };

/** A registry headline by key (drawer-only ones included). */
export const headline = (key) => REGISTRY.allHeadlines.find((h) => h.key === key) ?? null;

/** A material's name as a figure prints it: its primary name ("PEI / ULTEM" stays whole, "Nylon-CF, maker…" its first part). */
export const shortName = (m) => materialName(m.name).primary ?? m.name;

/** A value with its unit, at display precision: "45.5 MPa". */
export const withUnit = (v, unit) => (unit ? `${fmtDisplay(v, unit)} ${unit}` : fmtDisplay(v, unit));

/** A span at display precision, word-joined: "40–53 MPa", or one value where both print alike. */
export function spanUnit(lo, hi, unit) {
  const a = fmtDisplay(lo, unit), b = fmtDisplay(hi, unit);
  return `${a === b ? a : `${a}⁠–⁠${b}`}${unit ? ` ${unit}` : ''}`;
}

/** "1 product", "71 products". */
export const products = (n) => `${Number(n).toLocaleString('en-CA')} ${n === 1 ? 'product' : 'products'}`;

/** "a, b and c". */
export const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** "a, b or c": the list after a negative ("publishes no …"). */
export const orList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs.at(-1)}`);

/** A property's name inside a sentence: "tensile strength (Z)", "HDT at 0.45 MPa", "notched Charpy impact". */
export function inText(h) {
  const t = h.labels.plain;
  return t.replace(/^([A-Z])([a-z])/, (s, a, b) => a.toLowerCase() + b);
}

// ------------------------------------------------------------------ the context a render shares

const CONTEXT = new WeakMap();
const RANKS = new WeakMap();
const INDEX = new WeakMap();

/**
 * The page's figure context, once per material context `c`: its database lookups, every material's medians (rankTable),
 * its alternatives (material-stats.js peerSet, five), and the alternatives' links where the page rule gives them a page.
 */
export function figContext(c, env = {}) {
  let k = CONTEXT.get(c);
  if (k) return k;
  const db = c.db;
  const ix = env.index ?? INDEX.get(db) ?? INDEX.set(db, indexDb(db)).get(db);
  const ranks = env.ranks ?? RANKS.get(db) ?? RANKS.set(db, rankTable(db)).get(db);
  const peers = peerSet(db, c.m, ix, { max: 5 });
  const hrefOf = (m) => (pageOf(m, ix.measurementsByMaterial.get(m.id) ?? []) ? `${m.id}.html` : null);
  k = { db, ix, ranks, peers, hrefOf, productsHref: `${c.m.id}-products.html` };
  CONTEXT.set(c, k);
  return k;
}

// ------------------------------------------------------------------ marks

/** The sprite's shapes for the figures (marks.js SPRITE carries them), each centred on 0,0. */
export const DV_SHAPES = '<circle id="dv-dot" r="3.6"/><rect id="dv-sq" x="-3.5" y="-3.5" width="7" height="7" rx="1"/><path id="dv-dia" d="M0 -4.8L4.8 0L0 4.8L-4.8 0Z"/>';

/** A product value's kinds, as the checks read them: compared or as-published or variant, then annealed and claimed. */
export function kindsOf(marks) {
  const base = marks.includes('variant') ? 'variant' : marks.includes('open') ? 'as-published' : 'compared';
  return [base, ...(marks.includes('annealed') ? ['annealed'] : []), ...(marks.includes('claimed') ? ['claimed'] : [])];
}

/** A value's state in the words a reader sees (content's words, as the page checks expect). */
export function noteOf(marks) {
  return [
    marks.includes('variant') ? 'added filler or additive' : '',
    marks.includes('open') ? 'as published: orientation or load not stated' : '',
    marks.includes('annealed') ? 'measured after annealing' : '',
    marks.includes('claimed') ? 'sold as toughened (maker\'s statement)' : '',
  ].filter(Boolean).join('; ');
}

/**
 * A product's mark: a dot, a square after annealing, a diamond for a modified product; hollow where not compared; the
 * claim colour where sold as toughened. `x` per cent (a number), `y` px; `data` its hooks.
 */
export function productMark(marks, x, y, data) {
  const shape = marks.includes('variant') ? 'dv-dia' : marks.includes('annealed') ? 'dv-sq' : 'dv-dot';
  const cls = ['mk', 'dv-p', ...marks.map((k) => `mk--${k}`)].join(' ');
  return `<use href="#${shape}" class="${cls}" x="${pct(x)}" y="${Number(y.toFixed(1))}"${attrs(data)}/>`;
}

/** A product mark's hooks for value `v` of headline `h` (`e` a spreadEntries entry). */
export function productData(e, h, marks, extra = {}) {
  const note = noteOf(marks);
  return { 'data-grade': e.g.id, 'data-key': h.key, 'data-v': e.v.value, 'data-kind': kindsOf(marks).join(' '),
    'data-t': withUnit(e.v.value, h.unit), 'data-note': note || null, ...extra };
}

/** A product's name, as the page's name map gives it (for the few names a figure prints). */
export const productName = (g) => productNameOrId(g);

// ------------------------------------------------------------------ ticks and labels on a fluid track

/** Which labels fit on a track `px` wide, each `{ at (per cent), w (px), anchor }`, ends first. Returns a flag per label. */
export function fitLabels(items, px, gap = 6) {
  const box = (it) => { const x = (it.at / 100) * px; return it.anchor === 'start' ? [x, x + it.w] : it.anchor === 'end' ? [x - it.w, x] : [x - it.w / 2, x + it.w / 2]; };
  const keep = items.map(() => false);
  const placed = [];
  const order = items.map((_, i) => i);
  if (order.length > 1) order.splice(1, 0, order.pop());
  for (const i of order) {
    const [a, b] = box(items[i]);
    if (a < -1 || b > px + 1) continue;
    if (placed.some(([l, r]) => a < r + gap && b > l - gap)) continue;
    placed.push([a, b]);
    keep[i] = true;
  }
  return keep;
}

/** The tick labels of a scale as an SVG row, thinned for a track `wide` px wide (and hidden on a phone's `narrow` one). */
export function tickRow(scale, { height = 18, wide = 640, narrow = 280, y = 13, cls = 'dv-ticks' } = {}) {
  const items = scale.ticks.map((v) => {
    const at = scale.pct(v), t = fmtDisplay(v, '');
    return { v, at, t, w: textPx(t, 11.5), anchor: at >= 99.5 ? 'end' : at <= 0.5 ? 'start' : 'middle' };
  });
  const fits = fitLabels(items, wide), fitsNarrow = fitLabels(items, narrow);
  const marks = items.map((it, i) => `<line class="dv-tk" x1="${pct(it.at)}" x2="${pct(it.at)}" y1="0" y2="3"/>`
    + (fits[i] ? `<text x="${pct(it.at)}" y="${y}" text-anchor="${it.anchor}"${fitsNarrow[i] ? '' : ' class="alt"'}>${esc(it.t)}</text>` : '')).join('');
  return `<svg class="${cls}" width="100%" height="${height}" aria-hidden="true" focusable="false"><line class="dv-axis" x1="0" x2="100%" y1="0.5" y2="0.5"/>${marks}</svg>`;
}

/** Gridlines at a scale's ticks, from y1 to y2 px. */
export const gridLines = (scale, y1, y2) => scale.ticks.map((v) => `<line class="dv-grid" x1="${pct(scale.pct(v))}" x2="${pct(scale.pct(v))}" y1="${y1}" y2="${y2}"/>`).join('');

// ------------------------------------------------------------------ the key and the table twin

const keySvg = (inner, w = 16) => `<svg class="dv-key-mk" width="${w}" height="14" aria-hidden="true" focusable="false">${inner}</svg>`;

/** The key's items by name; a figure lists only those it drew. */
export const KEY = {
  selfCell: (name) => [keySvg('<rect class="dv-self-band" x="0" y="3" width="16" height="8" rx="2"/><rect class="dv-self" x="6.5" y="0" width="3" height="14" rx="1.5"/>'), `${esc(name)}: its products' median and middle half`],
  peerCell: () => [keySvg('<rect class="dv-peer-band" x="0" y="3" width="16" height="8" rx="2"/><rect class="dv-peer" x="6.5" y="0" width="3" height="14" rx="1.5"/>'), 'an alternative'],
  range: () => [keySvg('<line class="dv-peer-range" x1="0" x2="16" y1="7" y2="7"/>'), 'lowest to highest'],
  open: () => [keySvg('<circle class="dv-open" cx="8" cy="7" r="4"/>'), 'as published: orientation or load not stated'],
  rug: () => [keySvg('<path class="dv-rug" d="M2 1V13M5 1V13M7 1V13M12 1V13"/><line class="dv-rug--self" x1="9.5" x2="9.5" y1="0" y2="14"/>'), 'each material\'s median (top row)'],
  product: () => [keySvg('<use href="#dv-dot" class="dv-p" x="8" y="7"/>'), 'a product'],
  productOpen: () => [keySvg('<use href="#dv-dot" class="dv-p mk--open" x="8" y="7"/>'), 'as published: orientation or load not stated'],
  annealed: () => [keySvg('<use href="#dv-sq" class="dv-p mk--annealed" x="8" y="7"/>'), 'measured after annealing'],
  variant: () => [keySvg('<use href="#dv-dia" class="dv-p mk--variant" x="8" y="7"/>'), 'added filler or additive, kept out of the median'],
  claimed: () => [keySvg('<use href="#dv-dot" class="dv-p mk--claimed" x="8" y="7"/>'), 'sold as toughened (maker\'s statement)'],
  band: () => [keySvg('<rect class="dv-pband" x="0" y="1" width="16" height="12" rx="2"/><line class="dv-pmed" x1="8" x2="8" y1="0" y2="14"/>'), 'middle half and median'],
  context: () => [keySvg('<circle class="dv-ctx" cx="8" cy="7" r="2.6"/>'), 'another material'],
  peerDot: () => [keySvg('<circle class="dv-peerdot" cx="8" cy="7" r="4"/>'), 'an alternative'],
  selfDot: (name) => [keySvg('<line class="dv-cross" x1="1" x2="15" y1="7" y2="7"/><line class="dv-cross" x1="8" x2="8" y1="0" y2="14"/><circle class="dv-selfdot" cx="8" cy="7" r="4.5"/>'), `${esc(name)}: median, middle half as a cross`],
  selfProduct: (name) => [keySvg('<circle class="dv-selfprod" cx="8" cy="7" r="2.8"/>'), `a ${esc(name)} product`],
  rays: () => [keySvg('<line class="dv-ray" x1="1" x2="15" y1="13" y2="1"/>'), 'equal share: 100, 75, 50 and 25 %'],
  ownRay: (name) => [keySvg('<line class="dv-ray--own" x1="1" x2="15" y1="13" y2="1"/>'), `${esc(name)}'s median share`],
  shade: () => [keySvg('<rect class="dv-acc" x="0" y="3" width="5" height="8" style="opacity:.2"/><rect class="dv-acc" x="5" y="3" width="5" height="8" style="opacity:.55"/><rect class="dv-acc" x="10" y="3" width="6" height="8"/>'), 'share of the products that accept each temperature'],
  most: () => [keySvg('<rect class="dv-most" x="1" y="2" width="14" height="10" rx="2"/>'), 'what most products accept'],
  oneEnd: () => [keySvg('<line class="dv-oneend" x1="3" x2="16" y1="7" y2="7"/><circle class="dv-oneend-dot" cx="3" cy="7" r="2.2"/>'), 'one end given ("at least")'],
  limit: () => [keySvg('<rect class="dv-beyond" x="8" y="0" width="8" height="14"/><line class="dv-limit" x1="8" x2="8" y1="0" y2="14"/>'), 'the H2C\'s limit, and beyond it'],
  pubCell: () => [keySvg('<rect class="dv-peer-band" x="0" y="3" width="16" height="8" rx="2"/><rect class="dv-peer" x="6.5" y="0" width="3" height="14" rx="1.5"/>'), 'as published, under each sheet\'s own test'],
};

/** A figure's key from items [markup, words]; nothing where no item. */
export const keyOf = (items) => (items.length ? `<ul class="fig-key">${items.map(([svg, words]) => `<li>${svg}<span>${words}</span></li>`).join('')}</ul>` : '');

/** A table twin: a caption-less table, `head` the header cells' texts, `rows` arrays of cell texts (the first a row head). */
export function twinTable(head, rows, { numeric = true } = {}) {
  return `<div class="table-box"><table class="dv-twin"><thead><tr>${head.map((h, i) => `<th scope="col"${i && numeric ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr>${r.map((cell, i) => (i ? `<td${numeric ? ' class="num"' : ''}>${esc(cell)}</td>` : `<th scope="row">${esc(cell)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
