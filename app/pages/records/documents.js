// Every document the material's records cite (material-facts.js documents, sourceBlockFacts): what it is, when it was
// read, which products it covers, what it gave, and the link to its original where one can be opened.

import { esc } from '../html.js';
import { sourceBlockFacts } from '../../js/ui/material-facts.js';
import { gaveWords } from '../../js/ui/material-words.js';
import { sourceKind } from '../../js/ui/labels.js';
import { recordTable, headRow, idCell } from './common.js';

export default {
  id: 'documents',
  title: 'Documents',
  noun: 'document',
  count: (c) => c.documents.size,
  render(c) {
    const docs = [...c.documents].map(([sid, d]) => sourceBlockFacts(sid, d, c))
      .sort((a, b) => (a.s?.publisher ?? '~').localeCompare(b.s?.publisher ?? '~') || a.name.localeCompare(b.name));
    const rows = docs.map((f) => {
      const o = f.original;
      const link = o && !o.local ? `<a href="${esc(o.url)}" rel="noopener" target="_blank">Open the original (${esc(o.kind)})</a>` : o ? 'held as a local file' : '—';
      return `<tr id="doc-${esc(f.sid)}" data-sid="${esc(f.sid)}" data-grade="${esc([...c.documents.get(f.sid).grades].join(' '))}"><th scope="row" class="src">${esc(f.name)}</th><td>${esc(sourceKind(f.s))}</td>`
        + `<td><time>${esc(f.accessDate ?? '—')}</time></td><td>${esc(f.covers.join(', ') || '—')}</td><td>${esc(gaveWords(f.gave).join(', ') || '—')}</td><td>${link}</td>${idCell(f.sid)}</tr>`;
    }).join('');
    return recordTable({
      id: 'documents', title: 'Documents', n: docs.length, noun: 'document',
      head: headRow([['Document'], ['Kind'], ['Read'], ['Covers'], ['Gave'], ['Original'], ['ID']]),
      rows: `<tbody>${rows}</tbody>`, widths: [24, 11, 8, 20, 17, 13, 7], empty: 'No document is on file for this material.',
      note: '<p class="rec-note">One document can cover several products. An original opens in a new tab and needs an internet connection.</p>',
    });
  },
};
