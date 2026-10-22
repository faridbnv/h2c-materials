#!/usr/bin/env node
// The size report of a built public view (WP-25; pack 02 sections 9.6 and 11): what a reader downloads, measured on the files a
// deploy publishes, against the budgets. A budget is never relaxed here: a number over its line is a failure and is reported as one;
// relaxing a budget is the owner's decision (pack 08, WP-25). Node built-ins only.
//
//   node remake/tools/size-report.mjs [--view DIR] [--site DIR] [--out FILE]
//     --view  the built public view (index.html, assets/, data/<release>/); default: the site's v3/ folder
//     --site  the whole assembled site (the view's folder is inside it); default: .cache/browser-site, else the view itself
//     --out   where the JSON goes; default remake/measure/sizes.json
//   exit 0 every budget met, 1 a budget missed, 2 the report could not be made
//
// Strict boot is what the first screen of the strict mode downloads: the page, the scripts and styles it names (and what those
// import), and the core part. Charts are not in it (there are none yet; their library is measured when the lens lands).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { isMain, repoRoot } from './wp-lib.mjs';

/** The budgets of pack 02 section 11, in bytes (a kilobyte is 1,000 bytes: the stricter reading). */
export const BUDGETS = Object.freeze({
  strictBootGzip: 900_000,
  detailMedianGzip: 15_000,
  // Owner decision 2026-10-22: one material's detail part may reach 350 KB (PLA, the most products, was 325 KB); it loads only
  // when that material's detail opens. The pack's line was 300 KB.
  detailMaxGzip: 350_000,
  // The new site: the public view plus the slim copy of the previous release a deploy keeps (owner decision 2026-10-22). The old
  // site the preview carries for comparison is reported but not counted: it is never published live.
  siteBytes: 100_000_000,
});

