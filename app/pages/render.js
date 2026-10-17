// The material pages' renderer (the pages reimagined, 2026-10-17): for each material the page rule admits
// (page-rule.js pageOf) its Overview and its Products page, and a stub at its old records page's address; the index of
// every material; the shared page on how the numbers are worked out (track B's method-page.js, where it has landed);
// and the shared assets. Pure: no file is read or written here (the build's stage 8 and scripts/pages/render.mjs do
// that), and nothing here decides anything. Every fact is material-facts.js's, every word material-words.js's,
// findings.js's or labels.js's, every number format.js's or numbers.js's.
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

import { useRegistry } from '../js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../js/ui/labels.js';
import { indexDb, materialContext, rankTable, productNameOrId, identity, isProduct } from '../js/ui/material-facts.js';
import { pageOf, PAGES_DIR } from '../js/ui/page-rule.js';
import { SECTIONS } from './sections/index.js';
import { productsScript } from './tables-asset.js';
import { documentShell, BRAND } from './shell.js';
import { esc, count, productsHref } from './html.js';
import { selectorLink } from './sections/common.js';
import { renderIndexPage } from './index-page.js';
import { renderProductsPage } from './products/index.js';
import { renderStub } from './stub.js';

export { renderProductsPage, renderStub, renderIndexPage };

// Track B's shared page on how the numbers are worked out: rendered once where its module has landed.
let methodPage = null;
try {
  methodPage = await import('./method-page.js');
} catch (e) {
  if (e?.code !== 'ERR_MODULE_NOT_FOUND' || !String(e.message).includes('method-page.js')) throw e;
}

/** The module state every shared function reads, set from the database, every time a render starts (FACTS-API.md 1). */
export function prepare(db) {
  useRegistry(db.registry);
  setH2cBaseline(db.meta.h2cBaseline);
  setEnvironmentLabels(db.meta.environmentCategories);
}

/**
 * The renderer's env for a database: lookups, every material's medians, the stamps, the selector's file name and the
 * links every page's bar carries (the index's).
 */
export function pageEnv(db, { assets = null, selectorFile = null, links = {} } = {}) {
  const meta = db.meta;
  return {
    index: indexDb(db),
    ranks: rankTable(db),
    stamps: { release: meta.release?.id ?? 'unidentified', snapshot: meta.snapshot, build: meta.build },
    selectorHref: selectorFile ? `../${selectorFile}` : null,
    assets,
    links: { index: 'index.html', ...links },
  };
}

/** The name of a page's file, relative to dist/: materials/M020.html. */
const mainPath = (id) => `${PAGES_DIR}/${id}.html`;

/** Product names by ID, for the figures' tooltips (a classic script reads them; IDs never stand in a sentence). */
const productNames = (c) => Object.fromEntries(c.grades.map((g) => [g.id, productNameOrId(g)]));

/** A material's Overview. */
export function renderMaterialPage(db, id, env) {
  const c = materialContext(db, id, { showEstimates: true });
  if (!c) throw new Error(`renderMaterialPage: ${id} is not a material with a page`);
  const m = c.m;
  const ident = identity(m, c);
  const stats = { figures: 0, dots: 0, empty: [] };
  const sections = [];
  const parts = new Array(SECTIONS.length).fill('');
  // The masthead names the sections it links to ("Printing in full"), so it renders after the others.
  const order = SECTIONS.map((s, i) => [s, i]).sort((a, b) => (a[0].id === 'masthead') - (b[0].id === 'masthead'));
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
    body: parts.filter(Boolean).join('\n'),
    products: productNames(c),
  });
  return { path: mainPath(id), html, stats };
}

/**
 * The shared assets: assets/pages.css (the shared tokens, the embedded faces as data: URIs so a page opened from disk
 * keeps them, then the frame, the sections', the figures' and the Products page's styles), assets/page.js (the frame's
 * script, then the Products page's and the index's) and the font licences beside them. `input` is read by
 * read-assets.js.
 */
export function buildAssets(input) {
  const faces = input.fonts.map((f) => `@font-face {\n  font-family: "${f.family}";\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url(data:font/woff2;base64,${f.base64}) format("woff2");\n}`).join('\n');
  const parts = [input.tokensCss, faces, input.frameCss, input.sectionsCss, input.figuresCss, input.productsCss];
  const css = `/* Filament Atlas material pages. Generated by app/pages/render.js from app/css/tokens.css, the faces in app/pages/assets/fonts\n   (SIL Open Font License 1.1, licences beside this file), then app/pages/assets/frame.src.css, sections.src.css, figures.src.css\n   and products.src.css. Do not edit. */\n${parts.join('\n')}`;
  return [
    [`${PAGES_DIR}/assets/pages.css`, css],
    [`${PAGES_DIR}/assets/page.js`, `${input.pageJs}\n${productsScript(input.productsJs)}`],
    ...input.licences.map(([name, text]) => [`${PAGES_DIR}/assets/${name}`, text]),
  ];
}

/**
 * Every page: for each material the page rule admits (or those named in `env.only`), its Overview, its Products page
 * and the stub at its old records page's address; the index of them all, which lists every material whether it was
 * rendered or not; the method page; and the assets where `env.assets` holds them (snapshot and tests pass null).
 * Returns the files, relative to dist/, and what each weighs.
 */
export function renderSite(db, env) {
  prepare(db);
  const ix = env.index ?? indexDb(db);
  const ids = db.materials.filter((m) => !m.familyEntry && pageOf(m, ix.measurementsByMaterial.get(m.id) ?? [])).map((m) => m.id)
    .filter((id) => !env.only || env.only.includes(id));
  const files = [];
  const pages = [];
  for (const id of ids) {
    const main = renderMaterialPage(db, id, env);
    const products = renderProductsPage(db, id, env);
    const stub = renderStub(id, ix.materialById.get(id).name, env);
    files.push([main.path, main.html], [products.path, products.html], [stub.path, stub.html]);
    pages.push({ id, bytes: main.html.length, recordsBytes: products.html.length, productsBytes: products.html.length, ...main.stats, rows: products.stats.rows });
  }
  const index = renderIndexPage(db, env, ix);
  files.push([index.path, index.html]);
  if (typeof methodPage?.renderMethodPage === 'function') {
    const method = methodPage.renderMethodPage(db, env);
    if (method?.path && method.html != null) files.push([method.path, method.html]);
  }
  if (env.assets) files.push(...buildAssets(env.assets));
  return { files, stats: { pages: ids.length, recordsPages: ids.length, productsPages: ids.length, index: index.stats, perPage: pages } };
}
