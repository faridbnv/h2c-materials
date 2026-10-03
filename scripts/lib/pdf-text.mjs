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
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DOCUMENT_CACHE } from '../ingest/context.mjs';

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
// .cache/ unless H2C_DOCUMENT_CACHE moves it (scripts/ingest/context.mjs).
export const cacheDir = (...parts) => join(DOCUMENT_CACHE, ...parts);
// The reader's own version travels with the extractor's, because a document's cached text is only as good as the
// rules that built it: a change here must re-read every document rather than leave two readings in one cache.
const READER = 'lines/gap v2';
const EXTRACTOR = `pdfjs-dist ${createRequire(import.meta.url)('pdfjs-dist/package.json').version}; ${READER}`;
// A maker who publishes a sheet as a web page publishes the same table, and it is read into the same shape by
// its own reader, with its own version. Both readings are cached in one place, under the document's digest.
const HTML_READER = 'html/tables v4';
const CURRENT = new Set([EXTRACTOR, HTML_READER]);

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

/**
 * A row of spans as the page prints it. The extractor breaks a line wherever the font's own kerning breaks it, so
 * joining its pieces with a space is what wrote "THE FILAMENT AS A CF", "Tensile Str ength", "Specific Gravity
 * 1. 12 g/cm3", "ISO 11 8 3" and "Ye s". A space belongs where the page leaves one: the gap is measured against
 * the row's own character width, and a piece that already carries its space keeps it.
 */
export function spanText(spans) {
  const sorted = [...spans].sort((a, b) => a.x - b.x);
  const chars = sorted.reduce((a, s) => a + (s.str ?? '').length, 0);
  const width = sorted.reduce((a, s) => a + (s.w ?? 0), 0);
  const em = width > 0 && chars > 0 ? width / chars : 5;
  let out = '';
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i], previous = sorted[i - 1];
    if (previous) {
      const gap = s.x - (previous.x + (previous.w ?? em * (previous.str ?? '').length));
      if (gap > em * 0.25 || /\s$/.test(previous.str ?? '') || /^\s/.test(s.str ?? '')) out += ' ';
    }
    out += s.str ?? '';
  }
  return out.replace(/\s+/g, ' ').trim();
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
    const text = spanText(sorted);
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
    cells[i].push(s);
  }
  return cells.map((c, i) => ({ x: positions[i], text: spanText(c) })).filter((c) => c.text);
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
  return cells.map((c) => ({ x: c[0].x, text: spanText(c) })).filter((c) => c.text);
}

// Extraction splits digits ("1 05 °C", "2 433 .4 ± 79.4"); join them before reading numbers. A standard's
// designation ("ISO 75", "GB/T 1633") is not a value; it is taken out first so that joining split digits cannot glue
// it onto the number that follows.
// A unit can end in a digit ("g/cm3", "kJ/m2"), and so can a method's own variant ("ISO 306 B50"): that digit
// belongs to the unit or the method, not to the value beside it. Joined, "B50 145" became a Vicat point of 50145.
export const STANDARD = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+[A-Za-z]{0,2}(?:\s?[-–.:/]\s?(?:\d+[A-Za-z]{0,2}|[A-Za-z]{1,3}\d*))*/g;
export const joinDigits = (s) => s.replace(STANDARD, ' § ').replace(/(?<![A-Za-z°³²]\d*)(\d) (?=\d)/g, '$1').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/\bO\.(?=\d)/g, '0.');
export const UNIT = String.raw`([°˚º]\s?C|℃|MPa|Mpa|MP\s?a|GPa|%|g\s?/\s?cm\s?3|g\s?/\s?cm³|g\s?/\s?cc|kJ\s?/\s?m|J\s?/\s?m|HRM|Shore)`;
// A rate ("10°C/min"), a humidity ("70% RH") or a condition ("at 23°C") is not a result.
export const statementRe = () => new RegExp(String.raw`(?<![\d.\-–])(\d+(?:\.\d+)?)(?:\s?±\s?(\d+(?:\.\d+)?))?\s?(?:\(\s?)?${UNIT}(?!\s?\/\s?min|\s?RH|\w)`, 'g');
// A table can print its unit in a column of its own, before the value ("Tensile modulus ISO 527-2 MPa 40"). Those
// are the sheet's numbers as much as any other, and a fingerprint blind to the layout sees only the conditions
// every sheet of a maker repeats.
export const unitFirstStatementRe = () => new RegExp(String.raw`(?:^|\s)${UNIT}\s+(\d+(?:\.\d+)?)(?![\d.,])`, 'g');
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
// Written whole or not at all: the test files run in parallel and read one fixture's text, and a reader that caught a
// file mid-write parsed an empty one (CI, 2026-09-27). A rename within one directory is atomic.
function writeCache(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value));
  renameSync(tmp, path);
}

