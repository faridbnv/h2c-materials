// What makers say: across the material's products, how many makers say something on each topic (materials[].knowHow),
// and, per topic, one statement from each of the four makers with the most products here that say something on it, in
// their own words; then what their documents leave unsaid. Every statement is on the records page.

import { esc, tableBox } from '../html.js';
import { indexDb, makersSayFacts, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { plural, cap, andList, sitesLine, makersSilentWords, makersRecipeWords } from '../../js/ui/material-words.js';
import { sourceKind } from '../../js/ui/labels.js';
import { emptyBody, recordsLink } from './common.js';

/** How many makers a topic quotes, those with the most products of this material first. */
const MAKERS_QUOTED = 4;

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
    const silent = makersSilentWords(f.states);
    const recipe = makersRecipeWords(f.recipe);
    const lead = `${f.collected} of ${plural(f.total, 'product')} have statements from their makers.${silent.length ? ` ${cap(andList(silent))}.` : ''} ${sitesLine(f.sitesSearched, f.total)}`;
    const table = tableBox(`<table class="grid topics"><thead><tr><th scope="col">Topic</th><th scope="col" class="num">Makers</th><th scope="col" class="num">Products</th></tr></thead><tbody>${f.topics.map((t) => `<tr${t.stated ? '' : ' class="none"'}><th scope="row">${esc(t.topic)}</th><td class="num">${t.makers} of ${f.makers}</td><td class="num">${t.stated ? t.products : '—'}</td></tr>`).join('')}</tbody></table>`);
    const quotes = f.topics.filter((t) => t.stated).map((t) => {
      const chosen = [];
      for (const maker of makers) {
        const first = statements.find((x) => x.k.topic === t.topic && x.g.manufacturer === maker);
        if (first) chosen.push(first);
        if (chosen.length === MAKERS_QUOTED) break;
      }
      if (!chosen.length) return '';
      return `<section class="topic"><h4>${esc(t.topic)}</h4><ul>${chosen.map(({ k, g }) => {
        const s = c.sourceById.get(k.sourceId);
        const page = /^p\. ?\d+/.exec(String(k.locator ?? ''))?.[0];
        return `<li><q>${esc(k.text)}</q> <span class="src">${esc(`${productNameOrId(g)}, ${sourceKind(s).toLowerCase()}${page ? `, ${page}` : ''}`)}</span></li>`;
      }).join('')}</ul></section>`;
    }).join('');
    const html = `<p class="lead">${esc(lead)}</p>
<div class="split">${table}<div class="split-note"><p class="fig-note">${esc(`Under each topic: one statement from each of the ${MAKERS_QUOTED} makers with the most products here that say something on it, its first as recorded. Statements are the makers' own words, not test results.`)} ${recordsLink(c, '#statements', 'Every statement, with its document')}.</p>${recipe.length ? `<p class="fig-note">${esc(`Not stated by their documents: ${andList(recipe)}.`)}</p>` : ''}</div></div>
<div class="quotes">${quotes}</div>`;
    return { empty: false, html, stats: {} };
  },
};
