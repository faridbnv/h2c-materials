#!/usr/bin/env node
// Check round 3 (2026-10-05): does the independent Mistral reading of a page print each deciding value where the record
// says (its row label and its column)? Code only, no model. One outcome per target:
//
//   pairing-confirmed  the row whose label matches the record's label holds the value in the cell of the column the
//                      record belongs to (or the row has a single value cell)
//   row-only           the label's row holds the value, but the row has several value cells and the column could not be
//                      decided (the record's direction, moisture, post-processing or product names no single column)
//   label-not-found    the value is on the page but no row label matches
//   elsewhere          the label's row is found but the value is not in the cell the record belongs to, and it is
//                      printed elsewhere on the page (Note says when it stands in another column of the same row)
//   absent             the value's number(s) (or, for a word cell, its words) are not on the page in the reading
//   no-ocr             no reading for the document or the page (a web page, or not run)
//   no-claim           (added) the record states nothing to check: its value is Not published / Not applicable / empty
//
// The value to check (Value) and the label and page (Locator) come from the input row itself; the tables supply only what
// the row does not carry: Direction, Moisture state, Post-processing state, the product's name, Raw unit. An optional
// Direction column in the input overrides the table's (a fixture holds a known-wrong old value beside the corrected one
// under one Record ID). An Expected column ('pairing-confirmed' or 'not-confirmed') prints the agreement matrix.
//
//   node docs/audits/2026-10-05-check-round-3/ocr/compare.mjs [--targets <csv>] [--sources A,B] [--ocr-dir <dir>] [--out <csv>]
//        [--source mistral|text|tesseract]   (default mistral; text = the text layer by geometry, tesseract = .cache/ocr-text rows)
//
// Matching rules: numbers by numbersIn/sameNumber/squash of scripts/ingest/read-common.mjs; LaTeX stripped; a range is one
// value (both ends in one cell, in order); "±", "+/-" and "(0.24)" after a number are a spread; a decimal comma or a
// thousands separator is decided from the page's own usage; standards and test conditions never count as the value;
// a one-digit value is confirmed only in its own cell. See the tests in compare.test.mjs.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { numbersIn, sameNumber, pageOf, squash } from '../../../../scripts/ingest/read-common.mjs';
import { STANDARD } from '../../../../scripts/lib/pdf-text.mjs';
import { htmlTableToGrid } from './grid.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
export const LABEL_MIN = 0.6;

// ---- text -------------------------------------------------------------------------------------------------------
const SUPER = { 2: '²', 3: '³' };
/** The OCR's LaTeX as plain text: ^{3} -> ³, ^{\circ} -> °, \pm -> ±, \mathrm{..}, $..$, \times, \%. */
export function stripLatex(s) {
  let t = String(s ?? '');
  if (!/[\\$^_{]/.test(t)) return t;
  t = t.replace(/\^\s*\{?\s*\\circ\s*\}?/g, '°').replace(/\\degree/g, '°').replace(/\\circ/g, '°');
  for (let i = 0; i < 4; i++) t = t.replace(/\\(?:mathrm|text|textbf|mathbf|textit|operatorname|mathit)\s*\{([^{}]*)\}/g, '$1');
  t = t.replace(/\^\s*\{\s*([^{}]*?)\s*\}/g, (_, x) => SUPER[x] ?? `^${x}`).replace(/\^\s*([23])(?![\d])/g, (_, x) => SUPER[x]);
  t = t.replace(/_\s*\{\s*([^{}]*?)\s*\}/g, '$1').replace(/_([A-Za-z0-9])/g, '$1');
  t = t.replace(/\\pm\b/g, '±').replace(/\\mp\b/g, '∓').replace(/\\times\b/g, '×').replace(/\\cdot\b/g, '·').replace(/\\%/g, '%')
    .replace(/\\sim\b/g, '~').replace(/\\approx\b/g, '≈').replace(/\\(?:geq?|ge)\b/g, '≥').replace(/\\(?:leq?|le)\b/g, '≤')
    .replace(/\\mu\b/g, 'µ').replace(/\\Omega\b/g, 'Ω').replace(/\\[,;:! ]/g, ' ').replace(/\\\\/g, ' ').replace(/\\(?=[A-Za-z]+\b)/g, '');
  t = t.replace(/\$([^$]*)\$/g, '$1').replace(/\$/g, '').replace(/[{}]/g, '');
  return t.replace(/[ \t]+/g, ' ');
}

/** Decimal comma or point, from the page's own usage ("1,24 g/cm3" on the page: comma). */
export function numberStyle(text) {
  const comma = (String(text).match(/\d,\d{1,2}(?![\d,])/g) ?? []).length;
  const dot = (String(text).match(/\d\.\d/g) ?? []).length;
  return comma > dot ? 'comma' : 'dot';
}

// Numbers that belong to a standard or a test condition. A rule is off when the held value itself states that kind.
const CONDITIONS = [
  ['mm-min', /\b\d+(?:[.,]\d+)?\s*mm\s*\/\s*min\b/gi],
  ['speed', /\b\d+(?:[.,]\d+)?\s*(?:mm\s*\/\s*s(?:ec)?|m\s*\/\s*s)\b/gi],
  ['rh', /\b\d+(?:[.,]\d+)?\s*%\s*(?:RH|r\.h\.)/gi],
  ['at-temp', /(?:\bat|@)\s*\d+(?:[.,]\d+)?\s*(?:±\s*\d+(?:[.,]\d+)?\s*)?[°˚º]?\s*C\b/gi],
  ['load', /\b(?:0[.,]45|0[.,]455|0[.,]46|1[.,]8|1[.,]80|1[.,]82)\s*MPa\b/gi],
  ['mass', /\b\d+(?:[.,]\d+)?\s*kg\b/gi],
  ['mm', /\b\d+(?:[.,]\d+)?\s*mm(?![\w²³/])/gi],
  ['type', /\b(?:type|specimen|probe)\s*\d+[A-Z]{0,2}\b/gi],
  ['mfr', /\b\d+\s*[°˚º]?\s*C\s*[/,]\s*\d+(?:[.,]\d+)?\s*kg\b/gi],
];
const EXTRA_STANDARD = /\bASTM\s?[A-Z]?\s?-?\s?\d+[\w\-:./]*|\b(?:UL\s?94|EN|JIS|ANSI|IPC|MIL|SAE|NF|BS)\s?[A-Z]{0,3}[- ]?\d[\w\-:./]*|\b[AB]\s?\/\s?\d+\b/g;
const standardRe = () => new RegExp(STANDARD.source, 'g');

/** The text with each standard and test-condition span blanked to spaces (same length, so indexes agree). */
export function maskConditions(text, held = '') {
  let t = String(text ?? '');
  const blank = (m) => ' '.repeat(m.length);
  t = t.replace(standardRe(), blank).replace(EXTRA_STANDARD, blank);
  for (const [name, re] of CONDITIONS) {
    if (held && new RegExp(re.source, re.flags.replace('g', '')).test(held)) continue;
    t = t.replace(new RegExp(re.source, re.flags), blank);
  }
  return t;
}

const SPREADS = [/\s*\(\s*(?:±|\+\s*\/\s*[-−–])\s*\d[\d.,]*\s*\)/g, /\s*(?:±|\+\s*\/\s*[-−–]|\+\/-)\s*\d[\d.,]*/g, /(?<=\d)\s*\(\s*\d[\d.,]*\s*\)/g];
const NUMBER = /(?<![\p{L}\d])(?:\d{1,2}(?:[   ]\d{3})+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?|[.,]\d+)(?!\d)/gu;

function toDot(tok, style) {
  if (/^\d{1,2}[   ]\d{3}/.test(tok)) return tok.replace(/[   ]/g, '').replace(',', '.');
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(tok)) return style === 'comma' && /^\d{1,3},\d{3}$/.test(tok) ? tok.replace(',', '.') : tok.replace(/,/g, '');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(tok)) {
    const single = /^\d{1,3}\.\d{3}$/.test(tok);
    if (single && style !== 'comma') return tok;
    return tok.replace(/\./g, '').replace(',', '.');
  }
  return tok.replace(',', '.');
}

