// Tests for WP-03: the CI gates (old-paths guard, review-section check, tier-gate), the preview post-processing, the smoke
// test against a local server, and static rules about the two workflows (pinned actions, no pull_request_target, the
// deploy key referenced once and only by the deploy job).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  globToRegExp, oldPathViolations, needsReviewSection, hasReviewSection, classifyTier, tierGate, findAttest, parseChangedFiles, attestText,
} from '../../remake/tools/ci-gates.mjs';
import { injectBanner, inject, stage, BANNER_MARK, NOINDEX } from '../../remake/tools/preview-assemble.mjs';
import { runSmoke, fetchRetry } from '../../remake/tools/preview-smoke.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'h2c-ci-'));
const SHA = 'a'.repeat(40);
const OLD_SHA = 'b'.repeat(40);

// ---- old-paths guard ------------------------------------------------------------------------------------------------
test('old-paths guard fails on every path main owns and passes the new areas', () => {
  const bad = ['data/tables/x.csv', 'schema/s.sql', 'app/index.js', 'build/src/a.js', 'scripts/a.mjs', 'test/a.test.js', 'archive/m.sql',
    '.github/workflows/pages.yml', '.github/workflows/verify.yml'];
  assert.deepEqual(oldPathViolations(bad), bad);
  const fine = ['packages/a.ts', 'tests/remake/x.mjs', 'remake/tools/y.mjs', 'docs/next/z.md', '.github/workflows/next-verify.yml', 'builder/x', 'applications/x', 'database/x', 'tests/test/x'];
  assert.deepEqual(oldPathViolations(fine), []);
  assert.deepEqual(oldPathViolations(['packages/a.ts', 'app/ui.js']), ['app/ui.js']);
});

test('changed-file list: empty input is an error, never a pass; duplicates collapse', () => {
  assert.throws(() => parseChangedFiles('\n \n'), /empty/);
  assert.deepEqual(parseChangedFiles('a/b\r\n./a/b\nc\n'), ['a/b', 'c']);
});

// ---- review section -------------------------------------------------------------------------------------------------
test('review-section is required for parity, data, wp tools and .github, and only then', () => {
  for (const p of ['packages/parity/x.ts', 'packages/data/y.ts', 'remake/tools/wp-check.mjs', '.github/workflows/next-verify.yml']) assert.ok(needsReviewSection([p]), p);
  for (const p of ['packages/domain/x.ts', 'docs/next/a.md', 'remake/tools/ci-gates.mjs', 'tests/remake/a.mjs']) assert.ok(!needsReviewSection([p]), p);
  assert.ok(hasReviewSection('## Review findings and disposition\nnone'));
  assert.ok(!hasReviewSection('## Summary'));
  assert.ok(!hasReviewSection(undefined));
});

// ---- tier classification --------------------------------------------------------------------------------------------
const scope = (extra = {}) => ({ file: 'WP-09.json', wp: 'WP-09', approvedBy: 'owner', parity: 'none', paths: ['packages/data/**', 'tests/data/*.mjs'], ...extra });

test('globs: ** crosses directories, * does not, dots are literal', () => {
  assert.ok(globToRegExp('packages/data/**').test('packages/data/a/b.ts'));
  assert.ok(globToRegExp('tests/data/*.mjs').test('tests/data/a.mjs'));
  assert.ok(!globToRegExp('tests/data/*.mjs').test('tests/data/sub/a.mjs'));
  assert.ok(!globToRegExp('a.b').test('axb'));
  assert.ok(globToRegExp('docs/next/rulings.csv').test('docs/next/rulings.csv'));
});

test('Tier 0 only when every path is inside one approved scope', () => {
  assert.equal(classifyTier(['packages/data/a.ts', 'tests/data/t.mjs'], [scope()]).tier, 0);
  const out = classifyTier(['packages/data/a.ts', 'packages/other/b.ts'], [scope()]);
  assert.equal(out.tier, 1);
  assert.match(out.reasons.join(' '), /outside WP-09\.json: packages\/other\/b\.ts/);
});

test('an unapproved scope, an empty scope and no scope are Tier 1', () => {
  assert.equal(classifyTier(['packages/data/a.ts'], [scope({ approvedBy: 'agent' })]).tier, 1);
  assert.equal(classifyTier(['packages/data/a.ts'], [scope({ approvedBy: undefined })]).tier, 1);
  assert.equal(classifyTier(['packages/data/a.ts'], [scope({ paths: [] })]).tier, 1);
  const none = classifyTier(['packages/data/a.ts'], []);
  assert.equal(none.tier, 1);
  assert.match(none.reasons.join(' '), /no approved scope/);
});

