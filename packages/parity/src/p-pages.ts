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

/** The line ranges two texts differ in: their common start and end are dropped, the middle is the change. */
function middleOf(a: string[], b: string[]): { start: number; before: string[]; after: string[] } {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  return { start, before: a.slice(start, endA), after: b.slice(start, endB) };
}

/** Compare two page sets. A page on one side only, or any changed word, order or link target, is a difference. */
export function comparePages(before: PageSet, after: PageSet): SurfaceReport {
  const b = new SurfaceBuilder({ surface: 'pages', before: before.label, after: after.label, unit: 'page' });
  const files = [...new Set([...before.pages.keys(), ...after.pages.keys()])].sort(compareStrings);
  for (const file of files) {
    const x = before.pages.get(file);
    const y = after.pages.get(file);
    b.units++;
    if (x === undefined || y === undefined) {
      b.add({ case: 'pages', record: file, tier: 'wording', field: '(page)', before: x === undefined ? '<absent>' : '<present>', after: y === undefined ? '<absent>' : '<present>' });
      continue;
    }
    if (x === y) continue;
    const changed = middleOf(x.split('\n'), y.split('\n'));
    b.add({
      case: 'pages', record: file, tier: 'wording', field: `lines ${changed.start + 1}-${changed.start + Math.max(changed.before.length, changed.after.length)}`,
      before: clipWithDigest(changed.before.join(' ⏎ ')), after: clipWithDigest(changed.after.join(' ⏎ ')),
    });
  }
  const visibleLines = [...before.pages.values()].reduce((n, t) => n + t.split('\n').length, 0);
  b.notes.push(`${before.pages.size} pages on the first side, ${after.pages.size} on the second; ${visibleLines} lines of visible text on the first (names normalised: {release} {build} {selector})`);
  return b.finish();
}
