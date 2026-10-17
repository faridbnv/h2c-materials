// The frame around every material page (the pages reimagined, 2026-10-17): the document's head (title, the Filament
// Atlas mark as the icon, the shared stylesheet and script, linked relatively so a page opened from disk finds them),
// one sticky top bar shaped like the selector's, the main element carrying the page's stamps (the checks' hooks), and
// the product names the figures' tooltips read.
//
// The bar: the mark and the tool's name (to the selector), then where the reader is, "Materials › PLA", the last crumb a
// disclosure that names the section in view and lists every section, the Products page and all materials; on the right
// the way back to the selector and the theme. The way back is a link to the selector with this material's drawer open
// (render.js returnHref, sections/common.js selectorLink); the page's script turns it into "Back to your results" when
// the tab came from the selector (?from=, kept per tab in sessionStorage 'atlas-return'), with the reader's selection.
//
// `pageHead` is the head of a material's two pages: its name, full name, the lines under it, and the tabs Overview |
// Products. Nothing here decides anything.

import { attrs, esc, jsonIsland } from './html.js';
import { fmtNumber } from '../js/ui/format.js';
import * as marks from './charts/marks.js';

/** The tool's name, as the selector's frame names it. */
export const BRAND = 'Filament Atlas';

/** Applied before the stylesheet paints, so a page opened in the dark theme does not flash light. */
const THEME = '<script>try{var t=localStorage.getItem("h2c-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>';

/** The mark, as the selector draws it, and as the tab's icon. */
const MARK = '<svg class="bar-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8"/><path d="M9 22h14M11 16.5h10M13 11h6"/></svg>';
const FAVICON = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'8\' fill=\'%231f5f8b\'/%3E%3Cpath d=\'M9 22h14M11 16.5h10M13 11h6\' stroke=\'white\' stroke-width=\'3\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E';

/** Icons in the selector's 20 px line language. */
export const ICON = {
  back: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 5 3 10l5 5M3.5 10H17"/></svg>',
  theme: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.6"/><path class="fill" d="M10 3.4a6.6 6.6 0 0 1 0 13.2Z"/></svg>',
  down: '<svg class="icon icon-s" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M6 8l4 4 4-4"/></svg>',
  search: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>',
  copy: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="7" y="7" width="9.5" height="9.5" rx="1.5"/><path d="M13 7V4.5A1 1 0 0 0 12 3.5H4.5a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1H7"/></svg>',
};

/**
 * The way back to the selector: a link (`data-return`) whose static href opens the selector with this material's
 * drawer and nothing else set; the script rebuilds it from the reader's own selection where the tab came from the
 * selector. `cls` adds classes; the words are the cold ones until the script knows better.
 */
export const returnLink = (href, { cls = '', long = 'Open in the selector', short = 'Selector' } = {}) => (href
  ? `<a class="btn ret${cls ? ` ${cls}` : ''}" data-return href="${esc(href)}">${ICON.back}<span class="ret-long">${esc(long)}</span><span class="ret-short">${esc(short)}</span></a>`
  : '');

/** The plain footer of a page with no material (the method page): the way back, every material, the release. */
export const siteFooter = (stamps, returnHref) => `<footer class="colophon colophon--site" data-section="colophon"><div class="col-main">
<p class="col-standing">Data-sheet values describe test specimens, not design allowables.</p>
<div class="col-nav">${returnLink(returnHref, { long: 'Open the selector' })}<a class="btn" href="index.html">All materials</a></div></div>
<div class="col-fine" data-release="${esc(stamps.release)}"><p>${esc(BRAND)}, release <span class="mono">${esc(stamps.release)}</span>; built <time>${esc(String(stamps.build))}</time>.</p></div></footer>`;

/**
 * The tabs of a material's two pages: `{ id, n, current }`, current 'overview' or 'products'; n the products. Each tab
 * is a link (`data-tab`), the current one marked aria-current.
 */
export function tabsNav({ id, name, n, current }) {
  const tab = (key, href, words, extra = '') => `<a href="${esc(href)}" data-tab="${key}"${key === 'products' ? ` data-n="${n}"` : ''}${current === key ? ' aria-current="page"' : ''}>${words}${extra}</a>`;
  return `<nav class="tabs" aria-label="${esc(`${name} pages`)}">${tab('overview', `${id}.html`, 'Overview')}${tab('products', `${id}-products.html`, 'Products', ` <span class="n">${esc(fmtNumber(n))}</span>`)}</nav>`;
}

/**
 * The head of a material's page: the name (and the name it is also called), the full name, the lines under them (HTML,
 * already escaped) and the tabs.
 */
export function pageHead({ name, aka = null, fullName = null, lines = '', tabs = '' }) {
  return `<header class="phead" id="top">
<div class="phead-id">
<h1 class="pname">${esc(name)}</h1>
${aka ? `<p class="paka">also called ${esc(aka)}</p>` : ''}
${fullName ? `<p class="pfull">${esc(fullName)}</p>` : ''}
${lines}
</div>
${tabs}
</header>`;
}

