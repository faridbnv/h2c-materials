// WP-22: the browser suite's own logic, without a browser. The suite is an oracle; these tests are how we know the oracle can say no:
// the server refuses what it must, the verdict is never a pass for a skipped or unreported check, a view that moved or went missing
// is named, the adapters meet their contract, and a page that threw or failed to load fails its test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { ALLOWED_SKIPS, allowanceFor } from '../browser/allowed-skips.mjs';
import { BEHAVIOURS, SELECTOR_STEPS, assertAdapter, isUnsupported, unsupported } from '../browser/lib/adapters/contract.mjs';
import { createNewPublic } from '../browser/lib/adapters/new-public.mjs';
import { createOldSelector } from '../browser/lib/adapters/old-selector.mjs';
import TriStateReporter, { verdict } from '../browser/lib/reporter.mjs';
import { BASE_PATHS, CACHE_CONTROL, startServer } from '../browser/lib/server.mjs';
import { siteProblems } from '../browser/lib/site.mjs';
import { VIEW_GROUPS, baselineNames, compareViews, mask } from '../browser/lib/views.mjs';
import { watchPage } from '../browser/lib/watch.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = () => mkdtempSync(join(tmpdir(), 'wp22-'));

const get = (origin, path, headers = {}) => new Promise((resolve, reject) => {
  const { hostname, port } = new URL(origin);
  httpRequest({ hostname, port, path, headers }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  }).on('error', reject).end();
});

