// Figure "Its products" for one section: a strip per key property (figures.js STRIP_SETS), one mark per product exactly
// as material-facts.js spreadEntries gives them, each on its own scale (scales.js dotScale), stacked where they would
// touch; the compared products' middle half shaded and their median a line (materials[].summary[key]); the lowest and
// highest compared products named, every one under four, each name a link to its card on the Products page. The marks
// follow the drawer's grammar with the emphasis on what is compared: compared filled in the accent; as published (no
// stated orientation) hollow grey; modified products (a variant) grey diamonds, kept off the scale's computation and
// pinned at its end when far off; annealed a square; sold as toughened in the claim colour. x in per cent, y in px.

import { esc, pct, textPx, fmtDisplay, headline, shortName, withUnit, spanUnit, products, andList, orList, inText, figContext, productMark, productData, productName, fitLabels, KEY, keyOf, twinTable } from './kit.js';
import { figFrame } from './figure.js';
import { spreadEntries, dotMarks } from '../../js/ui/material-facts.js';
import { widestSpread } from '../../js/ui/material-stats.js';
import { dotScale } from '../../js/ui/scales.js';

const GAP = 1.3;        // per cent of the track between two dots on one level (about 8 px on a laptop)
const LEVELS = 7;
const PITCH = 8.6;      // px between levels
const CALL = 16;        // px for the names over the dots
const WIDE = 640, NARROW = 300;

const QUESTIONS = {
  mechanical: 'How strong, stiff and tough are its products, and which stand out?',
  thermal: 'Where do its products soften under load?',
  'density-price': 'How dense is it, and what does it cost?',
};

