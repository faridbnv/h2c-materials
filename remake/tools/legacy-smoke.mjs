#!/usr/bin/env node
// The legacy smoke profile (pack 07 sections 13.1 and 13.3): is the saved old site what an address serves? It does not look for
// release.json, which the old site has not got. Every file of the saved manifest is fetched and its sha256 compared; a missing path must
// be a 404; the stamped selector and the index must be the same bytes and carry the old release id.
//
//   profile "preview": the rehearsal's restore on the preview repository. The restore marks every html file with noindex, the storage shim
//        and a banner (restore.mjs `markPage`); the smoke takes the marks off before it compares, and polls preview.json until it names
//        the restore (restoredFrom equals the zip's digest).
//   profile "live": the site as served, byte for byte; polls manifest.json until it names the old release.
//
// Environment (command line use): SMOKE_BASE_URL, SMOKE_MANIFEST (path), SMOKE_PROFILE (preview|live), SMOKE_DIGEST (sha256:... of the zip,
// preview profile), SMOKE_TIMEOUT_S, SMOKE_POLL_S, SMOKE_OUT.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isMain } from './wp-lib.mjs';
import { assertManifest } from './legacy-site.mjs';
import { unmarkPage, BANNER_ATTR } from './restore-marks.mjs';

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function runLegacySmoke(cfg, deps = {}) {
  const { fetchFn = fetch, sleep = sleepMs, now = Date.now } = deps;
  const base = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;
  const manifest = assertManifest(cfg.manifest);
  const preview = cfg.profile === 'preview';
  if (!['preview', 'live'].includes(cfg.profile)) throw new Error(`profile "${cfg.profile}" is not preview or live`);
  const m = { schema: 1, profile: cfg.profile, status: 'fail', baseUrl: base, oldReleaseId: manifest.oldReleaseId, filesChecked: 0, pollAttempts: 0, servedSeconds: null, checks: [], measuredAt: null };
  const check = (name, ok, detail = '') => { m.checks.push({ name, ok: Boolean(ok), detail }); };
  const finish = () => { m.measuredAt = new Date(now()).toISOString(); m.status = m.checks.length > 0 && m.checks.every((c) => c.ok) ? 'pass' : 'fail'; return m; };
  const get = async (path, cb = true) => {
    const url = `${base}${path}${cb ? `${path.includes('?') ? '&' : '?'}cb=${now()}` : ''}`;
    const res = await fetchFn(url, { redirect: 'follow', signal: AbortSignal.timeout(60000), headers: { 'user-agent': 'h2c-legacy-smoke' } });
    return { status: res.status, bytes: Buffer.from(await res.arrayBuffer()) };
  };

  // 1. Wait until the address serves the restore (or the old release).
  const started = cfg.startedAt ?? now();
  const deadline = now() + cfg.timeoutS * 1000;
  let seen = false, last = 'no response yet';
  while (now() < deadline) {
    m.pollAttempts++;
    try {
      if (preview) {
        const r = await get('preview.json');
        if (r.status === 200) { const j = JSON.parse(r.bytes.toString('utf8')); seen = j.restoredFrom === cfg.digest; last = `preview.json restoredFrom ${String(j.restoredFrom)}`; } else last = `preview.json: HTTP ${r.status}`;
      } else {
        const r = await get('manifest.json');
        if (r.status === 200) { const j = JSON.parse(r.bytes.toString('utf8')); seen = j.release === manifest.oldReleaseId; last = `manifest.json names ${String(j.release)}`; } else last = `manifest.json: HTTP ${r.status}`;
      }
    } catch (e) { last = e.message; }
    if (seen) break;
    await sleep(cfg.pollS * 1000);
  }
  if (!seen) { check('the address serves the restored old site', false, `timed out after ${cfg.timeoutS}s; last observation: ${last}`); return finish(); }
  m.servedSeconds = Math.round((now() - started) / 1000);
  check('the address serves the restored old site', true, `after ${m.pollAttempts} poll(s), ${m.servedSeconds} s from the start`);

  // 2. Every file of the manifest, byte for byte.
  const queue = [...manifest.files];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        const r = await get(f.path);
        if (r.status !== 200) { check(`${f.path}: HTTP 200`, false, `got ${r.status}`); continue; }
        let bytes = r.bytes;
        if (preview && /\.html?$/i.test(f.path)) bytes = Buffer.from(unmarkPage(bytes.toString('utf8')), 'utf8');
        const ok = sha(bytes) === f.sha256;
        m.filesChecked++;
        if (!ok) check(`${f.path}: digest`, false, `served ${sha(bytes).slice(0, 12)}, manifest ${f.sha256.slice(0, 12)}`);
      } catch (e) { check(`${f.path}: fetch`, false, e.message); }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  check(`all ${manifest.files.length} files of the manifest served with their digests`, m.filesChecked === manifest.files.length && m.checks.every((c) => c.ok), `${m.filesChecked} matched`);

  // 3. The page is the stamped selector of the old release; a missing path is a 404.
  const index = manifest.files.find((f) => f.path === 'index.html');
  const stamped = manifest.files.find((f) => /^H2C_Material_Selector_\d{4}-\d{2}-\d{2}_[0-9a-f]{12}\.html$/.test(f.path));
  check('the manifest has an index.html and a release-stamped selector page', Boolean(index && stamped), '');
  if (index && stamped) {
    check('index.html is the stamped selector page', index.sha256 === stamped.sha256, stamped.path);
    check('the stamped selector names the old release', stamped.path.includes(manifest.oldReleaseId), stamped.path);
  }
  check('a material page is in the manifest', manifest.files.some((f) => /^materials\/M\d+\.html$/.test(f.path)), '');
  try {
    const r = await get(`no-such-page-${now()}.html`, false);
    check('a missing path returns HTTP 404', r.status === 404, `got ${r.status}`);
  } catch (e) { check('a missing path returns HTTP 404', false, e.message); }
  if (preview) {
    try {
      const r = await get('index.html');
      check('the preview page carries the restore banner', r.status === 200 && r.bytes.toString('utf8').includes(BANNER_ATTR), '');
    } catch (e) { check('the preview page carries the restore banner', false, e.message); }
  }
  return finish();
}

