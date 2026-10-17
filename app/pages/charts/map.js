// A material map: every material's median of one key property against another (material-stats.js materialMap), the way
// an Ashby chart places materials, as faint points; a few landmark materials named by rule; this material's products as
// marks in the accent with the box of their middle half and a cross at their medians. x is in per cent of the plot's
// width and y in px, so the plot is fluid; the names are placed where they collide with nothing at a laptop's width, and
// those that would collide on a phone are hidden there (class "alt").

import { esc, pct } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { mark } from './marks.js';
import { yOf, stripScale } from './scale.js';
import { labelsFit } from './axis.js';

const CHAR_PX = 6.7; // about how wide a character of a 12 px label is
const LINE_PX = 13;

/**
 * Where each name goes: the first of its candidate places (each { x, y in per cent and px, dx, dy, anchor }) that keeps
 * inside the plot and overlaps no name already placed nor the boxes given, on a plot `width` px wide. `fixed` gives each
 * item's chosen candidate instead (to test a laptop's choice on a phone). Returns the index of the place, or null.
 */
function placeLabels(items, width, height, blocked, fixed = null) {
  const boxes = [...blocked];
  const hit = (b) => b.x0 < 0 || b.x1 > width || b.y0 < 0 || b.y1 > height || boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const boxOf = (it, c) => {
    const w = it.text.length * CHAR_PX + 2, px = (c.x / 100) * width + c.dx, base = c.y + c.dy;
    const x0 = c.anchor === 'start' ? px : c.anchor === 'end' ? px - w : px - w / 2;
    return { x0, x1: x0 + w, y0: base - LINE_PX + 3, y1: base + 3 };
  };
  return items.map((it, i) => {
    const order = fixed ? (fixed[i] == null ? [] : [fixed[i]]) : it.places.map((_, k) => k);
    let k = order.find((j) => !hit(boxOf(it, it.places[j])));
    // This material's own name is never left out: where nothing is free, it takes its first place.
    if (k == null && it.force && !fixed) k = 0;
    if (k == null) return null;
    boxes.push(boxOf(it, it.places[k]));
    return k;
  });
}

