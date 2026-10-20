// The order a material's products are listed in when nothing else is asked: most documented first. One rule, read by the
// Products page (its opening order, and the sort it returns to) and by the drawer's Products tab (the products that meet
// the requirements), so the two surfaces cannot put different products first (coherence round, 2026-10-18, C35).
//
// A product is documented by the key values it publishes: the measured headlines that apply to the material, those
// compared (not set apart, D172) counted before those published as printed, then the maker
// and the name, so the order is the same on every load.

import { REGISTRY } from './registry.js';
import { stated, productNameOrId } from './material-facts.js';

/** The row the order reads: a product's headline values, its maker (null where none is stated) and its name. */
export const orderRow = (g) => ({ g, values: g.headline ?? {}, maker: stated(g.manufacturer) ? g.manufacturer : null, name: productNameOrId(g) });

/**
 * Rows (each { values, maker, name }: material-facts.js productRows' rows, or orderRow's) most documented first, as a new
 * array. `m` is the material, whose not-applicable headlines are not counted against a product.
 */
export function mostDocumentedFirst(m, rows) {
  const keyProps = REGISTRY.allHeadlines.filter((h) => h.kind === 'measurement' && !m.headline?.[h.key]?.notApplicable);
  const docs = (r) => { const p = keyProps.filter((h) => r.values[h.key]); return [p.length, p.filter((h) => r.values[h.key].level !== 'as-published').length]; };
  return rows.map((r) => ({ r, d: docs(r) }))
    .sort((a, b) => b.d[0] - a.d[0] || b.d[1] - a.d[1] || (a.r.maker ?? '~').localeCompare(b.r.maker ?? '~') || a.r.name.localeCompare(b.r.name))
    .map((x) => x.r);
}
