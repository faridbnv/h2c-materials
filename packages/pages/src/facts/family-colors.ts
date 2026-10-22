// The colour of a polymer family, one for every chart (C43): the families a reader asked for take the first colours, so a family filtered for is never the grey "other".
// Its own module: only the charts draw colours, and the first screen does not.

import type { Loose } from '../loose.ts';

/**
 * Colour by family. There are 19 families, past what a categorical palette can separate, so the
 * eight largest get their own hue and the tail groups into "Other". The legend can promote any
 * family out of Other.
 *
 * One meaning per colour (C51): the accent blue means "this material" in the drawer, on the pages and in Compare, so no
 * family takes a blue (Nylon's and Polymer Blends' had), and PLA and PETG, the two a reader compares most, sit on
 * opposite sides of the wheel (an orange and a teal) instead of two near oranges. The palette is changed here and nowhere
 * else: every chart that colours families reads buildFamilyColors. The rose is the last slot, a small family's, because a
 * red also means a requirement or a fail.
 */
const PALETTE = ['#9b4f8e', '#c1622f', '#4a8f5b', '#8a5a2f', '#a8902a', '#7da83a', '#2f8f8a', '#c4506e'];
const OTHER_COLOR = '#8d8d84';

export function buildFamilyColors(materials: Loose, promoted: Loose[] = []): Loose {
  const counts = new Map();
  for (const m of materials) counts.set(m.family, (counts.get(m.family) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  const named = [...new Set([...promoted, ...ranked])].slice(0, PALETTE.length);
  const map = new Map();
  named.forEach((f, i) => map.set(f, PALETTE[i]));
  return {
    color: (family: Loose) => map.get(family) ?? OTHER_COLOR,
    isOther: (family: Loose) => !map.has(family),
    named,
    other: ranked.filter((f) => !map.has(f)),
  };
}

/**
 * The family colours a chart draws, by one call for every chart (C43): the families a reader asked for take the first
 * colours, so a family filtered for is never the grey "other", then any the legend promoted. A family is one colour in the
 * Ashby chart, the decision view and Parallel lines alike.
 */
export function familyColors({ db, scenario }: Loose): Loose {
  const asked = scenario.constraints.find((c: Loose) => c.kind === 'facet' && c.facet === 'family')?.in ?? [];
  return buildFamilyColors(db.materials, [...asked, ...(scenario.plot.promotedFamilies ?? [])]);
}

