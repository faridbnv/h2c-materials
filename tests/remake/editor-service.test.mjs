// WP-13: the correction journey through the editor service, on a sandbox workspace and a fixture private store. Find a product, read
// its source page beside the record, correct a value (every write-service guard runs), see a stale edit and a conflict without losing
// the draft, keep drafts across a restart, back up and restore, and prepare a review in the sandbox export folder, never in data/.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256Of } from '../../packages/data/src/digest.ts';
import { engineImpact, impactFrom, readReport } from '../../apps/editor/server/impact.ts';
import { sendImage } from '../../apps/editor/server/service.ts';
import { columnIndex, copyData, editRecords, realData, realRecords } from './data-helpers.mjs';
import { dropTemplate } from './write-helpers.mjs';
import { QUOTE, SOURCE, densityCorrection, startFixture, tensileCorrection } from './editor-helpers.mjs';

after(dropTemplate);

const manifestHash = () => sha256Of(readFileSync(join(realData, 'manifest.json')));

// ---------------------------------------------------------------- find, read, and the source beside the record

test('find a product by the start of its words, then read its values and the source page beside one of them', async () => {
  const fx = await startFixture();
  try {
    const found = (await fx.call('/api/products?q=ecomax%20pla')).json;
    assert.ok(found.some((p) => p.gradeId === 'G001-01'), 'ECOMAX PLA is found');
    assert.equal((await fx.call('/api/products?q=zzzz')).json.length, 0);
    assert.equal((await fx.call('/api/products?q=')).json.length, 0);

    const product = (await fx.call('/api/products/G001-01')).json;
    const density = product.measurements.find((m) => m.id === 'V000001');
    assert.equal(density.property, 'Density');
    assert.equal(density.rawValue, '1.24');
    assert.equal(density.sourceId, SOURCE);
    assert.equal(density.draft, false);

    const detail = (await fx.call('/api/measurements/V000001')).json;
    assert.equal(detail.source.availability, 'available');
    assert.equal(detail.pageHint, 1);
    assert.equal(detail.factor, '1000');
    assert.equal(detail.cells['Raw value'], '1.24');
    assert.equal(detail.source.pageCount, 2);
    assert.deepEqual(detail.source.imagePages, [1]);

    const page = (await fx.call(`/api/sources/${SOURCE}/pages/1`)).json;
    assert.ok(page.lines.includes(QUOTE));
    assert.equal((await fx.call(`/api/sources/${SOURCE}/pages/3`)).status, 404, 'a page the document does not have');
    const image = await fx.call(`/api/sources/${SOURCE}/pages/1/image`);
    assert.equal(image.status, 200);
    assert.equal(image.headers['content-type'], 'image/png');
    assert.equal((await fx.call(`/api/sources/${SOURCE}/pages/2/image`)).status, 404);
  } finally { await fx.cleanup(); }
});

test('without the private store the record opens and says the source is not on this computer; nothing is faked and a correction is refused', async () => {
  const fx = await startFixture({ store: false });
  try {
    const state = (await fx.call('/api/state')).json;
    assert.equal(state.source.available, false);
    assert.match(state.source.note, /not available on this computer/i);
    const detail = (await fx.call('/api/measurements/V000001')).json;
    assert.equal(detail.source.availability, 'no-store');
    assert.match(detail.source.note, /not available on this computer/i);
    assert.equal((await fx.call(`/api/sources/${SOURCE}/pages/1`)).status, 404);
    const result = (await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) })).json;
    assert.equal(result.status, 'refused');
    assert.equal(result.code, 'source-unavailable');
    assert.equal((await fx.call('/api/drafts')).json.length, 0, 'nothing was written');
  } finally { await fx.cleanup(); }
});

