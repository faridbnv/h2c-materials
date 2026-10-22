// WP-25: the page's side of data delivery, without a browser (the browser checks are tests/browser/delivery.spec.mjs): the completeness
// rule of the loader (whole set or nothing, one release), the details API (no partial set), and the stale-shell guard's inline script
// run against stand-ins for the browser's objects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DetailsIncomplete, REQUIRES, loadCited, loadDetails, loadParts } from '../../apps/public/src/parts.ts';
import { NetworkError, NoMaterialError, loadMaterial } from '../../apps/public/src/load.ts';
import { DataShapeError } from '../../apps/public/src/model.ts';
import { StaleShellError } from '../../apps/public/src/release.ts';
import { blockedBy } from '../../apps/public/src/useLoad.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const R = 'aaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbb';

// ---- a release in memory -----------------------------------------------------------------------------------------------------
const model = () => ({
  meta: { build: '2026-01-01', release: { id: R } },
  materials: [{ id: 'M001', headline: { density: { known: false } }, print: {} }, { id: 'M002', headline: {}, print: {} }],
  grades: [{ id: 'G001-01', estimate: { density: { evidence: [{ measurementIds: ['V1'] }] } } }],
  measurements: [], evidence: [], coverage: [], registry: { headlines: [] },
});
const parts = (release = R) => ({
  [`data/${release}/core.json`]: { kind: 'core', release, model: model() },
  [`data/${release}/estimates.json`]: { kind: 'estimates', release, status: 'available', withheld: null, overlay: { grades: { 'G001-01': { estimate: { density: { lo: 1, hi: 2 } } } }, materials: { M001: { headline: { density: { estimate: { lo: 1 } } }, print: {} } }, meta: { estimateModel: { v: 1 } } } },
  [`data/${release}/reference.json`]: { kind: 'reference', release, reference: { meta: { caveat: 'x' } } },
  ...Object.fromEntries(['M001', 'M002'].map((id) => [`data/${release}/detail/${id}.json`, { kind: 'detail', release, materialId: id, records: { material: { id } } }])),
});
/** A fetch over a map of url -> body, recording what it was asked. An unknown url is a 404; `over` replaces or removes (null) files. */
const server = (files, over = {}) => {
  const asked = [];
  const all = { ...files, ...over };
  const fetchFn = async (url) => {
    asked.push(url);
    const body = all[url];
    if (body === undefined || body === null) return { ok: false, status: 404, json: async () => ({}) };
    if (body instanceof Error) throw body;
    if (body.httpStatus) return { ok: false, status: body.httpStatus, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => structuredClone(body) };
  };
  return { fetchFn, asked };
};

test('the modes need what pack 02 section 9.6 says they need', () => {
  assert.deepEqual(REQUIRES, {
    strict: ['core'], explore: ['core'], exploreEstimates: ['core', 'estimates'], drawer: ['detail'], ashby: ['core', 'reference'],
    brief: ['core', 'detail:cited'], export: ['core', 'detail:cited'],
  });
});

test('completeness: a mode fetches exactly the parts it needs, and the result holds nothing else', async () => {
  const strict = server(parts());
  const a = await loadParts(R, 'strict', strict.fetchFn);
  assert.deepEqual(strict.asked, [`data/${R}/core.json`]);
  assert.equal(a.release, R);
  assert.equal(a.model.materials.length, 2);
  assert.equal('reference' in a, false);

  const est = server(parts());
  const b = await loadParts(R, 'exploreEstimates', est.fetchFn);
  assert.deepEqual(est.asked.sort(), [`data/${R}/core.json`, `data/${R}/estimates.json`]);
  assert.deepEqual(b.model.grades[0].estimate.density, { evidence: [{ measurementIds: ['V1'] }], lo: 1, hi: 2 }, 'the estimates are joined with what the core holds of the same field');
  assert.equal(b.model.materials[0].headline.density.estimate.lo, 1);
  assert.deepEqual(b.model.meta.estimateModel, { v: 1 });
  assert.deepEqual(b.estimates, { status: 'available', withheld: null }, 'whether the estimates were published whole reaches the caller');
  assert.equal('estimates' in a, false, 'a mode that did not ask for the estimates has no status to report');
  const record = { status: 'withheld', groups: [{ name: 'density' }], cells: { 'grades/G001-01/density': 'estimate withheld: model check failed' } };
  const held = await loadParts(R, 'exploreEstimates', server(parts(), { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], status: 'withheld', withheld: record } }).fetchFn);
  assert.deepEqual(held.estimates, { status: 'withheld', withheld: record }, 'the build\'s record of what was withheld arrives, so the view can label it (OQ-05 A)');

  const ashby = server(parts());
  const c = await loadParts(R, 'ashby', ashby.fetchFn);
  assert.deepEqual(ashby.asked.sort(), [`data/${R}/core.json`, `data/${R}/reference.json`]);
  assert.deepEqual(c.reference, { meta: { caveat: 'x' } });
});