/**
 * The bar's crumbs: `crumbs` [{ href, words }] lead to the current page; the last is the page itself. Where `sections`
 * are given ([{ id, title }], the sections that render, in order), the last crumb is a disclosure: the page's name, the
 * section in view (the script keeps it), and the list of every section, then `more` [{ href, words, n }] (the other
 * page of the material, every material).
 */
function crumbsNav(crumbs, sections, more, label) {
  if (!crumbs.length) return '';
  const head = crumbs.slice(0, -1).map((x) => `<li class="crumb"><a href="${esc(x.href)}">${esc(x.words)}</a></li>`).join('');
  const last = crumbs.at(-1);
  if (!sections.length && !more.length) return `<nav class="crumbs" aria-label="You are here"><ol>${head}<li class="crumb crumb-here"><span aria-current="page">${esc(last.words)}</span></li></ol></nav>`;
  const items = sections.map((s, i) => `<li><a href="#${esc(s.id)}"${i === 0 ? ' aria-current="true"' : ''}>${esc(s.title)}</a></li>`).join('');
  const rest = more.map((x) => `<li${x.sep ? ' class="sep"' : ''}><a href="${esc(x.href)}">${esc(x.words)}${x.n != null ? `<span class="n">${esc(x.n)}</span>` : ''}</a></li>`).join('');
  return `<nav class="crumbs" aria-label="You are here"><ol>${head}<li class="crumb crumb-here"><details class="here">`
    + `<summary aria-label="${esc(`${last.words}: the sections of this page`)}"><b>${esc(last.words)}</b><span class="here-sec" data-here>${esc(label ?? sections[0]?.title ?? '')}</span>${ICON.down}</summary>`
    + `<div class="here-list"><ul>${items}${rest}</ul></div></details></li></ol></nav>`;
}

/**
 * A whole page. `kind` is overview, products, hub, method or stub; `material` the material's ID (or null); `crumbs`
 * [{ href, words }], the last the page itself; `sections` [{ id, title }] for the bar's list; `tabs` the material's
 * pages for that list's foot ({ products: { href, n }, index: href }); `returnHref` the static way back to the selector;
 * `products` a map of product ID to name for the figures' tooltips, or null; `head` extra lines for <head> (the stub's
 * redirect).
 */
export function documentShell({ kind, title, description, stamps, material = null, crumbs = [], sections = [], tabs = null, returnHref = null, body, products = null, head = '', hereLabel = null, methodHref = 'method.html', printPath = null }) {
  // The hub's way back opens a fresh selector with no drawer: "Open the selector" until a selection is stored.
  const cold = kind === 'hub' ? { long: 'Open the selector' } : {};
  const more = [];
  if (tabs?.overview && kind !== 'overview') more.push({ href: tabs.overview.href, words: tabs.overview.words ?? 'Overview', sep: true });
  if (tabs?.products && kind !== 'products') more.push({ href: tabs.products.href, words: 'Products', n: fmtNumber(tabs.products.n), sep: !more.length });
  if (tabs?.index) more.push({ href: tabs.index, words: 'All materials', sep: !more.length });
  // The shared page on how the numbers are worked out closes the list, wherever it has been rendered.
  if (methodHref && kind !== 'method' && (tabs || sections.length)) more.push({ href: methodHref, words: 'How the numbers are worked out', sep: !more.length });
  const brand = `${MARK}<span class="bar-name">${esc(BRAND)}</span>`;
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="generator" content="${esc(BRAND)} material pages, release ${esc(stamps.release)}, database snapshot ${esc(stamps.snapshot)}, build ${esc(stamps.build)}">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${FAVICON}">
${head}${THEME}
<link rel="stylesheet" href="assets/pages.css">
<script src="assets/page.js" defer></script>
</head>
<body class="kind-${esc(kind)}">
<a class="skip" href="#main">Skip to the content</a>
${marks.SPRITE ?? ''}
<header class="atlas-bar"><div class="bar-in">
<a class="bar-brand" href="index.html" title="Every material">${brand}</a>
${crumbsNav(crumbs, sections, more, hereLabel)}
<div class="bar-end">${returnLink(returnHref, cold)}<button type="button" class="icon-btn" data-theme-toggle aria-label="Dark theme" title="Light or dark" hidden>${ICON.theme}</button></div>
</div></header>
<main id="main" class="page"${attrs({ 'data-page': kind, 'data-material': material, 'data-release': stamps.release, 'data-snapshot': stamps.snapshot, 'data-build': stamps.build })}>
<p class="print-line" aria-hidden="true" data-print-url="${esc(printPath ?? `materials/${material ? `${material}${kind === 'products' ? '-products' : ''}.html` : kind === 'hub' ? 'index.html' : `${kind}.html`}`)}" data-print-release="${esc(`${BRAND}, release ${stamps.release}`)}"></p>
${body}
${kind === 'method' ? siteFooter(stamps, returnHref) : ''}
</main>
<div class="tip" id="tip" aria-hidden="true" hidden></div>
${products ? jsonIsland('product-names', products) : ''}
</body>
</html>
`;
}
