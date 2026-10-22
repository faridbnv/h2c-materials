#!/usr/bin/env node
// Deploy-time post-processing of the preview site (WP-03). It works on COPIES in the runner's _site folder; the old build
// code and its output are never edited. Node built-ins only, so the deploy job needs no npm install.
//
//   node remake/tools/preview-assemble.mjs inject --site _site --remake SHA --main SHA [--run-id ID]
//        adds 404.html, puts the banner and <meta name="robots" content="noindex"> into EVERY html file, writes preview.json
//   node remake/tools/preview-assemble.mjs stage  --site _site --repo DIR
//        moves the preview repo's current site into previous/<release> (one previous release is kept), copies _site over it
//   node remake/tools/preview-assemble.mjs build-v3 --site _site
//        builds the public view (apps/public, WP-14) and copies it to _site/v3/; `inject` then marks its pages like the others.
//        Needs the repository's npm install (Vite, Vue) and the old build's, so it runs where the site is built (the build
//        job), not in the deploy job, which holds the key and installs nothing.
//
// Anything unexpected throws: a page without <head> or <body>, a missing manifest, an unsafe release name, and private
// material in what is about to be published (private-scan.mjs, run at the end of `inject` over the site and at the end of
// `stage` over the preview repository's tree). The deploy job then fails; nothing is half-published.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { RELEASE_ID_PATTERN } from './release-id.mjs';
import { NOT_FOUND_HTML } from './site-pages.mjs';
import { assertClean, scanTree } from './private-scan.mjs';
import { isMain, repoRoot } from './wp-lib.mjs';

export const LIVE_URL = 'https://pdynamics.ca/h2c-materials/';
// One plain phrase per registered transition (parity/transitions/<id>.json): the deliberate changes this preview makes to the
// live tool's answers. tests/remake/ci.test.mjs requires every transition file to be named here, so the banner cannot go stale.
export const TRANSITION_NOTES = {
  '2026-10-21-reprint-counts-once': "a table one maker reprints from another counts once in a material's median (reprint-counts-once)",
  '2026-10-22-dt1-float-tie': 'a rounding tie in the estimate audit is settled with a tolerance; no answer moves (dt1-float-tie)',
  '2026-10-22-pages-display': "the material pages link back to the selector at its stable address, say that a table two products share counts once in the median, show a local source as a private reference, and the method page labels the test answers as written by an agent and not yet reviewed by a person (pages-display)",
  '2026-10-22-pages-reprint-medians': "the material pages show the medians that change under the reprint ruling (pages-reprint-medians)",
};
const CHANGES = Object.values(TRANSITION_NOTES);
export const BANNER_TEXT = `Preview of the Filament Atlas remake — not the live tool.${CHANGES.length ? ` Deliberate change from it: ${CHANGES.join('; ')}.` : ''} Live:`;
export const BANNER_MARK = 'data-preview-banner';
export const NOINDEX = '<meta name="robots" content="noindex">';
// The preview shares the origin pdynamics.ca with the live tool, so it would share localStorage and sessionStorage.
// This runs before any page script and prefixes every key, so the preview never reads or overwrites the live tool's state.
export const STORAGE_PREFIX = 'h2c-preview:';
export const STORAGE_SHIM = `<script data-preview-storage>(function(){var P=${JSON.stringify('h2c-preview:')},S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;S.getItem=function(n){return g.call(this,P+n)};S.setItem=function(n,v){return s.call(this,P+n,v)};S.removeItem=function(n){return r.call(this,P+n)};S.clear=function(){var a=[];for(var i=0;i<this.length;i++){var k=S.key.call(this,i);if(k&&k.indexOf(P)===0)a.push(k)}for(var j=0;j<a.length;j++)r.call(this,a[j])}})();</script>`;
const BANNER_STYLE = 'margin:0;padding:.55rem 1rem;background:#fff3bf;color:#3b2f00;border-bottom:2px solid #c98a00;'
  + 'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;text-align:center';
