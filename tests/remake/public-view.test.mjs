// WP-14: the public view's own logic, without a build: the stale-shell guard, the loader that will not return part of an
// answer, the tally the page shows, and the words held equal to the selector's. The built site and the engine's counts are
// tested in tests/parity/public-view.test.mjs (they need the old build's dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GROUP_ORDER } from '@atlas/domain';
import { loadMaterial, loadResult, NetworkError, partUrl } from '../../apps/public/src/load.ts';
import { DataShapeError, parseMaterial, parseResult } from '../../apps/public/src/model.ts';
import { assertSameRelease, embeddedRelease, StaleShellError } from '../../apps/public/src/release.ts';
import { sameCounts, tally, unsettledGroups } from '../../apps/public/src/tally.ts';
import { GROUP_WORD, VERDICT_WORD } from '../../apps/public/src/words.ts';
import { headline, unsettledLine } from '../../apps/public/src/copy.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = 'aaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbb';

const line = (id, verdict, group, extra = {}) => ({ materialId: id, name: `Name ${id}`, verdict, group, screened: false, listingRank: 1, products: null, best: null, ...extra });
const materials = [line('M001', 'PASS', 'meets'), line('M002', 'FAIL', 'fail'), line('M003', 'UNKNOWN', 'one-check-away'), line('M004', 'UNKNOWN', 'not-enough-data'), line('M005', 'UNKNOWN', 'not-enough-data', { screened: true })];
const result = (over = {}) => ({
  kind: 'result', release: R, snapshot: '2026-01-01', template: { name: 'T', description: 'd', notChecked: 'n', caseId: 'c' }, requirements: [{ text: 'Density at most 1,500 kg/m³', mandatory: true }],
  counts: { pass: 1, fail: 1, unknown: 3, screened: 1, total: 5 }, materials, ...over,
});
const material = (over = {}) => ({
  kind: 'material', release: R, materialId: 'M001', name: 'PLA', verdict: 'PASS', group: 'meets', groupReason: '', counts: null, best: null,
  results: [{ requirement: 'Density at most 1,500 kg/m³', status: 'PASS', reason: 'Published 1,020 kg/m³' }], products: [], ...over,
});
/** A fetch over a map of url -> body; an unknown url is a 404. */
const serve = (files, { status } = {}) => async (url) => {
  if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: (status ?? 200) < 400, status: status ?? 200, json: async () => structuredClone(files[url]) };
};

test('the page names its release inline, and a page that names none or garbage cannot compute', () => {
  const doc = (content) => ({ querySelector: (sel) => (sel === 'meta[name="h2c-release"]' && content !== null ? { getAttribute: () => content } : null) });
  assert.equal(embeddedRelease(doc(R)), R);
  for (const bad of [null, '', 'not-a-release', R.toUpperCase(), `${R}0`]) assert.throws(() => embeddedRelease(doc(bad)), /names no valid release/);
});

test('stale-shell guard: a part of another release is refused with both releases named; the same release passes', () => {
  assert.doesNotThrow(() => assertSameRelease(R, 'the results file', R));
  assert.throws(() => assertSameRelease(R, 'the results file', OTHER), (e) => e instanceof StaleShellError && e.embedded === R && e.found === OTHER && /release bbbbbbbbbbbb, this page is release aaaaaaaaaaaa/.test(e.message));
});

test('stale-shell guard in the loader: a results file or a material file of another release is refused, never shown', async () => {
  await assert.rejects(loadResult(R, serve({ [partUrl(R, 'result.json')]: result({ release: OTHER }) })), StaleShellError);
  await assert.rejects(loadMaterial(R, 'M001', serve({ [partUrl(R, 'material/M001.json')]: material({ release: OTHER }) })), StaleShellError);
  // ...and the good case returns the file, parsed
  const ok = await loadResult(R, serve({ [partUrl(R, 'result.json')]: result() }));
  assert.equal(ok.counts.total, 5);
  assert.equal((await loadMaterial(R, 'M001', serve({ [partUrl(R, 'material/M001.json')]: material() }))).name, 'PLA');
});

