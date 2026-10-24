#!/usr/bin/env node
// The saved old site (WP-35; pack 07 section 13.1): its manifest, the comparison with the live site, and the zip. Node built-ins only
// (the zip is made with the `zip` program, listed and unpacked with `unzip`; both are on the runners and on the owner's Mac).
//
//   manifest --site DIR --main-commit SHA --out FILE
//        legacy-manifest.json: every file of the site as served, with bytes and sha256, and the main commit it was built from
//   crawl --manifest FILE (--base URL | --from-dir DIR) --baseline FILE --out DIR --report FILE [--manifest-out FILE]
//        fetches every path of the rebuilt manifest, and the names the baseline receipt knows, from the live site into DIR; compares
//        digests; writes the report and says, for each difference, what explains it (or that nothing does). Exit 0: no difference;
//        3: every difference is explained; 4: one is not.
//   pack --site DIR --zip FILE
//        a zip whose file order and attributes do not depend on the machine
//
// The rule (pack 07 section 13.1): if the rebuilt site and the live bytes differ, the live bytes are what is stored. The crawl
// directory is then the site to pack, and the manifest is made from it.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { isMain } from './wp-lib.mjs';

export const LIVE_BASE = 'https://pdynamics.ca/h2c-materials/';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function* walkFiles(dir, base = dir) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walkFiles(p, base); else yield relative(base, p).split('\\').join('/');
  }
}

/** The manifest of a site folder. Paths are sorted, so the same bytes give the same manifest. */
export function buildManifest(dir, { mainCommit, oldReleaseId = null } = {}) {
  if (!/^[0-9a-f]{40}$/.test(mainCommit ?? '')) throw new Error(`the main commit must be 40 hex characters, got "${mainCommit}"`);
  const files = [...walkFiles(dir)].map((path) => { const b = readFileSync(join(dir, path)); return { path, bytes: b.length, sha256: sha256(b) }; });
  if (files.length === 0) throw new Error(`${dir} holds no files`);
  const stamped = files.map((f) => /^H2C_Material_Selector_\d{4}-\d{2}-\d{2}_([0-9a-f]{12})\.html$/.exec(f.path)?.[1]).filter(Boolean);
  const release = oldReleaseId ?? stamped[0] ?? null;
  if (!/^[0-9a-f]{12}$/.test(release ?? '')) throw new Error('the site holds no release-stamped selector page, so its old release id cannot be told; pass oldReleaseId');
  return { schema: 1, kind: 'legacy-site', mainCommit, oldReleaseId: release, fileCount: files.length, files };
}

/** Throws unless `manifest` is a well-formed legacy manifest (what restore.mjs reads back). */
export function assertManifest(m) {
  if (!m || m.schema !== 1 || m.kind !== 'legacy-site' || !Array.isArray(m.files) || m.files.length === 0) throw new Error('not a legacy-site manifest');
  if (!/^[0-9a-f]{12}$/.test(m.oldReleaseId ?? '') || !/^[0-9a-f]{40}$/.test(m.mainCommit ?? '')) throw new Error('the manifest names no old release id or main commit');
  const seen = new Set();
  for (const f of m.files) {
    if (typeof f.path !== 'string' || f.path === '' || f.path.startsWith('/') || f.path.split('/').includes('..')) throw new Error(`unsafe path in the manifest: "${f.path}"`);
    if (seen.has(f.path)) throw new Error(`duplicate path in the manifest: ${f.path}`);
    seen.add(f.path);
    if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? '') || !Number.isInteger(f.bytes)) throw new Error(`bad entry for ${f.path}`);
  }
  return m;
}

/** Every file of `dir` against the manifest: the paths that differ, are missing, or are extra. Empty lists mean the folder is the manifest's site. */
export function verifyFolder(dir, manifest) {
  assertManifest(manifest);
  const want = new Map(manifest.files.map((f) => [f.path, f]));
  const have = new Set(walkFiles(dir));
  const missing = [...want.keys()].filter((p) => !have.has(p));
  const extra = [...have].filter((p) => !want.has(p));
  const different = [...want.keys()].filter((p) => have.has(p) && sha256(readFileSync(join(dir, p))) !== want.get(p).sha256);
  return { missing, extra, different, ok: missing.length + extra.length + different.length === 0 };
}

