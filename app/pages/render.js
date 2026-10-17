// The material pages' renderer: a page per material the page rule admits (page-rule.js pageOf), its records page, and
// the shared assets, as text, from the compiled database alone. Pure: no file is read or written here (the build's
// stage 8 and scripts/pages/render.mjs do that), and nothing here decides anything. Every fact is material-facts.js's,
// every word material-words.js's or labels.js's, every number format.js's.
//
//   renderSite(db, env)                 → { files: [[path, text]], stats }   every page, its records page, the assets
//   renderMaterialPage(db, id, env)     → { path, html, stats }
//   renderRecordsPage(db, id, env)      → { path, html, stats }
//   prepare(db)                         the registry, the H2C's limits and the environment labels, as main.js sets them
//   pageEnv(db, options)                the env the renderer reads: { index, ranks, stamps, selectorHref, assets, links }
//   buildAssets(input)                  → [[path, text]]   assets/pages.css (tokens, fonts, styles), page.js, licences

import { useRegistry } from '../js/ui/registry.js';
import { setH2cBaseline, setEnvironmentLabels } from '../js/ui/labels.js';
import { indexDb, materialContext, rankTable, productNameOrId } from '../js/ui/material-facts.js';
import { fmtNumber } from '../js/ui/format.js';
import { pageOf, PAGES_DIR } from '../js/ui/page-rule.js';
import { SECTIONS } from './sections/index.js';
import { RECORD_SECTIONS } from './records/index.js';
import { documentShell } from './shell.js';
import { esc, recordsHref, count } from './html.js';
import { selectorLink } from './sections/common.js';

/** The module state every shared function reads, set from the database, every time a render starts (FACTS-API.md 1). */
export function prepare(db) {
  useRegistry(db.registry);
  setH2cBaseline(db.meta.h2cBaseline);
  setEnvironmentLabels(db.meta.environmentCategories);
}

/** The renderer's env for a database: lookups, every material's medians, the stamps and the selector's file name. */
export function pageEnv(db, { assets = null, selectorFile = null, links = {} } = {}) {
  const meta = db.meta;
  return {
    index: indexDb(db),
    ranks: rankTable(db),
    stamps: { release: meta.release?.id ?? 'unidentified', snapshot: meta.snapshot, build: meta.build },
    selectorHref: selectorFile ? `../${selectorFile}` : null,
    assets,
    links,
  };
}

/** The name of a page's file, relative to dist/: materials/M020.html. */
const mainPath = (id) => `${PAGES_DIR}/${id}.html`;
const recordsPath = (id) => `${PAGES_DIR}/${recordsHref(id)}`;

/** Product names by ID, for the figures' tooltips (a classic script reads them; IDs never stand in a sentence). */
const productNames = (c) => Object.fromEntries(c.grades.map((g) => [g.id, productNameOrId(g)]));

/** A material's main page. */
export function renderMaterialPage(db, id, env) {
  const c = materialContext(db, id, { showEstimates: true });
  if (!c) throw new Error(`renderMaterialPage: ${id} is not a material with a page`);
  const stats = { figures: 0, dots: 0, empty: [] };
  const toc = [];
  const body = SECTIONS.map((s, i) => {
    const n = s.title ? i : null;
    const r = s.render(c, env, { n });
    stats.figures += r.stats?.figures ?? 0;
    stats.dots += r.stats?.dots ?? 0;
    if (r.empty) stats.empty.push(s.id);
    if (!s.title) return `<section class="sec sec--${esc(s.id)}" data-section="${esc(s.id)}" data-empty="false">${r.html}</section>`;
    toc.push({ id: s.id, n, title: s.title, empty: r.empty });
    return `<section class="sec" id="${esc(s.id)}" data-section="${esc(s.id)}" data-empty="${r.empty ? 'true' : 'false'}" aria-labelledby="${esc(s.id)}-h">
<div class="sec-head"><span class="sec-n">${n}</span><h2 id="${esc(s.id)}-h">${esc(s.title)}</h2></div>
${r.html}
</section>`;
  }).join('\n');
  toc.push({ id: 'records-link', n: null, title: 'Every record', empty: false });
  const m = c.m;
  const selector = selectorLink(c, env);
  const html = documentShell({
    title: `${m.name}: H2C material page`,
    description: `${m.name}${m.fullName && m.fullName !== m.name ? ` (${m.fullName})` : ''}: ${count(c.grades.length, 'product')}, ${count(c.summary.numericMeasurements, 'measured value')} and ${count(c.documents.size, 'document')}, drawn for an engineer choosing a filament for the Bambu Lab H2C.`,
    kind: 'material', materialId: m.id, stamps: env.stamps,
    toc,
    body: `${body}\n<p class="to-records" id="records-link"><a href="${esc(recordsHref(m.id))}">${esc(`Every record behind this page: ${count(c.ms.length, 'measurement')}, ${count(c.profiles.length, 'print profile')}, ${count(c.documents.size, 'document')} and the rest, each with its ID`)}</a></p>`,
    products: productNames(c),
    links: { index: env.links?.index ?? null, selector, records: { href: recordsHref(m.id), words: 'Every record' } },
  });
  return { path: mainPath(id), html, stats };
}