/**
 * The values a text prints: [{ text, value, index }], in order, after dropping spreads ("± 0.05", "+/-0.1", "(0.24)" after
 * a number), standards and test conditions. `held` is the raw value being looked for, which switches off a condition rule
 * it states itself.
 */
export function valuesIn(text, style = 'dot', held = '') {
  let t = maskConditions(stripLatex(text), held);
  for (const re of SPREADS) t = t.replace(re, (m) => ' '.repeat(m.length));
  const out = [];
  for (const m of t.matchAll(NUMBER)) {
    const dot = toDot(m[0], style);
    if (Number.isFinite(Number(dot))) out.push({ text: dot, value: Number(dot), index: m.index });
  }
  return out;
}

/** Strict equality of two printed numbers; sameNumber (equal at the coarser precision) only marks a near miss. */
const numEq = (a, b) => a.value === b.value;
export const nearMiss = (a, b) => !numEq(a, b) && sameNumber(a.text, b.text);

/** Do the held numbers stand next to each other, in order, in this list of a cell's values? */
export function containsRun(cellValues, held) {
  if (!held.length) return false;
  for (let i = 0; i + held.length <= cellValues.length; i++) if (held.every((h, j) => numEq(cellValues[i + j], h))) return true;
  return false;
}

export const MISSING = /^\s*(?:not published|not applicable|n\/a|-|–|—)?\s*$/i;
const loose = (s) => squash(String(s ?? '').replace(/[✔✓☑]/g, 'tickmark').replace(/[✘✗☒]/g, 'crossmark')).replace(/[.,]/g, '');

/** What the record holds, as something to look for. */
export function parseHeld(raw, style = 'dot') {
  const text = String(raw ?? '');
  if (MISSING.test(text)) return { kind: 'none', raw: text, numbers: [] };
  const numbers = valuesIn(text, style, text);
  if (!numbers.length) return { kind: 'words', raw: text, numbers, loose: loose(text) };
  const oneDigit = numbers.length === 1 && /^\d$/.test(numbers[0].text);
  return { kind: 'numeric', raw: text, numbers, oneDigit, loose: loose(text) };
}