test('a record whose document is not in the store is told apart from one with no store at all', async () => {
  const fx = await startFixture();
  try {
    const other = realRecords('measurements').find((cells) => cells[columnIndex('measurements', 'SourceID')] !== SOURCE);
    const id = other[0];
    const detail = (await fx.call(`/api/measurements/${id}`)).json;
    assert.ok(['not-in-store', 'not-retrieved', 'no-digest'].includes(detail.source.availability), detail.source.availability);
    const result = (await fx.call('/api/corrections', { method: 'POST', body: {
      measurementId: id, expect: { 'Raw value': other[columnIndex('measurements', 'Raw value')] }, set: { 'Raw value': '9' }, reason: 'try', evidence: { page: 1, locator: 'x', quote: 'x' }, base: detail.base,
    } })).json;
    assert.equal(result.code, 'source-unavailable');
  } finally { await fx.cleanup(); }
});

// ---------------------------------------------------------------- the correction and the write service's guards

test('a correction is a draft: the write service checks the quote on the page, the record shows it, and it survives a restart', async () => {
  const fx = await startFixture();
  try {
    const result = (await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) })).json;
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(result.quoteCheck.status, 'verified', 'the quote was found on the stored page');

    const drafts = (await fx.call('/api/drafts')).json;
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0].status, 'draft');
    assert.deepEqual(drafts[0].before, { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' });
    assert.equal(drafts[0].after['Normalized value'], '1250');
    assert.equal(drafts[0].evidence.quote, QUOTE);
    assert.match(drafts[0].label, /Density/);
    assert.equal((await fx.call('/api/state')).json.drafts, 1);
    const product = (await fx.call('/api/products/G001-01')).json;
    assert.equal(product.measurements.find((m) => m.id === 'V000001').rawValue, '1.25');
    assert.equal(product.measurements.find((m) => m.id === 'V000001').draft, true);

    await fx.restart();
    assert.equal((await fx.call('/api/drafts')).json.length, 1, 'the draft is there after a restart');
    assert.equal((await fx.call('/api/products/G001-01')).json.measurements.find((m) => m.id === 'V000001').rawValue, '1.25');
  } finally { await fx.cleanup(); }
});

test('the write service\'s refusals reach the person with their code, and change nothing', async () => {
  const fx = await startFixture();
  try {
    const send = async (overrides) => (await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx, overrides) })).json;
    const cases = [
      [{ evidence: { page: 1, locator: 'Table 1', quote: 'Density ISO 1183 g/cc 1.30' } }, ['quote-not-on-page', 'value-not-printed']],
      [{ evidence: { page: 2, locator: 'Table 1', quote: QUOTE } }, ['quote-not-on-page']],
      [{ evidence: { page: 9, locator: 'Table 1', quote: QUOTE } }, ['quote-not-on-page']],
      [{ set: { 'Raw value': '1.25' }, expect: { 'Raw value': '1.24' } }, ['cells-not-together']],
      [{ set: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' } }, ['no-change']],
      [{ evidence: { page: 1, locator: '', quote: QUOTE } }, ['evidence-missing']],
      [{ expect: { 'Raw value': '9.99', 'Raw numeric': '1.24', 'Normalized value': '1240' } }, ['stale']],
    ];
    for (const [overrides, codes] of cases) {
      const result = await send(overrides);
      assert.equal(result.status, 'refused', JSON.stringify(overrides));
      assert.ok(codes.includes(result.code), `${JSON.stringify(overrides)} gave ${result.code}: ${result.detail}`);
      assert.ok(result.detail.length > 10);
    }
    assert.equal((await fx.call('/api/drafts')).json.length, 0, 'every refusal left the workspace as it was');
    // The editor itself writes only the three value cells and needs a reason.
    assert.equal((await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx, { set: { Property: 'Density x' }, expect: { Property: 'Density' } }) })).status, 400);
    assert.equal((await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx, { reason: '   ' }) })).status, 400);
  } finally { await fx.cleanup(); }
});

