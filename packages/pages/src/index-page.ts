// The index of the material pages (materials/index.html; the pages reimagined, 2026-10-17): an atlas's index, not a
// wiki. Every material the selector lists, by family, each family's materials with a page as "name ······ products",
// most products first, then one line naming the ones with no page yet and one naming the names that are not materials;
// one search over all of them (assets/products.src.js). The page rule is said once, at the foot. The words are
// content's (docs/audits/2026-10-17-pages-reimagined/content/HUB.md).
//
// The same shell, tokens and faces as the pages. Pure: it reads the database and the env render.js pageEnv makes.

import type { Loose } from './loose.ts';

import { esc, count } from './html.ts';
import { fmtNumber } from './facts/format.ts';
import { documentShell, siteFooter, returnLink, BRAND, ICON } from './shell.ts';
import { documentsRead } from './facts/dates.ts';
import { pageOf, pageFacts, pageRuleWords } from './facts/page-rule.ts';
import { stated } from './facts/material-facts.ts';
import { andList, plural } from './facts/material-words.ts';

/** The index's file, relative to dist/. */
export const INDEX_PATH = 'materials/index.html';

/** A family's anchor: "Nylon / Polyamide" -> "f-nylon-polyamide". */
const slug = (s: Loose) => `f-${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'}`;