// ---- labels -----------------------------------------------------------------------------------------------------
const STOP = new Set(['of', 'at', 'the', 'and', 'for', 'in', 'to', 'a', 'an', 'test', 'method', 'typical', 'value', 'values', 'property', 'properties', 'unit', 'units', 'by', 'with', 'on', 'or', 'is', 'as', 'recommended', 'based', 'settings', 'setting', 'if', 'standard']);
const UNITS = new Set(['mpa', 'gpa', 'kpa', 'pa', 'kj', 'j', 'm', 'cm', 'mm', 'g', 'kg', 'min', 'c', 'f', 'rh', 'n', 'h', 'hr', 'hrs', 'hours', 'ppm', 'ccm', 'cc', 'sec', 's', 'psi', 'ksi', 'lb', 'in', 'degc', 'wm', 'k', 'mol', 'ohm']);
const SYNONYM = [[/\bhdt\b|\bdtul\b/g, ' heat deflection temperature '], [/\btg\b/g, ' glass transition temperature '], [/\bspecific gravity\b/g, ' density '], [/\bsg\b/g, ' density '], [/\byoung'?s? modulus\b/g, ' tensile modulus '], [/\bmfr\b|\bmfi\b/g, ' melt flow ']];
const DIRECTION = [[/\bz\s*[-–/]?\s*x\b|\bzx\b/gi, ' dirzx '], [/\bx\s*[-–/]?\s*z\b|\bxz\b|\bedge(?:wise)?\b|\bon[- ]?edge\b/gi, ' dirxz '], [/\bx\s*[-–/]?\s*y\b|\bxy\b|\bhorizontal\b|\bflat(?:wise)?\b|\bin[- ]plane\b/gi, ' dirxy '], [/\bz\b|\bvertical\b|\bupright\b|\bthrough[- ]plane\b/gi, ' dirz ']];
const MOISTURE = [[/\bconditioned\b|\bwet\b|\b50\s*%\s*rh\b|\bsaturated\b|\bhumid\b/gi, ' mcond '], [/\bdry\b|\bdam\b|\bas[- ]received\b/gi, ' mdry ']];
const POST = [[/\bannealed\b|\banneal(?:ing)?\b/gi, ' pann '], [/\bas[- ]print(?:ed)?\b|\bnon[- ]annealed\b|\bunannealed\b/gi, ' pas ']];

const DIR_OF = (dir) => {
  const d = String(dir ?? '').toLowerCase();
  if (/^(xy|x-y)$|horizontal|flat/.test(d)) return ['dirxy'];
  if (/^xz$/.test(d)) return ['dirxz'];
  if (/^zx$/.test(d)) return ['dirzx'];
  if (/vertical/.test(d)) return ['dirz', 'dirxz', 'dirzx'];
  if (/^z$/.test(d)) return ['dirz'];
  return [];
};
const MOISTURE_OF = (s) => ({ dry: ['mdry'], conditioned: ['mcond'] }[String(s ?? '').toLowerCase()] ?? []);
const POST_OF = (s) => ({ 'as-printed': ['pas'], annealed: ['pann'] }[String(s ?? '').toLowerCase()] ?? []);

const GRADE_ID = /\[?\(?\bG\d{3}-(?:R)?\d+\)?\]?/g;
/** The core tokens of a label: standards, conditions, units, stop words and grade IDs gone; direction/moisture/state words as one token each. */
export function labelTokens(text) {
  let t = ` ${stripLatex(text)} `.replace(GRADE_ID, ' ');
  t = maskConditions(t);
  t = t.replace(/[’']/g, '');
  for (const group of [DIRECTION, MOISTURE, POST]) for (const [re, tok] of group) t = t.replace(re, tok);
  t = t.toLowerCase();
  for (const [re, rep] of SYNONYM) t = t.replace(re, rep);
  return (t.match(/[a-z]+|\d+/g) ?? [])
    .filter((w) => !STOP.has(w) && !UNITS.has(w) && !/^\d+$/.test(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.startsWith('dir') ? w.slice(0, -1) : w));
}

const tokenMatch = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
/** F score of the label's tokens against a row's tokens; `extra` are context tokens (direction, state) that count half. */
export function labelScore(labelToks, rowToks, extra = []) {
  const want = [...labelToks.map((t) => [t, 1]), ...extra.filter((t) => !labelToks.includes(t)).map((t) => [t, 0.5])];
  if (!want.length || !rowToks.length) return 0;
  const total = want.reduce((a, [, w]) => a + w, 0);
  const got = want.reduce((a, [t, w]) => a + (rowToks.some((r) => tokenMatch(t, r)) ? w : 0), 0);
  const recall = got / total;
  const precision = rowToks.filter((r) => want.some(([t]) => tokenMatch(t, r))).length / rowToks.length;
  return recall && precision ? (2 * recall * precision) / (recall + precision) : 0;
}

// ---- the page ---------------------------------------------------------------------------------------------------
const PLACEHOLDER = /\[(tbl-\d+\.(?:html|md))\]\(\1\)/;
const hasDigitValue = (cell, style) => valuesIn(cell, style).length > 0;
const labelLike = (cell, style) => !hasDigitValue(cell, style) && /\p{L}|^\s*$/u.test(cell);

function pipeCells(line) { return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()); }

/** Everything compare needs from one stored page: rows (with headers), the units of text to search, the number style. */
export function preparePage(ocrPage) {
  const markdown = stripLatex(ocrPage.markdown ?? '');
  const style = numberStyle(`${markdown} ${(ocrPage.tables ?? []).map((t) => stripLatex(t.html)).join(' ')} ${(ocrPage.lines ?? []).map(stripLatex).join(' ')}`);
  const rows = [], units = [], tables = [];
  const addRow = (row) => { rows.push(row); units.push(...row.cells.filter(Boolean)); };
  const gridRows = (g, src, tableIndex) => g.body.forEach((cells, r) => {
    const spanned = g.spanned[g.headerRows + r];
    addRow({ src, tableIndex, cells: cells.map(stripLatex), spanned, headers: g.headers.map(stripLatex), text: cells.map(stripLatex).join(' | ') });
  });
  for (const t of ocrPage.tables ?? []) {
    if (/<table/i.test(t.html ?? '')) {
      const g = htmlTableToGrid(stripLatex(t.html));
      tables.push(g); gridRows(g, 'table', tables.length - 1);
    }
  }
  const lines = (ocrPage.markdown ? String(ocrPage.markdown).split(/\r?\n/).filter((l) => l.trim() && !PLACEHOLDER.test(l)) : (ocrPage.lines ?? []).filter((l) => !/<table/i.test(l))).map((l) => stripLatex(l).trim());
  // Markdown pipe tables the API gave in place of html, and plain lines ("Density: 1.24 g/cm3").
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\|/.test(line)) {
      const run = [];
      while (i < lines.length && /\|/.test(lines[i])) run.push(lines[i++]);
      i--;
      const sepAt = run.findIndex((l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l));
      const header = sepAt === 1 ? pipeCells(run[0]) : null;
      const body = run.filter((_, j) => j !== sepAt && !(header && j === 0));
      const grid = { body: body.map(pipeCells), spanned: body.map((l) => pipeCells(l).map(() => false)), headerRows: 0, headers: header ?? [] };
      if (!header) grid.headers = [];
      grid.body.forEach((cells, r) => addRow({ src: 'pipe', tableIndex: null, cells, spanned: grid.spanned[r], headers: grid.headers, text: cells.join(' | ') }));
      continue;
    }
    const masked = maskConditions(line);
    const colon = line.indexOf(':');
    const first = valuesIn(masked, style)[0];
    let cut = first ? first.index : -1;
    if (colon >= 0 && (cut < 0 || colon < cut)) cut = colon + 1;
    const label = (cut > 0 ? line.slice(0, cut) : line).replace(/[:\s]+$/, '').trim();
    const value = cut > 0 ? line.slice(cut).replace(/^[\s:]+/, '') : '';
    addRow({ src: 'line', tableIndex: null, cells: [label, value], spanned: [false, false], headers: ['', ''], text: line });
  }
  return { page: ocrPage.page, style, rows, tables, units, text: units.join(' \n ') };
}

/** A row's label variants: the first k cells as the label, k from 1 to the leading label-like cells. */
function variants(row, style) {
  const out = [];
  let k = 1;
  while (true) {
    out.push({ k, label: row.cells.slice(0, k).join(' ') });
    if (k >= row.cells.length - 1 || !labelLike(row.cells[k], style)) break;
    k++;
  }
  return out;
}

// ---- what to look for -------------------------------------------------------------------------------------------
const FIELD_WORDS = {
  'Nozzle °C': ['nozzle', 'extruder', 'hotend', 'printing temperature', 'print temperature', 'drucktemperatur', 'düsentemperatur'],
  'Bed °C': ['bed', 'build plate', 'build surface', 'platform', 'plate', 'heizbett', 'druckbett'],
  'Chamber °C': ['chamber', 'ambient'],
  Drying: ['drying', 'dry', 'trocknung'],
  Enclosure: ['enclosure', 'chamber'],
  'Abrasion / clogging': ['nozzle', 'hardened', 'abrasion', 'wear'],
  'Nozzle material': ['nozzle', 'hardened'],
  'Hardened nozzle': ['nozzle', 'hardened'],
};
// What a printing-settings label speaks of, first match wins; a gate cell is only ever looked for in a row of its own family
// or of none (a row "Heated bed temperature" is never where a nozzle range is read).
const FAMILIES = [
  ['drying', /\bdry|trock|séch|sech|secag|essicc|secado|drogen|suszen/i], ['enclosure', /enclos|\bclosed\b|gehäuse|gehause|chiuso|fermé|ferme\b|cerrad|kamer\s*gesloten/i], ['hardened', /harden|abras|\bwear|ruby|nozzle\s*(?:size|material|type|spec)|düsen?\s*(?:größe|material)|clog/i],
  ['bed', /\bbed\b|\bbett|heizbett|druckbett|piano\s*(?:riscald|di stampa)|plateau|plaque|\bcama\b|\blit\b|bouwplaat|build\s*(?:plate|surface)|\bplate\b|platform|\btable\b|\bplatte|\bplateau/i], ['chamber', /chamber|ambient|kammer|bauraum|camera|chambre|cámara|kamera/i],
  ['nozzle', /nozzle|extruder|hot\s*end|hotend|print(?:ing)?\s*temp|drucktemp|düse|duse|ugello|\bbuse\b|boquilla|tryska|temperature/i],
];
export const familyOf = (label) => FAMILIES.find(([, re]) => re.test(String(label ?? '')))?.[0] ?? null;
const FIELD_FAMILY = { 'Nozzle °C': 'nozzle', 'Bed °C': 'bed', 'Chamber °C': 'chamber', Drying: 'drying', Enclosure: 'enclosure', 'Abrasion / clogging': 'hardened', 'Nozzle material': 'hardened', 'Hardened nozzle': 'hardened' };
const wordHit = (text, words) => words.some((w) => new RegExp(`\\b${w}`, 'i').test(text));

/** The locator's pieces: [{ page, text }] ("p. 1: Recommended printing settings: Nozzle temperature; p. 1: Build platform"). */
export function locatorPieces(locator) {
  return String(locator ?? '').split(/;\s*(?=p(?:p|age)?\.?\s*\d)/i).map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^\bp(?:age|p)?\.?\s*(\d+)\s*[,:]?\s*(.*)$/is.exec(s);
    return m ? { page: Number(m[1]), text: m[2].trim() } : { page: null, text: s };
  });
}

