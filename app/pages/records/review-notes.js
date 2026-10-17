// The reviewers' notes on the material (its coverage rows, superseded ones left out): the known gaps first (what is
// missing, uncertain or contested), in the reviewer's words; then, closed at the end in a quieter style as notes for the
// data's maintainers, the notes on settled questions and any gap whose words cite the data's own rulings, migrations
// and records ("ruling R166, m123-…, C01334"), which are for whoever keeps the tables, not for choosing a filament.

import { esc, count } from '../html.js';
import { gapSplit } from '../../js/ui/material-facts.js';
import { typeSection, flatGroups, idCell } from './common.js';

/** The data's own references in a reviewer's words: a ruling (R166), a migration (m123-…), a record or document ID. */
const INTERNAL = /\b(?:R\d{3}|m\d{2,3}-[\w-]+|[CGPQV]\d{3,6}(?:-R?\d+)?|[A-Z]-[A-Z0-9]+-[\w-]+)\b/;

const cols = [['Domain', 'p'], ['Status', 'kind'], ['In the reviewer\'s words', 'q'], ['ID', 'id']];

export default {
  id: 'review-notes',
  title: 'Known gaps and review notes',
  noun: 'note',
  count: (c) => { const { gaps, notes } = gapSplit(c.cov); return gaps.length + notes.length; },
  render(c) {
    const { gaps, notes } = gapSplit(c.cov);
    const row = (r) => `<tr data-cid="${esc(r.derived ? '' : r.id)}" data-grade="${esc(r.gradeId ?? '')}"><th scope="row">${esc(r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain)}</th>`
      + `<td class="kind">${esc(r.status)}</td><td class="q raw">${esc(r.finding ?? '')}</td>${r.derived ? '<td class="id"></td>' : idCell(r.id)}</tr>`;
    const plain = gaps.filter((r) => !INTERNAL.test(r.finding ?? '')), cited = gaps.filter((r) => INTERNAL.test(r.finding ?? ''));
    const known = plain.length ? flatGroups({ groups: [['Known gaps', plain.map(row)]], noun: 'gap', cls: 'rt--n', cols }) : '';
    const n = cited.length + notes.length;
    const maintainers = n
      ? `<details class="rs-maint"><summary>Notes for the data's maintainers<span>${esc(count(n, 'note'))}</span></summary>${flatGroups({ groups: [['Known gaps', cited.map(row)], ['Review notes', notes.map(row)]].filter(([, rs]) => rs.length), noun: 'note', cls: 'rt--n', cols })}</details>`
      : '';
    return typeSection({
      id: 'review-notes', title: 'Known gaps and review notes', n: gaps.length + notes.length, noun: 'note',
      body: known + maintainers,
      empty: 'No gap, limitation, conflict or review note is recorded for this material.',
    });
  },
};