export const BANNER_HTML = `<div ${BANNER_MARK} role="note" style="${BANNER_STYLE}">${BANNER_TEXT} <a href="${LIVE_URL}" style="color:#3b2f00">${LIVE_URL}</a></div>`;

export function injectBanner(html, name = 'html') {
  if (html.includes(BANNER_HTML) && html.includes(NOINDEX) && html.includes(STORAGE_SHIM)) return html;
  if (html.includes(BANNER_MARK)) throw new Error(`${name}: contains "${BANNER_MARK}" but not the complete banner and noindex; refusing to guess`);
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (!head) throw new Error(`${name}: no <head> tag; refusing to publish a page that cannot carry noindex`);
  const withMeta = html.slice(0, head.index + head[0].length) + NOINDEX + STORAGE_SHIM + html.slice(head.index + head[0].length);
  const body = /<body(\s[^>]*)?>/i.exec(withMeta);
  if (!body) throw new Error(`${name}: no <body> tag; refusing to publish a page that cannot carry the banner`);
  return withMeta.slice(0, body.index + body[0].length) + BANNER_HTML + withMeta.slice(body.index + body[0].length);
}

// Pages serves 404.html (status 404) for a missing path from any depth. Today's site has none, so the preview adds one of its own:
// remake/tools/site-pages.mjs, self-contained, taking the site root from the first segment of its own address.
export { NOT_FOUND_HTML };

// Symbolic links are refused: a link could make the walk loop or rewrite a file outside the site.
export function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (name === '.git' || name === '.github') throw new Error(`${relative(dir, p) || name}: a ${name} folder inside the site; refusing to publish it`);
    if (st.isSymbolicLink()) throw new Error(`${relative(dir, p) || name}: symbolic link in the site; refusing to publish it`);
    if (st.isDirectory()) yield* walk(p); else yield p;
  }
}

// The public view of WP-14 (apps/public) lives at _site/v3/, beside the old site; it never ships to the live site.
export const V3_DIR = 'v3';

