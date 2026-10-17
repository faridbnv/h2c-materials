// The index of the material pages (materials/index.html): every material the selector lists, by family and then by
// polymer, each with its Bambu Lab status, its products and its measured values, linked where the page rule gives it a
// page (page-rule.js pageOf) and, where it does not, what it falls short on, in one line, the rule's numbers read from
// PAGE_RULE. The names that are not materials (another name for one, a name for a group of them) are listed under their
// family with the materials they stand for. The selector does not link here (the owner's decision 8, 2026-10-16); every
// material page and records page does, from its top bar and its footer.
//
// The same shell, tokens and faces as the pages. Pure: it reads the database and the env render.js pageEnv makes.

import { esc, count } from './html.js';
import { documentShell, BRAND } from './shell.js';
import { pageOf, pageFacts, pageRuleWords, shortOf } from '../js/ui/page-rule.js';
import { h2cStatusLabel, H2C_STATUS } from '../js/ui/labels.js';
import { stated } from '../js/ui/material-facts.js';
import { andList } from '../js/ui/material-words.js';

/** The index's file, relative to dist/. */
export const INDEX_PATH = 'materials/index.html';

/** A family's anchor: "Nylon / Polyamide" -> "f-nylon-polyamide". */
const slug = (s) => `f-${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'}`;