test('a science path forces Tier 1 even when a scope lists it', () => {
  const wide = scope({ paths: ['packages/**', 'docs/**', 'parity/**', 'remake/**'] });
  for (const p of ['packages/domain/x.ts', 'parity/transitions/T1.json', 'docs/next/rulings.csv', 'packages/engine/a.ts', 'packages/build/b.ts', 'parity/corpus/c.json']) {
    const r = classifyTier([p], [wide]);
    assert.equal(r.tier, 1, p);
    assert.match(r.reasons.join(' '), /science path/);
  }
});

test('governance paths (workflows, scopes, gate code, Node pin) are never Tier 0, so a PR cannot widen its own approval', () => {
  const wide = scope({ paths: ['**'] });
  for (const p of ['.github/workflows/next-verify.yml', 'remake/scopes/WP-10.json', 'remake/tools/ci-gates.mjs', 'remake/tools/preview-assemble.mjs', 'remake/tools/setup-preview.sh', 'tests/remake/ci.test.mjs', '.nvmrc', '.npmrc', 'package.json', '.claude/settings.json', 'CLAUDE.md']) {
    const r = classifyTier([p], [wide]);
    assert.equal(r.tier, 1, p);
    assert.match(r.reasons.join(' '), /governance path/);
  }
});

test('a scope that does not declare parity none is Tier 1 with an explicit "not measurable" reason', () => {
  const r = classifyTier(['packages/data/a.ts'], [scope({ parity: 'zero' })]);
  assert.equal(r.tier, 1);
  assert.match(r.reasons.join(' '), /parity-zero condition is not measurable/);
});

test('paths that could shadow the trusted base checkout or hide control characters are refused', () => {
  const wide = scope({ paths: ['**'] });
  assert.equal(classifyTier(['_base/remake/tools/ci-gates.mjs'], [wide]).tier, 1);
  assert.equal(classifyTier(['packages/data/a\u0007.ts'], [scope()]).tier, 1);
});

test('path traversal and absolute paths are refused', () => {
  assert.equal(classifyTier(['packages/data/../../app/x.js'], [scope({ paths: ['packages/**'] })]).tier, 1);
  assert.equal(classifyTier(['/etc/passwd'], [scope({ paths: ['**'] })]).tier, 1);
});

// ---- attest matching ------------------------------------------------------------------------------------------------
const comment = (login, body) => ({ user: { login }, body });
const ctx = { owner: 'faridbnv', pr: 12, headSha: SHA };

test('attest comment must be the exact wp-attest text, from the owner, naming the current head SHA', () => {
  assert.equal(attestText(12, SHA), `wp:attest approve 12 ${SHA}`);
  assert.ok(findAttest([comment('faridbnv', `wp:attest approve 12 ${SHA}`)], ctx));
  assert.ok(findAttest([comment('FaridBNV', `wp:attest approve 12 ${SHA}\n`)], ctx), 'login case and trailing newline');
  assert.equal(findAttest([comment('faridbnv', `wp:attest approve 12 ${OLD_SHA}`)], ctx), null, 'stale SHA');
  assert.equal(findAttest([comment('someone-else', `wp:attest approve 12 ${SHA}`)], ctx), null, 'not the owner');
  assert.equal(findAttest([comment('faridbnv', `wp:attest approve 13 ${SHA}`)], ctx), null, 'another PR');
  assert.equal(findAttest([comment('faridbnv', `please wp:attest approve 12 ${SHA}`)], ctx), null, 'text around it');
  assert.equal(findAttest([comment('faridbnv', `wp:attest approve 12 ${SHA.slice(0, 8)}`)], ctx), null, 'short SHA');
  assert.equal(findAttest([comment(undefined, `wp:attest approve 12 ${SHA}`), { body: `wp:attest approve 12 ${SHA}` }], ctx), null, 'no author');
  assert.throws(() => findAttest([], { ...ctx, headSha: 'abc' }), /40 hex/);
});