/** The label strings the record's row may be called, with a weight (a word taken from the field is weaker than the record's own words). */
export function labelCandidates(target) {
  const pieces = locatorPieces(target.Locator);
  const out = [];
  const guide = /the column headed ([^:]+):/i.exec(target.Locator ?? '');
  const clean = (t) => t.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*[\d±][^)]*\)/g, ' ').replace(GRADE_ID, ' ').trim();
  const words = FIELD_WORDS[target.Field];
  for (const p of pieces) {
    let text = clean(guide ? p.text.replace(/^the column headed [^:]+:\s*/i, '') : p.text);
    const parts = guide ? text.split(/;/).map((x) => x.trim()) : [text];
    for (const part of parts) {
      if (!part) continue;
      if (words && !(target.Kind === 'value')) {
        // A gate or guide cell: the locator names several rows (it may be in any language); keep those that are not another field's.
        const tail = part.split(':').at(-1).trim();
        for (const seg of new Set([part, tail, ...tail.split(/\s*,\s*/)])) {
          const fam = familyOf(seg);
          if (seg && (!fam || fam === FIELD_FAMILY[target.Field])) out.push({ page: p.page, label: seg, weight: fam ? 1 : 0.9 });
        }
        continue;
      }
      const variantsOf = [part];
      const tail = /^(.*?),\s*([^,()]+)$/.exec(part);
      if (tail) variantsOf.push(tail[1]);
      for (const v of variantsOf) out.push({ page: p.page, label: v, weight: 1 });
      if (/:\s/.test(part)) out.push({ page: p.page, label: part.split(':').at(-1).trim(), weight: 1 });
    }
  }
  // The field's own words, found in a row's label (every token of the word, whatever else the label says): weaker than the record's own words.
  if (words) out.push(...words.map((w) => ({ page: null, label: w, weight: 0.8, contain: true })));
  return out;
}

