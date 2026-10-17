// A figure as every page draws it: its number and a title that states what it shows, a key only where the marks need
// one, the plot (one role="img" with an aria-label; its marks are aria-hidden), and a caption: one line on how to read
// it, then "How this is counted" closed, holding what is counted, what is drawn and not counted, what is not drawn and
// why, the method's rule, the figure's numbers as a table and the way to the records. Nothing of the bookkeeping is lost,
// and none of it is in the reading path.

import { attrs, esc } from '../html.js';

/**
 * `id` the anchor, `n` its number ("4.1"), `title` plain text (the finding it shows), `data` the figure's attributes,
 * `key` the key's markup (or ''), `plot` the plot's markup and `label` its accessible description (null where the plot is
 * itself readable text, a table), `read` markup (how to
 * read it, one or two short sentences), `counted` markup (the closed part), `cls` extra classes.
 */
export function figure({ id, n, title, data = {}, key = '', plot, label, read = '', counted = '', cls = '' }) {
  return `<figure class="fig${cls ? ` ${cls}` : ''}" id="${esc(id)}"${attrs(data)}>
<div class="fig-head"><p class="fig-n">Figure ${esc(n)}</p><h3 class="fig-title">${esc(title)}</h3></div>
${key}<div class="fig-plot"${label ? ` role="img" aria-label="${esc(label)}"` : ''}>${plot}</div>
<figcaption>${read ? `<p class="fig-read">${read}</p>` : ''}${counted ? howCounted(counted) : ''}</figcaption>
</figure>`;
}

/** The closed line under a figure or a table: what is counted and how, opened by a reader who wants it. */
export const howCounted = (body, summary = 'How this is counted') => `<details class="counted"><summary>${esc(summary)}</summary><div class="counted-body">${body}</div></details>`;

/** A method rule inside "How this is counted": its question as a small heading, then the rule's words. */
export const aboutLine = (summary, body) => `<div class="about"><h4>${esc(summary)}</h4>${body}</div>`;

/** A figure's anchor from its number: "fig-4-2". */
export const figId = (n) => `fig-${String(n).replace('.', '-')}`;

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