test('tier gate: answer-moving Tier 1 needs a matching attest; ordinary Tier 1 and Tier 0 need none (owner ruling 2026-10-21)', () => {
  const ordinary = tierGate({ paths: ['packages/x/a.ts'], scopes: [], comments: [], ...ctx });
  assert.deepEqual([ordinary.pass, ordinary.tier], [true, 1]);
  const t1 = { paths: ['parity/transitions/2026-10-21-x.json'], scopes: [], ...ctx };
  const ok = tierGate({ ...t1, comments: [comment('faridbnv', `wp:attest approve 12 ${SHA}`)] });
  assert.deepEqual([ok.pass, ok.tier], [true, 1]);
  const stale = tierGate({ ...t1, comments: [comment('faridbnv', `wp:attest approve 12 ${OLD_SHA}`)] });
  assert.equal(stale.pass, false);
  assert.match(stale.lines.join('\n'), /name an older commit \(bbbbbbbb\), not the current head aaaaaaaa/);
  const missing = tierGate({ ...t1, comments: [] });
  assert.equal(missing.pass, false);
  assert.match(missing.lines.join('\n'), /no owner comment "wp:attest approve 12 a{40}"/);
  const t0 = tierGate({ paths: ['packages/data/a.ts'], scopes: [scope()], comments: [], ...ctx });
  assert.deepEqual([t0.pass, t0.tier], [true, 0]);
});

// ---- the CLI the workflows call -------------------------------------------------------------------------------------
const gate = (...args) => spawnSync(process.execPath, [join(root, 'remake/tools/ci-gates.mjs'), ...args], { encoding: 'utf8' });

test('CLI: a scratch PR changing app/ fails old-paths (exit 1); a clean PR passes; bad input exits 2', () => {
  const d = tmp();
  writeFileSync(join(d, 'bad.txt'), 'packages/a.ts\napp/index.js\n');
  writeFileSync(join(d, 'good.txt'), 'packages/a.ts\n');
  writeFileSync(join(d, 'empty.txt'), '\n');
  const bad = gate('old-paths', '--files', join(d, 'bad.txt'));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /app\/index\.js/);
  assert.equal(gate('old-paths', '--files', join(d, 'good.txt')).status, 0);
  assert.equal(gate('old-paths', '--files', join(d, 'empty.txt')).status, 2);
  assert.equal(gate('old-paths', '--files', join(d, 'missing.txt')).status, 2);
  assert.equal(gate('nonsense', '--files', join(d, 'good.txt')).status, 2);
});

test('CLI: review-section reads the body from the named environment variable', () => {
  const d = tmp();
  writeFileSync(join(d, 'f.txt'), '.github/workflows/x.yml\n');
  const run = (body) => spawnSync(process.execPath, [join(root, 'remake/tools/ci-gates.mjs'), 'review-section', '--files', join(d, 'f.txt'), '--body-env', 'PR_BODY'], { encoding: 'utf8', env: { ...process.env, PR_BODY: body } });
  assert.equal(run('nothing here').status, 1);
  assert.equal(run('## Review findings and disposition\nok').status, 0);
});

test('CLI: tier reads scope files from a directory and comments from a file', () => {
  const d = tmp();
  mkdirSync(join(d, 'scopes'));
  writeFileSync(join(d, 'scopes', 'WP-09.json'), JSON.stringify({ wp: 'WP-09', approvedBy: 'owner', parity: 'none', paths: ['packages/data/**'] }));
  writeFileSync(join(d, 'scopes', 'notes.md'), 'ignored');
  writeFileSync(join(d, 'in.txt'), 'packages/data/a.ts\n');
  writeFileSync(join(d, 'out.txt'), 'packages/x/a.ts\n');
  writeFileSync(join(d, 'owner.txt'), 'docs/next/rulings.csv\n');
  writeFileSync(join(d, 'c.json'), JSON.stringify([comment('faridbnv', `wp:attest approve 12 ${SHA}`)]));
  writeFileSync(join(d, 'none.json'), '[]');
  const t = (files, comments) => gate('tier', '--files', join(d, files), '--scopes-dir', join(d, 'scopes'), '--pr', '12', '--head', SHA, '--owner', 'faridbnv', '--comments', join(d, comments));
  assert.equal(t('in.txt', 'none.json').status, 0, 'Tier 0 inside scope');
  assert.equal(t('out.txt', 'none.json').status, 0, 'ordinary Tier 1 merges on green checks');
  assert.equal(t('owner.txt', 'none.json').status, 1, 'answer-moving Tier 1 without attest');
  assert.equal(t('owner.txt', 'c.json').status, 0, 'answer-moving Tier 1 with attest');
  assert.match(t('in.txt', 'none.json').stdout, /parity: not run/);
});

