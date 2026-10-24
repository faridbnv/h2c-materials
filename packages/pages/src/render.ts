// The material pages' renderer (the pages reimagined, 2026-10-17): for each material the page rule admits
// (page-rule.js pageOf) its Overview and its Products page, and a stub at its old records page's address; the index of
// every material; the shared page on how the numbers are worked out (method-page.ts); and the shared assets. Pure: no file
// is read or written here (site.ts and cli.ts do that), and nothing here decides anything. Every fact is
// facts/material-facts.ts's, every word facts/material-words.ts's, findings.ts's or facts/labels.ts's, every number
// facts/format.ts's or numbers.ts's. Ported from app/pages/render.js (WP-24); the files it names below are .ts here.
//
//   renderSite(db, env)                 → { files: [[path, text]], stats }   every page, its Products page and stub, the
//                                         index, the method page, the assets
//   renderMaterialPage(db, id, env)     → { path, html, stats }              the Overview
//   renderProductsPage(db, id, env)     → { path, html, stats }              products/index.js
//   renderStub(id, name, env)           → { path, html }                     stub.js
//   renderIndexPage(db, env, ix)        → { path, html, stats }              index-page.js
//   prepare(db)                         the registry, the H2C's limits and the environment labels, as main.js sets them
//   pageEnv(db, options)                the env the renderer reads: { index, ranks, stamps, selectorHref, assets, links }
//   buildAssets(input)                  → [[path, text]]   assets/pages.css (tokens, faces, the frame, the sections',
//                                         the figures' and the Products page's styles), page.js, the licences
//
// A section (sections/index.js, track B) is `{ id, title, render(c, env, place) → { html, empty, stats } }`. A titled
// one is wrapped here: <section id data-section> with its title as an h2, no number. A bare one (`bare: true`) writes
// its own section; an untitled one (the masthead, the colophon) is placed as it is. One with nothing to say leaves the
// page silently. The bar's list of sections is every titled one that renders, unless it says `menu: false`.

import type { Loose } from './loose.ts';

import { useRegistry } from './facts/registry.ts';
import { setH2cBaseline, setEnvironmentLabels } from './facts/labels.ts';
import { indexDb, materialContext, rankTable, productNameOrId, identity, isProduct } from './facts/material-facts.ts';
import { pageOf, PAGES_DIR } from './facts/page-rule.ts';
import { SECTIONS } from './sections/index.ts';
import { documentShell, BRAND } from './shell.ts';
import { esc, count, productsHref } from './html.ts';
import { selectorLink } from './sections/common.ts';
import { renderIndexPage } from './index-page.ts';
import { renderProductsPage } from './products/index.ts';
import { renderStub } from './stub.ts';
import { renderMethodPage } from './method-page.ts';

export { renderProductsPage, renderStub, renderIndexPage };


/** The module state every shared function reads, set from the database, every time a render starts (FACTS-API.md 1). */
export function prepare(db: Loose) {
  useRegistry(db.registry);
  setH2cBaseline(db.meta.h2cBaseline);
  setEnvironmentLabels(db.meta.environmentCategories);
}

/**
 * The stable address of the selector, from a page in materials/. The pages used to link to the release-stamped file name
 * (H2C_Material_Selector_<date>_<release>.html), which put the release into every page. The deployed site serves the
 * selector at its root, so the address that does not change from release to release is the root: `../`.
 */
export const SELECTOR_HREF = '../';

/**
 * The renderer's env for a database: lookups, every material's medians, the stamps, the selector's address and the
 * links every page's bar carries (the index's).
 */
export function pageEnv(db: Loose, { assets = null, selectorHref = SELECTOR_HREF, links = {} }: Loose = {}): Loose {
  const meta = db.meta;
  return {
    index: indexDb(db),
    ranks: rankTable(db),
    stamps: { release: meta.release?.id ?? 'unidentified', snapshot: meta.snapshot, build: meta.build },
    selectorHref,
    assets,
    links: { index: 'index.html', ...links },
    // The shared page on how the numbers are worked out.
    methodHref: 'method.html',
  };
}

/** The name of a page's file, relative to dist/: materials/M020.html. */
const mainPath = (id: Loose) => `${PAGES_DIR}/${id}.html`;

/** Product names by ID, for the figures' tooltips (a classic script reads them; IDs never stand in a sentence). */
const productNames = (c: Loose): Loose => Object.fromEntries(c.grades.map((g: Loose) => [g.id, productNameOrId(g)]));