test('a stale edit is shown with what was expected and what the record holds now', async () => {
  const fx = await startFixture();
  try {
    const mine = await densityCorrection(fx);
    const theirs = await densityCorrection(fx, { set: { 'Raw value': '1.26', 'Raw numeric': '1.26', 'Normalized value': '1260' } });
    assert.equal((await fx.call('/api/corrections', { method: 'POST', body: mine })).json.status, 'applied');
    const stale = (await fx.call('/api/corrections', { method: 'POST', body: theirs })).json;
    assert.equal(stale.status, 'refused');
    assert.equal(stale.code, 'stale');
    assert.equal(stale.stale.expected['Raw value'], '1.24');
    assert.equal(stale.stale.current['Raw value'], '1.25');
    assert.equal(stale.stale.current['Normalized value'], '1250');
    assert.equal((await fx.call('/api/drafts')).json.length, 1, 'the first draft is untouched');
  } finally { await fx.cleanup(); }
});

// ---------------------------------------------------------------- Git moves: a conflict, never silently applied, never lost

test('when Git moved under a draft, the draft is a conflict with the three values; applying it again is a new command, and nothing is lost', async () => {
  const data = copyData();
  const fx = await startFixture({ dataDir: data.dir });
  try {
    assert.equal((await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) })).json.status, 'applied');
    await fx.service.close();
    // Someone else changed the same value upstream.
    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; });
    fx.service = await (await import('../../apps/editor/server/service.ts')).startService(fx.options);

    const state = (await fx.call('/api/state')).json;
    assert.equal(state.conflicts, 1);
    assert.equal(state.drafts, 0);
    assert.equal(state.rebased.conflicts, 1);
    const [conflict] = (await fx.call('/api/conflicts')).json;
    assert.equal(conflict.code, 'stale');
    assert.equal(conflict.expected['Normalized value'], '1240', 'the value the draft expected');
    assert.equal(conflict.now['Normalized value'], '1241', 'the value now in the data');
    assert.equal(conflict.wanted['Normalized value'], '1250', 'the value the draft wanted');
    assert.equal(conflict.evidence.quote, QUOTE);
    assert.equal((await fx.call('/api/products/G001-01')).json.measurements.find((m) => m.id === 'V000001').rawValue, '1.24', 'the data shows the approved value, not the draft');

    // The prepare-review export refuses while a conflict is held, and says why.
    const refused = (await fx.call('/api/export', { method: 'POST', body: { title: 'x' } })).json;
    assert.equal(refused.code, 'export-refused');
    assert.match(refused.detail, /conflict|no longer apply/);

    const resolved = (await fx.call(`/api/conflicts/${conflict.opId}/resolve`, { method: 'POST', body: { action: 'apply-mine' } })).json;
    assert.equal(resolved.status, 'applied', JSON.stringify(resolved));
    assert.equal((await fx.call('/api/conflicts')).json.length, 0);
    const [draft] = (await fx.call('/api/drafts')).json;
    assert.deepEqual(draft.before, { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1241' }, 'written against what the record holds now');
    assert.equal(draft.after['Normalized value'], '1250');
  } finally { await fx.cleanup(); data.cleanup(); }
}, { timeout: 120_000 });

test('discarding a conflict backs up first, and a conflict that is gone is not found', async () => {
  const data = copyData();
  const fx = await startFixture({ dataDir: data.dir });
  try {
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    await fx.service.close();
    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; });
    fx.service = await (await import('../../apps/editor/server/service.ts')).startService(fx.options);
    const [conflict] = (await fx.call('/api/conflicts')).json;
    const before = (await fx.call('/api/backups')).json.length;
    assert.equal((await fx.call(`/api/conflicts/${conflict.opId}/resolve`, { method: 'POST', body: { action: 'discard' } })).json.status, 'discarded');
    const backups = (await fx.call('/api/backups')).json;
    assert.ok(backups.length > before);
    assert.ok(backups.some((b) => b.reason === 'before-discard'));
    assert.equal((await fx.call(`/api/conflicts/${conflict.opId}/resolve`, { method: 'POST', body: { action: 'discard' } })).json.code, 'not-found');
    assert.equal((await fx.call('/api/state')).json.conflicts, 0);
  } finally { await fx.cleanup(); data.cleanup(); }
}, { timeout: 120_000 });