// ---- preview post-processing ----------------------------------------------------------------------------------------
test('injectBanner puts noindex after <head> and the banner after <body>, once, and refuses pages it cannot mark', () => {
  const html = '<!doctype html><html><head><title>x</title></head><body class="a"><p>hi</p></body></html>';
  const out = injectBanner(html);
  assert.ok(out.includes(`<head>${NOINDEX}`));
  assert.ok(out.includes(`<body class="a"><div ${BANNER_MARK}`));
  assert.match(out, /Preview of the Filament Atlas remake — not the live tool\. Live: <a href="https:\/\/pdynamics\.ca\/h2c-materials\/"/);
  assert.equal(injectBanner(out), out, 'idempotent');
  assert.throws(() => injectBanner('<html><body></body></html>', 'a.html'), /a\.html: no <head>/);
  assert.throws(() => injectBanner('<html><head></head></html>', 'b.html'), /b\.html: no <body>/);
  assert.throws(() => injectBanner(`<html><head></head><body>${BANNER_MARK}</body></html>`, 'c.html'), /complete banner/);
});

function fakeSite(release = 'abcdef012345') {
  const site = tmp();
  mkdirSync(join(site, 'materials'));
  const page = '<!doctype html><html><head><title>t</title></head><body>x</body></html>';
  writeFileSync(join(site, 'index.html'), page);
  writeFileSync(join(site, 'H2C_Material_Selector_2026-01-01_x.html'), page);
  writeFileSync(join(site, 'materials', 'M001.html'), page);
  writeFileSync(join(site, 'materials', 'M001-products.html'), page);
  writeFileSync(join(site, 'validation-report.md'), '# report');
  writeFileSync(join(site, 'manifest.json'), JSON.stringify({ release, snapshot: '2026-01-01' }));
  return site;
}

test('inject marks every html file, adds 404.html and preview.json, and refuses an unassembled site', () => {
  const site = fakeSite();
  const info = inject(site, { remake: SHA, main: OLD_SHA, runId: '7' });
  assert.equal(info.remakeCommit, SHA);
  assert.equal(info.mainCommit, OLD_SHA);
  assert.equal(info.release, 'abcdef012345');
  assert.equal(info.sampleMaterial, 'materials/M001.html');
  assert.equal(info.htmlFiles, 5);
  for (const f of ['index.html', '404.html', 'materials/M001.html', 'materials/M001-products.html']) {
    const t = readFileSync(join(site, f), 'utf8');
    assert.ok(t.includes(BANNER_MARK) && t.includes(NOINDEX), f);
  }
  assert.equal(readFileSync(join(site, 'validation-report.md'), 'utf8'), '# report');
  assert.deepEqual(JSON.parse(readFileSync(join(site, 'preview.json'), 'utf8')).release, 'abcdef012345');
  assert.throws(() => inject(tmp(), { remake: SHA, main: OLD_SHA }), /manifest\.json missing/);
  assert.throws(() => inject(fakeSite(), { remake: 'abc', main: OLD_SHA }), /40-character/);
  const badRelease = fakeSite('../evil');
  assert.throws(() => inject(badRelease, { remake: SHA, main: OLD_SHA }), /12-character release id/);
});

test('inject refuses symbolic links and top-level .git/.github/previous in the site', () => {
  const a = fakeSite(); symlinkSync(join(a, 'index.html'), join(a, 'link.html'));
  assert.throws(() => inject(a, { remake: SHA, main: OLD_SHA }), /symbolic link/);
  const nested = fakeSite(); mkdirSync(join(nested, 'materials', '.git'));
  assert.throws(() => inject(nested, { remake: SHA, main: OLD_SHA }), /\.git folder inside the site/);
  for (const d of ['.git', '.github', 'previous']) {
    const b = fakeSite(); mkdirSync(join(b, d));
    assert.throws(() => inject(b, { remake: SHA, main: OLD_SHA }), /top-level/);
  }
});

