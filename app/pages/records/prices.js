// Every shop listing of the material's products in the price sample, grouped by product: its price per kilogram,
// whether it is used for its product's price and, where not, why; a foreign listing says how it became CAD (D113).

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { priceRows, productNameOrId } from '../../js/ui/material-facts.js';
import { noPriceWords, quarantineWords, foreignPriceWords, UNUSED_WORDS } from '../../js/ui/material-words.js';
import { typeSection, flatGroups, idCell } from './common.js';

export default {
  id: 'prices',
  title: 'Price listings',
  noun: 'listing',
  count: (c) => c.prices.length,
  render(c) {
    const by = new Map();
    const rows = priceRows(c).map((r) => ({ r, name: r.product ? productNameOrId(r.product) : 'Product not recorded' }))
      .sort((a, b) => a.name.localeCompare(b.name) || (a.r.id < b.r.id ? -1 : 1));
    for (const { r, name } of rows) {
      const p = r.p;
      const price = r.perKg != null ? fmtNumber(r.perKg) : r.salePerKg != null ? `${fmtNumber(r.salePerKg)}${r.currency !== 'CAD' ? ` ${r.currency}` : ''} (sale price)` : 'no price';
      const why = r.unused === 'quarantined' ? quarantineWords(p) || UNUSED_WORDS.quarantined : r.unused === 'no-regular' ? noPriceWords(p) : r.unused ? UNUSED_WORDS[r.unused] : r.converted ? foreignPriceWords(p) : '';
      const html = `<tr data-lid="${esc(r.id)}" data-grade="${esc(p.gradeId)}"><th scope="row">${esc(p.retailer)}</th><td class="raw">${esc(p.variant ?? '')}</td>`
        + `<td class="v">${esc(fmtNumber(p.netMassKg))}<small> kg</small></td><td class="v">${esc(price)}${r.converted ? '<span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`
        + `<td class="kind">${esc(p.stock ?? '')}</td><td class="drawn"><span class="bd${r.used ? '' : ' bd--not'}">${r.used ? 'Used' : 'Not used'}</span>${why ? `<small class="raw">${esc(why)}</small>` : ''}</td><td class="kind"><time>${esc(p.accessDate ?? '')}</time></td>${idCell(r.id)}</tr>`;
      (by.get(name) ?? by.set(name, []).get(name)).push(html);
    }
    return typeSection({
      id: 'prices', title: 'Price listings', n: c.prices.length, noun: 'listing',
      body: flatGroups({
        groups: [...by].map(([label, rs]) => [label, rs]), noun: 'listing', cls: 'rt--l',
        cols: [['Retailer', 'p'], ['Listing', 'raw'], ['Mass', 'v'], ['CAD/kg', 'v'], ['Stock', 'kind'], ['For the product\'s price', 'drawn'], ['Seen', 'kind'], ['ID', 'id']],
      }),
      empty: 'No sampled shop listed this material.',
      note: '<p class="rs-note">Sampled listings, not live prices, by product. A product\'s price is the median of its listings\' regular prices per kilogram: Canadian where it has any, otherwise foreign ones converted to CAD (¤).</p>',
    });
  },
};
