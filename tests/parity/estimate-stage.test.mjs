// WP-21: the estimate stage as a cached stage, on the real model and the real data. Whole builds, about 30 s each when cold on a quiet
// machine; none writes into data/, build/ or dist/. What it holds, against the old build's own bytes:
//
//   - cold and warm: a build that computes the estimates and one that reads them from the cache write the same db.json, reference.json,
//     estimates.json, validation report and manifest, and db.json and reference.json are the old build's, byte for byte (P-build is 0);
//   - estimates.json is the old stage's own output: the old JavaScript stage, run on the same compiled core, gives the same bytes;
//   - a seeded calibration failure withholds and labels the failing headline's estimates and nothing else, the build succeeds, and the
//     failure never reaches the cache (the next build of the same inputs is whole again);
//   - the release manifest records the Node and ICU the build ran on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInMemory } from '../../packages/data/src/rebuild.ts';
import { compile } from '../../packages/build/src/compile.ts';
import { estimateConversions } from '../../packages/build/src/evidence-ledger.ts';
import { estimatesArtifact, extractOverlay } from '../../packages/build/src/estimate-stage.ts';
import { loadSheets, snapshotDate, workbookFrom } from '../../packages/build/src/load.ts';
import { inDataset } from '../../packages/build/src/retired.ts';
import { runtimeFingerprint } from '../../packages/build/src/runtime-fingerprint.ts';
import { buildNew, compareBuilds } from '../../packages/parity/src/p-build.ts';
import { BUILD_CASE, loadTransitions, partOf, settleSurface } from '../../packages/parity/src/transitions.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { attachEstimates as attachOldEstimates } from '../../build/src/estimate/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const oldDb = readDb();
const buildDate = oldDb.meta.build;
const scratch = mkdtempSync(join(tmpdir(), 'h2c-estimate-stage-parity-'));
test.after(() => rmSync(scratch, { recursive: true, force: true }));
const cache = join(scratch, 'cache');
const bytes = (built, file) => readFileSync(join(dirname(built.dbPath), file));
const json = (built, file) => JSON.parse(readFileSync(join(dirname(built.dbPath), file), 'utf8'));
const FILES = ['db.json', 'reference.json', 'estimates.json', 'validation-report.md', 'manifest.json'];

// The old stage on the same compiled core, started now so it overlaps the builds.
const oldStage = (async () => {
  const { db: sqlite } = buildInMemory(join(root, 'data'));
  const wb = workbookFrom(loadSheets(sqlite));
  sqlite.close();
  const pre = compile(wb, { snapshot: snapshotDate(wb.Method?.rows ?? []), build: buildDate }).db;
  const post = structuredClone(pre);
  attachOldEstimates(post, { conversions: estimateConversions(inDataset(wb).wb.Conversions?.rows ?? []) });
  return JSON.stringify(estimatesArtifact(extractOverlay(post, pre), post));
})();
oldStage.catch(() => undefined);

const cold = buildNew({ label: 'cold (cache empty)', buildDate, estimateCache: cache });
cold.catch(() => undefined);
const warm = cold.then(() => buildNew({ label: 'warm (estimates from the cache)', buildDate, estimateCache: cache }));
warm.catch(() => undefined);
const seeded = warm.then(() => buildNew({ label: 'seeded calibration failure', buildDate, estimateCache: cache, args: ['--seed-calibration-failure', 'tensileStrengthXY'] }));
seeded.catch(() => undefined);
const again = seeded.then(() => buildNew({ label: 'after the seeded build', buildDate, estimateCache: cache }));
again.catch(() => undefined);

test('cold: the new build with the stage as TypeScript is the old build (db.json apart from the registered reprint transition, reference.json byte for byte)', async () => {
  const built = await cold;
  const listed = partOf(loadTransitions(join(root, 'parity', 'transitions')), (d) => d.case === BUILD_CASE);
  const r = settleSurface(await compareBuilds({ path: join(root, 'dist', 'db.json'), label: 'old build' }, { path: built.dbPath, label: built.label }), listed, BUILD_CASE);
  assert.equal(r.status, 'matches-transition', [...(r.transitions?.unexpected ?? []), ...(r.transitions?.missing ?? [])].slice(0, 5).map((d) => `${d.record} ${d.field}`).join('; '));
  assert.ok(readFileSync(join(root, 'dist', 'reference.json')).equals(bytes(built, 'reference.json')), 'reference.json');
  assert.equal(json(built, 'manifest.json').estimates.status, 'available');
  assert.ok(existsSync(join(cache)), 'the cold build stored its estimates');
});

test('estimates.json is the old stage\'s output, byte for byte', async () => {
  const built = await cold;
  assert.equal(bytes(built, 'estimates.json').toString('utf8'), await oldStage);
});

