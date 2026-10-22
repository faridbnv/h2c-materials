// P-pages (pack 07 section 5.2): the visible text of every material page, so packaging cannot silently drop a section or a
// source line. Pages are compared as text, not as bytes: the markup around the words may change when the renderer moves; the
// words, their order, and where each link points may not.
//
// "Visible text" here is what a reader would see: the title, then the text of the body with scripts, styles and comments
// removed, one line per block, table cells separated by " | ", and each link followed by its target in angle brackets. The
// things that name a build rather than a page are replaced by a placeholder, on each side from that side's own database: the
// release id ({release}), the build date ({build}) and the release-stamped selector file name ({selector}), which is how
// an asset URL stays comparable between two releases.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SurfaceBuilder, clipWithDigest } from './surface.ts';
import type { SurfaceReport } from './types.ts';
import { compareStrings } from './util.ts';

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

/** Decode the entities the page renderer writes. An entity it does not know throws, so nothing is silently left encoded. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10));
    const named = NAMED_ENTITIES[body];
    if (named === undefined) throw new Error(`p-pages: unknown entity ${whole}; teach decodeEntities about it`);
    return named;
  });
}

/** The case name P-pages gives its differences: a page is not a corpus case, so a transition lists it as `pages`. */
export const PAGES_CASE = 'pages';

export interface PageNames {
  /** The release id of the database these pages were built from. */
  release: string;
  /** The build date of that database (ISO). */
  build: string;
}

/** What names a build rather than a page, replaced by a placeholder so two releases compare. */
export function normalizeNames(text: string, names: PageNames): string {
  const selector = text.replace(/H2C_Material_Selector_[0-9-]+_[0-9a-f]{12}\.html/g, '{selector}');
  const release = names.release ? selector.split(names.release).join('{release}') : selector;
  return names.build ? release.split(`build ${names.build}`).join('build {build}') : release;
}

