// Products, on the Overview (the pages reimagined, 2026-10-17): not a table but the hand-off to the material's Products
// page. Who makes it (its products by maker, most first), the products that stand out (track B's lines, a fact each,
// never a verdict), and the page's one primary button, "Compare the N products". The table, its cards and every record
// behind them are the Products page's (app/pages/products/).
//
// A bare section: it writes its own plate and heading, and the bar's section list leaves it out (the list ends with the
// Products page itself).

import { esc, productsHref } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { isProduct, stated } from '../../js/ui/material-facts.js';
import { plural, andList } from '../../js/ui/material-words.js';
import * as F from '../findings.js';

/** The makers, most products first: "eSUN 21, Spectrum 19 … and 32 more makers", or their names where each makes one. */
function makersLine(products) {
  const by = new Map();
  for (const g of products) { const k = stated(g.manufacturer) ? g.manufacturer : null; if (k) by.set(k, (by.get(k) ?? 0) + 1); }
  const list = [...by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!list.length) return '';
  if (list.every(([, n]) => n === 1)) return `${list.length === 1 ? 'Made by' : 'By'} ${andList(list.map(([k]) => k))}.`;
  const shown = list.slice(0, 8).map(([k, n]) => `${k} ${fmtNumber(n)}`);
  return list.length > 8 ? `${shown.join(', ')} and ${plural(list.length - 8, 'more maker')}.` : `${andList(shown)}.`;
}

/** Words track B gives as a string or a Say ({ text, html }, its markup already escaped). */
const sayHtml = (x) => (x == null ? '' : typeof x === 'string' ? esc(x) : x.html ?? esc(x.text ?? ''));

/**
 * A stand-out line: words, or { text, html, gradeId } where it names one product (B's markup links the product's name
 * to its card on the Products page); a line without B's markup links as a whole.
 */
function standOut(c, line) {
  if (!line) return '';
  if (typeof line === 'string') return `<li>${esc(line)}</li>`;
  const grade = line.gradeId ? ` data-grade="${esc(line.gradeId)}"` : '';
  if (line.html) return `<li${grade}>${line.html}</li>`;
  const text = esc(line.text ?? '');
  return line.gradeId ? `<li${grade}><a href="${esc(productsHref(c.m.id, `#${line.gradeId}`))}"${grade}>${text}</a></li>` : `<li>${text}</li>`;
}

export default {
  id: 'products',
  title: 'Products',
  bare: true,
  menu: false,
  render(c) {
    const products = c.grades.filter(isProduct);
    if (!products.length) return { empty: true, html: '', stats: {} };
    const makers = new Set(products.map((g) => g.manufacturer).filter(stated)).size;
    const b = typeof F.productsHandoffWords === 'function' ? F.productsHandoffWords(c) : null;
    const lede = b?.lede ? sayHtml(b.lede) : esc(`${plural(products.length, 'product')} from ${plural(makers, 'maker')}. ${makersLine(products)}`);
    const lines = typeof F.standOutLines === 'function' ? F.standOutLines(c) ?? [] : [];
    const button = b?.button ?? (products.length === 1 ? 'See the product' : `Compare the ${fmtNumber(products.length)} products`);
    const html = `<section class="handoff plate" id="products" data-section="products" aria-labelledby="products-h">
<div class="handoff-text">
<h2 id="products-h">Products</h2>
<p class="handoff-makers">${lede}</p>
${lines.length ? `<ul class="stand">${lines.map((l) => standOut(c, l)).join('')}</ul>` : ''}
${b?.closing ? `<p class="handoff-note">${sayHtml(b.closing)}</p>` : ''}
</div>
<a class="btn btn-primary" href="${esc(productsHref(c.m.id))}">${esc(button)}</a>
</section>`;
    return { html, empty: false, stats: {} };
  },
};
