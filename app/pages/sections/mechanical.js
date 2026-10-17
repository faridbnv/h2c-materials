// Strength and stiffness: what a printed part gives flat (XY) and across the layers (Z), test by test, as the build
// compiled each product's value (the tensile and flexural comparisons, D139, D140); where the material sits among every
// material on strength against stiffness (figures.js MATERIAL_MAPS, material-stats.js materialMap); how much of the flat
// value each product keeps across the layers (material-stats.js layerPairs); the notched impact tests product by product
// (D133); then every other mechanical property on file, counted.

import { esc, tableBox } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { measuredIn, comparisonsOf, productNameOrId } from '../../js/ui/material-facts.js';
import { layerPairs, summarise } from '../../js/ui/material-stats.js';
import { EMPTY_LINES, plural, lower, andList, asPublishedWords, apartWords, medianRule, pairWords } from '../../js/ui/material-words.js';
import { dumbbellPanel } from '../charts/dumbbell.js';
import { keyMark, keyList } from '../charts/marks.js';
import { figure, figId, howCounted } from '../charts/figure.js';
import { MATERIAL_MAPS, LAYER_TESTS } from '../figures.js';
import {
  emptyBody, otherProperties, figureCounter, findingsBlock, notesHtml, recordsLink, middleHalf, countedLine, comparisonAbout,
  comparisonFigure, noGraphWords,
} from './common.js';
import { mapFigure } from './maps.js';
import { strengthFindings } from '../findings.js';

/** A headline's name without its orientation: "Tensile strength". */
export const bare = (h) => h.labels.plain.replace(/\s*\((?:XY|Z)\)$/, '');

/**
 * The XY and Z rows of the layer tests (figures.js LAYER_TESTS): for each property one row, its flat and its
 * across-the-layers headline, and the products that publish both from one document in one state (layerPairs).
 */
export function layerRows(f, c) {
  const rows = [];
  for (const unit of [...new Set(f.hs.map((h) => h.unit))]) {
    const hs = f.hs.filter((h) => h.unit === unit);
    const xy = hs.find((h) => h.direction === 'XY'), z = hs.find((h) => h.direction === 'Z');
    if (!xy) continue;
    const pairs = z ? layerPairs(xy, z, f.byKey, c) : [];
    rows.push({ f, xy, z, pairs, share: pairs.length ? summarise(pairs.map((p) => p.ratio)) : null });
  }
  return rows;
}

/** A typical value with its middle half under it, or why there is none. */
function typicalCell(h, m, label) {
  if (!h) return `<td class="num none" data-label="${esc(label)}">—</td><td class="num n"></td>`;
  const s = m.summary?.[h.key];
  if (s?.n) return `<td class="num typ" data-label="${esc(label)}"><b>${esc(fmtNumber(s.median))}</b>${s.q1 != null ? `<span class="mh">${esc(middleHalf(s))}</span>` : ''}</td><td class="num n">${s.n}</td>`;
  if (s?.asPublished?.n) return `<td class="num none" colspan="2" data-label="${esc(label)}">${esc(`not compared: ${s.asPublished.n} with ${asPublishedWords(h)}`)}</td>`;
  return `<td class="num none" data-label="${esc(label)}">—</td><td class="num n"></td>`;
}

