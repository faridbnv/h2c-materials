// The site the browser suite serves: today's site as pages.yml assembles it (the selector at the root, the release-stamped
// copy, manifest.json, the validation report, materials/), plus the public view built into v3/ (remake/tools/preview-assemble.mjs
// build-v3). It is built from dist/ and apps/public, never from anything the suite writes, and a missing or half-built piece is
// an error: a suite that served a smaller site would pass on a smaller site.
//
// CI can hand over the site its build job already assembled (the `site` artifact, H2C_BROWSER_SITE=<dir>); it is checked as
// strictly as one assembled here.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageName } from '../../../build/src/release.js';
import { buildV3 } from '../../../remake/tools/preview-assemble.mjs';
import { repoRoot } from '../../../remake/tools/wp-lib.mjs';

export const SITE_DIR = join(repoRoot(), '.cache', 'browser-site');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const stampedPages = (site) => readdirSync(site).filter((f) => /^H2C_Material_Selector_.*\.html$/.test(f));

/** The names every piece of a whole site must have. A list of what is missing, empty when the site is whole. */
export function siteProblems(site) {
  const need = ['index.html', 'manifest.json', 'materials/M001.html', 'materials/M001-products.html', 'materials/index.html', 'materials/method.html',
    'v3/index.html', 'v3/material.html', 'v3/release.json'];
  const problems = need.filter((p) => !existsSync(join(site, p))).map((p) => `${p} is missing`);
  if (problems.length) return problems;
  const stamped = stampedPages(site);
  if (stamped.length !== 1) problems.push(`expected one release-stamped selector page, found ${stamped.length}`);
  else if (readFileSync(join(site, stamped[0])).compare(readFileSync(join(site, 'index.html'))) !== 0) problems.push('index.html is not a copy of the stamped selector page');
  const release = readJson(join(site, 'v3', 'release.json')).release;
  if (!existsSync(join(site, 'v3', 'data', String(release), 'result.json'))) problems.push(`v3/data/${release}/result.json is missing`);
  return problems;
}

/** What a test needs to know about the assembled site. */
export function describeSite(site) {
  const problems = siteProblems(site);
  if (problems.length) throw new Error(`the site at ${site} is not whole:\n  ${problems.join('\n  ')}`);
  const manifest = readJson(join(site, 'manifest.json'));
  const v3 = readJson(join(site, 'v3', 'release.json'));
  const [stamped] = stampedPages(site);
  return { site, release: manifest.release, snapshot: manifest.snapshot, stamped, v3Release: v3.release, v3Counts: v3.counts };
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
  mkdirSync(out, { recursive: true });
  // The same files, in the same places, as pages.yml's "Assemble the site" step.
  copyFileSync(join(dist, stamped), join(out, 'index.html'));
  copyFileSync(join(dist, stamped), join(out, stamped));
  if (existsSync(join(root, 'build/reports/validation-report.md'))) copyFileSync(join(root, 'build/reports/validation-report.md'), join(out, 'validation-report.md'));
  copyFileSync(join(dist, 'manifest.json'), join(out, 'manifest.json'));
  cpSync(join(dist, 'materials'), join(out, 'materials'), { recursive: true });
  writeFileSync(join(out, '.nojekyll'), '');
  buildV3(out, { root });
  return describeSite(out);
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