/** The names a live site is expected to serve that the rebuilt manifest does not list. The baseline receipt's recorded outputs name the selector page. */
export function knownNames(baseline) {
  const fields = baseline?.liveRelease?.manifest?.fields ?? {};
  return Object.keys(fields.outputs ?? {}).filter((k) => /^[\w.-]+\.(html|json|md)$/.test(k));
}

/** Paths that are never served: Pages reads them and does not publish them. */
export const NOT_SERVED = new Set(['.nojekyll']);

/**
 * The comparison of the rebuilt manifest with what the live site served. `live` maps a path to its sha256 or null (served 404).
 * `recorded` maps a file name to the digest the baseline receipt recorded for the published release asset.
 */
export function compareWithLive(rebuilt, live, recorded = {}) {
  const rows = [];
  const rebuiltBy = new Map(rebuilt.files.map((f) => [f.path, f]));
  for (const f of rebuilt.files) {
    const served = live.get(f.path);
    if (NOT_SERVED.has(f.path)) { rows.push({ path: f.path, kind: 'not-served', explained: true, why: 'GitHub Pages reads this file and does not serve it' }); continue; }
    if (served === undefined || served === null) { rows.push({ path: f.path, kind: 'missing-live', explained: false, why: 'the rebuilt site has this file and the live site does not serve it' }); continue; }
    if (served === f.sha256) { rows.push({ path: f.path, kind: 'identical', explained: true, why: '' }); continue; }
    const rec = recorded[f.path];
    if (rec && rec === served) rows.push({ path: f.path, kind: 'differs', explained: true, why: `the live bytes equal the digest the baseline receipt recorded for the published release asset (${served.slice(0, 12)}); the rebuild on this machine differs (gap-1: the build is not byte-identical across machines). The live bytes are stored.` });
    else rows.push({ path: f.path, kind: 'differs', explained: false, why: `live ${served.slice(0, 12)} against rebuilt ${f.sha256.slice(0, 12)}, and no recorded digest of the published asset explains it` });
  }
  for (const [path, digest] of live) {
    if (digest && !rebuiltBy.has(path)) rows.push({ path, kind: 'extra-live', explained: false, why: 'the live site serves this file and the rebuilt site does not have it' });
  }
  const differing = rows.filter((r) => r.kind !== 'identical' && r.kind !== 'not-served');
  return { rows, differing, identical: rows.filter((r) => r.kind === 'identical').length, exitCode: differing.length === 0 ? 0 : differing.every((r) => r.explained) ? 3 : 4 };
}

/** The report the owner reads: one line per difference, with its explanation or the word UNEXPLAINED. */
export function formatReport(cmp, { base, mainCommit }) {
  const lines = [
    '# The saved old site against the live site', '',
    `Live site: ${base}`, `Rebuilt from main commit ${mainCommit}.`,
    `${cmp.identical} file(s) are byte-identical; ${cmp.differing.length} difference(s).`, '',
  ];
  if (cmp.differing.length === 0) lines.push('No differences: the rebuilt site is what the live site serves.');
  else {
    lines.push('| Path | Difference | Explanation |', '|---|---|---|');
    for (const r of cmp.differing) lines.push(`| ${r.path} | ${r.kind} | ${r.explained ? r.why : `UNEXPLAINED: ${r.why}`} |`);
    lines.push('', cmp.exitCode === 3
      ? 'Every difference is explained. Where a file differs, the live bytes are what is stored (pack 07 section 13.1).'
      : 'At least one difference is UNEXPLAINED. Do not upload this zip until the owner has read the line and decided.');
  }
  return `${lines.join('\n')}\n`;
}

/** Fetches `paths` from a base URL or a folder. Returns Map(path -> Buffer|null); null is "not served". A network failure throws (never read as a 404). */
export async function fetchPaths(paths, { base, fromDir, fetchFn = fetch }) {
  const out = new Map();
  await Promise.all(paths.map(async (path) => {
    if (fromDir) {
      try { out.set(path, readFileSync(join(fromDir, path))); } catch (e) { if (e.code !== 'ENOENT' && e.code !== 'EISDIR') throw e; out.set(path, null); }
      return;
    }
    const res = await fetchFn(new URL(path.split('/').map(encodeURIComponent).join('/'), base).href, { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'h2c-save-legacy' } });
    if (res.status === 404) { out.set(path, null); return; }
    if (res.status !== 200) throw new Error(`${path}: HTTP ${res.status}`);
    out.set(path, Buffer.from(await res.arrayBuffer()));
  }));
  return out;
}

