// The marks a restored page carries on the preview (WP-35): noindex, the storage shim and a banner, and the exact inverse that gives the
// saved page back. Its own module so that the legacy smoke can import it without importing the restore command.
import { NOINDEX, STORAGE_SHIM } from './preview-assemble.mjs';

export const BANNER_ATTR = 'data-restore-banner';
const BANNER_STYLE = 'margin:0;padding:.55rem 1rem;background:#ffe3e3;color:#4a0000;border-bottom:2px solid #a40000;font:600 14px/1.4 system-ui,sans-serif;text-align:center';
export const RESTORE_BANNER = `<div ${BANNER_ATTR} role="note" style="${BANNER_STYLE}">Rehearsal: the saved old site restored on the preview. Not the live tool.</div>`;

/** Puts noindex and the storage shim after <head> and the banner after <body>. Refuses a page that has no head or body. */
export function markPage(html, name = 'html') {
  if (html.includes(BANNER_ATTR)) return html;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (!head) throw new Error(`${name}: no <head> tag; refusing to publish a page that cannot carry noindex`);
  const withMeta = html.slice(0, head.index + head[0].length) + NOINDEX + STORAGE_SHIM + html.slice(head.index + head[0].length);
  const body = /<body(\s[^>]*)?>/i.exec(withMeta);
  if (!body) throw new Error(`${name}: no <body> tag; refusing to publish a page that cannot carry the banner`);
  return withMeta.slice(0, body.index + body[0].length) + RESTORE_BANNER + withMeta.slice(body.index + body[0].length);
}

/** The exact inverse of markPage: the page as saved. */
export function unmarkPage(html) {
  if (!html.includes(BANNER_ATTR)) return html;
  return html.replace(RESTORE_BANNER, '').replace(NOINDEX + STORAGE_SHIM, '');
}