test('a part that is gone (404) means the page is older than the data: stale, not an error; a failed connection is neither', async () => {
  await assert.rejects(loadResult(R, serve({})), (e) => e instanceof StaleShellError && e.found === null && /not published for release aaaaaaaaaaaa/.test(e.message));
  await assert.rejects(loadResult(R, async () => { throw new TypeError('network down'); }), NetworkError);
  await assert.rejects(loadResult(R, serve({ [partUrl(R, 'result.json')]: result() }, { status: 503 })), NetworkError);
  await assert.rejects(loadResult(R, async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } })), DataShapeError);
});

test('a file whose rows do not add up to its own counts, or that is not the shape the page expects, is refused whole', async () => {
  await assert.rejects(loadResult(R, serve({ [partUrl(R, 'result.json')]: result({ counts: { pass: 2, fail: 1, unknown: 3, screened: 1, total: 5 } }) })), /do not add up to its own counts/);
  await assert.rejects(loadResult(R, serve({ [partUrl(R, 'result.json')]: result({ materials: [{ ...materials[0], verdict: 'MAYBE' }] }) })), /"verdict" is "MAYBE"/);
  await assert.rejects(loadResult(R, serve({ [partUrl(R, 'result.json')]: { ...result(), counts: { pass: 1 } } })), DataShapeError);
  await assert.rejects(loadMaterial(R, 'M001', serve({ [partUrl(R, 'material/M001.json')]: material({ materialId: 'M002' }) })), /holds M002, not M001/);
  await assert.rejects(loadMaterial(R, '../etc/passwd', serve({})), /names no material/);
  assert.throws(() => parseResult({ kind: 'material' }), DataShapeError);
  assert.throws(() => parseMaterial(null), DataShapeError);
});

test('the counts the page shows are the tally of the rows, and the groups of the unsettled are listed in the listing order', () => {
  const t = tally(materials);
  assert.deepEqual(t, { pass: 1, fail: 1, unknown: 3, screened: 1, total: 5 });
  assert.ok(sameCounts(t, result().counts));
  assert.ok(!sameCounts(t, { ...t, fail: 2 }));
  assert.deepEqual(unsettledGroups(materials), [{ group: 'one-check-away', count: 1 }, { group: 'not-enough-data', count: 2 }]);
  assert.equal(unsettledLine(3, unsettledGroups(materials)), 'Of the 3 that could not be settled: 1 one check away, 2 not enough data.');
  assert.equal(headline(10, 152), '10 of 152 materials meet every requirement');
  assert.equal(headline(1, 1), '1 of 1 material meets every requirement');
});

test('the words are the selector\'s own: the verdict words (decision.js), the group words (labels.js), a word for every group the engine has', async () => {
  const decision = readFileSync(join(root, 'app/js/ui/decision.js'), 'utf8');
  const old = /const VERDICT_WORD = (\{[^}]*\});/.exec(decision)?.[1];
  assert.ok(old, 'decision.js no longer has VERDICT_WORD: re-point this test at the selector\'s verdict words');
  assert.deepEqual(VERDICT_WORD, new Function(`return ${old}`)());
  const { unknownGroupWords } = await import('../../app/js/ui/labels.js');
  const counts = { 'one-check-away': 8, 'not-enough-data': 40, 'unlikely-to-meet': 44, hidden: 2 };
  const mine = unsettledGroups(Object.entries(counts).flatMap(([group, n]) => Array.from({ length: n }, (_, i) => line(`M${i}`, 'UNKNOWN', group))));
  assert.equal(mine.map((g) => `${g.count} ${GROUP_WORD[g.group].toLowerCase()}`).join(', '), unknownGroupWords(counts));
  for (const g of GROUP_ORDER) assert.ok(GROUP_WORD[g], `no word for the group ${g}`);
});