/** A material's records page: every record behind its main page, raw, with its ID. */
export function renderRecordsPage(db, id, env) {
  const c = materialContext(db, id, { showEstimates: true });
  if (!c) throw new Error(`renderRecordsPage: ${id} is not a material with a page`);
  const m = c.m;
  const counts = RECORD_SECTIONS.map((s) => ({ s, n: s.count(c) }));
  const products = c.grades.map((g) => [g.id, productNameOrId(g)]).sort((a, b) => a[1].localeCompare(b[1]));
  const head = `<header class="mast mast--records">
<p class="mast-back"><a href="${esc(`${id}.html`)}">${esc(`${m.name}, the material page`)}</a></p>
<h1 class="mast-name">${esc(m.name)} <span class="mast-sub">every record</span></h1>
<p class="mast-lede">${esc(`The records behind the ${m.name} page, as they are recorded: each value with the conditions and document it was read from, each print profile and statement in its document's own words, each with its ID for tracing it in the data tables.`)}</p>
<dl class="mast-counts">${counts.map(({ s, n }) => `<div class="count"><dt><a href="#${esc(s.id)}">${esc(s.title)}</a></dt><dd data-count="${esc(s.id)}" data-n="${n}">${esc(fmtNumber(n))}</dd></div>`).join('')}</dl>
<div class="rec-tools" hidden>
<label class="rec-filter"><span>Find</span><input type="search" data-filter placeholder="a property, product, document or ID" aria-label="Find in the records"></label>
<label class="rec-product"><span>Product</span><select data-product><option value="">Every product</option>${products.map(([gid, name]) => `<option value="${esc(gid)}">${esc(name)}</option>`).join('')}</select></label>
<p class="rec-shown" data-shown aria-live="polite"></p>
</div>
</header>`;
  const body = `<section class="sec sec--masthead" data-section="masthead" data-empty="false">${head}</section>\n${RECORD_SECTIONS.map((s) => s.render(c)).join('\n')}`;
  const html = documentShell({
    title: `${m.name} records: H2C material page`,
    description: `Every record behind the ${m.name} material page: measurements, print profiles, maker statements, environment statements, price listings, documents and review notes.`,
    kind: 'records', materialId: m.id, stamps: env.stamps,
    toc: counts.map(({ s, n }) => ({ id: s.id, n: null, title: s.title, empty: n === 0 })),
    body,
    links: { index: env.links?.index ?? null, page: { href: `${id}.html`, words: `${m.name} page` } },
  });
  return { path: recordsPath(id), html, stats: { rows: counts.reduce((k, x) => k + x.n, 0) } };
}

/**
 * The shared assets: assets/pages.css (the shared tokens, the embedded faces as data: URIs so a page opened from disk
 * keeps them, then the pages' own styles), assets/page.js and the font licences beside them. `input` is { tokensCss,
 * pagesCss, pageJs, fonts: [{ family, style, weight, base64 }], licences: [[name, text]] }, read by the caller.
 */
export function buildAssets(input) {
  const faces = input.fonts.map((f) => `@font-face {\n  font-family: "${f.family}";\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url(data:font/woff2;base64,${f.base64}) format("woff2");\n}`).join('\n');
  const css = `/* H2C material pages. Generated by app/pages/render.js from app/css/tokens.css, the faces in app/pages/assets/fonts\n   (SIL Open Font License 1.1, licences beside this file) and app/pages/assets/pages.src.css. Do not edit. */\n${input.tokensCss}\n${faces}\n${input.pagesCss}`;
  return [
    [`${PAGES_DIR}/assets/pages.css`, css],
    [`${PAGES_DIR}/assets/page.js`, input.pageJs],
    ...input.licences.map(([name, text]) => [`${PAGES_DIR}/assets/${name}`, text]),
  ];
}

/**
 * Every page: for each material the page rule admits (or those named in `env.only`), its main page and its records
 * page, and the assets where `env.assets` holds them (snapshot and tests pass null). Returns the files, relative to
 * dist/, and what each weighs.
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
    const records = renderRecordsPage(db, id, env);
    files.push([main.path, main.html], [records.path, records.html]);
    pages.push({ id, bytes: main.html.length, recordsBytes: records.html.length, ...main.stats, rows: records.stats.rows });
  }
  if (env.assets) files.push(...buildAssets(env.assets));
  return { files, stats: { pages: ids.length, recordsPages: ids.length, perPage: pages } };
}
