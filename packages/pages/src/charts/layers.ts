// Figure "Across the layers": for each pair of figures.js LAYER_PAIRS (tensile strength, modulus, elongation), every
// product that publishes both from one sheet (material-stats.js layerPairs, the products material-facts.js shareOf counts)
// at its flat (XY) value across and its across-the-layers (Z) value up, on one scale for both axes, with rays of equal
// share (100, 75, 50, 25 %) so the loss reads as the distance below the 100 % ray, and this material's median share as an
// accent ray. Under each panel, a 0–120 % strip with this material's median share and each alternative's (layerShareOf)
// and the shares as a sorted line. Where no product publishes both for any pair, the panels give way to the strips alone.
// x in per cent, y in px.

import type { Loose } from '../loose.ts';

import { esc, pct, textPx, fmtDisplay, NBSP, tickText, tickLabels, headline, shortName, withUnit, products, andList, orList, figContext, productMark, kindsOf, noteOf, productName, fitLabels, KEY, keyOf, twinTable } from './kit.ts';
import { figFrame } from './figure.ts';
import { spreadEntries } from '../facts/material-facts.ts';
import { layerPairs, layerShareOf, summarise, unpairedZ } from '../facts/material-stats.ts';
import { propertyName } from '../facts/labels.ts';
import { stripScale } from '../facts/scales.ts';
import { yOf } from './scale.ts';
import { LAYER_PAIRS } from '../figures.ts';
import { sheetCode } from '../records/common.ts';

const SIDE = 220;           // the plot's height, px
// The narrowest plot each layout gives: three side by side from 1,000 px (about 255 px each), one under another below.
const WIDE = 250, NARROW = 300;
const sharePct = (r: Loose) => `${Math.round(r * 100)}${NBSP}%`;

/** Why a product in the Z median gives no share (material-stats.js unpairedZ), in words. */
const GAP_WHY: Record<string, Loose> = { none: 'no flat value compared', sheet: 'its flat and across values from two documents', state: 'its two values measured in two states' };
const gapWords = (x: Loose) => (x.why === 'test' ? `${propertyName(x.xy).toLowerCase()} flat, ${propertyName(x.z).toLowerCase()} across` : GAP_WHY[x.why]);

/** Its across-the-layers bar's label where the sheet prints another code than Z ("Z (ZX)", records/common.js sheetCode). */
const zLabel = (c: Loose, e: Loose) => { const code = sheetCode(c.msById.get(e.v.measurementId)); return code ? `Z (${code})` : ''; };