/** Crawl, compare, write. Returns the comparison; the live bytes are in `outDir`. */
export async function crawl({ manifest, baseline, base, fromDir, outDir, fetchFn }) {
  assertManifest(manifest);
  const paths = [...new Set([...manifest.files.map((f) => f.path).filter((p) => !NOT_SERVED.has(p)), ...knownNames(baseline)])].sort();
  const got = await fetchPaths(paths, { base, fromDir, fetchFn });
  const live = new Map();
  for (const [path, bytes] of got) {
    live.set(path, bytes ? sha256(bytes) : null);
    if (bytes) { mkdirSync(dirname(join(outDir, path)), { recursive: true }); writeFileSync(join(outDir, path), bytes); }
  }
  const recorded = Object.fromEntries((baseline?.liveRelease?.githubAssets ?? []).map((a) => [a.name, String(a.digest ?? '').replace(/^sha256:/, '')]));
  return compareWithLive(manifest, live, recorded);
}

/** A zip whose entries are sorted and carry no machine attributes (`zip -X`), so the same site gives the same bytes. */
export function packZip(dir, zipPath) {
  const files = [...walkFiles(dir)].sort();
  const r = spawnSync('zip', ['-q', '-X', '-9', '-@', resolve(zipPath)], { cwd: dir, input: `${files.join('\n')}\n`, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`zip failed: ${r.stderr || r.error?.message}`);
  return files.length;
}

/** Lists a zip's entry names and refuses unsafe ones. */
export function zipNames(zipPath) {
  const r = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`unzip -Z1 failed: ${r.stderr || r.error?.message}`);
  const names = r.stdout.split('\n').filter(Boolean);
  for (const n of names) if (n.startsWith('/') || n.split('/').includes('..') || n.includes('\\')) throw new Error(`the zip holds an unsafe path: "${n}"`);
  return names.filter((n) => !n.endsWith('/'));
}

export function unpackZip(zipPath, dir) {
  zipNames(zipPath);
  mkdirSync(dir, { recursive: true });
  const r = spawnSync('unzip', ['-q', '-o', zipPath, '-d', dir], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`unzip failed: ${r.stderr || r.error?.message}`);
}

const arg = (argv, name, required = true) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) { if (required) throw new Error(`missing ${name}`); return undefined; }
  return argv[i + 1];
};

async function cli(argv) {
  const [cmd] = argv;
  if (cmd === 'manifest') {
    const m = buildManifest(arg(argv, '--site'), { mainCommit: arg(argv, '--main-commit') });
    writeFileSync(arg(argv, '--out'), `${JSON.stringify(m, null, 2)}\n`);
    console.log(`manifest: ${m.fileCount} files, old release ${m.oldReleaseId}`);
    return 0;
  }
  if (cmd === 'crawl') {
    const manifest = JSON.parse(readFileSync(arg(argv, '--manifest'), 'utf8'));
    const baselineFile = arg(argv, '--baseline', false);
    const baseline = baselineFile ? JSON.parse(readFileSync(baselineFile, 'utf8')) : null;
    const fromDir = arg(argv, '--from-dir', false);
    const base = arg(argv, '--base', false) ?? LIVE_BASE;
    const outDir = arg(argv, '--out');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const cmp = await crawl({ manifest, baseline, base, fromDir, outDir });
    writeFileSync(arg(argv, '--report'), formatReport(cmp, { base: fromDir ? `folder ${fromDir}` : base, mainCommit: manifest.mainCommit }));
    console.log(`crawl: ${cmp.identical} identical, ${cmp.differing.length} different (${cmp.differing.filter((r) => !r.explained).length} unexplained)`);
    return cmp.exitCode;
  }
  if (cmd === 'pack') {
    const n = packZip(arg(argv, '--site'), arg(argv, '--zip'));
    console.log(`packed ${n} files`);
    return 0;
  }
  throw new Error('usage: manifest | crawl | pack');
}

if (isMain(import.meta.url)) {
  try { process.exitCode = await cli(process.argv.slice(2)); } catch (e) { console.error(`legacy-site failed: ${e.message}`); process.exitCode = 1; }
}
