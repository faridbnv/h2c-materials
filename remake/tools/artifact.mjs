#!/usr/bin/env node
// The site artifact of next-main.yml (WP-32): assembled once by the build job, identified by a digest, and deployed as that exact
// artifact (the deploy job fetches it by run ID and checks the digest before it publishes a byte). Node built-ins and the repository's
// own tools only.
//
//   assemble --site DIR --profile preview|live [--commit SHA]
//        needs the old build's dist/ (npm run build) and the repository's installs. Lays the site out as next-preview.yml does (today's
//        site at legacy/, the public view at the root with its material pages, a stub under each release-stamped selector name), then
//        for the live profile removes legacy/ (owner ruling R-M3-SITE-SCOPE: it is never published live), adds 404.html and .nojekyll, and
//        writes deploy.json (the live smoke's marker). Private material anywhere in the result is an error.
//   digest --site DIR --out FILE       the artifact's digest: sha256 over "<sha256>  <bytes>  <path>" lines, sorted by path
//   verify --site DIR --expect sha256:HEX      exits 1 unless the folder has exactly that digest
//   carry --site DIR --previous DIR     copies the previous release's data (without detail/) and chunks from an unpacked previous
//        release zip into the site, so a page cached before the deploy still loads (pack 02 section 6.2)
//   release-notes --site DIR --out FILE --commit SHA [--previous-commit SHA]   the release's decision diff
//   release-files --site DIR --out DIR     site-<id>.zip, release.json, artifact.json and the id on stdout
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';
import { LEGACY_DIR, buildView, carryView } from './preview-assemble.mjs';
import { NOT_FOUND_HTML, SELECTOR_NAME } from './site-pages.mjs';
import { assertClean, scanTree } from './private-scan.mjs';
import { packZip, walkFiles } from './legacy-site.mjs';
import { RELEASE_ID_PATTERN } from './release-id.mjs';

/**
 * The digest of a folder: what "the same artifact" means. deploy.json is left out: it names the commit that deploys (the merge commit at
 * the cutover, not the candidate) and the time of the build, so it is the one file that cannot equal the receipt's digest.
 */
export const DIGEST_IGNORES = new Set(['deploy.json']);
export function folderDigest(dir) {
  const lines = [...walkFiles(dir)].filter((path) => !DIGEST_IGNORES.has(path)).sort().map((path) => {
    const b = readFileSync(join(dir, path));
    return `${createHash('sha256').update(b).digest('hex')}  ${b.length}  ${path}`;
  });
  if (lines.length === 0) throw new Error(`${dir} holds no files`);
  return { digest: `sha256:${createHash('sha256').update(`${lines.join('\n')}\n`).digest('hex')}`, files: lines.length, bytes: lines.reduce((n, l) => n + Number(l.split('  ')[1]), 0) };
}

/** The old site as pages.yml's "Assemble the site" step makes it, into `site/legacy/`. */
function assembleLegacy(site, root) {
  const dist = join(root, 'dist');
  const stamped = existsSync(dist) ? readdirSync(dist).filter((n) => SELECTOR_NAME.test(n)) : [];
  if (stamped.length !== 1) throw new Error(`expected one release-stamped selector page in dist/, found ${stamped.length}: run npm run build`);
  if (!existsSync(join(dist, 'materials')) || !existsSync(join(dist, 'manifest.json'))) throw new Error('dist/materials or dist/manifest.json is missing: run npm run build');
  const legacy = join(site, LEGACY_DIR);
  mkdirSync(legacy, { recursive: true });
  copyFileSync(join(dist, stamped[0]), join(legacy, 'index.html'));
  copyFileSync(join(dist, stamped[0]), join(legacy, stamped[0]));
  copyFileSync(join(root, 'build/reports/validation-report.md'), join(legacy, 'validation-report.md'));
  copyFileSync(join(dist, 'manifest.json'), join(legacy, 'manifest.json'));
  cpSync(join(dist, 'materials'), join(legacy, 'materials'), { recursive: true });
  writeFileSync(join(site, '.nojekyll'), '');
  return stamped[0];
}

export function assemble(site, { profile, commit = null, root = repoRoot(), build } = {}) {
  if (!['preview', 'live'].includes(profile)) throw new Error(`profile "${profile}" is not preview or live`);
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  const stamped = assembleLegacy(site, root);
  const view = buildView(site, { root, ...(build ? { build } : {}) });
  if (profile === 'live') {
    if (!/^[0-9a-f]{40}$/.test(commit ?? '')) throw new Error('--commit must be the 40-character commit being built');
    rmSync(join(site, LEGACY_DIR), { recursive: true, force: true });
    if (!existsSync(join(site, '404.html'))) writeFileSync(join(site, '404.html'), NOT_FOUND_HTML);
    const materials = readdirSync(join(site, 'materials')).filter((f) => /^M\d+\.html$/.test(f)).sort();
    if (materials.length === 0) throw new Error('the site has no materials/M<id>.html page');
    const stub = readdirSync(site).find((f) => SELECTOR_NAME.test(f)) ?? null;
    if (stub === null) throw new Error(`the site has no stub under the stamped selector name ${stamped}: an old link from the last release would open nothing`);
    writeFileSync(join(site, 'deploy.json'), `${JSON.stringify({
      remakeCommit: commit, mainCommit: commit, builtAt: new Date().toISOString(), release: view.release, v3Release: view.release,
      sampleMaterial: `materials/${materials[0]}`, stampedSelector: stub, note: 'The live Filament Atlas site.',
    }, null, 2)}\n`);
  }
  assertClean(scanTree(site), `the ${profile} site`);
  return { ...view, profile, stamped };
}

