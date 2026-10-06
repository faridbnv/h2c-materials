// The document's own text layer as a page source for compare.mjs (--source text | tesseract), check round 3.
//
// Mistral's reading gives rows and header cells as a table. The text layer gives positioned spans, so the same structure is
// rebuilt from geometry (no model, no image):
//   - a line is a row; its cells are the span groups split where the gap exceeds GAP_CHARS median character widths of the
//     page (scripts/lib/pdf-text.mjs cellSpans does the same on a per-line em; the page median is steadier for short lines);
//   - a header row is the nearest line above the row that holds no value and whose cells overlap the row's cells in x; the
//     lines stacked directly above it that overlap too are stacked on it ("Tensile / X-Y"), as htmlTableToGrid stacks a
//     table's header rows;
//   - a cell's header is the header cell that overlaps it most in x.
// Source files: .cache/layout/<sha>.json (pages[].lines[]: y, x0, x1, text, spans[{x, w, str}], block), else
// .cache/text/<sha>.json (the same lines; a web page's rows arrive as lines whose cells sit at their own x, so a web page is
// read by the same rule), else null. tesseract: .cache/ocr-text/<sha>.json, lines as rows with the label first and each value
// its own cell, no headers: a row with several values can only be row-only.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spanText, cachedText } from '../../../../scripts/lib/pdf-text.mjs';
import { DOCUMENT_CACHE } from '../../../../scripts/ingest/context.mjs';
import { numberStyle, valuesIn, stripLatex, maskConditions } from './compare.mjs';

export const GAP_CHARS = 1.5;
// An attached value's distance to its label line must be at most this share of its distance to the next nearest label line.
export const ATTACH = 0.6;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const inked = (line) => (line.spans ?? []).filter((s) => s.str?.trim());
const right = (s) => s.x + (s.w ?? 0);

/** The page's median character width, from spans of three characters or more (a blank's reported width measures nothing). */
export function charWidth(lines) {
  const ws = [];
  for (const l of lines) for (const s of inked(l)) { const n = s.str.trim().length; if (n >= 3 && s.w > 0 && s.w / n < 30) ws.push(s.w / n); }
  return median(ws) || 5;
}

/** A line's cells: [{ x0, x1, text }], split where the white between two spans is wider than gap. */
export function cellsOfLine(line, gap) {
  const spans = inked(line).sort((a, b) => a.x - b.x);
  if (!spans.length) return [];
  const groups = [[spans[0]]];
  for (let i = 1; i < spans.length; i++) {
    const white = spans[i].x - right(spans[i - 1]);
    if (white > gap) groups.push([]);
    groups.at(-1).push(spans[i]);
  }
  const cells = groups.map((g) => ({ x0: g[0].x, x1: Math.max(...g.map(right)), text: spanText(g).replace(/\s+/g, ' ').trim() })).filter((c) => c.text);
  // A token the gap rule cut in two ("Vicat Softening Point A/" then "120"): the slash or hyphen joins them back.
  const out = [];
  for (const c of cells) {
    const last = out.at(-1);
    if (last && /[A-Za-z][/-]$/.test(last.text) && /^\d/.test(c.text)) { last.text += c.text; last.x1 = c.x1; } else out.push({ ...c });
  }
  return out;
}

const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
const overlaps = (a, b) => { const o = overlap(a, b); return o > 0 && (o >= 0.3 * Math.min(a.x1 - a.x0, b.x1 - b.x0) || (a.x0 + a.x1) / 2 >= b.x0 && (a.x0 + a.x1) / 2 <= b.x1 || (b.x0 + b.x1) / 2 >= a.x0 && (b.x0 + b.x1) / 2 <= a.x1); };

const hasValue = (text, style) => valuesIn(text, style).length > 0;
/** A cell that stands where a value would: a dash, a slash, N/A. A row holding one is a data row, not a header. */
const PLACEHOLDER = /^\s*(?:[/\-–—]|n\/?a|n\.a\.|tbd|--)\s*$/i;
const letters = (t) => t.replace(/[^\p{L}]/gu, '').length;
const richCells = (cells) => cells.filter((c) => letters(maskConditions(c.text)) >= 3);
/** Short words in cells: the shape of a header line (a sentence of prose is not one). */
const shortCells = (cells) => cells.every((c) => c.text.length <= 40);