// ---------------------------------------------------------------- impact

test('when the engine cannot be imported the preview says it is not available yet; with nothing pending it says so; it never says "nothing moves"', async () => {
  const fx = await startFixture({ impact: engineImpact(realData, '@atlas/no-such-engine/impact') });
  try {
    const state = (await fx.call('/api/state')).json;
    assert.equal(state.impact.available, false);
    assert.match(state.impact.note, /not available yet \(WP-11\)/i);
    const empty = (await fx.call('/api/impact', { method: 'POST', body: {} })).json;
    assert.equal(empty.status, 'nothing-pending');
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    const pending = (await fx.call('/api/impact', { method: 'POST', body: {} })).json;
    assert.equal(pending.status, 'unavailable');
    assert.match(pending.reason, /not available yet \(WP-11\)/i);
    assert.equal(pending.moved, undefined, 'no count at all');
  } finally { await fx.cleanup(); }
});

test('with the real engine (WP-11) behind it, WP-11\'s fixture correction lists its 16 moved answers, and says the estimate-stage questions were not asked', async () => {
  const fx = await startFixture();
  try {
    const state = (await fx.call('/api/state')).json;
    assert.equal(state.impact.available, true, state.impact.note);
    const applied = (await fx.call('/api/corrections', { method: 'POST', body: await tensileCorrection(fx) })).json;
    assert.equal(applied.status, 'applied', JSON.stringify(applied));
    assert.equal(applied.quoteCheck.status, 'verified');
    const report = (await fx.call('/api/impact', { method: 'POST', body: {} })).json;
    assert.equal(report.status, 'ready', JSON.stringify(report).slice(0, 300));
    assert.equal(report.moved, 16, 'the 16 answers WP-11 pins for this correction');
    assert.deepEqual(report.byTemplate, { census: 16 });
    assert.deepEqual(report.materials, ['M001']);
    assert.equal(report.estimatesPending, true, 'questions that need the estimate stage were not asked');
    assert.ok(report.questions.estimatesPending > 0 && report.questions.answered + report.questions.estimatesPending === report.questions.asked, JSON.stringify(report.questions));
    const product = report.moves.find((m) => m.record === 'product:M001/G001-01' && m.case === 'census/067/estimates-off');
    assert.deepEqual(product.changes, [{ field: 'verdict', before: 'PASS', after: 'FAIL' }, { field: 'group', before: 'meets', after: 'fail' }]);
    assert.equal(report.moves.filter((m) => m.changes.some((c) => c.field !== 'listing')).length, 16);
    // The same drafts, asked again, give the same answer; and a correction that moves nothing is not reported as a move.
    assert.equal((await fx.call('/api/impact', { method: 'POST', body: {} })).json.moved, 16);
  } finally { await fx.cleanup(); }
}, { timeout: 180_000 });

test('with a preview behind it, the pending records are handed over and its report is shown', async () => {
  let seen = null;
  const impact = impactFrom((records) => {
    seen = records;
    return Promise.resolve(readReport({
      mode: 'core', summary: { moved: 2, estimatesPending: true, byTemplate: { t1: 2 } }, cases: { asked: 10, answered: 6, estimatesPending: ['a', 'b', 'c', 'd'] }, listingShifts: 1, materials: ['M001'],
      moves: [{ case: 'template/t1', record: 'material:M001', materialId: 'M001', changes: [{ field: 'verdict', before: 'pass', after: 'fail' }] }],
    }, 1.5));
  });
  const fx = await startFixture({ impact });
  try {
    assert.equal((await fx.call('/api/state')).json.impact.available, true);
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    const report = (await fx.call('/api/impact', { method: 'POST', body: {} })).json;
    assert.equal(report.status, 'ready');
    assert.equal(report.moved, 2);
    assert.equal(report.estimatesPending, true);
    assert.equal(report.moves[0].changes[0].after, 'fail');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].table, 'measurements');
    assert.equal(seen[0].recordId, 'V000001');
  } finally { await fx.cleanup(); }
});