/** A material's Overview. */
export function renderMaterialPage(db: Loose, id: Loose, env: Loose): Loose {
  const c = materialContext(db, id, { showEstimates: true });
  if (!c) throw new Error(`renderMaterialPage: ${id} is not a material with a page`);
  const m = c.m;
  const ident = identity(m, c);
  const stats: Loose = { figures: 0, dots: 0, empty: [] };
  const sections: Loose[] = [];
  const parts = new Array(SECTIONS.length).fill('');
  // The masthead names the sections it links to ("Printing in full"), so it renders after the others.
  const order = SECTIONS.map((s, i): [Loose, number] => [s, i]).sort((a, b) => Number(a[0].id === 'masthead') - Number(b[0].id === 'masthead'));
  const rendered = new Set();
  for (const [s, i] of order) {
    const r = s.render(c, s.id === 'masthead' ? { ...env, hasPrinting: rendered.has('printing') } : env, { n: null });
    if (r.empty) { stats.empty.push(s.id); continue; }
    rendered.add(s.id);
    stats.figures += r.stats?.figures ?? 0;
    stats.dots += r.stats?.dots ?? 0;
    if (!s.title || s.bare) { parts[i] = r.html; continue; }
    parts[i] = `<section class="ov-sec" id="${esc(s.id)}" data-section="${esc(s.id)}" aria-labelledby="${esc(s.id)}-h">
<h2 class="ov-h" id="${esc(s.id)}-h">${esc(r.title ?? s.title)}</h2>
${r.html}
</section>`;
  }
  for (const s of SECTIONS) if (s.title && rendered.has(s.id) && s.menu !== false) sections.push({ id: s.id, title: s.title });
  // The colophon is the page's footer, set after the main element (shell.js siteFooter).
  const foot = SECTIONS.findIndex((s) => s.id === 'footer');
  const footer = parts[foot] ?? '';
  if (foot >= 0) parts[foot] = '';
  const n = c.grades.filter(isProduct).length;
  const html = documentShell({
    kind: 'overview',
    title: `${m.name}: ${BRAND}`,
    description: `${m.name}${m.fullName && m.fullName !== m.name ? ` (${m.fullName})` : ''}: ${count(n, 'product')}, ${count(c.summary.numericMeasurements, 'measured value')} and ${count(c.documents.size, 'document')}, for an engineer choosing a filament for the Bambu Lab H2C.`,
    stamps: env.stamps, material: m.id,
    crumbs: [...(env.links?.index ? [{ href: env.links.index, words: 'Materials' }] : []), { href: `${m.id}.html`, words: ident.primary }],
    sections: [{ id: 'top', title: 'Overview' }, ...sections],
    tabs: { products: { href: productsHref(m.id), n }, index: env.links?.index ?? null },
    returnHref: selectorLink(c, env),
    methodHref: env.methodHref,
    body: parts.filter(Boolean).join('\n'),
    footer,
    products: productNames(c),
  });
  return { path: mainPath(id), html, stats };
}

/**
 * The shared assets: assets/pages.css (the shared tokens, the embedded faces as data: URIs so a page opened from disk
 * keeps them, then the frame, the sections', the figures' and the Products page's styles), assets/page.js (the frame's
 * script, then the Products page's and the index's: the bundle of browser/) and the font licences beside them. `input` is
 * read by assets.ts.
 */
export function buildAssets(input: Loose): Loose {
  const faces = input.fonts.map((f: Loose) => `@font-face {\n  font-family: "${f.family}";\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url(data:font/woff2;base64,${f.base64}) format("woff2");\n}`).join('\n');
  const parts = [input.tokensCss, faces, input.frameCss, input.sectionsCss, input.figuresCss, input.productsCss];
  const css = `/* Filament Atlas material pages. Generated by packages/pages from assets/tokens.css, the faces in assets/fonts\n   (SIL Open Font License 1.1, licences beside this file), then frame.src.css, sections.src.css, figures.src.css\n   and products.src.css. Do not edit. */\n${parts.join('\n')}`;
  return [
    [`${PAGES_DIR}/assets/pages.css`, css],
    [`${PAGES_DIR}/assets/page.js`, input.script],
    ...input.licences.map(([name, text]: Loose) => [`${PAGES_DIR}/assets/${name}`, text]),
  ];
}

/**
 * Every page: for each material the page rule admits (or those named in `env.only`), its Overview, its Products page
 * and the stub at its old records page's address; the index of them all, which lists every material whether it was
 * rendered or not; the method page; and the assets where `env.assets` holds them (snapshot and tests pass null).
 * Returns the files, relative to dist/, and what each weighs.
 */
export function renderSite(db: Loose, env: Loose): Loose {
  prepare(db);
  const ix = env.index ?? indexDb(db);
  const ids = db.materials.filter((m: Loose) => !m.familyEntry && pageOf(m, ix.measurementsByMaterial.get(m.id) ?? [])).map((m: Loose) => m.id)
    .filter((id: Loose) => !env.only || env.only.includes(id));
  const files: Loose[] = [];
  const pages: Loose[] = [];
  for (const id of ids) {
    const main = renderMaterialPage(db, id, env);
    const products = renderProductsPage(db, id, env);
    const stub = renderStub(id, ix.materialById.get(id).name, env);
    files.push([main.path, main.html], [products.path, products.html], [stub.path, stub.html]);
    pages.push({ id, bytes: main.html.length, recordsBytes: products.html.length, productsBytes: products.html.length, ...main.stats, rows: products.stats.rows });
  }
  const index = renderIndexPage(db, env, ix);
  files.push([index.path, index.html]);
  const method = renderMethodPage(db, env);
  files.push([method.path, method.html]);
  if (env.assets) files.push(...buildAssets(env.assets));
  return { files, stats: { pages: ids.length, recordsPages: ids.length, productsPages: ids.length, index: index.stats, perPage: pages } };
}
