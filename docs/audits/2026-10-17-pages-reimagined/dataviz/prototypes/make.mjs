#!/usr/bin/env node
// Prototypes of the five figures proposed in ../PROPOSAL.md, drawn from dist/db.json through the facts layer the pages
// and the drawer share (material-facts.js, material-stats.js, scales.js), as the renderer would call it. Real data only;
// nothing here decides anything. Writes M001.html and M110.html (or the IDs given) beside this file: static, inline SVG,
// the Inter face embedded, a small script for hover and linking.
//
//   node docs/audits/2026-10-17-pages-reimagined/dataviz/prototypes/make.mjs [M001 M110 …]
//
// A prototype, not production code: SVGs are drawn in a fixed 920 px viewBox and scale with the column. Production keeps
// the pages' fluid per-cent x (app/pages/charts/*). The new display statistics (peerSet, acceptance, the finding lines)
// are written here as plain functions so they can move to app/js/ui/material-stats.js as they are.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../../..');
const db = JSON.parse(readFileSync(`${ROOT}/dist/db.json`, 'utf8'));
const { prepare } = await import(`${ROOT}/app/pages/render.js`);
prepare(db);
const F = await import(`${ROOT}/app/js/ui/material-facts.js`);
const S = await import(`${ROOT}/app/js/ui/material-stats.js`);
const { stripScale, limitOnScale, roundStep } = await import(`${ROOT}/app/js/ui/scales.js`);

/**
 * A dot strip's scale: the one scale rule (scales.js stripScale), except that a linear strip whose lowest value is above
 * half its highest starts at the round step below the lowest, as °C strips do: dots need no zero baseline, and a density
 * of 1,170 to 1,330 kg/m³ drawn from zero is a single blot. (Proposed as scales.js dotScale.)
 */
function dotScale(values, unit) {
  const s = stripScale(values, unit);
  const lo = Math.min(...values), hi = Math.max(...values);
  if (s.log || unit === '°C' || !(lo > hi / 2)) return s;
  const step = roundStep(hi - lo || hi * 0.1);
  const from = Math.floor(lo / step) * step, top = Math.max(Math.ceil(hi / step) * step, from + step);
  const ticks = [];
  for (let v = from; v <= top + step / 2; v += step) ticks.push(Number(v.toPrecision(6)));
  return { log: false, from, hi: top, ticks, pct: (v) => Math.max(0, Math.min(100, ((v - from) / (top - from)) * 100)) };
}
const { REGISTRY } = await import(`${ROOT}/app/js/ui/registry.js`);
const { pageOf } = await import(`${ROOT}/app/js/ui/page-rule.js`);
const { h2cLimit, materialName } = await import(`${ROOT}/app/js/ui/labels.js`);
const { lower } = await import(`${ROOT}/app/js/ui/text.js`);

const ix = F.indexDb(db);
const ranks = F.rankTable(db);
const H = (key) => REGISTRY.allHeadlines.find((h) => h.key === key);
const paged = db.materials.filter((m) => !m.familyEntry && pageOf(m, ix.measurementsByMaterial.get(m.id) ?? []));
const pagedIds = new Set(paged.map((m) => m.id));
const nameOf = (m) => materialName(m.name).primary ?? m.name;
const byId = new Map(db.materials.map((m) => [m.id, m]));

// ------------------------------------------------------------------ text and numbers

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
/** Display precision: whole °C, whole CAD above 10, whole per cent above 10, else three significant figures. */
function fmt(v, unit) {
  if (v == null || !Number.isFinite(v)) return '—';
  if (unit === '°C') return String(Math.round(v));
  if (unit === 'CAD/kg') return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
  if (unit === '%') return v >= 10 ? String(Math.round(v)) : String(Number(v.toPrecision(2)));
  const p = Number(v.toPrecision(3));
  return Math.abs(p) >= 1000 ? p.toLocaleString('en-CA') : String(p);
}
const fu = (v, unit) => `${fmt(v, unit)} ${unit}`;
const span = (a, b, unit) => (fmt(a, unit) === fmt(b, unit) ? fu(a, unit) : `${fmt(a, unit)}–${fmt(b, unit)} ${unit}`);
const pct = (r) => `${Math.round(r * 100)} %`;
const px = (t, size = 12) => t.length * size * 0.56;
const plural = (n, w, many = `${w}s`) => `${n.toLocaleString('en-CA')} ${n === 1 ? w : many}`;
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const k = s.length; return k ? (k % 2 ? s[(k - 1) / 2] : (s[k / 2 - 1] + s[k / 2]) / 2) : null; };

// ------------------------------------------------------------------ display statistics (proposed for material-stats.js)

const med = (m, k) => (m.headline?.[k]?.known ? m.headline[k].value : null);
const fibre = (m) => !!m.facets?.fibre?.value;
const flexible = (m) => !!m.facets?.flexible?.value;
const support = (m) => !!m.facets?.supportMaterial?.value || String(m.family).startsWith('Support');
const esd = (m) => !!m.facets?.esd?.value;
const byProducts = (a, b) => b.gradeIds.length - a.gradeIds.length || a.name.localeCompare(b.name);

/**
 * The materials an engineer weighs this one against, by rule (display only): of the materials with a page, no special
 * class (silk, particle-filled), no support, no ESD grade, rigid with rigid and flexible with flexible: up to two of the
 * same base polymer (the other fibre state first), then the two most documented of the same fibre state whose HDT at
 * 0.45 MPa lies within max(20 °C, 20 %) of this one's, then the most documented one step above, filled to `max` by the
 * nearest HDT.
 */
function peerSet(m, max = 5) {
  const pool = paged.filter((x) => x.id !== m.id && !x.variantClass && !support(x) && flexible(x) === flexible(m) && !esd(x));
  const same = pool.filter((x) => x.basePolymer === m.basePolymer)
    .sort((a, b) => (fibre(a) === fibre(m)) - (fibre(b) === fibre(m)) || byProducts(a, b)).slice(0, 2);
  const h = med(m, 'hdt045') ?? med(m, 'glassTransition');
  const others = pool.filter((x) => x.basePolymer !== m.basePolymer && fibre(x) === fibre(m) && med(x, 'hdt045') != null && !same.includes(x));
  if (h == null) return [...same, ...others.sort(byProducts)].slice(0, max);
  const win = Math.max(20, 0.2 * h);
  const par = others.filter((x) => Math.abs(med(x, 'hdt045') - h) <= win).sort(byProducts).slice(0, 2);
  const up = others.filter((x) => med(x, 'hdt045') > h + win).sort(byProducts).slice(0, 1);
  const out = [...same, ...par, ...up];
  for (const x of others.filter((o) => !out.includes(o)).sort((a, b) => Math.abs(med(a, 'hdt045') - h) - Math.abs(med(b, 'hdt045') - h))) {
    if (out.length >= max) break;
    out.push(x);
  }
  return out.slice(0, max);
}

/** One material's cell for one key: its compared median and spread, or its values as published, or null. */
function cellOf(r, key) {
  const e = r.headline?.[key], s = r.summary?.[key] ?? {};
  if (e?.known) {
    const sp = e.spread ?? {};
    return { kind: 'compared', med: e.value, q1: s.q1 ?? sp.q1 ?? null, q3: s.q3 ?? sp.q3 ?? null, min: s.min ?? sp.min ?? e.value, max: s.max ?? sp.max ?? e.value, n: s.n ?? sp.n ?? 1 };
  }
  if (s.asPublished?.n) return { kind: 'open', min: s.asPublished.min, max: s.asPublished.max, n: s.asPublished.n };
  return null;
}

/** The median share Z keeps of XY over a material's products (material-facts.js shareOf), and how many products. */
function layerShare(mat, a, b) {
  const c = F.materialContext(db, mat.id, { showEstimates: true });
  const byKey = new Map([a, b].map((k) => [k, F.spreadEntries(mat, c, k)]));
  const sh = F.shareOf(H(a), H(b), byKey, c);
  return sh ? { share: median(sh), n: sh.length } : null;
}

// ------------------------------------------------------------------ marks