test('a report that does not look like one is a failure, not a pass', () => {
  for (const report of [null, {}, { summary: {} }, 'moved', { summary: { moved: 'two' } }]) assert.equal(readReport(report, 1).status, 'failed');
});

// ---------------------------------------------------------------- backups, and prepare review in the sandbox

test('backup now, and restore: the workspace goes back to what the backup held, after a safety backup', async () => {
  const fx = await startFixture();
  try {
    const before = (await fx.call('/api/backups', { method: 'POST', body: {} })).json;
    assert.equal(before.reason, 'manual');
    assert.ok(before.at);
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    assert.equal((await fx.call('/api/state')).json.drafts, 1);
    const restored = (await fx.call('/api/restore', { method: 'POST', body: { name: before.name } })).json;
    assert.equal(restored.status, 'restored');
    assert.equal((await fx.call('/api/state')).json.drafts, 0, 'the draft is gone with the restore');
    assert.ok((await fx.call('/api/backups')).json.some((b) => b.reason === 'before-restore'), 'what the restore replaced is itself kept');
    // A name that is not one of the listed backups is never turned into a path.
    for (const name of ['../../etc/passwd', '/tmp/x', 'atlas-nothing.sqlite']) {
      assert.equal((await fx.call('/api/restore', { method: 'POST', body: { name } })).json.code, 'not-found', name);
    }
  } finally { await fx.cleanup(); }
});

test('prepare review writes the change set and the changed table to the sandbox export folder and nothing under data/', async () => {
  const dataBefore = manifestHash();
  const fx = await startFixture();
  try {
    assert.equal((await fx.call('/api/export', { method: 'POST', body: { title: 'x' } })).json.code, 'export-refused', 'nothing to export yet');
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    const result = (await fx.call('/api/export', { method: 'POST', body: { title: 'Density of ECOMAX PLA' } })).json;
    assert.match(result.changeSetId, /^\d{4}-\d{2}-\d{2}-measurements-v000001-[0-9a-f]{4}$/);
    assert.equal(result.records, 1);
    assert.deepEqual(result.tables, ['measurements']);
    assert.ok(result.changeSetPath.startsWith(join(fx.sb.dir, 'export')), 'inside the sandbox');
    assert.ok(existsSync(result.changeSetPath));
    assert.ok(existsSync(join(fx.sb.dir, 'export', 'data', 'tables', 'measurements.csv')));
    assert.equal(manifestHash(), dataBefore, 'data/ is untouched');
    assert.ok(!existsSync(join(realData, 'review', 'change-sets', `${result.changeSetId}.json`)));
    const [draft] = (await fx.call('/api/drafts')).json;
    assert.equal(draft.status, 'exported');
    assert.equal(draft.changeSetId, result.changeSetId);
  } finally { await fx.cleanup(); }
});

// ---------------------------------------------------------------- ready time (the budget is 3 s; `npm run editor:measure` records it)

test('the editor is ready within 3 seconds when the workspace is current, and the recorded measurement says the same', async () => {
  const fx = await startFixture();
  try {
    await fx.service.close();
    const began = performance.now();
    fx.service = await (await import('../../apps/editor/server/service.ts')).startService(fx.options);
    assert.equal((await fx.call('/api/state')).status, 200);
    const ms = performance.now() - began;
    assert.ok(ms <= 3000, `ready in ${Math.round(ms)} ms`);
  } finally { await fx.cleanup(); }
  const recorded = JSON.parse(readFileSync(new URL('../../remake/measure/editor.json', import.meta.url), 'utf8'));
  assert.equal(recorded.warm.budgetMs, 3000);
  assert.equal(recorded.warm.withinBudget, true, 'remake/measure/editor.json: the warm start is over budget; rerun npm run editor:measure');
});

