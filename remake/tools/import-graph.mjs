// The files a TypeScript or JavaScript entry file reaches through its imports (WP-14, release identity). Node built-ins only, so
// the release ID can be computed in a deploy job without an install. It reads the text, not the syntax tree: a static
// `import ... from 'x'`, `export ... from 'x'`, `import('x')` and `new URL('x', import.meta.url)` with a plain string are followed;
// a specifier built at run time (a template with a variable) is not, and the caller names those files itself.
//
// Relative specifiers resolve against the importing file; `@atlas/<package>[/subpath]` resolves through that package's `exports`
// (packages/<package>/package.json), a `*` pattern included. Any other bare specifier (node:, vite, vue) is outside the repository
// and is not followed. A relative or workspace specifier that resolves to nothing is an error: a graph with a hole is never hashed.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SPECIFIER = [
  // a statement begins its line: an import named inside a string (a code generator's template) is not one
  /^[ \t]*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"\n]+)['"]/gm,
  /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\bnew URL\(\s*['"]([^'"\n]+)['"]\s*,\s*import\.meta\.url/g,
];

/** The text with comments blanked, so that an import named in a comment is not followed. Strings are left alone. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

/** The package an `@atlas/...` specifier names, as { dir, subpath } ('.' for the package itself), or null for any other specifier. */
function workspaceTarget(root, specifier) {
  const m = /^@atlas\/([^/]+)(?:\/(.+))?$/.exec(specifier);
  if (!m) return null;
  const dir = join(root, 'packages', m[1]);
  const manifest = join(dir, 'package.json');
  if (!existsSync(manifest)) throw new Error(`${specifier}: no workspace package at packages/${m[1]}`);
  const exports = JSON.parse(readFileSync(manifest, 'utf8')).exports ?? {};
  const key = m[2] === undefined ? '.' : `./${m[2]}`;
  if (typeof exports[key] === 'string') return join(dir, exports[key]);
  for (const [pattern, target] of Object.entries(exports)) {
    const star = pattern.indexOf('*');
    if (star < 0 || typeof target !== 'string') continue;
    const head = pattern.slice(0, star);
    const tail = pattern.slice(star + 1);
    if (key.startsWith(head) && key.endsWith(tail) && key.length >= head.length + tail.length) return join(dir, target.replace('*', key.slice(head.length, key.length - tail.length)));
  }
  throw new Error(`${specifier}: packages/${m[1]}/package.json exports nothing for "${key}"`);
}

/** Every repository file `entries` (paths from `root`) reach, as sorted root-relative paths with forward slashes, the entries included. */
export function importClosure(root, entries) {
  const seen = new Set();
  const from = new Map();
  const queue = entries.map((e) => resolve(root, e));
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    if (!existsSync(file) && !/\.[a-z]+$/.test(file)) {
      // a specifier without an extension: the file with the usual one, or the folder's index
      const found = ['.ts', '.js', '.mjs', '/index.ts', '/index.js'].map((e) => file + e).find((c) => existsSync(c));
      if (found) { queue.push(found); continue; }
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      const index = ['index.ts', 'index.js'].map((n) => join(file, n)).find((c) => existsSync(c));
      if (index) { queue.push(index); continue; }
    }
    if (!existsSync(file)) throw new Error(`${relative(root, file)}: imported (by ${relative(root, from.get(file) ?? "an entry")}), but not there`);
    if (!statSync(file).isDirectory()) seen.add(file);
    else continue;
    if (!/\.(?:ts|mts|js|mjs)$/.test(file)) continue;
    const text = stripComments(readFileSync(file, 'utf8'));
    for (const pattern of SPECIFIER) {
      for (const [, specifier] of text.matchAll(pattern)) {
        if (specifier.includes('${')) continue; // built at run time: the caller names what it can reach
        if (specifier.startsWith(".")) { const t = resolve(dirname(file), specifier); from.set(t, file); queue.push(t); }
        else {
          const target = workspaceTarget(root, specifier);
          if (target !== null) queue.push(target);
        }
      }
    }
  }
  return [...seen].map((f) => relative(root, f).split('\\').join('/')).sort();
}
