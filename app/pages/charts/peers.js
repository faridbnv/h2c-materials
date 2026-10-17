// Figure "Against its alternatives": a row per material (this one first, then its five alternatives, material-stats.js
// peerSet), a column per key property on its own scale (figures.js PEER_COLUMNS). A cell is the material's products'
// lowest to highest (a hairline), middle half (a bar, from four products) and median (a tick), this material in the
// accent with its median printed, the alternatives in grey; a material that publishes the property only with no stated
// orientation shows hollow circles at those values. Above the rows, a rug of every material's median (material-facts.js
// rankTable), this one's in the accent, those off the scale counted at its ends. Names link to the alternatives' pages.
//
// Each column is its own SVG, x in per cent of the column, rows at fixed px heights matching the names column, so the
// figure is fluid; under 720 px it scrolls sideways inside its box with the names held at the left (figures.src.css).

import { esc, pct, textPx, fmtDisplay, headline, shortName, withUnit, spanUnit, products, andList, orList, inText, figContext, gridLines, KEY, keyOf, twinTable } from './kit.js';
import { figFrame } from './figure.js';
import { materialCell, peerContrast } from '../../js/ui/material-stats.js';
import { stripScale } from '../../js/ui/scales.js';
import { PEER_COLUMNS } from '../figures.js';

export const ROW = 34;
const RUG = 26;

/** One column's scale: the scale rule over the rows' lowest, highest and medians (and values as published). */
export function columnScale(cells, unit) {
  const vals = cells.flatMap((x) => (x ? [x.min, x.max, x.median].filter((v) => Number.isFinite(v)) : []));
  return vals.length ? stripScale(vals, unit) : null;
}

/** The cells of every row for one key, this material first. */
export const columnCells = (rows, key) => rows.map((r) => materialCell(r, key));

function cellSvg(r, c, h, X, y, self) {
  const k = self ? 'self' : 'peer';
  const hooks = (v, t) => ` data-mat="${esc(r.id)}" data-key="${esc(h.key)}" data-v="${v}" data-name="${esc(shortName(r))}" data-t="${esc(t)}"`;
  if (c.kind === 'open') {
    const vals = [...new Set([c.min, c.max])];
    const t = `${spanUnit(c.min, c.max, h.unit)} from ${products(c.n)}, as published: orientation or load not stated`;
    return `<g class="pe-cell cx dv-${k}-open"${hooks(c.max, t)} data-kind="as-published">`
      + (vals.length > 1 ? `<line class="dv-open-line" x1="${pct(X(c.min))}" x2="${pct(X(c.max))}" y1="${y}" y2="${y}"/>` : '')
      + vals.map((v) => `<circle class="dv-open" cx="${pct(X(v))}" cy="${y}" r="4"/>`).join('')
      + (self ? valueLabel(X(c.max), y, fmtDisplay(c.max, h.unit)) : '') + '</g>';
  }
  const t = `median ${withUnit(c.median, h.unit)}${c.q1 != null ? `, middle half ${spanUnit(c.q1, c.q3, h.unit)}` : ''}${c.min !== c.max ? `, lowest to highest ${spanUnit(c.min, c.max, h.unit)}` : ''}, ${products(c.n)}`;
  return `<g class="pe-cell cx"${hooks(c.median, t)} data-kind="compared">`
    + (c.min !== c.max ? `<line class="dv-${k}-range" x1="${pct(X(c.min))}" x2="${pct(X(c.max))}" y1="${y}" y2="${y}"/>` : '')
    + (c.q1 != null && c.q3 != null ? `<rect class="dv-${k}-band" x="${pct(X(c.q1))}" y="${y - 5}" width="${pct(Math.max(X(c.q3) - X(c.q1), 0.8))}" height="10" rx="2"/>` : '')
    + `<svg x="${pct(X(c.median))}" y="${y}" overflow="visible"><rect class="dv-${k}" x="-1.5" y="-9" width="3" height="18" rx="1.5"/></svg>`
    + (self ? valueLabel(X(c.median), y, fmtDisplay(c.median, h.unit)) : '') + '</g>';
}

