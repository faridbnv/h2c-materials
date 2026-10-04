// A page's reading order: which lines belong together when the page prints more than one column.
//
// pageLines (pdf-text.mjs) groups spans by their baseline and sorts each row by x, which is right for a table whose
// cells share a baseline and wrong for a page whose columns do not. purefil sets a processing table (label, then its
// value on the next line) beside a property table whose rows sit three units off the left column's baselines: no row
// is shared, so the left column's "Printing temperature" and its "280-300 °C" land on lines with the right column's
// rows between them, and a reader that pairs a label with the line under it never sees them together.
//
// This is an XY-cut over the lines' cells. A horizontal cut where the page leaves a clear gap between two lines; a
// vertical cut where no cell crosses a band and the lines on either side of it are mostly one-sided, which is what
// separates two columns of text from the columns of a table (every row of a table has text on both sides of each of
// its gutters). Blocks come out top to bottom, then left to right, and each block's lines are the lines the reader
// has always read, only in the order a person would read them.
//
// Pure: nothing here reads a document. The memo under .cache/layout/ is a convenience and nothing depends on it.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { cacheDir, cellSpans, spanText } from './pdf-text.mjs';

export const LAYOUT = 'xycut v1';
// Whether the sheet readers and the audits that run beside them also read a page in reading order. Off until the audit
// of what that adds (scripts/audit/reader-recall.mjs) has been read; H2C_READER_LAYOUT=1 turns it on for one run.
export const LAYOUT_DEFAULT = process.env.H2C_READER_LAYOUT === '1';

// A horizontal cut needs this much white space (in line heights) between two lines: a paragraph's leading and a
// table row's pitch are about half a line of it, a section break is two.
export const CUT_GAP = 1.5;
// A vertical cut needs this many lines wholly on each side, and fewer than this share of the lines on both.
export const COLUMN_LINES = 4;
export const COLUMN_STRADDLE = 0.3;
// A gutter is at least this wide, in line heights.
const GUTTER_WIDTH = 1.5;

const spanRight = (s) => s.x + (s.w ?? 0);
const inked = (line) => (line.spans ?? []).filter((s) => s.str?.trim());

/**
 * How tall the text on a line is, in the page's own units: a proportional font's average character is about half
 * its size, and the extractor reports the width of every piece it read. The blanks are left out because their
 * reported width measures nothing — SUNLU's sheets report a single space as 2 189 units wide.
 */
export function lineHeight(line) {
  const spans = inked(line);
  const chars = spans.reduce((a, s) => a + s.str.trim().length, 0);
  const width = spans.reduce((a, s) => a + (s.w ?? 0), 0);
  return chars > 0 && width > 0 ? (width / chars) * 2 : 10;
}

/** A line's cells with their horizontal extents. */
function cellsOf(line) {
  return cellSpans(line).map((spans) => ({ spans, x0: Math.min(...spans.map((s) => s.x)), x1: Math.max(...spans.map(spanRight)) }));
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 10; };

/** The lines cut into runs wherever the page leaves a clear gap across its whole width. */
function cutRows(items) {
  const sorted = [...items].sort((a, b) => b.line.y - a.line.y || a.at - b.at);
  const parts = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].line, b = sorted[i].line;
    const gap = a.y - b.y - Math.max(lineHeight(a), lineHeight(b));
    if (gap >= CUT_GAP * Math.max(lineHeight(a), lineHeight(b))) parts.push([]);
    parts.at(-1).push(sorted[i]);
  }
  return parts;
}

