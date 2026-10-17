// Which of a material's measurements a figure on its Overview draws, and why not where it does not (the build's own
// reason, material-facts.js notDrawnWhy): what the Products page's cards say in their "On the Overview" column. What is
// left of the retired records page's measurements table (D145).

import { comparisonsOf, notDrawnWhy } from '../../js/ui/material-facts.js';

/** For each measurement, whether a comparison on the page draws it, and the lines it carries there (comparisonsOf().onGraph). */
export function drawnIndex(c) {
  const byProperty = new Map();
  const lines = new Map();
  for (const tab of ['Mechanical', 'Thermal']) {
    for (const f of comparisonsOf(c.m, c, tab)) {
      for (const p of f.properties) if (!byProperty.has(p)) byProperty.set(p, f);
      if (!f.drawnGraphs.length) continue;
      for (const o of f.onGraph) (lines.get(o.mid) ?? lines.set(o.mid, []).get(o.mid)).push(o);
    }
  }
  return {
    lines,
    drawsProperty: (p) => byProperty.has(p),
    why: (x) => { const f = byProperty.get(x.property); return f ? notDrawnWhy(x, f.hs, c, f.drawnIds, f.namedIds) : 'none'; },
  };
}