test('completeness: one part missing, from another release, damaged or unreachable means no result at all, and says why', async () => {
  const cases = [
    ['estimates 404', { [`data/${R}/estimates.json`]: null }, StaleShellError],
    ['core 404', { [`data/${R}/core.json`]: null }, StaleShellError],
    ['estimates of another release', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], release: OTHER } }, StaleShellError],
    ['core of another release', { [`data/${R}/core.json`]: { ...parts()[`data/${R}/core.json`], release: OTHER } }, StaleShellError],
    ['core without its materials', { [`data/${R}/core.json`]: { kind: 'core', release: R, model: { ...model(), materials: undefined } } }, DataShapeError],
    ['a part of another kind', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/reference.json`] } }, DataShapeError],
    ['estimates for a grade the core lacks', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], overlay: { grades: { 'G999-01': {} }, materials: {}, meta: {} } } }, DataShapeError],
    ['estimates that say withheld and record nothing', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], status: 'withheld' } }, DataShapeError],
    ['estimates that record a withholding and say available', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], withheld: { status: 'withheld' } } }, DataShapeError],
    ['estimates with no status', { [`data/${R}/estimates.json`]: { ...parts()[`data/${R}/estimates.json`], status: undefined } }, DataShapeError],
    ['estimates that carry no overlay', { [`data/${R}/estimates.json`]: { kind: 'estimates', release: R } }, DataShapeError],
    ['the connection fails', { [`data/${R}/estimates.json`]: new TypeError('offline') }, NetworkError],
    ['a server error', { [`data/${R}/estimates.json`]: { httpStatus: 503 } }, NetworkError],
  ];
  for (const [what, over, kind] of cases) {
    await assert.rejects(loadParts(R, 'exploreEstimates', server(parts(), over).fetchFn), (e) => e instanceof kind, what);
  }
  await assert.rejects(loadParts(R, 'ashby', server(parts(), { [`data/${R}/reference.json`]: null }).fetchFn), StaleShellError, 'a reference part missing stops the Ashby mode');
  // The same release but a mode that does not need the broken part still works.
  await assert.doesNotReject(loadParts(R, 'strict', server(parts(), { [`data/${R}/estimates.json`]: null, [`data/${R}/reference.json`]: null }).fetchFn));
  await assert.rejects(loadParts(R, 'brief', server(parts()).fetchFn), /loadCited/, 'the brief needs details: it cannot be given the core alone');
  await assert.rejects(loadParts(R, 'drawer', server(parts()).fetchFn), /loadDetails/);
});

test('details: all of the shards asked for, or none; a stale part stays stale, anything else names the material it lacks', async () => {
  const ok = server(parts());
  const got = await loadDetails(R, ['M001', 'M002', 'M001'], ok.fetchFn);
  assert.deepEqual([...got.keys()], ['M001', 'M002'], 'asked once each, in order');
  assert.equal(ok.asked.length, 2);
  assert.equal(got.get('M002').materialId, 'M002');

  const blocked = server(parts(), { [`data/${R}/detail/M002.json`]: null });
  await assert.rejects(loadDetails(R, ['M001', 'M002'], blocked.fetchFn), StaleShellError, 'a 404 is a stale page: the guard reloads');
  const mismatched = server(parts(), { [`data/${R}/detail/M001.json`]: { kind: 'detail', release: OTHER, materialId: 'M001', records: {} } });
  await assert.rejects(loadDetails(R, ['M001', 'M002'], mismatched.fetchFn), StaleShellError);
  const down = server(parts(), { [`data/${R}/detail/M002.json`]: new TypeError('offline') });
  await assert.rejects(loadDetails(R, ['M001', 'M002'], down.fetchFn), (e) => e instanceof DetailsIncomplete && e.materialId === 'M002' && /nothing is emitted/.test(e.message));
  // Stale wins wherever it sits: a failure listed before it must not hide it, or the stale page would not reload.
  const mixed = server(parts(), { [`data/${R}/detail/M001.json`]: new TypeError('offline'), [`data/${R}/detail/M002.json`]: null });
  await assert.rejects(loadDetails(R, ['M001', 'M002'], mixed.fetchFn), StaleShellError, 'a failure before a 404 does not hide it');
  const wrong = server(parts(), { [`data/${R}/detail/M001.json`]: { kind: 'detail', release: R, materialId: 'M002', records: {} } });
  await assert.rejects(loadDetails(R, ['M001'], wrong.fetchFn), (e) => e instanceof DetailsIncomplete && e.materialId === 'M001');
  await assert.rejects(loadDetails(R, ['M001', 'not-a-material'], ok.fetchFn), DataShapeError, 'an address that is not a material is refused before anything is fetched');
  assert.equal(ok.asked.length, 2, 'and nothing was fetched for it');
});

test('the brief and the export: the core and every cited detail together, or nothing (details blocked: no result, so nothing to emit)', async () => {
  const ok = await loadCited(R, 'export', ['M001', 'M002'], server(parts()).fetchFn);
  assert.equal(ok.model.materials.length, 2);
  assert.deepEqual([...ok.details.keys()], ['M001', 'M002']);
  const blocked = server(parts(), { [`data/${R}/detail/M001.json`]: null, [`data/${R}/detail/M002.json`]: null });
  let emitted = 0;
  await assert.rejects(loadCited(R, 'brief', ['M001', 'M002'], blocked.fetchFn).then((loaded) => { emitted += loaded.details.size; }), StaleShellError);
  assert.equal(emitted, 0);
  // the core arriving is not enough while one citation is missing
  await assert.rejects(loadCited(R, 'export', ['M001', 'M002'], server(parts(), { [`data/${R}/detail/M002.json`]: null }).fetchFn).then(() => { emitted++; }), StaleShellError);
  assert.equal(emitted, 0);
  // stale wins over another failure in the other half, too
  const mixed = server(parts(), { [`data/${R}/core.json`]: new TypeError('offline'), [`data/${R}/detail/M002.json`]: null });
  await assert.rejects(loadCited(R, 'export', ['M001', 'M002'], mixed.fetchFn), StaleShellError);
  const offline = server(parts(), { [`data/${R}/core.json`]: new TypeError('offline') });
  await assert.rejects(loadCited(R, 'export', ['M001', 'M002'], offline.fetchFn), NetworkError, 'with nothing stale, the failure is reported as it is');
});

const resultFile = (release = R) => ({
  kind: 'result', release, snapshot: '2026-01-01', template: { name: 't', description: 'd', notChecked: 'n', caseId: 'c' }, requirements: [],
  counts: { pass: 0, fail: 0, unknown: 0, screened: 0, total: 0 }, materials: [],
});

test('material: a 404 is a stale page only when the release is gone; where the release answers, the address names no material', async () => {
  const files = { ...parts(), [`data/${R}/result.json`]: resultFile() };
  await assert.rejects(loadMaterial(R, 'M999', server(files).fetchFn), (e) => e instanceof NoMaterialError && e instanceof DataShapeError && /M999/.test(e.message), 'the release is here, the material is not');
  const gone = server({});
  await assert.rejects(loadMaterial(R, 'M001', gone.fetchFn), StaleShellError, 'the release is gone too: stale');
  assert.deepEqual(gone.asked, [`data/${R}/material/M001.json`, `data/${R}/result.json`], 'the same release is probed');
  const other = server({ [`data/${R}/result.json`]: resultFile(OTHER) });
  await assert.rejects(loadMaterial(R, 'M001', other.fetchFn), StaleShellError, 'results of another release: stale');
  const offline = server({ [`data/${R}/result.json`]: new TypeError('offline') });
  await assert.rejects(loadMaterial(R, 'M001', offline.fetchFn), StaleShellError, 'a probe that fails leaves the 404 to be what it was');
  await assert.rejects(loadMaterial(R, 'M001', server({ [`data/${R}/material/M001.json`]: new TypeError('offline') }).fetchFn), NetworkError);
  await assert.rejects(loadMaterial(R, 'x', server(files).fetchFn), (e) => e instanceof DataShapeError && !(e instanceof NoMaterialError), 'a malformed address is checked before anything is fetched');
});

test('what the view says: a missing shard and a missing material each have their own words, and an unexpected error is logged', () => {
  const incomplete = blockedBy(new DetailsIncomplete('M002', new NetworkError('data/x', new Error('boom'))));
  assert.equal(incomplete.kind, 'failed');
  assert.match(incomplete.why, /detail of M002.*nothing is emitted.*could not fetch data\/x/);
  assert.doesNotMatch(incomplete.why, /unexpected/);
  assert.deepEqual(blockedBy(new NoMaterialError('M999')), { kind: 'failed', why: 'the address: names no material in this release (M999)', noMaterial: true });
  assert.equal(blockedBy(new DataShapeError('a', 'b')).noMaterial, undefined);
  const logged = [];
  const original = console.error;
  console.error = (...args) => { logged.push(args); };
  try {
    const stopped = blockedBy(new RangeError('surprise'));
    assert.match(stopped.why, /unexpected.*surprise/);
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1, 'the error is in the console, not only in a sentence');
  assert.ok(logged[0][0] instanceof RangeError);
});

test('the page never fetches release.json (it is the smoke test\'s manifest) and names its release inline in every page', () => {
  const src = join(root, 'apps/public/src');
  for (const file of readdirSync(src)) assert.doesNotMatch(readFileSync(join(src, file), 'utf8'), /['"`][^'"`\s]*release\.json/, `${file} must not ask for release.json`);
  for (const page of ['index.html', 'material.html']) {
    const html = readFileSync(join(root, 'apps/public', page), 'utf8');
    assert.match(html, /<meta name="h2c-release" content="__H2C_RELEASE__">/);
    assert.ok(html.indexOf('__H2C_RELEASE__') < html.indexOf('__H2C_GUARD__'), `${page}: the guard reads the release the page names, so the release comes first`);
  }
});