test('stage keeps exactly the previous release in previous/ and leaves it alone when the release is unchanged', () => {
  const repo = tmp();
  mkdirSync(join(repo, '.git'));
  const deploy = (release, marker) => {
    const site = fakeSite(release);
    writeFileSync(join(site, 'marker.txt'), marker);
    inject(site, { remake: SHA, main: OLD_SHA });
    return stage(site, repo);
  };
  deploy('111111111111', 'one');
  assert.deepEqual(readdirSync(repo).sort(), ['.git', '.nojekyll', '404.html', 'H2C_Material_Selector_2026-01-01_x.html', 'index.html', 'manifest.json', 'marker.txt', 'materials', 'preview.json', 'validation-report.md']);
  deploy('222222222222', 'two');
  assert.deepEqual(readdirSync(join(repo, 'previous')), ['111111111111']);
  assert.equal(readFileSync(join(repo, 'previous', '111111111111', 'marker.txt'), 'utf8'), 'one');
  assert.equal(readFileSync(join(repo, 'marker.txt'), 'utf8'), 'two');
  deploy('222222222222', 'two-again');
  assert.deepEqual(readdirSync(join(repo, 'previous')), ['111111111111'], 'same release: previous/ untouched');
  deploy('333333333333', 'three');
  assert.deepEqual(readdirSync(join(repo, 'previous')), ['222222222222'], 'only one previous release is kept');
  assert.ok(!existsSync(join(repo, 'previous', 'previous')), 'previous/ is not nested into itself');
  // a tampered preview.json in the preview repo cannot make the deploy write outside the repo
  writeFileSync(join(repo, 'preview.json'), JSON.stringify({ release: '../../x' }));
  assert.throws(() => deploy('444444444444', 'four'), /unsafe release/);
  writeFileSync(join(repo, 'preview.json'), JSON.stringify({ note: 'no release' }));
  assert.throws(() => deploy('555555555555', 'five'), /names no release/);
});

// ---- the smoke test, against a local server -------------------------------------------------------------------------
async function serve(handler) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
}
const MARKED = `<html><head>${NOINDEX}</head><body><div ${BANNER_MARK}>b</div>release rel123456789</body></html>`;
function siteHandler(over = {}) {
  const files = {
    '/preview.json': { body: JSON.stringify({ remakeCommit: SHA, mainCommit: OLD_SHA, builtAt: 'now', release: 'rel123456789', sampleMaterial: 'materials/M001.html' }), type: 'application/json' },
    '/index.html': { body: MARKED }, '/materials/M001.html': { body: MARKED }, '/404.html': { body: MARKED },
    '/manifest.json': { body: JSON.stringify({ release: 'rel123456789' }), type: 'application/json' }, ...over,
  };
  return (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const f = files[path === '/' ? '/index.html' : path];
    if (!f) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(MARKED); return; }
    res.writeHead(f.status ?? 200, { 'content-type': f.type ?? 'text/html', age: '3' });
    res.end(f.body);
  };
}
const fastDeps = (extra = {}) => ({ sleep: async () => {}, ...extra });
const cfg = (url, extra = {}) => ({ baseUrl: url, expectCommit: SHA, timeoutS: 5, pollS: 0.01, pushedAt: Date.now() - 60000, ...extra });
const failed = (m) => m.checks.filter((c) => !c.ok).map((c) => c.name);

test('smoke passes on a consistent site and records the measurement', async () => {
  const s = await serve(siteHandler());
  try {
    const m = await runSmoke(cfg(s.url), fastDeps());
    assert.equal(m.status, 'pass', JSON.stringify(failed(m)));
    assert.equal(m.release, 'rel123456789');
    assert.ok(m.deployToVisibleSeconds >= 59 && m.withinBudget === true);
    assert.equal(m.edge.indexUnbusted.status, 200);
    assert.equal(m.edge.previewJsonUnbusted.namesExpectedCommit, true);
    // the artifact has the keys of the committed template
    const template = JSON.parse(readFileSync(join(root, 'remake/measure/preview-deploy.json'), 'utf8'));
    const keys = Object.keys(template).filter((k) => k !== 'notRunReason').sort();
    assert.deepEqual(Object.keys(m).sort(), keys);
  } finally { await s.close(); }
});