/** This material's median over its tick, kept inside the column near its ends. */
function valueLabel(at, y, t) {
  const anchor = at < 12 ? 'start' : at > 88 ? 'end' : 'middle';
  return `<text class="dv-val" x="${pct(at)}" y="${y - 12}" dx="${anchor === 'start' ? -2 : anchor === 'end' ? 2 : 0}" text-anchor="${anchor}">${esc(t)}</text>`;
}

/** The scale's labels under a narrow column: its ends anchored inward, a middle one where it clears both. */
function columnTicks(sc, y) {
  const t = sc.ticks;
  const lab = (i, a) => `<text x="${pct(sc.pct(t[i]))}" y="${y}" text-anchor="${a}">${esc(fmtDisplay(t[i], ''))}</text>`;
  let out = lab(0, 'start') + (t.length > 1 ? lab(t.length - 1, 'end') : '');
  const mid = Math.round((t.length - 1) / 2);
  if (t.length > 2 && mid > 0 && mid < t.length - 1) {
    // About 110 px a column on a laptop: the middle label where it clears the ends there.
    const W = 110, x = (sc.pct(t[mid]) / 100) * W, half = textPx(fmtDisplay(t[mid], ''), 11.5) / 2;
    if (x - half > textPx(fmtDisplay(t[0], ''), 11.5) + 6 && x + half < W - textPx(fmtDisplay(t.at(-1), ''), 11.5) - 6) out += lab(mid, 'middle');
  }
  return out;
}

