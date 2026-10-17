// Node only: the build's stage 8 (build/src/index.js), after the bundle. It renders the material pages (render.js
// renderSite: every page the page rule admits, its records page, the index and the shared assets) from the compiled
// database, writes them to dist/materials/, and returns what the manifest records of them. Nothing here decides
// anything, and nothing the build has made before this stage reads it.
//
//   the pages    rendered from dist/db.json's own text (parsed again here), so a page is a function of the published
//                database alone: a fresh renderSite of dist/db.json gives these bytes (test/pages.check.js, P14)
//   the cache    the result is kept in the build cache (build/src/build-cache.js), keyed by the renderer's code
//                (digestFiles over CODE_ROOTS: the renderer, the drawer's shared facts and words, the engine, the
//                stylesheets), the database's SHA-256 and the selector's file name the pages link to; H2C_NO_BUILD_CACHE=1
//                renders afresh, and a code file changed after the process started turns the cache off for the result
//   the folder   written to dist/.materials-<pid>/ and then put in place of dist/materials/ by renaming, so no page of an
//                earlier build survives beside these and no reader ever sees half a folder
//   the budgets  budget.js: a page, the stylesheet or the script over its budget is a warning; over twice it, the build
//                stops
//
// pagesStage({ projectRoot, dbJson, selectorFile }) -> { digest, pages, recordsPages, bytes, ms, cached }, where digest
// is the SHA-256 over the sorted "<sha256>  materials/<path>" lines of every file written (manifest.outputs['materials/']).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { cacheEnabled, claim, digestFiles, keyOf, readEntry, writeEntry } from '../../build/src/build-cache.js';
import { renderSite, pageEnv } from './render.js';
import { readAssets } from './read-assets.js';
import { PAGE_BUDGET } from './budget.js';
import { PAGES_DIR } from '../js/ui/page-rule.js';

/** What the pages are rendered by, from the project root: every file here is in the cache key. */
export const CODE_ROOTS = ['app/pages', 'app/js/ui', 'app/js/engine', 'app/css'];
const FORMAT = 'h2c-pages 1';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** The budget a file is held to, by its path relative to dist/: a main page or the index, a records page, an asset. */
function budgetOf(path) {
  if (path.endsWith('/assets/pages.css')) return { kind: 'stylesheet', ...PAGE_BUDGET.css };
  if (path.endsWith('/assets/page.js')) return { kind: 'script', ...PAGE_BUDGET.script };
  if (path.endsWith('-records.html')) return { kind: 'records page', ...PAGE_BUDGET.records };
  if (path.endsWith('.html')) return { kind: 'page', ...PAGE_BUDGET.main };
  return null;
}

/** Render the pages and weigh them: { files, stats, sizes: [[path, bytes, gzipBytes]] }, all plain data for the cache. */
function render(projectRoot, dbJson, selectorFile) {
  const db = JSON.parse(dbJson);
  const { files, stats } = renderSite(db, pageEnv(db, { assets: readAssets(projectRoot), selectorFile }));
  const sizes = files.map(([path, text]) => [path, Buffer.byteLength(text), budgetOf(path)?.gzip ? gzipSync(text, { level: 9 }).length : null]);
  return { files, stats, sizes };
}

/** The result for this database and selector: from the build cache where it holds it, else rendered (and stored). */
function pagesFor(projectRoot, dbJson, selectorFile) {
  const code = cacheEnabled() ? digestFiles(CODE_ROOTS) : null;
  const key = code ? keyOf(code, { db: sha256(dbJson), selectorFile }, { format: FORMAT }) : null;
  const hit = key ? readEntry(key) : null;
  if (hit) return { result: hit, cached: true };
  const lock = key ? claim(key) : { release() {} };
  if (lock.entry) return { result: lock.entry, cached: true };
  try {
    const result = render(projectRoot, dbJson, selectorFile);
    // Stored only when the renderer's code is still the code the key names: a file saved during the render may not be
    // what this process loaded.
    if (key && digestFiles(CODE_ROOTS) === code) writeEntry(key, result);
    return { result, cached: false };
  } finally {
    lock.release();
  }
}

/** True while a process of that number runs (a folder an interrupted build left is removed only when it has ended). */
function running(pid) {
  if (pid === process.pid) return true;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** Write the files to a folder of this process's own, then put it in place of dist/materials/. */
function writeFolder(dist, files) {
  mkdirSync(dist, { recursive: true });
  for (const name of readdirSync(dist)) {
    const pid = /^\.materials-(?:old-)?(\d+)$/.exec(name)?.[1];
    if (pid && !running(Number(pid))) rmSync(join(dist, name), { recursive: true, force: true });
  }
  const tmp = join(dist, `.${PAGES_DIR}-${process.pid}`);
  const old = join(dist, `.${PAGES_DIR}-old-${process.pid}`);
  const out = join(dist, PAGES_DIR);
  rmSync(tmp, { recursive: true, force: true });
  for (const [path, text] of files) {
    if (!path.startsWith(`${PAGES_DIR}/`)) throw new Error(`pages stage: ${path} is not under ${PAGES_DIR}/`);
    const file = join(tmp, path.slice(PAGES_DIR.length + 1));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  rmSync(old, { recursive: true, force: true });
  if (existsSync(out)) renameSync(out, old);
  renameSync(tmp, out);
  rmSync(old, { recursive: true, force: true });
}

/** Each file against its budget: warnings over it, errors over twice it, and the set's total. */
function budgetFindings(sizes) {
  const warn = [];
  const fail = [];
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  for (const [path, bytes, gzip] of sizes) {
    const b = budgetOf(path);
    if (!b) continue;
    for (const [what, size, limit] of [['raw', bytes, b.raw], ['gzipped', gzip, b.gzip]]) {
      if (limit == null || size == null || size <= limit) continue;
      (size > 2 * limit ? fail : warn).push(`${path} (${b.kind}) is ${kb(size)} ${what}, over its budget of ${kb(limit)}`);
    }
  }
  const total = sizes.reduce((n, [, bytes]) => n + bytes, 0);
  if (total > PAGE_BUDGET.set.raw) (total > 2 * PAGE_BUDGET.set.raw ? fail : warn).push(`the pages together are ${kb(total)}, over their budget of ${kb(PAGE_BUDGET.set.raw)}`);
  return { warn, fail, total };
}

export async function pagesStage({ projectRoot, dbJson, selectorFile }) {
  const t0 = performance.now();
  const { result, cached } = pagesFor(projectRoot, dbJson, selectorFile);
  const { warn, fail, total } = budgetFindings(result.sizes);
  for (const w of warn) console.log(`  warn   [PAGE-BUDGET] ${w} (app/pages/budget.js)`);
  if (fail.length) {
    for (const f of fail) console.error(`  ERROR  [PAGE-BUDGET] ${f}, more than twice it (app/pages/budget.js)`);
    throw new Error('Build failed: a material page is over twice its budget.');
  }
  writeFolder(join(projectRoot, 'dist'), result.files);
  const digest = sha256(result.files.map(([path, text]) => [path, sha256(text)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([path, h]) => `${h}  ${path}`).join('\n'));
  const ms = Math.round(performance.now() - t0);
  const { pages, recordsPages } = result.stats;
  const mb = (total / 1024 / 1024).toFixed(1);
  console.log(`pages  ${pages} pages, ${recordsPages} records pages and the index, ${mb} MB in all, ${cached ? `read from the build cache in ${ms} ms` : `in ${ms} ms`}`);
  return { digest, pages, recordsPages, bytes: total, ms, cached };
}