test('warm: reading the estimates from the cache writes exactly the files the cold build wrote', async () => {
  const [a, b] = [await cold, await warm];
  for (const file of FILES) assert.ok(bytes(a, file).equals(bytes(b, file)), `${file} differs between the cold and the warm build`);
  assert.ok(b.seconds < a.seconds * 0.6, `warm ${b.seconds.toFixed(1)} s is not clearly under cold ${a.seconds.toFixed(1)} s`);
  console.log(`# whole process, cold ${a.seconds.toFixed(1)} s, warm ${b.seconds.toFixed(1)} s`);
});

test('the release manifest records the Node and ICU it ran on, and the pin', async () => {
  const manifest = json(await warm, 'manifest.json');
  const runtime = runtimeFingerprint();
  for (const k of ['node', 'v8', 'icu', 'cldr', 'unicode', 'platform', 'arch', 'collator', 'collationProbe']) assert.equal(manifest.runtime[k], runtime[k], k);
  assert.equal(manifest.runtime.nodePin, readFileSync(join(root, '.nvmrc'), 'utf8').trim().replace(/^v/, ''));
  assert.equal(typeof manifest.runtime.pinned, 'boolean');
  assert.match(manifest.estimates.stageKey, /^[0-9a-f]{64}$/);
  assert.equal(manifest.files['db.json'].sha256, (await import('node:crypto')).createHash('sha256').update(bytes(await warm, 'db.json')).digest('hex'));
});

test('a seeded calibration failure: published, the failing headline withheld and labelled, nothing else changed, a question written', async () => {
  const [whole, held] = [await cold, await seeded];
  const key = 'tensileStrengthXY';
  const label = 'estimate withheld: model check failed for Tensile strength (XY)';
  const a = json(whole, 'db.json');
  const b = json(held, 'db.json');
  const manifest = json(held, 'manifest.json');
  assert.equal(manifest.estimates.status, 'withheld');
  assert.deepEqual(manifest.estimates.withheld, [key]);
  assert.equal(manifest.estimates.stageKey, json(whole, 'manifest.json').estimates.stageKey, 'the seed is not an input of the stage');

  // Every estimate of the failing headline is gone, each one named with its label; the count is what the whole build had.
  const had = [
    ...a.materials.filter((m) => m.headline[key]?.estimate).map((m) => `materials/${m.id}/${key}`),
    ...a.grades.filter((g) => g.estimate?.[key]).map((g) => `grades/${g.id}/${key}`),
  ];
  assert.ok(had.length > 50, `${had.length} estimates of ${key} in the whole build`);
  assert.deepEqual(Object.keys(b.meta.estimateWithheld.cells).sort(), had.sort());
  assert.ok(Object.values(b.meta.estimateWithheld.cells).every((l) => l === label));
  assert.ok(b.materials.every((m) => !m.headline[key]?.estimate));
  assert.ok(b.grades.every((g) => !g.estimate?.[key]));

  // Everything else is the whole build's: other headlines' estimates, print windows, the model's own tables.
  const strip = (db) => {
    const copy = structuredClone(db);
    for (const m of copy.materials) delete m.headline[key]?.estimate;
    for (const g of copy.grades) { if (g.estimate) { delete g.estimate[key]; if (!Object.keys(g.estimate).length) delete g.estimate; } }
    for (const k of ['estimateWithheld', 'estimateCoverage', 'estimateTally']) delete copy.meta[k];
    copy.meta.estimateModel.properties[key].calibration.plausibleCoverage = 0;
    return JSON.stringify(copy);
  };
  const seededFrom = structuredClone(a);
  seededFrom.meta.estimateModel.properties[key].calibration.plausibleCoverage = 0;
  assert.equal(strip(b), strip(seededFrom), 'only the failing headline\'s estimates differ');

  // The files that carry it.
  const report = readFileSync(join(dirname(held.dbPath), 'validation-report.md'), 'utf8');
  assert.match(report, /## Estimates withheld/);
  assert.match(report, /EST-WITHHELD/);
  assert.doesNotMatch(report, /\*\*[1-9]\d* errors\.\*\*/);
  const art = json(held, 'estimates.json');
  assert.equal(art.status, 'withheld');
  assert.ok(Object.values(art.materials).every((m) => !m.headline[key]?.estimate));
  const ruling = readFileSync(join(dirname(held.dbPath), 'estimate-ruling.md'), 'utf8');
  assert.match(ruling, /Tensile strength \(XY\)/);
  assert.match(ruling, /\[ \] A\./);
  assert.match(ruling, /Your answer:/);
});

test('the seeded failure never reaches the cache: the next build of the same inputs is whole again', async () => {
  const [a, b] = [await cold, await again];
  for (const file of FILES) assert.ok(bytes(a, file).equals(bytes(b, file)), `${file} differs after a seeded build`);
});
