// Reading a data sheet that is a web page, into the same shape a PDF reads into.
//
// A maker who publishes a sheet as HTML publishes the same table: a label, a value, a unit, a method. The reader
// downstream knows how to read a table once it is lines and columns, so this turns a page into exactly that and
// nothing more. A table row becomes one line whose cells sit at their own x, as a PDF's row does; a heading
// becomes the line above the rows it heads, and the heading path is what a locator names, because a web page has
// no page numbers.
//
// What a maker's page prints in other markup than a table is brought to the same shape before the lines are built:
//   - a definition list (`dl`) is a table of its terms and definitions;
//   - a grid of `div`s or `li`s that each hold a label and a value (`<div class="spec"><span>Nozzle</span>
//     <span>200-230 °C</span></div>`, the usual Shopify and WooCommerce spec block) is a table of those pairs;
//   - a table's `colspan` and `rowspan` are expanded to empty cells, so the cells beside a merged cell keep their
//     column;
//   - the product data a page carries as data and not as markup (JSON-LD `Product`, a Shopify product's
//     `body_html`, a `__NEXT_DATA__` description) is read last, under its own heading, where the visible page does
//     not already say the same line.
//
// What it deliberately does not do is run the page. A page whose table is drawn by script is not read here: it is
// captured by `scripts/ingest/capture.mjs` (a headless browser, which also opens the tabs and accordions) and the
// rendered document is read like any other; a page whose text has no table in it says so rather than reading the
// navigation.

import { createHash } from 'node:crypto';

const DROP = /<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
// A numeric comparison such as Nanovia's literal "< 1" is text, not an HTML tag.
const TAG = /<\/?[A-Za-z][^>]*>/g;
const ENTITIES = new Map(Object.entries({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', micro: 'µ', plusmn: '±',
  sup2: '²', sup3: '³', times: '×', divide: '/', ndash: '-', mdash: '-', hellip: '...', bull: '*',
  laquo: '"', raquo: '"', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", eacute: 'é', egrave: 'è',
  reg: '®', trade: '™', copy: '©', le: '≤', ge: '≥', ne: '≠', asymp: '≈', minus: '-', middot: '·',
  ensp: ' ', emsp: ' ', thinsp: ' ', shy: '', ouml: 'ö', uuml: 'ü', auml: 'ä', szlig: 'ß', ccedil: 'ç',
  frac12: '½', frac14: '¼', ordm: '°', sup1: '¹', rarr: '→', larr: '←', ohm: 'Ω', Omega: 'Ω',
}));

