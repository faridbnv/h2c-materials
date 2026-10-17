// Every statement the material's makers make about their products beyond the numbers (db.knowHow), in their own words,
// by topic, with the document and page, and the reviewer's note on what a statement does not say.

import { esc } from '../html.js';
import { indexDb, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { recordTable, headRow, rawCell, sourceCell, idCell } from './common.js';

export default {
  id: 'statements',
  title: 'Maker statements',
  noun: 'statement',
  count: (c) => c.grades.reduce((n, g) => n + (indexDb(c.db).knowHowByGrade.get(g.id)?.length ?? 0), 0),
  render(c) {
    const topics = c.db.meta.knowHow?.topics ?? [];
    const by = indexDb(c.db).knowHowByGrade;
    const list = c.grades.flatMap((g) => (by.get(g.id) ?? []).map((k) => ({ k, g })));
    const rank = (t) => { const i = topics.indexOf(t); return i < 0 ? topics.length : i; };
    list.sort((a, b) => rank(a.k.topic) - rank(b.k.topic) || productNameOrId(a.g).localeCompare(productNameOrId(b.g)) || (a.k.id < b.k.id ? -1 : 1));
    const note = (k) => { const t = String(k.exposure ?? '').trim(); return t && stated(t) ? t : ''; };
    const rows = list.map(({ k, g }) => `<tr data-kid="${esc(k.id)}" data-grade="${esc(g.id)}"><th scope="row">${esc(k.topic)}</th><td>${esc(productNameOrId(g))}</td>`
      + `<td class="quote"><q>${esc(k.text)}</q></td>${sourceCell(c, k.sourceId, k.locator)}${rawCell(note(k), 50)}${idCell(k.id)}</tr>`).join('');
    return recordTable({
      id: 'statements', title: 'Maker statements', n: list.length, noun: 'statement',
      head: headRow([['Topic'], ['Product'], ['Statement'], ['Document'], ['Reviewer\'s note'], ['ID']]),
      rows: `<tbody>${rows}</tbody>`, widths: [12, 15, 40, 16, 11, 6], empty: 'No maker statement is on file for this material.',
      note: '<p class="rec-note">The maker\'s own words about its product, never a test result.</p>',
    });
  },
};