/** gzip level 6, the level the browser suite's server uses. */
const gz = (bytes) => gzipSync(bytes, { level: 6 }).length;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p); else yield p;
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/** The files a module graph pulls in from its entry: static imports and the modulepreload links the HTML names. */
function bootAssets(view, html) {
  const found = new Set();
  const visit = (rel) => {
    const abs = resolve(view, rel);
    if (found.has(abs) || !existsSync(abs)) return;
    found.add(abs);
    if (!abs.endsWith('.js')) return;
    const text = readFileSync(abs, 'utf8');
    // `import"./x.js"`, `from"./x.js"`, `import("./x.js")` is dynamic and not boot: only the static forms are followed.
    for (const m of text.matchAll(/(?:\bimport|\bfrom)\s*["'](\.[^"']+\.(?:js|css))["']/g)) visit(relative(view, resolve(dirname(abs), m[1])));
  };
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["'][^>]*>/g)) {
    if (/^(?:[a-z]+:)?\/\//i.test(m[1]) || m[1].startsWith('data:')) continue;
    const tag = m[0];
    if (/rel=["']?(?:icon|canonical)/.test(tag)) continue;
    visit(m[1].split('#')[0].split('?')[0]);
  }
  return [...found];
}

/** Measure a built view. `site` is the folder that holds it (for the total). */
export function measure({ view, site = view }) {
  const manifestPath = join(view, 'release.json');
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} is missing: build the view first (npm run build:next)`);
  const { release } = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const data = join(view, 'data', release);
  const page = join(view, 'index.html');
  if (!existsSync(page) || !existsSync(join(data, 'core.json'))) throw new Error(`${view} has no index.html and data/${release}/core.json`);

  const html = readFileSync(page, 'utf8');
  const entry = (abs) => ({ path: relative(view, abs), bytes: statSync(abs).size, gzip: gz(readFileSync(abs)) });
  const assets = bootAssets(view, html).map(entry);
  const shell = entry(page);
  const core = entry(join(data, 'core.json'));
  const estimates = entry(join(data, 'estimates.json'));
  const strictFiles = [shell, ...assets, core];
  const strictBoot = strictFiles.reduce((n, f) => n + f.gzip, 0);
  const codeGzip = [shell, ...assets].reduce((n, f) => n + f.gzip, 0);

  const detailDir = join(data, 'detail');
  const detail = [...walk(detailDir)].map((p) => ({ path: relative(view, p), gzip: gz(readFileSync(p)) }));
  const gzips = detail.map((d) => d.gzip);
  const largest = detail.reduce((a, b) => (b.gzip > a.gzip ? b : a), { path: '', gzip: 0 });

  const bytesOf = (dir) => [...walk(dir)].reduce((n, p) => n + statSync(p).size, 0);
  const siteBytes = bytesOf(site);
  const viewBytes = bytesOf(view);
  const assetsBytes = existsSync(join(view, 'assets')) ? bytesOf(join(view, 'assets')) : 0;
  const dataBytes = bytesOf(data);
  const slimDataBytes = dataBytes - (existsSync(detailDir) ? bytesOf(detailDir) : 0);
  // A deploy keeps the previous release's data without its detail/ folder, and its chunks, beside the new ones (the stale-shell
  // guard), so the next one carries about this much more than the view alone.
  const newSiteBytes = viewBytes + slimDataBytes + assetsBytes;

  const check = (value, budget) => ({ value, budget, ok: value <= budget });
  const checks = {
    strictBootGzip: check(strictBoot, BUDGETS.strictBootGzip),
    detailMedianGzip: check(median(gzips), BUDGETS.detailMedianGzip),
    detailMaxGzip: check(largest.gzip, BUDGETS.detailMaxGzip),
    siteBytes: check(newSiteBytes, BUDGETS.siteBytes),
  };
  return {
    schema: 1,
    release,
    measuredAt: new Date().toISOString(),
    node: process.versions.node,
    gzipLevel: 6,
    note: 'Budgets are pack 02 section 11, with a kilobyte of 1,000 bytes. A failed check is a failed budget; relaxing one is the owner\'s decision.',
    strictBoot: { gzipBytes: strictBoot, codeGzipBytes: codeGzip, coreGzipBytes: core.gzip, files: strictFiles },
    defaultBoot: { note: 'Explore with estimates on: strict boot plus the estimates part. Its budget is set from this measurement, with the owner.', gzipBytes: strictBoot + estimates.gzip, estimatesGzipBytes: estimates.gzip },
    detail: { count: detail.length, medianGzipBytes: median(gzips), maxGzipBytes: largest.gzip, largest: largest.path },
    site: { scope: 'the new site: the public view plus the slim copy of the previous release a deploy keeps', bytes: newSiteBytes, viewBytes, dataBytes, slimDataBytes, assetsBytes,
      assembledBytes: siteBytes, assembledScope: site === view ? 'the public view alone' : 'the whole assembled preview (the old site for comparison, the 404 page and the public view); not counted' },
    checks,
    ok: Object.values(checks).every((c) => c.ok),
  };
}

if (isMain(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
    const root = repoRoot();
    const siteArg = arg('--site') ?? (existsSync(join(root, '.cache', 'browser-site')) ? join(root, '.cache', 'browser-site') : undefined);
    const view = resolve(arg('--view') ?? (siteArg ? join(siteArg, 'v3') : join(root, 'apps', 'public', 'dist')));
    const report = measure({ view, site: siteArg ? resolve(siteArg) : view });
    const out = resolve(arg('--out') ?? join(root, 'remake', 'measure', 'sizes.json'));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    const kb = (n) => `${(n / 1000).toFixed(1)} KB`;
    console.log(`release ${report.release}`);
    for (const [name, c] of Object.entries(report.checks)) console.log(`  ${c.ok ? 'ok  ' : 'OVER'} ${name}: ${kb(c.value)} against ${kb(c.budget)}`);
    console.log(`  default boot (estimates on) ${kb(report.defaultBoot.gzipBytes)}; code ${kb(report.strictBoot.codeGzipBytes)}, core ${kb(report.strictBoot.coreGzipBytes)}`);
    console.log(`  written to ${relative(root, out)}`);
    process.exitCode = report.ok ? 0 : 1;
  } catch (e) {
    console.error(`size-report failed: ${e.message}`);
    process.exitCode = 2;
  }
}
