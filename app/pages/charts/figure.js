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
