// The footer: what the page's numbers are and are not (method.csv, Transferable allowables), the way back to the selector
// with the material open, the index of every material page, how to cite the page, and one colophon line: when its
// documents were read, the release and build it was made from, and the typefaces.

import { esc } from '../html.js';
import { stated } from '../../js/ui/material-facts.js';
import { selectorLink } from './common.js';
import { BRAND } from '../shell.js';

/** A date never broken at its hyphens (U+2060, word joiner). */
const day = (d) => String(d).replace(/-/g, '⁠-⁠');

export default {
  id: 'footer',
  title: null,
  render(c, env) {
    const m = c.m;
    const standing = c.db.method?.find((r) => r.topic === 'Transferable allowables')?.rule;
    const st = env.stamps;
    const selector = selectorLink(c, env);
    // When the material's documents were read: the span of their access dates, which is what dates the page's values.
    const dates = [...c.documents.keys()].map((sid) => c.sourceById.get(sid)?.accessDate).filter(stated).sort();
    const read = dates.length ? (dates[0] === dates.at(-1) ? `documents read ${dates[0]}` : `documents read ${dates[0]} to ${dates.at(-1)}`) : null;
    const cite = `${m.name}. ${BRAND}, material pages, release ${st.release}${read ? `, ${read}` : ''}.`;
    const html = `<footer class="foot">
${standing ? `<p class="foot-standing">${esc(standing)}</p>` : ''}
${selector ? `<p><a class="foot-link" href="${esc(selector)}">Open ${esc(m.name)} in the selector</a>, where requirements can be set and its products judged against them.</p>` : ''}
${env.links?.index ? `<p><a href="${esc(env.links.index)}">Every material page</a>, by family and polymer.</p>` : ''}
<p><b>To cite this page:</b> ${esc(cite)}</p>
<p class="foot-fine" data-release="${esc(st.release)}">${esc(BRAND)}: ${read ? esc(`${read.charAt(0).toUpperCase()}${read.slice(1)}`).replace(/\d{4}-\d{2}-\d{2}/g, (d) => day(d)) : ''}; release <span class="mono">${esc(st.release)}</span>, built <time>${esc(day(st.build))}</time>. Set in Inter and Newsreader, under the <a href="assets/Inter-OFL.txt">SIL Open Font License</a>.</p>
</footer>`;
    return { html, empty: false, stats: {} };
  },
};
