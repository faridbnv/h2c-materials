#!/usr/bin/env node
// Post-deploy smoke test against the PUBLIC preview address (WP-03; pack 07 section 8.2). A deploy that uploaded fine but
// serves something else is the failure this exists to catch, so every problem is an error: a failed fetch, a wrong status,
// a missing banner, a timeout. Nothing is retried silently into a pass, and every failed check is reported, not just the first.
//
// Environment: PREVIEW_BASE_URL (ends with /), EXPECT_COMMIT (40 hex), GITHUB_REPOSITORY and GH_TOKEN (to ask whether a
// later preview descends from the expected commit), PUSHED_AT (epoch ms, optional), SMOKE_TIMEOUT_S (default 600),
// SMOKE_POLL_S (default 20), SMOKE_OUT (where the measurement JSON goes, default preview-deploy.measured.json).
// The measurement has the shape of remake/measure/preview-deploy.json.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { isMain } from './wp-lib.mjs';
import { applyEstimates } from '../../packages/publish/src/shards.ts';
import { SELECTOR_NAME } from './site-pages.mjs';
import { BANNER_MARK, NOINDEX } from './preview-assemble.mjs';

export const BUDGET_SECONDS = 900;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
const hdr = (res, k) => res.headers.get(k) ?? null;
const edgeView = (res) => ({ status: res.status, age: hdr(res, 'age'), cacheControl: hdr(res, 'cache-control'), lastModified: hdr(res, 'last-modified'), via: hdr(res, 'x-served-by') ?? hdr(res, 'via') });

// Fetch with a timeout and a few tries for network errors and 5xx (a CDN node can hiccup). A 4xx or a wrong 2xx is returned
// to the caller to judge; an exhausted retry throws.
export async function fetchRetry(url, { fetchFn = fetch, tries = 3, delayMs = 5000, timeoutMs = 30000, sleep = sleepMs } = {}) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetchFn(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'h2c-preview-smoke' } });
      if (res.status < 500) return res;
      last = new Error(`${url}: HTTP ${res.status}`);
    } catch (e) { last = new Error(`${url}: ${e.message}`); }
    if (i < tries) await sleep(delayMs);
  }
  throw last;
}

/** One JSON file of the view, parsed, or null (and a failed check) when it is not served as 200 JSON. */
async function viewJson(name, path, { page, check }) {
  const text = await page(name, path);
  if (text === null) return null;
  try { return JSON.parse(text); } catch (e) { check(`${name} parses`, false, e.message); return null; }
}

/** The first material of a release's result.json, and the result itself: what a page of that release asks for first. */
async function sampleOf(release, ctx) {
  const result = await viewJson(`result.json of ${release}`, `data/${release}/result.json`, ctx);
  if (result === null) return null;
  const id = result.materials?.[0]?.materialId;
  ctx.check(`result.json of ${release} names its release and a material`, result.release === release && /^M\d+$/.test(id ?? ''), `release ${result.release}, first material ${String(id)}`);
  return /^M\d+$/.test(id ?? '') ? { id, result } : null;
}

/**
 * Two scenarios, read from the bytes the deploy serves (the question's answer itself is the browser suite's, run on the same files): the Strict one
 * is the release's own template, whose verdicts result.json lists and whose counts release.json states; the Explore one joins the estimates part
 * to the core part, which is what the page does before it shows an answer with estimates on, and which refuses a part that is not of this core.
 */
function checkScenarios({ manifest, result, core, estimates, check }) {
  const tally = { PASS: 0, UNKNOWN: 0, FAIL: 0 };
  for (const m of result.materials ?? []) if (m.verdict in tally) tally[m.verdict]++;
  const said = manifest.counts ?? {};
  check('Strict scenario: result.json lists as many verdicts as release.json counts', tally.PASS === said.pass && tally.UNKNOWN === said.unknown && tally.FAIL === said.fail,
    `listed ${JSON.stringify(tally)}, counted ${JSON.stringify({ pass: said.pass, unknown: said.unknown, fail: said.fail })}`);
  check('Strict scenario: every material it lists is in the core part', (result.materials ?? []).every((m) => core.model?.materials?.some((c) => c.id === m.materialId)), '');
  try {
    applyEstimates(core.model, estimates.overlay);
    check('Explore scenario: the estimates part joins the core part', estimates.status === 'available' || estimates.status === 'withheld', `status ${estimates.status}`);
  } catch (e) { check('Explore scenario: the estimates part joins the core part', false, e.message); }
}

