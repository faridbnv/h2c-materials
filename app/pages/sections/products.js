// Products: every product of the material, by maker, with its own key values as the build chose them (the selector
// table's columns), its print window, its price, and under its name what sets it apart. Each value is
// marked as the figures mark it; each row is the anchor a dot leads to (#product-<id>), and its name opens its records.

import { esc, tableBox, recordsHref, count } from '../html.js';
import { fmtBounded } from '../../js/ui/format.js';
import { tableHeadlines } from '../../js/ui/registry.js';
import { productRows } from '../../js/ui/material-facts.js';
import { windowText, settingWords, EMPTY_LINES } from '../../js/ui/material-words.js';
import { emptyBody } from './common.js';

/** A cell's mark, as the figures mark a dot: hollow (no stated orientation or load, or a setting read from the guide),
 *  square (annealed), diamond (special formulation). One element with its kinds as classes; pure CSS, so a long table
 *  stays light. A plain value has none. */
const vm = (kinds) => (kinds.length ? `<i class="vm ${kinds.map((k) => `vm--${k}`).join(' ')}" aria-hidden="true"></i>` : '');

/** A product's print setting in a column headed °C: its window, or what it states instead. */
function setting(a) {
  if (!a) return { text: '', v: '' };
  if (a.state === 'range') return { text: windowText(a.min, a.max), v: a.max ?? a.min ?? '' };
  return { text: settingWords(a), v: '' };
}

export default {
  id: 'products',
  title: 'Products',
  records: '#measurements',
  render(c) {
    const rows = productRows(c);
    if (!rows.length) return { empty: true, html: emptyBody(c, EMPTY_LINES.Grades, { tab: 'Grades' }), stats: {} };
    const hs = tableHeadlines();
    const byName = (a, b) => (a.maker ?? '~').localeCompare(b.maker ?? '~') || a.name.localeCompare(b.name);
    const kinds = new Set();
    const body = [...rows].sort(byName).map((r) => {
      const cells = hs.map((h) => {
        const v = r.values[h.key];
        if (!v) return '<td class="num" data-v=""></td>';
        const marks = [v.level === 'as-published' ? 'open' : '', v.anneal ? 'annealed' : '', r.variant && h.kind !== 'price' ? 'variant' : ''].filter(Boolean);
        marks.forEach((k) => kinds.add(k));
        if (v.converted) kinds.add('converted');
        return `<td class="num" data-v="${esc(v.value)}">${vm(marks)}${esc(fmtBounded(v.value, null, v.interval))}${v.converted ? '<span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`;
      }).join('');
      const p = r.print;
      const settings = ['nozzle', 'bed'].map((axis) => {
        const s = setting(p?.[axis]);
        const guide = p?.from?.[axis]?.origin === 'guide';
        if (guide && s.text) kinds.add('guide');
        return `<td class="num" data-v="${esc(s.v)}">${guide && s.text ? vm(['open']) : ''}${esc(s.text)}</td>`;
      }).join('');
      const shared = [...new Set([...Object.values(r.values).map((v) => v.from?.label), ...Object.values(p?.from ?? {}).filter((f) => f.origin === 'twin').map((f) => f.label)].filter(Boolean))];
      const notes = [r.toughened ? 'sold as toughened (the maker\'s statement)' : null, r.product ? null : 'a resin or study reference, not a product', ...shared].filter(Boolean);
      // A special formulation's reason is the database's own words (grades.csv, Variant), shown as recorded.
      const variant = r.variant ? `special formulation: <span class="raw">${esc(r.variant)}</span>` : '';
      return `<tr id="product-${esc(r.id)}" data-grade="${esc(r.id)}"><th scope="row" data-v="${esc(r.name.toLowerCase())}"><a href="${esc(recordsHref(c.m.id, `#product=${r.id}`))}" data-grade="${esc(r.id)}">${esc(r.name)}</a>`
        + `${variant || notes.length ? `<span class="row-note">${[variant, ...notes.map(esc)].filter(Boolean).join('; ')}</span>` : ''}</th>`
        + `${cells}${settings}</tr>`;
    }).join('');
    const sortable = (label, unit, kind, cls = '') => `<th scope="col"${cls ? ` class="${cls}"` : ''} data-sort="${kind}"><button type="button">${esc(label)}${unit ? `<span class="u">${esc(unit)}</span>` : ''}</button></th>`;
    const head = `<thead><tr>${sortable('Product', '', 'text')}${hs.map((h) => sortable(h.labels.short, h.unit, 'num', 'num')).join('')}`
      + `${sortable('Nozzle', '°C', 'num', 'num')}${sortable('Bed', '°C', 'num', 'num')}</tr></thead>`;
    const key = [
      kinds.has('open') ? '<li><i class="vm vm--open"></i> no stated orientation or test load: not compared</li>' : '',
      kinds.has('annealed') ? '<li><i class="vm vm--annealed"></i> measured after annealing</li>' : '',
      kinds.has('variant') ? '<li><i class="vm vm--variant"></i> special formulation, left out of the median</li>' : '',
      kinds.has('guide') ? '<li><i class="vm vm--open"></i> setting read from the Bambu Lab Filament Guide</li>' : '',
      kinds.has('converted') ? '<li><span class="fx">¤</span> price converted from a foreign listing</li>' : '',
    ].join('');
    const products = rows.filter((r) => r.product).length, refs = rows.length - products;
    const lead = `${count(products, 'product')} you can buy${refs ? `, and ${count(refs, 'resin or study reference')} that ${refs === 1 ? 'is' : 'are'} not a product` : ''}, by maker. Each value is the product's own, as the build chose it from its records; a blank cell is not published. Select a column to sort; a product's name opens its records.`;
    const html = `<p class="lead">${esc(lead)}</p>${key ? `<ul class="fig-key table-key">${key}</ul>` : ''}`
      + tableBox(`<table class="grid products" data-sortable>${head}<tbody>${body}</tbody></table>`, 'products-box')
      + '<p class="fig-note">Colours are not tracked here. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</p>';
    return { empty: false, html, stats: { rows: rows.length } };
  },
};