// ---------------------------------------------------------------- M1 review findings 6, 7 and 8

test('a restore that worked but could not reopen says so, and the editor then refuses everything until it is restarted (finding 6)', async () => {
  const data = copyData();
  const fx = await startFixture({ dataDir: data.dir });
  try {
    const made = (await fx.call('/api/backups', { method: 'POST', body: {} })).json;
    // The data is hand-edited without its manifest: the restored workspace cannot be opened on it.
    editRecords(data.dir, 'materials', (rows) => { rows[2][columnIndex('materials', 'Limitations')] = 'Stale manifest.'; }, { keepManifest: false });
    const restored = (await fx.call('/api/restore', { method: 'POST', body: { name: made.name } })).json;
    assert.equal(restored.status, 'refused');
    assert.equal(restored.code, 'restart-needed');
    assert.match(restored.detail, /The backup was restored, but the editor could not open the workspace again/);
    assert.match(restored.detail, /must be restarted/);
    for (const path of ['/api/state', '/api/drafts', '/api/backups']) {
      const after = await fx.call(path);
      assert.equal(after.status, 503, path);
      assert.equal(after.json.error, 'restart-needed', path);
      assert.match(after.json.message, /must be restarted/);
    }
  } finally { await fx.cleanup(); data.cleanup(); }
}, { timeout: 120_000 });

test('a restore that is refused and cannot reopen says both (finding 6)', async () => {
  const data = copyData();
  const fx = await startFixture({ dataDir: data.dir });
  try {
    const made = (await fx.call('/api/backups', { method: 'POST', body: {} })).json;
    const { writeFileSync, readdirSync } = await import('node:fs');
    // The chosen backup is damaged, so the restore is refused; the data is inconsistent, so the workspace cannot be opened either.
    const backups = join(fx.sb.dir, 'backups');
    writeFileSync(join(backups, readdirSync(backups).find((f) => f === made.name)), 'not a database');
    editRecords(data.dir, 'materials', (rows) => { rows[2][columnIndex('materials', 'Limitations')] = 'Stale manifest.'; }, { keepManifest: false });
    const restored = (await fx.call('/api/restore', { method: 'POST', body: { name: made.name } })).json;
    assert.equal(restored.code, 'restart-needed');
    assert.match(restored.detail, /The restore was refused \(.+\), and the editor could not open the workspace again/);
  } finally { await fx.cleanup(); data.cleanup(); }
}, { timeout: 120_000 });

test('after a restore the strip tells what the reopened workspace did: a restore onto data that moved is a rebase, shown (finding 6)', async () => {
  const data = copyData();
  const fx = await startFixture({ dataDir: data.dir });
  try {
    assert.equal((await fx.call('/api/state')).json.rebased, null, 'a fresh session did no open check work');
    const made = (await fx.call('/api/backups', { method: 'POST', body: {} })).json;
    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; }); // Git moved
    const restored = (await fx.call('/api/restore', { method: 'POST', body: { name: made.name } })).json;
    assert.equal(restored.status, 'restored', JSON.stringify(restored));
    const state = (await fx.call('/api/state')).json;
    assert.notEqual(state.rebased, null, 'the reopened workspace rebuilt on the new base, and the strip says so');
    assert.equal(typeof state.rebased.reason, 'string');
  } finally { await fx.cleanup(); data.cleanup(); }
}, { timeout: 120_000 });

