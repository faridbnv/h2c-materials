#!/usr/bin/env node
// What this checkout can do, and what each missing piece needs (the review of 2026-09-27, A09 and F17).
//
// A clean clone that followed the old Quick start installed the build's dependencies and not the import tools', so
// `npm run verify` failed in its import tests; and without Chrome the interface checks used to report "skipped" and let
// verify pass. This says, before anything is run, which of the routes work here:
//
//   build and verify:fast     Node 24 or later and build/node_modules (npm ci --prefix build)
//   verify, before a commit   also the import tools (npm ci) and Chrome for the interface checks, which fail without it
//   re-reading sources        the cached documents under .cache/ (npm run data:sources, where it exists, restores them)
//
//   npm run doctor            report; exit 1 when something `verify` needs is missing

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from './lib/cdp.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = [];
const add = (what, ok, detail, fix) => rows.push({ what, ok, detail, fix });

const major = Number(process.versions.node.split('.')[0]);
add('Node 24 or later', major >= 24, `Node ${process.versions.node}`, 'Install Node 24 (package.json "engines"); CI runs 24.');

const has = (dir, name) => existsSync(join(root, dir, 'node_modules', name));
const buildDeps = ['ajv', 'csv-parse', 'csv-stringify', 'esbuild', 'plotly.js-dist-min'];
const missingBuild = buildDeps.filter((d) => !has('build', d));
add('Build dependencies', !missingBuild.length, missingBuild.length ? `missing ${missingBuild.join(', ')}` : 'installed', 'npm ci --prefix build');
add('Import tools\' dependencies', has('.', 'pdfjs-dist'), has('.', 'pdfjs-dist') ? 'installed' : 'missing pdfjs-dist', 'npm ci');

const chrome = findChrome();
add('Chrome, for the interface checks in verify', !!chrome, chrome ?? 'not found', 'Install Chrome or Chromium, or set CHROME=/path/to/chrome');

let hooks = null;
try { hooks = execFileSync('git', ['config', 'core.hooksPath'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* unset */ }
add('Pre-commit data check', !!hooks && /(^|\/)\.githooks$/.test(hooks), hooks ? `core.hooksPath ${hooks}` : 'not set', 'npm run hooks');

// Re-reading a source needs its bytes; a hash and a URL cannot restore a document that has changed or gone (A08).
// The CSV reader lives with the build's dependencies, which may be what is missing: then the lines are counted instead.
const sources = await import('../build/src/csv.js').then(({ readCsv }) => readCsv(join(root, 'data/tables/sources.csv')).records.length)
  .catch(() => readFileSync(join(root, 'data/tables/sources.csv'), 'utf8').split('\n').slice(1).filter(Boolean).length);
const cached = (dir) => (existsSync(join(root, '.cache', dir)) ? readdirSync(join(root, '.cache', dir), { recursive: true }).filter((f) => !String(f).endsWith('/')).length : 0);
const bytes = cached('sources'), texts = cached('text');
add('Cached source documents, for re-reads and migrations', bytes > 0, `${bytes} files under .cache/sources, ${texts} texts under .cache/text, for ${sources} registered sources`, 'Restore the private source store, or re-fetch a document only through the import pipeline');

const width = Math.max(...rows.map((r) => r.what.length));
for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'NO  '} ${r.what.padEnd(width)}  ${r.detail}${r.ok ? '' : `\n      ${' '.repeat(width)}  -> ${r.fix}`}`);
const needed = ['Node 24 or later', 'Build dependencies', 'Import tools\' dependencies', 'Chrome, for the interface checks in verify'];
const blocking = rows.filter((r) => !r.ok && needed.includes(r.what));
console.log(blocking.length ? `\nnpm run verify cannot pass here: ${blocking.map((r) => r.what).join('; ')}.` : '\nnpm run verify:fast and npm run verify can run here.');
process.exit(blocking.length ? 1 : 0);
