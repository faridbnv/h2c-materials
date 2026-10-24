// WP-14: the built public view. The data it ships comes from the clean rebuild through packages/engine, and the counts it
// shows are the engine's: checked here against a second, independent run of the engine on the same tables. The site is
// built once with relative URLs and served under two different sub-paths, and once with an absolute base under the
// preview's path; each load goes through the page's own guard. Needs the old build's dependencies (npm ci --prefix build).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { createContext, scenarioFrom } from '@atlas/engine';
import { compileSnapshot, loadImpactCases, removeSnapshot, stageSnapshot } from '@atlas/engine/impact';
import { buildSite } from '../../apps/public/tools/build.ts';
import { CASE_ID } from '../../apps/public/tools/make-data.ts';
import { loadMaterial, loadResult, partUrl } from '../../apps/public/src/load.ts';
import { StaleShellError, embeddedRelease } from '../../apps/public/src/release.ts';
import { tally } from '../../apps/public/src/tally.ts';
import { releaseIdentity } from '../../remake/tools/release-id.mjs';
import { REPO_ROOT } from '../../packages/engine/src/old-engine.ts';

const PREVIEW_PATH = '/h2c-material-temp-page/v3/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const scratch = mkdtempSync(join(tmpdir(), 'h2c-public-'));
const relativeBuild = join(scratch, 'relative');
const absoluteBuild = join(scratch, 'absolute');
let relative, engine;

/** Serves a built folder under a path prefix, as Pages serves a project site. Anything outside the prefix is a 404. */
async function serveUnder(dir, prefix) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.startsWith(prefix) ? join(dir, path.slice(prefix.length) || 'index.html') : null;
    if (!file || !file.startsWith(dir) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, prefix, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }) };
}

