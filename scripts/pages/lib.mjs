// What the material pages' tools share: the compiled database, built first where it is missing or older than what it is
// built from, and a page's HTML as the text a reader reads.

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const newest = (dir) => readdirSync(join(root, dir), { recursive: true }).reduce((t, f) => {
  try { return Math.max(t, statSync(join(root, dir, f)).mtimeMs); } catch { return t; }
}, 0);

/**
 * dist/db.json, built first (npm run build, which writes the pages too) where it is missing or older than data/,
 * schema/ or build/src. `quiet` keeps the build's own output off stdout, so a tool's output stays its own.
 */
export function loadDb({ quiet = false } = {}) {
  const dbPath = join(root, 'dist/db.json');
  if (!existsSync(dbPath) || statSync(dbPath).mtimeMs < Math.max(newest('data'), newest('schema'), newest('build/src'))) {
    console.error('dist/db.json is missing or older than data/, schema/ or build/src: building it first.');
    const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit' });
    if (r.status) process.exit(r.status);
  }
  return JSON.parse(readFileSync(dbPath, 'utf8'));
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', times: '×', deg: '°', middot: '·' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => (e[0] === '#'
  ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
  : ENTITIES[e.toLowerCase()] ?? all));

/**
 * A page's HTML as plain text, in reading order: headings marked with #, a section opened by its name, table rows with
 * their cells between bars, list items with a dash, a closed group's title in brackets; scripts, styles and the figures'
 * drawing left out (a figure's title, caption and table are text and stay). For reading, never for parsing back.
 */
export function pageText(html) {
  let t = html
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<section\b[^>]*data-section="([^"]+)"[^>]*>/gi, '\n\n[section: $1]\n')
    .replace(/<h([1-4])\b[^>]*>/gi, (all, n) => `\n\n${'#'.repeat(Number(n))} `)
    .replace(/<\/h[1-4]>/gi, '\n')
    .replace(/<summary\b[^>]*>/gi, '\n[open: ').replace(/<\/summary>/gi, ']\n')
    .replace(/<tr\b[^>]*>/gi, '\n| ').replace(/<\/t[hd]>/gi, ' | ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    // A labelled span is a word of its own (a section's number, a value's note beside its unit).
    .replace(/<span\b[^>]*\bclass="[^"]*"[^>]*>|<\/span>/gi, ' ')
    .replace(/<\/(p|div|figcaption|figure|table|ul|ol|dl|dt|dd|header|footer|nav|section|details|caption|blockquote)>/gi, '\n')
    .replace(/<(p|div|figcaption|table|caption|dt|dd|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  t = decode(t);
  return t.split('\n').map((l) => l.replace(/[ \t\u00a0\u2060]+/g, ' ').trim()).filter((l, i, a) => l || (a[i - 1] ?? '') !== '')
    .join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