// ---- columns ----------------------------------------------------------------------------------------------------
const EXCLUDED_HEADER = /\b(units?|methods?|standards?|norms?|conditions?|notes?|remarks?|specimens?)\b/i;
const tokensOfHeader = (h) => labelTokens(h);

/**
 * Narrow the numeric columns of a row by what the record says about itself. Returns { chosen: [indexes], applied: [names] };
 * decided only when one column is left after at least one selector narrowed the choice.
 */
export function chooseColumn(columns, ctx) {
  let cand = columns;
  const applied = [];
  const narrow = (name, test) => {
    const hit = cand.filter(test);
    if (hit.length && hit.length < cand.length) { cand = hit; applied.push(name); }
  };
  if (ctx.guideColumn) {
    const exact = cand.filter((c) => squash(c.header) === squash(ctx.guideColumn));
    if (exact.length) { cand = exact; applied.push('guide-column'); } else return { chosen: [], applied, missing: `no column headed ${ctx.guideColumn}` };
  }
  if (ctx.products?.length) {
    const want = ctx.products.map(labelTokens).filter((t) => t.length);
    const scored = cand.map((c) => ({ c, s: Math.max(0, ...want.map((w) => labelScore(w, tokensOfHeader(c.header)))) }));
    const best = Math.max(0, ...scored.map((x) => x.s));
    if (best >= LABEL_MIN) { const hit = scored.filter((x) => x.s >= best - 1e-9).map((x) => x.c); if (hit.length < cand.length) { cand = hit; applied.push('product'); } }
  }
  const sets = [['direction', ctx.directionTokens], ['moisture', ctx.moistureTokens], ['post-processing', ctx.postTokens]];
  for (const [name, toks] of sets) if (toks?.length) narrow(name, (c) => tokensOfHeader(c.header).some((t) => toks.includes(t)));
  return { chosen: cand.map((c) => c.index), applied, decided: applied.length > 0 && cand.length === 1 };
}

// ---- classify ---------------------------------------------------------------------------------------------------
export const OUTCOMES = ['pairing-confirmed', 'row-only', 'elsewhere', 'label-not-found', 'absent', 'no-claim', 'no-ocr'];
export const RANK = Object.fromEntries(OUTCOMES.map((o, i) => [o, i]));

const heldInUnit = (unit, held, style) => (held.kind === 'numeric' ? containsRun(valuesIn(unit, style, held.raw), held.numbers) : held.kind === 'words' && loose(unit).includes(held.loose));

/** Where is the held value printed on this page: any cell or line? (A one-digit value is never searched for outside its own cell.) */
function presentOnPage(page, held) {
  if (held.kind === 'words') return loose(page.text).includes(held.loose);
  if (held.oneDigit) return false;
  return page.units.some((u) => heldInUnit(u, held, page.style));
}

/**
 * One target against one prepared page. Returns { outcome, labelScore, matchedRow, matchedColumn, note }.
 * `context`: { direction, moistureState, postState, product, products, multi, guideColumn } as deriveContext builds it.
 */