/** How a browser resolves what a page asks for: against the page's own address. */
const fetchFrom = (pageUrl) => (url) => fetch(new URL(url, pageUrl));
const text = async (url) => { const r = await fetch(url); assert.equal(r.status, 200, url); return r.text(); };
const embeddedIn = (html) => embeddedRelease({ querySelector: () => ({ getAttribute: () => /<meta name="h2c-release" content="([^"]*)"/.exec(html)?.[1] ?? '' }) });
// What a page asks the server for: not an icon it carries inline (a data: address asks nobody).
const assetsOf = (html, pageUrl) => [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].filter((m) => !m[1].startsWith('data:')).map((m) => new URL(m[1], pageUrl).href);

before(async () => {
  relative = await buildSite({ outDir: relativeBuild });
  await buildSite({ outDir: absoluteBuild, base: PREVIEW_PATH });
  // The engine, asked again on the same tables, by a path that shares nothing with the generator but the packages: the old build's
  // compile, with its estimate stage, as the selector runs on it (a database without the estimate stage words some reasons differently).
  const snapshot = stageSnapshot(REPO_ROOT);
  try {
    const db = await compileSnapshot(snapshot, { estimates: true });
    const asked = loadImpactCases().find((c) => c.id === CASE_ID);
    engine = createContext(db, scenarioFrom(asked.question, db.meta)).run({ rankings: false });
  } finally { removeSnapshot(snapshot); }
});
after(() => rmSync(scratch, { recursive: true, force: true }));

test('the release of the view is the release identity of this checkout, in the page, the manifest and every data file', async () => {
  const id = releaseIdentity(REPO_ROOT).id;
  assert.equal(relative.release, id);
  assert.equal(JSON.parse(readFileSync(join(relativeBuild, 'release.json'), 'utf8')).release, id);
  assert.deepEqual(readdirSync(join(relativeBuild, 'data')), [id]);
  for (const page of ['index.html', 'material.html']) assert.equal(embeddedIn(readFileSync(join(relativeBuild, page), 'utf8')), id);
  const server = await serveUnder(relativeBuild, '/');
  try {
    const result = await loadResult(id, fetchFrom(`${server.origin}/index.html`));
    assert.equal(result.release, id);
  } finally { await server.close(); }
});

test('the counts the page shows equal the engine\'s for the template: its own counts, the tally of its rows, and every verdict and group', async () => {
  const shipped = JSON.parse(readFileSync(join(relativeBuild, 'data', relative.release, 'result.json'), 'utf8'));
  assert.deepEqual(shipped.counts, engine.counts);
  assert.deepEqual(tally(shipped.materials), engine.counts, 'what the page tallies from the rows');
  assert.equal(shipped.materials.length, engine.evaluations.length);
  const byId = new Map(shipped.materials.map((m) => [m.materialId, m]));
  for (const e of engine.evaluations) {
    const m = byId.get(e.materialId);
    assert.deepEqual([m.verdict, m.group, m.screened], [e.verdict, e.group, e.screened], e.materialId);
    assert.deepEqual(m.products, e.counts ?? null, `${e.materialId}: the product counts`);
  }
  assert.ok(engine.counts.pass > 0 && engine.counts.fail > 0 && engine.counts.unknown > 0, 'the template splits the materials three ways, so the check means something');
});

test('every material has a shard that agrees with the engine, reason for reason, in the engine\'s own words', async () => {
  const dir = join(relativeBuild, 'data', relative.release, 'material');
  assert.equal(readdirSync(dir).length, engine.evaluations.length);
  for (const e of engine.evaluations) {
    const shard = JSON.parse(readFileSync(join(dir, `${e.materialId}.json`), 'utf8'));
    assert.deepEqual(shard.results.map((r) => [r.status, r.reason]), e.results.map((r) => [r.status, r.reason]), e.materialId);
    assert.deepEqual(shard.products.map((p) => [p.gradeId, p.verdict]), (e.products ?? []).map((p) => [p.gradeId, p.verdict]), e.materialId);
  }
});

test('one build serves under any sub-path: every asset and data part of both pages resolves under two different bases', async () => {
  for (const prefix of ['/h2c-material-temp-page/v3/', '/h2c-materials-next/some/deeper/v3/']) {
    const server = await serveUnder(relativeBuild, prefix);
    try {
      for (const page of ['index.html', 'material.html?m=M001']) {
        const url = `${server.origin}${prefix}${page}`;
        const html = await text(url); // a direct link, which is what a refresh asks the server for
        const refs = assetsOf(html, url);
        assert.ok(refs.length >= 2, `${page} references its script and stylesheet`);
        for (const ref of refs) assert.ok(ref.startsWith(`${server.origin}${prefix}`), `${ref} stays under ${prefix}`);
        for (const ref of refs) assert.equal((await fetch(ref)).status, 200, ref);
      }
      const get = fetchFrom(`${server.origin}${prefix}index.html`);
      const result = await loadResult(relative.release, get);
      assert.deepEqual(result.counts, engine.counts);
      const first = result.materials[0].materialId;
      const material = await loadMaterial(relative.release, first, fetchFrom(`${server.origin}${prefix}material.html?m=${first}`));
      assert.equal(material.materialId, first);
      assert.equal((await fetch(`${server.origin}/h2c-material-temp-page/missing`)).status, 404, 'outside the prefix nothing is served');
    } finally { await server.close(); }
  }
});

test('an absolute base (the preview path) writes absolute URLs that resolve under that path, and under no other', async () => {
  const server = await serveUnder(absoluteBuild, PREVIEW_PATH);
  try {
    const url = `${server.origin}${PREVIEW_PATH}index.html`;
    const refs = assetsOf(await text(url), url);
    assert.ok(refs.length >= 2 && refs.every((r) => r.startsWith(`${server.origin}${PREVIEW_PATH}assets/`)), refs.join(' '));
    for (const ref of refs) assert.equal((await fetch(ref)).status, 200, ref);
  } finally { await server.close(); }
});

test('on the built files, the guard refuses a stale shell: a page of another release, and a data file of another release', async () => {
  const server = await serveUnder(relativeBuild, PREVIEW_PATH);
  try {
    const get = fetchFrom(`${server.origin}${PREVIEW_PATH}index.html`);
    // An old page: it names a release the server no longer holds, so its part is a 404.
    await assert.rejects(loadResult('f'.repeat(12), get), (e) => e instanceof StaleShellError && e.found === null);
    // A cached old data file behind a new page: the part names another release.
    const tampered = (url) => get(url).then(async (r) => (url.endsWith('result.json') ? { ok: r.ok, status: r.status, json: async () => ({ ...(await r.json()), release: 'f'.repeat(12) }) } : r));
    await assert.rejects(loadResult(relative.release, tampered), (e) => e instanceof StaleShellError && e.found === 'f'.repeat(12));
  } finally { await server.close(); }
});
