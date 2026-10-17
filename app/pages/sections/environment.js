// Environment: the material's statements on chemicals, water, UV, fire and handling as a matrix of category against
// verdict, as each statement's own verdict is stored (material-facts.js environmentMatrix); up to three statements per
// category in their own words; then the resin's reference data (D64), apart and labelled as the resin's, never these
// products'. A count, never a colour of pass or fail: nothing here judges a requirement.

import { esc, tableBox, count } from '../html.js';
import { environmentMatrix, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { andList, plural, verdictWords, envConditionWords, EMPTY_LINES } from '../../js/ui/material-words.js';
import { envVerdictWords, sourceKind } from '../../js/ui/labels.js';
import { emptyBody, recordsLink, findingsBlock, notesHtml } from './common.js';
import { howCounted } from '../charts/figure.js';
import { environmentFindings } from '../findings.js';

/** How many statements a category shows on the page; the records page has every one. */
const SHOWN = 2;

export default {
  id: 'environment',
  title: 'Chemicals and environment',
  records: '#environment',
  render(c) {
    const f = environmentMatrix(c);
    if (!f.rows.length && !f.polymer.length) {
      return { empty: true, html: emptyBody(c, EMPTY_LINES.Environment, { tab: 'Environment', anchor: '#environment' }), stats: {} };
    }
    const polymer = c.poly[0]?.polymerId ?? 'the base polymer';
    const makerOf = (e) => { const g = stated(e.gradeId) ? c.gradeById.get(e.gradeId) : null; return (stated(g?.manufacturer) ? g.manufacturer : null) ?? c.sourceById.get(e.sourceId)?.publisher ?? null; };
    const parts = [findingsBlock(environmentFindings(f, polymer, makerOf))];
    if (f.rows.length) {
      const total = f.rows.reduce((n, r) => n + r.total, 0);
      const usable = f.rows.filter((r) => r.filterable), other = f.rows.filter((r) => !r.filterable);
      // A cell's shade says how many statements it holds (one hue, lighter to darker: a count, never a verdict colour).
      const shade = (n) => (!n ? '' : n < 3 ? ' on on-1' : n < 6 ? ' on on-2' : ' on on-3');
      const row = (r) => `<tr><th scope="row">${esc(r.label)}</th>${f.verdicts.map((v) => `<td class="num${shade(r.counts[v])}">${r.counts[v] ?? ''}</td>`).join('')}<td class="num total">${r.total}</td></tr>`;
      const head = `<thead><tr><th scope="col">Category</th>${f.verdicts.map((v) => `<th scope="col" class="num">${esc(envVerdictWords(v))}</th>`).join('')}<th scope="col" class="num">Statements</th></tr></thead>`;
      const body = `<tbody>${usable.map(row).join('')}</tbody>`;
      const said = (r) => `<ul>${r.records.slice(0, SHOWN).map((e) => {
        const cond = envConditionWords(e, r.label);
        const who = stated(e.gradeId) ? productNameOrId(c.gradeById.get(e.gradeId) ?? { id: 'a product' }) : 'the material in general';
        return `<li><q>${esc(e.finding)}</q>${cond ? ` <span class="cond">${esc(cond)}</span>` : ''} <span class="src">${esc(`${who}, ${sourceKind(c.sourceById.get(e.sourceId)).toLowerCase()}`)}</span></li>`;
      }).join('')}</ul>${r.records.length > SHOWN ? `<p class="more">${esc(`${r.records.length - SHOWN} more on the records page.`)}</p>` : ''}`;
      if (usable.length) {
        parts.push(`<h3 class="sub-title">${esc(`${count(usable.reduce((n, r) => n + r.total, 0), 'statement')} on resistance, by what each states`)}</h3>`);
        parts.push(tableBox(`<table class="grid matrix">${head}${body}</table>`));
        // Two statements of each category, in their own words.
        parts.push(`<div class="env-list">${usable.map((r) => `<section class="env-cat"><h4>${esc(r.label)} <small>${esc(plural(r.total, 'statement'))}</small></h4>${said(r)}</section>`).join('')}</div>`);
      }
      // Notes on printing and handling that are not a resistance: closed, with their counts.
      if (other.length) parts.push(`<div class="quotes-shut">${other.map((r) => `<details class="topic-more"><summary>${esc(r.label)} <small>${esc(plural(r.total, 'statement'))}</small></summary>${said(r)}</details>`).join('')}</div>`);
      parts.push(howCounted(notesHtml([`${count(total, 'statement')} in all, by makers and other documents. Under each category, the first ${SHOWN} as recorded; the table counts each statement by the verdict it states.`])
        + `<p>${recordsLink(c, '#environment', 'Every statement, with its document, on the records page')}.</p>`));
    }
    if (f.polymer.length) {
      parts.push(`<h3 class="sub-title">${esc(`Reference data for ${polymer} resin (not these products)`)}</h3>`
        + `<p class="note">${esc(`No document tests this material${f.polymer.length === 1 ? ' in this category' : ` in these ${f.polymer.length} categories`}, so a resin producer's or handbook data for plain ${polymer} is shown. Fillers, pigments and printing change it, so it never stands for these products.`)}</p>`
        + tableBox(`<table class="grid resin"><thead><tr><th scope="col">Category</th><th scope="col">Verdict</th><th scope="col">Agents</th></tr></thead><tbody>${f.polymer.map((p) => `<tr><th scope="row">${esc(p.label)}</th><td>${esc(verdictWords(p.verdict))}</td><td>${esc(andList(p.agents.map((a) => `${a.agent} (${verdictWords(a.verdict)})`)))}</td></tr>`).join('')}</tbody></table>`));
    }
    return { empty: false, html: parts.join('\n'), stats: {} };
  },
};