function panel(c: Loose, k: Loose, pair: Loose, plotted: Loose): Loose {
  const m = c.m;
  const ha = headline(pair.xy), hb = headline(pair.z);
  if (!ha || !hb) return null;
  const byKey = new Map([pair.xy, pair.z].map((key) => [key, spreadEntries(m, c, key)]));
  const pairs = layerPairs(ha, hb, byKey, c);
  const gaps = unpairedZ(ha, hb, byKey, c);
  const own: Loose = pairs.length ? { share: summarise(pairs.map((p: Loose) => p.ratio)).median, n: pairs.length } : null;
  const others = k.peers.map((p: Loose) => ({ p, s: layerShareOf(k.db, p, ha, hb) })).filter((x: Loose) => x.s);
  const unit = ha.unit;
  const o: Loose[] = [];
  let logged = false;
  if (pairs.length) {
    const sc = stripScale(pairs.flatMap((p: Loose) => [p.xy.v.value, p.z.v.value]), unit);
    logged = sc.log;
    const X = (v: Loose) => sc.pct(v), Y = (v: Loose) => yOf(sc, v, SIDE);
    for (const t of sc.ticks) o.push(`<line class="dv-grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${SIDE}"/><line class="dv-grid" x1="0" x2="100%" y1="${Y(t)}" y2="${Y(t)}"/><text x="-5" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${esc(tickText(t))}</text>`);
    o.push(`<line class="dv-axis" x1="0" x2="100%" y1="${SIDE + 0.5}" y2="${SIDE + 0.5}"/>`);
    o.push(tickLabels(sc, SIDE + 15, { wide: WIDE, narrow: NARROW }));
    // Rays Z = r × XY, clipped to the frame; each labelled at its far end where it clears the one above.
    const said: Loose[] = [];
    const ray = (r: Loose, cls: Loose, label: Loose) => {
      const lo = sc.log ? Math.max(sc.from, sc.from / r) : 0, hi = Math.min(sc.hi, sc.hi / r);
      if (!(hi > lo)) return '';
      const y2 = Y(r * hi);
      const clear: Loose = label && said.every((y0) => Math.abs(y0 - y2) > 12);
      if (clear) said.push(y2);
      return `<line class="${cls}" x1="${pct(X(lo))}" y1="${Y(r * lo)}" x2="${pct(X(hi))}" y2="${y2}"/>`
        + (clear ? `<text class="dv-raylab" x="${pct(X(hi))}" y="${(y2 + (X(hi) > 97 ? 12 : -3)).toFixed(1)}" dx="${X(hi) > 97 ? -2 : 2}" text-anchor="${X(hi) > 97 ? 'end' : 'start'}">${esc(label)}</text>` : '');
    };
    for (const r of [1, 0.75, 0.5, 0.25]) o.push(ray(r, 'dv-ray', sharePct(r)));
    if (own) o.push(ray(own.share, 'dv-ray--own', ''));
    for (const p of pairs) {
      const marks = p.marks.filter((x: Loose) => x === 'annealed');
      const z = zLabel(c, p.z);
      const data = { 'data-grade': p.g.id, 'data-key': hb.key, 'data-v': p.z.v.value, 'data-xkey': ha.key, 'data-xv': p.xy.v.value,
        'data-kind': kindsOf(marks).join(' '), 'data-t': `${withUnit(p.xy.v.value, unit)} flat (XY), ${withUnit(p.z.v.value, unit)} across the layers, ${z || 'Z'}: ${sharePct(p.ratio)}`, 'data-note': noteOf(marks) || null };
      o.push(productMark(marks, X(p.xy.v.value), Y(p.z.v.value), data));
    }
  }
  // The alternatives' shares on one strip, this material's as a dot. A share is not a median: it rides in data-share (a
  // fraction, Z over XY: 0.62 is 62 %, the median of layerShareOf's shares) with the Z key in data-skey, and the marks carry
  // no data-key or data-v, so nothing reads them as a material's median; data-mat stays for lighting.
  const SX = (r: Loose) => (Math.min(r, 1.2) / 1.2) * 100;
  const strip = [`<line class="dv-axis" x1="0" x2="100%" y1="12.5" y2="12.5"/>`, ...[0, 0.5, 1].map((r) => `<line class="dv-grid" x1="${pct(SX(r))}" x2="${pct(SX(r))}" y1="2" y2="15"/><text x="${pct(SX(r))}" y="27" text-anchor="${r ? 'middle' : 'start'}">${sharePct(r)}</text>`)];
  for (const { p, s } of others) strip.push(`<line class="dv-peer cx" x1="${pct(SX(s.share))}" x2="${pct(SX(s.share))}" y1="2" y2="12" style="stroke:var(--dv-peer);stroke-width:2" data-mat="${esc(p.id)}" data-name="${esc(shortName(p))}" data-share="${s.share}" data-skey="${esc(hb.key)}" data-t="${esc(`Z keeps ${sharePct(s.share)} of XY, median of ${products(s.n)}`)}" data-alt="1"/>`);
  if (own) strip.push(`<circle class="dv-selfdot cx" cx="${pct(SX(own.share))}" cy="8" r="4.5" data-mat="${esc(m.id)}" data-name="${esc(shortName(m))}" data-share="${own.share}" data-skey="${esc(hb.key)}" data-t="${esc(`Z keeps ${sharePct(own.share)} of XY, median of ${products(own.n)}`)}" data-self=""/>`);
  const list = [...(own ? [{ name: shortName(m), share: own.share, self: true }] : []), ...others.map(({ p, s }: Loose) => ({ name: shortName(p), share: s.share }))].sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
  const sub = own ? `Z keeps ${sharePct(own.share)} of XY, median of ${products(own.n)}` : `No ${shortName(m)} product publishes both`;
  const html = `<div class="ly-panel" data-key="${esc(hb.key)}" data-xkey="${esc(ha.key)}"><p class="ly-title">${esc(pair.title)}</p><p class="ly-sub">${esc(sub)}</p>`
    + (pairs.length ? `<div class="ly-plot"><svg class="ly-svg" width="100%" height="${SIDE + 20}" role="img" aria-label="${esc(`${pair.title} across the layers against flat, ${products(pairs.length)}; median share ${sharePct(own.share)}.`)}">${o.join('')}</svg></div><p class="ly-x">${esc(`flat (XY), ${unit}${logged ? ', log scale on both axes' : ''}`)}</p>` : '')
    + `<div class="ly-strip">${list.length ? `<svg class="ly-svg" width="100%" height="30" role="img" aria-label="${esc(`Share kept across the layers: ${list.map((x) => `${x.name} ${sharePct(x.share)}`).join(', ')}.`)}">${strip.join('')}</svg>` : ''}`
    + `<p class="ly-list">${list.length ? `Share kept: ${list.map((x) => (x.self ? `<b>${esc(x.name)} ${sharePct(x.share)}</b>` : `${esc(x.name)} ${sharePct(x.share)}`)).join(' · ')}` : esc('No alternative publishes both either.')}</p></div></div>`;
  plotted.push(...pairs);
  // (A panel with no pair of its own shows its alternatives' strip under a line saying so.)
  return { html, pair, pairs, gaps, own, others, unit, ha, hb };
}