const W = 920;
const tipAttr = (t) => ` data-tip="${esc(t)}"`;
/** A narrow column's tick labels: the ends anchored inward, a middle one where it clears both. */
function colTicks(sc, X, x0, w, y) {
  const t = sc.ticks, keep = [0, t.length - 1];
  const mid = t.length > 2 ? Math.round((t.length - 1) / 2) : -1;
  const lab = (i, a) => `<text class="dv-tick" x="${X(t[i]).toFixed(1)}" y="${y}" text-anchor="${a}">${esc(fmt(t[i], ''))}</text>`;
  let o = lab(0, 'start') + (t.length > 1 ? lab(t.length - 1, 'end') : '');
  if (mid > 0 && mid < t.length - 1) { const x = X(t[mid]), half = px(fmt(t[mid], ''), 10.5) / 2; if (x - half > x0 + px(fmt(t[0], ''), 10.5) + 6 && x + half < x0 + w - px(fmt(t.at(-1), ''), 10.5) - 6) o += lab(mid, 'middle'); }
  return o;
}
const ticksOf = (scale, X, y, { wide = 9999, cls = 'dv-tick' } = {}) => {
  // Thin the tick labels to those that fit, ends first.
  const placed = [];
  return scale.ticks.map((v) => {
    const t = fmt(v, ''), x = X(v), w = px(t, 11);
    const box = [x - w / 2 - 4, x + w / 2 + 4];
    if (placed.some((b) => box[0] < b[1] && box[1] > b[0]) || x - w / 2 < -2 || x + w / 2 > wide + 2) return '';
    placed.push(box);
    return `<text class="${cls}" x="${x.toFixed(1)}" y="${y}" text-anchor="middle">${esc(t)}</text>`;
  }).join('');
};
/** A product's mark by the drawer's grammar: diamond (special formulation), square (annealed), hollow (no stated orientation), orange (sold as toughened). */
function productMark(marks, x, y, attrs = '', r = 3.6) {
  const cls = ['dv-p', ...marks.map((k) => `dv-p--${k}`)].join(' ');
  if (marks.includes('variant')) return `<path class="${cls}" d="M${x} ${y - r - 1}L${x + r + 1} ${y}L${x} ${y + r + 1}L${x - r - 1} ${y}Z"${attrs}/>`;
  if (marks.includes('annealed')) return `<rect class="${cls}" x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" rx="1"${attrs}/>`;
  return `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"${attrs}/>`;
}
const markWords = (marks) => [marks.includes('open') ? 'orientation not stated: not compared' : '', marks.includes('annealed') ? 'measured after annealing' : '',
  marks.includes('variant') ? 'special formulation: left out of the median' : '', marks.includes('claimed') ? 'sold as toughened (maker\'s statement)' : ''].filter(Boolean).join('; ');

// ------------------------------------------------------------------ Figure 1: against its alternatives

const PEER_COLUMNS = [
  { key: 'tensileModulusXY', title: 'Modulus (XY)', sub: 'tensile · GPa' },
  { key: 'tensileStrengthXY', title: 'Strength (XY)', sub: 'tensile · MPa' },
  { key: 'tensileStrengthZ', title: 'Strength (Z)', sub: 'across layers · MPa' },
  { key: 'charpyNotched', title: 'Notched Charpy', sub: 'impact · kJ/m²' },
  { key: 'hdt045', title: 'HDT', sub: 'at 0.45 MPa · °C' },
  { key: 'priceCADkg', title: 'Price', sub: 'CAD/kg' },
];

