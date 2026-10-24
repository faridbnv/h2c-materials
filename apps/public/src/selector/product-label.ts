// A product as a reader names it: its maker and product, the maker once (the old brief.js productLabel; the decision brief of WP-27 reads it too).
import type { Loose } from '@atlas/pages/loose';

export function productLabel(g: Loose): string {
  const product = g?.product && !/^Not /.test(g.product) ? g.product : '';
  const maker = g?.manufacturer && !/^Not /.test(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker || g?.id || '';
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
}
