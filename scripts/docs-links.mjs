#!/usr/bin/env node
// Every relative link in the repository's Markdown leads somewhere (maintainability round, 2026-10-15).
//
// The documents link each other, the code and the round records by relative path, and a moved file breaks a link
// without anything failing: 37 links in the audit records pointed at files that were never committed or had moved. This
// checks every tracked Markdown file: each relative link's file or folder must be tracked, and an anchor (`#…`) into a
// Markdown file must be one of its headings (GitHub's slugs) or an `<a id>` it declares. Links inside code are not
// links, and a web address is not checked.
//
//   npm run docs:links              list every broken link
//   npm run docs:links -- --check   and exit 1 if there is one (in npm run verify)

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The tracked files, and every folder that holds one: what a clone, and CI, can follow a link to. */
function trackedTree() {
  const files = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean));
  const dirs = new Set();
  for (const f of files) for (let d = dirname(f); d !== '.' && !dirs.has(d); d = dirname(d)) dirs.add(d);
  return { files, dirs };
}

/** The text a reader sees as prose: fenced blocks, inline code and HTML comments removed, line numbers kept. */
export function proseOf(text) {
  const lines = text.split('\n');
  let fence = null;
  const kept = lines.map((line) => {
    const open = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) { if (open && open[1][0] === fence[0] && open[1].length >= fence.length) fence = null; return ''; }
    if (open) { fence = open[1]; return ''; }
    return line.replace(/(`+)[^`]*?\1/g, '');
  });
  return kept.join('\n').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''));
}

/** GitHub's slug for a heading: lower case, punctuation dropped, spaces to hyphens. */
export const slug = (heading) => heading.trim().toLowerCase()
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
  .replace(/ /g, '-');

const anchorCache = new Map();
/** Every anchor a Markdown file offers: its headings' slugs (a repeat numbered -1, -2 …) and its `<a id>` or name. */
export function anchorsOf(text) {
  const anchors = new Set();
  const seen = new Map();
  for (const line of proseOf(text).split('\n')) {
    const h = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!h) continue;
    const base = slug(h[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    anchors.add(n ? `${base}-${n}` : base);
  }
  for (const m of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(m[1].toLowerCase());
  return anchors;
}

const LINK = /!?\[(?:[^\]\[]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

/** Every broken relative link in the tracked Markdown, as "file:line: target: why". */
export function brokenLinks() {
  const { files, dirs } = trackedTree();
  const problems = [];
  const anchorsIn = (path) => {
    if (!anchorCache.has(path)) anchorCache.set(path, anchorsOf(readFileSync(join(root, path), 'utf8')));
    return anchorCache.get(path);
  };
  for (const file of [...files].filter((f) => f.endsWith('.md')).sort()) {
    const prose = proseOf(readFileSync(join(root, file), 'utf8'));
    prose.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(LINK)) {
        const target = m[1];
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const [rawPath, rawAnchor] = target.split('#');
        let path;
        try { path = rawPath ? normalize(join(dirname(file), decodeURIComponent(rawPath))).replace(/\/$/, '') : file; } catch { path = rawPath; }
        const where = `${file}:${i + 1}: ${target}`;
        if (path.startsWith('..')) { problems.push(`${where}: outside the repository`); continue; }
        if (!files.has(path) && !dirs.has(path)) { problems.push(`${where}: no such file`); continue; }
        if (rawAnchor && path.endsWith('.md') && files.has(path) && !anchorsIn(path).has(decodeURIComponent(rawAnchor).toLowerCase())) {
          problems.push(`${where}: no heading or anchor #${rawAnchor} in ${path}`);
        }
      }
    });
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = brokenLinks();
  for (const p of problems) console.log(p);
  if (problems.length) {
    console.error(`docs:links: ${problems.length} broken link(s)`);
    if (process.argv.includes('--check')) process.exit(1);
  } else console.log('docs:links: every relative link in the tracked Markdown resolves');
}
