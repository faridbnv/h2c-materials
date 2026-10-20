// Figure "Its products" for one section: a strip per key property (figures.js STRIP_SETS) that at least STRIP_MIN
// products publish, one mark per product exactly as material-facts.js spreadEntries gives them, stacked where they would
// touch; the ranked products' middle half shaded and their median a line (materials[].summary[key]); the lowest and highest
// ranked products named over their own marks, joined to them by a leader, each name a link to its card on the Products
// page. The scale is the property's own, the same on every page of the material's kind (material-stats.js
// propertyScale); where every product sits in less than ZOOM of it, the strip zooms to round steps about them and its
// label says the range. A value beyond the scale is a chevron at the edge, its value on hover and in the table. The marks
// follow the drawer's grammar with the emphasis on what is ranked: ranked filled in the accent; as published (no stated
// orientation or load) hollow and light; products with an added filler or additive (a variant) light diamonds; annealed a
// square; sold as toughened in the claim colour. x in per cent, y in px.

import { esc, pct, textPx, fmtDisplay, NBSP, beyond, headline, shortName, withUnit, spanUnit, products, andList, orList, inText, figContext, productMark, productData, productName, fitLabels, tickLabels, tickText, KEY, keyOf, twinTable, noteOf } from './kit.js';
import { sheetCode } from '../records/common.js';
import { figFrame } from './figure.js';
import { spreadEntries, dotMarks } from '../../js/ui/material-facts.js';
import { setApartWords } from '../../js/ui/material-words.js';
import { widestSpread, propertyScale, isFlexible } from '../../js/ui/material-stats.js';
import { zoomScale } from '../../js/ui/scales.js';
import { STRIP_MIN, inStrip } from '../figures.js';
import { spanDisplay } from '../numbers.js';

const GAP = 1.3;        // per cent of the track between two dots on one level (about 8 px on a laptop)
const LEVELS = 7;
const PITCH = 8.6;      // px between levels
const CALL = 16;        // px for the names over the dots
// The narrowest track each layout gives: about 450 px from 720 px screens up (the label column beside the track), about
// 340 px on a phone (the track under its label). Names and ticks that fit there fit at every wider width.
const WIDE = 450, NARROW = 340;
/** A strip zooms where its products' values span less than this share of the property's scale. */
const ZOOM = 0.25;

const QUESTIONS = {
  mechanical: 'How strong, stiff and tough are its products, and which stand out?',
  hardness: 'How hard are its products, on the Shore scale their sheets use?',
  thermal: 'Where do its products soften under load?',
  'density-price': 'How dense is it, and what does it cost?',
};

