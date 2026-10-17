// Mechanical properties: how strong and stiff a printed part is, flat (XY) and across the layers (Z), and how tough.
// Two sentences (findings.js mechanicalWords); each product's value property by property (figures.js stripsFigure) where
// four products or more are compared, else what each sheet publishes, as a table; what a part keeps across the layers
// (figures.js layersFigure); and the flat and across-the-layers table, its twin, from the compiled medians
// (materials[].summary) and each product's share (material-stats.js layerPairs, as material-facts.js shareOf).

import { esc } from '../html.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { comparisonsOf, measuredIn } from '../../js/ui/material-facts.js';
import { propertyName } from '../../js/ui/labels.js';
import { layerPairs, summarise } from '../../js/ui/material-stats.js';
import { mechanicalWords, num, fmtD, glue } from '../findings.js';
import { inStrip } from '../figures.js';
import { opening, drawFigure, figureConfig, subhead, tableBox, publishedKeys, headlineTable, absentLine } from './common.js';

/** The strips this section draws (figures.js STRIP_SETS.mechanical). */
const KEYS = ['tensileStrengthXY', 'tensileModulusXY', 'tensileStrengthZ', 'elongationXY', 'charpyNotched', 'izodNotched'];
/** The flat and across-the-layers rows: a property's XY and Z headlines. */
const LAYER_ROWS = [
  ['Tensile strength', 'tensileStrengthXY', 'tensileStrengthZ'], ['Tensile modulus', 'tensileModulusXY', 'tensileModulusZ'],
  ['Elongation at break', 'elongationXY', 'elongationZ'], ['Flexural strength', 'flexuralStrengthXY', 'flexuralStrengthZ'],
  ['Flexural modulus', 'flexuralModulusXY', 'flexuralModulusZ'],
];
const headline = (key) => REGISTRY.allHeadlines.find((h) => h.key === key) ?? null;

/** A median with its middle half under it, or a dash. */
function medianCell(m, key, label = '') {
  const s = m.summary?.[key];
  if (!s?.n) return `<td class="num none" data-label="${esc(label)}">—</td><td class="num n" data-label="Products"></td>`;
  // The unit is in the row's head; the display rule reads it.
  const unit = headline(key)?.unit;
  const v = (x, stat) => num(x, { key, stat, shown: fmtD(x, unit).replace(/ \S+$/, '') }).html;
  const mid = s.q1 != null ? `<span class="mh">${v(s.q1, 'q1')}⁠–⁠${v(s.q3, 'q3')}</span>` : '';
  return `<td class="num typ" data-label="${esc(label)}"><b>${v(s.median, 'median')}</b>${mid}</td><td class="num n" data-label="Products">${num(s.n, { key, stat: 'n', shown: String(s.n) }).html}</td>`;
}

/** The share of its flat value each product keeps across the layers, for one property: { median, n } or null. */
function shareOf(c, comps, xyKey, zKey) {
  const f = comps.find((x) => x.hs.some((h) => h.key === xyKey) && x.hs.some((h) => h.key === zKey));
  if (!f) return null;
  const xy = f.hs.find((h) => h.key === xyKey), z = f.hs.find((h) => h.key === zKey);
  const pairs = layerPairs(xy, z, f.byKey, c);
  return pairs.length ? { ...summarise(pairs.map((p) => p.ratio)), n: pairs.length } : null;
}

/** The flat and across-the-layers table: each property's XY and Z medians with their middle halves, and the share kept. */
function layerTable(c) {
  const m = c.m;
  const comps = comparisonsOf(m, c, 'Mechanical');
  const rows = LAYER_ROWS.filter(([, xy, z]) => m.summary?.[xy]?.n || m.summary?.[z]?.n).map(([label, xy, z]) => {
    const share = shareOf(c, comps, xy, z);
    return `<tr><th scope="row" class="prop">${esc(label)} <span class="u">${esc(headline(xy)?.unit ?? '')}</span></th>${medianCell(m, xy, 'Flat (XY)')}${medianCell(m, z, 'Across the layers (Z)')}`
      + `<td class="num share" data-label="Z as a share of XY">${share ? `<b>${esc(`${Math.round(share.median * 100)} %`)}</b><span class="mh">${esc(`${share.n} ${share.n === 1 ? 'product' : 'products'}`)}</span>` : '—'}</td></tr>`;
  });
  if (!rows.length) return '';
  return `<div class="layer-table">${subhead('Flat and across the layers')}${tableBox(`<table class="grid layers"><thead>`
    + '<tr><th scope="col" rowspan="2">Property</th><th scope="colgroup" colspan="2">Printed flat (XY)</th><th scope="colgroup" colspan="2">Across the layers (Z)</th><th scope="col" rowspan="2" class="num">Z as a share of XY</th></tr>'
    + '<tr><th scope="col" class="num">Median</th><th scope="col" class="num">Products</th><th scope="col" class="num">Median</th><th scope="col" class="num">Products</th></tr>'
    + `</thead><tbody>${rows.join('')}</tbody></table>`)}<p class="sec-note">${esc('The middle half of the products under each median. The share is each product\'s Z value as a part of its XY value, from one sheet and one state, and the median of those shares.')} <a href="method.html#layers">How XY and Z differ</a>.</p></div>`;
}

