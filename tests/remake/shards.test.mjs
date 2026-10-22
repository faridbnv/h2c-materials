// WP-25: the parts of a release (packages/publish/src/shards.ts, apps/public/tools/shards.ts). The declarations CORE_FIELDS and
// ESTIMATE_FIELDS cut the compiled database; the rest of each row travels in the detail shard; the page joins them. What is
// proved here: the cut loses nothing (join of the two halves is the row), the development guard names a field the part lacks,
// no local path is published, and the estimates fit the core they were cut from. The engine's answers on the cut are the
// parity check's (npm run parity -- --surface core; tests/parity/core.test.mjs).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { CORE_FIELDS, ESTIMATE_FIELDS } from '../../packages/domain/src/core/core-fields.ts';
import { EstimatesDoNotFitError, MissingFieldError, applyEstimates, guarded, join as joinRows, mergeSpecs, omit, overlayOf, prune, pruneOverlay, publicize } from '../../packages/publish/src/shards.ts';
import { makeShards } from '../../apps/public/tools/shards.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));

/** The path of the first place two values differ, or null. (assert.deepEqual would build a diff of a database as its message.) */
function firstDifference(a, b, path = '') {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return `${path}: ${JSON.stringify(a)?.slice(0, 80)} against ${JSON.stringify(b)?.slice(0, 80)}`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a) || !(k in b)) { if (a[k] === undefined && b[k] === undefined) continue; return `${path}.${k}: only on the ${k in a ? 'left' : 'right'}`; }
    const d = firstDifference(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}
const same = (a, b, what) => assert.equal(firstDifference(a, b), null, what);

let db;
let shards;

before(() => {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
  // The parts are made from a database stamped with a release, as the build stamps it.
  db.meta.release = { id: 'aaaaaaaaaaaa', digest: 'a'.repeat(64), inputs: {} };
  shards = makeShards(db, { meta: { caveat: 'x' } }, 'aaaaaaaaaaaa');
});

test('prune keeps what the declaration names and nothing else; a named field a row lacks stays absent', () => {
  const row = { id: 'M1', name: 'n', extra: 1, nested: { a: 1, b: 2 }, list: [{ x: 1, y: 2 }] };
  assert.deepEqual(prune(row, { id: true, nested: { a: true }, list: { x: true }, missing: true }), { id: 'M1', nested: { a: 1 }, list: [{ x: 1 }] });
  assert.deepEqual(prune({ k1: { a: 1, b: 2 }, k2: { a: 3 } }, { '*': { a: true } }), { k1: { a: 1 }, k2: { a: 3 } }, 'a wildcard covers every key');
  assert.deepEqual(prune({ k1: 1, k2: 2 }, { k1: true, '*': true }), { k1: 1, k2: 2 });
});

test('prune and omit are halves: join(prune, omit) is the value, on every row of the real database, whatever the declaration', () => {
  for (const section of ['materials', 'grades', 'measurements', 'evidence', 'coverage', 'polymerEvidence']) {
    const spec = CORE_FIELDS[section];
    for (const row of db[section] ?? []) {
      same(joinRows(prune(row, spec), omit(row, spec)), row, `${section} ${row.id}`);
    }
  }
  assert.equal(omit({ a: 1 }, true), undefined, 'a value carried whole leaves nothing');
  assert.deepEqual(omit([{ a: 1, b: 2 }, { a: 3 }], { a: true }), [{ b: 2 }, null], 'an array keeps its length, with null where nothing is left');
});

test('the core carries what it declares and no row of it is a copy of the database', () => {
  const core = JSON.parse(shards.files.get('core.json'));
  assert.equal(core.kind, 'core');
  assert.equal(core.release, 'aaaaaaaaaaaa');
  assert.deepEqual(Object.keys(core.model).sort(), Object.keys(CORE_FIELDS).filter((k) => k in db).sort());
  // A field the engine does not read is not in it.
  assert.ok(!('composition' in core.model.grades[0]), 'grades[].composition is not read by any decision');
  assert.ok(!('locator' in core.model.measurements[0]));
  assert.equal(core.model.measurements.length, db.measurements.length);
});

test('the detail of a material is the rest of its rows plus the sources they cite, and joined with the core it is the whole record', () => {
  const core = JSON.parse(shards.files.get('core.json')).model;
  const detail = JSON.parse(shards.files.get('detail/M001.json'));
  assert.equal(detail.kind, 'detail');
  assert.equal(detail.materialId, 'M001');
  const coreRows = new Map(core.measurements.map((m) => [m.id, m]));
  const original = new Map(db.measurements.map((m) => [m.id, m]));
  assert.ok(detail.records.measurements.length > 100);
  for (const rest of detail.records.measurements) same(joinRows(coreRows.get(rest.id), rest), original.get(rest.id), rest.id);
  const cited = new Set(detail.records.sources.map((s) => s.id));
  for (const m of db.measurements.filter((x) => x.materialId === 'M001')) assert.ok(cited.has(m.sourceId), `${m.id} cites ${m.sourceId}, which the detail must hold`);
  assert.equal(shards.manifest.files.detail.count, db.materials.length);
  assert.equal(shards.files.size, 3 + db.materials.length);
});

