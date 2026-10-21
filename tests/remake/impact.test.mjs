// WP-11: the impact preview. A fixture correction must list the expected moves (pinned, and re-derived by a route that does not
// use the preview: two compiles by the old build, the old adapter on each, the parity comparer between them). Needs dist/db.json.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ImpactRefusal, impactRecordsOf, loadImpactCases, needsEstimates, openImpactSession } from '@atlas/engine/impact';
import { REPO_ROOT } from '../../packages/engine/src/old-engine.ts';
import { applyRecords, stageSnapshot } from '../../packages/engine/src/impact/stage.ts';
import { compareCase } from '../../packages/parity/src/compare.ts';
import { createOldAdapter } from '../../packages/parity/src/old-adapter.ts';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const fixture = (name) => JSON.parse(readFileSync(join(REPO_ROOT, 'tests', 'remake', 'fixtures', 'impact', name), 'utf8'));
const correction = impactRecordsOf(fixture('fixture-tensile-correction.json'));
const tablesDigest = () => {
  const dir = join(REPO_ROOT, 'data', 'tables');
  return createHash('sha256').update(readdirSync(dir).sort().map((f) => `${f} ${createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')}`).join('\n')).digest('hex');
};

const EXPECTED = ['067', '068', '071', '072', '075', '076', '079', '080'].flatMap((n) => [`census/${n}/estimates-off material:M001`, `census/${n}/estimates-off product:M001/G001-01`]);

const session = await openImpactSession();
after(() => session.close());
const t0 = performance.now();
const treeBefore = tablesDigest();
const report = await session.preview(correction);

test('the fixture correction lists the expected moves, and only those', () => {
  const moved = report.moves.filter((m) => m.changes.some((c) => c.field !== 'listing')).map((m) => `${m.case} ${m.record}`).sort();
  assert.deepEqual(moved, [...EXPECTED].sort());
  assert.equal(report.summary.moved, 16);
  assert.deepEqual(report.materials, ['M001']);
  assert.deepEqual(report.summary.byTemplate, { census: 16 });
  assert.equal(report.listingShifts, 0);
  const product = report.moves.find((m) => m.record === 'product:M001/G001-01' && m.case === 'census/067/estimates-off');
  assert.deepEqual(product.changes, [{ field: 'verdict', before: 'PASS', after: 'FAIL' }, { field: 'group', before: 'meets', after: 'fail' }]);
  const material = report.moves.find((m) => m.record === 'material:M001' && m.case === 'census/075/estimates-off');
  assert.deepEqual(material.changes.map((c) => c.field), ['best', 'counts']);
});

test('the same moves come out of a route that does not use the preview (two builds, the old adapter on each, the parity comparer)', async () => {
  const staged = stageSnapshot(REPO_ROOT);
  const changed = applyRecords(staged, correction);
  const rawDb = (snapshot) => {
    const wb = loadTables(join(snapshot.dir, 'data'));
    return JSON.parse(JSON.stringify(buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'oracle', estimates: false, cache: false }).db));
  };
  const [before, after] = await Promise.all([createOldAdapter({ name: 'before', db: rawDb(staged) }), createOldAdapter({ name: 'after', db: rawDb(changed) })]);
  const read = new Set(['verdict', 'group', 'likely', 'gradeId', 'counts.pass', 'counts.fail', 'counts.untested', 'state.id']);
  const oracle = new Set();
  for (const c of loadImpactCases().filter((x) => !needsEstimates(x))) {
    const asCase = { id: c.id, group: c.group, name: c.name, scenario: c.question };
    const cmp = compareCase(await before.evaluate(asCase), await after.evaluate(asCase));
    assert.equal(cmp.notComputable.length, 0);
    for (const d of cmp.differences) {
      if (d.tier === 'decision' && read.has(d.field) && !(d.record.startsWith('material:') && d.field === 'state.id')) oracle.add(`${d.case} ${d.record}`);
    }
  }
  const mine = new Set(report.moves.filter((m) => m.changes.some((c) => c.field !== 'listing')).map((m) => `${m.case} ${m.record}`));
  assert.deepEqual([...mine].sort(), [...oracle].sort());
});

test('the preview reads one staged snapshot and writes nowhere else: the working tree is byte for byte as it was', () => {
  assert.equal(tablesDigest(), treeBefore);
  assert.equal(report.base.inputDigest, session.baseDigest);
  assert.notEqual(report.result.inputDigest, report.base.inputDigest);
  assert.match(report.base.release, /^[0-9a-f]{12}$/);
  assert.match(report.result.release, /^[0-9a-f]{12}$/);
  assert.equal(existsSync(join(REPO_ROOT, 'dist', 'db.json')), true);
});