export function classify(target, ocrPage, context = {}) {
  const base = { outcome: 'no-ocr', labelScore: '', matchedRow: '', matchedColumn: '', note: '' };
  if (!ocrPage) return { ...base, note: 'no reading of this page' };
  const page = ocrPage.rows && ocrPage.style ? ocrPage : preparePage(ocrPage);
  const held = parseHeld(target.Value, page.style);
  if (held.kind === 'none') return { ...base, outcome: 'no-claim', note: 'the record states nothing to check' };
  const ctx = {
    directionTokens: DIR_OF(context.direction), moistureTokens: MOISTURE_OF(context.moistureState), postTokens: POST_OF(context.postState),
    products: [context.product, ...(context.productHints ?? [])].filter(Boolean), multi: Boolean(context.multi),
    guideColumn: context.guideColumn ?? (/the column headed ([^:]+):/i.exec(target.Locator ?? '') ?? [])[1]?.trim(),
  };
  if (!ctx.multi) ctx.products = [];
  const extra = [...ctx.directionTokens.slice(0, 1), ...ctx.moistureTokens, ...ctx.postTokens];
  const cands = labelCandidates(target).filter((c) => c.page == null || c.page === page.page || ocrPage.page == null);

  // Score every row against every label candidate.
  const scored = [];
  for (const row of page.rows) {
    const vs = variants(row, page.style);
    let best = { s: 0 };
    for (const v of vs) {
      const fam = target.Kind === 'value' ? null : familyOf(v.label);
      if (fam && FIELD_FAMILY[target.Field] && fam !== FIELD_FAMILY[target.Field]) continue;
      const rowToks = labelTokens(v.label);
      for (const c of cands) {
        const ct = labelTokens(c.label);
        const s = c.contain ? (ct.length && ct.every((t) => rowToks.some((r) => tokenMatch(t, r))) ? c.weight : 0) : labelScore(ct, rowToks, c.weight === 1 ? extra : []) * c.weight;
        if (s > best.s) best = { s, label: v.label, cand: c.label };
      }
    }
    if (best.s >= LABEL_MIN) scored.push({ row, ...best });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.length ? scored[0].s : 0;
  const near = target.Kind === 'value' ? scored.filter((x) => x.s >= top - 0.05).slice(0, 8) : scored.slice(0, 10);

  const evaluate = (entry) => {
    const { row } = entry;
    // The row's own label names a direction the record is not in (an X-Y row filed as Z, or the reverse): the value
    // may be printed there, but it is another specimen's.
    const rowDir = labelTokens(entry.label ?? '').filter((t) => t.startsWith('dir'));
    if (ctx.directionTokens.length && rowDir.length && !rowDir.some((t) => ctx.directionTokens.includes(t))) {
      const holds = row.cells.some((c, i) => i >= 1 && heldInUnit(c, held, page.style));
      return holds ? { kind: 'wrong-column', column: `row label ${rowDir.join('/')}`, wanted: `direction ${ctx.directionTokens.join('/')}`, by: 'row-label-direction' } : { kind: 'miss' };
    }
    if (held.kind === 'words') {
      return heldInUnit(row.text, held, page.style) ? { kind: 'confirmed', column: row.headers.find((h, i) => i > 0 && row.cells[i] && loose(row.cells[i]).includes(held.loose.slice(0, 20))) ?? '' } : { kind: 'miss' };
    }
    const numeric = row.cells.map((text, index) => ({ index, text, header: row.headers[index] ?? '', spanned: row.spanned?.[index] })).filter((c) => (c.index >= 1 || row.cells.length === 1) && !c.spanned && hasDigitValue(c.text, page.style) && !EXCLUDED_HEADER.test(c.header));
    const holding = numeric.filter((c) => heldInUnit(c.text, held, page.style));
    if (!holding.length) return { kind: 'miss' };
    if (numeric.length === 1) return { kind: 'confirmed', column: holding[0].header, single: true };
    const pick = chooseColumn(numeric, ctx);
    if (pick.missing) return { kind: 'row-only', note: pick.missing, column: holding.map((c) => c.header).join(' ; ') };
    if (!pick.decided) return { kind: 'row-only', note: `${numeric.length} value cells, column not decided`, column: holding.map((c) => c.header).join(' ; ') };
    const chosen = holding.find((c) => pick.chosen.includes(c.index));
    if (chosen) return { kind: 'confirmed', column: chosen.header, by: pick.applied.join('+') };
    return { kind: 'wrong-column', column: holding.map((c) => c.header).join(' ; '), wanted: numeric.filter((c) => pick.chosen.includes(c.index)).map((c) => c.header).join(' ; '), by: pick.applied.join('+') };
  };

  let result = null;
  for (const entry of near) {
    const r = evaluate(entry);
    const rank = { confirmed: 0, 'row-only': 1, 'wrong-column': 2, miss: 3 }[r.kind];
    if (!result || rank < result.rank) result = { ...r, rank, entry };
  }
  const note = (extraNote) => [extraNote, near.length > 1 ? `${near.length} rows scored within 0.05` : ''].filter(Boolean).join('; ');
  if (result && result.kind !== 'miss') {
    const matched = { labelScore: result.entry.s.toFixed(2), matchedRow: result.entry.row.text.slice(0, 160) };
    if (result.kind === 'confirmed' && target.Kind !== 'value' && FIELD_FAMILY[target.Field] && !familyOf(result.entry.label) && !cands.some((c) => c.weight === 1 && !c.contain)) {
      return { ...base, ...matched, outcome: 'row-only', matchedColumn: result.column, note: note('the label names nothing of this field and neither does the locator: the pairing is not confirmed') };
    }
    if (result.kind === 'confirmed') return { ...base, ...matched, outcome: 'pairing-confirmed', matchedColumn: result.column, note: note(result.single ? 'single value cell' : `column by ${result.by}`) };
    if (result.kind === 'row-only') return { ...base, ...matched, outcome: 'row-only', matchedColumn: result.column, note: note(result.note) };
    return { ...base, ...matched, outcome: 'elsewhere', matchedColumn: result.column, note: note(`in another column of the row (${result.column}); the record's column is ${result.wanted} (by ${result.by})`) };
  }
  const present = presentOnPage(page, held);
  if (scored.length) {
    const matched = { labelScore: scored[0].s.toFixed(2), matchedRow: scored[0].row.text.slice(0, 160) };
    if (present) return { ...base, ...matched, outcome: 'elsewhere', note: note('the value is printed on the page, not in the matched row') };
    return { ...base, ...matched, outcome: 'absent', note: note(held.oneDigit ? 'one-digit value, searched only in its own row' : held.kind === 'numeric' && held.numbers.length > 1 && held.numbers.some((n) => page.units.some((u) => valuesIn(u, page.style, held.raw).some((v) => numEq(v, n)))) ? 'the numbers are printed, not together in one cell' : '') };
  }
  // No row label matched: a table that runs the other way (properties across the top, products down the side).
  const across = transposed(page, cands, held, ctx, extra);
  if (across) return { ...base, ...across };
  return { ...base, outcome: present ? 'label-not-found' : 'absent', note: held.oneDigit ? 'one-digit value, not searched outside its own cell' : '' };
}

/** A table whose columns are the properties and whose rows are products: find the column by the label, the row by the product. */
function transposed(page, cands, held, ctx, extra) {
  for (const g of page.tables) {
    const cols = g.headers.map((h, index) => ({ index, h, s: Math.max(0, ...cands.map((c) => labelScore(labelTokens(c.label), labelTokens(h), c.weight === 1 ? extra : []) * c.weight)) })).filter((c) => c.s >= LABEL_MIN).sort((a, b) => b.s - a.s);
    for (const col of cols.slice(0, 3)) {
      const rows = g.body.map((cells, r) => ({ cells, r }));
      const wantProduct = ctx.products.length ? rows.filter((x) => Math.max(0, ...ctx.products.map((p) => labelScore(labelTokens(p), labelTokens(x.cells[0] ?? '')))) >= LABEL_MIN) : [];
      const holds = (x) => heldInUnit(x.cells[col.index] ?? '', held, page.style);
      if (wantProduct.length === 1 && holds(wantProduct[0])) return { outcome: 'pairing-confirmed', labelScore: col.s.toFixed(2), matchedRow: wantProduct[0].cells.join(' | ').slice(0, 160), matchedColumn: col.h, note: 'table runs the other way: column by label, row by product' };
      const holding = rows.filter(holds);
      if (holding.length && wantProduct.length) return { outcome: 'elsewhere', labelScore: col.s.toFixed(2), matchedRow: holding[0].cells.join(' | ').slice(0, 160), matchedColumn: col.h, note: 'table runs the other way: the column holds the value in another product\'s row' };
      if (holding.length === 1 && !ctx.products.length) return { outcome: 'pairing-confirmed', labelScore: col.s.toFixed(2), matchedRow: holding[0].cells.join(' | ').slice(0, 160), matchedColumn: col.h, note: 'table runs the other way: one row holds the value' };
      if (holding.length) return { outcome: 'row-only', labelScore: col.s.toFixed(2), matchedRow: holding[0].cells.join(' | ').slice(0, 160), matchedColumn: col.h, note: 'table runs the other way: the product row could not be decided' };
    }
  }
  return null;
}

// ---- context from the tables ------------------------------------------------------------------------------------
const rowsOf = (name) => readCsv(join(root, 'data/tables', `${name}.csv`)).records.map((r) => r.values);

export function loadTables() {
  const by = (rows, key) => new Map(rows.map((r) => [r[key], r]));
  return { measurements: by(rowsOf('measurements'), 'MeasurementID'), grades: by(rowsOf('grades'), 'GradeID'), sources: by(rowsOf('sources'), 'SourceID') };
}

const UNSET = /^(unstated|not applicable|not published|not stated|stated, not a usable direction|)$/i;
/** From the input row first, the tables only for what the row does not carry. */
export function deriveContext(target, tables = {}) {
  const m = target.Kind === 'value' ? tables.measurements?.get(target.Record) : null;
  const g = tables.grades?.get(target.GradeID);
  const direction = target.Direction ? target.Direction : m?.Direction;
  const product = g?.['Product name'] ?? '';
  const tail = /^[^;]*?,\s*([^,;()]+)$/.exec(locatorPieces(target.Locator)[0]?.text ?? '')?.[1];
  return {
    direction: UNSET.test(direction ?? '') ? '' : direction,
    moistureState: target.MoistureState ?? m?.['Moisture state'], postState: target.PostProcessingState ?? m?.['Post-processing state'],
    product, productHints: tail ? [tail.trim()] : [], rawUnit: m?.['Raw unit'] ?? '', multi: target.SheetType === 'multi-product',
  };
}

// ---- the run ----------------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { targets: join(here, '../TARGETS.csv'), ocrDir: join(root, '.cache/ocr-mistral'), out: null, sources: null, custom: false, source: 'mistral' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--targets') { o.targets = resolve(process.cwd(), argv[++i]); o.custom = true; }
    else if (a === '--ocr-dir') o.ocrDir = resolve(process.cwd(), argv[++i]);
    else if (a === '--out') o.out = resolve(process.cwd(), argv[++i]);
    else if (a === '--source') { o.source = argv[++i]; if (!['mistral', 'text', 'tesseract'].includes(o.source)) throw new Error('--source is mistral, text or tesseract'); }
    else if (a === '--sources') o.sources = new Set(argv[++i].split(','));
    else throw new Error(`unknown option ${a}`);
  }
  o.out ??= join(here, o.custom ? `${basename(o.targets, '.csv')}.compare${o.source === 'mistral' ? '' : `.${o.source}`}.csv` : o.source === 'mistral' ? 'compare.csv' : `compare.${o.source}.csv`);
  return o;
}

