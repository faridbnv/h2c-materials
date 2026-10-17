// A material map (figures.js MATERIAL_MAPS) as a figure: every material's median of two key properties as faint points,
// the landmarks named by rule (material-stats.js materialMap), this material's products over them with the box of
// their middle half. Drawn in the section the map names; its bookkeeping under "How this is counted".

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { spreadEntries } from '../../js/ui/material-facts.js';
import { materialMap } from '../../js/ui/material-stats.js';
import { plural, lower, andList } from '../../js/ui/material-words.js';
import { materialMapPlot } from '../charts/map.js';
import { keyMark, keyList } from '../charts/marks.js';
import { figure, figId } from '../charts/figure.js';
import { notesHtml, middleHalf } from './common.js';

/** The map of `pair` ({ x, y } headline keys) for a material, as figure `no`; null where the material lacks either median. */
export function mapFigure(c, env, pair, no) {
  const m = c.m;
  const hx = REGISTRY.allHeadlines.find((h) => h.key === pair.x), hy = REGISTRY.allHeadlines.find((h) => h.key === pair.y);
  if (!hx || !hy || !m.headline?.[pair.x]?.known || !m.headline?.[pair.y]?.known) return null;
  const map = materialMap(c.db, env.ranks, pair.x, pair.y, m.id);
  const lm = new Set(map.landmarks);
  const context = map.points.filter((p) => !p.self).map((p) => ({ ...p, landmark: lm.has(p.id) }));
  // Each product with both values compared, its own as the build chose them (spreadEntries), special formulations left out.
  const ex = new Map(spreadEntries(m, c, pair.x).map((e) => [e.g.id, e]));
  const ey = spreadEntries(m, c, pair.y);
  const points = ey.filter((e) => ex.has(e.g.id) && e.v.level === 'comparable' && ex.get(e.g.id).v.level === 'comparable' && !e.variant && !ex.get(e.g.id).variant).map((e) => {
    const a = ex.get(e.g.id);
    return { x: a.v.value, y: e.v.value, marks: [a.v.anneal || e.v.anneal ? 'annealed' : ''].filter(Boolean),
      data: { 'data-grade': e.g.id, 'data-v': `${fmtNumber(a.v.value, hx.unit)}, ${fmtNumber(e.v.value, hy.unit)}` } };
  });
  const sx = m.summary?.[pair.x], sy = m.summary?.[pair.y];
  const box = sx?.q1 != null && sy?.q1 != null ? { x1: sx.q1, x2: sx.q3, y1: sy.q1, y2: sy.q3 } : null;
  const self = { name: m.name, median: { x: m.headline[pair.x].value, y: m.headline[pair.y].value }, box, points };
  const plot = materialMapPlot({ context, self, xUnit: hx.unit, yUnit: hy.unit, xTitle: `${hx.labels.plain}, ${hx.unit}`, yTitle: `${hy.labels.plain}, ${hy.unit}` });
  const named = context.filter((p) => p.landmark).map((p) => p.name);
  const key = keyList([
    points.length ? [keyMark([]), esc(`a ${m.name} product`)] : null,
    points.some((p) => p.marks.includes('annealed')) ? [keyMark(['annealed']), 'measured after annealing'] : null,
    box ? ['<svg class="key-mk" width="18" height="14" aria-hidden="true" focusable="false"><rect class="mbox" x="1" y="1" width="16" height="12"/></svg>', esc('middle half of its products, crossed at the medians')] : null,
    ['<svg class="key-mk" width="12" height="14" aria-hidden="true" focusable="false"><circle class="cx" cx="6" cy="7" r="3"/></svg>', 'another material\'s typical value'],
  ].filter(Boolean));
  const only = new Set([...ex.keys(), ...ey.map((e) => e.g.id)]).size - points.length;
  // The title: where its products' middle half sits, the vertical axis's value first, as the map is read.
  const title = box ? `${m.name} among the materials: ${middleHalf(sy)} ${hy.unit} at ${middleHalf(sx)} ${hx.unit}`
    : `${m.name} among the materials: ${fmtNumber(self.median.y, hy.unit)} at ${fmtNumber(self.median.x, hx.unit)}`;
  const logs = [plot.xLog ? lower(hx.labels.plain) : null, plot.yLog ? lower(hy.labels.plain) : null].filter(Boolean);
  return {
    dots: points.length,
    html: figure({
      id: figId(no), n: no, title, data: { 'data-map': `${pair.x}-${pair.y}` }, cls: 'fig--map', key,
      plot: plot.html,
      label: `Map of ${lower(hy.labels.plain)} against ${lower(hx.labels.plain)}: ${map.points.length} materials' typical values as points, ${m.name}'s ${plural(points.length, 'product')} over them${box ? `, its middle half ${middleHalf(sx)} ${hx.unit} by ${middleHalf(sy)} ${hy.unit}` : ''}.`,
      read: esc(`Every other material on file is a grey point at its typical values. ${m.name}'s products are the blue marks.`),
      counted: notesHtml([
        `The grey points are the typical values, the medians of their products, of the ${map.points.length - 1} other materials that publish both comparably. Named are the ${map.landmarks.length > 8 ? `8 with the most products, and ${named.at(-1)}, the base polymer of ${m.name}` : `${map.landmarks.length} with the most products`}: ${andList(named)}. A name that would cover another is left out.`,
        `${m.name}'s marks are ${plural(points.length, 'product')} with both values compared, each its own as the build chose it. Special formulations are left out.${only ? ` ${only} more ${only === 1 ? 'publishes' : 'publish'} only one of the two, or one not compared.` : ''}`,
        logs.length === 2 ? 'Both axes are logarithmic: equal steps are equal ratios, as on an Ashby chart.' : logs.length ? `The ${logs[0]} axis is logarithmic: equal steps are equal ratios.` : null,
      ]),
    }),
  };
}
