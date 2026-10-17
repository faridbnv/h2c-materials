// Every document the material's records cite (material-facts.js documents, sourceBlockFacts), grouped by publisher:
// what it is, when it was read, which products it covers, what it gave, the link to its original where one can be
// opened, and a link that lists every record it gave.

import { esc } from '../html.js';
import { sourceBlockFacts } from '../../js/ui/material-facts.js';
import { gaveWords } from '../../js/ui/material-words.js';
import { sourceKind } from '../../js/ui/labels.js';
import { typeSection, flatGroups, idCell } from './common.js';

/** A list of names, the first few in the cell and the rest a tap away. */
function names(list, shown = 3) {
  if (!list.length) return '—';
  if (list.length <= shown + 1) return esc(list.join(', '));
  return `<details class="ch ch--plain"><summary>${esc(`${list.slice(0, shown).join(', ')} and ${list.length - shown} more`)}</summary><span>${esc(list.join(', '))}</span></details>`;
}

export default {
  id: 'documents',
  title: 'Documents',
  noun: 'document',
  count: (c) => c.documents.size,
  render(c) {
    const docs = [...c.documents].map(([sid, d]) => sourceBlockFacts(sid, d, c))
      .sort((a, b) => (a.s?.publisher ?? '~').localeCompare(b.s?.publisher ?? '~') || a.name.localeCompare(b.name));
    const by = new Map();
    for (const f of docs) {
      const o = f.original;
      const link = o && !o.local ? `<a href="${esc(o.url)}" rel="noopener" target="_blank">Open the original (${esc(o.kind)})</a>` : o ? 'held as a local file' : '—';
      const gave = gaveWords(f.gave);
      const html = `<tr id="doc-${esc(f.sid)}" data-sid="${esc(f.sid)}" data-grade="${esc([...c.documents.get(f.sid).grades].join(' '))}"><th scope="row">${esc(f.name)}</th>`
        + `<td class="kind">${esc(sourceKind(f.s))}<small><time>${esc(f.accessDate ? `read ${f.accessDate}` : 'date read not recorded')}</time></small></td>`
        + `<td class="cd">${names(f.covers)}</td><td class="cd">${esc(gave.join(', ') || '—')}${gave.length ? `<a class="rf-go" href="#doc=${esc(encodeURIComponent(f.sid))}">List its records</a>` : ''}</td><td class="src">${link}</td>${idCell(f.sid)}</tr>`;
      const pub = f.s?.publisher && f.s.publisher !== 'Not recorded' ? f.s.publisher : 'Publisher not recorded';
      (by.get(pub) ?? by.set(pub, []).get(pub)).push(html);
    }
    return typeSection({
      id: 'documents', title: 'Documents', n: docs.length, noun: 'document',
      body: flatGroups({
        groups: [...by].map(([label, rs]) => [label, rs]), noun: 'document', cls: 'rt--d',
        cols: [['Document', 'p'], ['Kind', 'kind'], ['Covers', 'cd'], ['Gave', 'cd'], ['Original', 'src'], ['ID', 'id']],
      }),
      empty: 'No document is on file for this material.',
      note: '<p class="rs-note">By publisher. One document can cover several products. An original opens in a new tab and needs an internet connection.</p>',
    });
  },
};