/** Rows and headers from the lines of one page (top down). */
export function rowsFromLines(lines, style = 'dot') {
  const sorted = [...lines].sort((a, b) => b.y - a.y);
  const cw = charWidth(sorted), gap = Math.max(GAP_CHARS * cw, 4), pitch = cw * 2;
  const parsed = sorted.map((l) => {
    let cells = cellsOfLine(l, gap).map((c) => ({ ...c, text: stripLatex(c.text) }));
    // A line the gap rule left whole ("Density 1.24 g/cm3"): the label, then what follows its first value.
    if (cells.length === 1) {
      const v = valuesIn(cells[0].text, style).find((x) => !/[A-Za-z][/-]\s*$/.test(cells[0].text.slice(0, x.index)));
      const colon = cells[0].text.indexOf(':');
      let cut = v ? v.index : -1;
      if (colon > 0 && (cut < 0 || colon < cut)) cut = colon + 1;
      if (cut > 0) {
        const t = cells[0].text, w = (cells[0].x1 - cells[0].x0) / Math.max(1, t.length);
        cells = [{ x0: cells[0].x0, x1: cells[0].x0 + cut * w, text: t.slice(0, cut).replace(/[:\s]+$/, '') }, { x0: cells[0].x0 + cut * w, x1: cells[0].x1, text: t.slice(cut).replace(/^[\s:]+/, '') }].filter((c) => c.text);
      }
    }
    return { y: l.y, cells, valued: cells.some((c) => hasValue(c.text, style) || PLACEHOLDER.test(c.text)) };
  }).filter((p) => p.cells.length);
  // A value the page sets on its own baseline, above or below its row's label (SUNLU, Polymaker): it belongs to the nearest
  // label line when that line is clearly nearer than any other (ratio ATTACH), carries no value of its own and the value
  // is not a lone digit (a unit's superscript). Otherwise it stays a row of its own and pairs with nothing.
  const isOrphan = (p) => p.valued && !p.cells.some((c) => letters(maskConditions(c.text)) >= 3) && !(p.cells.length === 1 && /^\d$/.test(p.cells[0].text.trim()));
  const isHost = (p) => !p.valued && p.cells.some((c) => letters(c.text) >= 3);
  const hosts = parsed.map((p, i) => ({ p, i })).filter((h) => isHost(h.p));
  for (const [i, p] of parsed.entries()) {
    if (!isOrphan(p) || !hosts.length) continue;
    // Stacked: the value sits under its label in the same column, and nothing else in that column lies between them.
    const first0 = p.cells[0];
    let above = null;
    for (let k = i - 1; k >= 0; k--) {
      if (parsed[k].attachedTo != null) continue;
      if (parsed[k].cells.some((c) => overlaps(c, first0))) { above = k; break; }
      if (parsed[k].y - p.y > 2.5 * pitch) break;
    }
    if (above != null && isHost(parsed[above]) && parsed[above].y - p.y <= 2.5 * pitch && !(parsed[above].attached?.length)) {
      const h = parsed[above];
      const hostCell = h.cells.find((c) => overlaps(c, first0));
      const orphanCell = p.cells[0];
      // same column: the label's cell and the value share a left edge (a heading line over a table does not)
      if (hostCell && Math.abs(hostCell.x0 - orphanCell.x0) <= 3 * cw && h.cells.length <= 2) { (h.attached ??= []).push(i); p.attachedTo = above; continue; }
    }
    const ranked = hosts.map((h) => ({ ...h, d: Math.abs(h.p.y - p.y) })).sort((a, b) => a.d - b.d);
    const [first, second] = ranked;
    if (first.d > 2.5 * pitch) continue;
    if (second && first.d > ATTACH * second.d) continue;
    (first.p.attached ??= []).push(i);
    p.attachedTo = first.i;
  }
  const merged = [];
  parsed.forEach((p, i) => {
    if (p.attachedTo != null) return;
    const extra = (p.attached ?? []).flatMap((j) => parsed[j].cells);
    const cells = [...p.cells, ...extra].sort((a, b) => a.x0 - b.x0);
    merged.push({ y: p.y, cells, valued: cells.some((c) => hasValue(c.text, style) || PLACEHOLDER.test(c.text)), extra: extra.length > 0 });
  });
  // Two tables side by side share a baseline: a label cell followed by a value, after a value, starts a row of its own.
  const segmented = [];
  for (const m of merged) {
    const parts = [[]];
    m.cells.forEach((c, ci) => {
      const seenValue = parts.at(-1).some((x) => hasValue(x.text, style));
      const next = m.cells[ci + 1];
      if (ci > 0 && seenValue && letters(maskConditions(c.text)) >= 3 && !hasValue(c.text, style) && next && (hasValue(next.text, style) || PLACEHOLDER.test(next.text))) parts.push([]);
      parts.at(-1).push(c);
    });
    for (const cells of parts) segmented.push({ ...m, cells, valued: cells.some((c) => hasValue(c.text, style) || PLACEHOLDER.test(c.text)) });
  }
  parsed.length = 0; parsed.push(...segmented);
  const valuedBeyondFirst = (p) => p.cells.slice(1).some((c) => hasValue(c.text, style) || PLACEHOLDER.test(c.text));
  const headerLike = parsed.map((p) => !valuedBeyondFirst(p) && p.cells.length >= 2 && (richCells(p.cells).length >= 1 || p.cells.every((c) => letters(maskConditions(c.text)) >= 1)) && p.cells.filter((c) => letters(maskConditions(c.text)) >= 1).length >= 2 && shortCells(p.cells));
  const rows = parsed.map((p, i) => {
    const headers = p.cells.map(() => '');
    if (p.valued && p.cells.length >= 2) {
      const stack = []; // top-down header lines
      for (let k = i - 1; k >= 0 && parsed[k].y - p.y < 60 * pitch; k--) {
        const cand = parsed[k];
        const anyOverlap = cand.cells.some((c, ci) => ci >= 0 && p.cells.some((v, vi) => vi >= 1 && overlaps(c, v)));
        if (!stack.length) {
          if (headerLike[k] && anyOverlap) stack.unshift(cand);
        } else if (cand.y - stack[0].y <= 2.4 * pitch && !cand.valued && anyOverlap && cand.cells.some((c) => letters(maskConditions(c.text)) >= 1) && shortCells(cand.cells) && (cand.cells.length >= 2 || p.cells.filter((v, vi) => vi >= 1 && overlaps(cand.cells[0], v)).length >= 2)) stack.unshift(cand);
        else if (cand.y - stack[0].y > 2.4 * pitch) break;
        else break;
      }
      p.cells.forEach((v, vi) => {
        if (vi < 1) return;
        const parts = [];
        for (const h of stack) {
          const best = h.cells.map((c) => ({ c, o: overlaps(c, v) ? overlap(c, v) : 0 })).filter((x) => x.o > 0).sort((a, b) => b.o - a.o)[0];
          if (best && parts.at(-1) !== best.c.text) parts.push(best.c.text);
        }
        headers[vi] = parts.join(' / ');
      });
    }
    return { src: 'text', tableIndex: null, cells: p.cells.map((c) => c.text), spanned: p.cells.map(() => false), headers, text: p.cells.map((c) => c.text).join(' | ') };
  });
  return rows;
}

