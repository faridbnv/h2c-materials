// Figure "Against its alternatives": a row per material (this one first, then its five alternatives, material-stats.js
// peerSet), a column per key property on its own scale (figures.js PEER_COLUMNS). A cell is the material's products'
// lowest to highest (a hairline), middle half (a bar, from four products) and median (a tick), this material in the
// accent with its median printed, the alternatives in grey; a material that publishes the property only with no stated
// orientation shows hollow circles at those values. Above the rows, a rug of every material's median (material-facts.js
// rankTable), this one's in the accent, those off the scale counted at its ends. Names link to the alternatives' pages.
//
// Each column is its own SVG, x in per cent of the column, rows at fixed px heights matching the names column, so the
// figure is fluid; under 720 px it scrolls sideways inside its box with the names held at the left (figures.src.css).

import type { Loose } from '../loose.ts';

import { esc, pct, fmtDisplay, NBSP, beyond, headline, shortName, withUnit, spanUnit, products, andList, orList, inText, figContext, gridLines, edgeMark, tickLabels, KEY, keyOf, twinTable } from './kit.ts';
import { figFrame } from './figure.ts';
import { materialCell, peerContrast, propertyScale, isFlexible, compareMedians } from '../facts/material-stats.ts';
import { spanDisplay } from '../numbers.ts';
import { boundSign } from '../facts/format.ts';
import { PEER_COLUMNS } from '../figures.ts';

export const ROW = 34;
const RUG = 26;

/**
 * A key property's scale on this page: the property's own, the same on every page of the material's kind
 * (material-stats.js propertyScale), so a column, a key figure's small drawing and the next page's agree.
 */
export const columnScale = (c: Loose, key: Loose) => { const k = figContext(c); return propertyScale(k.db, k.ranks, key, isFlexible(c.m)); };

/** The cells of every row for one key, this material first. */
export const columnCells = (rows: Loose, key: Loose) => rows.map((r: Loose) => materialCell(r, key));

/**
 * A cell's marks on scale `sc`: the hairline, the band and the median tick, each held inside the scale; an end beyond it
 * a chevron at the edge, the median beyond it a chevron in the tick's place. `k` 'self' or 'peer'; `h` the headline.
 * Also the key figures' small drawing's (mini.js).
 */
export function cellMarks(cell: Loose, sc: Loose, y: Loose, k: Loose, { tick = 18, band = 10, label = null }: Loose = {}) {
  const X = (v: Loose) => sc.pct(v);
  const o: Loose[] = [];
  if (cell.kind === 'open') {
    if (cell.min !== cell.max) o.push(`<line class="dv-open-line" x1="${pct(X(cell.min))}" x2="${pct(X(cell.max))}" y1="${y}" y2="${y}"/>`);
    for (const v of new Set([cell.min, cell.max])) {
      const b = beyond(sc, v);
      o.push(b ? edgeMark(b, b < 0 ? 0 : 100, y, `dv-open-chev`) : `<circle class="dv-open" cx="${pct(X(v))}" cy="${y}" r="${band > 8 ? 4 : 3.6}"/>`);
    }
    if (label) o.push(valueLabel(X(cell.max), y, label, tick));
    return o.join('');
  }
  if (cell.min !== cell.max) {
    o.push(`<line class="dv-${k}-range" x1="${pct(X(cell.min))}" x2="${pct(X(cell.max))}" y1="${y}" y2="${y}"/>`);
    for (const v of [cell.min, cell.max]) { const b = beyond(sc, v); if (b && v !== cell.median) o.push(edgeMark(b, b < 0 ? 0 : 100, y, `dv-${k}-chev`)); }
  }
  if (cell.q1 != null && cell.q3 != null && !(beyond(sc, cell.q1) === beyond(sc, cell.q3) && beyond(sc, cell.q1) !== 0)) {
    o.push(`<rect class="dv-${k}-band" x="${pct(X(cell.q1))}" y="${y - band / 2}" width="${pct(Math.max(X(cell.q3) - X(cell.q1), 0.8))}" height="${band}" rx="2"/>`);
  }
  const b = beyond(sc, cell.median);
  o.push(b ? edgeMark(b, b < 0 ? 0 : 100, y, `dv-${k}-chev dv-chev--big`)
    : `<svg x="${pct(X(cell.median))}" y="${y}" overflow="visible"><rect class="dv-${k}" x="-1.5" y="${-tick / 2}" width="3" height="${tick}" rx="1.5"/></svg>`);
  if (label) o.push(valueLabel(X(cell.median), y, label, tick));
  return o.join('');
}

