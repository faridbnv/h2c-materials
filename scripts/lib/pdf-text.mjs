// Reading a source document: its bytes, its digest, and its text page by page, cached by digest.
//
// Two views of a page, because the repository already relies on both. `lines` groups the extractor's spans by their
// y coordinate, which is how a data sheet's rows are read (scripts/audit/source-completeness.mjs). `squeezed` is the
// page with every space removed, which is how a migration proves a number is on the page it cites
// (scripts/migrate/m38-certification-backlog.mjs): extraction splits "2 433 .4" and joins "T ensile", and a
// whitespace-free page is immune to both.
//
// The cache is keyed by SHA-256, not by SourceID, because a document is its bytes: the same file under two names is
// read once, and a file that changed is a different key rather than a stale entry. Nothing here touches data/.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const cacheDir = (...parts) => join(projectRoot, '.cache', ...parts);
const EXTRACTOR = `pdfjs-dist ${createRequire(import.meta.url)('pdfjs-dist/package.json').version}`;

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Every text span of every page, with the coordinates the line and column passes need. */
export async function pdfPages(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push({ page: n, spans: items.map((it) => ({ x: it.transform[4], y: it.transform[5], w: it.width ?? 0, str: it.str })) });
  }
  return pages;
}

/** Spans grouped into lines, top down, each left to right. The y rounding is what the audit has always used. */
export function pageLines(spans) {
  const byRow = new Map();
  for (const s of spans) {
    const y = Math.round(s.y);
    if (!byRow.has(y)) byRow.set(y, []);
    byRow.get(y).push(s);
  }
  const lines = [];
  for (const [y, row] of [...byRow].sort((a, b) => b[0] - a[0])) {
    const sorted = row.sort((a, b) => a.x - b.x);
    const text = sorted.map((s) => s.str).join(' ').replace(/\s+/g, ' ').trim();
    if (text) lines.push({ y, x0: sorted[0].x, x1: sorted.at(-1).x + (sorted.at(-1).w ?? 0), text, spans: sorted.map((s) => ({ x: s.x, w: s.w, str: s.str })) });
  }
  return lines;
}

/** The page with no whitespace at all: what a guard matches a recorded number against. */
export const squeezed = (spans) => spans.map((s) => s.str ?? '').join('').replace(/\s+/g, '');

/**
 * Where a block of lines has its columns: the x positions enough of them start a span at. A data sheet's table is
 * columns of text with no rules drawn, so the positions are the table, and reading a row by them keeps the property,
 * the method and the value apart. Reading such a row as one line is what left 133 measurements holding a fragment of
 * the column beside them ("Transition Temperature" for a standard; docs/OPEN-PROBLEMS.md).
 */
export function columnPositions(lines, { support = 0.5, tolerance = 8 } = {}) {
  // Each line proposes its own cell starts from the gaps within it; a position enough of them agree on is a column.
  // Taking every span's x instead finds a column wherever two words happen to line up, which on a three-column
  // sheet found nine. Only the lines that look like rows vote: a heading or a sentence has one cell and would
  // otherwise argue every table down to a single column.
  const rows = lines.filter((l) => lineCells(l).length > 1);
  if (rows.length < 2) return [];
  const starts = rows.flatMap((l) => lineCells(l).map((c) => c.x)).sort((a, b) => a - b);
  const clusters = [];
  for (const x of starts) {
    const last = clusters.at(-1);
    if (last && x - last.at(-1) <= tolerance) last.push(x);
    else clusters.push([x]);
  }
  const needed = Math.max(2, Math.ceil(rows.length * support));
  return clusters.filter((c) => c.length >= needed).map((c) => Math.min(...c)).sort((a, b) => a - b);
}

/** A line read at those column positions: one cell per column, in order, empty cells dropped. */
export function cellsAt(line, positions) {
  if (!positions?.length) return lineCells(line);
  const cells = positions.map(() => []);
  for (const s of line.spans ?? []) {
    let i = 0;
    while (i + 1 < positions.length && positions[i + 1] <= s.x + 1) i++;
    cells[i].push(s.str);
  }
  return cells.map((c, i) => ({ x: positions[i], text: c.join(' ').replace(/\s+/g, ' ').trim() })).filter((c) => c.text);
}

/**
 * A line's cells, split where the page leaves white space wide enough to be a column gap rather than a word space.
 * The gap is measured against the line's own character width, so it holds at any font size, and the floor keeps a
 * line of one or two spans from calling its only gap a column.
 */
export function lineCells(line, ems = 3, floor = 10) {
  const spans = (line.spans ?? []).filter((s) => s.str?.trim());
  if (!spans.length) return [];
  const chars = spans.reduce((a, s) => a + s.str.length, 0);
  const width = spans.reduce((a, s) => a + (s.w ?? 0), 0);
  const em = width > 0 && chars > 0 ? width / chars : 5;
  const gap = Math.max(floor, em * ems);
  const cells = [];
  let current = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const previous = spans[i - 1];
    const white = spans[i].x - (previous.x + (previous.w ?? em * previous.str.length));
    if (white > gap) { cells.push(current); current = []; }
    current.push(spans[i]);
  }
  cells.push(current);
  return cells.map((c) => ({ x: c[0].x, text: c.map((s) => s.str).join(' ').replace(/\s+/g, ' ').trim() })).filter((c) => c.text);
}

