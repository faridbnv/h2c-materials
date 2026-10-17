// The reviewers' notes on the material (its coverage rows, superseded ones left out): the known gaps first, what is
// missing, uncertain or contested, then the notes on settled questions, each in the reviewer's words.

import { esc } from '../html.js';
import { gapSplit } from '../../js/ui/material-facts.js';
import { recordTable, headRow, idCell } from './common.js';

export default {
  id: 'review-notes',
  title: 'Known gaps and review notes',
  noun: 'note',
  count: (c) => { const { gaps, notes } = gapSplit(c.cov); return gaps.length + notes.length; },
  render(c) {
    const { gaps, notes } = gapSplit(c.cov);
    const row = (r) => `<tr data-cid="${esc(r.derived ? '' : r.id)}" data-grade="${esc(r.gradeId ?? '')}"><th scope="row">${esc(r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain)}</th>`
      + `<td>${esc(r.status)}</td><td class="raw">${esc(r.finding ?? '')}</td>${r.derived ? '<td class="id"></td>' : idCell(r.id)}</tr>`;
    const rows = `${gaps.length ? `<tbody><tr class="group"><th scope="rowgroup" colspan="4">Known gaps: ${gaps.length}</th></tr>${gaps.map(row).join('')}</tbody>` : ''}`
      + `${notes.length ? `<tbody><tr class="group"><th scope="rowgroup" colspan="4">Review notes: ${notes.length}</th></tr>${notes.map(row).join('')}</tbody>` : ''}`;
    return recordTable({
      id: 'review-notes', title: 'Known gaps and review notes', n: gaps.length + notes.length, noun: 'note',
      head: headRow([['Domain'], ['Status'], ['In the reviewer\'s words'], ['ID']]), rows, widths: [16, 14, 62, 8],
      empty: 'No gap, limitation, conflict or review note is recorded for this material.',
    });
  },
};
