// A figure as every page draws it (D145): a title that states what it shows, the question it answers, a key only of
// the marks drawn, the plot (one role="img" with an aria-label where it is a picture; its marks are aria-hidden), and a
// caption: one line on how to read it, and "The figure as a table" closed beneath, holding its numbers, what this
// material leaves out and the way to the method page. Nothing of the bookkeeping is lost, and none of it is in the
// reading path.

import { attrs, esc } from '../html.js';

/**
 * A figure of the reimagined pages: `<figure class="fig" id="fig-<slug>" data-figure="<kind>">` holding its title (the
 * finding), the question it answers, a key of only the marks drawn, the plot, one line on how to read it, and one fold,
 * "The figure as a table": the table twin, a line on what this material leaves out, and the way to the method page.
 * `howto` is a line on hovering or selecting (class fig-howto, which print leaves out).
 * `plot` is markup; `label` the plot's accessible description where the plot is a picture (role="img"), or null where it
 * holds links and text a reader reaches (the alternatives' names).
 */
export function figFrame({ slug, kind, title, question = '', key = '', plot, label = null, read = '', howto = '', table = '', leaves = '', method = '' }) {
  const fold = table || leaves
    ? `<details class="fig-data"><summary>The figure as a table</summary>${table}${leaves ? `<p class="fig-leaves">${esc(leaves)}</p>` : ''}`
      + `<p class="fig-method"><a href="method.html${method ? `#${esc(method)}` : ''}">How the numbers are worked out</a></p></details>` : '';
  return `<figure class="fig dv-fig" id="fig-${esc(slug)}" data-figure="${esc(kind)}">
<div class="fig-head"><h3 class="fig-title">${esc(title)}</h3>${question ? `<p class="fig-q">${esc(question)}</p>` : ''}</div>
${key}<div class="fig-plot"${label ? ` role="img" aria-label="${esc(label)}"` : ''}>${plot}</div>
<figcaption>${read ? `<p class="fig-read">${esc(read)}</p>` : ''}${howto ? `<p class="fig-read fig-howto no-print">${esc(howto)}</p>` : ''}${fold}</figcaption>
</figure>`;
}