/** The places beside a point: right, left, above, below; then further out on the diagonals, joined to it by a leader. */
const around = (x, y) => [
  { x, y, dx: 7, dy: 4, anchor: 'start' }, { x, y, dx: -7, dy: 4, anchor: 'end' },
  { x, y, dx: 0, dy: -8, anchor: 'middle' }, { x, y, dx: 0, dy: 16, anchor: 'middle' },
  ...[[1, -1], [-1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => ({ x, y, dx: sx * 22, dy: sy * 18 + 4, anchor: sx > 0 ? 'start' : 'end', leader: [sx * 20, sy * 16] })),
];

/**
 * `context`: [{ id, name, x, y, landmark }] the other materials' medians; `self`: { name, median: { x, y }, box: { x1, x2,
 * y1, y2 } | null, points: [{ x, y, marks, data }] }; `xUnit`, `yUnit`, `xTitle`, `yTitle`; `height` in px. Returns
 * { html, xLog, yLog }: the plot's markup and whether each axis is logarithmic.
 */
export function materialMapPlot({ context, self, xUnit, yUnit, xTitle, yTitle, window = null, height = 380, wide = 760, narrow = 300 }) {
  // The scales hold the window (this material's neighbourhood) where one is given, else every point.
  const allX = window ? [...window.x, ...self.points.map((p) => p.x), self.median.x] : [...context.map((p) => p.x), ...self.points.map((p) => p.x), self.median.x];
  const allY = window ? [...window.y, ...self.points.map((p) => p.y), self.median.y] : [...context.map((p) => p.y), ...self.points.map((p) => p.y), self.median.y];
  const xs = stripScale(allX, xUnit), ys = stripScale(allY, yUnit);
  // Other materials beyond the scales are not drawn; each is counted on the side it lies furthest past.
  const tx = (v) => (xs.log ? Math.log10(Math.max(v, 1e-12)) : v), ty = (v) => (ys.log ? Math.log10(Math.max(v, 1e-12)) : v);
  const spanX = tx(xs.hi) - tx(xs.from) || 1, spanY = ty(ys.hi) - ty(ys.from) || 1;
  const off = { total: 0, left: 0, right: 0, below: 0, above: 0 };
  const shown = [];
  for (const p of context) {
    const ex = [['left', (tx(xs.from) - tx(p.x)) / spanX], ['right', (tx(p.x) - tx(xs.hi)) / spanX], ['below', (ty(ys.from) - ty(p.y)) / spanY], ['above', (ty(p.y) - ty(ys.hi)) / spanY]]
      .filter(([, d]) => d > 1e-9).sort((a, b) => b[1] - a[1]);
    if (ex.length) { off.total++; off[ex[0][0]]++; } else shown.push(p);
  }
  context = shown;
  const X = (v) => xs.pct(v), Y = (v) => yOf(ys, v, height);
  const vgrid = xs.ticks.map((v) => `<line class="grid" x1="${pct(X(v))}" x2="${pct(X(v))}" y1="0" y2="${height}"/>`).join('');
  const hgrid = ys.ticks.map((v) => `<line class="grid" x1="0" x2="100%" y1="${Y(v)}" y2="${Y(v)}"/>`).join('');
  const texts = xs.ticks.map((v) => fmtNumber(v)), places = xs.ticks.map((v) => X(v));
  const fits = labelsFit(texts, places, wide), fitsNarrow = labelsFit(texts, places, narrow);
  const xlabels = xs.ticks.map((v, i) => {
    const p = places[i];
    const anchor = p >= 99.5 ? 'end' : p <= 0.5 ? 'start' : 'middle';
    return fits[i] ? `<text x="${pct(p)}" y="${height + 18}" text-anchor="${anchor}"${fitsNarrow[i] ? '' : ' class="alt"'}>${esc(texts[i])}</text>` : '';
  }).join('');
  const ylabels = ys.ticks.map((v) => `<text x="-8" y="${Y(v) + 4}" text-anchor="end">${esc(fmtNumber(v))}</text>`).join('');

  // This material's middle half and its medians: the box, and a cross at the medians across it.
  const b = self.box;
  const box = b ? `<rect class="mbox" x="${pct(X(b.x1))}" y="${Y(b.y2)}" width="${pct(Math.max(X(b.x2) - X(b.x1), 0.4))}" height="${Math.max(Y(b.y1) - Y(b.y2), 2).toFixed(1)}"/>` : '';
  const cross = b ? `<line class="mmed" x1="${pct(X(self.median.x))}" x2="${pct(X(self.median.x))}" y1="${Y(b.y2)}" y2="${Y(b.y1)}"/>`
    + `<line class="mmed" x1="${pct(X(b.x1))}" x2="${pct(X(b.x2))}" y1="${Y(self.median.y)}" y2="${Y(self.median.y)}"/>` : '';

  // The names: this material's first, above its box (or beside its medians), then the landmarks by size.
  const selfPlaces = b ? [
    { x: (X(b.x1) + X(b.x2)) / 2, y: Y(b.y2), dx: 0, dy: -7, anchor: 'middle' },
    { x: X(b.x1), y: (Y(b.y1) + Y(b.y2)) / 2, dx: -7, dy: 4, anchor: 'end' },
    { x: (X(b.x1) + X(b.x2)) / 2, y: Y(b.y1), dx: 0, dy: 17, anchor: 'middle' },
    { x: X(b.x2), y: (Y(b.y1) + Y(b.y2)) / 2, dx: 7, dy: 4, anchor: 'start' },
    ...around(X(self.median.x), Y(self.median.y)).slice(4),
  ] : around(X(self.median.x), Y(self.median.y));
  // Nothing a name may cover: the box, this material's marks, and the named materials' points.
  const dotAt = (w, x, y, r) => ({ x0: (x / 100) * w - r, x1: (x / 100) * w + r, y0: y - r, y1: y + r });
  const blockedAt = (w) => [
    ...(b ? [{ x0: (X(b.x1) / 100) * w - 3, x1: (X(b.x2) / 100) * w + 3, y0: Y(b.y2) - 3, y1: Y(b.y1) + 3 }] : []),
    ...self.points.map((p) => dotAt(w, X(p.x), Y(p.y), 5)),
    ...context.filter((p) => p.landmark).map((p) => dotAt(w, X(p.x), Y(p.y), 4)),
  ];
  const items = [{ text: self.name, self: true, force: true, places: selfPlaces },
    ...context.filter((p) => p.landmark).map((p) => ({ text: p.name, places: around(X(p.x), Y(p.y)) }))];
  const chosen = placeLabels(items, wide, height, blockedAt(wide));
  const onPhone = placeLabels(items, narrow, height, blockedAt(narrow), chosen);
  const labels = items.map((it, i) => {
    if (chosen[i] == null) return '';
    const c = it.places[chosen[i]];
    const alt = onPhone[i] == null && !it.self ? ' alt' : '';
    // A leader is drawn as a short line in its own SVG at the point, offset in px (a line cannot mix % and px).
    const leader = c.leader ? `<svg x="${pct(c.x)}" y="${c.y.toFixed(1)}" overflow="visible" class="leader${alt}"><line x1="${Math.sign(c.leader[0]) * 3}" y1="${Math.sign(c.leader[1]) * 3}" x2="${c.leader[0]}" y2="${c.leader[1]}"/></svg>` : '';
    return `${leader}<text class="${it.self ? 'mself' : 'mland'}${alt}" x="${pct(c.x)}" y="${c.y.toFixed(1)}" dx="${c.dx}" dy="${c.dy}" text-anchor="${c.anchor}">${esc(it.text)}</text>`;
  }).join('');

  const others = context.map((p) => `<circle class="cx${p.landmark ? ' cx--land' : ''}" cx="${pct(X(p.x))}" cy="${Y(p.y)}" r="${p.landmark ? 3.6 : 3}" data-name="${esc(p.name)}" data-v="${esc(`${fmtNumber(p.x, xUnit)}, ${fmtNumber(p.y, yUnit)}`)}"/>`).join('');
  const own = self.points.map((p) => mark(p.marks, pct(X(p.x)), Y(p.y), p.data)).join('');
  const html = `<div class="sc sc--map"><div class="sc-y">${esc(yTitle)}${ys.log ? ', log scale' : ''}</div>`
    + `<div class="sc-plot"><svg class="sc-svg" height="${height}" aria-hidden="true" focusable="false">${vgrid}${hgrid}`
    + `<line class="axis-line" x1="0" x2="100%" y1="${height - 0.5}" y2="${height - 0.5}"/><line class="axis-line" x1="0.5" x2="0.5" y1="0" y2="${height}"/>`
    + `${others}${box}${cross}${own}<g class="sc-labels">${xlabels}${ylabels}</g><g class="map-names">${labels}</g></svg></div>`
    + `<div class="sc-x">${esc(xTitle)}${xs.log ? ', log scale' : ''}</div></div>`;
  return { html, xLog: xs.log, yLog: ys.log, off };
}
