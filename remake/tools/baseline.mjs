#!/usr/bin/env node
// Baseline receipt (WP-02, GPT FA-00/FA-01). READ ONLY: git queries, gh release list/view, one GET of the live
// manifest, local file counts. Writes remake/baseline/<main sha, 8 chars>.json and changes nothing else.
// Usage: node remake/tools/baseline.mjs [--print]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// Runs fn; on failure returns { unavailable: <reason> } instead of throwing.
const attempt = (fn) => { try { return fn(); } catch (e) { return { unavailable: String(e.stderr || e.message).trim().slice(0, 200) }; } };
const countFiles = (dir, re) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => re.test(f)).length : 0);

const LIVE_MANIFEST = 'https://pdynamics.ca/h2c-materials/manifest.json';
const MANIFEST_FIELDS = ['release', 'releaseDigest', 'releaseInputs', 'snapshot', 'build', 'commit', 'sourceTreeClean', 'runtime', 'dependencies', 'inputs', 'outputs', 'pages'];

const sha = (ref) => attempt(() => run('git', ['rev-parse', ref]));
const mainSha = sha('origin/main');

const liveRelease = await (async () => {
  const list = attempt(() => run('gh', ['release', 'list', '--limit', '30', '--json', 'tagName,name,isLatest,publishedAt']));
  const releases = typeof list === 'string' ? JSON.parse(list) : null;
  const latest = releases && (releases.find((r) => r.isLatest && /^h2c-/.test(r.tagName)) ?? releases.find((r) => /^h2c-/.test(r.tagName)));
  const assets = latest && attempt(() => JSON.parse(run('gh', ['release', 'view', latest.tagName, '--json', 'assets'])).assets.map(({ name, size, digest }) => ({ name, size, digest })));
  let manifest;
  try {
    const res = await fetch(LIVE_MANIFEST, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const full = await res.json();
    manifest = { url: LIVE_MANIFEST, fields: Object.fromEntries(MANIFEST_FIELDS.filter((k) => k in full).map((k) => [k, full[k]])) };
  } catch (e) { manifest = { url: LIVE_MANIFEST, unavailable: e.message }; }
  const ghId = latest?.tagName.replace(/^h2c-/, '') ?? null;
  return {
    releaseId: manifest.fields?.release ?? ghId,
    githubLatestTag: latest?.tagName ?? null, githubLatestName: latest?.name ?? null, githubLatestPublishedAt: latest?.publishedAt ?? null,
    githubAssets: assets ?? null, manifest,
    githubAndSiteAgree: ghId !== null && manifest.fields?.release === ghId,
    releasesListed: releases?.length ?? null,
  };
})();

const nvmrc = existsSync(join(root, '.nvmrc')) ? readFileSync(join(root, '.nvmrc'), 'utf8').trim() : null;
const ciFiles = existsSync(join(root, '.github/workflows')) ? readdirSync(join(root, '.github/workflows')) : [];
const ciNode = [...new Set(ciFiles.flatMap((f) => [...readFileSync(join(root, '.github/workflows', f), 'utf8').matchAll(/node-version(-file)?:\s*(\S+)/g)].map((m) => `${f}: ${m[1] ? 'file ' : ''}${m[2]}`)))];

const store = process.env.H2C_SOURCE_BACKUP;
const baseline = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  git: { originMain: mainSha, originRemakeV3: sha('origin/remake/v3'), head: sha('HEAD'), headBranch: attempt(() => run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])), originUrl: attempt(() => run('git', ['remote', 'get-url', 'origin'])) },
  liveRelease,
  node: { local: process.version, nvmrc, nvmrcMatchesLocal: nvmrc !== null && process.version.startsWith(`v${nvmrc}`), ciSetup: ciNode, liveBuiltWith: liveRelease.manifest.fields?.runtime?.node ?? null },
  testFiles: {
    'test/*.test.js (npm test, non-ingest)': countFiles('test', /\.test\.js$/) - countFiles('test', /^ingest-.*\.test\.js$/),
    'test/ingest-*.test.js (npm run test:ingest)': countFiles('test', /^ingest-.*\.test\.js$/),
    'test/*.check.js': countFiles('test', /\.check\.js$/),
    'tests/claude/*.test.mjs': countFiles('tests/claude', /\.test\.mjs$/),
    'tests/remake/*.test.mjs': countFiles('tests/remake', /\.test\.mjs$/),
  },
  privateStore: {
    envVar: 'H2C_SOURCE_BACKUP', envSet: Boolean(store), available: Boolean(store) && existsSync(store),
    topLevelEntries: store && existsSync(store) ? readdirSync(store).length : null,
    note: 'path deliberately not recorded; CI has no store and must print "not run: store absent"',
  },
  knownFailingChecks: [
    { check: 'npm run verify (full)', state: 'load-sensitive', detail: '7:06 alone on a cold M4 and passed; failed at 13:58 under load', source: 'pack research/understand/probe.md section 8; 08 section 3 hazards' },
    { check: 'npm run audit:context (inside verify)', state: 'skipped-counts-as-pass', detail: 'with no .cache/text it checks nothing and still exits "passed"; wp:check treats any skip as not-run', source: 'probe.md section 8' },
    { check: 'npm run verify:fast --enforce-budget (cold)', state: 'over-budget', detail: 'about 7 s over its own 90 s budget on a cold cache; passes without --enforce-budget', source: 'probe.md section 7' },
    { check: 'npm test: 2 sqlite tests', state: 'skipped-without-private-cache', detail: 'need .cache/proposals and .cache/text', source: 'probe.md section 6' },
  ],
  frozen: { main: 'frozen completely (Q2-04 B): no sync, WP-04 dropped', pointerPrToMain: 'none (Q2-09 B)', framework: 'Vue 3 with Vite, no trial (Q2-06 C), WP-12 dropped' },
};

const out = join(root, 'remake', 'baseline', `${typeof mainSha === 'string' ? mainSha.slice(0, 8) : 'unknown'}.json`);
if (process.argv.includes('--print')) console.log(JSON.stringify(baseline, null, 2));
else { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(baseline, null, 2) + '\n'); console.log(`wrote ${out}`); }