const num = (v, d) => { const n = Number(v ?? d); if (!Number.isFinite(n) || n <= 0) throw new Error(`not a positive number: ${v}`); return n; };

if (isMain(import.meta.url)) {
  const env = process.env;
  let m;
  try {
    if (!env.SMOKE_BASE_URL || !env.SMOKE_MANIFEST) throw new Error('SMOKE_BASE_URL and SMOKE_MANIFEST are required');
    m = await runLegacySmoke({
      baseUrl: env.SMOKE_BASE_URL, manifest: JSON.parse(readFileSync(env.SMOKE_MANIFEST, 'utf8')), profile: env.SMOKE_PROFILE ?? 'preview', digest: env.SMOKE_DIGEST ?? '',
      timeoutS: num(env.SMOKE_TIMEOUT_S, 600), pollS: num(env.SMOKE_POLL_S, 15), startedAt: env.SMOKE_STARTED_AT ? Number(env.SMOKE_STARTED_AT) : undefined,
    });
  } catch (e) { m = { schema: 1, status: 'fail', checks: [{ name: 'legacy smoke could not run', ok: false, detail: e.message }], measuredAt: new Date().toISOString() }; }
  writeFileSync(env.SMOKE_OUT || 'legacy-smoke.measured.json', JSON.stringify(m, null, 2) + '\n');
  for (const c of m.checks.filter((c) => !c.ok || m.checks.length < 40)) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  console.log(`legacy smoke: ${m.status}${m.servedSeconds != null ? `; served ${m.servedSeconds} s after the start` : ''}`);
  process.exitCode = m.status === 'pass' ? 0 : 1;
}