/** A compare.mjs page (rows, units, text, style) from a text-layer page. */
export function pageFromLines(pageNo, lines) {
  const probe = lines.map((l) => stripLatex(l.text)).join(' ');
  const style = numberStyle(probe);
  const rows = rowsFromLines(lines, style);
  const units = rows.flatMap((r) => r.cells.filter(Boolean));
  return { page: pageNo, style, rows, tables: [], units, text: units.join(' \n ') };
}

/** A tesseract line: the label up to its first value, then each value its own cell; no headers. */
export function rowFromPlainLine(text, style = 'dot') {
  const t = stripLatex(text).replace(/\s+/g, ' ').trim();
  const masked = maskConditions(t);
  const values = valuesIn(t, style);
  if (!values.length) return { src: 'tesseract', tableIndex: null, cells: [t], spanned: [false], headers: [''], text: t };
  const first = values[0].index;
  const label = t.slice(0, first).replace(/[:\s]+$/, '');
  // a value cell runs from one value to the next, a range ("190 - 230") staying together
  const cells = [label];
  let start = first;
  for (let i = 1; i < values.length; i++) {
    const between = masked.slice(values[i - 1].index + values[i - 1].text.length, values[i].index);
    if (/^\s*(?:[-–~]|to|…)\s*$/i.test(between)) continue;
    cells.push(t.slice(start, values[i].index).trim()); start = values[i].index;
  }
  cells.push(t.slice(start).trim());
  return { src: 'tesseract', tableIndex: null, cells, spanned: cells.map(() => false), headers: cells.map(() => ''), text: cells.join(' | ') };
}

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);

/** { sha, source, pages: [{ page, prepared }] } for a document, or null when the cache holds none. */
export function textDocument(sha, kind = 'text') {
  if (kind === 'tesseract') {
    const data = readJson(join(DOCUMENT_CACHE, 'ocr-text', `${sha}.json`));
    if (!data) return null;
    return { sha, source: 'tesseract', pages: data.pages.map((p) => {
      const lines = (p.lines ?? []).map((l) => (typeof l === 'string' ? l : l.text ?? '')).filter(Boolean);
      const style = numberStyle(lines.map(stripLatex).join(' '));
      const rows = lines.map((l) => rowFromPlainLine(l, style));
      const units = rows.flatMap((r) => r.cells.filter(Boolean));
      return { page: Number(p.page), prepared: { page: Number(p.page), style, rows, tables: [], units, text: units.join(' \n ') } };
    }) };
  }
  const layout = readJson(join(DOCUMENT_CACHE, 'layout', `${sha}.json`));
  const text = layout ?? readJson(join(DOCUMENT_CACHE, 'text', `${sha}.json`)) ?? cachedText(sha);
  if (!text) return null;
  return { sha, source: layout ? 'layout' : 'text', pages: text.pages.map((p) => ({ page: Number(p.page), prepared: pageFromLines(Number(p.page), p.lines ?? []) })) };
}