test('the editor backs up every ten minutes when something changed, not every hour, and not at all when nothing did (finding 7)', async () => {
  let clock = Date.parse('2026-10-21T08:00:00.000Z');
  const minutes = (n) => { clock += n * 60_000; };
  const fx = await startFixture({ now: () => new Date(clock), backupEveryMs: 600_000 });
  try {
    const editor = fx.service.editor;
    const count = async () => (await fx.call('/api/backups')).json.length;
    const atStart = await count();
    assert.equal(atStart, 1, 'one backup when the editor opened');
    minutes(1);
    await fx.call('/api/corrections', { method: 'POST', body: await densityCorrection(fx) });
    minutes(4);
    assert.equal(await editor.backupIfDue(), null, 'five minutes after the last backup: not due');
    minutes(6);
    const made = await editor.backupIfDue();
    assert.match(made.path, /-hourly\.sqlite$/, 'eleven minutes after it, with a draft since: due');
    assert.equal(await count(), 2);
    minutes(30);
    assert.equal(await editor.backupIfDue(), null, 'and nothing changed since that one');
    assert.equal(await count(), 2);
  } finally { await fx.cleanup(); }
});

test('a page image that cannot be read is the end of that response only: no stat failure becomes a crash, no read failure kills the editor (finding 8)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-image-'));
  const asDirectory = join(dir, 'o-1.png');
  mkdirSync(asDirectory); // stat works, the read fails with EISDIR once the headers are sent
  const server = createServer((req, res) => sendImage(res, req.url === '/gone' ? join(dir, 'gone.png') : req.url === '/null' ? null : asDirectory));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const get = (path) => new Promise((resolve) => {
    const request = httpRequest({ host: '127.0.0.1', port, path }, (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode, ended: true })); res.on('error', () => resolve({ status: res.statusCode, ended: false })); res.on('close', () => resolve({ status: res.statusCode, ended: false })); });
    request.on('error', () => resolve({ status: null, ended: false }));
    request.end();
  });
  const crashes = [];
  const onUncaught = (error) => crashes.push(error);
  process.on('uncaughtException', onUncaught);
  try {
    assert.equal((await get('/gone')).status, 404, 'a file that vanished after the lookup is a missing page');
    assert.equal((await get('/null')).status, 404);
    const unreadable = await get('/dir');
    assert.equal(unreadable.ended, false, 'the response is cut off, not completed');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(crashes, [], 'and nothing was thrown out of the stream');
    assert.equal((await get('/gone')).status, 404, 'the server is still answering');
  } finally {
    process.off('uncaughtException', onUncaught);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a worker that stops after its replacement started does not reject the replacement\'s requests or drop it (finding 10)', async () => {
  const made = [];
  const fake = () => {
    const handlers = {};
    const worker = { posted: [], on: (event, fn) => { handlers[event] = fn; }, postMessage(m) { worker.posted.push(m); }, terminate() {}, unref() {}, handlers };
    made.push(worker);
    return worker;
  };
  const provider = engineImpact(realData, undefined, fake);
  assert.equal(provider.unavailable, null);
  const records = [{ id: 'r' }];
  const report = { summary: { moved: 0 } };

  const first = provider.preview(records);
  assert.equal(made.length, 1);
  made[0].handlers.error(new Error('boom'));
  assert.equal((await first).status, 'failed', 'the first worker\'s own error ends its own request');

  const second = provider.preview(records);
  assert.equal(made.length, 2, 'a new worker took over');
  made[0].handlers.exit(1); // the first worker's late exit
  made[0].handlers.error(new Error('late'));
  const third = provider.preview(records); // must still go to the second worker, not start a third
  assert.equal(made.length, 2, 'the late events did not drop the current worker');
  made[1].handlers.message({ id: made[1].posted[0].id, report });
  made[1].handlers.message({ id: made[1].posted[1].id, report });
  assert.equal((await second).status, 'ready', 'and did not reject its request');
  assert.equal((await third).status, 'ready');

  const pending = provider.preview(records);
  provider.close();
  assert.equal((await pending).status, 'failed', 'closing ends what is waiting');
  made[1].handlers.exit(0); // after close: nothing left to end, and no throw
});