// ---- the inline stale-shell guard ---------------------------------------------------------------------------------------------
const guardSource = readFileSync(join(root, 'apps/public/guard.inline.js'), 'utf8')
  .replace('__H2C_STALE_HEADING__', '"A newer version was published"').replace('__H2C_STALE_BODY__', '"Reload."').replace('__H2C_RELOAD__', '"Reload"');

/** The guard run against stand-ins; returns what a test needs to drive and read it. */
function pageWithGuard({ release = R, storage = new Map(), storageThrows = false } = {}) {
  const log = { reloads: 0, notices: [], prevented: 0 };
  const handlers = new Map();
  const element = (tag) => ({ tag, attrs: {}, style: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, append(...c) { this.children.push(...c); }, addEventListener() {}, set textContent(v) { this.text = v; } });
  const body = { prepend(el) { log.notices.push(el); } };
  const sessionStorage = {
    getItem: (k) => { if (storageThrows) throw new Error('blocked'); return storage.get(k) ?? null; },
    setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); storage.set(k, v); },
    removeItem: (k) => { storage.delete(k); },
  };
  const document = {
    body,
    querySelector: (sel) => (sel.startsWith('meta[name="h2c-release"]') ? { getAttribute: () => release } : log.notices.find((n) => n.attrs['data-state'] === 'stale') ?? null),
    createElement: element,
  };
  const window = {};
  const location = { reload: () => { log.reloads++; } };
  new Function('window', 'document', 'sessionStorage', 'location', 'addEventListener', guardSource)(window, document, sessionStorage, location, (type, fn) => handlers.set(type, fn));
  return {
    log, storage, guard: window.h2c,
    scriptFailed: (tagName = 'SCRIPT') => handlers.get('error')({ target: { tagName } }),
    preloadError: () => handlers.get('vite:preloadError')({ preventDefault: () => { log.prevented++; } }),
  };
}

