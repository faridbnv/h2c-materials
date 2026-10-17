// Environment: the material's statements on chemicals, water, UV, fire and handling as a matrix of category against
// verdict, as each statement's own verdict is stored (material-facts.js environmentMatrix); up to three statements per
// category in their own words; then the resin's reference data (D64), apart and labelled as the resin's, never these
// products'. A count, never a colour of pass or fail: nothing here judges a requirement.

import { esc, tableBox, count } from '../html.js';
import { environmentMatrix, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { andList, verdictWords, envConditionWords, EMPTY_LINES } from '../../js/ui/material-words.js';
import { envVerdictWords, sourceKind } from '../../js/ui/labels.js';
import { emptyBody, recordsLink, findingsBlock } from './common.js';
import { environmentFindings } from '../findings.js';

/** How many statements a category shows on the page; the records page has every one. */
const SHOWN = 3;

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
    const parts = [findingsBlock(environmentFindings(f, polymer))];
    if (f.rows.length) {
      const total = f.rows.reduce((n, r) => n + r.total, 0);
      const usable = f.rows.filter((r) => r.filterable), other = f.rows.filter((r) => !r.filterable);
      // A cell's shade says how many statements it holds (one hue, lighter to darker: a count, never a verdict colour).
      const shade = (n) => (!n ? '' : n < 3 ? ' on on-1' : n < 6 ? ' on on-2' : ' on on-3');
      const row = (r) => `<tr><th scope="row">${esc(r.label)}</th>${f.verdicts.map((v) => `<td class="num${shade(r.counts[v])}">${r.counts[v] ?? ''}</td>`).join('')}<td class="num total">${r.total}</td></tr>`;
      const head = `<thead><tr><th scope="col">Category</th>${f.verdicts.map((v) => `<th scope="col" class="num">${esc(envVerdictWords(v))}</th>`).join('')}<th scope="col" class="num">Statements</th></tr></thead>`;
      const body = `<tbody>${usable.map(row).join('')}</tbody>${other.length ? `<tbody class="other"><tr class="group"><th scope="rowgroup" colspan="${f.verdicts.length + 2}">No requirement can be set on these</th></tr>${other.map(row).join('')}</tbody>` : ''}`;
      parts.push(`<h3 class="sub-title">${esc(`${count(total, 'statement')}, by category and by what each states`)}</h3>`);
      parts.push(tableBox(`<table class="grid matrix">${head}${body}</table>`));
      // Up to three statements of each category, in their own words.
      parts.push(`<h3 class="sub-title">What the statements say</h3><p class="note">${esc(`Up to ${SHOWN} statements per category, in the order they were recorded.`)} ${recordsLink(c, '#environment', 'Every statement, with its document')}.</p>`);
      parts.push(`<div class="env-list">${f.rows.map((r) => `<section class="env-cat"><h4>${esc(r.label)}</h4><ul>${r.records.slice(0, SHOWN).map((e) => {
        const cond = envConditionWords(e, r.label);
        const who = stated(e.gradeId) ? productNameOrId(c.gradeById.get(e.gradeId) ?? { id: 'a product' }) : 'the material in general';
        return `<li><q>${esc(e.finding)}</q>${cond ? ` <span class="cond">${esc(cond)}</span>` : ''} <span class="src">${esc(`${who}, ${sourceKind(c.sourceById.get(e.sourceId)).toLowerCase()}`)}</span></li>`;
      }).join('')}</ul>${r.records.length > SHOWN ? `<p class="more">${esc(`${r.records.length - SHOWN} more on the records page.`)}</p>` : ''}</section>`).join('')}</div>`);
    }
    if (f.polymer.length) {
      parts.push(`<h3 class="sub-title">${esc(`Reference data for ${polymer} resin (not these products)`)}</h3>`
        + `<p class="note">${esc(`No document tests this material${f.polymer.length === 1 ? ' in this category' : ` in these ${f.polymer.length} categories`}, so a resin producer's or handbook data for plain ${polymer} is shown. Fillers, pigments and printing change it, so it never passes a requirement.`)}</p>`
        + tableBox(`<table class="grid resin"><thead><tr><th scope="col">Category</th><th scope="col">Verdict</th><th scope="col">Agents</th></tr></thead><tbody>${f.polymer.map((p) => `<tr><th scope="row">${esc(p.label)}</th><td>${esc(verdictWords(p.verdict))}</td><td>${esc(andList(p.agents.map((a) => `${a.agent} (${verdictWords(a.verdict)})`)))}</td></tr>`).join('')}</tbody></table>`));
    }
    return { empty: false, html: parts.join('\n'), stats: {} };
  },
};