/** The rows of the thin table: each mechanical property its sheets publish, impact tests by notch. */
function thinRows(c) {
  const props = measuredIn(c, 'Mechanical').shown;
  const rows = [];
  for (const p of props) {
    const xs = c.ms.filter((x) => x.property === p && x.numeric);
    const notches = [...new Set(xs.map((x) => (/^(Notched|Unnotched)$/.test(x.notch) ? x.notch : '')))];
    for (const notch of notches) {
      const label = `${propertyName(p)}${notch ? `, ${notch.toLowerCase()}` : ''}`;
      rows.push({ label, pick: (ys) => ys.filter((y) => y.property === p && (notch ? y.notch === notch : !/^(Notched|Unnotched)$/.test(y.notch))) });
    }
  }
  return rows;
}

/** What a missing key property is called in the line that says it is not published. */
const ABSENT_WORDS = { tensileStrengthXY: 'tensile strength', tensileModulusXY: 'tensile modulus', tensileStrengthZ: 'strength across the layers', elongationXY: 'elongation at break' };

export default {
  id: 'mechanical',
  title: 'Mechanical properties',
  render(c, env = {}) {
    const m = c.m;
    const mi = measuredIn(c, 'Mechanical');
    if (!mi.rows.length) return { empty: true, html: '', stats: {} };
    const keys = figureConfig('STRIP_SETS', {}).mechanical ?? KEYS;
    const published = publishedKeys(c, keys);
    // A property compared on enough products is a strip; the rest a table of what each sheet publishes; every value
    // once, in one or the other.
    const stripped = published.filter((k) => inStrip(m, k));
    const tabled = published.filter((k) => !stripped.includes(k));
    const impactMissing = !published.includes('charpyNotched') && !published.includes('izodNotched');
    const unnotched = impactMissing && c.ms.some((x) => /impact/i.test(x.property) && x.numeric && /unnotched/i.test(x.notch ?? ''));
    const absent = [...['tensileStrengthXY', 'tensileModulusXY', 'tensileStrengthZ', 'elongationXY'].filter((k) => keys.includes(k) && !published.includes(k)).map((k) => ABSENT_WORDS[k]),
      impactMissing ? `notched impact${unnotched ? ' (its sheets give unnotched values only)' : ''}` : null].filter(Boolean);
    const parts = [opening(mechanicalWords(c).filter((x) => !/unnotched/.test(String(x))))];
    let figures = 0, dots = 0;
    const add = (f) => { if (!f.empty && f.html) { parts.push(f.html); figures += f.stats?.figures ?? 1; dots += f.stats?.dots ?? 0; } };
    if (stripped.length) add(drawFigure('stripsFigure', c, env, stripped, { id: 'mechanical' }));
    if (tabled.length) parts.push(headlineTable(c, tabled, { fmt: (v, u) => fmtD(v, u) }));
    // Across the layers: drawn, and tabled, only where some product publishes a value across the layers.
    const hasZ = publishedKeys(c, ['tensileStrengthZ', 'tensileModulusZ', 'elongationZ', 'flexuralStrengthZ', 'flexuralModulusZ']).length > 0;
    if (hasZ) {
      add(drawFigure('layersFigure', c, env, {}));
      parts.push(layerTable(c));
    }
    parts.push(absentLine(c, absent));
    return { empty: false, html: glue(parts.filter(Boolean).join('\n')), stats: { figures, dots } };
  },
};