test('guard: a page reloads once per release, then says what happened; a shell of another release has its own turn', () => {
  const p = pageWithGuard();
  assert.equal(p.guard.reloadOnce(), true);
  assert.equal(p.log.reloads, 1);
  assert.equal(p.guard.reloadOnce(), true, 'while the reload is under way another failure is the same event');
  assert.equal(p.log.reloads, 1, 'and does not reload again');
  // The page after that reload (same tab, same storage): the shell is still the old one.
  const again = pageWithGuard({ storage: p.storage });
  assert.equal(again.guard.reloadOnce(), false, 'the reload did not help (the shell is still old): no loop');
  assert.equal(again.log.reloads, 0);
  // A mark that names another release is forgotten once this shell's data has arrived, so a later publish can reload again.
  const q = pageWithGuard({ release: OTHER, storage: new Map([['h2c-reloaded', R]]) });
  q.guard.settled();
  assert.equal(q.storage.has('h2c-reloaded'), false);
  assert.equal(q.guard.reloadOnce(), true);
});

test('guard: a stale shell that reloaded and then loaded its data keeps its mark, so its hash does not reload it in a loop', () => {
  const p = pageWithGuard({ storage: new Map([['h2c-reloaded', R]]) });
  p.guard.settled();
  assert.equal(p.storage.get('h2c-reloaded'), R, 'the mark names this shell');
  p.preloadError();
  assert.equal(p.log.reloads, 0, 'a later failed chunk does not reload it again');
  assert.equal(p.log.notices.length, 1);
});

