// What the reader round's two scripts share: a document's pages in each view the round uses, the rows the tables hold
// from one source, and the tests that say a number or a quote is printed on a page.
//
//   views    line   the cached text, lines as the extractor grouped them (scripts/lib/pdf-text.mjs)
//            block  the same text in column-aware reading order, when scripts/lib/pdf-layout.mjs exists
//            ocr    the optical sidecar .cache/ocr-text/<sha>.json, when it exists
//
// Nothing here writes to the document cache or to data/. A text cache written by an older extractor is read as it
// is and marked stale; a document with no cached text is read from its bytes in memory.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../build/src/csv.js';
import { DOCUMENT_CACHE, TEXT_CACHE, projectRoot } from './context.mjs';
import { cachedText, countInEvidence, pageLines, pdfPages, spellings, squeezed } from '../lib/pdf-text.mjs';
import { htmlText, plainText } from '../lib/html-text.mjs';
import { locate } from '../data/source-store.mjs';

export const SETTING_FIELDS = ['nozzle', 'bed', 'chamber', 'enclosure', 'drying', 'hardened_nozzle', 'nozzle_diameter', 'print_speed', 'fan', 'plate', 'other'];
/** The settings that decide whether a product is printable on the H2C: a new one needs a second read. */
export const DECISION_SETTINGS = ['nozzle', 'bed', 'chamber', 'enclosure', 'drying', 'hardened_nozzle'];
export const KINDS = ['setting', 'value', 'context', 'identity', 'none'];
export const VERDICTS = ['new', 'confirms', 'mismatch', 'not-on-page'];
export const CONFIDENCE = ['high', 'medium', 'low'];
export const CONTEXT_SCOPES = ['all', 'tensile', 'flexural', 'impact', 'thermal', 'physical'];
/** The properties whose value decides a headline (GOALS): a new one needs a second read. */
export const DECISION_PROPERTY = /^(Tensile (strength|yield strength|break strength|modulus)|Elongation at break|Density|HDT|Glass transition|Charpy|Izod)/i;
export const HEADER = ['source_id', 'page', 'kind', 'field', 'grade_id', 'product', 'label', 'raw', 'number_lo', 'number_hi', 'unit', 'operator', 'direction', 'specimen', 'moisture', 'post_processing', 'standard', 'test_conditions', 'table_heading', 'quote', 'held_id', 'verdict', 'held_value', 'confidence', 'reader', 'note'];

export const NP = 'Not published';
const missing = (v) => v == null || v === '' || /^(Not published|Not applicable)/i.test(String(v));

/** The page a locator names ("p. 2: Tensile modulus"), or null. Same rule as build/src/page-context.js. */
export const pageOf = (locator) => { const m = String(locator ?? '').match(/\bp(?:age|p)?\.?\s*(\d+)/i); return m ? Number(m[1]) : null; };

/** The same squash the migrations' quote guard uses (scripts/migrate/m277-m279-sweep-shared.mjs). */
export const squash = (s) => String(s ?? '').toLowerCase().replace(/℃/g, '°c').replace(/[˚º]/g, '°').replace(/[^a-z0-9°%.,<>≤≥+\-]/g, '');

export const readTable = (name, root = projectRoot) => readCsv(join(root, 'data/tables', `${name}.csv`)).records.map((r) => r.values);
export function loadTables(root = projectRoot) {
  return Object.fromEntries(['measurements', 'profiles', 'page_context', 'grades', 'sources', 'properties'].map((n) => [n, readTable(n, root)]));
}

/** The numbers in a string, in order ("40-70°C" gives 40 and 70). */
export function numbersIn(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/(?<![\p{L}\d.,])(\d+(?:[.,]\d+)?|[.,]\d+)/gu)) out.push(Number(m[1].replace(',', '.')));
  return out;
}

/** Two printed numbers agree when they are equal at the coarser of their two precisions. */
export function sameNumber(a, b) {
  const x = Number(String(a).replace(',', '.')), y = Number(String(b).replace(',', '.'));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x === y) return true;
  const decimals = (v) => (String(v).replace(',', '.').split('.')[1] ?? '').replace(/\D.*$/, '').length;
  const d = Math.min(decimals(a), decimals(b));
  const round = (v) => Math.round(v * 10 ** d) / 10 ** d;
  return round(x) === round(y) || Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
}

// ---- documents --------------------------------------------------------------------------------------------------

let layoutModule;
/** scripts/lib/pdf-layout.mjs, if it exists yet. */
export async function layout() {
  if (layoutModule === undefined) {
    try { layoutModule = await import('../lib/pdf-layout.mjs'); } catch { layoutModule = null; }
  }
  return layoutModule;
}

