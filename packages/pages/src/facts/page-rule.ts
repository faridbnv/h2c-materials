// Which materials have a page of their own (the owner's answer of 2026-10-16, GOALS-LOG): a material with at least three
// products and twenty measured values with a number. One rule, read by everything that needs it: the build stage that
// writes the pages, the drawer's link to one, the index page, the README's status line and the tests. A family entry is
// a name for a group of materials, never a material, and has none.
//
// Products are the material's active products (materials[].gradeIds, which is exactly its products that are not retired
// and not a reference grade); values are its measurements with a number (measurements[].numeric), those held back or
// flagged implausible included, since they are on file and listed on the page's records.

import type { Loose } from '../loose.ts';

export const PAGE_RULE = { minProducts: 3, minValues: 20 };

/** The folder the pages are written to, beside the selector's page in dist/ and on the site. */
export const PAGES_DIR = 'materials';

/** A material's Products page, beside its Overview ('M020-products.html'), and an anchor on it ('#G001-01' opens that product's card, '#V000050' a value in it). */
export const productsHref = (id: Loose, anchor = '') => `${id}-products.html${anchor}`;

/** What the rule reads of a material: its products and its measured values with a number. `ms` are its measurements. */
export const pageFacts = (m: Loose, ms: Loose): Loose => ({ products: m.gradeIds.length, values: ms.filter((x: Loose) => x.numeric).length });

/** A material's page, as a path relative to the selector's page ('materials/M020.html'), or null where it has none. */
export function pageOf(m: Loose, ms: Loose): Loose {
  if (m.familyEntry) return null;
  const f = pageFacts(m, ms);
  return f.products >= PAGE_RULE.minProducts && f.values >= PAGE_RULE.minValues ? `${PAGES_DIR}/${m.id}.html` : null;
}

/**
 * A material's Products page, as a path relative to the selector's page ('materials/M020-products.html'), or null where
 * the material has no page; with a product's ID, that product's card on it ('materials/M020-products.html#G020-01').
 */
export function productsPageOf(m: Loose, ms: Loose, gradeId: Loose = null): Loose {
  return pageOf(m, ms) ? `${PAGES_DIR}/${productsHref(m.id, gradeId ? `#${gradeId}` : '')}` : null;
}

/** The rule in words, its numbers PAGE_RULE's: "3 products and 20 measured values". */
export const pageRuleWords = () => `${PAGE_RULE.minProducts} products and ${PAGE_RULE.minValues} measured values`;

/**
 * Why a material has no page, as what it falls short on ("2 products", "2 products and 15 measured values"), or null
 * where it has one. A family entry has none for another reason (it is not a material) and gets null here too.
 */
export function shortOf(m: Loose, ms: Loose): Loose {
  if (m.familyEntry || pageOf(m, ms)) return null;
  const f = pageFacts(m, ms);
  const say = (n: Loose, one: Loose, many: Loose) => `${n.toLocaleString('en-CA')} ${n === 1 ? one : many}`;
  return [f.products < PAGE_RULE.minProducts ? say(f.products, 'product', 'products') : null,
    f.values < PAGE_RULE.minValues ? say(f.values, 'measured value', 'measured values') : null].filter(Boolean).join(' and ');
}
