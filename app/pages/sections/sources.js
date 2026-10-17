// Sources: the documents the material's records cite (material-facts.js documents), counted by kind and by publisher,
// when they were read, and the known gaps in the reviewer's words. Every document, with what it covers and gave and the
// link to its original, is on the records page.

import { esc, tableBox, count } from '../html.js';
import { gapSplit, sourceBlockFacts } from '../../js/ui/material-facts.js';
import { plural, EMPTY_LINES } from '../../js/ui/material-words.js';
import { sourceKind } from '../../js/ui/labels.js';
import { emptyBody, recordsLink, gapList, findingsBlock } from './common.js';

/** How many publishers the page lists by name; the rest are counted, and every one is on the records page. */
const PUBLISHERS = 12;

export default {
  id: 'sources',
  title: 'Sources and known gaps',
  records: '#documents',
  render(c) {
    const docs = [...c.documents].map(([sid, d]) => sourceBlockFacts(sid, d, c));
    const { gaps, notes } = gapSplit(c.cov);
    // The known gaps a reader is shown, in the reviewer's words; the other gaps and the notes on settled questions are
    // counted, and are on the records page.
    const gapHtml = `<h3 class="sub-title" id="known-gaps">Known gaps</h3>${gaps.length ? '' : `<p class="empty">${esc(EMPTY_LINES.gaps)}</p>`}${gapList(c, gaps, notes.length)}`;
    if (!docs.length) return { empty: true, html: emptyBody(c, EMPTY_LINES.Evidence, { tab: 'Evidence', anchor: '#documents' }) + gapHtml, stats: {} };
    const dates = docs.map((d) => d.accessDate).filter(Boolean).sort();
    const kinds = new Map();
    for (const d of docs) kinds.set(sourceKind(d.s), (kinds.get(sourceKind(d.s)) ?? 0) + 1);
    const publishers = new Map();
    for (const d of docs) {
      const p = d.s?.publisher ?? 'Publisher not named';
      const x = publishers.get(p) ?? { documents: 0, values: 0, products: new Set() };
      x.documents++;
      x.values += d.gave.values ?? 0;
      for (const id of c.documents.get(d.sid).grades) x.products.add(id);
      publishers.set(p, x);
    }
    const ranked = [...publishers].sort((a, b) => b[1].documents - a[1].documents || b[1].values - a[1].values || a[0].localeCompare(b[0]));
    const shown = ranked.slice(0, PUBLISHERS);
    const rest = ranked.slice(PUBLISHERS);
    const top = [...kinds].sort((a, b) => b[1] - a[1])[0];
    // A date is never broken at its hyphens (U+2060, word joiner).
    const day = (d) => String(d).replace(/-/g, '\u2060-\u2060');
    const sheets = top?.[0] === 'Data sheet' ? (top[1] === docs.length ? ', all of them data sheets' : `, ${top[1]} of them data sheets`) : '';
    const lead = [`${count(docs.length, 'document')} from ${count(publishers.size, 'publisher')}${sheets}${dates.length ? `, read between ${day(dates[0])} and ${day(dates.at(-1))}` : ''}.`,
      'Every value traces to one of them, with its page and its test conditions.'];
    const kindTable = tableBox(`<table class="grid kinds"><thead><tr><th scope="col">Kind of document</th><th scope="col" class="num">Documents</th></tr></thead><tbody>${[...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><th scope="row">${esc(k)}</th><td class="num">${n}</td></tr>`).join('')}</tbody></table>`);
    const pubTable = tableBox(`<table class="grid publishers"><thead><tr><th scope="col">Publisher</th><th scope="col" class="num">Documents</th><th scope="col" class="num">Values given</th><th scope="col" class="num">Products covered</th></tr></thead><tbody>${shown.map(([p, x]) => `<tr><th scope="row">${esc(p)}</th><td class="num">${x.documents}</td><td class="num">${x.values}</td><td class="num">${x.products.size}</td></tr>`).join('')}`
      + `${rest.length ? `<tr class="apart"><td colspan="4">${esc(`And ${plural(rest.length, 'more publisher')}, with ${plural(rest.reduce((n, [, x]) => n + x.documents, 0), 'document')}.`)}</td></tr>` : ''}</tbody></table>`);
    const html = `${findingsBlock(lead)}<div class="split">${pubTable}${kindTable}</div>
<p class="note">${recordsLink(c, '#documents', 'Every document, with what it covers and gave and a link to the original')}.</p>${gapHtml}`;
    return { empty: false, html, stats: { documents: docs.length } };
  },
};
