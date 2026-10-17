// Which materials have a page of their own (the owner's answer of 2026-10-16, GOALS-LOG): a material with at least three
// products and twenty measured values with a number. One rule, read by everything that needs it: the build stage that
// writes the pages, the drawer's link to one, the index page, the README's status line and the tests. A family entry is
// a name for a group of materials, never a material, and has none.
//
// Products are the material's active products (materials[].gradeIds, which is exactly its products that are not retired
// and not a reference grade); values are its measurements with a number (measurements[].numeric), those held back or
// flagged implausible included, since they are on file and listed on the page's records.

export const PAGE_RULE = { minProducts: 3, minValues: 20 };

/** The folder the pages are written to, beside the selector's page in dist/ and on the site. */
export const PAGES_DIR = 'materials';

/** What the rule reads of a material: its products and its measured values with a number. `ms` are its measurements. */
export const pageFacts = (m, ms) => ({ products: m.gradeIds.length, values: ms.filter((x) => x.numeric).length });

/** A material's page, as a path relative to the selector's page ('materials/M020.html'), or null where it has none. */
export function pageOf(m, ms) {
  if (m.familyEntry) return null;
  const f = pageFacts(m, ms);
  return f.products >= PAGE_RULE.minProducts && f.values >= PAGE_RULE.minValues ? `${PAGES_DIR}/${m.id}.html` : null;
}