/** The OCR sidecar's pages for a document: Map page -> lines (strings), or null. */
export function ocrSidecar(sha) {
  const path = join(DOCUMENT_CACHE, 'ocr-text', `${sha}.json`);
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return new Map((data.pages ?? []).map((p) => [Number(p.page), (p.lines ?? []).map((l) => (typeof l === 'string' ? l : l.text ?? '')).filter(Boolean)]));
}

const linesOf = (pages) => new Map(pages.map((p) => [Number(p.page), p.lines.map((l) => l.text).filter(Boolean)]));

/**
 * One document's pages in each view: { sha, kind, source ('cache'|'stale-cache'|'bytes'|'none'), pages: Map(page ->
 * { line: [..], block: [..], ocr: [..], squeezed }) , blockAvailable }. Never writes the cache.
 */
export async function loadDocument({ sha, sourceId = '' }) {
  const located = sha ? locate(sha, sourceId) : { bytes: 'absent', path: null };
  let text = sha ? cachedText(sha) : null;
  let source = text ? 'cache' : 'none';
  if (!text && sha && existsSync(join(TEXT_CACHE, `${sha}.json`))) {
    text = JSON.parse(readFileSync(join(TEXT_CACHE, `${sha}.json`), 'utf8'));
    source = 'stale-cache';
  }
  if (!text && located.bytes === 'present') {
    const bytes = readFileSync(located.path);
    if (String(Buffer.from(bytes).subarray(0, 5)) === '%PDF-') {
      text = { sha, pages: (await pdfPages(bytes)).map(({ page, spans }) => ({ page, lines: pageLines(spans), squeezed: squeezed(spans) })) };
    } else {
      text = htmlText(bytes, { sha });
      // A page that is data (a catalogue's JSON) has no table to read: its own text, in lines, is all there is.
      if (!text.pages.some((p) => p.lines.length)) {
        const flat = plainText(Buffer.from(bytes).toString('utf8'));
        const chunks = flat.match(/.{1,200}(?:\s|$)/g) ?? [];
        text = { ...text, raw: true, pages: [{ page: 1, lines: chunks.map((t, i) => ({ y: -i, x0: 0, x1: 0, text: t.trim(), spans: [] })), squeezed: flat.replace(/\s+/g, '') }] };
      }
    }
    source = 'bytes';
  }
  const ocr = sha ? ocrSidecar(sha) : null;
  let blockPages = null;
  const mod = text ? await layout() : null;
  if (mod?.withReadingOrder) {
    try { blockPages = linesOf((await mod.withReadingOrder(text)).pages); } catch { blockPages = null; }
  }
  const line = text ? linesOf(text.pages) : new Map();
  const pages = new Map();
  for (const n of new Set([...line.keys(), ...(blockPages?.keys() ?? []), ...(ocr?.keys() ?? [])])) {
    pages.set(n, { line: line.get(n) ?? [], block: blockPages?.get(n) ?? [], ocr: ocr?.get(n) ?? [], squeezed: text?.pages.find((p) => Number(p.page) === n)?.squeezed ?? '' });
  }
  return { sha, kind: text?.html || text?.raw ? 'html' : text ? 'pdf' : located.bytes === 'present' ? 'unread' : 'none', source, pages, blockAvailable: Boolean(blockPages), ocrAvailable: Boolean(ocr), title: text?.title ?? null, bytes: located.bytes };
}

/** A document built from lines you hand it (the tests, and any caller with its own text). */
export function documentFrom(pages) {
  return { sha: null, kind: 'pdf', source: 'given', blockAvailable: false, ocrAvailable: false, bytes: 'absent', pages: new Map(Object.entries(pages).map(([n, v]) => [Number(n), { line: v.line ?? [], block: v.block ?? [], ocr: v.ocr ?? [], squeezed: (v.line ?? []).join('').replace(/\s+/g, '') }])) };
}

export const VIEWS = [['line', 'text'], ['block', 'block'], ['ocr', 'ocr']];
const RANK = { text: 0, block: 1, ocr: 2 };

/** Is this number printed on this page, in this view's lines? Weak squeezed matching only for numbers of four characters or more. */
export function numberInLines(lines, value, squeezedPage = '') {
  if (lines.some((l) => countInEvidence(l, value) > 0)) return true;
  const plain = String(value).replace(/\s/g, '');
  if (plain.replace(/\D/g, '').length >= 4) {
    const flat = squeezedPage || lines.join('').replace(/\s+/g, '');
    return spellings(plain).some((s) => flat.includes(s));
  }
  return false;
}