function cellSvg(r: Loose, c: Loose, h: Loose, sc: Loose, y: Loose, self: Loose) {
  const k = self ? 'self' : 'peer';
  const hooks = (v: Loose, t: Loose) => ` data-mat="${esc(r.id)}" data-key="${esc(h.key)}" data-v="${v}" data-name="${esc(shortName(r))}" data-t="${esc(t)}"`;
  if (c.kind === 'open') {
    const t = `${spanUnit(c.min, c.max, h.unit)} from ${products(c.n)}, set apart: test bar not described as printed, or no stated load`;
    return `<g class="pe-cell cx dv-${k}-open"${hooks(c.max, t)} data-kind="as-published">${cellMarks(c, sc, y, k, { label: self ? fmtDisplay(c.max, h.unit) : null })}</g>`;
  }
  // A median that is a published bound keeps its sign, as the key properties print it (PEI-CF's HDT "> 200", C14).
  const sign = boundSign(r.headline?.[h.key]);
  const t = `median ${sign}${withUnit(c.median, h.unit)}${c.q1 != null ? `, middle half ${spanUnit(c.q1, c.q3, h.unit)}` : ''}${c.min !== c.max ? `, lowest to highest ${spanUnit(c.min, c.max, h.unit)}` : ''}, ${products(c.n)}`;
  return `<g class="pe-cell cx"${hooks(c.median, t)} data-kind="compared">${cellMarks(c, sc, y, k, { label: self ? `${sign}${fmtDisplay(c.median, h.unit)}` : null })}</g>`;
}

/** This material's value over its mark, kept inside the column near its ends. */
function valueLabel(at: Loose, y: Loose, t: Loose, tick = 18) {
  const anchor = at < 12 ? 'start' : at > 88 ? 'end' : 'middle';
  return `<text class="dv-val" x="${pct(at)}" y="${y - tick / 2 - 3}" dx="${anchor === 'start' ? -2 : anchor === 'end' ? 2 : 0}" text-anchor="${anchor}">${esc(t)}</text>`;
}

// How a property's difference is said, by key: [higher, lower]; HDT is said as a difference in °C.
const CONTRAST: Record<string, Loose> = {
  tensileModulusXY: ['is stiffer', 'is less stiff'],
  tensileStrengthXY: ['is stronger flat', 'is weaker flat'],
  tensileStrengthZ: ['is stronger across the layers', 'is weaker across the layers'],
  charpyNotched: ['is tougher in notched Charpy', 'is less tough in notched Charpy'],
  priceCADkg: ['costs more', 'costs less'],
};

/**
 * Where no property leads or trails by the margin, the finding the medians support (material-stats.js compareMedians,
 * 5 % or 3 °C apart): the property on which this material differs from most of its alternatives in one direction, and
 * the strongest in the other, e.g. "PLA is stiffer than PETG and ABS but softens 15–40 °C lower". A description, never a
 * verdict; null where nothing differs from at least two alternatives.
 */
function contrastTitle(m: Loose, peers: Loose, keys: Loose): Loose {
  const name = shortName(m);
  const per = keys.map((key: Loose) => {
    const rows = peers.map((p: Loose) => ({ p, c: compareMedians(m, p, [key])[0] })).filter((x: Loose) => x.c);
    const diff = rows.filter((x: Loose) => !x.c.same);
    return { key, n: rows.length, up: diff.filter((x: Loose) => x.c.value > 0), down: diff.filter((x: Loose) => x.c.value < 0) };
  }).filter((x: Loose) => x.key === 'hdt045' || CONTRAST[x.key]);
  const strength = (xs: Loose) => xs.length * 10 + xs.reduce((t: Loose, x: Loose) => t + Math.abs(x.c.kind === 'diff' ? x.c.value / 50 : x.c.value), 0) / Math.max(1, xs.length);
  const pick = (dir: Loose, not?: Loose) => per.filter((x: Loose) => x !== not && x[dir].length >= 2 && x[dir].length * 2 >= x.n).sort((a: Loose, b: Loose) => strength(b[dir]) - strength(a[dir]))[0] ?? null;
  const pos = pick('up'), neg = pick('down', pos);
  const clause = (x: Loose, dir: Loose, names: Loose) => {
    const xs = x[dir];
    const than = names ? ` than ${andList(xs.slice(0, 3).map((r: Loose) => shortName(r.p)))}${xs.length > 3 ? ' and others' : ''}` : '';
    if (x.key === 'hdt045') { const d = xs.map((r: Loose) => Math.abs(r.c.value)); return `softens ${spanUnit(Math.min(...d), Math.max(...d), '°C')} ${dir === 'up' ? 'higher' : 'lower'}${than}`; }
    return `${CONTRAST[x.key][dir === 'up' ? 0 : 1]}${than}`;
  };
  // The second clause names its own alternatives unless they are the first's: "stronger than PLA-CF, PLA-GF and ABS"
  // did not soften lower than PLA-CF (56 °C against 55), and the title said it did (the final review).
  const same = (a: Loose, b: Loose) => a.length === b.length && a.every((x: Loose) => b.some((y: Loose) => y.p.id === x.p.id));
  if (pos && neg) return `${name} ${clause(pos, 'up', true)} but ${clause(neg, 'down', !same(pos.up, neg.down))}`;
  if (pos) return `${name} ${clause(pos, 'up', true)}`;
  if (neg) return `${name} ${clause(neg, 'down', true)}`;
  return null;
}

