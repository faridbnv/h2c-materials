// Evidence checks that read text, ported from the old apply gate (scripts/ingest/apply.mjs, scripts/lib/pdf-text.mjs; WP-10).
//
//   The quote is on the hash-checked page      needs the private text cache; without it the check is "not run", never a pass
//   The value is a number its own line prints  D97: whole, and a number printed once has one role (APPLY-VALUE-NOT-IN-EVIDENCE,
//                                              APPLY-CONDITION-ROLE). Needs only the quote, so it always runs.
//
// The number reading below is a faithful port of countInEvidence/valueInEvidence: the standards are taken out first (the 527 of
// "ISO 527" is no result), a number inside another ("5" in "52") is not printed by this reading, and a number the extractor split
// ("2 900") is read whole.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Sha256 } from '@atlas/domain/contracts';
import { readJson } from './parse.ts';

// ---------------------------------------------------------------- the private text cache

/** One document's text, page by page, as the old tool's text cache holds it. */
export interface DocumentText {
  readonly pageCount: number;
  /** A page's text with every space removed (immune to the extractor splitting "2 433 .4" or joining "T ensile"), or null when the document has no such page. */
  squeezedPage(page: number): string | null;
}

/** Where the text of retrieved documents is kept; private, so absent on a fresh clone and in CI. */
export interface PageTextStore {
  /** The text of the document with this SHA-256, or null when the store does not hold it. A damaged entry throws. */
  document(sha256: Sha256): DocumentText | null;
}

const squeeze = (text: string): string => text.replace(/\s+/g, '');

interface CachedPage { page: number; squeezed?: string; lines?: { text?: string }[] }

function isCachedDocument(value: unknown): value is { pages: CachedPage[] } {
  return typeof value === 'object' && value !== null && 'pages' in value && Array.isArray(value.pages);
}

/** The old tool's cache layout: `<cacheDir>/text/<sha256>.json` with `pages: [{ page, lines, squeezed }]`. */
function fileTextStore(cacheDir: string): PageTextStore {
  return {
    document(sha256) {
      const path = join(cacheDir, 'text', `${sha256}.json`);
      if (!existsSync(path)) return null;
      const parsed = readJson(path);
      if (!isCachedDocument(parsed)) throw new Error(`${path} is not a cached document text (no "pages" list)`);
      const pages = parsed.pages;
      return {
        pageCount: pages.length,
        squeezedPage(page) {
          const found = pages.find((p) => p.page === page);
          if (!found) return null;
          // The squeezed page the extractor kept, and the page's lines joined: either may carry the quote.
          return `${found.squeezed ?? ''}\u0000${squeeze((found.lines ?? []).map((l) => l.text ?? '').join(' '))}`;
        },
      };
    },
  };
}

/** The store at H2C_DOCUMENT_CACHE (default `<root>/.cache`), or null when it holds no text directory. */
export function defaultTextStore(root: string, env: NodeJS.ProcessEnv = process.env): PageTextStore | null {
  const cache = env.H2C_DOCUMENT_CACHE ?? join(root, '.cache');
  return existsSync(join(cache, 'text')) ? fileTextStore(cache) : null;
}

// ---------------------------------------------------------------- the quote on its page

export type QuoteLookup =
  | { readonly found: true }
  | { readonly found: false; readonly why: string }
  | { readonly notRun: string };

/** Whether `quote` is on `page` of the document with this digest. `notRun` says why the store could not answer. */
export function quoteOnPage(store: PageTextStore | null, sha256: Sha256, page: number, quote: string): QuoteLookup {
  if (store === null) return { notRun: 'store absent' };
  const document = store.document(sha256);
  if (document === null) return { notRun: `store holds no text for ${sha256.slice(0, 12)}` };
  const text = document.squeezedPage(page);
  if (text === null) return { found: false, why: `the document has ${document.pageCount} page(s); there is no page ${page}` };
  const wanted = squeeze(quote);
  if (wanted === '') return { found: false, why: 'the quote is empty' };
  return text.includes(wanted) ? { found: true } : { found: false, why: `the quote is not on page ${page}` };
}

// ---------------------------------------------------------------- the value in its line (D97)

