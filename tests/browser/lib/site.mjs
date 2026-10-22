// The site the browser suite serves, laid out as the preview is (WP-30): the selector of the remake at the root (apps/public, built by
// remake/tools/preview-assemble.mjs build-view), the material pages beside it (materials/), 404.html, and today's site as pages.yml
// assembles it at legacy/ (the selector, the release-stamped copy, manifest.json, the validation report, its own materials/). It is built
// from dist/ and apps/public, never from anything the suite writes, and a missing or half-built piece is an error: a suite that served a
// smaller site would pass on a smaller site.
//
// CI can hand over the site its build job already assembled (the `site` artifact, H2C_BROWSER_SITE=<dir>); it is checked as
// strictly as one assembled here.
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pageName } from '../../../build/src/release.js';
import { LEGACY_DIR, buildView } from '../../../remake/tools/preview-assemble.mjs';
import { NOT_FOUND_HTML } from '../../../remake/tools/site-pages.mjs';
import { repoRoot } from '../../../remake/tools/wp-lib.mjs';

export const SITE_DIR = join(repoRoot(), '.cache', 'browser-site');
// The public view built from the OLD build's database, beside the real one (the root, the new build's). Same page, same code, other data: the checks
// that compare the page with the old page's views and with the old engine's answers (the interface views, the fuzz) run on it, because the new build's
// medians differ from the old one's by the registered reprint transition (2026-10-21), which is not the page's doing. The checks of the page's own
// delivery (parts, release, stale shell) run on the root. This folder is made for the suite and is never published.
export const SAME_DATABASE_DIR = 'olddb';
/** Today's site, where the preview keeps it. */
export const LEGACY = `${LEGACY_DIR}/`;

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const stampedPages = (site) => readdirSync(site).filter((f) => /^H2C_Material_Selector_.*\.html$/.test(f));

/** The names every piece of a whole site must have. A list of what is missing, empty when the site is whole. */
export function siteProblems(site) {
  const old = (p) => `${LEGACY}${p}`;
  const need = ['index.html', '404.html', 'material.html', 'release.json', 'materials/M001.html', 'materials/M001-products.html', 'materials/index.html', 'materials/method.html',
    old('index.html'), old('manifest.json'), old('materials/M001.html'), old('materials/M001-products.html'), old('materials/index.html'), old('materials/method.html'),
    `${SAME_DATABASE_DIR}/index.html`, `${SAME_DATABASE_DIR}/release.json`];
  const problems = need.filter((p) => !existsSync(join(site, p))).map((p) => `${p} is missing`);
  if (problems.length) return problems;
  const stamped = stampedPages(join(site, LEGACY));
  if (stamped.length !== 1) problems.push(`expected one release-stamped selector page at ${LEGACY}, found ${stamped.length}`);
  else {
    if (readFileSync(join(site, LEGACY, stamped[0])).compare(readFileSync(join(site, LEGACY, 'index.html'))) !== 0) problems.push(`${LEGACY}index.html is not a copy of the stamped selector page`);
    if (!existsSync(join(site, stamped[0]))) problems.push(`${stamped[0]} is missing at the root: an old link from this release has no stub to open`);
  }
  for (const dir of ['.', SAME_DATABASE_DIR]) {
    const release = readJson(join(site, dir, 'release.json')).release;
    for (const part of ['result.json', 'core.json', 'estimates.json', 'reference.json', 'shared.json']) {
      if (!existsSync(join(site, dir, 'data', String(release), part))) problems.push(`${dir}/data/${release}/${part} is missing`);
    }
  }
  return problems;
}

/** What a test needs to know about the assembled site. */
export function describeSite(site) {
  const problems = siteProblems(site);
  if (problems.length) throw new Error(`the site at ${site} is not whole:\n  ${problems.join('\n  ')}`);
  const manifest = readJson(join(site, LEGACY, 'manifest.json'));
  const v3 = readJson(join(site, 'release.json'));
  const sameDatabase = readJson(join(site, SAME_DATABASE_DIR, 'release.json'));
  const [stamped] = stampedPages(join(site, LEGACY));
  return { site, release: manifest.release, snapshot: manifest.snapshot, stamped, v3Release: v3.release, v3Counts: v3.counts, sameDatabaseRelease: sameDatabase.release };
}

/**
 * Assemble the site from the build in `root` (dist/ and apps/public) into `out`. The old build must be run first (npm run build):
 * a dist/ left over from another release is refused, as the old harness refuses it.
 */
export function assembleSite({ root = repoRoot(), out = SITE_DIR } = {}) {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'db.json'))) throw new Error('dist/db.json is missing: run npm run build first');
  const meta = readJson(join(dist, 'db.json')).meta;
  const stamped = pageName(meta);
  if (!existsSync(join(dist, stamped))) throw new Error(`no built page ${stamped} in dist/ for release ${meta.release?.id}: run npm run build`);
  if (!existsSync(join(dist, 'materials'))) throw new Error('dist/materials is missing: run npm run build (the material pages are part of it)');

  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, LEGACY_DIR), { recursive: true });
  // Today's site, as pages.yml's "Assemble the site" step makes it, at legacy/.
  const old = join(out, LEGACY_DIR);
  copyFileSync(join(dist, stamped), join(old, 'index.html'));
  copyFileSync(join(dist, stamped), join(old, stamped));
  if (existsSync(join(root, 'build/reports/validation-report.md'))) copyFileSync(join(root, 'build/reports/validation-report.md'), join(old, 'validation-report.md'));
  copyFileSync(join(dist, 'manifest.json'), join(old, 'manifest.json'));
  cpSync(join(dist, 'materials'), join(old, 'materials'), { recursive: true });
  // The material pages beside the new selector, where its drawer's Full page links find them.
  cpSync(join(dist, 'materials'), join(out, 'materials'), { recursive: true });
  writeFileSync(join(out, '.nojekyll'), '');
  // Pages serves this for any missing path, from any depth; the preview deploy adds the same page (preview-assemble inject).
  writeFileSync(join(out, '404.html'), NOT_FOUND_HTML);
  buildView(out, { root });
  buildSameDatabaseView(out, root);
  return describeSite(out);
}

/** The public view built from dist/db.json (the old build's database) into <site>/olddb/, by the same build that makes the root view. */
function buildSameDatabaseView(site, root) {
  const tmp = mkdtempSync(join(tmpdir(), 'h2c-v3-olddb-'));
  try {
    const run = spawnSync(process.execPath, [join(root, 'apps/public/tools/build.ts'), '--out', tmp, '--database', 'old'], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
    if (run.status !== 0) throw new Error(`the public view on the old database did not build (exit ${run.status})`);
    cpSync(tmp, join(site, SAME_DATABASE_DIR), { recursive: true });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** The site to serve: the one H2C_BROWSER_SITE names (checked), or a fresh assembly. */
export function prepareSite({ env = process.env } = {}) {
  const given = env['H2C_BROWSER_SITE'];
  if (given) {
    if (!existsSync(given)) throw new Error(`H2C_BROWSER_SITE=${given} does not exist`);
    const site = describeSite(given);
    // The checks read dist/db.json (the oracle, the fuzz); a site of another release would be compared with the wrong engine.
    const built = join(repoRoot(), 'dist', 'db.json');
    if (existsSync(built)) {
      const id = readJson(built).meta?.release?.id;
      if (id !== site.release) throw new Error(`H2C_BROWSER_SITE is release ${site.release} but dist/db.json is release ${id}: the oracle would judge another build`);
    }
    return site;
  }
  return assembleSite();
}