test('questions that need the estimate stage are pending, not answered from a core compile', () => {
  const cases = loadImpactCases();
  assert.equal(cases.length, 306, '30 template cases and 276 census cases');
  assert.equal(report.cases.asked, 306);
  assert.equal(report.summary.estimatesPending, true);
  assert.equal(report.cases.estimatesPending.length, cases.filter(needsEstimates).length);
  assert.equal(report.cases.answered + report.cases.estimatesPending.length, 306);
  assert.ok(report.cases.estimatesPending.every((id) => /estimates-on$|explore-estimates/.test(id)));
});

test('a change no decision reads moves nothing', async () => {
  const wording = await session.preview(impactRecordsOf(fixture('fixture-wording-only.json')));
  assert.equal(wording.summary.moved, 0);
  assert.deepEqual(wording.moves, []);
});

test('the second preview keeps the base answers: it computes only the changed side', async () => {
  const again = await session.preview(correction);
  assert.equal(again.timingsMs.compileBase, 0);
  assert.equal(again.timingsMs.runBase, 0);
  assert.equal(again.summary.moved, report.summary.moved);
  assert.deepEqual(again.moves, report.moves, 'the same change gives the same answer');
});

test('a stale record, an unknown column or table, a vanished row and a composite key are refused, naming the cause', async () => {
  const [record] = correction;
  const refused = async (records, pattern) => assert.rejects(session.preview(records), (e) => e instanceof ImpactRefusal && pattern.test(e.message), String(pattern));
  await refused([{ ...record, before: { ...record.before, 'Raw value': '55' } }], /stale, Raw value is "56" now, the record expected "55"/);
  await refused([{ ...record, after: { 'No such column': '1' } }], /has no column "No such column"/);
  await refused([{ ...record, recordId: 'V999999' }], /stale, the row is gone/);
  await refused([{ ...record, table: 'chamber_need', recordId: 'X' }], /chamber_need is keyed by|stale|has no column/);
  assert.throws(() => impactRecordsOf([{ ...record, table: 'no_such_table' }]), /table/);
  assert.throws(() => impactRecordsOf({ records: [] }), /no records/);
});

test('a record that names no existing row appends one; data that does not build is refused with the build\'s own errors', async () => {
  const staged = stageSnapshot(REPO_ROOT);
  const added = applyRecords(staged, [{ table: 'sources', recordId: 'ZZ-FIXTURE', before: {}, after: { Title: 'a fixture source' } }]);
  assert.notEqual(added.digest, staged.digest);
  assert.match(readFileSync(join(added.dir, 'data', 'tables', 'sources.csv'), 'utf8'), /\nZZ-FIXTURE,[^\n]*a fixture source/);
  const refused = (records, pattern) => assert.rejects(session.preview(records), (e) => e instanceof ImpactRefusal && pattern.test(e.message), String(pattern));
  await refused([{ table: 'measurements', recordId: 'V000002', before: { 'Raw value': '56' }, after: { 'Normalized unit': 'no-such-unit' } }], /the data does not build: \[MEAS-UNIT-UNKNOWN\]/);
  await refused([{ table: 'measurements', recordId: 'V000002', before: { MaterialID: 'M001' }, after: { MaterialID: 'M999' } }], /the data does not build: \[REF-UNKNOWN\]/);
  await refused([{ table: 'sources', recordId: 'ZZ-FIXTURE', before: {}, after: { Title: 'a fixture source' } }], /does not satisfy the typed contract/);
  // A refused preview leaves the session usable.
  assert.equal((await session.preview(correction)).summary.moved, 16);
});

test('the time of a cold preview and a warm one is recorded in remake/measure/impact.json, within the 10 s budget', () => {
  const record = JSON.parse(readFileSync(join(REPO_ROOT, 'remake', 'measure', 'impact.json'), 'utf8'));
  assert.equal(record.status, 'measured');
  assert.equal(record.moved, 16);
  for (const kind of ['cold', 'warm']) {
    assert.equal(record.core[kind].budgetMs, 10_000);
    assert.equal(record.core[kind].runsMs.length, 3);
    assert.ok(record.core[kind].medianMs <= 10_000, `${kind} median ${record.core[kind].medianMs} ms`);
    assert.equal(record.core[kind].withinBudget, true);
  }
  assert.ok(performance.now() - t0 > 0);
});
