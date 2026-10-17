// What makers say: across the material's products, what their makers write beyond the numbers (materials[].knowHow),
// topic by topic, in their own words. The engineering topics come first and open (figures.js MAKER_TOPICS), two
// statements each, from the makers with the most products here that say something on it; the marketing topics are
// closed, with how many makers speak to each. Every statement is on the records page.

import { esc, tableBox } from '../html.js';
import { indexDb, makersSayFacts, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { plural } from '../../js/ui/material-words.js';
import { sourceKind } from '../../js/ui/labels.js';
import { howCounted } from '../charts/figure.js';
import { MAKER_TOPICS } from '../figures.js';
import { emptyBody, recordsLink, findingsBlock, notesHtml } from './common.js';
import { makersFindings } from '../findings.js';

/** How many statements a topic quotes, from different makers, those with the most products of this material first. */
const QUOTED = 2;

export default {
  id: 'makers-say',
  title: 'What makers say',
  records: '#statements',
  render(c) {
    const f = makersSayFacts(c.m, c);
    if (!f) return { empty: true, html: emptyBody(c, 'No maker statement is on file for this material.', { anchor: '#statements' }), stats: {} };
    const byGrade = indexDb(c.db).knowHowByGrade;
    // The makers by how many of this material's products each sells, then by name: the order quotes are taken in.
    const products = new Map();
    for (const g of c.grades) if (stated(g.manufacturer)) products.set(g.manufacturer, (products.get(g.manufacturer) ?? 0) + 1);
    const makers = [...products].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
    const statements = c.grades.flatMap((g) => (byGrade.get(g.id) ?? []).map((k) => ({ k, g })));
    const quotesOf = (t) => {
      const chosen = [];
      for (const maker of makers) {
        const first = statements.find((x) => x.k.topic === t.topic && x.g.manufacturer === maker);
        if (first) chosen.push(first);
        if (chosen.length === QUOTED) break;
      }
      return chosen;
    };
    const quote = ({ k, g }) => {
      const s = c.sourceById.get(k.sourceId);
      const page = /^p\. ?\d+/.exec(String(k.locator ?? ''))?.[0];
      return `<li><q>${esc(k.text)}</q> <span class="src">${esc(`${productNameOrId(g)}, ${sourceKind(s).toLowerCase()}${page ? `, ${page}` : ''}`)}</span></li>`;
    };
    const said = f.topics.filter((t) => t.stated);
    const rank = (t) => { const i = MAKER_TOPICS.open.indexOf(t.topic); return i < 0 ? MAKER_TOPICS.open.length : i; };
    const open = said.filter((t) => !MAKER_TOPICS.closed.includes(t.topic)).sort((a, b) => rank(a) - rank(b));
    const closed = said.filter((t) => MAKER_TOPICS.closed.includes(t.topic));
    const counts = (t) => `${plural(t.makers, 'maker')}, ${plural(t.products, 'product')}`;
    const topic = (t) => {
      const q = quotesOf(t);
      return q.length ? `<section class="topic"><h4>${esc(t.topic)} <small>${esc(counts(t))}</small></h4><ul>${q.map(quote).join('')}</ul></section>` : '';
    };
    const shut = (t) => {
      const q = quotesOf(t);
      return q.length ? `<details class="topic-more"><summary>${esc(t.topic)} <small>${esc(counts(t))}</small></summary><ul>${q.map(quote).join('')}</ul></details>` : '';
    };
    const table = tableBox(`<table class="grid topics"><thead><tr><th scope="col">Topic</th><th scope="col" class="num">Makers</th><th scope="col" class="num">Products</th></tr></thead><tbody>${f.topics.map((t) => `<tr${t.stated ? '' : ' class="none"'}><th scope="row">${esc(t.topic)}</th><td class="num">${t.makers} of ${f.makers}</td><td class="num">${t.stated ? t.products : '—'}</td></tr>`).join('')}</tbody></table>`);
    const html = `${findingsBlock(makersFindings(f, open))}
<div class="quotes">${open.map(topic).join('')}</div>
${closed.length ? `<div class="quotes-shut">${closed.map(shut).join('')}</div>` : ''}
${howCounted(notesHtml([`Under each topic: one statement from each of the ${QUOTED} makers with the most products here that say something on it, its first as recorded. The products counted are those whose makers' documents say something on the topic.`]) + table
  + `<p>${recordsLink(c, '#statements', 'Every statement, with its document, on the records page')}.</p>`)}`;
    return { empty: false, html, stats: {} };
  },
};