/** The widest band no cell crosses with enough one-sided lines each side of it, or null. */
function findColumns(items) {
  const cells = items.map((it) => it.cells);
  const all = cells.flat().sort((a, b) => a.x0 - b.x0);
  if (all.length < 2 * COLUMN_LINES) return null;
  const merged = [];
  for (const c of all) {
    const last = merged.at(-1);
    if (last && c.x0 <= last[1]) last[1] = Math.max(last[1], c.x1);
    else merged.push([c.x0, c.x1]);
  }
  const wide = GUTTER_WIDTH * median(items.map((it) => lineHeight(it.line)));
  let best = null;
  for (let i = 1; i < merged.length; i++) {
    const from = merged[i - 1][1], to = merged[i][0];
    if (to - from < wide) continue;
    let left = 0, right = 0, straddle = 0;
    for (const cs of cells) {
      if (!cs.length) continue;
      const l = cs.some((c) => c.x1 <= from), r = cs.some((c) => c.x0 >= to);
      if (l && r) straddle++; else if (l) left++; else right++;
    }
    if (left < COLUMN_LINES || right < COLUMN_LINES || straddle >= COLUMN_STRADDLE * (left + right + straddle)) continue;
    if (!best || to - from > best.to - best.from) best = { from, to };
  }
  return best;
}

/** A line cut at a band into the part left of it and the part right of it, as cached lines. */
function splitLine(line, cut) {
  const spans = inked(line);
  const rebuild = (part) => ({ ...line, x0: Math.min(...part.map((s) => s.x)), x1: Math.max(...part.map(spanRight)), text: spanText(part), spans: part.map((s) => ({ x: s.x, w: s.w, str: s.str })) });
  const left = spans.filter((s) => (s.x + spanRight(s)) / 2 < cut), right = spans.filter((s) => (s.x + spanRight(s)) / 2 >= cut);
  return [left.length ? rebuild(left) : null, right.length ? rebuild(right) : null];
}

/**
 * The groups of lines the page falls into, top to bottom and left to right. A horizontal cut only clears the way for
 * the columns beneath it: the regions it makes that hold no column are one block again, so the lines of a page with no
 * columns stay in the order they were read in, and a title above a table is not a block of its own.
 */
function cutBlocks(items, id = '', counter = { n: 0 }) {
  if (!items.length) return [];
  const rows = cutRows(items);
  if (rows.length > 1) return rows.flatMap((r) => cutBlocks(r, id, counter));
  const band = findColumns(items);
  if (!band) return [{ id, items }];
  const cut = (band.from + band.to) / 2, n = ++counter.n;
  const left = [], right = [];
  for (const it of items) {
    if (!it.cells.length) { left.push(it); continue; }
    const l = it.cells.some((c) => c.x1 <= band.from), r = it.cells.some((c) => c.x0 >= band.to);
    if (l && r) {
      const [a, b] = splitLine(it.line, cut);
      left.push({ ...it, line: a, cells: cellsOf(a) });
      right.push({ ...it, line: b, cells: cellsOf(b) });
    } else (l ? left : right).push(it);
  }
  return [...cutBlocks(left, `${n}L`, counter), ...cutBlocks(right, `${n}R`, counter)];
}

/** Neighbouring regions of one column (or of the page outside any column) are one block. */
function joinRegions(groups) {
  const out = [];
  for (const g of groups) {
    if (out.length && out.at(-1).id === g.id) out.at(-1).items.push(...g.items);
    else out.push({ id: g.id, items: [...g.items] });
  }
  return out.map((g) => g.items);
}

const VALUE = /^[<>≥≤~±+\-–]?\s*\d/;
const LABEL = /^[^\d\s][^:]*[A-Za-z]{3}/;