/** The deploy marker with the previous release it carries (written after `carry`). */
export function noteCarried(site, previousRelease) {
  const p = join(site, 'deploy.json');
  if (!existsSync(p)) return;
  writeFileSync(p, `${JSON.stringify({ ...JSON.parse(readFileSync(p, 'utf8')), v3Previous: previousRelease }, null, 2)}\n`);
}

/** Copies the previous release's slim data and chunks (from an unpacked previous site zip) into the new site. Returns what it carried, or null. */
export function carryPrevious(site, previousDir) {
  if (!existsSync(join(previousDir, 'release.json'))) return null;
  const carried = carryView(previousDir);
  if (carried === null) return null;
  try {
    const now = JSON.parse(readFileSync(join(site, 'release.json'), 'utf8')).release;
    if (carried.release === now) return { release: now, same: true, files: 0, chunks: 0 };
    for (const sub of [join('data', carried.release), 'assets']) {
      const from = join(carried.dir, sub);
      if (existsSync(from)) cpSync(from, join(site, sub), { recursive: true, force: false });
    }
    noteCarried(site, carried.release);
    return { release: carried.release, same: false, files: carried.files, chunks: carried.chunks };
  } finally { rmSync(carried.dir, { recursive: true, force: true }); }
}

const git = (args) => spawnSync('git', args, { encoding: 'utf8', cwd: repoRoot() });

export function releaseNotes({ site, commit, previousCommit = null, transitions }) {
  const view = JSON.parse(readFileSync(join(site, 'release.json'), 'utf8'));
  const lines = [`# Decision diff of release ${view.release}`, '', `Built from commit ${commit}.`];
  if (previousCommit) {
    const stat = git(['diff', '--shortstat', previousCommit, commit, '--', 'data/tables', 'schema']);
    lines.push(`Previous release built from ${previousCommit}.`, `Data and schema since then: ${stat.status === 0 ? stat.stdout.trim() || 'no change' : 'could not be read (the previous commit is not in this checkout)'}.`);
  } else lines.push('There is no previous release built by this workflow, so there is no data comparison.');
  lines.push('', 'Registered transitions (deliberate changes to answers or display, each with its measured list in parity/transitions/):', '', ...transitions.map((t) => `- ${t}`));
  lines.push('', 'Answer-level comparison of this commit\'s engine with the previous release\'s engine on the same data is not automated in this workflow. Run `npm run parity` before the cutover; after it, parity against the last release is a later addition (docs/next/OPERATING.md, "What is not automated").');
  return `${lines.join('\n')}\n`;
}

const arg = (argv, name, required = true) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) { if (required) throw new Error(`missing ${name}`); return undefined; }
  return argv[i + 1];
};

function cli(argv) {
  const [cmd] = argv;
  const site = arg(argv, '--site');
  if (cmd === 'assemble') {
    const r = assemble(site, { profile: arg(argv, '--profile'), commit: arg(argv, '--commit', false) });
    console.log(`assembled the ${r.profile} site: public view release ${r.release}, ${r.files} view files`);
  } else if (cmd === 'digest') {
    const d = folderDigest(site);
    writeFileSync(arg(argv, '--out'), `${JSON.stringify({ schema: 1, ...d }, null, 2)}\n`);
    console.log(`${d.digest} (${d.files} files, ${d.bytes} bytes)`);
  } else if (cmd === 'verify') {
    const expect = arg(argv, '--expect');
    const d = folderDigest(site);
    if (d.digest !== expect) { console.error(`artifact digest mismatch: the folder is ${d.digest}, expected ${expect}`); return 1; }
    console.log(`artifact digest ${d.digest} matches (${d.files} files)`);
  } else if (cmd === 'carry') {
    const r = carryPrevious(site, arg(argv, '--previous'));
    console.log(r === null ? 'no previous site to carry (the last release has no site zip)' : r.same ? `the previous release is this release (${r.release}); nothing carried` : `carried release ${r.release}: ${r.files} data files, ${r.chunks} chunks`);
  } else if (cmd === 'release-notes') {
    const transitions = existsSync(join(repoRoot(), 'parity/transitions')) ? readdirSync(join(repoRoot(), 'parity/transitions')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort() : [];
    writeFileSync(arg(argv, '--out'), releaseNotes({ site, commit: arg(argv, '--commit'), previousCommit: arg(argv, '--previous-commit', false) ?? null, transitions }));
  } else if (cmd === 'release-files') {
    const out = arg(argv, '--out');
    const id = JSON.parse(readFileSync(join(site, 'release.json'), 'utf8')).release;
    if (!RELEASE_ID_PATTERN.test(id)) throw new Error(`release.json names no valid release: "${id}"`);
    mkdirSync(out, { recursive: true });
    packZip(site, join(out, `site-${id}.zip`));
    copyFileSync(join(site, 'release.json'), join(out, 'release.json'));
    writeFileSync(join(out, 'artifact.json'), `${JSON.stringify({ schema: 1, release: id, ...folderDigest(site) }, null, 2)}\n`);
    console.log(id);
  } else throw new Error('usage: assemble | digest | verify | carry | release-notes | release-files');
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = cli(process.argv.slice(2)); } catch (e) { console.error(`artifact failed: ${e.message}`); process.exitCode = 1; }
}
