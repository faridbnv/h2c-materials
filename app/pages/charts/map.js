// A material map: every material's median of one key property against another (material-stats.js materialMap), the way
// an Ashby chart places materials, as faint points; a few landmark materials named by rule; this material's products as
// marks in the accent with the box of their middle half and a cross at their medians. x is in per cent of the plot's
// width and y in px, so the plot is fluid; the names are placed where they collide with nothing at a laptop's width, and
// those that would collide on a phone are hidden there (class "alt").

import { esc, pct, textPx } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { mark } from './marks.js';
import { yOf, stripScale } from './scale.js';
import { labelsFit } from './axis.js';

const LINE_PX = 16;

/**
 * Where each name goes: the first of its candidate places (each { x, y in per cent and px, dx, dy, anchor }) that keeps
 * inside the plot and overlaps no name already placed nor the boxes given, on a plot `width` px wide. `fixed` gives each
 * item's chosen candidate instead (to test a laptop's choice on a phone). Returns the index of the place, or null.
 */
function placeLabels(items, width, height, blocked, fixed = null) {
  const boxes = [...blocked];
  const hit = (b) => b.x0 < 0 || b.x1 > width || b.y0 < 0 || b.y1 > height || boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const boxOf = (it, c) => {
    const w = textPx(it.text, it.self ? 13 : 12.5) + 2, px = (c.x / 100) * width + c.dx, base = c.y + c.dy;
    const x0 = c.anchor === 'start' ? px : c.anchor === 'end' ? px - w : px - w / 2;
    return { x0, x1: x0 + w, y0: base - LINE_PX + 3, y1: base + 3 };
  };
  return items.map((it, i) => {
    const order = fixed ? (fixed[i] == null ? [] : [fixed[i]]) : it.places.map((_, k) => k);
    let k = order.find((j) => !hit(boxOf(it, it.places[j])));
    // This material's own name is never left out: where nothing is free, it takes its first place. Drawn on a phone
    // where it does not fit, it still takes its room there, so no other name is set over it.
    if (k == null && it.force && !fixed) k = 0;
    if (k == null && it.force && fixed && fixed[i] != null) { boxes.push(boxOf(it, it.places[fixed[i]])); return null; }
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
    const at = `x="${pct(c.x)}" y="${c.y.toFixed(1)}" dx="${c.dx}" dy="${c.dy}" text-anchor="${c.anchor}"`;
    // This material's own name, where it does not fit a phone's plot, is said there up to its comma ("Nylon-CF").
    const short = it.self && onPhone[i] == null && it.text.includes(',') ? it.text.split(',')[0] : null;
    return short ? `${leader}<text class="mself wide-only" ${at}>${esc(it.text)}</text><text class="mself narrow-only" ${at}>${esc(short)}</text>`
      : `${leader}<text class="${it.self ? 'mself' : 'mland'}${alt}" ${at}>${esc(it.text)}</text>`;
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

// ================================================================== "Among all materials" (pages-reimagined round)
//
// Two maps of every material's median (figures.js MAP_PANELS: tensile strength against tensile modulus, the Ashby chart;
// HDT at 0.45 MPa against price, cost against heat resistance), on frames that are the same on every page of a kind
// (rigid or flexible: material-stats.js mapFrame), so a reader learns them once. Every other material a small grey
// point; the alternatives (peerSet) larger, in ink, named; this material's median a ring-edged accent dot with its
// products' middle halves as a cross, and its products (both values compared, not modified) as pale accent points.
// Where it publishes the two only with no stated orientation, a hollow ring marks those values. x in per cent, y in px.

import { mapFrame } from '../../js/ui/material-stats.js';
import { spreadEntries } from '../../js/ui/material-facts.js';
import { MAP_PANELS } from '../figures.js';
import { figFrame } from './figure.js';
import { headline, shortName, withUnit, spanUnit, products as productsWord, andList, orList, inText, figContext, KEY, keyOf, twinTable, fmtDisplay, fitLabels, beyond, tickText, tickLabels } from './kit.js';
import { isFlexible, materialCell } from '../../js/ui/material-stats.js';

const MAP_H = 280;
// The narrowest plot each layout gives: two panels side by side from 1,000 px (about 410 px each), one under the other
// below it (at least 300 px on a phone). Names placed there fit at every wider width.
const WIDE = 410, NARROW = 300;

/** The places beside a point, in px: right, left, above, below, then the diagonals. */
const PLACES = [[8, 4, 'start'], [-8, 4, 'end'], [0, -9, 'middle'], [0, 17, 'middle'], [8, -8, 'start'], [-8, -8, 'end'], [8, 15, 'start'], [-8, 15, 'end']];

/** Where each name goes on a plot `w` px wide: the first place clear of the plot's edge, the blocked boxes and the names before. */
function placeNames(items, w, blocked, want = null, force = null) {
  // `want[i]`: the places to try for item i, in order (undefined: every place; [] none); `force[i]`: an item that is
  // always placed, at the first place inside the plot where nothing is free (this material's own name).
  const boxes = blocked(w);
  return items.map((it, i) => {
    const tw = textPx(it.text, it.self ? 12.5 : 11.5) * 1.08 + 4;
    const boxAt = (j) => {
      const [dx, dy, a] = PLACES[j];
      const x = (it.at / 100) * w + dx;
      const x0 = a === 'start' ? x : a === 'end' ? x - tw : x - tw / 2;
      return [x0, it.y + dy - 11, x0 + tw, it.y + dy + 3];
    };
    const inside = (b) => b[0] >= 0 && b[2] <= w && b[1] >= 0 && b[3] <= MAP_H;
    const free = (b) => !boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const order = want?.[i] !== undefined && want ? want[i] : PLACES.map((_, k) => k);
    let k = order.find((j) => j != null && inside(boxAt(j)) && free(boxAt(j))) ?? null;
    if (k == null && force?.[i]) k = PLACES.map((_, j) => j).find((j) => inside(boxAt(j))) ?? (it.at > 50 ? 1 : 0);
    if (k != null) boxes.push(boxAt(k));
    return k;
  });
}

function mapPanel(c, k, { x: xKey, y: yKey }) {
  const m = c.m;
  const hx = headline(xKey), hy = headline(yKey);
  const { points, xs, ys } = mapFrame(k.db, k.ranks, xKey, yKey, isFlexible(m));
  if (!xs || !hx || !hy) return null;
  const X = (v) => xs.pct(v), Y = (v) => yOf(ys, v, MAP_H);
  const o = [];
  for (const t of xs.ticks) o.push(`<line class="dv-grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${MAP_H}"/>`);
  for (const t of ys.ticks) o.push(`<line class="dv-grid" x1="0" x2="100%" y1="${Y(t)}" y2="${Y(t)}"/><text x="-6" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(tickText(t))}</text>`);
  o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${MAP_H + 0.5}" y2="${MAP_H + 0.5}"/>`);
  // The x labels, evenly thinned at a laptop's and a phone's width.
  o.push(tickLabels(xs, MAP_H + 15, { wide: WIDE, narrow: NARROW }));
  // A point beyond the frame is a chevron at the edge it lies past (its values on hover and in the table), never a mark at
  // the edge as if it were the value.
  const at = (vx, vy) => { const bx = beyond(xs, vx), by = beyond(ys, vy); return { x: bx < 0 ? 0 : bx > 0 ? 100 : X(vx), y: by < 0 ? MAP_H : by > 0 ? 0 : Y(vy), side: bx || (by ? by * 2 : 0) }; };
  const chev = (side) => (side === -1 ? 'dv-chev-l' : side === 1 ? 'dv-chev-r' : side === 2 ? 'dv-chev-u' : 'dv-chev-d');
  const point = (cls, chevCls, r, vx, vy, hooksText) => { const p = at(vx, vy); return p.side ? `<use href="#${chev(p.side)}" class="dv-clip ${chevCls}" x="${pct(p.x)}" y="${p.y}"${hooksText}/>` : `<circle class="${cls}" cx="${pct(p.x)}" cy="${p.y}" r="${r}"${hooksText}/>`; };
  let clipped = false;
  const peerIds = new Set(k.peers.map((p) => p.id));
  const hooks = (id, name, vx, vy) => ` data-mat="${esc(id)}" data-name="${esc(name)}" data-key="${esc(yKey)}" data-v="${vy}" data-xkey="${esc(xKey)}" data-xv="${vx}" data-t="${esc(`${withUnit(vx, hx.unit)}, ${withUnit(vy, hy.unit)}`)}"`;
  for (const p of points) {
    if (p.id === m.id || peerIds.has(p.id)) continue;
    o.push(point('dv-ctx cx', 'dv-ctx-chev cx', 2.6, p.x, p.y, hooks(p.id, shortName(p.m), p.x, p.y)));
  }
  // This material's products with both values compared, then its medians.
  const ex = new Map(spreadEntries(m, c, xKey).filter((e) => e.v.level === 'comparable' && !e.variant).map((e) => [e.g.id, e]));
  const prods = spreadEntries(m, c, yKey).filter((e) => e.v.level === 'comparable' && !e.variant && ex.has(e.g.id));
  for (const e of prods) {
    const vx = ex.get(e.g.id).v.value, vy = e.v.value;
    if (at(vx, vy).side) clipped = true;
    o.push(point('mk dv-selfprod', 'mk dv-selfprod-chev', 2.8, vx, vy, ` data-grade="${esc(e.g.id)}" data-key="${esc(yKey)}" data-v="${vy}" data-xkey="${esc(xKey)}" data-xv="${vx}" data-kind="compared" data-t="${esc(`${withUnit(vx, hx.unit)}, ${withUnit(vy, hy.unit)}`)}"`));
  }
  const cx = materialCell(m, xKey), cy = materialCell(m, yKey);
  const labels = [];
  const blocks = [];
  let self = 'none';
  if (cx?.kind === 'compared' && cy?.kind === 'compared') {
    self = 'compared';
    if (cx.q1 != null) { o.push(`<line class="dv-cross" x1="${pct(X(cx.q1))}" x2="${pct(X(cx.q3))}" y1="${Y(cy.median)}" y2="${Y(cy.median)}"/>`); blocks.push((w) => [(X(cx.q1) / 100) * w - 2, Y(cy.median) - 3, (X(cx.q3) / 100) * w + 2, Y(cy.median) + 3]); }
    if (cy.q1 != null) { o.push(`<line class="dv-cross" x1="${pct(X(cx.median))}" x2="${pct(X(cx.median))}" y1="${Y(cy.q3)}" y2="${Y(cy.q1)}"/>`); blocks.push((w) => [(X(cx.median) / 100) * w - 3, Y(cy.q3) - 2, (X(cx.median) / 100) * w + 3, Y(cy.q1) + 2]); }
    const p = at(cx.median, cy.median);
    if (p.side) clipped = true;
    o.push(point('dv-selfdot cx', 'dv-self-chev dv-chev--big cx', 5.5, cx.median, cy.median, `${hooks(m.id, shortName(m), cx.median, cy.median)} data-self=""`));
    labels.push({ text: shortName(m), short: shortName(m).split(',')[0], at: p.x, y: p.y, self: true });
  } else if (cx && cy) {
    self = 'open';
    const vx = cx.kind === 'compared' ? cx.median : (cx.min + cx.max) / 2, vy = cy.kind === 'compared' ? cy.median : (cy.min + cy.max) / 2;
    const p = at(vx, vy);
    if (p.side) clipped = true;
    o.push(point('dv-selfopen cx', 'dv-open-chev cx', 5.5, vx, vy, `${hooks(m.id, shortName(m), vx, vy)} data-self="" data-kind="as-published"`));
    // On a phone, ", as published" stays only where the name is short; the hollow ring and the key say it.
    const first = shortName(m).split(',')[0];
    labels.push({ text: `${shortName(m)}, as published`, short: textPx(`${first}, as published`, 12.5) > NARROW * 0.5 ? first : `${first}, as published`, at: p.x, y: p.y, self: true });
  }
  const shown = [];
  for (const p of k.peers) {
    const px = p.headline?.[xKey]?.known ? p.headline[xKey].value : null, py = p.headline?.[yKey]?.known ? p.headline[yKey].value : null;
    if (px == null || py == null) continue;
    shown.push(p);
    const q = at(px, py);
    if (q.side) clipped = true;
    o.push(point('dv-peerdot cx', 'dv-peer-chev cx', 4, px, py, `${hooks(p.id, shortName(p), px, py)} data-alt="1"`));
    labels.push({ text: shortName(p), at: q.x, y: q.y, id: p.id });
  }
  const blocked = (w) => [...labels.map((l) => [(l.at / 100) * w - 6, l.y - 6, (l.at / 100) * w + 6, l.y + 6]), ...blocks.map((f) => f(w))];
  // This material's name is placed first and always (forced inside the plot where nothing is free); the alternatives'
  // names then where they clear it and each other, in peerSet's order, so a phone drops the same ones every time. On a
  // phone's plot the name is short (up to its comma: "Nylon-CF", "TPE, as published") and takes its laptop place where
  // that still fits, else a place of its own.
  const selfAt = labels.findIndex((l) => l.self);
  const force = labels.map((l) => !!l.self);
  const wide = placeNames(labels, WIDE, blocked, null, force);
  const narrowItems = labels.map((l) => (l.self ? { ...l, text: l.short } : l));
  const all = PLACES.map((_, j) => j);
  const narrow = placeNames(narrowItems, NARROW, blocked, labels.map((l, i) => (l.self ? [wide[i], ...all] : (wide[i] == null ? [] : [wide[i]]))), force);
  const text = (l, k, cls, words = l.text) => { const [dx, dy, a] = PLACES[k]; return `<text class="dv-maplab${l.self ? ' dv-maplab--self' : ''}${cls}" x="${pct(l.at)}" y="${(l.y + dy).toFixed(1)}" dx="${dx}" text-anchor="${a}"${l.id ? ` data-mat="${esc(l.id)}"` : ''}>${esc(words)}</text>`; };
  labels.forEach((l, i) => {
    if (!l.self) { if (wide[i] != null) o.push(text(l, wide[i], narrow[i] == null ? ' alt' : '')); return; }
    const wk = wide[i], nk = narrow[i];
    if (wk === nk && l.short === l.text) o.push(text(l, wk, ''));
    else o.push(text(l, wk, ' dv-wide'), text(l, nk, ' dv-narrow', l.short));
  });
  const lacks = [!cx ? inText(hx) : null, !cy ? inText(hy) : null].filter(Boolean);
  const html = `<div class="mp-panel" data-key="${esc(yKey)}" data-xkey="${esc(xKey)}"><p class="mp-title">${esc(`${hy.labels.plain} against ${inText(hx)}`)}</p>`
    + (self === 'none' ? `<p class="mp-y">${esc(`${shortName(m)} publishes no ${orList(lacks)}; its alternatives are named.`)}</p>` : '')
    + `<p class="mp-y">${esc(`${hy.unit}${ys.log ? ', log scale' : ''}`)}</p><div class="mp-plot"><svg class="mp-svg" width="100%" height="${MAP_H + 20}" role="img" aria-label="${esc(`${hy.labels.plain} against ${inText(hx)}: every material's median as a point; ${shortName(m)} and its alternatives ${andList(shown.map(shortName))} named.`)}">${o.join('')}</svg></div>`
    + `<p class="mp-x">${esc(`${hx.labels.plain}, ${hx.unit}${xs.log ? ', log scale' : ''}`)}</p></div>`;
  const ctxBeyond = points.filter((p) => p.id !== m.id && !peerIds.has(p.id) && at(p.x, p.y).side).length;
  return { html, self, points: points.length, hx, hy, cx, cy, xKey, yKey, prods: prods.length, lacks, clipped: clipped || ctxBeyond > 0 };
}

export function mapsFigure(c, env = {}, opts = {}) {
  const k = figContext(c, env);
  const m = c.m;
  const panels = MAP_PANELS.map((pnl) => mapPanel(c, k, pnl)).filter(Boolean);
  if (!panels.some((p) => p.self !== 'none')) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  const name = shortName(m);
  const kind = isFlexible(m) ? 'flexible' : 'rigid';
  const n = new Set(MAP_PANELS.flatMap((pnl) => [...(k.ranks[pnl.x]?.entries ?? []), ...(k.ranks[pnl.y]?.entries ?? [])].map((e) => e.id))
    .filter((id) => { const x = k.db.materials.find((mm) => mm.id === id); return x && isFlexible(x) === isFlexible(m); })).size;
  const anyProducts = panels.some((p) => p.prods);
  const anyOpen = panels.some((p) => p.self === 'open');
  const key = keyOf([KEY.selfDot(name), ...(anyProducts ? [KEY.selfProduct(name)] : []), ...(anyOpen ? [KEY.open()] : []), KEY.peerDot(), KEY.context(), ...(panels.some((p) => p.clipped) ? [KEY.clip()] : [])]);
  const rows = [m, ...k.peers].map((r) => [shortName(r) + (r === m ? ' (this material)' : ''), ...panels.flatMap((p) => [p.xKey, p.yKey].map((key) => {
    const x = materialCell(r, key);
    const u = headline(key).unit;
    return !x ? '—' : x.kind === 'open' ? `${spanUnit(x.min, x.max, u)} as published` : `${withUnit(x.median, u)} · ${x.n}`;
  }))]);
  const head = ['Material', ...panels.flatMap((p) => [p.hx, p.hy].map((h) => h.labels.plain))];
  const lacks = [...new Set(panels.flatMap((p) => p.lacks))];
  const leaves = lacks.length ? `${name} publishes no ${orList(lacks)} with a stated orientation or test, so it is not placed on that map.` : '';
  const html = figFrame({
    slug: opts.id ?? 'among-materials', kind: 'maps',
    title: `Where ${name} sits among the ${n} ${kind} materials on file`,
    question: 'Where is it in the landscape: stiffness against strength, heat resistance against price?',
    key, plot: `<div class="mp">${panels.map((p) => p.html).join('')}</div>`, label: null,
    read: `Grey points are every other ${kind} material's medians, on frames that are the same on every ${kind} material's page; the alternatives are named, and a chevron at an edge marks a material beyond the frame.`,
    table: twinTable(head, rows), leaves, method: 'maps',
  });
  return { html, empty: false, stats: { figures: 1, dots: panels.reduce((t, p) => t + p.points + p.prods, 0) } };
}
