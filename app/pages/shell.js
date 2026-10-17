// The document around a material page or a records page: head (title, the Filament Atlas mark as the icon, the shared
// stylesheet and script, linked relatively so a page opened from disk finds them), a sticky top bar with the brand, the
// contents (a sticky rail at 1,080 px and wider, a sticky strip of section links below that, under the top bar), the
// main element carrying the page's stamps (the test hooks), and the product names the figures' tooltips read.
//
// Every anchor on the page lands below the top bar (and the strip, where it is one): the stylesheet sets
// scroll-margin-top from --anchor-top, which it estimates per width and page.js sets from the measured bar.

import { attrs, esc, jsonIsland } from './html.js';
import { SPRITE } from './charts/marks.js';

/** The tool's name, as the selector's frame names it. */
export const BRAND = 'Filament Atlas';

/** Applied before the stylesheet paints, so a page opened in the dark theme does not flash light. */
const THEME = '<script>try{var t=localStorage.getItem("h2c-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>';

/** The mark, as the selector draws it, and as the tab's icon. */
const MARK = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8"/><path d="M9 22h14M11 16.5h10M13 11h6"/></svg>';
const FAVICON = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'8\' fill=\'%231f5f8b\'/%3E%3Cpath d=\'M9 22h14M11 16.5h10M13 11h6\' stroke=\'white\' stroke-width=\'3\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E';

/** The theme button's icon: a half-filled circle, in the selector's 20 px line-icon language. */
const THEME_ICON = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.6"/><path class="fill" d="M10 3.4a6.6 6.6 0 0 1 0 13.2Z"/></svg>';

/**
 * A whole page. `kind` is material, records or index; `toc` is [{ id, n, title, empty }]; `products` a map of product
 * ID to name (the tooltips'), or null; `links` the top bar's: { index, selector, records, page }.
 */
export function documentShell({ title, description, kind, materialId = null, stamps, toc = [], body, products = null, links = {} }) {
  const bar = [
    links.page ? `<a href="${esc(links.page.href)}">${esc(links.page.words)}</a>` : '',
    links.records ? `<a href="${esc(links.records.href)}">${esc(links.records.words)}</a>` : '',
    links.selector ? `<a href="${esc(links.selector)}">Open in the selector</a>` : '',
    `<button type="button" class="theme" data-theme-toggle hidden>${THEME_ICON}<span class="theme-words">Dark theme</span></button>`,
  ].filter(Boolean).join('');
  const brand = `${MARK}<span class="brand-name">${esc(BRAND)}</span><span class="brand-part">Material pages</span>`;
  const contents = toc.length ? `<nav class="toc" aria-label="Contents"><p class="toc-title">Contents</p><ol>${toc.map((s) => `<li><a href="${esc(s.href ?? `#${s.id}`)}"${s.empty ? ' data-empty="true"' : ''}><span class="toc-n">${s.n != null ? esc(s.n) : ''}</span><span class="toc-t">${esc(s.title)}</span></a></li>`).join('')}</ol></nav>` : '';
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
${THEME}
<link rel="stylesheet" href="assets/pages.css">
<script src="assets/page.js" defer></script>
</head>
<body class="page-${esc(kind)}">
<a class="skip" href="#main">Skip to the content</a>
${SPRITE}
<header class="topbar"><div class="topbar-in">${links.index ? `<a class="brand" href="${esc(links.index)}">${brand}</a>` : `<span class="brand">${brand}</span>`}<span class="topbar-links">${bar}</span></div></header>
<div class="layout">
${contents}
<main id="main"${attrs({ 'data-page': kind, 'data-material': materialId, 'data-release': stamps.release, 'data-snapshot': stamps.snapshot, 'data-build': stamps.build })}>
${body}
</main>
</div>
<div class="tip" id="tip" aria-hidden="true" hidden></div>
${products ? jsonIsland('product-names', products) : ''}
</body>
</html>
`;
}
