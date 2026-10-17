// The document around a material page or a records page: head (title, the shared stylesheet and script, linked
// relatively so a page opened from disk finds them), a top bar, the contents (a sticky rail at 1,080 px and wider, a
// strip of section links below that), the main element carrying the page's stamps (the test hooks), and the product
// names the figures' tooltips read.

import { attrs, esc, jsonIsland } from './html.js';
import { SPRITE } from './charts/marks.js';

/** Applied before the stylesheet paints, so a page opened in the dark theme does not flash light. */
const THEME = '<script>try{var t=localStorage.getItem("h2c-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>';

/**
 * A whole page. `kind` is material, records or index; `toc` is [{ id, n, title, empty }]; `products` a map of product
 * ID to name (the tooltips'), or null; `links` the top bar's: { index, selector, records, page }.
 */
export function documentShell({ title, description, kind, materialId = null, stamps, toc = [], body, products = null, links = {} }) {
  const bar = [
    links.page ? `<a href="${esc(links.page.href)}">${esc(links.page.words)}</a>` : '',
    links.records ? `<a href="${esc(links.records.href)}">${esc(links.records.words)}</a>` : '',
    links.selector ? `<a href="${esc(links.selector)}">Open in the selector</a>` : '',
    '<button type="button" class="theme" data-theme-toggle hidden>Dark theme</button>',
  ].filter(Boolean).join('');
  const contents = toc.length ? `<nav class="toc" aria-label="Contents"><p class="toc-title">Contents</p><ol>${toc.map((s) => `<li><a href="#${esc(s.id)}"${s.empty ? ' data-empty="true"' : ''}><span class="toc-n">${s.n != null ? esc(s.n) : ''}</span><span class="toc-t">${esc(s.title)}</span></a></li>`).join('')}</ol></nav>` : '';
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="generator" content="H2C material pages, release ${esc(stamps.release)}, database snapshot ${esc(stamps.snapshot)}, build ${esc(stamps.build)}">
<meta name="color-scheme" content="light dark">
${THEME}
<link rel="stylesheet" href="assets/pages.css">
<script src="assets/page.js" defer></script>
</head>
<body class="page-${esc(kind)}">
<a class="skip" href="#main">Skip to the content</a>
${SPRITE}
<div class="topbar"><div class="topbar-in">${links.index ? `<a class="site" href="${esc(links.index)}">H2C material pages</a>` : '<span class="site">H2C material pages</span>'}<span class="topbar-links">${bar}</span></div></div>
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