const SUPER: Readonly<Record<string, string>> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const STANDARD = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+[A-Za-z]{0,2}(?:\s?[-–.:/]\s?(?:\d+[A-Za-z]{0,2}|[A-Za-z]{1,3}\d*))*/g;
const STANDARD_CORE = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+[A-Za-z]{0,2}/g;
// A number on a sheet: a sign (hyphen, en dash or minus), digits with decimal or grouping separators or a bare decimal (".13"), and a
// power of ten written with a caret or raised. Nothing alphanumeric may touch its front: the "3" of "cm3" and the "638" of "D638"
// are no results. A dash between two numbers ("170--190", "55-60") is a range's, not a sign.
const NUMBER_TOKEN = /(?:(?<![\p{L}\d.,\-–−])([-–−]))?(?<![\p{L}\d.,])(\d+(?:[.,]\d+)*|[.,]\d+)(?:\s?\^\s?(-?\d+)|([⁰¹²³⁴-⁹⁻]+))?(?![.,]?\d)/gu;

/** The numbers one printed token may mean: a decimal point or comma, a thousands grouping, a power of ten. */
function readingsOf(sign: string, body: string, power: string | null): Set<number> {
  const out = new Set<number>();
  const negative = sign !== '';
  const add = (text: string): void => { const n = Number(text); if (Number.isFinite(n)) out.add(negative ? -n : n); };
  const separators = body.match(/[.,]/g) ?? [];
  if (separators.length <= 1) add(body.replace(',', '.'));
  if (separators.length && /^\d{1,3}(?:[.,]\d{3})+$/.test(body)) add(body.replace(/[.,]/g, ''));
  if (new Set(separators).size === 2) {
    const last = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','));
    add(`${body.slice(0, last).replace(/[.,]/g, '')}.${body.slice(last + 1)}`);
  }
  if (power !== null) {
    // "10^3" is a power of ten, not ten times a thousand: a bare ten in front of a power is the base, so only its sign is kept.
    for (const m of [...out]) out.add((Math.abs(m) === 10 ? Math.sign(m) : m) * 10 ** Number(power));
  }
  return out;
}

const same = (a: number, b: number): boolean => a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

interface Token { readonly from: number; readonly to: number; readonly sign: string; readonly body: string; readonly power: string | null; readonly readings: Set<number> }

function countIn(text: string, want: number): number {
  const tokens: Token[] = [...text.matchAll(NUMBER_TOKEN)].map((m) => {
    const raised = m[4];
    const power = m[3] ?? (raised ? [...raised].map((c) => SUPER[c] ?? '').join('') : null);
    const sign = m[1] ?? '';
    const body = m[2] ?? '';
    return { from: m.index, to: m.index + m[0].length, sign, body, power, readings: readingsOf(sign, body, power) };
  });
  const single = tokens.filter((t) => [...t.readings].some((r) => same(r, want))).length;
  if (single) return single;
  // A number the extractor split into pieces: consecutive pieces with nothing but spaces and separators between them.
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(tokens.length, i + 6); j++) {
      const first = tokens[i];
      const previous = tokens[j - 1];
      const last = tokens[j];
      if (!first || !previous || !last) break;
      if (!/^[\s.,]*$/.test(text.slice(previous.to, last.from)) || last.sign || previous.power) break;
      const body = text.slice(first.from + first.sign.length, last.to).replace(/\s+/g, '');
      if (/^(\d+(?:[.,]\d+)*|[.,]\d+)$/.test(body) && [...readingsOf(first.sign, body, null)].some((r) => same(r, want))) return 1;
    }
  }
  return 0;
}

/** How many times a row's own evidence line prints this number as a number of its own (D97). */
export function countInEvidence(evidenceText: string, value: string): number {
  const want = Number(value.trim().replace(/\s/g, ''));
  if (!Number.isFinite(want)) return 0;
  // A hardness is printed with its scale's letter against it ("A95", "D60"), which is a label, not part of a word.
  const text = evidenceText.replace(/(?<![\p{L}\d])([AD])(?=\d)/gu, '$1 ');
  // With each designation taken out whole; failing that, only its name and number, so a value the whole-designation pattern would
  // read as the designation's part ("D570 .13 %") is still found.
  return countIn(text.replace(STANDARD, ' § '), want) || countIn(text.replace(STANDARD_CORE, ' § '), want);
}

export const valueInEvidence = (evidenceText: string, value: string): boolean => countInEvidence(evidenceText, value) > 0;

/** Whether a cell holds a number rather than a word (the old gate's isNumber). */
export const isNumberCell = (value: string | null): value is string => value !== null && /^-?\d/.test(value);