const readings = new Map();
async function readingFor(sha, ocrDir, source = 'mistral') {
  const key = `${source}/${ocrDir}/${sha}`;
  if (source !== 'mistral' && !readings.has(key)) readings.set(key, (await import('./text-source.mjs')).textDocument(sha, source));
  if (!readings.has(key)) {
    const path = join(ocrDir, `${sha}.json`);
    const doc = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
    if (doc) for (const p of doc.pages) p.prepared = preparePage(p);
    readings.set(key, doc);
  }
  return readings.get(key);
}

/** A target against its document: every page its locator names, the best outcome kept. */
export function classifyTarget(target, doc, context) {
  if (!doc) return { outcome: 'no-ocr', labelScore: '', matchedRow: '', matchedColumn: '', note: 'no reading of this document' };
  const pages = [...new Set(locatorPieces(target.Locator).map((p) => p.page))].filter((p) => p != null);
  if (!pages.length) pages.push(...doc.pages.map((p) => p.page));
  let best = null;
  for (const n of pages) {
    const page = doc.pages.find((p) => p.page === n);
    const r = page ? { ...classify(target, page.prepared ?? page, context), page: n } : { outcome: 'no-ocr', note: `no reading of page ${n}`, page: n, labelScore: '', matchedRow: '', matchedColumn: '' };
    const order = (x) => (x.outcome === 'no-claim' ? -1 : RANK[x.outcome]);
    if (!best || order(r) < order(best)) best = r;
  }
  return best;
}