// Extraction splits digits ("1 05 °C", "2 433 .4 ± 79.4"); join them before reading numbers. A standard's
// designation ("ISO 75", "GB/T 1633") is not a value; it is taken out first so that joining split digits cannot glue
// it onto the number that follows.
export const STANDARD = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+(?:\s?[-–.:/]\s?\d+)*/g;
export const joinDigits = (s) => s.replace(STANDARD, ' § ').replace(/(\d) (?=\d)/g, '$1').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/\bO\.(?=\d)/g, '0.');
export const UNIT = String.raw`([°˚º]\s?C|℃|MPa|Mpa|MP\s?a|GPa|%|g\s?/\s?cm\s?3|g\s?/\s?cm³|g\s?/\s?cc|kJ\s?/\s?m|J\s?/\s?m|HRM|Shore)`;
// A rate ("10°C/min"), a humidity ("70% RH") or a condition ("at 23°C") is not a result.
export const statementRe = () => new RegExp(String.raw`(?<![\d.\-–])(\d+(?:\.\d+)?)(?:\s?±\s?(\d+(?:\.\d+)?))?\s?(?:\(\s?)?${UNIT}(?!\s?\/\s?min|\s?RH|\w)`, 'g');
export const CONDITION_BEFORE = /\bat\s?$/i;
export const RANGE = /\d\s?[-–~]\s?\d/;

// Numbers can be printed in any order or without a unit ("ISO 527 MPa 48", "Specific Gravity 1.22"), so a property
// the document names is looked for by label too, whatever its number looks like.
export const LABELS = [
  ['density', /\b(density|specific\s?gravity)\b/i, /^Density$/],
  ['tensile strength', /tensile\s?(strength|stress)|stress\s?at\s?(yield|break)/i, /^Tensile (strength|yield|break)/],
  ['tensile modulus', /(tensile|young'?’?s|elastic)\s?(e-)?modulus|modulus\s?of\s?elasticity/i, /^Tensile modulus$/],
  ['elongation', /elongation|strain\s?at/i, /^(Elongation|Tensile strain)/],
  ['flexural', /flexural|bending/i, /^Flexural/],
  ['impact', /impact|charpy|izod/i, /(Charpy|Izod|Impact)/],
  ['heat deflection', /heat\s?(deflection|distortion)|deflection\s?temp|\bHDT\b/i, /^HDT$/],
  ['vicat', /vicat|vicar/i, /^Vicat/],
  ['glass transition', /glass\s?transition|\bTg\b/i, /^Glass transition/],
  ['melting', /melting\s?(temp|point)|\bTm\b/i, /^Melting temperature$/],
  ['hardness', /hardness|shore\s?[AD]\b/i, /^Hardness$/],
  ['water absorption', /water\s?absorp|moisture\s?absorp/i, /^Water absorption$/],
  ['melt flow', /melt\s?(flow|index|volume)|\bMFR\b|\bMFI\b|\bMVR\b/i, /^Melt (mass|volume)-flow rate$/],
];

const textPath = (sha) => cacheDir('text', `${sha}.json`);

/**
 * The document's text, from the cache or by reading it. Returns { sha, extractor, pages: [{ page, lines, squeezed }] }.
 * A cache entry written by another extractor version is ignored, so an upgrade re-reads rather than mixes.
 */
export async function documentText(bytes, { sha = sha256(bytes), refresh = false } = {}) {
  const path = textPath(sha);
  if (!refresh && existsSync(path)) {
    const cached = JSON.parse(readFileSync(path, 'utf8'));
    if (cached.extractor === EXTRACTOR) return cached;
  }
  const pages = (await pdfPages(bytes)).map(({ page, spans }) => ({ page, lines: pageLines(spans), squeezed: squeezed(spans) }));
  const text = { sha, extractor: EXTRACTOR, pages };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(text));
  return text;
}

/** The cached text of a document already read, or null. */
export function cachedText(sha) {
  const path = textPath(sha);
  if (!existsSync(path)) return null;
  const cached = JSON.parse(readFileSync(path, 'utf8'));
  return cached.extractor === EXTRACTOR ? cached : null;
}

/** Every line of a document, as the audit reads them: [{ page, text }]. */
export const allLines = (text) => text.pages.flatMap((p) => p.lines.map((l) => ({ page: p.page, text: l.text })));

/** Is this number printed on this page? The squeezed page answers whatever the layout did to the spans. */
export function numberOnPage(text, page, value) {
  const p = text.pages.find((x) => x.page === page);
  if (!p) return false;
  const v = String(value).trim();
  if (!v) return true;
  const plain = v.replace(/\s/g, '');
  const comma = plain.replace('.', ',');
  return p.squeezed.includes(plain) || p.squeezed.includes(comma);
}

export const readBytes = (path) => readFileSync(path);
export { EXTRACTOR };
