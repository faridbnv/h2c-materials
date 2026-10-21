#!/usr/bin/env node
// Deploy-time post-processing of the preview site (WP-03). It works on COPIES in the runner's _site folder; the old build
// code and its output are never edited. Node built-ins only, so the deploy job needs no npm install.
//
//   node remake/tools/preview-assemble.mjs inject --site _site --remake SHA --main SHA [--run-id ID]
//        adds 404.html, puts the banner and <meta name="robots" content="noindex"> into EVERY html file, writes preview.json
//   node remake/tools/preview-assemble.mjs stage  --site _site --repo DIR
//        moves the preview repo's current site into previous/<release> (one previous release is kept), copies _site over it
//
// Anything unexpected throws: a page without <head> or <body>, a missing manifest, an unsafe release name. The deploy job
// then fails; nothing is half-published.
import { readFileSync, writeFileSync, readdirSync, lstatSync, existsSync, mkdirSync, renameSync, rmSync, cpSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMain } from './wp-lib.mjs';

export const LIVE_URL = 'https://pdynamics.ca/h2c-materials/';
export const BANNER_TEXT = 'Preview of the Filament Atlas remake — not the live tool. Live:';
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

// Pages serves 404.html (status 404) for a missing path. Today's site has none, so the preview adds one of its own.
export const NOT_FOUND_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found: Filament Atlas preview</title></head>
<body style="font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem">
<h1>Page not found</h1>
<p>This address does not exist on the preview of the Filament Atlas remake.</p>
<p><a href="./">Open the preview</a> or the <a href="${LIVE_URL}">live tool</a>.</p>
</body></html>
`;

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
  writeFileSync(join(site, 'preview.json'), JSON.stringify(info, null, 2) + '\n');
  return info;
}

const SAFE_NAME = /^[0-9a-f]{12}$/;
// Moves what the preview repo serves now into previous/<its release> (only one previous release is kept), then copies the
// new site over the root. When the release is unchanged, previous/ is left exactly as it was.
export function stage(site, repo) {
  const newRelease = JSON.parse(readFileSync(join(site, 'preview.json'), 'utf8')).release;
  const keep = new Set(['.git', 'previous', 'README.md']);
  let moved = null;
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
  return { release: newRelease, previousKept: moved ?? (existsSync(join(repo, 'previous')) ? readdirSync(join(repo, 'previous')) : []) };
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
    } else if (argv[0] === 'stage') {
      const r = stage(arg(argv, '--site'), arg(argv, '--repo'));
      console.log(`staged release ${r.release}; previous kept: ${JSON.stringify(r.previousKept)}`);
    } else throw new Error('usage: inject --site DIR --remake SHA --main SHA [--run-id ID] | stage --site DIR --repo DIR');
  } catch (e) { console.error(`preview-assemble failed: ${e.message}`); process.exitCode = 1; }
}