test('server: one site under two base paths, gzip and max-age=600, folder index, redirect, 404.html, nothing outside the bases', async () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, 'index.html'), `<h1>root</h1>${'x'.repeat(500)}`);
    writeFileSync(join(dir, '404.html'), '<h1>not here</h1>');
    mkdirSync(join(dir, 'materials'));
    writeFileSync(join(dir, 'materials', 'index.html'), '<h1>materials</h1>');
    writeFileSync(join(dir, 'data.json'), JSON.stringify({ a: 1 }));
    const server = await startServer({ site: dir });
    try {
      for (const base of BASE_PATHS) {
        const page = await get(server.origin, base, { 'accept-encoding': 'gzip' });
        assert.equal(page.status, 200);
        assert.equal(page.headers['cache-control'], CACHE_CONTROL);
        assert.equal(page.headers['content-encoding'], 'gzip');
        assert.match(gunzipSync(page.body).toString(), /<h1>root<\/h1>/);
        assert.match((await get(server.origin, `${base}materials/`)).body.toString(), /materials/);
        assert.equal((await get(server.origin, `${base}data.json`)).headers['content-type'], 'application/json; charset=utf-8');
        const missing = await get(server.origin, `${base}nothing.html`);
        assert.equal(missing.status, 404);
        assert.match(missing.body.toString(), /not here/);
        const redirect = await get(server.origin, base.slice(0, -1));
        assert.equal(redirect.status, 301);
        assert.equal(redirect.headers.location, base);
      }
      assert.equal((await get(server.origin, '/')).status, 404, 'the bare origin must not answer');
      assert.equal((await get(server.origin, '/h2c-materials-next/')).status, 404, 'a base path nobody mounted must not answer');
      for (const path of [`${BASE_PATHS[0]}../../etc/passwd`, `${BASE_PATHS[0]}%2e%2e/%2e%2e/etc/passwd`, `${BASE_PATHS[0]}..%2f..%2fetc%2fpasswd`, `${BASE_PATHS[0]}%00`]) {
        const status = (await get(server.origin, path)).status;
        assert.ok(status === 400 || status === 404, `${path} answered ${status}`);
      }
      assert.ok(server.requests.length > 8, 'every request is logged');
    } finally { await server.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('server: a folder with no index.html is refused to start, and a base path must be written with both slashes', async () => {
  const dir = tmp();
  try {
    await assert.rejects(startServer({ site: dir }), /no index\.html/);
    writeFileSync(join(dir, 'index.html'), 'x');
    await assert.rejects(startServer({ site: dir, bases: ['/no-trailing-slash'] }), /must start and end with a slash/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verdict: PASS only when everything planned reported and passed; a skip, a gap, an empty run or a failure is never a pass', () => {
  const pass = (n) => Array.from({ length: n }, () => ({ status: 'pass' }));
  assert.equal(verdict({ planned: 3, tests: pass(3) }).status, 'pass');
  assert.equal(verdict({ planned: 0, tests: [] }).status, 'not-run', 'nothing planned is not a pass');
  assert.equal(verdict({ planned: 3, tests: pass(2) }).status, 'not-run', 'a planned check that never reported is not run');
  assert.equal(verdict({ planned: 3, tests: [...pass(2), { status: 'fail' }] }).status, 'fail');
  assert.equal(verdict({ planned: 3, tests: [...pass(2), { status: 'skipped', allowed: false }] }).status, 'skipped', 'an unnamed skip is not a pass');
  assert.equal(verdict({ planned: 3, tests: [...pass(2), { status: 'skipped', allowed: true }] }).status, 'pass', 'a named skip is reported but does not fail the run');
  assert.equal(verdict({ planned: 3, tests: [{ status: 'skipped', allowed: true }, { status: 'skipped', allowed: true }, { status: 'skipped', allowed: true }] }).status, 'not-run', 'all skipped is not run');
  assert.equal(verdict({ planned: 3, tests: pass(3), interrupted: true }).status, 'not-run');
  assert.equal(verdict({ planned: 3, tests: [...pass(2), { status: 'not-run' }] }).status, 'not-run');
  assert.deepEqual(verdict({ planned: 4, tests: [...pass(2), { status: 'fail' }, { status: 'skipped', allowed: true }] }).counts, { planned: 4, pass: 2, fail: 1, skipped: 1, allowedSkipped: 1, notRun: 0 });
});

test('skips: only the named ones are allowed, and each says why', () => {
  assert.ok(allowanceFor('new selector: Ashby decision workspace'));
  assert.ok(allowanceFor('new selector: material pages, laptop'));
  assert.ok(allowanceFor('new selector: material pages: the return trip'));
  assert.equal(allowanceFor('new selector: family rail'), null, 'a step the new selector answers may not be skipped');
  assert.equal(allowanceFor('old selector: Ashby decision workspace'), null);
  assert.equal(allowanceFor('public view: the results page'), null);
  for (const a of ALLOWED_SKIPS) assert.ok(a.reason.length > 20 && a.match instanceof RegExp);
});

test('views: every baseline view belongs to exactly one group, so no view can fall out of the suite', () => {
  const names = baselineNames();
  assert.equal(names.length, 114, 'the old harness records 114 views');
  for (const name of names) assert.equal(Object.values(VIEW_GROUPS).filter((re) => re.test(name)).length, 1, `${name} belongs to ${Object.values(VIEW_GROUPS).filter((re) => re.test(name)).length} groups`);
  for (const [group, re] of Object.entries(VIEW_GROUPS)) assert.ok(names.some((n) => re.test(n)), `${group} owes no view`);
});

test('views: a view that moved, went missing, was never owed or is empty is named; an equal one passes; masks match the old harness', () => {
  const dir = tmp();
  try {
    const texts = { '01-a': 'COUNT 5\nSTATUS x\nrow one\nrow two', '01-b': 'COUNT 7\nSTATUS y\nrow one\nbuild 2026-10-21 release 7c6da496722d' };
    for (const [k, t] of Object.entries(texts)) writeFileSync(join(dir, `${k}.txt`), `${mask(t)}\n`);
    const ok = compareViews(texts, /^01-/, dir);
    assert.deepEqual(ok.problems, []);
    assert.equal(ok.checked, 2);
    assert.match(readFileSync(join(dir, '01-b.txt'), 'utf8'), /build <date> release <id>/);
    const moved = compareViews({ ...texts, '01-a': 'COUNT 6\nSTATUS x\nrow one\nrow two' }, /^01-/, dir);
    assert.match(moved.problems.join('\n'), /01-a differs[\s\S]*- COUNT 5[\s\S]*\+ COUNT 6/);
    assert.match(compareViews({ '01-a': texts['01-a'] }, /^01-/, dir).problems.join('\n'), /did not produce: 01-b/);
    assert.match(compareViews({ ...texts, '01-c': 'x\ny\nz' }, /^01-/, dir).problems.join('\n'), /does not have: 01-c/);
    assert.match(compareViews({ ...texts, '01-a': 'short' }, /^01-/, dir).problems.join('\n'), /01-a is empty/);
    assert.match(compareViews({}, /^99-/, dir).problems.join('\n'), /no baseline view matches/);
    assert.throws(() => compareViews(texts, /^01-/, join(dir, 'missing')), /no baseline/);
    // What the page does not draw yet is named: a view it does not owe is left out, and a line of an owed view it does not have is left out of the baseline.
    const partial = { '01-a': texts['01-a'] };
    assert.deepEqual(compareViews(partial, /^01-/, dir, { pattern: /^01-b$/, reason: 'later' }).problems, []);
    assert.match(compareViews({ ...partial, '01-b': 'x\ny\nz' }, /^01-/, dir, { pattern: /^01-b$/, reason: 'later' }).problems.join('\n'), /does not have: 01-b/, 'a page that produced a view it does not owe is still told');
    const lines = compareViews({ ...texts, '01-a': 'COUNT 5\nSTATUS x\nrow one' }, /^01-/, dir, { lines: { '01-a': ['row two'] }, reason: 'later' });
    assert.deepEqual(lines.problems, [], 'a baseline line the page does not draw yet is not owed');
    assert.match(compareViews({ ...texts, '01-a': 'COUNT 5\nSTATUS x\nrow one' }, /^01-/, dir).problems.join('\n'), /01-a differs[\s\S]*- row two/, 'and is owed when nothing says otherwise');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('adapters: the old page offers every step and behaviour; the new page offers all but the steps it names as not answered; a bare object does not meet the contract', () => {
  const stub = new EventEmitter();
  const old = assertAdapter(createOldSelector({ page: stub, origin: 'http://127.0.0.1:1', base: '/h2c-materials/', meta: {}, root }));
  for (const name of SELECTOR_STEPS) assert.equal(typeof old.steps[name], 'function', name);
  for (const name of BEHAVIOURS) assert.equal(typeof old.behaviours[name], 'function', name);
  assert.equal(typeof old.fuzzTab, 'function');
  assert.ok(old.axeTargets().length >= 16);
  assert.equal(old.pageUrl, 'http://127.0.0.1:1/h2c-materials/');
  const next = assertAdapter(createNewPublic({ page: stub, origin: 'http://127.0.0.1:1', base: '/h2c-material-temp-page/', meta: {}, root }));
  const notYet = ['selectorAshby', 'materialPages', 'returnTrip'];
  for (const name of SELECTOR_STEPS) assert.ok(notYet.includes(name) ? isUnsupported(next.steps[name]) : typeof next.steps[name] === 'function', `${name}: the new page answers it, or says why it cannot`);
  for (const name of BEHAVIOURS) assert.equal(typeof next.behaviours[name], 'function', name);
  assert.equal(typeof next.fuzzTab, 'function');
  assert.deepEqual(Object.keys(next.notOwed).sort(), ['selectorLayout', 'selectorRanked', 'selectorTemplates'], 'what the new page does not owe is named, step by step');
  assert.equal(next.viewUrl, 'http://127.0.0.1:1/h2c-material-temp-page/v3/');
  assert.throws(() => assertAdapter({ id: 'x', steps: {}, behaviours: {} }), /does not meet the contract/);
  assert.throws(() => assertAdapter({ ...next, steps: { ...next.steps, selectorFamily: unsupported('') } }), /selectorFamily/, 'an unsupported step without a reason is refused');
  assert.throws(() => assertAdapter({ ...next, steps: { ...next.steps, somethingElse: () => {} } }), /does not name/);
});

/** A page that only emits events, to see what the watcher makes of them. */
function fakePage() {
  const page = new EventEmitter();
  const frame = { address: 'http://x/start' };
  frame.url = () => frame.address;
  let n = 0;
  page.mainFrame = () => frame;
  page.navigate = () => { frame.address = `http://x/page-${++n}`; page.emit('framenavigated', frame); };
  return page;
}
const message = (type, text, url = '') => ({ type: () => type, text: () => text, location: () => ({ url }) });
const response = (status, url) => ({ status: () => status, url: () => url });
const failedRequest = (url, errorText) => ({ url: () => url, failure: () => ({ errorText }) });

test('watch: a script error, a console error, an HTTP error and a failed request each fail the test; a missing favicon does not', () => {
  const clean = () => { const page = fakePage(); return { page, w: watchPage(page) }; };
  { const { page, w } = clean(); w.assertClean(); page.emit('console', message('log', 'hello')); w.assertClean(); }
  { const { page, w } = clean(); page.emit('pageerror', new Error('boom')); assert.throws(() => w.assertClean(), /script error: Error: boom/); }
  { const { page, w } = clean(); page.emit('console', message('error', 'bad', 'http://x/a.js')); assert.throws(() => w.assertClean(), /console error: bad/); }
  { const { page, w } = clean(); page.emit('response', response(500, 'http://x/data.json')); assert.throws(() => w.assertClean(), /HTTP 500: http:\/\/x\/data\.json/); }
  { const { page, w } = clean(); page.emit('response', response(404, 'http://x/favicon.ico')); w.assertClean(); }
  { const { page, w } = clean(); page.emit('crash'); assert.throws(() => w.assertClean(), /crashed/); }
  { const { page, w } = clean(); const r = failedRequest('http://x/chunk.js', 'net::ERR_CONNECTION_REFUSED'); page.emit('request', r); page.emit('requestfailed', r); assert.throws(() => w.assertClean(), /request failed/); }
});

test('watch: a request cut off by the next navigation is not the page\'s fault, one cut off while the page stayed is', () => {
  const page = fakePage(); const w = watchPage(page);
  const left = failedRequest('http://x/old.js', 'net::ERR_ABORTED'); page.emit('request', left); page.navigate(); page.emit('requestfailed', left);
  w.assertClean();
  const stayed = failedRequest('http://x/new.js', 'net::ERR_ABORTED'); page.emit('request', stayed); page.emit('requestfailed', stayed);
  assert.throws(() => w.assertClean(), /request failed \(net::ERR_ABORTED\): http:\/\/x\/new\.js/);
});

test('watch: an expected fault is recorded and allowed, one that never came fails, and dialogs are accepted and kept', async () => {
  const page = fakePage(); const w = watchPage(page);
  w.allow(/gone\.json/, 'withheld on purpose');
  assert.throws(() => w.assertClean(), /expected a fault matching .*gone/, 'an allowance nothing used means the failure the test needs did not happen');
  page.emit('response', response(404, 'http://x/gone.json'));
  w.assertClean();
  assert.equal(w.faults.length, 1);
  let accepted = false;
  page.emit('dialog', { message: () => 'Could not load', accept: async () => { accepted = true; } });
  assert.deepEqual(w.dialogs, ['Could not load']);
  assert.ok(accepted);
});

test('site: a site missing a piece is not whole, and the problems name what is missing', () => {
  const dir = tmp();
  try {
    assert.match(siteProblems(dir).join('\n'), /index\.html is missing[\s\S]*v3\/release\.json is missing/);
    assert.deepEqual(readdirSync(dir), [], 'checking a site writes nothing into it');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('reporter: a skip is named by the title after the file, so the allow-list matches what Playwright really reports', () => {
  const reporter = new TriStateReporter();
  reporter.onBegin({ projects: [{ name: 'live-path' }] }, { allTests: () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
  const test = (id, path, annotations = []) => ({ id, titlePath: () => ['', 'live-path', 'views.spec.mjs', ...path], annotations, parent: { project: () => ({ name: 'live-path' }) } });
  reporter.onTestEnd(test('a', ['new selector: Ashby decision workspace'], [{ type: 'skip', description: 'not run: WP-27' }]), { status: 'skipped', duration: 1 });
  reporter.onTestEnd(test('b', ['old selector: Ashby decision workspace'], [{ type: 'skip', description: 'x' }]), { status: 'skipped', duration: 1 });
  reporter.onTestEnd(test('c', ['old selector: other']), { status: 'failed', duration: 1, error: { message: 'boom' } });
  const [a, b, c] = [...reporter.tests.values()];
  assert.equal(a.title, 'new selector: Ashby decision workspace');
  assert.equal(a.allowed, true, 'the named skip is recognised');
  assert.equal(b.allowed, false, 'an old-selector skip is not named');
  assert.equal(c.status, 'fail');
  assert.equal(verdict({ planned: 2, tests: [{ status: 'fail' }, { status: 'fail' }] }).status, 'fail', 'a run in which everything failed is FAIL, not NOT RUN');
});

test('watch: a dialog nobody expected fails the page, an expected one is claimed, and one that never came fails', () => {
  const page = fakePage(); const w = watchPage(page);
  page.emit('dialog', { message: () => 'This link could not be read', accept: async () => {} });
  assert.throws(() => w.assertClean(), /unexpected dialog: This link could not be read/);
  const claimed = fakePage(); const c = watchPage(claimed);
  c.allowDialog(/could not be read/, 'under test');
  assert.throws(() => c.assertClean(), /expected a dialog matching/);
  claimed.emit('dialog', { message: () => 'This link could not be read', accept: async () => {} });
  c.assertClean();
});

test('watch: a change of fragment is the same document, so a request aborted there is still the page\'s fault', () => {
  const page = fakePage(); const frame = page.mainFrame(); frame.address = 'http://x/a/#one';
  const w = watchPage(page);
  page.emit('framenavigated', frame);
  const r = failedRequest('http://x/late.js', 'net::ERR_ABORTED'); page.emit('request', r);
  frame.address = 'http://x/a/#two'; page.emit('framenavigated', frame);
  page.emit('requestfailed', r);
  assert.throws(() => w.assertClean(), /ERR_ABORTED/);
});
