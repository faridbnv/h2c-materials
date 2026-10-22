#!/usr/bin/env node
// Restore of the saved old site (WP-32, WP-35; pack 07 section 13). The control file remake/control/restore.json names the zip
// (release h2c-legacy-final, asset legacy-site-<id>.zip) and its sha256; the workflow downloads the zip and the manifest and calls this.
//
//   prepare --zip F --manifest F --out DIR [--control F] [--preview --remake SHA --main SHA [--run-id ID]]
//        verifies the zip against the control file's digest and the extracted tree against the manifest (every file, none extra), and
//        leaves the site in DIR. With --preview it marks every html page (noindex, storage shim, a banner), adds 404.html and writes
//        preview.json (restoredFrom = the zip's digest) so that preview-assemble.mjs `stage` can publish it to the preview repository.
//   check --zip F --manifest F [--control F]
//        the dry-restore check (pack 07 section 12.2 step 9): the same verification, then the legacy smoke profile against a local copy,
//        without deploying anything.
//
// Nothing here deploys. The workflow's deploy steps do, and only when cutover.mjs `plan` said so.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';
import { CONTROL_PATH, readControl, validateControl } from './cutover.mjs';
import { assertManifest, unpackZip, verifyFolder, walkFiles } from './legacy-site.mjs';
import { BANNER_ATTR, RESTORE_BANNER, markPage, unmarkPage } from './restore-marks.mjs';
import { NOT_FOUND_HTML } from './site-pages.mjs';
import { assertClean, scanTree } from './private-scan.mjs';

export { BANNER_ATTR, RESTORE_BANNER, markPage, unmarkPage };

const sha256File = (p) => `sha256:${createHash('sha256').update(readFileSync(p)).digest('hex')}`;

/** Verifies the zip against the control file and the manifest, unpacks to `out`, verifies the tree. Returns the manifest and the request. */
export function verifyAndUnpack({ zip, manifestFile, controlRoot = repoRoot(), controlFile = null, out }) {
  const request = controlFile ? validateControl(JSON.parse(readFileSync(controlFile, 'utf8'))) : readControl(controlRoot);
  if (request === null) throw new Error(`${CONTROL_PATH} holds no restore request`);
  if (basename(zip) !== request.asset) throw new Error(`the zip is ${basename(zip)}, the request names ${request.asset}`);
  const digest = sha256File(zip);
  if (digest !== request.digest) throw new Error(`the zip's digest is ${digest}, the request names ${request.digest}`);
  const manifest = assertManifest(JSON.parse(readFileSync(manifestFile, 'utf8')));
  if (request.asset !== `legacy-site-${manifest.oldReleaseId}.zip`) throw new Error(`the manifest is of old release ${manifest.oldReleaseId}, not of ${request.asset}`);
  unpackZip(zip, out);
  const v = verifyFolder(out, manifest);
  if (!v.ok) throw new Error(`the unpacked site is not the manifest's: ${v.missing.length} missing, ${v.extra.length} extra, ${v.different.length} different (first: ${[...v.missing, ...v.extra, ...v.different][0]})`);
  return { manifest, request, digest };
}

/** Marks the unpacked site for the preview and writes its preview.json. */
export function preparePreview(site, { manifest, request, digest, remake, main, runId = null, now = new Date() }) {
  for (const [k, v] of [['--remake', remake], ['--main', main]]) if (!/^[0-9a-f]{40}$/.test(v ?? '')) throw new Error(`${k} must be a 40-character commit SHA, got "${v}"`);
  for (const bad of ['.git', '.github', 'previous']) if (existsSync(join(site, bad))) throw new Error(`the saved site has a top-level ${bad}; refusing to publish it`);
  const pages = [...walkFiles(site)].filter((p) => /\.html?$/i.test(p));
  for (const p of pages) writeFileSync(join(site, p), markPage(readFileSync(join(site, p), 'utf8'), p));
  if (!existsSync(join(site, '404.html'))) writeFileSync(join(site, '404.html'), NOT_FOUND_HTML);
  writeFileSync(join(site, '.nojekyll'), '');
  const materials = manifest.files.map((f) => f.path).filter((p) => /^materials\/M\d+\.html$/.test(p)).sort();
  const info = {
    remakeCommit: remake, mainCommit: main, builtAt: now.toISOString(), release: manifest.oldReleaseId, snapshot: null, restoredFrom: digest, restoreId: request.id,
    sampleMaterial: materials[0] ?? null, stampedSelector: manifest.files.map((f) => f.path).find((p) => /^H2C_Material_Selector_/.test(p)) ?? null,
    htmlFiles: pages.length, runId, note: 'Rehearsal: the saved old site restored on the preview. Not the live tool.',
  };
  writeFileSync(join(site, 'preview.json'), `${JSON.stringify(info, null, 2)}\n`);
  assertClean(scanTree(site), 'the restored preview site');
  return info;
}

/** A static server over a folder, for the dry-restore check. Returns { url, close }. */
function serve(dir) {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = join(dir, p);
    if (p.split('/').includes('..') || !existsSync(file) || !file.startsWith(dir)) { res.writeHead(404); res.end('not found'); return; }
    try { res.writeHead(200); res.end(readFileSync(file)); } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => { server.closeAllConnections(); return new Promise((r) => server.close(r)); } })));
}

const arg = (argv, name, required = true) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) { if (required) throw new Error(`missing ${name}`); return undefined; }
  return argv[i + 1];
};

async function cli(argv) {
  const [cmd] = argv;
  const controlFile = arg(argv, '--control', false) ?? null;
  if (cmd === 'prepare') {
    const out = arg(argv, '--out');
    rmSync(out, { recursive: true, force: true });
    const v = verifyAndUnpack({ zip: arg(argv, '--zip'), manifestFile: arg(argv, '--manifest'), controlFile, out });
    console.log(`verified: ${v.manifest.files.length} files, old release ${v.manifest.oldReleaseId}, zip ${v.digest.slice(0, 19)}`);
    if (argv.includes('--preview')) {
      const info = preparePreview(out, { ...v, remake: arg(argv, '--remake'), main: arg(argv, '--main'), runId: arg(argv, '--run-id', false) ?? null });
      console.log(`prepared for the preview: ${info.htmlFiles} html files marked; restore ${info.restoreId}`);
    }
    return 0;
  }
  if (cmd === 'check') {
    const dir = mkdtempSync(join(tmpdir(), 'h2c-restore-check-'));
    const server = { close: async () => {} };
    try {
      const v = verifyAndUnpack({ zip: arg(argv, '--zip'), manifestFile: arg(argv, '--manifest'), controlFile, out: dir });
      const { runLegacySmoke } = await import('./legacy-smoke.mjs');
      const s = await serve(dir);
      server.close = s.close;
      const m = await runLegacySmoke({ baseUrl: s.url, manifest: v.manifest, profile: 'live', timeoutS: 30, pollS: 1 });
      for (const c of m.checks.filter((c) => !c.ok)) console.error(`FAIL ${c.name} (${c.detail})`);
      console.log(`dry restore: ${m.status}; ${m.filesChecked} files matched the manifest; nothing was deployed`);
      return m.status === 'pass' ? 0 : 1;
    } finally { await server.close(); rmSync(dir, { recursive: true, force: true }); }
  }
  throw new Error('usage: prepare --zip F --manifest F --out DIR [--control F] [--preview --remake SHA --main SHA] | check --zip F --manifest F [--control F]');
}

if (isMain(import.meta.url)) {
  try { process.exitCode = await cli(process.argv.slice(2)); } catch (e) { console.error(`restore failed: ${e.message}`); process.exitCode = 1; }
}