export function layersFigure(c: Loose, env: Loose = {}, opts: Loose = {}): Loose {
  const k = figContext(c, env);
  const m = c.m;
  const name = shortName(m);
  const plotted: Loose[] = [];
  const panels: Loose = LAYER_PAIRS.map((pair) => panel(c, k, pair, plotted)).filter(Boolean);
  // No figure of the alternatives' shares alone: where no product of this material publishes both XY and Z from one
  // sheet, the section says so in a line.
  if (!panels.some((p: Loose) => p.pairs.length)) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  const any = panels.some((p: Loose) => p.pairs.length);
  const owned = panels.filter((p: Loose) => p.own);
  const title = owned.length
    ? `Across the layers (Z), ${name} keeps ${andList(owned.slice(0, 2).map((p: Loose) => `${sharePct(p.own.share)} of its flat ${p.pair.word}`))}`
    : `No ${name} product publishes values across the layers; its alternatives keep these shares`;
  const annealed: Loose = plotted.some((p) => p.marks.includes('annealed'));
  const key = keyOf(any ? [KEY.product(), ...(annealed ? [KEY.annealed()] : []), KEY.rays(), KEY.ownRay(name), KEY.peerCell()] : [KEY.peerCell()]);
  const rows = panels.flatMap((p: Loose) => p.pairs.map((x: Loose) => { const z = zLabel(c, x.z); return [productName(x.g), p.pair.title, `${fmtDisplay(x.xy.v.value, p.unit)} ${p.unit}`, `${fmtDisplay(x.z.v.value, p.unit)} ${p.unit}${z ? `, ${z}` : ''}`, sharePct(x.ratio)]; }));
  const peerRows = panels.flatMap((p: Loose) => p.others.map(({ p: mat, s }: Loose) => [`${shortName(mat)} (alternative)`, p.pair.title, '', '', `${sharePct(s.share)} · ${s.n}`]));
  const table = twinTable(['Product', 'Property', 'Flat (XY)', 'Across (Z)', 'Z as a share of XY'], [...rows, ...peerRows], { numeric: false });
  const none = panels.filter((p: Loose) => !p.pairs.length).map((p: Loose) => p.pair.title.toLowerCase());
  // The products the Z median counts and the share cannot, named with why, so the share's count and the median's agree
  // in the reader's sum (PETG's 14 shares of 16 Z strengths, OPEN-PROBLEMS §37.18).
  const gaps = panels.filter((p: Loose) => p.pairs.length && p.gaps.length).map((p: Loose) => `${p.pair.title}: ${p.gaps.length === 1 ? 'one more product is' : `${p.gaps.length} more products are`} in the median across the layers but ${p.gaps.length === 1 ? 'gives' : 'give'} no share, with no flat value of the same test from the same sheet: ${andList(p.gaps.map((x: Loose) => `${productName(x.g)} (${gapWords(x)})`))}.`);
  const leaves = [none.length ? `No ${name} product publishes ${orList(none)} both flat and across the layers from one sheet.` : '', ...gaps].filter(Boolean).join(' ');
  const html = figFrame({
    slug: opts.id ?? 'layers', kind: 'layers', title,
    question: 'What does a printed part lose across the layers (Z) against flat (XY), and is that usual?',
    key, plot: `<div class="ly${any ? '' : ' ly--strips'}">${panels.map((p: Loose) => p.html).join('')}</div>`, label: null,
    read: any ? 'Each point is a product that publishes both from one sheet: below the 100 % ray it keeps less across the layers than flat. Under each plot, the median share its alternatives\' products keep.'
      : 'The median share each alternative\'s products keep across the layers, where they publish both from one sheet.',
    table, leaves, method: 'layers',
  });
  return { html, empty: false, stats: { figures: 1, dots: plotted.length } };
}