test('the estimates part puts back what the stage wrote, on the core, and the result is the database where the engine looks', () => {
  const core = structuredClone(prune(db, CORE_FIELDS));
  const estimates = JSON.parse(shards.files.get('estimates.json'));
  assert.equal(estimates.kind, 'estimates');
  assert.equal(estimates.status, 'available');
  applyEstimates(core, estimates.overlay);
  const reads = mergeSpecs(CORE_FIELDS, ESTIMATE_FIELDS);
  same(core, prune(db, reads), 'core + estimates is the database cut to everything an answer reads');
  // A smaller core than the estimates were cut from is refused, not skipped.
  const lonely = structuredClone(prune(db, CORE_FIELDS));
  lonely.grades = lonely.grades.slice(1);
  assert.throws(() => applyEstimates(lonely, estimates.overlay), EstimatesDoNotFitError);
});

test('the overlay is exactly the fields the estimate stage writes', () => {
  const overlay = overlayOf(db);
  const grade = db.grades.find((g) => g.estimate && Object.keys(g.estimate).length);
  assert.deepEqual(Object.keys(overlay.grades[grade.id]).sort(), ['estimate', 'estimateVersion', ...(grade.estimateWithheld ? ['estimateWithheld'] : [])].sort());
  assert.ok(overlay.meta.estimateModel);
  const cut = pruneOverlay(overlay, ESTIMATE_FIELDS);
  assert.ok(JSON.stringify(cut).length < JSON.stringify(overlay).length, 'the cut overlay is smaller than the whole');
});

test('the development guard throws on a field the part lacks but the data holds, and says which', () => {
  const model = guarded(db, { materials: { id: true, name: true }, meta: { build: true } }, 'core');
  assert.equal(model.materials[0].id, 'M001');
  assert.equal(model.materials[0].name, db.materials[0].name);
  assert.throws(() => model.materials[0].family, (e) => e instanceof MissingFieldError && e.field === 'materials[].family' && /does not carry "materials\[\]\.family"/.test(e.message));
  assert.throws(() => model.grades, (e) => e instanceof MissingFieldError && e.field === 'grades');
  assert.equal(model.materials[0].neverARowField, undefined, 'a field no row has is undefined, as it is for the engine');
  assert.deepEqual(Object.keys(model.materials[0]).sort(), ['id', 'name'], 'a copy of a row holds only what is carried');
  assert.equal(model.materials.map((m) => m.id).length, db.materials.length, 'array methods work');
});

test('publicize: a web address stays, a path on a machine is never published and the record says so', () => {
  const out = publicize({
    sources: [
      { id: 'A', url: 'https://example.org/a.pdf' },
      { id: 'B', url: '/Users/someone/Documents/secret.md' },
      { id: 'C', url: 'Not recorded' },
      { id: 'D', url: '~/notes.md' },
      { id: 'E', url: 'file:///home/x/y.pdf' },
    ],
    prices: [{ url: 'http://shop.example/p' }],
  });
  assert.deepEqual(out.sources.map((s) => s.url), ['https://example.org/a.pdf', null, null, null, null]);
  assert.deepEqual(out.sources.map((s) => s.privateReference === true), [false, true, false, true, true]);
  assert.equal(out.prices[0].url, 'http://shop.example/p');
});

test('no part of a real release holds a path on a machine, and the four local sources are private references', () => {
  for (const [path, text] of shards.files) assert.doesNotMatch(text, /\/Users\//, path);
  const local = db.sources.filter((s) => s.url.startsWith('/Users/'));
  assert.ok(local.length >= 1, 'the data holds sources with a local path (owner ruling R3 C)');
  const citing = db.materials.find((m) => db.measurements.some((x) => x.materialId === m.id && local.some((s) => s.id === x.sourceId)));
  if (citing) {
    const detail = JSON.parse(shards.files.get(`detail/${citing.id}.json`));
    const mine = detail.records.sources.filter((s) => local.some((l) => l.id === s.id));
    assert.ok(mine.length > 0 && mine.every((s) => s.url === null && s.privateReference === true));
  }
});

test('every source a record cites is in its detail (a missing one stops the build rather than skipping the citation)', () => {
  const broken = structuredClone(db);
  broken.measurements[0].sourceId = 'NOT-A-SOURCE';
  assert.throws(() => makeShards(broken, {}, 'aaaaaaaaaaaa'), /cites source NOT-A-SOURCE/);
});

test('the parts name the release the database is, and refuse another', () => {
  assert.throws(() => makeShards(db, {}, 'bbbbbbbbbbbb'), /not bbbbbbbbbbbb/);
  for (const part of ['core', 'estimates', 'reference']) assert.equal(JSON.parse(shards.files.get(`${part}.json`)).release, 'aaaaaaaaaaaa');
  assert.match(shards.manifest.files.core.sha256, /^[0-9a-f]{64}$/);
  assert.equal(shards.manifest.files.core.bytes, Buffer.byteLength(shards.files.get('core.json')));
});
