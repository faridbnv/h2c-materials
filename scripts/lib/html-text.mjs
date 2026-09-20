// Reading a data sheet that is a web page, into the same shape a PDF reads into.
//
// A maker who publishes a sheet as HTML publishes the same table: a label, a value, a unit, a method. The reader
// downstream knows how to read a table once it is lines and columns, so this turns a page into exactly that and
// nothing more. A table row becomes one line whose cells sit at their own x, as a PDF's row does; a heading
// becomes the line above the rows it heads, and the heading path is what a locator names, because a web page has
// no page numbers.
//
// What it deliberately does not do is run the page. A page whose table is drawn by script is not read here: it is
// fetched as a page and, when the text has no table in it, it says so rather than reading the navigation.

import { createHash } from 'node:crypto';

const DROP = /<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const ENTITIES = new Map(Object.entries({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', micro: 'µ', plusmn: '±',
  sup2: '²', sup3: '³', times: '×', divide: '/', ndash: '-', mdash: '-', hellip: '...', bull: '*',
  laquo: '"', raquo: '"', ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", eacute: 'é', egrave: 'è',
}));

/** Text as the page shows it: entities resolved, runs of space collapsed, nothing else changed. */
export function plainText(html) {
  return String(html ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES.get(name.toLowerCase()) ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

const line = (cells, y) => {
  const spans = cells.map((text, i) => ({ x: 60 + i * 120, w: Math.max(8, text.length * 5), str: text }));
  return { y, x0: spans[0].x, x1: spans.at(-1).x + spans.at(-1).w, text: cells.join('  ').trim(), spans };
};

/**
 * A page's lines: its headings, its paragraphs and its tables' rows. `heading` on a line is the heading path it
 * sits under, which is what a locator for a web page names ("§ Technical data: Tensile modulus").
 */
export function pageLinesFromHtml(html) {
  const body = String(html ?? '').replace(COMMENT, ' ').replace(DROP, ' ');
  const lines = [];
  let heading = '';
  let y = 1000;
  const push = (cells) => { if (cells.some((c) => c)) lines.push({ ...line(cells, (y -= 12)), heading }); };

  // Tables first, in place: a row is a row wherever it sits, and its cells are its columns.
  const pieces = body.split(/(<table\b[\s\S]*?<\/table>)/i);
  for (const piece of pieces) {
    if (/^<table\b/i.test(piece)) {
      for (const row of piece.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []) {
        const cells = (row.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [])
          .map((c) => plainText(c.replace(/<[^>]+>/g, ' ')));
        push(cells);
      }
      continue;
    }
    // Everything outside a table: a heading sets the path, a block becomes a line.
    for (const m of piece.matchAll(/<(h[1-4]|p|li|dt|dd|caption|figcaption|strong|div)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = plainText(m[2].replace(/<[^>]+>/g, ' '));
      if (!text || text.length > 400) continue;
      if (/^h[1-4]$/i.test(m[1])) { heading = text; push([text]); continue; }
      push([text]);
    }
  }
  return lines;
}

/** The same shape documentText returns for a PDF, so everything downstream reads a page as it reads a sheet. */
export function htmlText(bytes, { sha = createHash('sha256').update(bytes).digest('hex'), extractor } = {}) {
  const html = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
  const lines = pageLinesFromHtml(html);
  const squeezed = lines.map((l) => l.text).join(' ').replace(/\s+/g, '');
  const title = plainText((/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html) ?? [])[1] ?? '');
  return { sha, extractor, html: true, title, pages: [{ page: 1, lines, squeezed }] };
}