function strip(c, k, key) {
  const h = headline(key);
  const entries = h ? spreadEntries(c.m, c, key) : [];
  if (!entries.length) return null;
  const s = c.m.summary?.[key] ?? {};
  const plain = entries.filter((e) => !e.variant);
  const sc = dotScale((plain.length ? plain : entries).map((e) => e.v.value), h.unit);
  const X = (v) => sc.pct(v);
  const levels = [];
  const placed = [...entries].sort((a, b) => a.v.value - b.v.value || a.g.id.localeCompare(b.g.id)).map((e) => {
    const at = X(e.v.value);
    let lv = levels.findIndex((last) => at - last >= GAP);
    if (lv < 0) lv = levels.length < LEVELS ? levels.length : levels.indexOf(Math.min(...levels));
    levels[lv] = at;
    return { e, at, lv, marks: dotMarks(h, e, c) };
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
  if ((s.n ?? 0) > 1) o.push(`<line class="dv-pmed" x1="${pct(X(s.median))}" x2="${pct(X(s.median))}" y1="${top - 4}" y2="${base + 6}"/>`);
  o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${base + 6.5}" y2="${base + 6.5}"/>`);
  for (const p of placed) o.push(productMark(p.marks, p.at, base - p.lv * PITCH, productData(p.e, h, p.marks)));
  // The names, over the dots: anchored inward near the ends, left out where they would meet; hidden on a phone where they
  // do not fit its narrow track.
  const items = named.map((p) => { const t = productName(p.e.g); const w = textPx(t, 11.5); const a = p.at < 12 ? 'start' : p.at > 88 ? 'end' : 'middle'; return { p, t, at: p.at, w, anchor: a }; });
  const fits = fitLabels(items, WIDE, 10), fitsN = fitLabels(items, NARROW, 8);
  items.forEach((it, i) => {
    if (!fits[i]) return;
    o.push(`<a href="${esc(`${k.productsHref}#${it.p.e.g.id}`)}" data-grade="${esc(it.p.e.g.id)}"><text class="dv-call${fitsN[i] ? '' : ' alt'}" x="${pct(it.at)}" y="${CALL - 5}" dx="${it.anchor === 'start' ? -3 : it.anchor === 'end' ? 3 : 0}" text-anchor="${it.anchor}">${esc(it.t)}</text></a>`);
  });
  // The scale's labels under the strip.
  const tl = sc.ticks.map((t) => ({ t: fmtDisplay(t, ''), at: X(t) })).map((it) => ({ ...it, w: textPx(it.t, 11.5), anchor: it.at >= 99.5 ? 'end' : it.at <= 0.5 ? 'start' : 'middle' }));
  const tf = fitLabels(tl, WIDE), tfn = fitLabels(tl, NARROW);
  tl.forEach((it, i) => { if (tf[i]) o.push(`<text x="${pct(it.at)}" y="${base + 21}" text-anchor="${it.anchor}"${tfn[i] ? '' : ' class="alt"'}>${esc(it.t)}</text>`); });
  const n = s.n ?? 0;
  const open = placed.filter((p) => p.marks.includes('open')).length;
  const sub = n === entries.length ? products(n) : n ? `${n} of ${entries.length} products in the median` : `${products(entries.length)} · as published`;
  const html = `<div class="st-row" data-key="${esc(key)}" data-unit="${esc(h.unit)}" data-open="as published: orientation or load not stated">`
    + `<div class="st-label">${esc(h.labels.plain)}<small>${esc(`${h.unit}${sc.log ? ', log scale' : ''} · ${sub}`)}</small></div>`
    + `<svg class="st-svg" width="100%" height="${H}" role="img" aria-label="${esc(`${h.labels.plain}: ${products(entries.length)} drawn${n ? `; median of the ${n} ranked ${withUnit(s.median, h.unit)}${s.q1 != null ? `, middle half ${spanUnit(s.q1, s.q3, h.unit)}` : ''}` : ''}${compared.length ? `; lowest ${productName(compared[0].e.g)}, highest ${productName(compared.at(-1).e.g)}` : ''}.`)}">${o.join('')}</svg></div>`;
  return { html, h, s, n, entries, placed, compared, open, variants: placed.filter((p) => p.e.variant).length, marks: new Set(placed.flatMap((p) => p.marks)) };
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
  const rows = keys.map((key) => strip(c, k, key)).filter(Boolean);
  if (!rows.length) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  const m = c.m;
  const name = shortName(m);
  const total = m.gradeIds.length;
  const marks = new Set(rows.flatMap((r) => [...r.marks]));
  const key = keyOf([KEY.product(), ...(marks.has('open') ? [KEY.productOpen()] : []), ...(marks.has('annealed') ? [KEY.annealed()] : []),
    ...(marks.has('variant') ? [KEY.variant()] : []), ...(marks.has('claimed') ? [KEY.claimed()] : []), ...(rows.some((r) => r.n > 1) ? [KEY.band()] : [])]);
  const table = twinTable(['Property', 'Ranked', 'Median', 'Middle half', 'Lowest ranked', 'Highest ranked', 'As published', 'Added filler or additive'], rows.map((r) => [
    `${r.h.labels.plain} (${r.h.unit})`, String(r.n), r.n ? fmtDisplay(r.s.median, r.h.unit) : '—', r.s.q1 != null ? spanUnit(r.s.q1, r.s.q3, '').trim() : '—',
    r.compared.length ? `${productName(r.compared[0].e.g)}, ${fmtDisplay(r.compared[0].e.v.value, r.h.unit)}` : '—',
    r.compared.length > 1 ? `${productName(r.compared.at(-1).e.g)}, ${fmtDisplay(r.compared.at(-1).e.v.value, r.h.unit)}` : '—',
    String(r.open), String(r.variants),
  ]), { numeric: false });
  const missing = keys.filter((key) => !rows.some((r) => r.h.key === key)).map((key) => headline(key)).filter(Boolean).map(inText);
  const openOnly = rows.filter((r) => !r.n).map((r) => inText(r.h));
  const leaves = [missing.length ? `No ${name} product publishes ${orList(missing)}.` : '', openOnly.length ? `Its ${andList(openOnly)} ${openOnly.length > 1 ? 'are' : 'is'} published with no stated orientation, so no median is drawn.` : '']
    .filter(Boolean).join(' ') || `Every ${name} product that publishes these values is drawn; each value, with its document and conditions, is on the Products page.`;
  const html = figFrame({
    slug: `products-${id}`, kind: `strips-${id}`, title: titleOf(id, m, rows, total), question: QUESTIONS[id] ?? 'How do its products spread?',
    key, plot: rows.map((r) => r.html).join(''), label: null,
    read: 'One mark per product, on each property\'s own scale; the band is the middle half of the products ranked and the line their median. Hover a product to find it in every figure; select one to open its card on the Products page.',
    table, leaves, method: 'products',
  });
  return { html, empty: false, stats: { figures: 1, dots: rows.reduce((t, r) => t + r.entries.length, 0) } };
}
