// The footer: what the page's numbers are and are not (method.csv, Transferable allowables), the release, data and
// build it was made from, how to cite it, the way back to the selector with the material open, and the typefaces.

import { esc } from '../html.js';
import { selectorLink } from './common.js';

export default {
  id: 'footer',
  title: null,
  render(c, env) {
    const m = c.m;
    const standing = c.db.method?.find((r) => r.topic === 'Transferable allowables')?.rule;
    const st = env.stamps;
    const selector = selectorLink(c, env);
    const cite = `${m.name}. H2C material pages, release ${st.release} (data of ${st.snapshot}), built ${st.build}.`;
    const html = `<footer class="foot">
${standing ? `<p class="foot-standing">${esc(standing)}</p>` : ''}
<dl class="foot-stamps"><div><dt>Release</dt><dd class="mono">${esc(st.release)}</dd></div><div><dt>Data of</dt><dd><time>${esc(st.snapshot)}</time></dd></div><div><dt>Built</dt><dd><time>${esc(st.build)}</time></dd></div></dl>
<p><b>To cite this page:</b> ${esc(cite)}</p>
${selector ? `<p><a class="foot-link" href="${esc(selector)}">Open ${esc(m.name)} in the selector</a>, where requirements can be set and its products judged against them.</p>` : ''}
<p class="foot-fine">Generated on every build from the records. Nothing on this page decides an answer. Set in Inter and Newsreader, under the <a href="assets/Inter-OFL.txt">SIL Open Font License</a>.</p>
</footer>`;
    return { html, empty: false, stats: {} };
  },
};