test('smoke fails (never passes silently) on timeout, wrong commit, missing banner, bad material, 200 for a missing path, unreachable host', async () => {
  const run = async (over, extra = {}, deps = {}) => {
    const s = await serve(siteHandler(over));
    try { return await runSmoke(cfg(s.url, extra), fastDeps(deps)); } finally { await s.close(); }
  };
  // preview.json names another commit and no ancestry answer: polls until the (fake) clock passes the deadline
  let t = 0;
  const clock = { now: () => t, sleep: async (ms) => { t += ms; } };
  const other = { '/preview.json': { body: JSON.stringify({ remakeCommit: OLD_SHA, release: 'r' }) } };
  const stale = await run(other, { timeoutS: 30, pollS: 10, pushedAt: null }, clock);
  assert.equal(stale.status, 'fail');
  assert.match(stale.checks[0].detail, /timed out after 30s; last observation: preview\.json names bbbbbbbb, expected aaaaaaaa/);
  assert.ok(stale.pollAttempts >= 3);
  // a later descendant is accepted
  const later = await run(other, { pushedAt: null }, { compare: async () => true });
  assert.equal(later.checks[0].ok, true);
  assert.equal(later.servedCommit, OLD_SHA);
  // ancestry API error is reported, not swallowed
  t = 0;
  const apiDown = await run(other, { timeoutS: 20, pollS: 10, pushedAt: null }, { ...clock, compare: async () => { throw new Error('compare API HTTP 403'); } });
  assert.match(apiDown.checks[0].detail, /ancestry check failed: compare API HTTP 403/);
  // over budget, and PUSHED_AT unknown in CI
  const slow = await run({}, { pushedAt: Date.now() - 1000 * 1000 });
  assert.deepEqual(failed(slow), ['deploy to visible within 900 s']);
  const unknown = await run({}, { pushedAt: null, requirePushedAt: true });
  assert.deepEqual(failed(unknown), ['PUSHED_AT is known (the deploy job reports when it pushed)']);
  // missing banner / noindex on the index
  const plain = await run({ '/index.html': { body: '<html><head></head><body>rel123456789</body></html>' } });
  assert.deepEqual(failed(plain), ['index.html: banner', 'index.html: noindex']);
  // the sample material is 404, the 404 page is absent, the manifest disagrees
  const broken = await run({ '/materials/M001.html': { status: 404, body: 'x' }, '/manifest.json': { body: JSON.stringify({ release: 'other' }) } });
  assert.deepEqual(failed(broken).sort(), ['manifest.json release equals preview.json release', 'materials/M001.html: HTTP 200']);
  const noNf = await run({ '/404.html': { status: 404, body: 'x' } });
  assert.deepEqual(failed(noNf), ['404.html: HTTP 200']);
  // a missing path that answers 200 is wrong
  const soft = await (async () => {
    const base = siteHandler();
    const s = await serve((req, res) => (req.url.includes('no-such-page') ? (res.writeHead(200), res.end(MARKED)) : base(req, res)));
    try { return await runSmoke(cfg(s.url), fastDeps()); } finally { await s.close(); }
  })();
  assert.deepEqual(failed(soft), ['a missing path returns HTTP 404']);
  // unreachable host: every fetch fails
  t = 0;
  const gone = await runSmoke(cfg('http://127.0.0.1:1/', { timeoutS: 20, pollS: 10 }), { ...clock });
  assert.equal(gone.status, 'fail');
  assert.match(gone.checks[0].detail, /timed out after 20s/);
});

test('fetchRetry retries 5xx and network errors, then throws; it returns a 404 for the caller to judge', async () => {
  let n = 0;
  const flaky = async () => (++n < 3 ? new Response('x', { status: 503 }) : new Response('ok', { status: 200 }));
  assert.equal((await fetchRetry('http://x/', { fetchFn: flaky, sleep: async () => {} })).status, 200);
  const down = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(fetchRetry('http://x/', { fetchFn: down, sleep: async () => {} }), /ECONNREFUSED/);
  assert.equal((await fetchRetry('http://x/', { fetchFn: async () => new Response('', { status: 404 }), sleep: async () => {} })).status, 404);
});