/** Items in the order they first appear, grouped by a key: [[key, items]]. */
function inOrder(items: Loose, key: Loose): Loose {
  const groups = new Map();
  for (const x of items) {
    const k = key(x);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  return [...groups];
}

/** The index page, as { path, html, stats }. `ix` is indexDb(db); `env` as render.js pageEnv makes it. */
export function renderIndexPage(db: Loose, env: Loose, ix: Loose): Loose {
  const msOf = (m: Loose) => ix.measurementsByMaterial.get(m.id) ?? [];
  const listed = db.materials.filter((m: Loose) => !m.familyEntry);
  const hasPage = new Set(listed.filter((m: Loose) => pageOf(m, msOf(m))).map((m: Loose) => m.id));
  const byId = new Map<Loose, Loose>(db.materials.map((m: Loose) => [m.id, m]));
  // The names that are not materials, by the material each names, so a search for "PLA Matte" finds PLA.
  const aliasesOf = new Map();
  for (const e of db.materials.filter((m: Loose) => m.familyEntry)) for (const x of e.familyEntry.members ?? []) (aliasesOf.get(x.id) ?? aliasesOf.set(x.id, []).get(x.id)).push(e.name);
  const words = (m: Loose) => [m.name, m.fullName, m.basePolymer, m.family, ...(aliasesOf.get(m.id) ?? [])].filter(stated).join(' ').toLowerCase();
  const families = inOrder(db.materials, (m: Loose) => (stated(m.family) ? m.family : 'Other'));

  const products = (m: Loose) => pageFacts(m, msOf(m)).products;
  const byCount = (a: Loose, b: Loose) => products(b) - products(a) || a.name.localeCompare(b.name);
  const nameLink = (x: Loose) => (hasPage.has(x.id) ? `<a href="${esc(`${x.id}.html`)}" data-mat="${esc(x.id)}">${esc(byId.get(x.id)?.name ?? x.name)}</a>` : esc(byId.get(x.id)?.name ?? x.name));
  // Families in order of how many materials with a page they hold, most first; one with none goes last.
  const ranked = families.map(([family, members]: Loose, i: Loose) => {
    const materials = members.filter((m: Loose) => !m.familyEntry);
    // A material with no product (every one retired or moved) is not listed: there is nothing of it to read.
    return { family, i, materials, paged: materials.filter((m: Loose) => hasPage.has(m.id)).sort(byCount), unpaged: materials.filter((m: Loose) => !hasPage.has(m.id) && products(m) > 0).sort(byCount) };
  }).filter((f: Loose) => f.paged.length || f.unpaged.length).sort((a: Loose, b: Loose) => b.paged.length - a.paged.length || a.i - b.i);
  // The materials with a page, family by family (the families with most pages first, read row by row); every material
  // without a page waits in one closing block, a line per family.
  const withPages = ranked.filter((f: Loose) => f.paged.length);
  const blocks = withPages.map(({ family, paged }: Loose) => {
    const id = slug(family);
    const rows = paged.map((m: Loose) => `<li data-mat="${esc(m.id)}" data-q="${esc(words(m))}"><a href="${esc(`${m.id}.html`)}" data-mat="${esc(m.id)}"${stated(m.fullName) && m.fullName !== m.name ? ` title="${esc(m.fullName)}"` : ''}>${esc(m.name)}</a>`
      + `<span class="dots" aria-hidden="true"></span><span class="c">${esc(fmtNumber(products(m)))}<span class="vh"> ${products(m) === 1 ? 'product' : 'products'}</span></span></li>`).join('');
    return `<section class="fam" id="${esc(id)}" data-section="family" data-family="${esc(family)}" aria-labelledby="${esc(id)}-h">
<h2 id="${esc(id)}-h">${esc(family)}</h2>
<ul class="ix-list">${rows}</ul>
</section>`;
  });
  const waiting = ranked.filter((f: Loose) => f.unpaged.length);
  if (waiting.length) {
    blocks.push(`<section class="fam fam--without" id="without-a-page" data-section="without-a-page" aria-labelledby="without-a-page-h">
<h2 id="without-a-page-h">Without a page yet</h2>
<p class="ix-rule">${esc(`A material gets a page once at least ${pageRuleWords()} are on file. Products in brackets.`)}</p>
${waiting.map(({ family, unpaged }: Loose) => `<p class="ix-line ix-nopage" data-family="${esc(family)}"><b>${esc(family)}:</b> ${unpaged.map((m: Loose) => `<span data-mat="${esc(m.id)}" data-q="${esc(words(m))}">${esc(m.name)} (${esc(fmtNumber(products(m)))})</span>`).join('')}</p>`).join('\n')}
</section>`);
  }
  // A name that is not a material leads either to its materials, each a link where every one has a page, or to its
  // family ("PA (polyamide) → see the family Nylon / Polyamide"): one line never mixes links with plain names.
  const familyOf = new Map(ranked.map((f: Loose) => [f.family, slug(f.family)]));
  const names = db.materials.filter((m: Loose) => m.familyEntry).map((e: Loose) => {
    const members = (e.familyEntry.members ?? []).map((x: Loose) => byId.get(x.id) ?? { id: x.id, name: x.name });
    const full = stated(e.fullName) && e.fullName !== e.name ? e.fullName : null;
    const label = !full ? e.name : full.includes('(') ? `${e.name}, ${full}` : `${e.name} (${full})`;
    const fams = [...new Set(members.map((x: Loose) => (stated(x.family) ? x.family : e.family)).filter(Boolean))];
    const to = members.length && members.every((x: Loose) => hasPage.has(x.id))
      ? andList(members.map((x: Loose) => `<a href="${esc(`${x.id}.html`)}" data-mat="${esc(x.id)}">${esc(x.name)}</a>`))
      // The family's block holds its materials with a page; the others are in "Without a page yet", under its name.
      : fams.length === 1 && familyOf.has(fams[0]) ? `see the family <a href="#${esc(familyOf.get(fams[0]))}">${esc(fams[0])}</a>`
        : esc(andList(members.map((x: Loose) => x.name)));
    return `<li data-alias="${esc(e.id)}" data-q="${esc(`${label} ${members.map((x: Loose) => x.name).join(' ')} ${fams.join(' ')}`.toLowerCase())}" hidden>${esc(label)} → ${to}</li>`;
  }).join('');
  const aliasList = names ? `<ul class="ix-aliases" data-aliases aria-label="Other names">${names}</ul>` : '';

  const st = env.stamps;
  // "Use the selector" is the way back (C33): the page's script sends it to the reader's own selection where it has one.
  const toSelector = env.selectorHref ? `<a data-return href="${esc(env.selectorHref)}">use the selector</a>` : 'use the selector';
  const lede = `${esc(`A page for each of the ${fmtNumber(hasPage.size)} materials with enough published data, by family, the most documented first. To set requirements and get a shortlist,`)} ${toSelector}.`;
  const body = `<header class="phead phead--hub" id="top"><div class="phead-id"><h1 class="pname">Materials</h1><p class="pid">${lede}</p>${env.methodHref ? `<p class="ix-method"><a href="${esc(env.methodHref)}">How the numbers are worked out</a></p>` : ''}</div></header>
<div class="ix-tools" hidden><label class="find">${ICON.search}<input type="search" data-ix-find placeholder="Find a material, polymer or name" aria-label="Find a material, polymer or name" autocomplete="off" spellcheck="false"></label>
<p class="ix-count" data-count aria-live="polite">${esc(`${count(listed.length, 'material')}, ${fmtNumber(hasPage.size)} with a page`)}</p></div>
<p class="ix-none" data-ix-none hidden>No material matches "<span data-ix-q></span>".</p>
${aliasList}
<div class="fams" data-index>
${blocks.join('\n')}
</div>`;
  // The same ways out as every page: the way back, and the method page (this is every material).
  const footer = siteFooter({ stamps: st, read: documentsRead(db.sources), cls: 'colophon--hub', standing: 'Data-sheet values describe test specimens, not design allowables.',
    nav: [returnLink(env.selectorHref, { long: 'Open the selector' })], methodHref: env.methodHref });
  const html = documentShell({
    kind: 'hub',
    title: `Materials: ${BRAND}`,
    description: `Every material ${BRAND} lists, by family: ${count(hasPage.size, 'material')} with a page of its own, for an engineer choosing a filament for the Bambu Lab H2C.`,
    stamps: st,
    crumbs: [{ href: 'index.html', words: 'Materials' }],
    returnHref: env.selectorHref,
    body,
    footer,
  });
  return { path: INDEX_PATH, html, stats: { listed: listed.length, pages: hasPage.size, families: families.length } };
}