/** The view's page names its release, its release.json agrees, and its core, estimates and reference parts are what the manifest says (sha256 and size). */
async function checkView(base, release, previous, ctx) {
  const { page, check, fetchFn, sleep, now } = ctx;
  const index = await page('index.html', 'index.html');
  if (index !== null) check('index.html carries the view\'s release id', index.includes(release), release);
  const text = await page('release.json', 'release.json');
  if (text === null) return;
  let manifest;
  try { manifest = JSON.parse(text); } catch (e) { check('release.json parses', false, e.message); return; }
  check('release.json names the view\'s release', manifest.release === release, `${manifest.release} against ${release}`);
  const parsed = {};
  for (const part of ['core', 'estimates', 'reference']) {
    const file = manifest.files?.[part];
    if (!file?.path || !/^data\/[0-9a-f]{12}\/[a-z]+\.json$/.test(file.path)) { check(`${part} part is listed`, false, JSON.stringify(file)); continue; }
    try {
      const res = await fetchRetry(`${base}${file.path}?cb=${now()}`, { fetchFn, sleep });
      if (res.status !== 200) { check(`${part} part: HTTP 200`, false, `got ${res.status}`); continue; }
      const bytes = Buffer.from(await res.arrayBuffer());
      const sha = createHash('sha256').update(bytes).digest('hex');
      check(`${part} part is the one release.json lists`, sha === file.sha256 && bytes.length === file.bytes, `${bytes.length} bytes, sha256 ${sha.slice(0, 12)}, listed ${file.bytes} bytes, ${String(file.sha256).slice(0, 12)}`);
      try { parsed[part] = JSON.parse(bytes.toString('utf8')); } catch { /* the sha256 above is the check; a part that is not JSON fails the scenarios below */ }
    } catch (e) { check(`${part} part: fetch`, false, e.message); }
  }
  // What the page asks for first: the results, and one material's file, of this release.
  const sample = await sampleOf(release, ctx);
  if (sample !== null) {
    const material = await viewJson(`material/${sample.id}.json`, `data/${release}/material/${sample.id}.json`, ctx);
    if (material !== null) check(`material/${sample.id}.json is that material of this release`, material.kind === 'material' && material.release === release && material.materialId === sample.id, `${material.kind} ${material.materialId} of ${material.release}`);
    if (parsed.core && parsed.estimates) checkScenarios({ manifest, result: sample.result, core: parsed.core, estimates: parsed.estimates, check });
    else check('the two scenarios could be read', false, 'the core or the estimates part was not served as JSON');
  }
  // The deploy keeps the previous release without its detail/ folder (owner decision 2026-10-22): a page cached from it still loads its
  // results, and a request for a detail gets the 404 its guard answers with a reload. Both halves are the design; either missing is a fault.
  if (previous !== null) {
    const old = await sampleOf(previous, ctx);
    if (old !== null) {
      await page(`previous release ${previous}: detail/${old.id}.json is gone`, `data/${previous}/detail/${old.id}.json`, { status: 404 });
    }
  }
}