/**
 * The document's text, from the cache or by reading it. Returns { sha, extractor, pages: [{ page, lines, squeezed }] }.
 * A cache entry written by another extractor version is ignored, so an upgrade re-reads rather than mixes.
 */
export async function documentText(bytes, { sha = sha256(bytes), refresh = false } = {}) {
  const path = textPath(sha);
  if (!refresh && existsSync(path)) {
    const cached = JSON.parse(readFileSync(path, 'utf8'));
    if (CURRENT.has(cached.extractor)) return cached;
  }
  // What the bytes are, not what the link said they would be: a maker who serves a page under a .pdf link, or a
  // PDF under none, is read as what it is.
  if (!String(bytes.subarray?.(0, 5) ?? '').startsWith('%PDF') && !Buffer.from(bytes).subarray(0, 5).toString().startsWith('%PDF')) {
    const { htmlText } = await import('./html-text.mjs');
    const read = htmlText(bytes, { sha, extractor: HTML_READER });
    writeCache(path, read);
    return read;
  }
  const pages = (await pdfPages(bytes)).map(({ page, spans }) => ({ page, lines: pageLines(spans), squeezed: squeezed(spans) }));
  const text = { sha, extractor: EXTRACTOR, pages };
  writeCache(path, text);
  return text;
}

/** The cached text of a document already read, or null. */
export function cachedText(sha) {
  const path = textPath(sha);
  if (!existsSync(path)) return null;
  const cached = JSON.parse(readFileSync(path, 'utf8'));
  return CURRENT.has(cached.extractor) ? cached : null;
}

/** Every line of a document, as the audit reads them: [{ page, text }]. */
export const allLines = (text) => text.pages.flatMap((p) => p.lines.map((l) => ({ page: p.page, text: l.text })));

/**
 * The ways a sheet may print one number: as it is, with a decimal comma, grouped in thousands with a point or a comma,
 * as a power of ten, and with no zero before its decimal point (".13 %").
 */
export function spellings(value) {
  const plain = String(value).trim().replace(/\s/g, '');
  // A number is printed the way its sheet writes numbers: a decimal comma, and thousands grouped with a point or
  // a comma. Spectrum's PC 275 prints its flexural modulus as "24.000 kg/cm2", which is twenty-four thousand.
  const [whole, fraction] = plain.split('.');
  const grouped = whole.length > 3 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, '$1') : null;
  const spellings = new Set([plain, plain.replace('.', ',')]);
  // A power of ten is printed as a power. A resistivity of 10^12 ohm is on its page as "10" and a raised "12",
  // never as a million million, and the guard exists to prove the number was read off the page rather than to
  // insist the page spell it out. Both the mantissa and the exponent have to be there, in that order.
  // LEHVOSS sets the power in the text itself, as a superscript character ("<10⁹", "<10²"), and a power as small
  // as a hundred is still written as one there.
  const SUPERSCRIPT = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079' };
  const exponent = Math.log10(Math.abs(Number(plain)));
  if (Number.isFinite(exponent) && Number.isInteger(exponent) && Math.abs(Number(plain)) >= 100) {
    const mantissa = Number(plain) / 10 ** exponent;
    const raised = `10${String(exponent).split('').map((d) => SUPERSCRIPT[d]).join('')}`;
    for (const written of new Set([`10^${exponent}`, `10${exponent}`, `10 ${exponent}`, raised])) {
      spellings.add(mantissa === 1 ? written : `${mantissa}${written}`);
      spellings.add(written);
    }
  }
  if (grouped) for (const separator of ['.', ',']) {
    const head = whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    spellings.add(fraction === undefined ? head : `${head}.${fraction}`);
    spellings.add(fraction === undefined ? head : `${head},${fraction}`);
  }
  if (/^-?0[.,]\d/.test(plain)) for (const s of [...spellings]) spellings.add(s.replace(/^(-?)0(?=[.,])/, '$1'));
  // A minus is printed as a hyphen, an en dash or the minus sign itself.
  if (plain.startsWith('-')) for (const s of [...spellings]) for (const dash of ['\u2013', '\u2212']) spellings.add(dash + s.slice(1));
  return [...spellings];
}

/**
 * Is this number printed on this page? The squeezed page answers whatever the layout did to the spans. It is a weak
 * test (D97): "52" on a page prints 5, 2 and 52 by this reading, so a decision value is bound to its own row by
 * valueInEvidence below as well.
 */
export function numberOnPage(text, page, value) {
  const p = text.pages.find((x) => x.page === page);
  if (!p) return false;
  const v = String(value).trim();
  if (!v) return true;
  return spellings(v).some((spelling) => p.squeezed.includes(spelling));
}