/** Items in the order they first appear, grouped by a key: [[key, items]]. */
function inOrder(items, key) {
  const groups = new Map();
  for (const x of items) {
    const k = key(x);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  return [...groups];
}

/** A material's row: its name (linked where it has a page), its full name and status, its products and measured values. */
function materialRow(m, ms) {
  const page = pageOf(m, ms);
  const f = pageFacts(m, ms);
  const href = page ? `${m.id}.html` : null;
  const name = href ? `<a href="${esc(href)}">${esc(m.name)}</a>` : `<span class="ix-name">${esc(m.name)}</span>`;
  const full = stated(m.fullName) && m.fullName !== m.name ? `<span class="ix-full">${esc(m.fullName)}</span>` : '';
  const status = `<span class="chip ix-chip" title="${esc(H2C_STATUS[m.h2cStatus]?.meaning ?? '')}">${esc(h2cStatusLabel(m.h2cStatus))}</span>`;
  const short = shortOf(m, ms);
  const why = short ? `<span class="ix-why">${esc(`No page: ${short}; a page needs ${pageRuleWords()}.`)}</span>` : '';
  return `<tr data-material="${esc(m.id)}"${href ? ` data-page="${esc(href)}"` : ''} data-products="${f.products}" data-values="${f.values}">`
    + `<th scope="row">${name}<span class="ix-meta">${full}${status}</span>${why}</th><td class="num">${esc(f.products.toLocaleString('en-CA'))}</td><td class="num">${esc(f.values.toLocaleString('en-CA'))}</td></tr>`;
}

/** A name that is not a material, in words, its members linked where they have a page. */
function nameLine(e, hasPage) {
  const member = (x) => (hasPage.has(x.id) ? `<a href="${esc(`${x.id}.html`)}">${esc(x.name)}</a>` : esc(x.name));
  const f = e.familyEntry;
  const members = f.members.map(member);
  return f.kind === 'alias'
    ? `<li data-name="${esc(e.id)}">${esc(e.name)}: another name for ${members.join(', ')}</li>`
    : `<li data-name="${esc(e.id)}">${esc(e.name)}: a name for a group of materials, ${andList(members)}</li>`;
}

/** The index page, as { path, html, stats }. `ix` is indexDb(db); `env` as render.js pageEnv makes it. */
export function renderIndexPage(db, env, ix) {
  const msOf = (m) => ix.measurementsByMaterial.get(m.id) ?? [];
  const listed = db.materials.filter((m) => !m.familyEntry);
  const hasPage = new Set(listed.filter((m) => pageOf(m, msOf(m))).map((m) => m.id));
  const families = inOrder(db.materials, (m) => (stated(m.family) ? m.family : 'Other'));
  const toc = [];
  const sections = [];
  for (const [family, members] of families) {
    const materials = members.filter((m) => !m.familyEntry);
    const names = members.filter((m) => m.familyEntry);
    const id = slug(family);
    const withPage = materials.filter((m) => hasPage.has(m.id)).length;
    toc.push({ id, n: null, title: family, empty: withPage === 0 });
    const polymers = inOrder(materials, (m) => (stated(m.basePolymer) ? m.basePolymer : 'Polymer not stated'));
    // A polymer heading only where the family has more than one polymer: "PLA" under "PLA" says nothing.
    const body = polymers.map(([polymer, ms]) => `${polymers.length > 1 ? `<tr class="group" data-polymer="${esc(polymer)}"><th colspan="3" scope="rowgroup">${esc(polymer)}</th></tr>` : ''}${ms.map((m) => materialRow(m, msOf(m))).join('')}`).join('');
    const table = materials.length ? `<div class="table-box"><table class="grid ix" data-index="${esc(family)}">
<thead><tr><th scope="col">Material</th><th scope="col" class="num">Products</th><th scope="col" class="num">Measured values</th></tr></thead>
<tbody>${body}</tbody></table></div>` : '';
    const nameList = names.length ? `<div class="ix-names"><h3 class="sub-title">${names.length === 1 ? 'A name that is not a material' : 'Names that are not materials'}</h3><ul>${names.map((e) => nameLine(e, hasPage)).join('')}</ul></div>` : '';
    const sub = `${count(materials.length, 'material')}, ${withPage ? `${withPage === materials.length ? (materials.length === 1 ? 'with a page' : 'each with a page') : `${withPage} with a page`}` : 'none with a page'}`;
    sections.push(`<section class="sec" id="${esc(id)}" data-section="family" data-family="${esc(family)}" data-empty="${withPage ? 'false' : 'true'}" aria-labelledby="${esc(id)}-h">
<div class="sec-head"><h2 id="${esc(id)}-h">${esc(family)}</h2><span class="sec-sub">${esc(sub)}</span></div>
${table}
${nameList}
</section>`);
  }
  const selector = env.selectorHref;
  const head = `<header class="mast mast--index">
<h1 class="mast-name">Material pages</h1>
<p class="mast-lede">${esc(`A page of its own for each material with at least ${pageRuleWords()} on file. Each page gives the material's measured values, its print settings, its products and what their makers say, and every record behind them is on a records page of its own. Nothing on these pages decides an answer: the selector does that.`)}</p>
<dl class="mast-counts"><div class="count"><dt>materials with a page</dt><dd data-count="pages" data-n="${hasPage.size}">${esc(hasPage.size.toLocaleString('en-CA'))}</dd></div><div class="count"><dt>materials listed</dt><dd data-count="materials" data-n="${listed.length}">${esc(listed.length.toLocaleString('en-CA'))}</dd></div></dl>
${selector ? `<p class="ix-open"><a href="${esc(selector)}">Open the selector</a>, where requirements are set and every material's products are judged against them.</p>` : ''}
</header>`;
  const st = env.stamps;
  const foot = `<footer class="foot">
${selector ? `<p><a class="foot-link" href="${esc(selector)}">Open the selector</a>.</p>` : ''}
<p class="foot-fine" data-release="${esc(st.release)}">${esc(BRAND)}: release <span class="mono">${esc(st.release)}</span>, built <time>${esc(String(st.build).replace(/-/g, '⁠-⁠'))}</time>. Set in Inter and Newsreader, under the <a href="assets/Inter-OFL.txt">SIL Open Font License</a>.</p>
</footer>`;
  const html = documentShell({
    title: `Material pages: ${BRAND}`,
    description: `Every material ${BRAND} lists, by family and polymer: ${count(hasPage.size, 'material')} with a page of its own, for an engineer choosing a filament for the Bambu Lab H2C.`,
    kind: 'index', stamps: st,
    toc,
    body: `<section class="sec sec--masthead" data-section="masthead" data-empty="false">${head}</section>\n${sections.join('\n')}\n<section class="sec sec--footer" data-section="footer" data-empty="false">${foot}</section>`,
    links: { index: 'index.html', selector },
  });
  return { path: INDEX_PATH, html, stats: { listed: listed.length, pages: hasPage.size, families: families.length } };
}