export async function runSmoke(cfg, deps = {}) {
  const { fetchFn = fetch, sleep = sleepMs, now = Date.now, compare = null } = deps;
  const base = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;
  if (!/^[0-9a-f]{40}$/.test(cfg.expectCommit)) throw new Error(`EXPECT_COMMIT is not a 40-character SHA: "${cfg.expectCommit}"`);
  const m = {
    schema: 1, status: 'fail', baseUrl: base, remakeCommit: cfg.expectCommit, release: null, pushedAt: cfg.pushedAt ? new Date(cfg.pushedAt).toISOString() : null,
    visibleAt: null, deployToVisibleSeconds: null, budgetSeconds: BUDGET_SECONDS, withinBudget: null, pollAttempts: 0, servedCommit: null,
    edge: null, checks: [], measuredAt: null,
  };
  const check = (name, ok, detail = '') => { m.checks.push({ name, ok: Boolean(ok), detail }); };
  const finish = () => { m.measuredAt = new Date(now()).toISOString(); m.status = m.checks.length > 0 && m.checks.every((c) => c.ok) ? 'pass' : 'fail'; return m; };

  // 1. Poll preview.json (cache-busted) until it names the pushed commit, or a later one that descends from it.
  const deadline = now() + cfg.timeoutS * 1000;
  let info = null, last = 'no response yet';
  while (now() < deadline) {
    m.pollAttempts++;
    try {
      const res = await fetchFn(`${base}preview.json?cb=${now()}`, { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'h2c-preview-smoke' } });
      if (res.status !== 200) last = `preview.json: HTTP ${res.status}`;
      else {
        const j = await res.json();
        if (j.remakeCommit === cfg.expectCommit) { info = j; break; }
        last = `preview.json names ${String(j.remakeCommit).slice(0, 8)}, expected ${cfg.expectCommit.slice(0, 8)}`;
        if (compare && /^[0-9a-f]{40}$/.test(j.remakeCommit ?? '')) {
          try { if (await compare(cfg.expectCommit, j.remakeCommit)) { info = j; m.servedCommit = j.remakeCommit; break; } }
          catch (e) { last += `; ancestry check failed: ${e.message}`; }
        }
      }
    } catch (e) { last = `preview.json: ${e.message}`; }
    await sleep(cfg.pollS * 1000);
  }
  if (!info) { check('preview.json names the pushed commit', false, `timed out after ${cfg.timeoutS}s; last observation: ${last}`); return finish(); }
  m.servedCommit ??= info.remakeCommit;
  m.release = info.release ?? null;
  m.visibleAt = new Date(now()).toISOString();
  if (cfg.pushedAt) {
    m.deployToVisibleSeconds = Math.round((now() - cfg.pushedAt) / 1000);
    m.withinBudget = m.deployToVisibleSeconds <= BUDGET_SECONDS;
    check(`deploy to visible within ${BUDGET_SECONDS} s`, m.withinBudget, `${m.deployToVisibleSeconds} s`);
  } else if (cfg.requirePushedAt) {
    check('PUSHED_AT is known (the deploy job reports when it pushed)', false, 'PUSHED_AT unset');
  }
  check('preview.json names the pushed commit (or a descendant)', true, `${info.remakeCommit.slice(0, 8)} after ${m.pollAttempts} poll(s)`);
  check('preview.json carries mainCommit, builtAt and release', Boolean(info.mainCommit && info.builtAt && info.release), JSON.stringify({ mainCommit: info.mainCommit, builtAt: info.builtAt, release: info.release }));

  // 2. The pages. Each is fetched cache-busted; a failed fetch is a failed check.
  const page = async (name, path, { status = 200, text = true } = {}) => {
    try {
      const res = await fetchRetry(`${base}${path}${path.includes('?') ? '&' : '?'}cb=${now()}`, { fetchFn, sleep });
      const body = text ? await res.text() : '';
      check(`${name}: HTTP ${status}`, res.status === status, `got ${res.status}`);
      return res.status === status ? body : null;
    } catch (e) { check(`${name}: fetch`, false, e.message); return null; }
  };
  const marked = (name, body) => {
    if (body === null) return;
    check(`${name}: banner`, body.includes(BANNER_MARK), '');
    check(`${name}: noindex`, body.includes(NOINDEX), '');
  };
  // The root is the selector of the remake; today's site is at legacy/ (WP-30).
  const index = await page('index.html', 'index.html');
  marked('index.html', index);
  const sample = info.sampleMaterial;
  if (!/^materials\/M\d+\.html$/.test(sample ?? '')) check('preview.json names a material page', false, String(sample));
  else { const body = await page(`${sample}`, sample); marked(sample, body); }
  const nf = await page('404.html', '404.html');
  marked('404.html', nf);
  if (typeof info.v3Release === 'string') await checkView(base, info.v3Release, typeof info.v3Previous === 'string' ? info.v3Previous : null, { page, check, fetchFn, sleep, now });
  else check('the public view checked', false, 'preview.json names no v3Release, so the public view was not part of this deploy and was not checked');

  // An old link: the release-stamped address of today's selector opens the selector with its hash (a stub), and one of an older release gets the 404 page whose script
  // sends it there. The stamped page of today's site is at legacy/ as well, and is the old release's.
  if (typeof info.stampedSelector === 'string' && SELECTOR_NAME.test(info.stampedSelector)) {
    const stub = await page(`old link ${info.stampedSelector}`, info.stampedSelector);
    if (stub !== null) check('an old link\'s stub keeps the hash on its way to the selector', stub.includes('location.hash'), '');
    const gone = await page('an older release\'s link', 'H2C_Material_Selector_2000-01-01_aaaaaaaaaaaa.html', { status: 404 });
    if (gone !== null) check('an older release\'s link is sent to the selector by the 404 page', gone.includes('H2C_Material_Selector'), '');
  } else check('preview.json names the stamped selector page', false, String(info.stampedSelector));
  const old = await page('legacy/index.html', 'legacy/index.html');
  marked('legacy/index.html', old);
  if (old !== null) check('legacy/index.html carries the old release id', Boolean(info.release) && old.includes(info.release), info.release ?? 'no release in preview.json');
  const manifest = await page('legacy/manifest.json', 'legacy/manifest.json');
  if (manifest !== null) { try { check('legacy/manifest.json release equals preview.json release', JSON.parse(manifest).release === info.release); } catch (e) { check('legacy/manifest.json parses', false, e.message); } }
  if (/^materials\/M\d+\.html$/.test(sample ?? '')) marked(`legacy/${sample}`, await page(`legacy/${sample}`, `legacy/${sample}`));

  // A missing path must be a real 404, not a 200 that serves the shell.
  try {
    const res = await fetchRetry(`${base}no-such-page-${now()}.html`, { fetchFn, sleep });
    check('a missing path returns HTTP 404', res.status === 404, `got ${res.status}`);
  } catch (e) { check('a missing path returns HTTP 404', false, e.message); }

  // 3. Record, without failing, what the edge serves with no cache-busting (staleness measurement).
  const edge = {};
  for (const [k, path] of [['previewJsonUnbusted', 'preview.json'], ['indexUnbusted', 'index.html']]) {
    try {
      const res = await fetchRetry(`${base}${path}`, { fetchFn, sleep, tries: 1 });
      edge[k] = { ...edgeView(res) };
      if (k === 'previewJsonUnbusted' && res.status === 200) { try { edge[k].namesExpectedCommit = (await res.json()).remakeCommit === m.servedCommit; } catch { edge[k].namesExpectedCommit = null; } }
    } catch (e) { edge[k] = { error: e.message }; }
  }
  m.edge = edge;
  return finish();
}