function figPeers(m, peers) {
  const rows = [m, ...peers];
  const labelW = 150, gap = 24, colW = (W - labelW - gap * (PEER_COLUMNS.length - 1)) / PEER_COLUMNS.length;
  const headH = 40, rugH = 26, rowH = 34, footH = 22;
  const H0 = headH + rugH + rows.length * rowH + footH;
  const out = [];
  const finding = { high: [], low: [] };
  const table = [];
  // Row backgrounds and labels.
  out.push(`<rect class="dv-selfrow" x="0" y="${headH + rugH}" width="${W}" height="${rowH}" rx="4"/>`);
  out.push(`<text class="dv-rowlab dv-rowlab--sub" x="0" y="${headH + 11}">All materials</text><text class="dv-rowsub" x="0" y="${headH + 23}">a tick per material's median</text>`);
  rows.forEach((r, i) => {
    const y = headH + rugH + i * rowH + rowH / 2;
    const self = i === 0;
    const name = `<tspan class="${self ? 'dv-rowlab--self' : ''}">${esc(nameOf(r))}</tspan>`;
    const link = !self && pagedIds.has(r.id) ? `<a href="${esc(r.id)}.html">${name}</a>` : name;
    out.push(`<g data-mat="${esc(r.id)}"${tipAttr(`${nameOf(r)}: ${plural(r.gradeIds.length, 'product')}`)}><text class="dv-rowlab" x="${self ? 10 : 0}" y="${y - 1}">${link}</text><text class="dv-rowsub" x="${self ? 10 : 0}" y="${y + 12}">${esc(plural(r.gradeIds.length, 'product'))}</text></g>`);
    if (self) out.push(`<rect class="dv-selfkey" x="0" y="${y - 10}" width="4" height="20" rx="1"/>`);
  });
  PEER_COLUMNS.forEach((col, j) => {
    const h = H(col.key), unit = h.unit;
    const x0 = labelW + j * (colW + gap);
    const cells = rows.map((r) => cellOf(r, col.key));
    const vals = cells.flatMap((c) => (c ? [c.min, c.max, c.med].filter((v) => v != null) : []));
    if (!vals.length) { out.push(`<text class="dv-colhead" x="${x0}" y="14">${esc(col.title)}</text><text class="dv-none" x="${x0}" y="${headH + rugH + 14}">no material here publishes it</text>`); return; }
    const sc = stripScale(vals, unit);
    const X = (v) => x0 + (sc.pct(v) / 100) * colW;
    out.push(`<text class="dv-colhead" x="${x0}" y="14">${esc(col.title)}</text><text class="dv-colsub" x="${x0}" y="28">${esc(col.sub)}</text>`);
    // Gridlines at the ticks, through the rug and the rows.
    for (const t of sc.ticks) out.push(`<line class="dv-grid" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${headH}" y2="${H0 - footH}"/>`);
    // The rug: every material's median within the scale, counted beyond it.
    const all = ranks[col.key]?.entries ?? [];
    let below = 0, above = 0;
    for (const e of all) {
      if (e.value < sc.from) { below++; continue; }
      if (e.value > sc.hi) { above++; continue; }
      const isSelf = e.id === m.id;
      out.push(`<line class="${isSelf ? 'dv-rug dv-rug--self' : 'dv-rug'}" x1="${X(e.value).toFixed(1)}" x2="${X(e.value).toFixed(1)}" y1="${headH + 6}" y2="${headH + (isSelf ? 22 : 18)}" data-mat="${esc(e.id)}"${tipAttr(`${e.name}: ${fu(e.value, unit)}`)}/>`);
    }
    // Materials off the scale, counted at its ends over the ticks.
    if (below) out.push(`<text class="dv-rugn" x="${x0}" y="${headH + 3}">‹ ${below}</text>`);
    if (above) out.push(`<text class="dv-rugn" x="${x0 + colW}" y="${headH + 3}" text-anchor="end">${above} ›</text>`);
    // This material's median as a guide down the column.
    const own = cells[0];
    if (own?.kind === 'compared') out.push(`<line class="dv-guide" x1="${X(own.med).toFixed(1)}" x2="${X(own.med).toFixed(1)}" y1="${headH + rugH}" y2="${H0 - footH}"/>`);
    // The cells.
    const ranked = cells.map((c, i) => ({ c, i })).filter((o) => o.c?.kind === 'compared').sort((a, b) => b.c.med - a.c.med);
    const clear = (a, b) => (unit === '°C' ? a - b >= 3 : a >= b * 1.05);
    if (own?.kind === 'compared' && ranked.length >= 3) {
      if (ranked[0].i === 0 && clear(ranked[0].c.med, ranked[1].c.med)) finding.high.push(lower(h.labels.plain.replace(/ \(XY\)/, '')));
      if (ranked.at(-1).i === 0 && clear(ranked.at(-2).c.med, ranked.at(-1).c.med)) finding.low.push(lower(h.labels.plain.replace(/ \(XY\)/, '')));
    }
    cells.forEach((c, i) => {
      const y = headH + rugH + i * rowH + rowH / 2;
      const self = i === 0, r = rows[i];
      const k = self ? 'self' : 'peer';
      table[i] ??= [];
      if (!c) { out.push(`<text class="dv-none" x="${x0 + colW / 2}" y="${y + 4}" text-anchor="middle">—</text>`); table[i][j] = '—'; return; }
      const parts = [];
      if (c.kind === 'open') {
        parts.push(`<line class="dv-open-line${self ? '' : ' dv-open-line--peer'}" x1="${X(c.min).toFixed(1)}" x2="${X(c.max).toFixed(1)}" y1="${y}" y2="${y}"/>`);
        for (const v of [...new Set([c.min, c.max])]) parts.push(`<circle class="dv-open${self ? '' : ' dv-open--peer'}" cx="${X(v).toFixed(1)}" cy="${y}" r="4.2"/>`);
        if (self) parts.push(`<text class="dv-val" x="${X(c.max).toFixed(1)}" y="${y - 8}" text-anchor="middle">${esc(fmt(c.max, unit))}</text>`);
        const tip = `${nameOf(r)}, ${h.labels.plain}: ${span(c.min, c.max, unit)} from ${plural(c.n, 'product')}, orientation not stated, so not compared`;
        out.push(`<g data-mat="${esc(r.id)}"${tipAttr(tip)}><rect class="dv-hit" x="${x0}" y="${y - rowH / 2}" width="${colW}" height="${rowH}"/>${parts.join('')}</g>`);
        table[i][j] = `${span(c.min, c.max, unit)} (not compared: ${plural(c.n, 'product')}, orientation not stated)`;
        return;
      }
      if (c.min !== c.max) parts.push(`<line class="dv-${k}-range" x1="${X(c.min).toFixed(1)}" x2="${X(c.max).toFixed(1)}" y1="${y}" y2="${y}"/>`);
      if (c.q1 != null && c.q3 != null) parts.push(`<rect class="dv-${k}-band" x="${X(c.q1).toFixed(1)}" y="${y - 5}" width="${Math.max(X(c.q3) - X(c.q1), 2).toFixed(1)}" height="10" rx="2"/>`);
      parts.push(`<rect class="dv-${k}" x="${(X(c.med) - 1.5).toFixed(1)}" y="${y - 9}" width="3" height="18" rx="1.5"/>`);
      if (self) {
        const lx = X(c.med), anchor = lx - x0 < 14 ? 'start' : x0 + colW - lx < 14 ? 'end' : 'middle';
        parts.push(`<text class="dv-val" x="${lx.toFixed(1)}" y="${y - 11}" text-anchor="${anchor}">${esc(fmt(c.med, unit))}</text>`);
      }
      const tip = `${nameOf(r)}, ${h.labels.plain}: median ${fu(c.med, unit)}${c.q1 != null ? `, middle half ${span(c.q1, c.q3, unit)}` : ''}, ${span(c.min, c.max, unit).replace(/ .*/, '')} lowest to highest, ${plural(c.n, 'product')}`;
      out.push(`<g data-mat="${esc(r.id)}"${tipAttr(tip)}><rect class="dv-hit" x="${x0}" y="${y - rowH / 2}" width="${colW}" height="${rowH}"/>${parts.join('')}</g>`);
      table[i][j] = `${fmt(c.med, unit)}${c.q1 != null ? ` (${fmt(c.q1, unit)}–${fmt(c.q3, unit)})` : ''} · ${c.n}`;
    });
    out.push(colTicks(sc, X, x0, colW, H0 - 6));
  });
  const peersWords = andList(peers.map(nameOf));
  const said = [finding.high.length ? `the highest ${andList(finding.high)}` : '', finding.low.length ? `the lowest ${andList(finding.low)}` : ''].filter(Boolean);
  const title = said.length ? `Against ${peersWords}, ${nameOf(m)} has ${said.join(' and ')}` : `${nameOf(m)} against ${peersWords}`;
  const svg = `<svg class="dv" viewBox="0 0 ${W} ${H0}" role="img" aria-labelledby="f1t f1d"><title id="f1t">${esc(title)}</title><desc id="f1d">${esc(`Medians and middle halves of ${nameOf(m)} and ${peersWords} for ${andList(PEER_COLUMNS.map((c) => c.title.toLowerCase()))}.`)}</desc>${out.join('')}</svg>`;
  const tbl = `<details class="twin"><summary>The figure as a table</summary><table><thead><tr><th>Material</th>${PEER_COLUMNS.map((c) => `<th>${esc(c.title)}<br><small>${esc(c.sub)}</small></th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><th>${esc(nameOf(r))}</th>${PEER_COLUMNS.map((_, j) => `<td>${esc(table[i]?.[j] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="note">Median (middle half) · products compared.</p></details>`;
  return { title, svg, tbl };
}

// ------------------------------------------------------------------ Figure 2: among all materials (two maps, fixed frames)

function mapPanel(m, peers, { xKey, yKey, w = 446, h = 330, letter }) {
  const hx = H(xKey), hy = H(yKey);
  const xs0 = new Map((ranks[xKey]?.entries ?? []).map((e) => [e.id, e.value]));
  const ys0 = new Map((ranks[yKey]?.entries ?? []).map((e) => [e.id, e.value]));
  // One frame per kind, the same on every page of that kind: rigid materials, or flexible ones.
  const pts = [...xs0.keys()].filter((id) => ys0.has(id) && flexible(byId.get(id)) === flexible(m)).map((id) => ({ id, m: byId.get(id), x: xs0.get(id), y: ys0.get(id) }));
  // The frame holds every material but the two furthest out at each end of each axis, which are pinned to its edge.
  // (Only where the axis keeps its kind: a logarithmic axis over every material stays logarithmic.)
  const trim = (vs) => [...vs].sort((a, b) => a - b).slice(2, -2);
  const frame = (vs, unit) => { const all = stripScale(vs, unit), t = stripScale(trim(vs), unit); return t.log === all.log ? t : all; };
  const xs = frame(pts.map((p) => p.x), hx.unit), ys = frame(pts.map((p) => p.y), hy.unit);
  const L = 44, R = 10, T = 40, B = 36, pw = w - L - R, ph = h - T - B;
  const X = (v) => L + (xs.pct(v) / 100) * pw, Y = (v) => T + ph - (ys.pct(v) / 100) * ph;
  const o = [];
  o.push(`<text class="dv-colhead" x="0" y="13">${esc(letter)}  ${esc(`${hy.labels.plain} against ${lower(hx.labels.plain)}`)}</text>`);
  for (const t of xs.ticks) o.push(`<line class="dv-grid" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${T}" y2="${T + ph}"/>`);
  for (const t of ys.ticks) o.push(`<line class="dv-grid" x1="${L}" x2="${L + pw}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="dv-tick" x="${L - 6}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(t, ''))}</text>`);
  o.push(ticksOf(xs, X, T + ph + 15, { wide: w }));
  o.push(`<text class="dv-axis" x="${L + pw}" y="${h - 3}" text-anchor="end">${esc(`${hx.labels.plain}, ${hx.unit}${xs.log ? ', log' : ''}`)}</text>`);
  o.push(`<text class="dv-axis" x="${L}" y="${T - 6}">${esc(`${hy.unit}${ys.log ? ', log' : ''}`)}</text>`);
  const peerIds = new Set(peers.map((p) => p.id));
  for (const p of pts) {
    if (p.id === m.id || peerIds.has(p.id)) continue;
    o.push(`<circle class="dv-ctx" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.6" data-mat="${esc(p.id)}"${tipAttr(`${nameOf(p.m)}: ${fu(p.x, hx.unit)}, ${fu(p.y, hy.unit)}`)}/>`);
  }
  // This material's products, its middle halves as a cross, its medians.
  const c = F.materialContext(db, m.id, { showEstimates: true });
  const ex = new Map(F.spreadEntries(m, c, xKey).filter((e) => e.v.level === 'comparable' && !e.variant).map((e) => [e.g.id, e]));
  const prods = F.spreadEntries(m, c, yKey).filter((e) => e.v.level === 'comparable' && !e.variant && ex.has(e.g.id));
  for (const e of prods) {
    const g = e.g, vx = ex.get(g.id).v.value, vy = e.v.value;
    o.push(`<circle class="dv-selfprod" cx="${X(vx).toFixed(1)}" cy="${Y(vy).toFixed(1)}" r="2.8" data-grade="${esc(g.id)}"${tipAttr(`${F.productNameOrId(g)}: ${fu(vx, hx.unit)}, ${fu(vy, hy.unit)}`)}/>`);
  }
  const cx = cellOf(m, xKey), cy = cellOf(m, yKey);
  const labels = [];
  let selfAt = null;
  if (cx?.kind === 'compared' && cy?.kind === 'compared') {
    if (cx.q1 != null) o.push(`<line class="dv-cross" x1="${X(cx.q1).toFixed(1)}" x2="${X(cx.q3).toFixed(1)}" y1="${Y(cy.med).toFixed(1)}" y2="${Y(cy.med).toFixed(1)}"/>`);
    if (cy.q1 != null) o.push(`<line class="dv-cross" x1="${X(cx.med).toFixed(1)}" x2="${X(cx.med).toFixed(1)}" y1="${Y(cy.q1).toFixed(1)}" y2="${Y(cy.q3).toFixed(1)}"/>`);
    selfAt = [X(cx.med), Y(cy.med)];
    o.push(`<circle class="dv-selfdot" cx="${selfAt[0].toFixed(1)}" cy="${selfAt[1].toFixed(1)}" r="5.5" data-mat="${esc(m.id)}"${tipAttr(`${nameOf(m)}: median ${fu(cx.med, hx.unit)} (${plural(cx.n, 'product')}), ${fu(cy.med, hy.unit)} (${plural(cy.n, 'product')})`)}/>`);
    labels.push({ text: nameOf(m), at: selfAt, self: true });
  } else if (cx && cy) {
    const vx = cx.kind === 'compared' ? cx.med : (cx.min + cx.max) / 2, vy = cy.kind === 'compared' ? cy.med : (cy.min + cy.max) / 2;
    selfAt = [X(vx), Y(vy)];
    o.push(`<circle class="dv-selfopen" cx="${selfAt[0].toFixed(1)}" cy="${selfAt[1].toFixed(1)}" r="5.5"${tipAttr(`${nameOf(m)}: ${fu(vx, hx.unit)}, ${fu(vy, hy.unit)} as published; orientation not stated, so not compared`)}/>`);
    labels.push({ text: `${nameOf(m)}, as published`, at: selfAt, self: true });
  }
  for (const p of peers) {
    const vx = med(p, xKey), vy = med(p, yKey);
    if (vx == null || vy == null) continue;
    const at = [X(vx), Y(vy)];
    o.push(`<circle class="dv-peerdot" cx="${at[0].toFixed(1)}" cy="${at[1].toFixed(1)}" r="4" data-mat="${esc(p.id)}"${tipAttr(`${nameOf(p)}: median ${fu(vx, hx.unit)}, ${fu(vy, hy.unit)}`)}/>`);
    labels.push({ text: nameOf(p), at, self: false, id: p.id });
  }
  // Names placed where they collide with nothing placed before (this material's first).
  const boxes = labels.map((l) => [l.at[0] - 6, l.at[1] - 6, l.at[0] + 6, l.at[1] + 6]);
  // The cross is not written over.
  if (cx?.kind === 'compared' && cy?.kind === 'compared') {
    if (cx.q1 != null) boxes.push([X(cx.q1) - 2, Y(cy.med) - 3, X(cx.q3) + 2, Y(cy.med) + 3]);
    if (cy.q1 != null) boxes.push([X(cx.med) - 3, Y(cy.q3) - 2, X(cx.med) + 3, Y(cy.q1) + 2]);
  }
  const cand = [[8, 4, 'start'], [-8, 4, 'end'], [0, -9, 'middle'], [0, 17, 'middle'], [8, -8, 'start'], [-8, -8, 'end'], [8, 15, 'start'], [-8, 15, 'end']];
  for (const l of labels) {
    const tw = px(l.text, l.self ? 12.5 : 11.5);
    const fit = cand.find(([dx, dy, a]) => {
      const x0 = a === 'start' ? l.at[0] + dx : a === 'end' ? l.at[0] + dx - tw : l.at[0] + dx - tw / 2;
      const b = [x0, l.at[1] + dy - 10, x0 + tw, l.at[1] + dy + 2];
      if (b[0] < L || b[2] > L + pw || b[1] < T || b[3] > T + ph) return false;
      if (boxes.some((o2) => b[0] < o2[2] && b[2] > o2[0] && b[1] < o2[3] && b[3] > o2[1] && !(o2[0] === l.at[0] - 6 && o2[1] === l.at[1] - 6))) return false;
      boxes.push(b);
      return true;
    });
    if (!fit) continue;
    const [dx, dy, a] = fit;
    o.push(`<text class="${l.self ? 'dv-maplab dv-maplab--self' : 'dv-maplab'}" x="${(l.at[0] + dx).toFixed(1)}" y="${(l.at[1] + dy).toFixed(1)}" text-anchor="${a}"${l.id ? ` data-mat="${esc(l.id)}"` : ''}>${esc(l.text)}</text>`);
  }
  return `<svg class="dv dv-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${hy.labels.plain} against ${hx.labels.plain} for ${pts.length} materials' medians; ${nameOf(m)} and ${andList(peers.map(nameOf))} named.`)}">${o.join('')}</svg>`;
}