/** Run apps/public's build into `out`. Needs the repository's npm install; says so when it is missing. */
function runPublicBuild({ root, out }) {
  for (const need of ['node_modules/vite', 'node_modules/vue', 'build/node_modules']) {
    if (!existsSync(join(root, need))) throw new Error(`${need} is not installed: the /v3/ view builds where the site is built, after npm ci in the root and in build/`);
  }
  const run = spawnSync(process.execPath, [join(root, 'apps/public/tools/build.ts'), '--out', out], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
  if (run.status !== 0) throw new Error(`the /v3/ build failed (exit ${run.status})`);
}

/** The release a built view names, once it is whole: its page, its manifest and its data parts are all there. `who` starts the error. */
function viewRelease(dir, who) {
  const manifest = join(dir, 'release.json');
  if (!existsSync(manifest) || !existsSync(join(dir, 'index.html'))) throw new Error(`${who} has no index.html and release.json`);
  const { release } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (!RELEASE_ID_PATTERN.test(release)) throw new Error(`${who} names no valid release: "${release}"`);
  for (const part of ['result.json', 'core.json', 'estimates.json', 'reference.json']) {
    if (!existsSync(join(dir, 'data', release, part))) throw new Error(`${who} has no data/${release}/${part}`);
  }
  return release;
}

/**
 * Builds the public view and puts it in <site>/v3/. The release it names is read back from the build's own release.json, and
 * its results file must be there: a view without its data is never published. `build` is replaceable for tests.
 */
export function buildV3(site, { root = repoRoot(), build = runPublicBuild } = {}) {
  const target = join(site, V3_DIR);
  if (existsSync(target)) throw new Error(`${target} exists already; refusing to overwrite it`);
  const out = mkdtempSync(join(tmpdir(), 'h2c-v3-'));
  try {
    build({ root, out });
    const release = viewRelease(out, 'the /v3/ build');
    cpSync(out, target, { recursive: true });
    return { release, files: [...walk(target)].length };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

export function inject(site, { remake, main, runId = null, now = new Date() }) {
  if (!/^[0-9a-f]{40}$/.test(remake)) throw new Error(`--remake must be a 40-character commit SHA, got "${remake}"`);
  if (!/^[0-9a-f]{40}$/.test(main)) throw new Error(`--main must be a 40-character commit SHA, got "${main}"`);
  const manifestPath = join(site, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} missing: the site was not assembled`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!/^[0-9a-f]{12}$/.test(manifest.release ?? '')) throw new Error(`manifest.release is not a 12-character release id: "${manifest.release}"`);
  if (!existsSync(join(site, 'index.html'))) throw new Error('index.html missing from the site');
  for (const bad of ['.git', '.github', 'previous']) if (existsSync(join(site, bad))) throw new Error(`the site has a top-level ${bad}; refusing to publish it`);
  if (!existsSync(join(site, '404.html'))) writeFileSync(join(site, '404.html'), NOT_FOUND_HTML);
  const pages = [...walk(site)].filter((p) => /\.html?$/i.test(p));
  for (const p of pages) writeFileSync(p, injectBanner(readFileSync(p, 'utf8'), relative(site, p)));
  // Re-read what was written: every page must carry the whole banner and noindex, whatever injectBanner believed.
  for (const p of pages) {
    const t = readFileSync(p, 'utf8');
    if (!t.includes(BANNER_HTML) || !t.includes(NOINDEX) || !t.includes(STORAGE_SHIM)) throw new Error(`${relative(site, p)}: banner, noindex or storage shim missing after injection`);
  }
  const materials = existsSync(join(site, 'materials')) ? readdirSync(join(site, 'materials')).filter((f) => /^M\d+\.html$/.test(f)).sort() : [];
  if (materials.length === 0) throw new Error('no materials/M<id>.html page in the site: the smoke test needs one');
  const info = {
    remakeCommit: remake, mainCommit: main, builtAt: now.toISOString(), release: manifest.release, snapshot: manifest.snapshot ?? null,
    sampleMaterial: `materials/${materials[0]}`, htmlFiles: pages.length, runId, note: 'Preview of the Filament Atlas remake. Not the live tool.',
  };
  // The public view, when this build made one: its release is its own (release identity v2), and its pages are already marked above.
  if (existsSync(join(site, V3_DIR))) info.v3Release = viewRelease(join(site, V3_DIR), `${V3_DIR}/`);
  writeFileSync(join(site, 'preview.json'), JSON.stringify(info, null, 2) + '\n');
  // Fail closed: nothing private, and nothing the scan cannot vouch for, goes on to be published (pack 02 section 10).
  assertClean(scanTree(site), 'the preview site');
  return info;
}

const SAFE_NAME = /^[0-9a-f]{12}$/;

/**
 * The public view in `dir` (v3/release.json): its release and the chunks it was built with, or null where the folder holds no view.
 * A stale page (index.html cached for up to ten minutes) asks the server for its own release's data and chunks, so a deploy that
 * replaces them with the new release's alone would 404 it (pack 02 section 6.2). The build lists its own chunks, so a chunk carried
 * from an older release is not carried again.
 */
function viewIn(dir) {
  const manifest = join(dir, V3_DIR, 'release.json');
  if (!existsSync(manifest)) return null;
  const { release, assets = [] } = JSON.parse(readFileSync(manifest, 'utf8'));
  if (!SAFE_NAME.test(release ?? '')) throw new Error(`${V3_DIR}/release.json names an unsafe release "${release}"`);
  for (const a of assets) if (typeof a !== 'string' || a.includes('/') || a.includes('\\') || a.startsWith('.')) throw new Error(`${V3_DIR}/release.json lists an unsafe chunk name "${a}"`);
  return { release, assets };
}

/** Copies the folders a stale page of the view in `repo` still asks for (its data/<release>/ and the chunks it was built with) to a scratch folder. */
function carryView(repo) {
  const view = viewIn(repo);
  if (view === null) return null;
  const dir = mkdtempSync(join(tmpdir(), 'h2c-carry-'));
  const data = join(repo, V3_DIR, 'data', view.release);
  if (existsSync(data)) cpSync(data, join(dir, 'data', view.release), { recursive: true });
  for (const name of view.assets) {
    const from = join(repo, V3_DIR, 'assets', name);
    if (existsSync(from)) cpSync(from, join(dir, 'assets', name));
  }
  return { release: view.release, dir };
}

// Moves what the preview repo serves now into previous/<its release> (only one previous release is kept), then copies the
// new site over the root. When the release is unchanged, previous/ is left exactly as it was. Either way the public view's
// previous release keeps its data/<release>/ and its chunks beside the new ones, so that a page cached before the deploy still
// loads (one previous view release is kept; the one before it goes).
export function stage(site, repo) {
  const newRelease = JSON.parse(readFileSync(join(site, 'preview.json'), 'utf8')).release;
  const keep = new Set(['.git', 'previous', 'README.md']);
  let moved = null;
  const carried = carryView(repo);
  try {
    const oldInfoPath = join(repo, 'preview.json');
    if (existsSync(oldInfoPath)) {
      const old = JSON.parse(readFileSync(oldInfoPath, 'utf8'));
      if (!old.release) throw new Error("the preview repo's preview.json names no release; refusing to delete it without archiving");
      if (old.release !== newRelease) {
        if (!SAFE_NAME.test(old.release)) throw new Error(`the preview repo's preview.json names an unsafe release "${old.release}"`);
        rmSync(join(repo, 'previous'), { recursive: true, force: true });
        const dest = join(repo, 'previous', old.release);
        mkdirSync(dest, { recursive: true });
        for (const name of readdirSync(repo)) if (!keep.has(name)) renameSync(join(repo, name), join(dest, name));
        moved = old.release;
      }
    }
    for (const name of readdirSync(repo)) if (!keep.has(name)) rmSync(join(repo, name), { recursive: true, force: true });
    cpSync(site, repo, { recursive: true });
    writeFileSync(join(repo, '.nojekyll'), '');
    const view = viewIn(repo);
    let carriedRelease = null;
    if (carried && view !== null && carried.release !== view.release) {
      for (const sub of [join('data', carried.release), 'assets']) {
        const from = join(carried.dir, sub);
        // force: false keeps the new file wherever the names meet (a chunk with the same hash is the same chunk).
        if (existsSync(from)) cpSync(from, join(repo, V3_DIR, sub), { recursive: true, force: false });
      }
      carriedRelease = carried.release;
    }
    // What the push will carry, previous/ included. The repository's own .git folder and README.md are not the site's.
    assertClean(scanTree(repo, { skip: (rel) => rel === '.git', allowPaths: ['README.md'] }), 'the staged preview repository');
    return { release: newRelease, previousKept: moved ?? (existsSync(join(repo, 'previous')) ? readdirSync(join(repo, 'previous')) : []), viewKept: carriedRelease };
  } finally {
    if (carried) rmSync(carried.dir, { recursive: true, force: true });
  }
}

const arg = (argv, name, required = true) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) { if (required) throw new Error(`missing ${name}`); return undefined; }
  return argv[i + 1];
};

if (isMain(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    if (argv[0] === 'inject') {
      const info = inject(arg(argv, '--site'), { remake: arg(argv, '--remake'), main: arg(argv, '--main'), runId: arg(argv, '--run-id', false) ?? null });
      console.log(`injected banner and noindex into ${info.htmlFiles} html files; release ${info.release}; sample ${info.sampleMaterial}`);
    } else if (argv[0] === 'build-v3') {
      const r = buildV3(arg(argv, '--site'));
      console.log(`built the public view into ${V3_DIR}/: release ${r.release}, ${r.files} files`);
    } else if (argv[0] === 'stage') {
      const r = stage(arg(argv, '--site'), arg(argv, '--repo'));
      console.log(`staged release ${r.release}; previous kept: ${JSON.stringify(r.previousKept)}; public view's previous data kept: ${r.viewKept ?? 'none'}`);
    } else throw new Error('usage: inject --site DIR --remake SHA --main SHA [--run-id ID] | stage --site DIR --repo DIR | build-v3 --site DIR');
  } catch (e) { console.error(`preview-assemble failed: ${e.message}`); process.exitCode = 1; }
}