/** Text as the page shows it: entities resolved, runs of space collapsed, nothing else changed. */
export function plainText(html) {
  return String(html ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => ENTITIES.get(name) ?? ENTITIES.get(name.toLowerCase()) ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cellText = (html) => plainText(String(html).replace(TAG, ' '));

const line = (cells, y) => {
  const spans = cells.map((text, i) => ({ x: 60 + i * 120, w: Math.max(8, text.length * 5), str: text }));
  return { y, x0: spans[0].x, x1: spans.at(-1).x + spans.at(-1).w, text: cells.join('  ').trim(), spans };
};

// Semantic/leaf blocks, without repeating inline children already represented by their parent.
const blocksOf = (piece) => {
  const blocks = [...piece.matchAll(/(?=<(h[1-4]|p|li|dt|dd|caption|figcaption|strong|span|div)\b[^>]*>([\s\S]*?)<\/\1>)/gi)]
    .filter((m) => !/<(?:h[1-4]|p|li|dt|dd|caption|figcaption|div)\b/i.test(m[2]));
  return blocks.filter((m) => !(/^(strong|span)$/i.test(m[1]) && blocks.some((parent) => parent !== m && parent.index < m.index
    && parent.index + piece.slice(parent.index).indexOf('>') + 1 + parent[2].length > m.index)));
};

// ---- A small tag tree: enough structure to find a definition list or a grid of label/value pairs, with the source
// offsets of each element so that what is found can be written back into the page as a table.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
// An opening tag that ends the element it follows (HTML's optional end tags).
const ENDS = { li: ['li'], dt: ['dt', 'dd'], dd: ['dt', 'dd'], p: ['p'], tr: ['tr', 'td', 'th'], td: ['td', 'th'], th: ['td', 'th'], option: ['option'] };
const OPENING_TAG = /<(\/?)([A-Za-z][A-Za-z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

export function tagTree(html) {
  const root = { tag: '#root', attrs: '', start: 0, openEnd: 0, innerEnd: html.length, end: html.length, children: [] };
  const stack = [root];
  let last = 0, m;
  OPENING_TAG.lastIndex = 0;
  const flush = (to) => { if (to > last) stack.at(-1).children.push({ text: html.slice(last, to) }); };
  while ((m = OPENING_TAG.exec(html))) {
    flush(m.index);
    last = OPENING_TAG.lastIndex;
    const tag = m[2].toLowerCase();
    if (m[1]) {
      let i = stack.length - 1;
      while (i > 0 && stack[i].tag !== tag) i--;
      if (i > 0) {
        for (let k = stack.length - 1; k >= i; k--) { stack[k].innerEnd = m.index; stack[k].end = k === i ? last : m.index; }
        stack.length = i;
      }
      continue;
    }
    const ends = ENDS[tag];
    if (ends && ends.includes(stack.at(-1).tag)) { const top = stack.pop(); top.innerEnd = top.end = m.index; }
    const node = { tag, attrs: m[3], start: m.index, openEnd: last, innerEnd: last, end: last, children: [] };
    stack.at(-1).children.push(node);
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) stack.push(node);
  }
  flush(html.length);
  return root;
}

const classOf = (node) => (/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(node.attrs ?? '') ?? []).slice(1).find((x) => x !== undefined) ?? '';
const HEADING = /^h[1-6]$/;
// What an element prints, as the page shows it.
const textOfNode = (html, node) => cellText(html.slice(node.openEnd, node.innerEnd));
const hasDirectText = (node) => node.children.some((c) => c.text !== undefined && plainText(c.text) !== '');
const carriesText = (node) => (node.carries ??= hasDirectText(node) || node.children.some((c) => c.tag && carriesText(c)));

// The text blocks of an element: the element itself when it holds text of its own (a label with an inline unit is
// one block), otherwise the blocks of each child that carries text.
function leafBlocks(node, chain = []) {
  const here = [...chain, classOf(node)];
  if (hasDirectText(node)) return [{ node, classes: here.join(' ') }];
  return node.children.filter((c) => c.tag && carriesText(c)).flatMap((c) => leafBlocks(c, here));
}

const LABEL_CLASS = /label|name|key|title|term|head/i, VALUE_CLASS = /value|\bval\b|data|desc|detail/i;
const NOT_A_PAIR = /^(table|ul|ol|dl|tr|td|th|button|select|option|form|nav)$/;
const GRID_PARENTS = new Set(['div', 'ul', 'ol', 'section', 'article', 'span', 'dl', 'aside', 'main', 'form', 'fieldset']);

/** An element that is one label and one value, as its cells ([label, value], or one cell where the label ends in a colon); null when it is not. */
function labelValue(html, child) {
  if (!child.tag || HEADING.test(child.tag) || NOT_A_PAIR.test(child.tag)) return null;
  const blocks = leafBlocks(child);
  if (blocks.length !== 2 || blocks.some((b) => HEADING.test(b.node.tag))) return null;
  let [label, value] = blocks.map((b) => ({ ...b, text: textOfNode(html, b.node) }));
  // The class names break a tie the order of the page leaves: a value drawn before its label.
  if (VALUE_CLASS.test(label.classes) && !LABEL_CLASS.test(label.classes) && LABEL_CLASS.test(value.classes) && !VALUE_CLASS.test(value.classes)) [label, value] = [value, label];
  if (!label.text || !value.text || label.text.length > 80 || value.text.length > 200 || !/[A-Za-z]{2}/.test(label.text)) return null;
  // "Nozzle Specs: Minimum 0.4 mm" is a sentence the line reader already reads whole; split in two cells it is not.
  return /[:：]$/.test(label.text) ? [`${label.text} ${value.text}`] : [label.text, value.text];
}

const rowsTable = (rows) => `<table>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</table>`;

/** The pairs of a definition list, a term per row with its definitions beside it. */
function definitionRows(html, dl) {
  const rows = [];
  let terms = [], current = null;
  const visit = (node) => {
    for (const c of node.children) {
      if (!c.tag) continue;
      if (c.tag === 'dt') { const text = textOfNode(html, c); if (text) terms.push(text); }
      else if (c.tag === 'dd') {
        const text = textOfNode(html, c);
        if (!text) continue;
        if (terms.length) { current = [terms.join(' '), text]; rows.push(current); terms = []; }
        else if (current) current[1] += `; ${text}`;
        else rows.push([text]);
      } else if (c.tag !== 'dl') visit(c);
    }
  };
  visit(dl);
  return rows;
}

/**
 * The page with each definition list and each grid of label/value blocks rewritten as a table, so that the table
 * reader below turns them into the lines a PDF's rows are. A parent whose children hold exactly two text blocks each,
 * three or more times and for most of its text-bearing children, is a spec grid; a child that is not a pair (a
 * heading above the grid, a note below it) stays where it was.
 */
export function tabulateBlocks(html) {
  if (!/<(dl|div|ul|ol|section|article|span|aside|main|form|fieldset)\b/i.test(html)) return html;
  const root = tagTree(html);
  const edits = [];
  const walk = (node, inTable) => {
    if (node.tag === 'table' || node.tag === 'tr') inTable = true;
    if (!inTable && node.tag === 'dl') {
      const rows = definitionRows(html, node);
      if (rows.length) { edits.push({ start: node.start, end: node.end, html: rowsTable(rows) }); return; }
    }
    if (!inTable && GRID_PARENTS.has(node.tag)) {
      const kids = node.children.filter((c) => c.tag && carriesText(c) && !HEADING.test(c.tag));
      const pairs = kids.map((c) => ({ c, pair: labelValue(html, c) })).filter((x) => x.pair);
      if (pairs.length >= 3 && pairs.length >= kids.length * 0.6 && pairs.filter((x) => /[A-Za-z]{3}/.test(x.pair[0])).length >= 3) {
        for (const { c, pair } of pairs) edits.push({ start: c.start, end: c.end, html: rowsTable([pair]) });
        for (const c of kids) if (!pairs.some((x) => x.c === c)) walk(c, inTable);
        return;
      }
    }
    for (const c of node.children) if (c.tag) walk(c, inTable);
  };
  walk(root, false);
  let out = html;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.html + out.slice(e.end);
  return out;
}

// ---- A table's cells, with colspan and rowspan expanded.
const spanOf = (attrs, name, max) => {
  const n = Number((new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i').exec(attrs) ?? [])[1] ?? 1);
  return Math.min(max, Math.max(1, n || 1));
};

/**
 * Every row of a table as its cells. A cell that spans columns takes the first and leaves the rest empty, and a
 * cell that spans rows leaves an empty cell in each row below it, so the cells after either keep their column.
 * The merged text is not repeated: a row's own label stays its first cell, which is where the readers look for it
 * (repeating "Filament Properties" ahead of every row of its group moved every label one column right and cost
 * water absorption, Vicat and the print settings their rows).
 */
export function tableRows(piece) {
  const carried = new Map();
  const rows = [];
  for (const row of piece.matchAll(/<tr\b[\s\S]*?(?=<\/tr>|<tr\b|<\/table>|$)/gi)) {
    const cells = [];
    let col = 0;
    const carry = () => { while (carried.has(col)) { cells.push({ text: '', pad: true }); if (carried.get(col) <= 1) carried.delete(col); else carried.set(col, carried.get(col) - 1); col++; } };
    for (const cell of row[0].matchAll(/<t([dh])\b([^>]*)>([\s\S]*?)(?=<\/t[dh]>|<t[dh]\b|<\/tr>|$)/gi)) {
      carry();
      const text = cellText(cell[3]);
      const colspan = spanOf(cell[2], 'colspan', 12), rowspan = spanOf(cell[2], 'rowspan', 50);
      for (let i = 0; i < colspan; i++) {
        cells.push({ text: i ? '' : text, pad: i > 0 });
        if (rowspan > 1) carried.set(col, rowspan - 1);
        col++;
      }
    }
    carry();
    while (cells.length && cells.at(-1).pad) cells.pop();
    rows.push({ m: row, cells: cells.map((c) => c.text) });
  }
  return rows;
}

// Lines, without their y: the caller numbers them. `heading` is the heading path each sits under.
function linesOfBody(body) {
  const lines = [];
  let heading = '';
  const push = (cells) => { if (cells.some((c) => c)) lines.push({ ...line(cells, 0), heading }); };

  // Tables first, in place: a row is a row wherever it sits, and its cells are its columns.
  const pieces = body.split(/(<table\b[\s\S]*?<\/table>)/i);
  for (const piece of pieces) {
    if (/^<table\b/i.test(piece)) {
      const rows = tableRows(piece);
      // Some maker pages put specimen prose directly in tbody. Preserve it in source order;
      // blocks overlapping a row are already represented by that row's cells.
      const blocks = blocksOf(piece).filter((m) => {
        const end = m.index + piece.slice(m.index).indexOf('>') + 1 + m[2].length + m[1].length + 3;
        return !rows.some((r) => m.index < r.m.index + r.m[0].length && end > r.m.index);
      });
      for (const event of [...rows.map((r) => ({ m: r.m, cells: r.cells, row: true })), ...blocks.map((m) => ({ m, row: false }))].sort((a, b) => a.m.index - b.m.index)) {
        const m = event.m;
        if (event.row) push(event.cells);
        else {
          const text = plainText(m[2].replace(TAG, ' '));
          if (/^h[1-4]$/i.test(m[1])) heading = text;
          push([text]);
        }
      }
      continue;
    }
    // Everything outside a table: a heading sets the path, a block becomes a line.
    // A consuming match on an outer div hid its paragraphs, and the length cutoff then dropped them.
    // Inspect nested blocks without consuming their children. Keep leaf wrappers and semantic paragraphs;
    // an inline strong inside a retained paragraph is already represented by that paragraph.
    for (const m of blocksOf(piece)) {
      const text = plainText(m[2].replace(TAG, ' '));
      if (!text) continue;
      if (/^h[1-4]$/i.test(m[1])) { heading = text; push([text]); continue; }
      push([text]);
    }
  }
  return lines;
}

// ---- The product data a page carries as data and not as markup.
const STRUCTURED = 'Product data (structured)';
const parseJson = (text) => {
  for (const candidate of [text, text.replace(/[\u0000-\u001f]+/g, ' ')]) { try { return JSON.parse(candidate); } catch { /* try the next reading */ } }
  return null;
};
const PRODUCT_ID = /^(sku|variants|handle|price|offers|slug|productId|product_id|gtin|mpn)$/;

/** Product descriptions, properties and questions found in a page's data blocks: { descriptions, properties, questions }. */
export function structuredData(html) {
  const found = { descriptions: [], properties: [], questions: [] };
  const seen = new Set();
  const note = (list, item, key = JSON.stringify(item)) => { if (!seen.has(`${list}\u0000${key}`)) { seen.add(`${list}\u0000${key}`); found[list].push(item); } };
  const describe = (o) => {
    for (const key of ['description', 'body_html', 'bodyHtml']) {
      const v = o[key];
      if (typeof v === 'string' && plainText(v.replace(TAG, ' ')).length >= 20) note('descriptions', { name: typeof o.name === 'string' ? o.name : typeof o.title === 'string' ? o.title : '', text: v }, v);
    }
  };
  const walk = (o, depth = 0) => {
    if (depth > 40 || o == null || typeof o !== 'object') return;
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    const types = [].concat(o['@type'] ?? []).map(String);
    if (types.some((t) => /Product/.test(t))) {
      describe(o);
      for (const p of [].concat(o.additionalProperty ?? [])) {
        if (p && typeof p === 'object' && p.name != null && p.value != null && String(p.value).trim()) note('properties', [String(p.name), [p.value, p.unitText ?? p.unitCode].filter((x) => x != null && x !== '').join(' ')]);
      }
    } else if (types.includes('Question') && typeof o.name === 'string') {
      const answer = o.acceptedAnswer?.text;
      if (typeof answer === 'string') note('questions', { question: o.name, answer });
    } else if (!types.length && Object.keys(o).some((k) => PRODUCT_ID.test(k))) describe(o);
    for (const v of Object.values(o)) walk(v, depth + 1);
  };
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = script[1], body = script[2];
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) ?? [])[1] ?? '';
    if (/json/i.test(type) || /__NEXT_DATA__|data-product-json/.test(attrs)) {
      const data = body.length > 4_000_000 ? null : parseJson(body.trim());
      if (data) walk(data);
    } else if (!type || /javascript|module/i.test(type)) {
      // A Shopify theme prints its product as a script variable: the markup of its description is a string literal.
      for (const m of body.matchAll(/"(?:body_html|bodyHtml)"\s*:\s*("(?:[^"\\]|\\[\s\S])*")/g)) {
        const text = parseJson(m[1]);
        if (typeof text === 'string') describe({ body_html: text });
      }
    }
  }
  return found;
}

/** Structured data as a page fragment: the same markup the line builder reads everywhere else. */
function structuredFragment(data) {
  // A description is markup or plain text with line breaks; either may carry entities ("80 &deg;C").
  const markup = (text) => (/<[A-Za-z][^>]*>/.test(text) ? text : String(text).split(/\r?\n+/).map((l) => `<p>${escapeHtml(plainText(l))}</p>`).join(''));
  const parts = [];
  for (const { name, text } of data.descriptions) {
    if (name) parts.push(`<p>${escapeHtml(plainText(name))}</p>`);
    parts.push(markup(text));
  }
  if (data.properties.length) parts.push(rowsTable(data.properties.map((r) => r.map(plainText))));
  for (const { question, answer } of data.questions) parts.push(`<p>${escapeHtml(plainText(question))}</p>`, markup(answer));
  return parts.length ? `<h2>${STRUCTURED}</h2>${parts.join('')}` : '';
}

const squeeze = (text) => text.toLowerCase().replace(/\s+/g, '');
const prepare = (html) => tabulateBlocks(String(html ?? '').replace(COMMENT, ' ').replace(DROP, ' '));

/**
 * A page's lines: its headings, its paragraphs and its tables' rows. `heading` on a line is the heading path it
 * sits under, which is what a locator for a web page names ("§ Technical data: Tensile modulus"). The product data
 * the page holds as data follows the visible page, under "Product data (structured)", minus every line the visible
 * page already printed.
 */
export function pageLinesFromHtml(html, { structured = true } = {}) {
  const source = String(html ?? '');
  const lines = linesOfBody(prepare(source));
  if (structured) {
    const fragment = structuredFragment(structuredData(source.replace(COMMENT, ' ')));
    if (fragment) {
      // A line the visible page already prints, whole or inside a longer line, adds nothing.
      const printed = lines.map((l) => squeeze(l.text));
      const page = printed.join('');
      const extra = linesOfBody(prepare(fragment)).filter((l, i) => {
        const s = squeeze(l.text);
        return i === 0 || (s.length >= 8 ? !page.includes(s) : !printed.includes(s));
      });
      if (extra.length > 1) lines.push(...extra);
    }
  }
  return lines.map((l, i) => ({ ...l, y: 1000 - 12 * (i + 1) }));
}

/** The same shape documentText returns for a PDF, so everything downstream reads a page as it reads a sheet. */
export function htmlText(bytes, { sha = createHash('sha256').update(bytes).digest('hex'), extractor } = {}) {
  const html = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const lines = pageLinesFromHtml(html);
  const squeezed = lines.map((l) => l.text).join(' ').replace(/\s+/g, '');
  const title = plainText((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html) ?? [])[1] ?? '');
  return { sha, extractor, html: true, title, pages: [{ page: 1, lines, squeezed }] };
}