export function peersFigure(c, env = {}, opts = {}) {
  const k = figContext(c, env);
  const m = c.m;
  const peers = k.peers;
  const empty = { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  if (!peers.length) return empty;
  const rows = [m, ...peers];
  const cols = PEER_COLUMNS.map((col) => ({ ...col, h: headline(col.key) })).filter((col) => col.h)
    .map((col) => ({ ...col, cells: columnCells(rows, col.key) })).filter((col) => col.cells.some(Boolean));
  if (!cols.length || !cols.some((col) => col.cells[0])) return empty;
  const H = RUG + rows.length * ROW + 20;
  let marks = 0;
  const svgs = cols.map((col) => {
    const h = col.h, sc = columnScale(col.cells, h.unit);
    const X = (v) => sc.pct(v);
    // This material's row, banded in the accent's tint; the gridlines at the scale's ticks.
    const o = [`<rect class="pe-selfband" x="0" y="${RUG}" width="100%" height="${ROW}"/>`, gridLines(sc, 4, H - 20)];
    // The rug: every material's median within the scale, one path in a 0–100 box stretched to the column, counted beyond
    // it; this material's own tick drawn apart, in the accent.
    let below = 0, above = 0, ownAt = null;
    const ticks = [];
    for (const e of k.ranks[col.key]?.entries ?? []) {
      if (e.value < sc.from) { below++; continue; }
      if (e.value > sc.hi) { above++; continue; }
      if (e.id === m.id) { ownAt = X(e.value); continue; }
      ticks.push(`M${X(e.value).toFixed(2)} 7V19`);
    }
    o.push(`<svg x="0" y="0" width="100%" height="${RUG}" viewBox="0 0 100 ${RUG}" preserveAspectRatio="none"><path class="dv-rug" d="${ticks.join('')}" vector-effect="non-scaling-stroke"/></svg>`);
    if (ownAt != null) o.push(`<line class="dv-rug--self" x1="${pct(ownAt)}" x2="${pct(ownAt)}" y1="4" y2="22"/>`);
    if (below) o.push(`<text class="dv-rugn" x="0" y="3" dy="-2">‹ ${below}</text>`);
    if (above) o.push(`<text class="dv-rugn" x="100%" y="3" dy="-2" text-anchor="end">${above} ›</text>`);
    const own = col.cells[0];
    if (own?.kind === 'compared') o.push(`<line class="dv-guide" x1="${pct(X(own.median))}" x2="${pct(X(own.median))}" y1="${RUG}" y2="${H - 20}"/>`);
    col.cells.forEach((cell, i) => {
      const y = RUG + i * ROW + ROW / 2;
      if (!cell) { o.push(`<text class="dv-none" x="50%" y="${y + 4}" text-anchor="middle">—</text>`); return; }
      marks++;
      o.push(cellSvg(rows[i], cell, h, X, y, i === 0));
    });
    o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${H - 19.5}" y2="${H - 19.5}"/>`);
    o.push(`<g class="dv-ticks">${columnTicks(sc, H - 6)}</g>`);
    return `<div class="pe-col" data-key="${esc(col.key)}"><div class="pe-h"><b>${esc(col.title)}</b><span>${esc(col.sub)}</span></div>`
      + `<svg class="pe-svg" width="100%" height="${H}" aria-hidden="true" focusable="false">${o.join('')}</svg></div>`;
  });
  const names = `<div class="pe-names"><div class="pe-h"></div><div class="pe-rugname">All materials</div>`
    + rows.map((r, i) => {
      const self = i === 0;
      const href = self ? null : k.hrefOf(r);
      const name = href ? `<a href="${esc(href)}">${esc(shortName(r))}</a>` : esc(shortName(r));
      return `<div class="pe-name${self ? ' pe-name--self' : ''}" data-mat="${esc(r.id)}" data-name="${esc(shortName(r))}"${self ? ' data-self=""' : ' data-alt="1"'}>${name}<span>${esc(products(r.gradeIds.length))}</span></div>`;
    }).join('') + '</div>';
  const plot = `<div class="pe" style="--rows:${rows.length};--cols:${cols.length}">${names}${svgs.join('')}</div>`;

  // The finding: where this material leads or trails its alternatives by a clear margin.
  const said = peerContrast(m, peers, cols.map((col) => col.key));
  const words = (keys) => andList(keys.map((key) => inText(headline(key)).replace(/ \(XY\)$/, '')));
  const parts = [said.high.length ? `the highest ${words(said.high)}` : '', said.low.length ? `the lowest ${words(said.low)}` : ''].filter(Boolean);
  const name = shortName(m);
  const title = parts.length ? `Against its alternatives, ${name} has ${parts.join(' and ')}` : `${name} against its alternatives`;
  const kinds = new Set(cols.flatMap((col) => col.cells.map((x, i) => (x ? `${i ? 'peer' : 'self'}-${x.kind}` : null))));
  const key = keyOf([KEY.selfCell(name), KEY.peerCell(), KEY.range(), KEY.rug(), ...(kinds.has('self-open') || kinds.has('peer-open') ? [KEY.open()] : [])]);
  const table = twinTable(['Material', ...cols.map((col) => `${col.title} (${col.h.unit})`)], rows.map((r, i) => [
    shortName(r) + (i ? '' : ' (this material)'),
    ...cols.map((col) => {
      const x = col.cells[i];
      if (!x) return '—';
      if (x.kind === 'open') return `${spanUnit(x.min, x.max, '').trim()} as published (${x.n})`;
      return `${fmtDisplay(x.median, col.h.unit)}${x.q1 != null ? ` (${spanUnit(x.q1, x.q3, col.h.unit).replace(` ${col.h.unit}`, '')})` : ''} · ${x.n}`;
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
    read: `Each row is a material, each column a property on its own scale: the bar is the middle half of a material's products, the tick their median, the hairline their lowest to highest. The ticks above the rows are every material's median.`,
    table, leaves, method: 'alternatives',
  });
  return { html, empty: false, stats: { figures: 1, dots: marks } };
}