const num = (v, d) => { const n = Number(v ?? d); if (!Number.isFinite(n) || n <= 0) throw new Error(`not a positive number: ${v}`); return n; };

if (isMain(import.meta.url)) {
  const env = process.env;
  let m;
  try {
    const repo = env.GITHUB_REPOSITORY, token = env.GH_TOKEN;
    const compare = repo && token ? async (base, head) => {
      const res = await fetch(`https://api.github.com/repos/${repo}/compare/${base}...${head}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'h2c-preview-smoke' }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`compare API HTTP ${res.status}`);
      const s = (await res.json()).status;
      return s === 'ahead' || s === 'identical';
    } : null;
    if (!env.PREVIEW_BASE_URL) throw new Error('PREVIEW_BASE_URL is not set');
    m = await runSmoke({
      baseUrl: env.PREVIEW_BASE_URL, expectCommit: env.EXPECT_COMMIT ?? '', timeoutS: num(env.SMOKE_TIMEOUT_S, 600), pollS: num(env.SMOKE_POLL_S, 20),
      pushedAt: env.PUSHED_AT ? Number(env.PUSHED_AT) : null, requirePushedAt: env.CI === 'true',
    }, { compare });
  } catch (e) {
    m = { schema: 1, status: 'fail', checks: [{ name: 'smoke could not run', ok: false, detail: e.message }], measuredAt: new Date().toISOString() };
  }
  writeFileSync(env.SMOKE_OUT || 'preview-deploy.measured.json', JSON.stringify(m, null, 2) + '\n');
  for (const c of m.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  if (m.deployToVisibleSeconds != null) console.log(`deploy to visible: ${m.deployToVisibleSeconds}s (budget ${m.budgetSeconds}s)`);
  console.log(`smoke: ${m.status}`);
  process.exitCode = m.status === 'pass' ? 0 : 1;
}
