// The reviewers' notes on the material (its coverage rows, superseded ones left out): the known gaps first (what is
// missing, uncertain or contested), then the notes on settled questions, each in the reviewer's words.

import { esc } from '../html.js';
import { gapSplit } from '../../js/ui/material-facts.js';
import { typeSection, flatGroups, idCell } from './common.js';

export default {
  id: 'review-notes',
  title: 'Known gaps and review notes',
  noun: 'note',
  count: (c) => { const { gaps, notes } = gapSplit(c.cov); return gaps.length + notes.length; },
  render(c) {
    const { gaps, notes } = gapSplit(c.cov);
    const row = (r) => `<tr data-cid="${esc(r.derived ? '' : r.id)}" data-grade="${esc(r.gradeId ?? '')}"><th scope="row">${esc(r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain)}</th>`
      + `<td class="kind">${esc(r.status)}</td><td class="q raw">${esc(r.finding ?? '')}</td>${r.derived ? '<td class="id"></td>' : idCell(r.id)}</tr>`;
    return typeSection({
      id: 'review-notes', title: 'Known gaps and review notes', n: gaps.length + notes.length, noun: 'note',
      body: flatGroups({
        groups: [['Known gaps', gaps.map(row)], ['Review notes', notes.map(row)]].filter(([, rs]) => rs.length), noun: 'note', cls: 'rt--n',
        cols: [['Domain', 'p'], ['Status', 'kind'], ['In the reviewer\'s words', 'q'], ['ID', 'id']],
      }),
      empty: 'No gap, limitation, conflict or review note is recorded for this material.',
    });
  },
};
