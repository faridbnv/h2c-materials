// Reading a comparison table: one page whose columns are headed by names across the top and whose rows are labelled at
// the left, such as a printer maker's filament guide (docs/DECISIONS.md, D88). A cell is the text that stands inside its
// column and its row; a mark drawn in place of words (a filled tick or cross) is read by its fill colour.
//
// Nothing here decides anything. It is how a migration proves that what it records stands where its Locator says: in
// the column the guide heads with that name, on the row it labels with that label.

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { spanText } from './pdf-text.mjs';

/** A line's cells, split where the page leaves a gap wider than a word space, each with its extent. */
function cellsOf(line, ems = 3, floor = 10) {
  const spans = (line.spans ?? []).filter((s) => s.str?.trim()).sort((a, b) => a.x - b.x);
  if (!spans.length) return [];
  const chars = spans.reduce((a, s) => a + s.str.length, 0);
  const width = spans.reduce((a, s) => a + (s.w ?? 0), 0);
  const em = width > 0 && chars > 0 ? width / chars : 5;
  const gap = Math.max(floor, em * ems);
  const groups = [[spans[0]]];
  for (let i = 1; i < spans.length; i++) {
    const previous = spans[i - 1];
    if (spans[i].x - (previous.x + (previous.w ?? em * previous.str.length)) > gap) groups.push([]);
    groups.at(-1).push(spans[i]);
  }
  return groups.map((g) => ({ x0: g[0].x, x1: Math.max(...g.map((s) => s.x + (s.w ?? 0))), text: spanText(g) }));
}

const squeeze = (s) => String(s).replace(/\s+/g, '');

/**
 * The layout of a comparison table on one page of cached text (scripts/lib/pdf-text.mjs): its columns, every cell of
 * the line that carries each of `headings`, and its rows, the label fragments left of the first column. Label lines
 * closer than `merge` points are one label ("Build Plate" over "& Bed Temperature"). Each column runs halfway to its
 * neighbours' centres, and each row halfway to its neighbours' labels.
 */
export function tableLayout(page, headings, { labelFrom = 200, merge = 20 } = {}) {
  const want = headings.map(squeeze);
  const headingLine = page.lines.find((l) => {
    const texts = new Set(cellsOf(l).map((c) => squeeze(c.text)));
    return want.every((h) => texts.has(h));
  });
  if (!headingLine) throw new Error(`no line carries every heading (${headings.join(', ')})`);
  const heads = cellsOf(headingLine).map((c) => ({ name: c.text, centre: (c.x0 + c.x1) / 2 }));
  heads.sort((a, b) => a.centre - b.centre);
  const columns = heads.map((h, i) => {
    const left = i ? (heads[i - 1].centre + h.centre) / 2 : h.centre - (heads[i + 1].centre - h.centre) / 2;
    const right = i < heads.length - 1 ? (h.centre + heads[i + 1].centre) / 2 : h.centre + (h.centre - heads[i - 1].centre) / 2;
    return { name: h.name, centre: h.centre, left, right };
  });
  const firstColumn = columns[0].left;
  // The labels: fragments left of the first column and right of the section names, top down.
  const labelLines = page.lines
    .filter((l) => l.y < headingLine.y)
    .map((l) => ({ y: l.y, spans: l.spans.filter((s) => s.x >= labelFrom && s.x < firstColumn && s.str?.trim()) }))
    .filter((l) => l.spans.length)
    .sort((a, b) => b.y - a.y);
  const labels = [];
  for (const l of labelLines) {
    const last = labels.at(-1);
    if (last && last.ys.at(-1) - l.y < merge) { last.ys.push(l.y); last.parts.push(spanText(l.spans)); }
    else labels.push({ ys: [l.y], parts: [spanText(l.spans)] });
  }
  const rows = labels.map((l) => ({ label: l.parts.join(' '), centre: l.ys.reduce((a, b) => a + b, 0) / l.ys.length }));
  rows.forEach((r, i) => {
    r.top = i ? (rows[i - 1].centre + r.centre) / 2 : headingLine.y;
    r.bottom = i < rows.length - 1 ? (r.centre + rows[i + 1].centre) / 2 : 0;
  });
  return { columns, rows, headingY: headingLine.y };
}

const find = (list, key, what) => {
  const hit = list.find((x) => squeeze(x[key]) === squeeze(what));
  if (!hit) throw new Error(`no ${key === 'name' ? 'column headed' : 'row labelled'} "${what}"`);
  return hit;
};

/** The text of one cell, line by line top down, each line as the page spaces it. */
export function cellText(page, layout, heading, label) {
  const col = find(layout.columns, 'name', heading);
  const row = find(layout.rows, 'label', label);
  const lines = page.lines
    .filter((l) => l.y < row.top && l.y >= row.bottom)
    .map((l) => ({ y: l.y, spans: l.spans.filter((s) => { const c = s.x + (s.w ?? 0) / 2; return c >= col.left && c < col.right && s.str?.trim(); }) }))
    .filter((l) => l.spans.length)
    .sort((a, b) => b.y - a.y);
  return lines.map((l) => spanText(l.spans)).join(' ').replace(/\s+/g, ' ').trim();
}

/** Two texts are the same statement when they differ only in white space, which extraction moves about. */
export const sameText = (a, b) => squeeze(a) === squeeze(b);

const multiply = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

/**
 * Every filled shape on a page, with its fill colour ("r,g,b"), its centre and its size in page points. A mark drawn
 * in a cell (a green tick, a red cross) is one of these; the text layer does not carry it.
 */
export async function filledShapes(bytes, pageNumber = 1) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise;
  const ops = await (await doc.getPage(pageNumber)).getOperatorList();
  const shapes = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let fill = null;
  let box = null;
  const FILLS = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke]);
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i], args = ops.argsArray[i];
    if (fn === OPS.save) stack.push({ ctm, fill });
    else if (fn === OPS.restore) ({ ctm, fill } = stack.pop() ?? { ctm, fill });
    else if (fn === OPS.transform) ctm = multiply(ctm, args);
    else if (fn === OPS.setFillRGBColor) fill = Array.from(args).join(',');
    else if (fn === OPS.constructPath) box = args[2] ?? null;
    else if (FILLS.has(fn) && box) {
      const at = (x, y) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
      const [a, b] = [at(box[0], box[1]), at(box[2], box[3])];
      shapes.push({ fill, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) });
      box = null;
    }
  }
  await doc.destroy();
  return shapes;
}

/**
 * The mark drawn in one cell, by its colour: `marks` maps a fill colour ("r,g,b") to what it is written as ("✓").
 * Null when the cell holds none, and an error when it holds more than one, so a misplaced band never reads silently.
 */
export function cellMark(shapes, layout, heading, label, marks, { maxSize = 20 } = {}) {
  const col = find(layout.columns, 'name', heading);
  const row = find(layout.rows, 'label', label);
  const hits = shapes.filter((s) => marks[s.fill] && s.w <= maxSize && s.h <= maxSize
    && s.x >= col.left && s.x < col.right && s.y < row.top && s.y >= row.bottom);
  if (hits.length > 1) throw new Error(`${heading} / ${label}: ${hits.length} marks in one cell`);
  return hits.length ? marks[hits[0].fill] : null;
}
