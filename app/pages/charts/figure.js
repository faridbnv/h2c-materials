// A figure as every page draws it: a numbered title, a key of the marks actually drawn, the plot (one role="img" with
// an aria-label; its marks are aria-hidden), a summary table that is the plot's text alternative, notes, and the
// figcaption saying what is drawn and what is left out (the counted line). Nothing is drawn without its caption.

import { attrs, esc } from '../html.js';

/**
 * `id` the anchor, `n` its number ("4.1"), `title` plain text, `data` the figure's attributes, `key` the key's markup,
 * `plot` the plot's markup and `label` its accessible description, `table` and `notes` markup, `caption` markup.
 */
export function figure({ id, n, title, data = {}, key = '', plot, label, table = '', notes = '', caption, about = '', wide = false }) {
  return `<figure class="fig${wide ? ' fig--wide' : ''}" id="${esc(id)}"${attrs(data)}>
<div class="fig-head"><h3 class="fig-title"><span class="fig-n">Figure ${esc(n)}</span> ${esc(title)}</h3>${key}</div>
<div class="fig-plot" role="img" aria-label="${esc(label)}">${plot}</div>
${table}${notes}${about}
<figcaption>${caption}</figcaption>
</figure>`;
}

/** A closed line a reader opens for how the tests differ and what is compared (method.csv's words). */
export const aboutLine = (summary, body) => `<details class="about"><summary>${esc(summary)}</summary>${body}</details>`;
