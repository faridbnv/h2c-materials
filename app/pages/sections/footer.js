// The colophon at the foot of a material's two pages (the pages reimagined, 2026-10-17): what the numbers are and are
// not (method.csv, Transferable allowables), the way back to the selector and to the material's other page, when its
// documents were read, the release and build, who wrote the summary and its status, and the citation with a button that
// copies it. Nothing else: the bar is the way around.

import { esc, overviewHref, productsHref } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { stated, isProduct } from '../../js/ui/material-facts.js';
import { SUMMARY_STATUS } from '../../js/ui/labels.js';
import { selectorLink } from './common.js';
import { BRAND, ICON, returnLink } from '../shell.js';

/** A date never broken at its hyphens (U+2060, word joiner). */
const day = (d) => String(d).replace(/-/g, '⁠-⁠');

/** When a material's documents were read: the span of their access dates, which is what dates its values. */
export function readSpan(c) {
  const dates = [...c.documents.keys()].map((sid) => c.sourceById.get(sid)?.accessDate).filter(stated).sort();
  return dates.length ? { from: dates[0], to: dates.at(-1) } : null;
}

/** The colophon of a material's page; `page` is the page it closes, 'overview' or 'products'. */
export function colophon(c, env, page = 'overview') {
  const m = c.m;
  const st = env.stamps;
  const standing = c.db.method?.find((r) => r.topic === 'Transferable allowables')?.rule;
  const read = readSpan(c);
  const readWords = read ? (read.from === read.to ? `documents read ${read.from}` : `documents read ${read.from} to ${read.to}`) : null;
  const cite = `${m.name}. ${BRAND}, material pages, release ${st.release}${readWords ? `, ${readWords}` : ''}.`;
  const w = m.written;
  const byline = w?.parts?.length ? `The summary was written by ${w.by}, ${w.on}. ${SUMMARY_STATUS[w.status] ?? w.status}. Its numbers are filled from the data.` : null;
  const n = c.grades.filter(isProduct).length;
  const other = page === 'overview'
    ? `<a class="btn" href="${esc(productsHref(m.id))}">Products <span class="n">${esc(fmtNumber(n))}</span></a>`
    : `<a class="btn" href="${esc(overviewHref(m.id))}">${esc(`${m.name} overview`)}</a>`;
  return `<footer class="colophon" data-section="colophon">
<div class="col-main">
${standing ? `<p class="col-standing">${esc(standing)}</p>` : ''}
<div class="col-nav">${returnLink(selectorLink(c, env))}${other}</div>
</div>
<div class="col-fine" data-release="${esc(st.release)}">
<p>${esc(BRAND)}, release <span class="mono">${esc(st.release)}</span>${read ? `. ${esc(readWords.charAt(0).toUpperCase() + readWords.slice(1)).replace(/\d{4}-\d{2}-\d{2}/g, (d) => day(d))}` : ''}; built <time>${esc(day(st.build))}</time>.</p>
${byline && page === 'overview' ? `<p data-written-status="${esc(w.status)}">${esc(byline)}</p>` : ''}
<p class="col-cite"><span>To cite this page: </span><span data-cite>${esc(cite)}</span> <button type="button" class="btn btn-quiet" data-copy hidden>${ICON.copy}<span>Copy the citation</span></button></p>
<p>Set in Inter and Newsreader, under the <a href="assets/Inter-OFL.txt">SIL Open Font License</a>.</p>
</div>
</footer>`;
}

export default {
  id: 'footer',
  title: null,
  render(c, env) {
    return { html: colophon(c, env, 'overview'), empty: false, stats: {} };
  },
};