/** What a block says as label and value, for the readers of packets and metrics that want a pair, not a line. */
function pairsOf(blocks, page) {
  const out = [];
  const add = (block, label, value, mode) => out.push({ page, block, label: label.trim(), value: value.trim(), mode });
  blocks.forEach((b, k) => {
    b.lines.forEach((line, i) => {
      const cs = cellSpans(line).map((c) => spanText(c));
      if (cs.length >= 2 && LABEL.test(cs[0]) && !VALUE.test(cs[0])) {
        const at = cs.findIndex((c, j) => j > 0 && VALUE.test(c));
        if (at > 0) { add(k, cs.slice(0, at).join(' '), cs.slice(at).join(' '), 'same-row'); return; }
      }
      const colon = /^([^:\d][^:]{2,60}):\s*(\S.*)$/.exec(line.text);
      if (cs.length === 1 && colon) { add(k, colon[1], colon[2], 'key-value'); return; }
      const next = b.lines[i + 1];
      if (cs.length === 1 && LABEL.test(line.text) && !/\d/.test(line.text) && line.text.length <= 60 && next
        && cellSpans(next).length === 1 && VALUE.test(next.text) && next.text.length <= 40 && Math.abs(next.x0 - line.x0) <= 4) add(k, line.text, next.text, 'under-label');
    });
  });
  // A label column and a value column the page set on baselines of their own come out as two blocks of the same height.
  for (let k = 0; k + 1 < blocks.length; k++) {
    const a = blocks[k], b = blocks[k + 1];
    if (a.lines.length < 2 || a.lines.length !== b.lines.length) continue;
    if (a.y0 < b.y1 || b.y0 < a.y1) continue;
    if (!a.lines.every((l) => LABEL.test(l.text) && !VALUE.test(l.text)) || !b.lines.every((l) => VALUE.test(l.text))) continue;
    a.lines.forEach((l, i) => add(k, l.text, b.lines[i].text, 'key-value'));
  }
  return out;
}

/**
 * A cached page in reading order: { blocks, lines, pairs }. `lines` is the page's lines block by block, each carrying
 * its block's index; `blocks` is [{ block, from, to, x0, x1, y0, y1 }] over those lines (to exclusive).
 */
export function readingOrder(page) {
  const items = (page.lines ?? []).map((line, at) => ({ line, at, cells: cellsOf(line) }));
  if (!items.length || items.some((it) => !Number.isFinite(it.line.y))) return { blocks: [], lines: page.lines ?? [], pairs: [] };
  const groups = joinRegions(cutBlocks(items));
  const lines = [], blocks = [];
  groups.forEach((group, block) => {
    const ordered = group.map((it) => it.line).filter(Boolean).sort((a, b) => b.y - a.y);
    const from = lines.length;
    for (const line of ordered) lines.push({ ...line, block });
    blocks.push({ block, from, to: lines.length, x0: Math.min(...ordered.map((l) => l.x0)), x1: Math.max(...ordered.map((l) => l.x1)), y0: ordered[0].y, y1: ordered.at(-1).y });
  });
  const withLines = blocks.map((b) => ({ ...b, lines: lines.slice(b.from, b.to) }));
  return { blocks, lines, pairs: pairsOf(withLines, page.page) };
}

const memoPath = (sha) => cacheDir('layout', `${sha}.json`);

/**
 * The document's text with every page in reading order: the shape documentText returns, `lines` in block order and
 * `blocks` and `pairs` added to each page. Text that is not a PDF's (a web page's table rows) is returned as it is.
 * `memo` keeps the result under .cache/layout/<sha>.json; it is only ever a shortcut, never read without checking
 * that the layout version and the extractor it was made from are the ones asked for.
 */
export function withReadingOrder(text, { memo = false } = {}) {
  if (!String(text.extractor ?? '').startsWith('pdfjs')) return text;
  const path = text.sha ? memoPath(text.sha) : null;
  if (memo && path && existsSync(path)) {
    try {
      const kept = JSON.parse(readFileSync(path, 'utf8'));
      if (kept.layout === LAYOUT && kept.source === text.extractor && kept.pages?.length === text.pages.length) {
        return { ...text, pages: text.pages.map((p, i) => ({ ...p, ...kept.pages[i] })) };
      }
    } catch { /* an unreadable memo is read again */ }
  }
  const pages = text.pages.map((p) => { const { blocks, lines, pairs } = readingOrder(p); return { ...p, lines, blocks, pairs }; });
  if (memo && path) {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify({ sha: text.sha, layout: LAYOUT, source: text.extractor, pages: pages.map(({ page, lines, blocks, pairs }) => ({ page, lines, blocks, pairs })) }));
    renameSync(tmp, path);
  }
  return { ...text, pages };
}
