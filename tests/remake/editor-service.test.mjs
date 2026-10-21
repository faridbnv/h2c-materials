// WP-13: the correction journey through the editor service, on a sandbox workspace and a fixture private store. Find a product, read
// its source page beside the record, correct a value (every write-service guard runs), see a stale edit and a conflict without losing
// the draft, keep drafts across a restart, back up and restore, and prepare a review in the sandbox export folder, never in data/.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Of } from '../../packages/data/src/digest.ts';
import { impactFrom, readReport } from '../../apps/editor/server/impact.ts';
import { columnIndex, copyData, editRecords, realData, realRecords } from './data-helpers.mjs';
import { dropTemplate } from './write-helpers.mjs';
import { QUOTE, SOURCE, densityCorrection, startFixture } from './editor-helpers.mjs';

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

test('with no engine on this branch the impact preview says it is not available yet; with nothing pending it says so; it never says "nothing moves"', async () => {
  const fx = await startFixture();
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

test('with a preview behind it, the pending records are handed over and its report is shown', async () => {
  let seen = null;
  const impact = impactFrom((records) => {
    seen = records;
    return Promise.resolve(readReport({
      mode: 'core', summary: { moved: 2, estimatesPending: true, byTemplate: { t1: 2 } }, listingShifts: 1, materials: ['M001'],
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