// A reader copying a line off an image drops or adds a comma or a full stop; a digit's own separator stays.
const loose = (s) => squash(s).replace(/(?<!\d)[.,]|[.,](?!\d)/g, '');

export function quoteInLines(lines, quote) {
  const hay = loose(lines.join(' '));
  return String(quote ?? '').split(' | ').map(loose).filter((q) => q.length >= 3).every((q) => hay.includes(q));
}

/**
 * How a reading is borne out by the page's text: { presence: 'text'|'block'|'ocr'|'visual-only', flags: [] }.
 * Every number must be printed on the page and the quote must be on it; the strongest view that bears each out
 * counts, and the weaker of the two names the row. A row with no quote, or a number nobody can find, is visual-only.
 */
export function presence(doc, page, { numbers = [], quote = '' }) {
  const p = doc?.pages.get(Number(page));
  const flags = [];
  if (!p) return { presence: 'visual-only', flags: [`page-${page}-has-no-text`] };
  const firstView = (test) => VIEWS.find(([view]) => p[view].length && test(p[view], view === 'line' ? p.squeezed : ''))?.[1] ?? null;
  let rank = 0;
  for (const n of numbers) {
    const where = firstView((lines, flat) => numberInLines(lines, n, flat));
    if (!where) { flags.push(`number-not-on-page:${n}`); continue; }
    rank = Math.max(rank, RANK[where]);
  }
  if (String(quote ?? '').trim()) {
    const where = firstView((lines) => quoteInLines(lines, quote));
    if (!where) flags.push('quote-not-on-page'); else rank = Math.max(rank, RANK[where]);
  } else flags.push('no-quote');
  return { presence: flags.length ? 'visual-only' : ['text', 'block', 'ocr'][rank], flags };
}

// ---- what the tables hold ----------------------------------------------------------------------------------------

const MEASUREMENT_COLUMNS = ['MeasurementID', 'GradeID', 'Property', 'Raw value', 'Raw unit', 'Raw numeric', 'Normalized value', 'Normalized unit', 'Operator', 'Direction', 'Specimen type', 'Moisture condition', 'Moisture state', 'Post-processing', 'Post-processing state', 'Standard / load', 'Test temperature', 'Notch', 'Locator', 'Data status'];
const PROFILE_COLUMNS = ['ProfileID', 'GradeID', 'Profile', 'Nozzle °C', 'Nozzle min °C', 'Nozzle max °C', 'Nozzle state', 'Bed °C', 'Bed min °C', 'Bed max °C', 'Bed state', 'Chamber °C', 'Chamber min °C', 'Chamber max °C', 'Chamber state', 'Enclosure', 'Enclosure state', 'Plate', 'Drying', 'Drying state', 'Drying °C', 'Drying hours', 'Hardened nozzle', 'Nozzle diameter', 'Locator'];
const pick = (row, columns) => Object.fromEntries(columns.map((c) => [c, row[c] ?? null]));

/** Every row the tables hold from one source, and the products it names. */
export function heldFor(tables, sourceId) {
  const source = tables.sources.find((s) => s.SourceID === sourceId);
  const named = new Set(String(source?.['Applicable grades'] ?? '').match(/G\d{3}-(?:R)?\d+/g) ?? []);
  const measurements = tables.measurements.filter((m) => m.SourceID === sourceId).map((m) => ({ ...pick(m, MEASUREMENT_COLUMNS), page: pageOf(m.Locator) }));
  const profiles = tables.profiles.filter((p) => p.SourceID === sourceId).map((p) => ({ ...pick(p, PROFILE_COLUMNS), page: pageOf(p.Locator) }));
  const pageContext = tables.page_context.filter((c) => c.SourceID === sourceId);
  for (const g of tables.grades) if (g.SourceID === sourceId) named.add(g.GradeID);
  for (const r of [...measurements, ...profiles]) if (r.GradeID) named.add(r.GradeID);
  const products = tables.grades.filter((g) => named.has(g.GradeID)).map((g) => ({ GradeID: g.GradeID, Manufacturer: g.Manufacturer, 'Product name': g['Product name'] }));
  return { sourceId, sha: source?.SHA256 ?? null, measurements, profiles, page_context: pageContext, products };
}

/** The TARGETS rows that a document's products and materials open (what is missing). */
export function targetsFor(targets, doc) {
  const grades = new Set(String(doc.Grades ?? '').split(/[;,\s]+/).filter(Boolean));
  const materials = new Set(String(doc.Materials ?? '').split(/[;,\s]+/).filter(Boolean));
  return targets.filter((t) => (t.GradeID ? grades.has(t.GradeID) : materials.has(t.MaterialID)));
}

export { locate, missing };
