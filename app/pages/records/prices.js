// Every shop listing of the material's products in the price sample, with its price per kilogram, whether it is used
// for its product's price and, where not, why; a foreign listing says how it became CAD (D113).

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { priceRows, productNameOrId } from '../../js/ui/material-facts.js';
import { noPriceWords, quarantineWords, foreignPriceWords, UNUSED_WORDS } from '../../js/ui/material-words.js';
import { recordTable, headRow, idCell } from './common.js';

export default {
  id: 'prices',
  title: 'Price listings',
  noun: 'listing',
  count: (c) => c.prices.length,
  render(c) {
    const rows = priceRows(c).map((r) => {
      const p = r.p;
      const price = r.perKg != null ? fmtNumber(r.perKg) : r.salePerKg != null ? `${fmtNumber(r.salePerKg)}${r.currency !== 'CAD' ? ` ${r.currency}` : ''} (sale price)` : 'no price';
      const why = r.unused === 'quarantined' ? quarantineWords(p) || UNUSED_WORDS.quarantined : r.unused === 'no-regular' ? noPriceWords(p) : r.unused ? UNUSED_WORDS[r.unused] : r.converted ? foreignPriceWords(p) : '';
      return `<tr data-lid="${esc(r.id)}" data-grade="${esc(p.gradeId)}"><th scope="row">${esc(p.retailer)}</th><td class="raw">${esc(p.variant ?? '')}</td>`
        + `<td>${esc(r.product ? productNameOrId(r.product) : '—')}</td><td class="num">${esc(fmtNumber(p.netMassKg))}</td><td class="num">${esc(price)}${r.converted ? ' <span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`
        + `<td>${esc(p.stock ?? '')}</td><td>${r.used ? 'used' : 'not used'}${why ? `<span class="loc raw">${esc(why)}</span>` : ''}</td><td><time>${esc(p.accessDate ?? '')}</time></td>${idCell(r.id)}</tr>`;
    }).join('');
    return recordTable({
      id: 'prices', title: 'Price listings', n: c.prices.length, noun: 'listing',
      head: headRow([['Retailer'], ['Listing'], ['Product'], ['kg', 'num'], ['CAD/kg', 'num'], ['Stock'], ['Used for the price'], ['Seen'], ['ID']]),
      rows: `<tbody>${rows}</tbody>`, widths: [12, 22, 15, 5, 9, 8, 17, 7, 5], empty: 'No sampled shop listed this material.',
      note: '<p class="rec-note">Sampled listings, not live prices. A product\'s price is the median of its listings\' regular prices per kilogram: Canadian where it has any, otherwise foreign ones converted to CAD (¤).</p>',
    });
  },
};
