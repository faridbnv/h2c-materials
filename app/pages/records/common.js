// What the records tables share: a table with its heading and count, a long cell folded to its first words, the source
// of a record named by publisher and title with its place on the page, and the record's ID in its own cell (the only
// place an ID stands as text, D124).

import { esc, tableBox, count } from '../html.js';
import { sourceName, stated } from '../../js/ui/material-facts.js';

/** A records table under its heading, with how many rows it holds; `empty` is what an empty one says. */
export function recordTable({ id, title, n, noun, head, rows, empty, note = '', widths = null }) {
  const cols = widths ? `<colgroup>${widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>` : '';
  return `<section class="rec-sec" id="${esc(id)}" data-records="${esc(id)}" data-count="${n}">
<h2 class="rec-title">${esc(title)} <small>${esc(count(n, noun))}</small></h2>${note}
${n ? tableBox(`<table class="grid rec rec--${esc(id)}">${cols}${head}${rows}</table>`, 'rec-box') : `<p class="empty">${esc(empty)}</p>`}
</section>`;
}

/** A header row from [label, cls] pairs. */
export const headRow = (cols) => `<thead><tr>${cols.map(([label, cls]) => `<th scope="col"${cls ? ` class="${cls}"` : ''}>${label}</th>`).join('')}</tr></thead>`;

/** A cell of the source's own words (`raw`), folded past `max` characters to one line that opens in place. */
export function rawCell(text, max = 70) {
  if (!stated(text)) return '<td class="raw none">—</td>';
  return `<td class="raw">${fold(String(text).trim(), max)}</td>`;
}

/** Text folded past `max` characters: its first line, and the whole on request. Markup in `html` is the caller's. */
export function fold(text, max = 70, html = null) {
  if (text.length <= max) return html ?? esc(text);
  const cut = text.slice(0, max).replace(/\s+\S*$/, '');
  return `<details class="fold"><summary>${esc(cut)}…</summary><div class="fold-all">${html ?? esc(text)}</div></details>`;
}

/** Where a record was read: its document by name (a link to its row in Documents) and its place on the page. */
export const sourceCell = (c, sid, locator) => {
  const name = sourceName(c.sourceById.get(sid), sid);
  return `<td class="src"><a href="#doc-${esc(sid)}" title="${esc(name)}">${esc(name)}</a>${stated(locator) ? `<span class="loc" title="${esc(locator)}">${esc(locator)}</span>` : ''}</td>`;
};

/** A record's ID, in its own cell. */
export const idCell = (id) => `<td class="id">${esc(id ?? '')}</td>`;