const SUPER = { '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9', '\u207b': '-' };
// A number on a sheet: a sign (hyphen, en dash or minus), digits with decimal or grouping separators or a bare decimal
// (".13"), and a power of ten written with a caret or raised. Nothing alphanumeric may touch its front: the "3" of
// "cm3" and the "638" of "D638" are no results.
// A dash between two numbers ("170--190", "55-60") is a range's, not a sign.
const NUMBER_TOKEN = /(?:(?<![\p{L}\d.,\-\u2013\u2212])([-\u2013\u2212]))?(?<![\p{L}\d.,])(\d+(?:[.,]\d+)*|[.,]\d+)(?:\s?\^\s?(-?\d+)|([\u2070\u00b9\u00b2\u00b3\u2074-\u2079\u207b]+))?(?![.,]?\d)/gu;

/** The numbers one printed token may mean: a decimal point or comma, a thousands grouping, a power of ten. */
function readingsOf(sign, body, power) {
  const out = new Set();
  const negative = sign !== '';
  const add = (text) => { const n = Number(text); if (Number.isFinite(n)) out.add(negative ? -n : n); };
  const seps = body.match(/[.,]/g) ?? [];
  if (seps.length <= 1) add(body.replace(',', '.'));
  // Grouped in thousands: every group after the first has three digits ("24.000", "10,100", "1 320" once joined).
  if (seps.length && /^\d{1,3}(?:[.,]\d{3})+$/.test(body)) add(body.replace(/[.,]/g, ''));
  // Both separators: the last is the decimal ("1.234,5", "1,234.5").
  if (new Set(seps).size === 2) { const last = Math.max(body.lastIndexOf('.'), body.lastIndexOf(',')); add(`${body.slice(0, last).replace(/[.,]/g, '')}.${body.slice(last + 1)}`); }
  // "10¹²" is a million million; the register also records such a value by its base, with the power in its raw text.
  if (power != null) for (const m of [...out]) out.add(Number((Math.abs(m) === 10 ? 1 : m) * 10 ** Number(power) * (Math.abs(m) === 10 && m < 0 ? -1 : 1)));
  return out;
}

const same = (a, b) => a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * How many times a row's own evidence line prints this number as a number of its own (D97). The standards are taken
 * out first (the 527 of "ISO 527" is no result); a number inside another ("5" in "52", "2" in "25.2") is not printed
 * by this reading; a number the extractor split ("2 900", "4 9 . 7 9") is read whole, as the reader reads it.
 * `numberOnPage` answers only whether some spelling of a number is somewhere on a page, which "52" answers for 5.
 */
export function countInEvidence(evidenceText, value) {
  const want = Number(String(value).trim().replace(/\s/g, ''));
  if (!Number.isFinite(want)) return 0;
  // With each designation taken out whole; failing that, only its name and number, so a value the whole-designation
  // pattern would read as the designation's part ("D570 .13 %") is still found.
  // A hardness is printed with its scale's letter against it ("A95", "D60"), which is a label, not part of a word.
  const text = String(evidenceText ?? '').replace(/(?<![\p{L}\d])([AD])(?=\d)/gu, '$1 ');
  return countIn(text.replace(STANDARD, ' \u00a7 '), want) || countIn(text.replace(STANDARD_CORE, ' \u00a7 '), want);
}

const STANDARD_CORE = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+[A-Za-z]{0,2}/g;

function countIn(text, want) {
  const tokens = [...text.matchAll(NUMBER_TOKEN)].map((m) => {
    const power = m[3] ?? (m[4] ? [...m[4]].map((c) => SUPER[c]).join('') : null);
    const sign = m[1] ?? '';
    return { from: m.index, to: m.index + m[0].length, sign, body: m[2], power, readings: readingsOf(sign, m[2], power) };
  });
  const single = tokens.filter((t) => [...t.readings].some((r) => same(r, want))).length;
  if (single) return single;
  // A number the extractor split into pieces: consecutive pieces with nothing but spaces and separators between them.
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(tokens.length, i + 6); j++) {
      const between = text.slice(tokens[j - 1].to, tokens[j].from);
      if (!/^[\s.,]*$/.test(between) || tokens[j].sign || tokens[j - 1].power) break;
      const body = text.slice(tokens[i].from + tokens[i].sign.length, tokens[j].to).replace(/\s+/g, '');
      if (/^(\d+(?:[.,]\d+)*|[.,]\d+)$/.test(body) && [...readingsOf(tokens[i].sign, body, null)].some((r) => same(r, want))) return 1;
    }
  }
  return 0;
}

export const valueInEvidence = (evidenceText, value) => countInEvidence(evidenceText, value) > 0;

export const readBytes = (path) => readFileSync(path);
export { EXTRACTOR };