test('guard: a script or stylesheet that does not load reloads once and then shows the notice; other elements are none of its business', () => {
  const p = pageWithGuard();
  p.scriptFailed('IMG');
  assert.equal(p.log.reloads, 0);
  p.scriptFailed('SCRIPT');
  assert.equal(p.log.reloads, 1);
  assert.equal(p.log.notices.length, 0);
  p.scriptFailed('LINK');
  assert.equal(p.log.reloads, 1, 'not twice');
  assert.equal(p.log.notices.length, 0, 'two assets failing together: the reload is under way, no notice flashes');
  const after = pageWithGuard({ storage: p.storage });
  after.scriptFailed('LINK');
  assert.equal(after.log.reloads, 0);
  assert.equal(after.log.notices.length, 1);
  assert.equal(after.log.notices[0].attrs['data-testid'], 'load-notice');
  assert.equal(after.log.notices[0].attrs.role, 'alert');
  after.scriptFailed('SCRIPT');
  assert.equal(after.log.notices.length, 1, 'one notice');
});

test('guard: a page that has loaded ignores later failures of other things; a preload error takes the same path as a script failure', () => {
  const p = pageWithGuard();
  p.guard.settled();
  p.scriptFailed('SCRIPT');
  assert.equal(p.log.reloads, 0);
  const q = pageWithGuard();
  q.preloadError();
  assert.equal(q.log.prevented, 1, 'the default error is cancelled');
  assert.equal(q.log.reloads, 1);
  const r = pageWithGuard({ storage: q.storage });
  r.preloadError();
  assert.equal(r.log.reloads, 0);
  assert.equal(r.log.notices.length, 1);
});

test('guard: where storage is blocked it cannot remember a reload, so it never reloads (no loop) and says so', () => {
  const p = pageWithGuard({ storageThrows: true });
  assert.equal(p.guard.reloadOnce(), false);
  p.scriptFailed('SCRIPT');
  assert.equal(p.log.reloads, 0);
  assert.equal(p.log.notices.length, 1);
});