export function peersFigure(c: Loose, env: Loose = {}, opts: Loose = {}): Loose {
  const k = figContext(c, env);
  const m = c.m;
  const peers = k.peers;
  const empty = { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  if (!peers.length) return empty;
  const rows = [m, ...peers];
  const cols = PEER_COLUMNS.map((col) => ({ ...col, h: headline(col.key) })).filter((col) => col.h)
    .map((col) => ({ ...col, cells: columnCells(rows, col.key), sc: columnScale(c, col.key) })).filter((col) => col.sc && col.cells.some(Boolean));
  if (!cols.length || !cols.some((col) => col.cells[0])) return empty;
  const H = RUG + rows.length * ROW + 20;
  let marks = 0, clipped = false;
  const svgs = cols.map((col) => {
    const h = col.h, sc = col.sc;
    const X = (v: Loose) => sc.pct(v);
    // This material's row, banded in the accent's tint; the gridlines at the scale's ticks.
    const o = [`<rect class="pe-selfband" x="0" y="${RUG}" width="100%" height="${ROW}"/>`, gridLines(sc, 4, H - 20)];
    // The rug: every material's median on the scale, one path in a 0–100 box stretched to the column; those beyond it
    // counted in words at its ends; this material's own tick drawn apart, in the accent.
    let below = 0, above = 0, ownAt: Loose = null;
    const ticks: Loose[] = [];
    for (const e of k.ranks[col.key]?.entries ?? []) {
      const b = beyond(sc, e.value);
      if (b < 0) { below++; continue; }
      if (b > 0) { above++; continue; }
      if (e.id === m.id) { ownAt = X(e.value); continue; }
      ticks.push(`M${X(e.value).toFixed(2)} 7V19`);
    }
    o.push(`<svg x="0" y="0" width="100%" height="${RUG}" viewBox="0 0 100 ${RUG}" preserveAspectRatio="none"><path class="dv-rug" d="${ticks.join('')}" vector-effect="non-scaling-stroke"/></svg>`);
    if (ownAt != null) o.push(`<line class="dv-rug--self" x1="${pct(ownAt)}" x2="${pct(ownAt)}" y1="4" y2="22"/>`);
    if (below) o.push(`<text class="dv-rugn" x="0" y="3" dy="-2">${below}${NBSP}below</text>`);
    if (above) o.push(`<text class="dv-rugn" x="100%" y="3" dy="-2" text-anchor="end">${above}${NBSP}above</text>`);
    const own = col.cells[0];
    if (own?.kind === 'compared' && !beyond(sc, own.median)) o.push(`<line class="dv-guide" x1="${pct(X(own.median))}" x2="${pct(X(own.median))}" y1="${RUG}" y2="${H - 20}"/>`);
    col.cells.forEach((cell: Loose, i: Loose) => {
      const y = RUG + i * ROW + ROW / 2;
      if (!cell) { o.push(`<text class="dv-none" x="50%" y="${y + 4}" text-anchor="middle">—</text>`); return; }
      marks++;
      if ([cell.min, cell.max, cell.median].some((v) => v != null && beyond(sc, v))) clipped = true;
      o.push(cellSvg(rows[i], cell, h, sc, y, i === 0));
    });
    o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${H - 19.5}" y2="${H - 19.5}"/>`);
    o.push(`<g class="dv-ticks">${tickLabels(sc, H - 6, { wide: 110, narrow: 110 })}</g>`);
    return `<div class="pe-col" data-key="${esc(col.key)}"><div class="pe-h"><b>${esc(col.title)}</b><span>${esc(`${col.sub}${sc.log ? ', log scale' : ''}`)}</span></div>`
      + `<svg class="pe-svg" width="100%" height="${H}" aria-hidden="true" focusable="false">${o.join('')}</svg></div>`;
  });
  const names = `<div class="pe-names"><div class="pe-h"></div><div class="pe-rugname">All materials</div>`
    + rows.map((r, i) => {
      const self = i === 0;
      const href = self ? null : k.hrefOf(r);
      const name = href ? `<a href="${esc(href)}">${esc(shortName(r))}</a>` : esc(shortName(r));
      return `<div class="pe-name${self ? ' pe-name--self' : ''}" data-mat="${esc(r.id)}" data-name="${esc(shortName(r))}"${self ? ' data-self=""' : ' data-alt="1"'}>${name}<span>${esc(products(r.gradeIds.length))}</span></div>`;
    }).join('') + '</div>';
  const plot = `<p class="pe-cue" aria-hidden="true">Scroll sideways for every column →</p><div class="pe-wrap"><div class="pe" style="--rows:${rows.length};--cols:${cols.length}">${names}${svgs.join('')}</div></div>`;

  // The finding: where this material leads or trails its alternatives by a clear margin.
  const said = peerContrast(m, peers, cols.map((col) => col.key));
  const words = (keys: Loose) => andList(keys.map((key: Loose) => inText(headline(key)).replace(/ \(XY\)$/, '')));
  const parts = [said.high.length ? `the highest ${words(said.high)}` : '', said.low.length ? `the lowest ${words(said.low)}` : ''].filter(Boolean);
  const name = shortName(m);
  const title = parts.length ? `Against its alternatives, ${name} has ${parts.join(' and ')}` : contrastTitle(m, peers, cols.map((col) => col.key)) ?? `${name} against its alternatives`;
  const kinds = new Set(cols.flatMap((col) => col.cells.map((x: Loose, i: Loose) => (x ? `${i ? 'peer' : 'self'}-${x.kind}` : null))));
  const key = keyOf([KEY.selfCell(name), KEY.peerCell(), KEY.range(), KEY.rug(), ...(kinds.has('self-open') || kinds.has('peer-open') ? [KEY.open()] : []), ...(clipped ? [KEY.clip()] : [])]);
  const table = twinTable(['Material', ...cols.map((col) => `${col.title} (${col.h.unit})`)], rows.map((r, i) => [
    shortName(r) + (i ? '' : ' (this material)'),
    ...cols.map((col) => {
      const x = col.cells[i];
      if (!x) return '—';
      if (x.kind === 'open') return `${spanDisplay(x.min, x.max, col.h.unit)} as published (${x.n})`;
      return `${boundSign(r.headline?.[col.key])}${fmtDisplay(x.median, col.h.unit)}${x.q1 != null ? ` (${spanDisplay(x.q1, x.q3, col.h.unit)})` : ''} · ${x.n}`;
    }),
  ]));
  const lacks = cols.filter((col) => !col.cells[0]).map((col) => inText(col.h));
  const open = cols.filter((col) => col.cells[0]?.kind === 'open').map((col) => inText(col.h));
  const leaves = [lacks.length ? `${name} publishes no ${orList(lacks)}.` : '', open.length ? `Its ${andList(open)} ${open.length > 1 ? 'state' : 'states'} no orientation, so ${open.length > 1 ? 'they are' : 'it is'} drawn as published.` : ''].filter(Boolean).join(' ')
    || `Each cell is the median of the products ranked, its middle half in brackets, and how many.`;
  const html = figFrame({
    slug: opts.id ?? 'alternatives', kind: 'peers', title,
    question: 'How does it compare with what an engineer would buy instead?',
    key, plot, label: null,
    read: `Each row is a material, each column a property: the bar is the middle half of a material's products, the tick their median, the hairline their lowest to highest; the ticks above the rows are every material's median.`,
    table, leaves, method: 'alternatives',
  });
  return { html, empty: false, stats: { figures: 1, dots: marks } };
}
