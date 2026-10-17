// The index of the material pages (materials/index.html; the pages reimagined, 2026-10-17): an atlas's index, not a
// wiki. Every material the selector lists, by family, each family's materials with a page as "name ······ products",
// most products first, then one line naming the ones with no page yet and one naming the names that are not materials;
// one search over all of them (assets/products.src.js). The page rule is said once, at the foot. The words are
// content's (docs/audits/2026-10-17-pages-reimagined/content/HUB.md).
//
// The same shell, tokens and faces as the pages. Pure: it reads the database and the env render.js pageEnv makes.

import { esc, count } from './html.js';
import { fmtNumber } from '../js/ui/format.js';
import { documentShell, BRAND, ICON } from './shell.js';
import { pageOf, pageFacts, pageRuleWords } from '../js/ui/page-rule.js';
import { stated } from '../js/ui/material-facts.js';
import { andList, plural } from '../js/ui/material-words.js';

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

/** The index page, as { path, html, stats }. `ix` is indexDb(db); `env` as render.js pageEnv makes it. */
export function renderIndexPage(db, env, ix) {
  const msOf = (m) => ix.measurementsByMaterial.get(m.id) ?? [];
  const listed = db.materials.filter((m) => !m.familyEntry);
  const hasPage = new Set(listed.filter((m) => pageOf(m, msOf(m))).map((m) => m.id));
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  // The names that are not materials, by the material each names, so a search for "PLA Matte" finds PLA.
  const aliasesOf = new Map();
  for (const e of db.materials.filter((m) => m.familyEntry)) for (const x of e.familyEntry.members ?? []) (aliasesOf.get(x.id) ?? aliasesOf.set(x.id, []).get(x.id)).push(e.name);
  const words = (m) => [m.name, m.fullName, m.basePolymer, m.family, ...(aliasesOf.get(m.id) ?? [])].filter(stated).join(' ').toLowerCase();
  const families = inOrder(db.materials, (m) => (stated(m.family) ? m.family : 'Other'));

  const products = (m) => pageFacts(m, msOf(m)).products;
  const byCount = (a, b) => products(b) - products(a) || a.name.localeCompare(b.name);
  const nameLink = (x) => (hasPage.has(x.id) ? `<a href="${esc(`${x.id}.html`)}" data-mat="${esc(x.id)}">${esc(byId.get(x.id)?.name ?? x.name)}</a>` : esc(byId.get(x.id)?.name ?? x.name));
  // Families in order of how many materials with a page they hold, most first; one with none goes last.
  const ranked = families.map(([family, members], i) => {
    const materials = members.filter((m) => !m.familyEntry);
    // A material with no product (every one retired or moved) is not listed: there is nothing of it to read.
    return { family, i, materials, paged: materials.filter((m) => hasPage.has(m.id)).sort(byCount), unpaged: materials.filter((m) => !hasPage.has(m.id) && products(m) > 0).sort(byCount) };
  }).filter((f) => f.paged.length || f.unpaged.length).sort((a, b) => b.paged.length - a.paged.length || a.i - b.i);
  // The materials with a page, family by family (the families with most pages first, read row by row); every material
  // without a page waits in one closing block, a line per family.
  const withPages = ranked.filter((f) => f.paged.length);
  const blocks = withPages.map(({ family, paged }) => {
    const id = slug(family);
    const rows = paged.map((m) => `<li data-mat="${esc(m.id)}" data-q="${esc(words(m))}"><a href="${esc(`${m.id}.html`)}" data-mat="${esc(m.id)}"${stated(m.fullName) && m.fullName !== m.name ? ` title="${esc(m.fullName)}"` : ''}>${esc(m.name)}</a>`
      + `<span class="dots" aria-hidden="true"></span><span class="c">${esc(fmtNumber(products(m)))}<span class="vh"> ${products(m) === 1 ? 'product' : 'products'}</span></span></li>`).join('');
    return `<section class="fam" id="${esc(id)}" data-section="family" data-family="${esc(family)}" aria-labelledby="${esc(id)}-h">
<h2 id="${esc(id)}-h">${esc(family)}</h2>
<ul class="ix-list">${rows}</ul>
</section>`;
  });
  const waiting = ranked.filter((f) => f.unpaged.length);
  if (waiting.length) {
    blocks.push(`<section class="fam fam--without" id="without-a-page" data-section="without-a-page" aria-labelledby="without-a-page-h">
<h2 id="without-a-page-h">Without a page yet</h2>
<p class="ix-rule">${esc(`A material gets a page once at least ${pageRuleWords()} are on file. Products in brackets.`)}</p>
${waiting.map(({ family, unpaged }) => `<p class="ix-line ix-nopage" data-family="${esc(family)}"><b>${esc(family)}:</b> ${unpaged.map((m) => `<span data-mat="${esc(m.id)}" data-q="${esc(words(m))}">${esc(m.name)} (${esc(fmtNumber(products(m)))})</span>`).join('')}</p>`).join('\n')}
</section>`);
  }
  // A name that is not a material leads either to its materials, each a link where every one has a page, or to its
  // family ("PA (polyamide) → see the family Nylon / Polyamide"): one line never mixes links with plain names.
  const familyOf = new Map(ranked.map((f) => [f.family, slug(f.family)]));
  const names = db.materials.filter((m) => m.familyEntry).map((e) => {
    const members = (e.familyEntry.members ?? []).map((x) => byId.get(x.id) ?? { id: x.id, name: x.name });
    const full = stated(e.fullName) && e.fullName !== e.name ? e.fullName : null;
    const label = !full ? e.name : full.includes('(') ? `${e.name}, ${full}` : `${e.name} (${full})`;
    const fams = [...new Set(members.map((x) => (stated(x.family) ? x.family : e.family)).filter(Boolean))];
    const to = members.length && members.every((x) => hasPage.has(x.id))
      ? andList(members.map((x) => `<a href="${esc(`${x.id}.html`)}" data-mat="${esc(x.id)}">${esc(x.name)}</a>`))
      // The family's block holds its materials with a page; the others are in "Without a page yet", under its name.
      : fams.length === 1 && familyOf.has(fams[0]) ? `see the family <a href="#${esc(familyOf.get(fams[0]))}">${esc(fams[0])}</a>`
        : esc(andList(members.map((x) => x.name)));
    return `<li data-alias="${esc(e.id)}" data-q="${esc(`${label} ${members.map((x) => x.name).join(' ')} ${fams.join(' ')}`.toLowerCase())}" hidden>${esc(label)} → ${to}</li>`;
  }).join('');
  const aliasList = names ? `<ul class="ix-aliases" data-aliases aria-label="Other names">${names}</ul>` : '';

  const st = env.stamps;
  const reads = db.sources.map((s) => s.accessDate).filter((d) => stated(d) && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const lede = `A page for each of the ${fmtNumber(hasPage.size)} materials with enough published data, by family, the most documented first. To set requirements and get a shortlist, use the selector.`;
  const body = `<header class="phead phead--hub" id="top"><div class="phead-id"><h1 class="pname">Materials</h1><p class="pid">${esc(lede)}</p>${env.methodHref ? `<p class="ix-method"><a href="${esc(env.methodHref)}">How the numbers are worked out</a></p>` : ''}</div></header>
<div class="ix-tools" hidden><label class="find">${ICON.search}<input type="search" data-ix-find placeholder="Find a material, polymer or name" aria-label="Find a material, polymer or name" autocomplete="off" spellcheck="false"></label>
<p class="ix-count" data-count aria-live="polite">${esc(`${count(listed.length, 'material')}, ${fmtNumber(hasPage.size)} with a page`)}</p></div>
<p class="ix-none" data-ix-none hidden>No material matches "<span data-ix-q></span>".</p>
${aliasList}
<div class="fams" data-index>
${blocks.join('\n')}
</div>
<footer class="colophon colophon--hub" data-section="colophon"><div class="col-main"><p class="col-standing">Data-sheet values describe test specimens, not design allowables.</p></div>
<div class="col-fine" data-release="${esc(st.release)}"><p>${esc(BRAND)}, release <span class="mono">${esc(st.release)}</span>${reads.length ? `; documents read ${esc(reads[0])} to ${esc(reads.at(-1))}` : ''}; built <time>${esc(String(st.build))}</time>.</p></div></footer>`;
  const html = documentShell({
    kind: 'hub',
    title: `Materials: ${BRAND}`,
    description: `Every material ${BRAND} lists, by family: ${count(hasPage.size, 'material')} with a page of its own, for an engineer choosing a filament for the Bambu Lab H2C.`,
    stamps: st,
    crumbs: [{ href: 'index.html', words: 'Materials' }],
    returnHref: env.selectorHref,
    body,
  });
  return { path: INDEX_PATH, html, stats: { listed: listed.length, pages: hasPage.size, families: families.length } };
}