function figMaps(m, peers) {
  const a = mapPanel(m, peers, { xKey: 'tensileModulusXY', yKey: 'tensileStrengthXY', letter: 'a' });
  const b = mapPanel(m, peers, { xKey: 'priceCADkg', yKey: 'hdt045', letter: 'b' });
  const n = new Set([...(ranks.tensileModulusXY?.entries ?? []), ...(ranks.priceCADkg?.entries ?? [])].map((e) => e.id).filter((id) => flexible(byId.get(id)) === flexible(m))).size;
  return { title: `Where ${nameOf(m)} sits among the ${n} ${flexible(m) ? 'flexible' : 'rigid'} materials on file`, svg: `<div class="pair">${a}${b}</div>` };
}

// ------------------------------------------------------------------ Figure 3: its products, property by property

const STRIP_KEYS = ['tensileStrengthXY', 'tensileModulusXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'izodNotched', 'hdt045', 'glassTransition', 'density', 'priceCADkg'];

function figProducts(m, c) {
  const labelW = 196, trackW = W - labelW - 8, R = 3.6, PITCH = 8.6, GAP = 8.4;
  const rows = [];
  let y = 0;
  let widest = null;
  for (const key of STRIP_KEYS) {
    const h = H(key);
    const entries = F.spreadEntries(m, c, key);
    if (!entries.length) continue;
    const unit = h.unit;
    const s = m.summary?.[key] ?? {};
    // The scale holds every value but the special formulations' (one far off is pinned at the end, its value on hover).
    const plain = entries.filter((e) => !e.variant);
    const sc = dotScale((plain.length ? plain : entries).map((e) => e.v.value), unit);
    const X = (v) => labelW + (sc.pct(v) / 100) * trackW;
    // Stack: in value order, each dot on the lowest level where it clears the last one by GAP px.
    const levels = [];
    const placed = [...entries].sort((a, b) => a.v.value - b.v.value).map((e) => {
      const x = X(e.v.value);
      let lv = levels.findIndex((last) => x - last >= GAP);
      if (lv < 0) lv = levels.length < 7 ? levels.length : levels.indexOf(Math.min(...levels));
      levels[lv] = x;
      return { e, x, lv, marks: F.dotMarks(h, e, c) };
    });
    const counted = placed.filter((p) => !p.e.variant && p.e.v.level === 'comparable');
    const named = counted.length <= 3 ? counted : [counted[0], counted.at(-1)];
    const callH = named.length ? 16 : 0;
    const dotsH = Math.max(1, levels.length) * PITCH + 8;
    const rowH = callH + dotsH + 22;
    const top = y + callH, base = top + dotsH - 4;
    const o = [];
    for (const t of sc.ticks) o.push(`<line class="dv-grid" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${top}" y2="${base + 6}"/>`);
    if (s.q1 != null) o.push(`<rect class="dv-pband" x="${X(s.q1).toFixed(1)}" y="${top}" width="${Math.max(X(s.q3) - X(s.q1), 2).toFixed(1)}" height="${base + 6 - top}" rx="2"/>`);
    if (s.n > 1) o.push(`<line class="dv-pmed" x1="${X(s.median).toFixed(1)}" x2="${X(s.median).toFixed(1)}" y1="${top - 2}" y2="${base + 6}"/>`);
    o.push(`<line class="dv-base" x1="${labelW}" x2="${labelW + trackW}" y1="${base + 6.5}" y2="${base + 6.5}"/>`);
    for (const p of placed) {
      const name = F.productNameOrId(p.e.g);
      const words = markWords(p.marks);
      o.push(productMark(p.marks, p.x, base - p.lv * PITCH, ` data-grade="${esc(p.e.g.id)}"${tipAttr(`${name}: ${fu(p.e.v.value, unit)}${words ? ` (${words})` : ''}`)}`, R));
    }
    // Names of the lowest and highest compared products (all of them under four), over the track.
    const boxes = [];
    for (const p of named) {
      const name = F.productNameOrId(p.e.g), w = px(name, 11);
      const a = p.x - labelW < w / 2 ? 'start' : labelW + trackW - p.x < w / 2 ? 'end' : 'middle';
      const x0 = a === 'start' ? p.x - 4 : a === 'end' ? p.x - w + 4 : p.x - w / 2;
      if (boxes.some(([l, r]) => x0 < r + 8 && x0 + w > l - 8)) continue;
      boxes.push([x0, x0 + w]);
      o.push(`<text class="dv-call" x="${p.x.toFixed(1)}" y="${y + 11}" dx="${a === 'start' ? -4 : a === 'end' ? 4 : 0}" text-anchor="${a}" data-grade="${esc(p.e.g.id)}">${esc(name)}</text>`);
    }
    o.push(ticksOf(sc, X, base + 19, { wide: W }).replace(/x="([\d.]+)"/g, (str, x) => (+x < labelW - 6 ? 'x="-999"' : str)));
    const n = s.n ?? 0;
    const sub = n === entries.length ? plural(n, 'product') : n ? `${n} compared of ${entries.length}` : `${entries.length} as published, not compared`;
    o.unshift(`<text class="dv-rowlab" x="0" y="${top + 10}">${esc(h.labels.plain)}</text><text class="dv-rowsub" x="0" y="${top + 24}">${esc(`${unit}${sc.log ? ', log scale' : ''} · ${sub}`)}</text>`);
    if (n >= 4 && s.q1 > 0) { const r = s.q3 / s.q1; if (!widest || r > widest.r) widest = { r, h, s }; }
    rows.push(o.join(''));
    y += rowH + 6;
  }
  const prods = S.productsOf(c).length;
  const title = widest ? `${nameOf(m)}'s ${plural(prods, 'product')} spread most in ${lower(widest.h.labels.plain.replace(/ \(XY\)/, ''))}: the middle half runs ${span(widest.s.q1, widest.s.q3, widest.h.unit)}`
    : `${nameOf(m)}'s ${plural(prods, 'product')}, property by property`;
  return { title, svg: `<svg class="dv" viewBox="0 0 ${W} ${y}" role="img" aria-label="${esc(`Each product's own value for each key property, with the middle half of the compared products shaded and their median as a line.`)}">${rows.join('')}</svg>` };
}

// ------------------------------------------------------------------ Figure 4: across the layers

const LAYER_PAIRS = [
  ['tensileStrengthXY', 'tensileStrengthZ', 'Tensile strength'],
  ['tensileModulusXY', 'tensileModulusZ', 'Tensile modulus'],
  ['elongationXY', 'elongationZ', 'Elongation at break'],
];

function figLayers(m, c, peers) {
  const panels = [];
  let lead = null;
  const pw = 286, ph = 236, L = 40, T = 10, side = 196;
  // Where no product publishes both for any property, the plots give way to the alternatives' strips alone.
  const any = LAYER_PAIRS.some(([a, b]) => S.layerPairs(H(a), H(b), new Map([a, b].map((k) => [k, F.spreadEntries(m, c, k)])), c).length);
  for (const [a, b, title] of LAYER_PAIRS) {
    const ha = H(a), hb = H(b), unit = ha.unit;
    const byKey = new Map([a, b].map((k) => [k, F.spreadEntries(m, c, k)]));
    const pairs = S.layerPairs(ha, hb, byKey, c);
    const own = pairs.length ? { share: median(pairs.map((p) => p.ratio)), n: pairs.length } : null;
    const others = peers.map((p) => ({ p, s: layerShare(p, a, b) })).filter((o) => o.s);
    lead ??= own ? { title, own } : null;
    const o = [];
    o.push(`<text class="dv-colhead" x="0" y="13">${esc(title)}</text><text class="dv-colsub" x="0" y="27">${esc(own ? `Z keeps ${pct(own.share)} of XY, median of ${plural(own.n, 'product')}` : 'no product publishes both XY and Z')}</text>`);
    const top = 40;
    if (pairs.length) {
      const vals = pairs.flatMap((p) => [p.xy.v.value, p.z.v.value]);
      const sc = stripScale(vals, unit);
      const size = side;
      const X = (v) => L + (sc.pct(v) / 100) * size, Y = (v) => top + T + size - (sc.pct(v) / 100) * size;
      for (const t of sc.ticks) o.push(`<line class="dv-grid" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${top + T}" y2="${top + T + size}"/><line class="dv-grid" x1="${L}" x2="${L + size}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="dv-tick" x="${L - 5}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(fmt(t, ''))}</text>`);
      o.push(ticksOf(sc, X, top + T + size + 15, { wide: W }));
      o.push(`<text class="dv-axis" x="${L + size}" y="${top + T + size + 30}" text-anchor="end">${esc(`flat (XY), ${unit}${sc.log ? ', log' : ''}`)}</text><text class="dv-axis" x="${L + 4}" y="${top + T + 12}">${esc('across (Z)')}</text>`);
      // Rays of equal share: Z = r × XY.
      const rayLabels = [];
      const ray = (r, cls, label) => {
        const lo = Math.max(sc.from, sc.from / r) || 0.0001, hi = Math.min(sc.hi, sc.hi / r);
        if (!(hi > lo)) return '';
        const x1 = X(sc.log ? lo : Math.max(lo, 0)), y1 = Y(r * (sc.log ? lo : Math.max(lo, 0))), x2 = X(hi), y2 = Y(r * hi);
        // A ray's label at its end, left out where it would sit on the one above.
        const clear = label && rayLabels.every((y0) => Math.abs(y0 - y2) > 12);
        if (clear) rayLabels.push(y2);
        const lab = clear ? `<text class="dv-raylab" x="${(x2 + 3).toFixed(1)}" y="${(y2 + 4).toFixed(1)}">${esc(label)}</text>` : '';
        return `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>${lab}`;
      };
      for (const r of [1, 0.75, 0.5, 0.25]) o.push(ray(r, 'dv-ray', pct(r)));
      if (own) o.push(ray(own.share, 'dv-ray--own', ''));
      for (const p of pairs) {
        const name = F.productNameOrId(p.g);
        o.push(productMark(p.marks.filter((k) => k === 'annealed'), X(p.xy.v.value), Y(p.z.v.value), ` data-grade="${esc(p.g.id)}"${tipAttr(`${name}: ${fu(p.xy.v.value, unit)} flat, ${fu(p.z.v.value, unit)} across the layers, ${pct(p.ratio)}`)}`, 3.6));
      }
    } else if (any) {
      o.push(`<rect class="dv-empty" x="${L}" y="${top + T}" width="${side}" height="${side}" rx="4"/><text class="dv-none" x="${L + side / 2}" y="${top + T + side / 2}" text-anchor="middle">${esc(`No ${nameOf(m)} product`)}</text><text class="dv-none" x="${L + side / 2}" y="${top + T + side / 2 + 16}" text-anchor="middle">publishes both</text>`);
    }
    // The share each alternative keeps, on one 0 to 120 % strip, this material first.
    const sy = any ? top + T + side + 46 : top + 22;
    const SX = (r) => L + (Math.min(r, 1.2) / 1.2) * side;
    o.push(`<line class="dv-base" x1="${L}" x2="${L + side}" y1="${sy}" y2="${sy}"/>${[0, 0.5, 1].map((r) => `<line class="dv-grid" x1="${SX(r)}" x2="${SX(r)}" y1="${sy - 8}" y2="${sy + 3}"/><text class="dv-tick" x="${SX(r)}" y="${sy + 14}" text-anchor="middle">${pct(r)}</text>`).join('')}`);
    for (const { p, s } of others) o.push(`<line class="dv-peer" x1="${SX(s.share).toFixed(1)}" x2="${SX(s.share).toFixed(1)}" y1="${sy - 9}" y2="${sy}" data-mat="${esc(p.id)}"${tipAttr(`${nameOf(p)}: Z keeps ${pct(s.share)} of XY, median of ${plural(s.n, 'product')}`)}/>`);
    if (own) o.push(`<circle class="dv-selfdot" cx="${SX(own.share).toFixed(1)}" cy="${sy - 4}" r="4.5"${tipAttr(`${nameOf(m)}: ${pct(own.share)}`)}/>`);
    const list = [...(own ? [{ name: nameOf(m), share: own.share, self: true }] : []), ...others.map(({ p, s }) => ({ name: nameOf(p), share: s.share }))].sort((x, y2) => y2.share - x.share);
    const lines = [];
    let line = '';
    for (const it of list) {
      const t = `${it.name} ${pct(it.share)}`;
      if (px(line + t, 11) > pw - 6 && line) { lines.push(line); line = ''; }
      line += `${line ? ' · ' : ''}${it.self ? `<tspan class="dv-b">${esc(t)}</tspan>` : esc(t)}`;
    }
    if (line) lines.push(line);
    if (!list.length) lines.push('No alternative publishes both either');
    o.push(`<text class="dv-rowsub" x="0" y="${sy + 32}">Share kept by the alternatives:</text>${lines.map((t, i) => `<text class="dv-list" x="0" y="${sy + 47 + i * 14}">${t}</text>`).join('')}`);
    panels.push({ svg: o.join(''), h: sy + 50 + lines.length * 14 });
  }
  const h = Math.max(...panels.map((p) => p.h));
  const svg = `<svg class="dv" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc('Each product\'s value across the layers (Z) against its value printed flat (XY), with rays of equal share, and the median share the alternatives keep.')}">${panels.map((p, i) => `<g transform="translate(${i * (pw + 31)},0)">${p.svg}</g>`).join('')}</svg>`;
  const title = lead ? `Across the layers, ${nameOf(m)} keeps ${pct(lead.own.share)} of its flat ${lead.title.toLowerCase()} (median of ${plural(lead.own.n, 'product')})`
    : `No ${nameOf(m)} product publishes values across the layers; its alternatives keep these shares`;
  return { title, svg };
}

// ------------------------------------------------------------------ Figure 5: every temperature on one axis

function figTemperatures(m, c) {
  const prods = S.productsOf(c);
  const pw = Object.fromEntries(['nozzle', 'bed', 'chamber'].map((a) => [a, S.printWindows(prods, a)]));
  const dry = S.dryingStats(prods);
  const ladder = S.heatLadder(m, c, ['Vicat softening temperature', 'Melting temperature']);
  const vals = [];
  for (const a of Object.values(pw)) for (const w of a.windows) vals.push(w.min, w.max);
  for (const e of dry.entries) vals.push(e.value);
  for (const r of ladder) vals.push(r.summary.min, r.summary.max);
  for (const a of ['nozzle', 'bed', 'chamber']) if (pw[a].windows.length && limitOnScale(pw[a].limit, pw[a].windows.flatMap((w) => [w.min, w.max]))) vals.push(pw[a].limit);
  const sc = stripScale(vals, '°C');
  const labelW = 236, trackW = W - labelW - 6;
  const X = (v) => labelW + (sc.pct(v) / 100) * trackW;
  const ROW = 34;
  const o = [];
  let y = 0;
  const rowsTop = 22;
  const group = (t) => { o.push(`<text class="dv-group" x="0" y="${y + 15}">${esc(t)}</text>`); y += 24; };
  const label = (t, sub) => o.push(`<text class="dv-rowlab" x="0" y="${y + 14}">${esc(t)}</text>${sub ? `<text class="dv-rowsub" x="0" y="${y + 28}">${esc(sub)}</text>` : ''}`);
  const gridTop = y;
  group('Printing it on the H2C');
  const words = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Heated chamber' };
  for (const a of ['nozzle', 'bed', 'chamber']) {
    const p = pw[a];
    const mid = y + ROW / 2;
    if (p.n) {
      // Each degree shaded by the share of the counted products that accept it (one hue, light to dark).
      for (const r of p.runs) if (r.k) o.push(`<rect class="dv-acc" x="${X(r.from - 0.5).toFixed(1)}" y="${mid - 8}" width="${Math.max(X(r.to + 0.5) - X(r.from - 0.5), 0.6).toFixed(1)}" height="16" style="opacity:${(0.12 + 0.88 * (r.k / p.n)).toFixed(2)}"${tipAttr(`${words[a]}: ${r.from === r.to ? `${r.from} °C` : `${r.from}–${r.to} °C`} accepted by ${r.k} of ${plural(p.n, 'product')}`)}/>`);
      // A window that gives one end only ("at least 50 °C"): a hairline from it to the scale's end, no shade.
      for (const e of p.n < 10 ? p.ends : []) {
        const from = e.min ?? sc.from, to = e.max ?? sc.hi;
        o.push(`<line class="dv-oneend" x1="${X(from).toFixed(1)}" x2="${X(to).toFixed(1)}" y1="${mid + 12}" y2="${mid + 12}" data-grade="${esc(e.g.id)}"${tipAttr(`${F.productNameOrId(e.g)}: ${e.min != null ? `at least ${e.min} °C` : `at most ${e.max} °C`}, one end only`)}/><circle class="dv-oneend-dot" cx="${X(e.min ?? e.max).toFixed(1)}" cy="${mid + 12}" r="2.2"/>`);
      }
      // "Most" is said from three windows up; under three, each window is the product's own.
      if (p.most && p.n >= 3) o.push(`<rect class="dv-most" x="${X(p.most.from - 0.5).toFixed(1)}" y="${mid - 10}" width="${(X(p.most.to + 0.5) - X(p.most.from - 0.5)).toFixed(1)}" height="20" rx="2"/>`);
      const noneHere = a === 'chamber' ? (p.states.get('not-required') ?? 0) + (p.states.get('ambient') ?? 0) : 0;
      const ends = `${p.ends.length ? `; ${p.ends.length} give one end` : ''}${noneHere ? `; ${noneHere} need none` : ''}`;
      const said = p.n >= 3 && p.most ? `${span(p.most.from, p.most.to, '°C')}, ${p.every ? 'all' : 'most'} of ${p.n}${ends}` : `${p.n} of ${prods.length} give a window${ends}`;
      label(words[a], said);
    } else {
      const st = [...p.states].sort((x1, x2) => x2[1] - x1[1]);
      const none = (p.states.get('not-required') ?? 0) + (p.states.get('ambient') ?? 0);
      label(words[a], a === 'chamber' && none ? `none needed: ${none} of ${plural(prods.length, 'product')}` : 'no window published');
      if (!(a === 'chamber' && none)) o.push(`<text class="dv-none" x="${labelW + 4}" y="${mid + 4}">No product gives a window</text>`);
    }
    // The H2C's limit on this setting: a line, and the range beyond it washed out.
    const lim = p.limit;
    if (lim != null && lim <= sc.hi) {
      o.push(`<rect class="dv-beyond" x="${X(lim).toFixed(1)}" y="${y + 2}" width="${(labelW + trackW - X(lim)).toFixed(1)}" height="${ROW - 4}"/><line class="dv-limit" x1="${X(lim).toFixed(1)}" x2="${X(lim).toFixed(1)}" y1="${y + 1}" y2="${y + ROW - 1}"/><text class="dv-limlab" x="${(X(lim) + 4).toFixed(1)}" y="${y + 11}">${esc(`H2C max ${lim}`)}</text>`);
    } else if (lim != null && p.n) {
      o.push(`<text class="dv-limlab" x="${labelW + trackW}" y="${y + ROW / 2 + 4}" text-anchor="end">${esc(`H2C ${lim} →`)}</text>`);
    }
    y += ROW;
  }
  // Drying: each product's temperature, the middle half and the median.
  if (dry.entries.length) {
    const mid = y + ROW / 2;
    const t = dry.temps, hrs = dry.hours;
    if (t.q1 != null) o.push(`<rect class="dv-pband" x="${X(t.q1).toFixed(1)}" y="${mid - 9}" width="${Math.max(X(t.q3) - X(t.q1), 2).toFixed(1)}" height="18" rx="2"/>`);
    const seen = new Map();
    for (const e of dry.entries) {
      const k = Math.round(e.value);
      const lv = seen.get(k) ?? 0;
      seen.set(k, lv + 1);
      if (lv > 2) continue;
      const marks = e.variant ? ['variant'] : e.origin === 'guide' ? ['open'] : [];
      o.push(productMark(marks, X(e.value), mid + 4 - lv * 7, ` data-grade="${esc(e.g.id)}"${tipAttr(`${F.productNameOrId(e.g)}: dry at ${fu(e.value, '°C')}${e.hours != null ? ` for ${e.hours} h` : ''}${e.origin === 'guide' ? ' (Bambu Lab\'s guide; not counted)' : e.origin === 'twin' ? ' (a data sheet it shares)' : ''}`)}`, 3.2));
    }
    if (t.n > 1) o.push(`<rect class="dv-self" x="${(X(t.median) - 1.5).toFixed(1)}" y="${mid - 11}" width="3" height="22" rx="1.5"/>`);
    label('Drying', t.n ? `${fu(t.median, '°C')}${hrs?.median != null ? ` for ${fmt(hrs.median, 'h')} h` : ''}, median of ${plural(t.n, 'product')}` : 'from Bambu Lab\'s guide only');
    y += ROW;
  }
  y += 6;
  group('In service, as its products measure it');
  for (const r of ladder) {
    const s = r.summary, mid = y + ROW / 2;
    const k = r.compared ? 'self' : 'peer';
    if (s.min !== s.max) o.push(`<line class="dv-${k}-range" x1="${X(s.min).toFixed(1)}" x2="${X(s.max).toFixed(1)}" y1="${mid}" y2="${mid}"/>`);
    if (s.q1 != null) o.push(`<rect class="dv-${k}-band" x="${X(s.q1).toFixed(1)}" y="${mid - 5}" width="${Math.max(X(s.q3) - X(s.q1), 2).toFixed(1)}" height="10" rx="2"/>`);
    o.push(`<g${tipAttr(`${r.label}: median ${fu(s.median, '°C')}${s.q1 != null ? `, middle half ${span(s.q1, s.q3, '°C')}` : ''}, ${plural(s.n, 'product')}${r.compared ? '' : ', as published under each sheet\'s own test'}`)}><rect class="dv-hit" x="${labelW}" y="${y}" width="${trackW}" height="${ROW}"/><rect class="dv-${k}" x="${(X(s.median) - 1.5).toFixed(1)}" y="${mid - 9}" width="3" height="18" rx="1.5"/></g>`);
    o.push(`<text class="dv-val" x="${(X(s.median) + 6).toFixed(1)}" y="${mid - 6}">${esc(fu(s.median, '°C'))}</text>`);
    label(r.label, `${plural(s.n, 'product')}${r.compared ? '' : ', as published'}`);
    y += ROW;
  }
  for (const t of sc.ticks) o.unshift(`<line class="dv-grid" x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${gridTop + 20}" y2="${y}"/>`);
  o.push(`<line class="dv-base" x1="${labelW}" x2="${labelW + trackW}" y1="${y + 0.5}" y2="${y + 0.5}"/>`);
  o.push(ticksOf(sc, X, y + 15, { wide: W }));
  o.push(`<text class="dv-axis" x="${labelW + trackW}" y="${y + 32}" text-anchor="end">°C</text>`);
  y += 36;
  const nz = pw.nozzle.n >= 3 ? pw.nozzle.most : null, bd = pw.bed.n >= 3 ? pw.bed.most : null;
  const soft = m.headline?.hdt045?.known ? m.headline.hdt045.value : ladder[0]?.summary.median;
  const title = `${nameOf(m)} prints at ${nz ? span(nz.from, nz.to, '°C') : 'a nozzle temperature no sheet agrees on'}${bd ? ` on a ${span(bd.from, bd.to, '°C')} bed` : ''}, and a part softens near ${soft != null ? fu(soft, '°C') : 'a temperature no product publishes'}`;
  return { title, svg: `<svg class="dv" viewBox="0 0 ${W} ${y}" role="img" aria-label="${esc(`Print settings and service temperatures of ${nameOf(m)} on one temperature axis, with the H2C's limits.`)}">${o.join('')}</svg>` };
}

// ------------------------------------------------------------------ the page

const CSS = `
:root { color-scheme: light;
  --bg:#f7f7f5; --surface:#ffffff; --border:#dcdcd6; --ink:#1a1a18; --ink-2:#55554e; --ink-3:#85857c;
  --dv-self:#1d65a3; --dv-claim:#b4540a; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark;
  --bg:#15161a; --surface:#1d1f24; --border:#32353d; --ink:#ecedef; --ink-2:#b4b7bf; --ink-3:#7f838d;
  --dv-self:#3f8fd0; --dv-claim:#d4732f; } }
:root[data-theme="dark"] { color-scheme: dark;
  --bg:#15161a; --surface:#1d1f24; --border:#32353d; --ink:#ecedef; --ink-2:#b4b7bf; --ink-3:#7f838d;
  --dv-self:#3f8fd0; --dv-claim:#d4732f; }
:root {
  --dv-self-band: color-mix(in srgb, var(--dv-self) 30%, var(--bg));
  --dv-self-soft: color-mix(in srgb, var(--dv-self) 8%, var(--bg));
  --dv-peer: var(--ink-2);
  --dv-peer-band: color-mix(in srgb, var(--ink-3) 34%, var(--bg));
  --dv-ctx: color-mix(in srgb, var(--ink-3) 48%, var(--bg));
  --dv-grid: color-mix(in srgb, var(--ink-3) 20%, var(--bg));
  --dv-beyond: color-mix(in srgb, var(--ink-3) 13%, var(--bg));
  --dv-fade: .18;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 "Inter", -apple-system, system-ui, sans-serif; }
main { max-width: 968px; margin: 0 auto; padding: 32px 24px 80px; }
.proto { font-size: 12.5px; color: var(--ink-3); border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 28px; }
h1 { font-size: 34px; letter-spacing: -.01em; margin: 0 0 4px; }
.lede { color: var(--ink-2); margin: 0 0 28px; }
figure { margin: 0 0 56px; padding-top: 18px; border-top: 1px solid var(--border); }
.fig-n { font-size: 12.5px; color: var(--ink-3); margin: 0; }
.fig-title { font-size: 19px; font-weight: 600; line-height: 1.3; margin: 2px 0 6px; max-width: 46rem; }
.fig-q { font-size: 13px; color: var(--ink-3); margin: 0 0 14px; }
.key { display: flex; flex-wrap: wrap; gap: 4px 18px; margin: 0 0 12px; padding: 0; list-style: none; font-size: 12.5px; color: var(--ink-2); }
.key li { display: flex; align-items: center; gap: 6px; }
.key svg { overflow: visible; }
figcaption { font-size: 13px; color: var(--ink-2); margin-top: 10px; max-width: 46rem; }
svg.dv { width: 100%; height: auto; display: block; overflow: visible; font-family: inherit; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
@media (max-width: 720px) { .pair { grid-template-columns: 1fr; } }
details.twin { margin-top: 10px; font-size: 13px; }
details.twin summary { cursor: pointer; color: var(--ink-2); }
details.twin table { border-collapse: collapse; margin-top: 8px; font-variant-numeric: tabular-nums; }
details.twin th, details.twin td { text-align: right; padding: 4px 10px; border-bottom: 1px solid var(--border); font-weight: 400; }
details.twin th:first-child, details.twin tbody th { text-align: left; font-weight: 600; }
.note { color: var(--ink-3); }
/* marks */
.dv text { fill: var(--ink-2); font-size: 12px; }
.dv .dv-colhead { fill: var(--ink); font-weight: 600; font-size: 12.5px; }
.dv .dv-colsub, .dv .dv-rowsub { fill: var(--ink-3); font-size: 11px; }
.dv .dv-rowlab { fill: var(--ink); font-size: 12.5px; font-weight: 500; }
.dv .dv-rowlab--self { font-weight: 700; }
.dv a .dv-rowlab, .dv a tspan { fill: var(--ink); text-decoration: underline; text-decoration-color: var(--border); }
.dv .dv-group { fill: var(--ink-3); font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
.dv .dv-tick { fill: var(--ink-3); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.dv .dv-axis { fill: var(--ink-3); font-size: 11px; }
.dv .dv-val { fill: var(--ink); font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dv .dv-none { fill: var(--ink-3); font-size: 11.5px; }
.dv .dv-list { fill: var(--ink-2); font-size: 11px; }
.dv .dv-b { fill: var(--ink); font-weight: 700; }
.dv .dv-call { fill: var(--ink-2); font-size: 11px; }
.dv .dv-rugn { fill: var(--ink-3); font-size: 10px; }
.dv .dv-maplab { fill: var(--ink-2); font-size: 11.5px; paint-order: stroke; stroke: var(--bg); stroke-width: 3px; stroke-linejoin: round; }
.dv .dv-maplab--self { fill: var(--ink); font-weight: 700; font-size: 12.5px; }
.dv .dv-limlab { fill: var(--ink); font-size: 10.5px; font-weight: 500; }
.dv .dv-raylab { fill: var(--ink-3); font-size: 10px; }
.dv-grid { stroke: var(--dv-grid); stroke-width: 1; }
.dv-base { stroke: var(--border); stroke-width: 1; }
.dv-hit { fill: transparent; }
.dv-selfrow { fill: var(--dv-self-soft); }
.dv-selfkey { fill: var(--dv-self); }
.dv-self { fill: var(--dv-self); stroke: var(--dv-self); }
.dv-self-band { fill: var(--dv-self-band); }
.dv-self-range { stroke: var(--dv-self); stroke-width: 1.25; }
.dv-peer { fill: var(--dv-peer); stroke: var(--dv-peer); stroke-width: 2; }
.dv-peer-band { fill: var(--dv-peer-band); }
.dv-peer-range { stroke: var(--ink-3); stroke-width: 1; }
.dv-open { fill: var(--bg); stroke: var(--dv-self); stroke-width: 1.75; }
.dv-open-line { stroke: var(--dv-self); stroke-width: 1; }
.dv-open--peer { stroke: var(--ink-3); }
.dv-open-line--peer { stroke: var(--ink-3); }
.dv-guide { stroke: var(--dv-self); stroke-width: 1; opacity: .35; }
.dv-rug { stroke: var(--dv-ctx); stroke-width: 1.25; }
.dv-rug--self { stroke: var(--dv-self); stroke-width: 2.5; }
.dv-ctx { fill: var(--dv-ctx); }
.dv-peerdot { fill: var(--dv-peer); stroke: var(--bg); stroke-width: 2; }
.dv-selfprod { fill: var(--dv-self); opacity: .38; }
.dv-selfdot { fill: var(--dv-self); stroke: var(--bg); stroke-width: 2; }
.dv-selfopen { fill: var(--bg); stroke: var(--dv-self); stroke-width: 2.25; }
.dv-cross { stroke: var(--dv-self); stroke-width: 2; stroke-linecap: round; }
.dv-pband { fill: var(--dv-self-soft); stroke: color-mix(in srgb, var(--dv-self) 25%, var(--bg)); stroke-width: 1; }
.dv-pmed { stroke: var(--ink-2); stroke-width: 1.5; }
.dv-p { fill: var(--dv-self); stroke: var(--bg); stroke-width: 1.5; }
.dv-p--open { fill: var(--bg); stroke: var(--ink-3); stroke-width: 1.4; }
.dv-p--variant { fill: var(--bg); stroke: var(--ink-3); stroke-width: 1.5; }
.dv-p--claimed { fill: var(--dv-claim); }
.dv-p--claimed.dv-p--open { fill: var(--bg); stroke: var(--dv-claim); }
.dv-ray { stroke: var(--dv-grid); stroke-width: 1.25; }
.dv-ray--own { stroke: var(--dv-self); stroke-width: 1.5; opacity: .55; }
.dv-empty { fill: none; stroke: var(--border); }
.dv-acc { fill: var(--dv-self); }
.dv-most { fill: none; stroke: var(--ink); stroke-width: 1.25; }
.dv-limit { stroke: var(--ink); stroke-width: 1.5; }
.dv-oneend { stroke: var(--dv-self); stroke-width: 1.25; opacity: .6; }
.dv-oneend-dot { fill: var(--dv-self); }
.dv-beyond { fill: var(--dv-beyond); }
/* linking: a lit product or material keeps its tone, the rest fade */
body.lit .dv [data-grade]:not(.on), body.litm .dv [data-mat]:not(.on) { opacity: var(--dv-fade); }
.dv .on { opacity: 1 !important; }
#tip { position: fixed; pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--border); border-radius: 6px; padding: 6px 9px; font-size: 12.5px; max-width: 320px; box-shadow: 0 2px 8px rgba(0,0,0,.12); z-index: 9; }
`;

const SCRIPT = `
(function () {
  var tip = document.getElementById('tip'), lit = null;
  function light(attr, v) {
    document.body.classList.remove('lit', 'litm');
    document.querySelectorAll('.dv .on').forEach(function (n) { n.classList.remove('on'); });
    if (!v) return;
    document.body.classList.add(attr === 'data-grade' ? 'lit' : 'litm');
    document.querySelectorAll('.dv [' + attr + '="' + v + '"]').forEach(function (n) { n.classList.add('on'); });
  }
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; if (lit) { light(null); lit = null; } return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    var x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8), y = e.clientY + 16;
    if (y + tip.offsetHeight > innerHeight - 8) y = e.clientY - tip.offsetHeight - 10;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    var g = t.getAttribute('data-grade') || t.closest('[data-grade]')?.getAttribute('data-grade');
    var mm = t.getAttribute('data-mat');
    var key = g ? 'g' + g : mm ? 'm' + mm : null;
    if (key !== lit) { lit = key; light(g ? 'data-grade' : 'data-mat', g || mm); }
  });
})();`;

const keySvg = (inner, w = 16) => `<svg width="${w}" height="14" aria-hidden="true">${inner}</svg>`;

function page(id) {
  const m = byId.get(id);
  const c = F.materialContext(db, id, { showEstimates: true });
  const peers = peerSet(m);
  const f1 = figPeers(m, peers), f2 = figMaps(m, peers), f3 = figProducts(m, c), f4 = figLayers(m, c, peers), f5 = figTemperatures(m, c);
  const font = readFileSync(`${ROOT}/app/pages/assets/fonts/Inter-Variable.subset.woff2`).toString('base64');
  const release = db.meta.release?.id ?? 'unidentified';
  const fig = (n, f, q, key, cap, extra = '') => `<figure id="f${n}"><p class="fig-n">Figure ${n}</p><h3 class="fig-title">${esc(f.title)}</h3><p class="fig-q">${esc(q)}</p>${key}${f.svg}<figcaption>${cap}</figcaption>${extra}</figure>`;
  const k1 = `<ul class="key"><li>${keySvg('<rect x="1" y="2" width="14" height="10" rx="2" style="fill:var(--dv-self-band)"/><rect x="6.5" y="0" width="3" height="14" rx="1.5" style="fill:var(--dv-self)"/>')}${esc(nameOf(m))}: median and middle half of its products</li><li>${keySvg('<rect x="1" y="2" width="14" height="10" rx="2" style="fill:var(--dv-peer-band)"/><rect x="6.5" y="0" width="3" height="14" rx="1.5" style="fill:var(--dv-peer)"/>')}an alternative</li><li>${keySvg('<line x1="1" x2="15" y1="7" y2="7" style="stroke:var(--ink-3)"/>')}lowest to highest</li><li>${keySvg('<circle cx="8" cy="7" r="4.2" class="dv-open" style="fill:var(--bg);stroke:var(--dv-self);stroke-width:1.75"/>')}as published, orientation not stated</li></ul>`;
  const k3 = `<ul class="key"><li>${keySvg('<circle cx="8" cy="7" r="3.6" style="fill:var(--dv-self)"/>')}a product's value, compared</li><li>${keySvg('<circle cx="8" cy="7" r="3.6" style="fill:var(--bg);stroke:var(--ink-3);stroke-width:1.4"/>')}orientation not stated, not compared</li><li>${keySvg('<rect x="4.4" y="3.4" width="7.2" height="7.2" rx="1" style="fill:var(--dv-self)"/>')}annealed</li><li>${keySvg('<path d="M8 2.4L12.6 7L8 11.6L3.4 7Z" style="fill:var(--bg);stroke:var(--ink-3);stroke-width:1.5"/>')}special formulation, not in the median</li><li>${keySvg('<circle cx="8" cy="7" r="3.6" style="fill:var(--dv-claim)"/>')}sold as toughened</li><li>${keySvg('<rect x="1" y="1" width="14" height="12" rx="2" style="fill:var(--dv-self-soft);stroke:color-mix(in srgb, var(--dv-self) 25%, var(--bg))"/><line x1="8" x2="8" y1="0" y2="14" style="stroke:var(--ink-2);stroke-width:1.5"/>')}middle half and median of those compared</li></ul>`;
  const k5 = `<ul class="key"><li>${keySvg('<rect x="0" y="3" width="4" height="8" style="fill:var(--dv-self);opacity:.2"/><rect x="4" y="3" width="4" height="8" style="fill:var(--dv-self);opacity:.55"/><rect x="8" y="3" width="8" height="8" style="fill:var(--dv-self)"/>', 16)}share of the products that accept each temperature</li><li>${keySvg('<rect x="1" y="2" width="14" height="10" rx="2" style="fill:none;stroke:var(--ink);stroke-width:1.25"/>')}more than half accept</li><li>${keySvg('<rect x="8" y="0" width="8" height="14" style="fill:var(--dv-beyond)"/><line x1="8" x2="8" y1="0" y2="14" style="stroke:var(--ink);stroke-width:1.5"/>')}beyond the H2C's limit</li><li>${keySvg('<rect x="1" y="2" width="14" height="10" rx="2" style="fill:var(--dv-peer-band)"/><rect x="6.5" y="0" width="3" height="14" rx="1.5" style="fill:var(--dv-peer)"/>')}as published, each sheet's own test</li></ul>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(nameOf(m))} figures, proposed</title><style>@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${font}) format("woff2");}${CSS}</style></head>
<body><main>
<p class="proto">Prototype of the proposed figures (docs/audits/2026-10-17-pages-reimagined/dataviz/PROPOSAL.md), drawn from dist/db.json release <span>${esc(release)}</span> through the facts layer. Real data; hover a mark for its value; a product or a material lights across every figure.</p>
<h1>${esc(nameOf(m))}</h1><p class="lede">${esc(`${plural(S.productsOf(c).length, 'product')} from ${plural(new Set(S.productsOf(c).map((g) => g.manufacturer)).size, 'maker')}. Alternatives by rule: ${andList(peers.map(nameOf))}.`)}</p>
${fig(1, f1, 'How does it compare with the materials an engineer would weigh it against, and where do those sit among all materials?', k1,
    `Each row is a material; each column one property on its own scale. The bar is the middle half of a material's products, the tick their median, the hairline their lowest to highest; no bar under four products. The ticks above the rows are every material's median, counted at the ends where they lie off the scale. Alternatives are chosen by rule (the same polymer filled or not, then the most documented materials of about the same heat resistance and one step above). Names link to their pages.`, f1.tbl)}
${fig(2, f2, 'Where does it sit in the whole landscape, for stiffness against strength and for heat resistance against price?', '',
    `Grey points are every other material's medians; the frames are the same on every material page, so a reader learns them once. The alternatives are named. ${esc(nameOf(m))}: its median, the middle half of its products as a cross, and each product (pale) where it publishes both values.`)}
${fig(3, f3, 'How do its products spread, and which stand out?', k3,
    `One dot per product, on each property's own scale; the lowest and highest compared products are named. Hover a dot to light that product in every row and figure. Every value with its document and conditions is on the records page.`)}
${fig(4, f4, 'What does a part lose across the layers (Z) against flat (XY), and how does that compare?', `<ul class="key"><li>${keySvg('<circle cx="8" cy="7" r="3.6" style="fill:var(--dv-self)"/>')}a product that publishes both, from one sheet</li><li>${keySvg('<line x1="1" x2="15" y1="12" y2="2" style="stroke:var(--dv-grid);stroke-width:1.25"/>')}equal share: 100, 75, 50, 25 %</li><li>${keySvg('<line x1="1" x2="15" y1="12" y2="2" style="stroke:var(--dv-self);stroke-width:1.5;opacity:.55"/>')}${esc(nameOf(m))}'s median share</li></ul>`,
    `A point below the 100 % ray keeps less across the layers than flat; its distance below is the loss. Under each plot, the median share the alternatives' products keep.`)}
${fig(5, f5, 'What does printing it on the H2C take, and how hot can a part get?', k5,
    `One temperature axis for the settings a print needs and the temperatures a part meets. A setting's shade is how many of the products whose sheets give a window accept that temperature; the outlined span is what more than half accept. The H2C's limits close each setting's row.`)}
</main><div id="tip" hidden></div><script>${SCRIPT}</script></body></html>`;
  writeFileSync(`${HERE}/${id}.html`, html);
  return { id, peers: peers.map((p) => `${p.id} ${nameOf(p)}`), titles: [f1.title, f2.title, f3.title, f4.title, f5.title], bytes: html.length };
}

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : ['M001', 'M110']) console.log(JSON.stringify(page(id), null, 1));
