// Which of a material's measurements a figure on its Overview draws, and why not where it does not (the build's own
// reason, material-facts.js notDrawnWhy): what the Products page's cards say in their "On the Overview" column. What is
// left of the retired records page's measurements table (D145).

import { comparisonsOf, notDrawnWhy, spreadEntries, outOfMedian } from '../../js/ui/material-facts.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { PAGE_ONLY } from '../figures.js';

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
  // The headlines a section draws outside the drawer's comparisons (figures.js PAGE_ONLY: Shore A and Shore D hardness,
  // OPEN-PROBLEMS §38.3), each product's value as spreadEntries gives it, so a card says of those values what it says of
  // the others: in the median, or why not. Each reads only the values in its own unit; the property's values in another
  // (Rockwell, a Shore scale the sheet does not name) stay under Other properties.
  const extra = new Map();
  for (const h of REGISTRY.allHeadlines.filter((x) => PAGE_ONLY.includes(x.key) && !c.m.headline?.[x.key]?.notApplicable)) {
    const entries = spreadEntries(c.m, c, h.key);
    if (!entries.length) continue;
    for (const p of h.valueProperties) {
      if (byProperty.has(p)) continue;
      (extra.get(p) ?? extra.set(p, []).get(p)).push(h);
    }
    for (const e of entries) (lines.get(e.v.measurementId) ?? lines.set(e.v.measurementId, []).get(e.v.measurementId)).push({ mid: e.v.measurementId, h, e, reason: outOfMedian(h, e, c.m.summary?.[h.key], c) });
  }
  const drawnExtra = new Set([...lines.values()].flat().filter((o) => PAGE_ONLY.includes(o.h?.key)).map((o) => o.mid));
  return {
    lines,
    drawsProperty: (p) => byProperty.has(p) || extra.has(p),
    why: (x) => {
      const f = byProperty.get(x.property);
      if (f) return notDrawnWhy(x, f.hs, c, f.drawnIds, f.namedIds);
      const hs = (extra.get(x.property) ?? []).filter((h) => h.unit === x.unit);
      if (hs.length) return notDrawnWhy(x, hs, c, drawnExtra);
      return extra.has(x.property) ? `property:${x.property}` : 'none';
    },
  };
}