// ---- the workflows and the Node pin ---------------------------------------------------------------------------------
// Workflow text without comment lines, so the rules below judge what runs, not what is explained.
const wf = (name) => readFileSync(join(root, '.github/workflows', name), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const jobBlock = (text, id) => {
  const m = new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm').exec(text);
  assert.ok(m, `job ${id}`);
  return m[1];
};

test('workflows pin every action by full commit SHA, use no pull_request_target and set permissions', () => {
  for (const name of ['next-verify.yml', 'next-preview.yml']) {
    const text = wf(name);
    const uses = [...text.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((m) => m[1]);
    assert.ok(uses.length > 0);
    for (const u of uses) assert.match(u, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `${name}: ${u}`);
    assert.doesNotMatch(text, /pull_request_target/);
    assert.match(text, /^permissions:\n  contents: read$/m);
    assert.doesNotMatch(text, /contents: write|id-token|pages: write/);
    // no expression inside a run: block other than the ones that cannot carry attacker text
    for (const m of text.matchAll(/^\s*run: \|?\n?([\s\S]*?)(?=^\s*(?:- |\w[\w-]*:))/gm)) assert.doesNotMatch(m[1], /\$\{\{\s*github\.event\.(pull_request|head_commit|comment|issue)/, name);
  }
});

test('the deploy key is referenced once, by the deploy job of next-preview.yml, which runs in environment preview', () => {
  const verify = wf('next-verify.yml'), preview = wf('next-preview.yml');
  assert.doesNotMatch(verify, /secrets\./);
  assert.doesNotMatch(verify, /environment:/);
  assert.equal(preview.match(/secrets\./g).length, 1);
  assert.match(jobBlock(preview, 'deploy'), /environment:\n\s+name: preview[\s\S]*secrets\.PREVIEW_DEPLOY_KEY/);
  assert.doesNotMatch(jobBlock(preview, 'build'), /secrets\.|environment:/);
  assert.doesNotMatch(jobBlock(preview, 'smoke'), /secrets\.|environment:/);
  assert.match(preview, /on:\n  push:\n    branches: \[remake\/v3\]\n/);
  assert.doesNotMatch(preview, /pull_request/);
  assert.match(preview, /group: next-preview\n  cancel-in-progress: false/);
});

test('the deploy job runs repo code only in steps that do not see the key; every job has a timeout; a result job guards skips', () => {
  const preview = wf('next-preview.yml');
  const deploy = jobBlock(preview, 'deploy');
  const steps = deploy.split(/^      - /m).slice(1);
  const withKey = steps.filter((x) => x.includes('secrets.PREVIEW_DEPLOY_KEY'));
  assert.equal(withKey.length, 1);
  assert.doesNotMatch(withKey[0], /\b(node|npm|npx|bash) /, 'the key step runs only git, ssh, curl and jq');
  for (const name of ['next-verify.yml', 'next-preview.yml']) {
    const text = wf(name);
    assert.equal((text.match(/^    runs-on:/gm) || []).length, (text.match(/^    timeout-minutes:/gm) || []).length, `${name}: timeout on every job`);
  }
  assert.match(jobBlock(preview, 'preview-result'), /if: always\(\)/);
  assert.match(preview, /Preview FAILED/);
  assert.equal((wf('next-verify.yml').match(/ref: remake\/v3/g) || []).length, 3, 'gates read the base from the current remake/v3 tip');
});

test('next-verify has the named checks, the label-gated jobs, and never touches main-owned workflows', () => {
  const text = wf('next-verify.yml');
  for (const n of ['next-verify', 'old-paths', 'tier-gate', 'review-section']) assert.match(text, new RegExp(`^    name: ${n}$`, 'm'));
  for (const id of ['legacy-fast', 'full-trend', 'full-fuzz']) assert.match(jobBlock(text, id), /contains\(github\.event\.pull_request\.labels\.\*\.name, 'full-checks'\)/);
  assert.match(text, /npm run verify:fast/);
  assert.match(text, /branches: \[remake\/v3\]/);
  assert.match(text, /types:check: NOT RUN/);
});

test('.nvmrc is an exact version and engines still allows it', () => {
  const v = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
  assert.match(v, /^\d+\.\d+\.\d+$/);
  assert.equal(v, '26.12.0');
  const eng = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).engines.node;
  assert.equal(eng, '>=24');
});

test('the old workflows are byte-identical to the base branch', () => {
  for (const f of ['pages.yml', 'verify.yml']) {
    const r = spawnSync('git', ['diff', '--quiet', 'origin/wp-02-scaffold', '--', `.github/workflows/${f}`], { cwd: root });
    assert.ok(r.status === 0 || r.status === 129 || r.status === 128, `${f} differs from origin/wp-02-scaffold`);
  }
});