const pad = (s, n) => String(s).padEnd(n);
function printTable(title, keyOf, results) {
  const keys = [...new Set(results.map(keyOf))].sort();
  console.log(`\n${title}`);
  console.log(pad('', 34) + OUTCOMES.map((o) => pad(o.replace('pairing-', 'pair-'), 16)).join('') + 'total');
  for (const k of keys) {
    const rs = results.filter((r) => keyOf(r) === k);
    console.log(pad(k, 34) + OUTCOMES.map((o) => pad(rs.filter((r) => r.Outcome === o).length, 16)).join('') + rs.length);
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const targets = readCsv(o.targets).records.map((r) => r.values);
  const tables = loadTables();
  const results = [];
  for (const t of targets) {
    if (o.sources && !o.sources.has(t.SourceID)) continue;
    const sha = tables.sources.get(t.SourceID)?.SHA256;
    const doc = sha ? await readingFor(sha, o.ocrDir, o.source) : null;
    const r = classifyTarget(t, doc, deriveContext(t, tables));
    results.push({ TargetID: t.TargetID ?? t.FixtureID ?? '', Kind: t.Kind, SheetType: t.SheetType ?? '', Record: t.Record, SourceID: t.SourceID, Page: r.page ?? pageOf(t.Locator) ?? '', Outcome: r.outcome, LabelScore: r.labelScore, MatchedRow: r.matchedRow, MatchedColumn: r.matchedColumn, Note: r.note, Expected: t.Expected ?? '' });
  }
  const header = ['TargetID', 'Kind', 'Record', 'SourceID', 'Page', 'Outcome', 'LabelScore', 'MatchedRow', 'MatchedColumn', 'Note'];
  const withExpected = results.some((r) => r.Expected);
  writeFileSync(o.out, csvText(withExpected ? [...header, 'Expected'] : header, results));
  console.log(`${results.length} target(s) -> ${o.out}`);
  printTable('Outcome by SheetType', (r) => r.SheetType || '(none)', results);
  printTable('Outcome by Kind', (r) => r.Kind, results);
  if (withExpected) {
    const rows = results.filter((r) => r.Expected);
    const cell = (r) => (r.Outcome === 'pairing-confirmed' ? 'pairing-confirmed' : 'not-confirmed');
    console.log('\nAgreement: Expected (rows) vs Outcome (columns)');
    const cols = ['pairing-confirmed', 'not-confirmed'];
    console.log(pad('', 22) + cols.map((c) => pad(c, 20)).join('') + '(of which row-only)');
    for (const e of ['pairing-confirmed', 'not-confirmed']) {
      const rs = rows.filter((r) => (r.Expected === 'pairing-confirmed' ? 'pairing-confirmed' : 'not-confirmed') === e);
      console.log(pad(e, 22) + cols.map((c) => pad(rs.filter((r) => cell(r) === c).length, 20)).join('') + rs.filter((r) => r.Outcome === 'row-only').length);
    }
    const wrong = rows.filter((r) => (r.Expected === 'pairing-confirmed') !== (r.Outcome === 'pairing-confirmed'));
    if (wrong.length) { console.log('\nDisagreements:'); for (const r of wrong) console.log(`  ${r.TargetID} ${r.Record} expected ${r.Expected}, got ${r.Outcome} ${r.Note ? `(${r.Note})` : ''}`); }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e.stack ?? e.message); process.exitCode = 1; });
