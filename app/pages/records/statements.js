// Every statement the material's makers make about their products beyond the numbers (db.knowHow), grouped by topic in
// the vocabulary's order, in their own words, with the product, the document and page, and the record's note on
// what a statement does not say behind a chip.

import { esc } from '../html.js';
import { indexDb, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { typeSection, groupBlock, sourceCell, idCell, chip, statsWords } from './common.js';

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
    list.sort((a, b) => rank(a.k.topic) - rank(b.k.topic) || a.k.topic.localeCompare(b.k.topic) || productNameOrId(a.g).localeCompare(productNameOrId(b.g)) || (a.k.id < b.k.id ? -1 : 1));
    const groups = new Map();
    for (const e of list) (groups.get(e.k.topic) ?? groups.set(e.k.topic, []).get(e.k.topic)).push(e);
    const note = (k) => { const t = String(k.exposure ?? '').trim(); return t && stated(t) ? chip('record note', t) : ''; };
    const cols = [['Product', 'p'], ['Statement', 'q'], ['Document', 'src'], ['ID', 'id']];
    const body = [...groups].map(([topic, es]) => groupBlock({
      title: topic, cols, cls: 'rt--s', attrs: ` data-group="${esc(topic)}"`,
      stats: statsWords(es.length, 'statement', []),
      rows: es.map(({ k, g }) => `<tr data-kid="${esc(k.id)}" data-grade="${esc(g.id)}"><th scope="row">${esc(productNameOrId(g))}</th>`
        + `<td class="q"><q>${esc(k.text)}</q>${note(k)}</td>${sourceCell(c, k.sourceId, k.locator)}${idCell(k.id)}</tr>`),
    })).join('');
    return typeSection({
      id: 'statements', title: 'Maker statements', n: list.length, noun: 'statement', body,
      empty: 'No maker statement is on file for this material.',
      note: '<p class="rs-note">The maker\'s own words about its product, by topic: never a test result.</p>',
    });
  },
};