function strip(c, k, key) {
  const h = headline(key);
  const entries = h ? spreadEntries(c.m, c, key) : [];
  if (!inStrip(c.m, key) || !entries.length) return null;
  const s = c.m.summary?.[key] ?? {};
  // The property's scale, zoomed where most products sit in a narrow part of it: the ranked products' 5th to 95th
  // percentile (all but the modified ones where fewer than four are ranked). A few far off (PLA's annealed HDTs of 75 to
  // 135 °C) then lie beyond the zoom, drawn as chevrons at its edge, their values on hover and in the table.
  const fixed = propertyScale(k.db, k.ranks, key, isFlexible(c.m));
  const ranked = entries.filter((e) => !e.variant && e.v.level === 'comparable').map((e) => e.v.value);
  const plain = entries.filter((e) => !e.variant).map((e) => e.v.value);
  const vals = (ranked.length >= 4 ? ranked : plain.length ? plain : entries.map((e) => e.v.value)).sort((a, b) => a - b);
  const q = (p) => { const i = (vals.length - 1) * p, lo = Math.floor(i); return vals[lo] + (vals[Math.min(lo + 1, vals.length - 1)] - vals[lo]) * (i - lo); };
  const core = vals.length >= 10 ? [q(0.05), q(0.95)] : [vals[0], vals.at(-1)];
  let sc = fixed, zoomed = false;
  if (!fixed) { sc = zoomScale(core, h.unit, false); zoomed = true; }
  else if (core[0] !== core[1] && (fixed.pct(core[1]) - fixed.pct(core[0])) < ZOOM * 100) { sc = zoomScale(core, h.unit, fixed.log); zoomed = true; }
  const X = (v) => sc.pct(v);
  const levels = [];
  const placed = [...entries].sort((a, b) => a.v.value - b.v.value || a.g.id.localeCompare(b.g.id)).map((e) => {
    const side = beyond(sc, e.v.value);
    const at = side < 0 ? 0 : side > 0 ? 100 : X(e.v.value);
    let lv = levels.findIndex((last) => at - last >= GAP);
    if (lv < 0) lv = levels.length < LEVELS ? levels.length : levels.indexOf(Math.min(...levels));
    levels[lv] = at;
    return { e, at, lv, side, marks: dotMarks(h, e, c) };
  });
  const compared = placed.filter((p) => !p.e.variant && p.e.v.level === 'comparable');
  const named = compared.length <= 3 ? compared : [compared[0], compared.at(-1)];
  const dotsH = Math.max(1, levels.length) * PITCH + 6;
  const top = named.length ? CALL : 4;
  const base = top + dotsH - 4;
  const H = base + 26;
  const o = [];
  for (const t of sc.ticks) o.push(`<line class="dv-grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="${top - 2}" y2="${base + 6}"/>`);
  if (s.q1 != null && s.q3 != null) o.push(`<rect class="dv-pband" x="${pct(X(s.q1))}" y="${top - 2}" width="${pct(Math.max(X(s.q3) - X(s.q1), 0.4))}" height="${base + 8 - top}" rx="2"/>`);
  if ((s.n ?? 0) > 1 && !beyond(sc, s.median)) o.push(`<line class="dv-pmed" x1="${pct(X(s.median))}" x2="${pct(X(s.median))}" y1="${top - 4}" y2="${base + 6}"/>`);
  o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${base + 6.5}" y2="${base + 6.5}"/>`);
  // A mark's note says, beside its state, a value a product reads from the data sheet it shares (D89: two products, one
  // sheet, drawn at one value, which the median counts for each), and a Z bar its sheet labels otherwise ("Z (ZX)").
  const noteFor = (p) => {
    const code = h.direction === 'Z' ? sheetCode(c.msById.get(p.e.v.measurementId)) : null;
    return [noteOf(p.marks), p.e.v.from?.origin === 'twin' ? p.e.v.from.label : '', code ? `Z (${code})` : ''].filter(Boolean).join('; ') || null;
  };
  for (const p of placed) o.push(productMark(p.marks, p.at, base - p.lv * PITCH, productData(p.e, h, p.marks, { 'data-note': noteFor(p) }), p.side));
  // The names, over their own marks: from the mark rightwards in the left half, ending at it in the right half, joined to
  // it by a leader. The lowest first, then the highest where it clears it; on a phone's narrow track the same order.
  const items = named.map((p) => { const t = productName(p.e.g); return { p, t, at: p.at, w: textPx(t, 11.5) + 4, anchor: p.at < 50 ? 'start' : 'end' }; });
  const fits = fitLabels(items, WIDE, 10), fitsN = fitLabels(items, NARROW, 8);
  items.forEach((it, i) => {
    if (!fits[i]) return;
    const dotY = base - it.p.lv * PITCH;
    const alt = fitsN[i] ? '' : ' alt';
    o.push(`<line class="dv-leader${alt}" x1="${pct(it.at)}" x2="${pct(it.at)}" y1="${CALL - 2}" y2="${(dotY - 5).toFixed(1)}"/>`
      + `<a href="${esc(`${k.productsHref}#${it.p.e.g.id}`)}" data-grade="${esc(it.p.e.g.id)}"><text class="dv-call${alt}" x="${pct(it.at)}" y="${CALL - 5}" dx="${it.anchor === 'start' ? -2 : 2}" text-anchor="${it.anchor}">${esc(it.t)}</text></a>`);
  });
  o.push(tickLabels(sc, base + 21, { wide: WIDE, narrow: NARROW }));
  const n = s.n ?? 0;
  const open = placed.filter((p) => p.marks.includes('open')).length;
  const scaleWords = zoomed ? `scale ${tickText(sc.from)}–${tickText(sc.hi)}${NBSP}${h.unit}${sc.log ? ', log' : ''}` : `${h.unit}${sc.log ? ', log scale' : ''}`;
  // What the reader sees: how many products are drawn, and how many of them the band and the median count, in an
  // engineer's words ("64 products, 29 in the median"; "29 ranked of 64 shown" read as bookkeeping, OPEN-PROBLEMS §37.19).
  const sub = `${scaleWords} · ${products(entries.length)}, ${n === entries.length ? 'all in the median' : n ? `${n} in the median` : 'none in the median'}`;
  const clipped = placed.some((p) => p.side);
  const html = `<div class="st-row" data-key="${esc(key)}" data-unit="${esc(h.unit)}" data-open="set apart: test bar not described as printed, or no stated load">`
    + `<div class="st-label">${esc(h.labels.plain)}<small>${esc(sub)}</small></div>`
    + `<svg class="st-svg" width="100%" height="${H}" role="img" aria-label="${esc(`${h.labels.plain}: ${products(entries.length)} drawn${n ? `; median of the ${n} it counts ${withUnit(s.median, h.unit)}${s.q1 != null ? `, middle half ${spanUnit(s.q1, s.q3, h.unit)}` : ''}` : ''}${compared.length ? `; lowest ${productName(compared[0].e.g)}, highest ${productName(compared.at(-1).e.g)}` : ''}.`)}">${o.join('')}</svg></div>`;
  return { html, h, s, n, entries, placed, compared, open, clipped, variants: placed.filter((p) => p.e.variant).length, marks: new Set(placed.flatMap((p) => p.marks)) };
}

/** The finding over one section's strips. */
function titleOf(id, m, rows, total) {
  const name = shortName(m);
  const row = (key) => rows.find((r) => r.h.key === key);
  // "Most" from four products compared (their middle half); "the 3" their lowest to highest; "one" its value.
  const spread = (r, unit, most, few, one) => {
    if (!r || !r.n) return null;
    if (r.n >= 4 && r.s.q1 != null) return most(spanUnit(r.s.q1, r.s.q3, unit));
    return r.n > 1 ? few(r.n, spanUnit(r.s.min, r.s.max, unit)) : one(withUnit(r.s.median, unit));
  };
  if (id === 'thermal') {
    const t = spread(row('hdt045'), '°C', (v) => `Most ${name} products deflect at ${v} under 0.45 MPa`, (n, v) => `The ${n} ${name} products deflect at ${v} under 0.45 MPa`, (v) => `One ${name} product deflects at ${v} under 0.45 MPa`);
    if (t) return t;
    return `Where ${name}'s products soften under load`;
  }
  if (id === 'hardness') {
    // Each scale said apart, in its own unit: Shore A and Shore D press different indenters and are never compared. A
    // strip is drawn from four ranked products (inStrip), so "most" is the middle half, or the range where it has none.
    const said = rows.filter((r) => r.n).map((r) => (r.s.q1 != null ? spanUnit(r.s.q1, r.s.q3, r.h.unit) : spanUnit(r.s.min, r.s.max, r.h.unit)));
    return said.length ? `Most ${name} products measure ${said.join(' or ')}` : `${name}'s hardness, product by product`;
  }
  if (id === 'density-price') {
    const t = spread(row('priceCADkg'), 'CAD/kg', (v) => `Most ${name} costs ${v}`, (n, v) => `The ${n} priced ${name} products cost ${v}`, (v) => `The one priced ${name} product costs ${v}`);
    if (t) return t;
    return `${name}'s density, product by product`;
  }
  const w = widestSpread(m, rows.map((r) => r.h.key));
  if (w) return `${name}'s products spread most in ${inText(headline(w.key)).replace(/ \(XY\)$/, '')}: the middle half runs ${spanUnit(w.q1, w.q3, headline(w.key).unit)}`;
  return `What each of ${name}'s ${products(total)} publishes, property by property`;
}

export function stripsFigure(c, env = {}, keys = [], opts = {}) {
  const k = figContext(c, env);
  const id = opts.id ?? 'products';
  // The how-to-read is said once a page, on its first strips figure.
  const first = !k.stripsSaid;
  const rows = keys.map((key) => strip(c, k, key)).filter(Boolean);
  if (!rows.length) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  k.stripsSaid = true;
  const m = c.m;
  const name = shortName(m);
  const total = m.gradeIds.length;
  const marks = new Set(rows.flatMap((r) => [...r.marks]));
  const key = keyOf([KEY.product(), ...(marks.has('open') ? [KEY.productOpen()] : []), ...(marks.has('annealed') ? [KEY.annealed()] : []),
    ...(marks.has('variant') ? [KEY.variant()] : []), ...(marks.has('claimed') ? [KEY.claimed()] : []), ...(rows.some((r) => r.n > 1) ? [KEY.band()] : []),
    ...(rows.some((r) => r.clipped) ? [KEY.clip()] : [])]);
  const table = twinTable(['Property', 'In the median', 'Median', 'Middle half', 'Lowest in the median', 'Highest in the median', 'As published', 'Added filler or additive'], rows.map((r) => [
    `${r.h.labels.plain} (${r.h.unit})`, String(r.n), r.n ? fmtDisplay(r.s.median, r.h.unit) : '—', r.s.q1 != null ? spanDisplay(r.s.q1, r.s.q3, r.h.unit) : '—',
    r.compared.length ? `${productName(r.compared[0].e.g)}, ${fmtDisplay(r.compared[0].e.v.value, r.h.unit)}` : '—',
    r.compared.length > 1 ? `${productName(r.compared.at(-1).e.g)}, ${fmtDisplay(r.compared.at(-1).e.v.value, r.h.unit)}` : '—',
    String(r.open), String(r.variants),
  ]), { numeric: false });
  const missing = keys.filter((key) => !rows.some((r) => r.h.key === key) && !spreadEntries(m, c, key).length).map((key) => headline(key)).filter(Boolean).map(inText);
  const few = keys.filter((key) => !rows.some((r) => r.h.key === key) && spreadEntries(m, c, key).length).map((key) => headline(key)).filter(Boolean).map(inText);
  // A strip with no ranked product: what sets its values apart (D172), grouped so each reason is said once.
  const openWhy = new Map();
  for (const r of rows.filter((x) => !x.n)) {
    const why = orList([...new Set(r.entries.filter((e) => !e.variant && e.v.level === 'as-published').map((e) => setApartWords(e.v.caveat, r.h)))]);
    openWhy.set(why, [...(openWhy.get(why) ?? []), inText(r.h)]);
  }
  const openLeaves = [...openWhy].map(([why, hs]) => `Its ${andList(hs)} ${hs.length > 1 ? 'are' : 'is'} set apart${why ? ` (${why})` : ''}, so no median is drawn.`).join(' ');
  const leaves = [missing.length ? `No ${name} product publishes ${orList(missing)}.` : '', few.length ? `Fewer than ${STRIP_MIN} publish ${orList(few)}, so ${few.length > 1 ? 'they are' : 'it is'} not drawn.` : '', openLeaves]
    .filter(Boolean).join(' ') || `Every ${name} product that publishes these values is drawn; each value, with its document and conditions, is on the Products page.`;
  const html = figFrame({
    slug: `products-${id}`, kind: `strips-${id}`, title: titleOf(id, m, rows, total), question: QUESTIONS[id] ?? 'How do its products spread?',
    key, plot: rows.map((r) => r.html).join(''), label: null,
    read: first ? 'One mark per product on each property\'s scale (zoomed where its products sit close together, as its label says); the band is the middle half of the products the median counts, and the line the median.' : '',
    howto: first ? 'Hover or select a product to find it in every figure; its name opens its card on the Products page.' : '',
    table, leaves, method: 'products',
  });
  return { html, empty: false, stats: { figures: 1, dots: rows.reduce((t, r) => t + r.entries.length, 0) } };
}
