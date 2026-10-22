/**
 * Whether a product's value for one headline is its sibling's table again, which the material's median counts once (owner ruling
 * OQ-09 A; the build's `distinct`, packages/build/src/products.ts). It is a comparable value a twin reads from the sibling that shares its
 * data sheet (D89; the same Shared formulation key, so never a product that reprints another material's table, R166), and the product is
 * not a declared variant: a variant's values, and any value set apart (level `as-published`), are kept out of the median whether they are
 * a reprint or not.
 *
 * One rule for the build, which excludes these entries from the median, and for the pages, which say that a value is counted once: a page
 * must not claim of a set-apart value what the median does not do. `variant` is the entry's own flag as the build sets it (the product is a
 * declared variant, or reads a variant sibling's sheet, unless every product of the material is a variant).
 */
export interface SpreadEntryLike {
  readonly variant?: unknown;
  readonly v?: { readonly level?: unknown; readonly from?: { readonly origin?: unknown } | null } | null;
}

export const COMPARABLE_LEVEL = 'comparable';

export const isReprintEntry = (entry: SpreadEntryLike): boolean =>
  !entry.variant && entry.v?.level === COMPARABLE_LEVEL && entry.v?.from?.origin === 'twin';