const BLOCK = new Set(['p', 'div', 'li', 'ul', 'ol', 'tr', 'table', 'thead', 'tbody', 'tfoot', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dt', 'dd', 'details', 'summary', 'figure', 'figcaption', 'br', 'hr', 'blockquote', 'pre', 'form', 'caption', 'body']);
const CELL = new Set(['td', 'th']);
const TOKEN = /<!--[\s\S]*?-->|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+|<)/g;
/** A script or style with its whole content, found by its closing tag and not by tokenizing the content (which may hold a "<"). */
const OPAQUE = /<(script|style)\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/\1\s*>/gi;
const ATTRIBUTE_TEXT = /\s(aria-label|title|alt|placeholder)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const HREF = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/** The first group of several alternatives that took part in a match. */
const taken = (groups: readonly (string | undefined)[]): string => groups.find((g) => g !== undefined) ?? '';

/**
 * The visible text of one page, before names are normalised: the title, the text of the body, each link followed by its target,
 * the labels a screen reader reads (aria-label, title, alt, placeholder), and the data islands (JSON scripts) at the end. A page
 * the tokenizer cannot finish (a tag left open, a head never closed) throws: a page that parses to a fragment of itself would
 * compare equal on both sides and say nothing.
 */
export function visibleText(html: string): string {
  const islands: string[] = [];
  const markup = html.replace(OPAQUE, (_whole, tag: string, attrs: string, content: string) => {
    if (tag.toLowerCase() === 'script' && /\stype\s*=\s*["']?application\/json/i.test(` ${attrs}`)) islands.push(content.trim());
    return '';
  });
  let out = '';
  let inHead = false;
  let inTitle = false;
  const hrefs: string[] = [];
  for (const m of markup.matchAll(TOKEN)) {
    const [whole, closing, rawName, attrs, text] = m;
    if (rawName !== undefined) {
      const name = rawName.toLowerCase();
      const isClose = closing === '/';
      if (name === 'head') { inHead = !isClose; continue; }
      if (name === 'body') inHead = false;
      if (name === 'title') { inTitle = !isClose; out += isClose ? '\n' : ''; continue; }
      if (inHead) continue;
      if (!isClose) for (const a of (attrs ?? '').matchAll(ATTRIBUTE_TEXT)) out += `\n⟦${(a[1] ?? '').toLowerCase()}: ${decodeEntities(taken([a[2], a[3]]))}⟧\n`;
      if (name === 'a') {
        if (!isClose) hrefs.push(taken(HREF.exec(` ${attrs ?? ''}`)?.slice(1) ?? []));
        else { const href = hrefs.pop(); out += href ? ` ⟨${decodeEntities(href)}⟩` : ''; }
        continue;
      }
      if (name === 'text') { out += ' '; continue; }
      if (CELL.has(name)) { out += isClose ? ' | ' : ' '; continue; }
      if (BLOCK.has(name)) out += '\n';
      continue;
    }
    if (whole.startsWith('<!') || whole.startsWith('<?')) continue;
    if (inHead && !inTitle) continue;
    if (text !== undefined) out += decodeEntities(text);
  }
  if (inHead || inTitle) throw new Error('p-pages: the page ends inside its head or title, so most of it was not read');
  for (const island of islands) out += `\n⟦data: ${island}⟧\n`;
  return out.split('\n').map((l) => l.replace(/[ \t\r]+/g, ' ').trim()).filter((l) => l !== '' && l !== '|').join('\n');
}

export interface PageSet {
  label: string;
  /** Relative path (materials/M001.html style) to the page's normalised visible text. */
  pages: Map<string, string>;
  /** The raw HTML, kept only for link harvesting. */
  html: Map<string, string>;
}

function* htmlFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort(compareStrings)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (entry.endsWith('.html')) yield path;
  }
}

const PAGES_HINT = '(npm run build writes them; npm run build:diff removes them)';

/** Read every .html page under a materials directory. An empty or missing directory throws: no pages is not "no differences". */
export function readPages(dir: string, label: string, names: PageNames): PageSet {
  const pages = new Map<string, string>();
  const html = new Map<string, string>();
  let files: string[];
  try { files = [...htmlFiles(dir)]; } catch (err) { throw new Error(`${label}: cannot read the material pages in ${dir}: ${err instanceof Error ? err.message : String(err)} ${PAGES_HINT}`); }
  if (files.length === 0) throw new Error(`${label}: no material pages in ${dir} ${PAGES_HINT}`);
  for (const file of files) {
    const rel = relative(dir, file).split('\\').join('/');
    const raw = readFileSync(file, 'utf8');
    html.set(rel, raw);
    pages.set(rel, normalizeNames(visibleText(raw), names));
  }
  return { label, pages, html };
}

export interface Hunk {
  /** Zero-based line of the first text where the change starts. */
  start: number;
  before: string[];
  after: string[];
}

/** The most lines of change one page may have before the whole stretch between its first and last change is one hunk. */
const MAX_EDITS = 1500;

/**
 * The changes between two texts, a hunk for each run of changed lines (Myers' shortest edit script, with the common start and
 * end dropped first). Where a page changed so much that the script would be larger than MAX_EDITS, the stretch between the
 * first and the last change is one hunk: the comparison still names the page, with less detail.
 */
export function diffHunks(a: string[], b: string[]): Hunk[] {
  let from = 0;
  while (from < a.length && from < b.length && a[from] === b[from]) from++;
  let endA = a.length, endB = b.length;
  while (endA > from && endB > from && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const A = a.slice(from, endA), B = b.slice(from, endB);
  const n = A.length, m = B.length;
  if (n === 0 && m === 0) return [];
  if (n === 0 || m === 0) return [{ start: from, before: A, after: B }];
  const max = Math.min(n + m, MAX_EDITS);
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && (v[off + k - 1] ?? 0) < (v[off + k + 1] ?? 0)) ? (v[off + k + 1] ?? 0) : (v[off + k - 1] ?? 0) + 1;
      let y = x - k;
      while (x < n && y < m && A[x] === B[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
  }
  if (found < 0) return [{ start: from, before: A, after: B }];
  // Walk back from the end, collecting for each position whether it was kept, deleted from A or inserted from B.
  const ops: ('=' | '-' | '+')[] = [];
  let x = n, y = m;
  for (let d = found; d > 0; d--) {
    const p = trace[d]!;
    const k = x - y;
    const prevK = k === -d || (k !== d && (p[off + k - 1] ?? 0) < (p[off + k + 1] ?? 0)) ? k + 1 : k - 1;
    const prevX = p[off + prevK] ?? 0;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push('='); x--; y--; }
    ops.push(x === prevX ? '+' : '-');
    x = prevX; y = prevY;
  }
  while (x > 0 && y > 0) { ops.push('='); x--; y--; }
  ops.reverse();
  const hunks: Hunk[] = [];
  let i = 0, j = 0, open: Hunk | null = null;
  for (const op of ops) {
    if (op === '=') { open = null; i++; j++; continue; }
    if (open === null) { open = { start: from + i, before: [], after: [] }; hunks.push(open); }
    if (op === '-') { open.before.push(A[i]!); i++; } else { open.after.push(B[j]!); j++; }
  }
  return hunks;
}

/** Compare two page sets. A page on one side only, or any changed word, order or link target, is a difference: one for each run of changed lines. */
export function comparePages(before: PageSet, after: PageSet): SurfaceReport {
  const b = new SurfaceBuilder({ surface: 'pages', before: before.label, after: after.label, unit: 'page' });
  const files = [...new Set([...before.pages.keys(), ...after.pages.keys()])].sort(compareStrings);
  for (const file of files) {
    const x = before.pages.get(file);
    const y = after.pages.get(file);
    b.units++;
    if (x === undefined || y === undefined) {
      b.add({ case: PAGES_CASE, record: file, tier: 'wording', field: '(page)', before: x === undefined ? '<absent>' : '<present>', after: y === undefined ? '<absent>' : '<present>' });
      continue;
    }
    if (x === y) continue;
    for (const h of diffHunks(x.split('\n'), y.split('\n'))) {
      b.add({
        case: PAGES_CASE, record: file, tier: 'wording',
        field: h.before.length ? `lines ${h.start + 1}-${h.start + h.before.length}` : `after line ${h.start}`,
        before: clipWithDigest(h.before.join(' ⏎ ')), after: clipWithDigest(h.after.join(' ⏎ ')),
      });
    }
  }
  const visibleLines = [...before.pages.values()].reduce((n, t) => n + t.split('\n').length, 0);
  b.notes.push(`${before.pages.size} pages on the first side, ${after.pages.size} on the second; ${visibleLines} lines of visible text on the first (names normalised: {release} {build} {selector})`);
  return b.finish();
}