/** The flat and across-the-layers table, every layer test's rows, with its bookkeeping. */
function layerTable(groups, c, anchor) {
  const m = c.m;
  const rows = groups.flatMap((g) => g.rows).filter((r) => m.summary?.[r.xy.key]?.n || m.summary?.[r.xy.key]?.asPublished?.n || (r.z && m.summary?.[r.z.key]?.n));
  if (!rows.length) return '';
  const body = rows.map((r) => `<tr data-pair="${esc(r.xy.key)}"><th scope="row">${esc(bare(r.xy))} <span class="u">${esc(r.xy.unit)}</span></th>${typicalCell(r.xy, m, 'Flat (XY)')}${typicalCell(r.z, m, 'Across (Z)')}`
    + `<td class="num share" data-label="Z keeps">${r.share ? `<b>${esc(`${Math.round(r.share.median * 100)} %`)}</b><span class="mh">${esc(plural(r.share.n, 'product'))}</span>` : '—'}</td></tr>`).join('');
  const counted = groups.flatMap((g) => {
    const hs = g.f.shown.length ? g.f.shown : g.f.hs;
    const apart = hs.map((h) => [h, apartWords(h, m.summary?.[h.key])]).filter(([, a]) => a.length).map(([h, a]) => `${h.labels.plain}: ${andList(a)}.`);
    return [`<h4>${esc(g.f.topic)}</h4>`, notesHtml([`${medianRule(hs, m)} Typical is their median, and the smaller figure under it the middle half of them.`,
      apart.length ? `Left out of the median: ${apart.join(' ')}` : null,
      pairWords(g.f.cmp.pairLabel, g.f.pairs, g.f.pairs.map((p) => p.both.map(productNameOrId)), g.f.drawnGraphs.length === 1),
      countedLine(g.f, c, 'Mechanical').line]), comparisonAbout(g.f)];
  }).join('');
  return `<div class="tbl" id="layers-table"><h3 class="sub-title">Flat and across the layers</h3>${tableBox(`<table class="grid layers"><thead>`
    + '<tr><th scope="col" rowspan="2">Property</th><th scope="colgroup" colspan="2" class="grp-h">Printed flat (XY)</th><th scope="colgroup" colspan="2" class="grp-h">Across the layers (Z)</th><th scope="col" rowspan="2" class="num">Z keeps of XY</th></tr>'
    + '<tr><th scope="col" class="num">Typical</th><th scope="col" class="num">Products</th><th scope="col" class="num">Typical</th><th scope="col" class="num">Products</th></tr>'
    + `</thead><tbody>${body}</tbody></table>`)}${rows.some((r) => m.summary?.[r.xy.key]?.n) ? '<p class="fig-read">Typical is the median of the products, with the middle half of them under it.</p>' : ''}`
    + howCounted(notesHtml(['Z keeps of XY: for each product whose two values are compared, from one document and in one annealing state, its Z value as a share of its XY value. The figure is the median of those shares, and under it how many products give one.'])
      + counted + `<p>${recordsLink(c, anchor, 'Every result, with its document, on the records page')}.</p>`) + '</div>';
}

/** Each product's flat against across-the-layers value, a panel per tensile property, with the median share. */
function layersFigure(groups, c, no) {
  const m = c.m;
  const tensile = groups.find((g) => g.f.topic === LAYER_TESTS[0]);
  const rows = (tensile?.rows ?? []).filter((r) => r.pairs.length > 1);
  if (!rows.length) return null;
  // Strength first: the property a print most often fails in across its layers.
  const order = (r) => (/strength/i.test(r.xy.key) ? 0 : /modulus/i.test(r.xy.key) ? 1 : 2);
  rows.sort((a, b) => order(a) - order(b));
  const panels = rows.map((r) => dumbbellPanel({
    pairs: r.pairs.map((p) => ({ ...p, name: productNameOrId(p.g) })), key: r.xy.key, title: bare(r.xy), unit: r.xy.unit, median: r.share.median,
    head: `across the layers, as a share of flat: the median of ${plural(r.pairs.length, 'product')}`,
  }));
  const main = rows[0];
  const pctOf = (r) => `${Math.round(r.share.median * 100)} %`;
  const key = keyList([
    ['<svg class="key-mk" width="16" height="14" aria-hidden="true" focusable="false"><use href="#mk-dot" class="mk mk--xy" x="8" y="7"/></svg>', 'printed flat (XY)'],
    ['<svg class="key-mk" width="16" height="14" aria-hidden="true" focusable="false"><use href="#mk-dot" class="mk mk--z" x="8" y="7"/></svg>', 'across the layers (Z)'],
    rows.some((r) => r.pairs.some((p) => p.marks.includes('annealed'))) ? [keyMark(['annealed']), 'measured after annealing'] : null,
  ].filter(Boolean));
  return {
    dots: rows.reduce((n, r) => n + r.pairs.length * 2, 0),
    html: figure({
      id: figId(no), n: no, title: `Across the layers, ${bare(main.xy).toLowerCase()} keeps ${pctOf(main)} of its flat value`, data: { 'data-layers': 'tensile' }, cls: 'fig--layers', key,
      plot: `<div class="db-grid">${panels.join('')}</div>`,
      label: `For each product that publishes both orientations, its flat and across-the-layers value: ${rows.map((r) => `${lower(bare(r.xy))}, ${plural(r.pairs.length, 'product')}, median share ${pctOf(r)}`).join('; ')}.`,
      read: esc('A row is one product: its flat value in grey, its value across the layers in blue, and the share it keeps. Rows run from the product that keeps the most.'),
      counted: notesHtml([
        'A product is drawn where it publishes both orientations of the test from one document, in one annealing state, and is not a special formulation: the products whose share can be read. Its own values are the build\'s, as in the table above.',
        `The large figure is the median of the shares: ${andList(rows.map((r) => `${lower(bare(r.xy))} ${pctOf(r)}, ${r.share.min === r.share.max ? '' : `from ${Math.round(r.share.min * 100)} to ${Math.round(r.share.max * 100)} %, `}${plural(r.pairs.length, 'product')}`))}.`,
        m.summary?.tensileStrengthZ?.n && main.pairs.length < m.summary.tensileStrengthZ.n ? `More products publish a Z value than are drawn here: the others publish no comparable flat value from the same document.` : null,
      ]),
    }),
  };
}

