// WP-21: the estimate stage as a cached stage. These tests run the real stage logic (key, store, overlay, withholding) on a small
// database and a stand-in for the model's computation, so they take a second, not a minute. The real model, on the real data, is
// proved by tests/parity/estimate-stage.test.mjs (a whole build, cold and warm, against the old build's bytes).
//
// What they hold: a stale key can never be served (every input the stage reads, and the code, the runtime and the options, change
// the key; a damaged or foreign entry is a miss that says so); the overlay carries everything the stage did (a field it cannot name is
// an error, not a smaller cache); and a calibration failure withholds and labels the failing group and nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalDigest, Uncacheable } from '../../packages/build/src/canonical-digest.ts';
import { decodeEntry, encodeEntry, stageKey } from '../../packages/build/src/estimate-cache.ts';
import { EstimateOverlayIncomplete, applyOverlay, estimatesArtifact, extractOverlay, runEstimateStage } from '../../packages/build/src/estimate-stage.ts';
import { rulingFor, seedCalibrationFailure, withholdFailedCalibration } from '../../packages/build/src/estimate-withholding.ts';
import { runtimeFingerprint } from '../../packages/build/src/runtime-fingerprint.ts';

const tmp = mkdtempSync(join(tmpdir(), 'h2c-estimate-stage-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const freshDir = () => join(tmp, `cache-${n++}`);

/** A small compiled core: two products, two materials (one an elastomer with a definitional notApplicable), two estimated headlines. */
function core() {
  return {
    meta: { snapshot: '2026-09-21', build: 'dev', counts: { materials: 2 } },
    registry: { headlines: [{ key: 'density', estimated: true, labels: { plain: 'Density' } }, { key: 'hdt045', estimated: true, labels: { plain: 'HDT at 0.45 MPa' } }] },
    materials: [
      { id: 'M001', headline: { density: { known: false, text: '' }, hdt045: { known: false, text: '', notApplicable: { reason: 'an elastomer has no HDT' } } }, print: { nozzleC: null } },
      { id: 'M002', headline: { density: { known: true, value: 1.2 }, hdt045: { known: false, text: '' } }, print: {} },
    ],
    grades: [{ id: 'G001', materialId: 'M001' }, { id: 'G002', materialId: 'M002' }],
  };
}
const CONVERSIONS = { conversions: { density: {} }, wet: {}, bands: [] };
const CODE = { digest: 'c'.repeat(64), files: [], packages: {} };
const RUNTIME = runtimeFingerprint();

/** The model's stand-in: adds what the real one adds, in the real places, and counts its runs. */
function fakeModel() {
  const counter = { runs: 0 };
  const compute = (db) => {
    counter.runs++;
    for (const g of db.grades) g.estimateVersion = 2;
    db.grades[1].estimate = { density: { centre: 1.2, lo: 1.1, hi: 1.3 }, hdt045: { centre: 60, lo: 50, hi: 70 } };
    db.materials[0].headline.density.estimate = { kind: 'model', centre: 1.1, lo: 1, hi: 1.2 };
    db.materials[1].headline.hdt045.estimate = { kind: 'model', centre: 55, lo: 45, hi: 65 };
    db.materials[0].print.nozzleEstimate = { lo: 200, hi: 230 };
    db.meta.estimateCoverage = { density: { missing: 1 }, hdt045: { missing: 1 } };
    db.meta.estimateModel = { properties: { density: { calibration: { held: 40, likelyCoverage: 0.8, plausibleCoverage: 0.95 } }, hdt045: { calibration: { held: 40, likelyCoverage: 0.8, plausibleCoverage: 0.95 } } } };
    db.meta.printEstimates = { applied: [] };
  };
  return { counter, compute };
}

const run = (db, cacheDir, model, extra = {}) => runEstimateStage(db, { conversions: CONVERSIONS, cacheDir, compute: model.compute, runtime: RUNTIME, code: CODE, ...extra });

test('a miss computes and stores, a hit applies the stored result and does not compute', () => {
  const dir = freshDir();
  const model = fakeModel();
  const first = run(core(), dir, model);
  assert.equal(first.source, 'computed');
  assert.equal(first.cache.state, 'miss');
  assert.equal(first.cache.stored, true);
  const db = core();
  const second = run(db, dir, model);
  assert.equal(second.source, 'cache');
  assert.equal(second.cache.state, 'hit');
  assert.equal(second.key, first.key);
  assert.equal(model.counter.runs, 1, 'the model ran once');
  // The two paths give one database, byte for byte.
  const computed = core();
  fakeModel().compute(computed);
  assert.equal(JSON.stringify(db), JSON.stringify(computed));
});

test('the overlay reproduces the stage: only the stage\'s own fields, the compile-time notApplicable left where it was', () => {
  const pre = core();
  const post = structuredClone(pre);
  fakeModel().compute(post);
  const overlay = extractOverlay(post, pre);
  assert.deepEqual(Object.keys(overlay.grades), ['G001', 'G002']);
  assert.deepEqual(Object.keys(overlay.materials), ['M001', 'M002']);
  assert.equal(overlay.materials.M001.headline.hdt045, undefined, 'compile\'s notApplicable is not the stage\'s');
  const rebuilt = core();
  applyOverlay(rebuilt, overlay);
  assert.equal(JSON.stringify(rebuilt), JSON.stringify(post), 'the overlay applied to the core is the stage\'s result');
});

test('a stale key forces a recompute: each input the stage reads changes the key', () => {
  const dir = freshDir();
  const model = fakeModel();
  run(core(), dir, model);
  assert.equal(model.counter.runs, 1);
  const cases = {
    'a value in the compiled core': (db) => { db.materials[1].headline.density.value = 1.21; },
    'a value in another table of the core (the registry)': (db) => { db.registry.headlines[0].estimated = false; },
    'the order of the keys of a record': (db) => { const g = db.grades[0]; db.grades[0] = { materialId: g.materialId, id: g.id }; },
    'the order of the records': (db) => { db.grades.reverse(); },
    'a number that is -0 against one that is 0': (db) => { db.materials[1].headline.density.value = -0; },
    'a field that is undefined against one that is absent': (db) => { db.materials[1].headline.density.extra = undefined; },
    'a record added': (db) => { db.grades.push({ id: 'G003', materialId: 'M002' }); },
  };
  for (const [what, change] of Object.entries(cases)) {
    const db = core();
    change(db);
    const before = model.counter.runs;
    const result = run(db, dir, model);
    assert.equal(result.source, 'computed', `${what} must not be served from the entry made without it`);
    assert.equal(model.counter.runs, before + 1, what);
  }
});

test('a stale key forces a recompute: the conversions, the code, the runtime and the options', () => {
  const dir = freshDir();
  const model = fakeModel();
  const base = run(core(), dir, model);
  const changed = {
    'a conversion the ledger gives the model': { conversions: { ...CONVERSIONS, conversions: { density: { 'tensile XY': { offset: 0.1 } } } } },
    'the code (any module of the stage)': { code: { ...CODE, digest: 'd'.repeat(64) } },
    'the ICU version': { runtime: { ...RUNTIME, icu: '99.9' } },
    'the CLDR version': { runtime: { ...RUNTIME, cldr: '99.0' } },
    'the collation the default locale sorts by': { runtime: { ...RUNTIME, collator: '{"locale":"sv-SE"}' } },
    'how a probe set of strings sorts': { runtime: { ...RUNTIME, collationProbe: '0000000000000000' } },
    'the Node version': { runtime: { ...RUNTIME, node: 'v99.0.0' } },
    'the V8 version (Math.log and Math.exp are its own)': { runtime: { ...RUNTIME, v8: '99.0' } },
    'the platform': { runtime: { ...RUNTIME, platform: 'linux' } },
    'the architecture': { runtime: { ...RUNTIME, arch: 'x64' } },
  };
  const seen = new Set([base.key]);
  for (const [what, extra] of Object.entries(changed)) {
    const before = model.counter.runs;
    const result = run(core(), dir, model, extra);
    assert.equal(result.source, 'computed', `${what} must not be served from the entry made without it`);
    assert.equal(model.counter.runs, before + 1, what);
    assert.ok(!seen.has(result.key), `${what} gave a key another change already gave`);
    seen.add(result.key);
  }
  // Putting everything back is a hit again.
  assert.equal(run(core(), dir, model).source, 'cache');
});

test('what is not an input does not change the key: the build label', () => {
  const dir = freshDir();
  const model = fakeModel();
  run(core(), dir, model);
  const labelled = core();
  labelled.meta.build = '2099-01-01';
  assert.equal(run(labelled, dir, model).source, 'cache');
  assert.equal(model.counter.runs, 1);
});

test('an entry that is damaged, truncated or another key\'s is a miss that says so, is removed, and is recomputed', () => {
  const dir = freshDir();
  const model = fakeModel();
  const stored = run(core(), dir, model);
  const file = join(dir, `${stored.key}.bin`);
  const good = readFileSync(file);
  const damages = {
    'a flipped byte in the body': Buffer.concat([good.subarray(0, good.length - 5), Buffer.from([good[good.length - 5] ^ 0xff]), good.subarray(good.length - 4)]),
    'a truncated file': good.subarray(0, 60),
    'an empty file': Buffer.alloc(0),
    'something that is not an entry': Buffer.from('not an entry at all, but long enough to have a header, padded'.padEnd(200, '.')),
  };
  for (const [what, bytes] of Object.entries(damages)) {
    writeFileSync(file, bytes);
    const before = model.counter.runs;
    const result = run(core(), dir, model);
    assert.equal(result.source, 'computed', what);
    assert.equal(model.counter.runs, before + 1, what);
    assert.equal(result.cache.state, 'miss');
    assert.match(result.cache.note ?? '', /damaged entry was removed/, `${what} is said, not silent`);
    assert.equal(run(core(), dir, model).source, 'cache', `the entry was replaced by a good one after ${what}`);
  }
  // An entry filed under another key (a copied or renamed file) is refused by the key written inside it.
  const other = freshDir();
  run(core(), other, model, { runtime: { ...RUNTIME, icu: '1.0' } });
  const foreign = readdirSync(other).find((f) => f.endsWith('.bin'));
  renameSync(join(other, foreign), join(other, `${stored.key}.bin`));
  const before = model.counter.runs;
  const result = run(core(), other, model);
  assert.equal(result.source, 'computed');
  assert.equal(model.counter.runs, before + 1);
  assert.match(result.cache.note ?? '', /another key/);
});

test('the entry codec: the key is written inside, a body is checked, and round trips are exact', () => {
  const key = 'a'.repeat(64);
  const overlay = { format: 'x', n: [-0, NaN, undefined, 1.5], s: 'é' };
  const back = decodeEntry(key, encodeEntry(key, overlay));
  assert.equal(canonicalDigest(back), canonicalDigest(overlay));
  assert.throws(() => decodeEntry('b'.repeat(64), encodeEntry(key, overlay)), /another key/);
  assert.throws(() => encodeEntry('short', overlay), /not a cache key/);
});

test('the cache cannot be used safely: the stage still runs, uncached, and says why', () => {
  const model = fakeModel();
  const noCode = run(core(), freshDir(), model, { code: null });
  assert.equal(noCode.source, 'computed');
  assert.equal(noCode.cache.state, 'off');
  assert.match(noCode.cache.why, /code digest/);
  assert.equal(noCode.key, null);
  const noFolder = run(core(), null, model);
  assert.equal(noFolder.cache.state, 'off');
  assert.ok(noFolder.key, 'the key is still made, so a release can name its inputs');
  // An input that is not plain data cannot be named exactly: no key, no lookup, no store.
  const odd = core();
  odd.materials[0].when = new Date(0);
  const result = run(odd, freshDir(), model);
  assert.equal(result.cache.state, 'off');
  assert.match(result.cache.why, /cannot be named exactly/);
  assert.throws(() => canonicalDigest(new Map()), Uncacheable);
  // The environment's switch.
  const dir = freshDir();
  process.env.H2C_NO_BUILD_CACHE = '1';
  try {
    const off = run(core(), dir, model);
    assert.equal(off.cache.state, 'off');
    assert.match(off.cache.why, /H2C_NO_BUILD_CACHE/);
    assert.ok(!existsSync(dir), 'nothing was stored');
  } finally {
    delete process.env.H2C_NO_BUILD_CACHE;
  }
});

test('a cache folder that cannot be written does not fail the build, and the failure is said', () => {
  const model = fakeModel();
  const blocker = join(tmp, 'a-file-where-a-folder-should-be');
  writeFileSync(blocker, 'x');
  const result = run(core(), join(blocker, 'cache'), model);
  assert.equal(result.source, 'computed');
  assert.equal(result.cache.state, 'miss');
  assert.equal(result.cache.stored, false);
  assert.match(result.cache.note, /could not be stored/);
});

test('a stage that changes something its overlay cannot carry is an error, never a smaller cache', () => {
  const dir = freshDir();
  const sneaky = (db) => { fakeModel().compute(db); db.grades[0].somethingNew = 1; };
  assert.throws(() => run(core(), dir, { counter: {}, compute: sneaky }), EstimateOverlayIncomplete);
  const alsoSneaky = (db) => { fakeModel().compute(db); db.meta.estimateTally = {}; };
  assert.throws(() => run(core(), dir, { counter: {}, compute: alsoSneaky }), /does not carry/);
  assert.ok(!existsSync(dir), 'nothing was stored for the failed runs');
});

test('a stage that left no model is an error, and so is a database that already has estimates', () => {
  assert.throws(() => run(core(), freshDir(), { counter: {}, compute: () => undefined }), /left no meta.estimateModel/);
  const done = core();
  fakeModel().compute(done);
  assert.throws(() => run(done, freshDir(), fakeModel()), /already carries estimate fields/);
});

test('an overlay that names a record the database does not have is refused', () => {
  const pre = core();
  const post = structuredClone(pre);
  fakeModel().compute(post);
  const overlay = extractOverlay(post, pre);
  const missing = core();
  missing.grades.pop();
  assert.throws(() => applyOverlay(missing, overlay), /grade G002/);
  assert.throws(() => applyOverlay(core(), { ...overlay, format: 'other' }), /format/);
});

// ---- withholding (owner ruling OQ-05 A) ---------------------------------------------------------------------------------------

/** The estimates validator's own finding for a model that stopped holding its hidden values. */
const calibrationError = (where) => ({ level: 'error', code: 'EST-CALIBRATION', where, message: `The plausible range contains 50% of hidden headlines, not 95% (${where})` });

function withEstimates() {
  const db = core();
  fakeModel().compute(db);
  return db;
}

test('a calibration failure of one headline withholds and labels that headline\'s estimates, and no other', () => {
  const db = withEstimates();
  const found = [{ level: 'warn', code: 'EST-SUMMARY', where: 'materials', message: 'x' }, calibrationError('estimate model density')];
  const { issues, record } = withholdFailedCalibration(db, found);
  assert.equal(record.status, 'withheld');
  assert.deepEqual(record.groups.map((g) => [g.key, g.scope, g.name]), [['density', 'model', 'Density']]);
  const label = 'estimate withheld: model check failed for Density';
  assert.deepEqual(record.cells, { 'materials/M001/density': label, 'grades/G002/density': label });
  // The cells are as with estimates off; the other headline is untouched.
  assert.equal(db.materials[0].headline.density.estimate, undefined);
  assert.equal(db.grades[1].estimate.density, undefined);
  assert.ok(db.grades[1].estimate.hdt045);
  assert.ok(db.materials[1].headline.hdt045.estimate);
  assert.ok(db.materials[0].print.nozzleEstimate, 'print windows are not the model\'s');
  assert.deepEqual(db.meta.estimateWithheld, record);
  assert.deepEqual(db.meta.estimateCoverage.density, { missing: 1, 'this-grade': 0, 'this-material': 0, family: 0, notApplicable: 0, none: 1, canScreen: 0 });
  // The findings stay, as warnings, and one finding says what was withheld.
  assert.ok(!issues.some((i) => i.level === 'error'));
  assert.equal(issues.filter((i) => i.code === 'EST-CALIBRATION').length, 1);
  assert.equal(issues.find((i) => i.code === 'EST-CALIBRATION').level, 'warn');
  assert.match(issues.find((i) => i.code === 'EST-WITHHELD').message, /2 estimates withheld/);
  assert.ok(issues.some((i) => i.code === 'EST-SUMMARY'), 'other findings pass through');
});

test('a failure of the product-level ranges withholds product estimates only; one that names no headline withholds the whole model', () => {
  const grades = withEstimates();
  const a = withholdFailedCalibration(grades, [calibrationError('estimate model hdt045 grades semi-filled')]);
  assert.deepEqual(a.record.groups.map((g) => [g.key, g.scope, g.matrices]), [['hdt045', 'grades', ['semi-filled']]]);
  assert.deepEqual(Object.keys(a.record.cells), ['grades/G002/hdt045']);
  assert.ok(grades.materials[1].headline.hdt045.estimate, 'a material\'s estimate stands when only the product ranges failed');
  assert.ok(grades.grades[1].estimate.density);

  const all = withEstimates();
  const b = withholdFailedCalibration(all, [calibrationError('somewhere unexpected')]);
  assert.equal(b.record.groups[0].scope, 'all');
  assert.equal(b.record.groups[0].label, 'estimate withheld: model check failed for the estimate model');
  assert.equal(all.grades[1].estimate, undefined, 'a product left with no estimate has none, as with estimates off');
  assert.equal(all.materials[0].headline.density.estimate, undefined);
  assert.equal(all.materials[1].headline.hdt045.estimate, undefined);
  assert.equal(Object.keys(b.record.cells).length, 4);
});

test('no calibration failure: nothing is withheld, and the findings are the validator\'s', () => {
  const db = withEstimates();
  const before = JSON.stringify(db);
  const found = [{ level: 'warn', code: 'EST-SUMMARY', where: 'x', message: 'y' }, { level: 'error', code: 'EST-ORDER', where: 'estimates', message: 'z' }];
  const { issues, record } = withholdFailedCalibration(db, found);
  assert.equal(record, null);
  assert.deepEqual(issues, found);
  assert.equal(JSON.stringify(db), before);
});

test('the other errors of the estimate stage still stop the build: only EST-CALIBRATION is withheld', () => {
  const db = withEstimates();
  const { issues } = withholdFailedCalibration(db, [calibrationError('estimate model density'), { level: 'error', code: 'CONVERSION-DRIFT', where: 'conversions CV1', message: 'drift' }, { level: 'error', code: 'EST-ORDER', where: 'estimates', message: 'order' }]);
  assert.deepEqual(issues.filter((i) => i.level === 'error').map((i) => i.code), ['CONVERSION-DRIFT', 'EST-ORDER']);
});

test('the estimates artifact is the overlay whole, or without the withheld cells; the owner\'s question names the group', () => {
  const pre = core();
  const post = structuredClone(pre);
  fakeModel().compute(post);
  const overlay = extractOverlay(post, pre);
  const whole = estimatesArtifact(overlay, post);
  assert.equal(whole.status, 'available');
  assert.equal(whole.withheld, null);
  assert.deepEqual(whole.grades, overlay.grades);

  const db = structuredClone(post);
  const { record } = withholdFailedCalibration(db, [calibrationError('estimate model density')]);
  const art = estimatesArtifact(overlay, db);
  assert.equal(art.status, 'withheld');
  assert.equal(art.withheld, record);
  assert.equal(art.materials.M001.headline.density, undefined);
  assert.deepEqual(Object.keys(art.grades.G002.estimate), ['hdt045']);
  assert.equal(art.materials.M001.print.nozzleEstimate.lo, 200);
  assert.equal(art.meta.estimateCoverage.density.none, 1);
  const text = rulingFor(record, 'abcdef123456');
  assert.match(text, /# A question for you/);
  assert.match(text, /estimate withheld: model check failed for Density/);
  assert.match(text, /- \[ \] A\./);
  assert.match(text, /Your answer:/);
});

test('seeding a calibration failure makes the real check fail on the right headline, and a typo is an error', () => {
  const db = withEstimates();
  seedCalibrationFailure(db, ['hdt045']);
  assert.equal(db.meta.estimateModel.properties.hdt045.calibration.plausibleCoverage, 0);
  assert.equal(db.meta.estimateModel.properties.density.calibration.plausibleCoverage, 0.95);
  assert.throws(() => seedCalibrationFailure(db, ['hdt54']), /no such headline/);
});

test('the key is a function of all its parts', () => {
  const parts = { inputs: '1', code: '2', runtime: RUNTIME, options: { a: 1 } };
  const key = stageKey(parts);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(stageKey({ ...parts }), key);
  for (const change of [{ inputs: '9' }, { code: '9' }, { runtime: { ...RUNTIME, icu: '0' } }, { options: { a: 2 } }]) assert.notEqual(stageKey({ ...parts, ...change }), key);
});

// ---- the code digest ----------------------------------------------------------------------------------------------------------

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the code digest covers every module Node loads for the stage, and the data the stage reads', () => {
  // A child process that records every file Node resolves while the stage and its cache are imported, beside the digest's file list.
  const script = `
    import { registerHooks } from 'node:module';
    import { fileURLToPath, pathToFileURL } from 'node:url';
    const loaded = new Set();
    registerHooks({ resolve(specifier, context, next) { const r = next(specifier, context); if (r.url.startsWith('file:')) loaded.add(fileURLToPath(r.url)); return r; } });
    const src = ${JSON.stringify(join(root, 'packages/build/src'))};
    const cache = await import(pathToFileURL(src + '/estimate-cache.ts').href);
    await import(pathToFileURL(src + '/estimate-stage.ts').href);
    const digest = cache.computeCodeDigest();
    console.log(JSON.stringify({ loaded: [...loaded], files: digest.files, packages: digest.packages }));
  `;
  const child = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--input-type=module', '-e', script], { cwd: root, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const { loaded, files, packages } = JSON.parse(child.stdout);
  const inRepo = loaded.filter((f) => f.startsWith(`${root}/`) && !f.includes('/node_modules/')).map((f) => f.slice(root.length + 1));
  assert.ok(inRepo.length > 25, `${inRepo.length} modules loaded`);
  const missing = inRepo.filter((f) => !files.includes(f));
  assert.deepEqual(missing, [], 'a module the stage loads is not in the code digest, so editing it would not change the key');
  for (const f of ['build/mappings/estimate-model.json', 'schema/estimate-model.schema.json', 'app/js/engine/ledger.js', 'packages/build/src/estimate/solver.ts', 'packages/build/src/estimate-stage.ts']) {
    assert.ok(files.includes(f), `${f} is in the digest`);
  }
  assert.ok(Object.keys(packages).includes('ajv'), 'the version of ajv, which checks the model configuration, is in the digest');
});
