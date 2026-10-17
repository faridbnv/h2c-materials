// Sources: where every number comes from. The documents the material's records cite (material-facts.js documents), by
// kind and by publisher, when they were read; the known gaps, in the reviewer's words (coverage rows a reader is shown,
// common.js shownGap; the maintainers' notes leave the pages); and, closed, every document with what it gave and the
// link to its original. Each product's values, with their document and page, are on its card on the Products page.

import { esc, tableBox } from '../html.js';
import { gapSplit, sourceBlockFacts } from '../../js/ui/material-facts.js';
import { fmtNumber } from '../../js/ui/format.js';
import { sourceKind } from '../../js/ui/labels.js';
import { plural, andList } from '../../js/ui/material-words.js';
import { daysWords, dayWords } from '../findings.js';
import { para, subhead, shownGap, gapItem } from './common.js';

/** How many publishers the table names; the rest are counted, and every document is in the list below. */
const PUBLISHERS = 12;

/** A kind of document in a sentence, one and many. */
const KIND_ONE = {
  'Data sheet': 'data sheet', 'Maker\'s product page or guide': 'maker\'s product page or guide', 'Safety data sheet': 'safety data sheet',
  'Resin supplier\'s data sheet': 'resin supplier\'s data sheet', 'Retailer listing': 'retailer listing', 'Printer documentation': 'printer document',
  'Peer-reviewed study': 'peer-reviewed study', 'Safety guidance': 'safety guidance document', Reference: 'reference',
};
const KIND_MANY = {
  'Data sheet': 'data sheets', 'Maker\'s product page or guide': 'makers\' product pages and guides', 'Safety data sheet': 'safety data sheets',
  'Resin supplier\'s data sheet': 'resin suppliers\' data sheets', 'Retailer listing': 'retailer listings', 'Printer documentation': 'printer documents',
  'Peer-reviewed study': 'peer-reviewed studies', 'Safety guidance': 'safety guidance documents', Reference: 'references',
};

/** What a document gave, in a list: "12 values", "print settings", "3 maker statements". */
const gaveWords = (g) => [g.values ? plural(g.values, 'value') : null, g.profiles ? 'print settings' : null, g.statements ? plural(g.statements, 'maker statement') : null,
  g.environment ? plural(g.environment, 'statement on chemicals or use', 'statements on chemicals or use') : null, g.guide ? 'its Filament Guide column' : null].filter(Boolean);

export default {
  id: 'sources',
  title: 'Sources',
  render(c) {
    const m = c.m;
    const docs = [...c.documents].map(([sid, d]) => sourceBlockFacts(sid, d, c));
    // The material's own gaps a reader is shown (common.js shownGap, the one rule the Products page's placement reads too).
    const gaps = gapSplit(c.cov).gaps.filter(shownGap);
    if (!docs.length && !gaps.length) return { empty: true, html: '', stats: {} };
    const parts = [];
    if (docs.length) {
      const dates = docs.map((d) => d.accessDate).filter(Boolean).sort();
      const kinds = new Map();
      for (const d of docs) kinds.set(sourceKind(d.s), (kinds.get(sourceKind(d.s)) ?? 0) + 1);
      const kindList = [...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${fmtNumber(n)} ${(n === 1 ? KIND_ONE : KIND_MANY)[k] ?? k.toLowerCase()}`);
      const publishers = new Map();
      for (const d of docs) {
        const p = d.s?.publisher ?? 'Publisher not named';
        const x = publishers.get(p) ?? { documents: 0, values: 0, products: new Set() };
        x.documents++;
        x.values += d.gave.values ?? 0;
        for (const id of c.documents.get(d.sid).grades) x.products.add(id);
        publishers.set(p, x);
      }
      parts.push(para([`${plural(docs.length, 'document')} from ${plural(publishers.size, 'publisher')} (${andList(kindList)})${dates.length ? `, read ${daysWords(dates[0], dates.at(-1))}` : ''}.`,
        `Each value on ${m.name}'s Products page names its document and page, and links to the original.`]));
      const ranked = [...publishers].sort((a, b) => b[1].documents - a[1].documents || b[1].values - a[1].values || a[0].localeCompare(b[0]));
      const rest = ranked.slice(PUBLISHERS);
      parts.push(tableBox(`<table class="grid publishers"><thead><tr><th scope="col">Publisher</th><th scope="col" class="num">Documents</th><th scope="col" class="num">Values</th><th scope="col" class="num">Products</th></tr></thead><tbody>`
        + ranked.slice(0, PUBLISHERS).map(([p, x]) => `<tr><th scope="row">${esc(p)}</th><td class="num">${x.documents}</td><td class="num">${fmtNumber(x.values)}</td><td class="num">${x.products.size}</td></tr>`).join('')
        + (rest.length ? `<tr class="apart"><td colspan="4">${esc(`and ${plural(rest.length, 'more publisher')}, with ${plural(rest.reduce((n, [, x]) => n + x.documents, 0), 'document')}`)}</td></tr>` : '')
        + '</tbody></table>'));
    }
    if (gaps.length) parts.push(`${subhead('Known gaps', 'known-gaps')}<ul class="gaps">${gaps.map(gapItem).join('')}</ul>`);
    if (docs.length) {
      const sorted = [...docs].sort((a, b) => String(a.s?.publisher ?? '').localeCompare(String(b.s?.publisher ?? '')) || String(a.s?.title ?? '').localeCompare(String(b.s?.title ?? '')));
      const item = (d) => {
        const title = [d.s?.publisher, d.s?.title].filter(Boolean).join(', ') || 'Untitled document';
        const link = d.original && !d.original.local ? `<a href="${esc(d.original.url)}" rel="noopener">${esc(title)}</a>` : esc(title);
        const gave = gaveWords(d.gave);
        const covers = d.covers.length && d.covers.length <= 3 ? `, for ${andList(d.covers)}` : d.covers.length > 3 ? `, for ${d.covers.length} products` : '';
        return `<li class="doc" data-rec="${esc(d.sid)}">${link} <span class="doc-meta">${esc(`${sourceKind(d.s)}${d.accessDate ? `, read ${dayWords(d.accessDate)}` : ''}${gave.length ? `; gave ${andList(gave)}` : ''}${covers}`)}${d.original?.kind ? ` <span class="doc-kind">${esc(d.original.kind)}</span>` : ''}</span></li>`;
      };
      parts.push(`<details class="more docs" id="documents"><summary>${esc(`Every document (${fmtNumber(docs.length)})`)}</summary><ul class="doc-list">${sorted.map(item).join('')}</ul></details>`);
    }
    return { empty: false, html: parts.join('\n'), stats: { documents: docs.length, gaps: gaps.length } };
  },
};