export default {
  id: 'mechanical',
  title: 'Strength and stiffness',
  records: '#measurements-mechanical',
  render(c, env, place) {
    const anchor = '#measurements-mechanical';
    const mi = measuredIn(c, 'Mechanical');
    if (!mi.rows.length) {
      const other = otherProperties(c, 'Mechanical', new Set(), anchor);
      return { empty: true, html: emptyBody(c, EMPTY_LINES.Mechanical, { tab: 'Mechanical', anchor }) + other.html, stats: {} };
    }
    const m = c.m;
    const next = figureCounter(place.n);
    const comps = comparisonsOf(m, c, 'Mechanical');
    const covered = new Set(comps.flatMap((f) => [...f.properties]));
    const groups = LAYER_TESTS.map((t) => comps.find((f) => f.topic === t)).filter(Boolean).map((f) => ({ f, rows: layerRows(f, c) }));
    const shares = groups.flatMap((g) => g.rows).filter((r) => r.share).map((r) => ({ key: r.xy.key, name: bare(r.xy), n: r.share.n, median: r.share.median }));
    const out = [findingsBlock(strengthFindings(m, { shares, hs: REGISTRY.allHeadlines }))];
    let figures = 0, dots = 0;
    out.push(layerTable(groups, c, anchor));
    for (const pair of MATERIAL_MAPS.filter((p) => p.section === 'mechanical')) {
      const fig = mapFigure(c, env, pair, `${place.n}.${figures + 1}`);
      if (fig) { next(); out.push(fig.html); figures++; dots += fig.dots; }
    }
    const lay = layersFigure(groups, c, `${place.n}.${figures + 1}`);
    if (lay) { next(); out.push(lay.html); figures++; dots += lay.dots; }
    // The other comparisons (impact), product by product, where a scale has two products' values; else one sentence.
    for (const f of comps.filter((x) => !LAYER_TESTS.includes(x.topic))) {
      const s = (k) => m.summary?.[k];
      // The title: each test's typical value, "typically" only where more than one product gives it.
      const given = f.shown.filter((h) => s(h.key)?.n);
      const many = given.every((h) => s(h.key).n > 1);
      const parts = given.map((h) => `${lower(h.labels.plain.replace(/ impact$/, ''))} ${fmtNumber(s(h.key).median, h.unit)}${!many && s(h.key).n === 1 ? ' from one product' : ''}`);
      const fig = comparisonFigure(f, c, 'Mechanical', `${place.n}.${figures + 1}`, {
        title: !given.length ? f.topic : many ? `Typically ${andList(parts)}` : `${parts[0].charAt(0).toUpperCase()}${andList(parts).slice(1)}`,
        anchor, read: esc('A dot is one product\'s own value. The shaded band is the middle half of the products compared, and the line their median.'),
      });
      if (fig) { next(); out.push(fig.html); figures++; dots += fig.dots; } else out.push(`<div class="nofig" data-comparison="${esc(f.topic)}"><h3 class="sub-title">${esc(f.topic)}</h3><p>${esc(noGraphWords(f, c, 'Mechanical'))} ${recordsLink(c, anchor, 'Every result, with its document')}.</p></div>`);
    }
    const other = otherProperties(c, 'Mechanical', covered, anchor);
    out.push(other.html);
    return { empty: false, html: out.join('\n'), stats: { figures, dots } };
  },
};
