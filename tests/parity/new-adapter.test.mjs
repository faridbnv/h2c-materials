// WP-11: the new side of the harness is the old engine behind the typed wrapper (@atlas/engine). Old against wrapped must be
// exactly zero; the harness must still see a fault in the wrapped engine and a fault in the wrapper's own output; and the
// comparison must not depend on object identity (it holds when the wrapper's answer goes through a structured clone).
// The whole corpus (1,306 cases, about 3.5 minutes) is `npm run parity`; this file runs a subset that keeps every group.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDb } from '@atlas/data';
import { exitCode, runParity } from '../../packages/parity/src/compare.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { faultByName } from '../../packages/parity/src/faults.ts';
import { createNewAdapter } from '../../packages/parity/src/new-adapter.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { corpus, sharedOld } from './helpers.mjs';

const typedDb = () => {
  const checked = checkDb(readDb());
  assert.ok(checked.ok, 'dist/db.json must satisfy the typed contract of @atlas/data (run npm run build)');
  return checked.db;
};
const templates = corpus.cases.filter((c) => c.group === 'template');
const census = corpus.cases.filter((c) => c.group === 'census');
const random = corpus.cases.filter((c) => c.group === 'random');
const subset = [...templates, ...census.filter((_, i) => i % 6 === 0), ...random.filter((_, i) => i % 8 === 0)];
const quick = [...templates.slice(0, 10), ...census.slice(0, 6)];

const firstDifferences = (r) => r.differences.slice(0, 5).map((d) => `${d.case} ${d.record} ${d.tier}.${d.field}`).join('\n');

const compare = async (cases, options = {}) =>
  runParity({ corpusName: 'v0', cases, before: await sharedOld(), after: await createNewAdapter({ db: typedDb(), ...options }) });

test('old against the wrapped engine: zero differences, every case compared, exit 0', async () => {
  const r = await compare(subset);
  assert.equal(r.status, 'zero', firstDifferences(r));
  assert.equal(r.casesCompared, subset.length);
  assert.equal(r.casesNotComputable, 0);
  assert.ok(r.blocksCompared > 100_000, 'the comparison must have looked at records');
  assert.equal(exitCode(r.status), 0);
});

test('the wrapped engine is its own copy of the engine files: no module instance is shared with the old side', async () => {
  const r = await compare(quick, { engineDir: copyEngine([]) });
  assert.equal(r.status, 'zero');
});

test('the answer goes through a structured clone and still compares equal: nothing depends on object identity', async () => {
  const r = await compare(subset.filter((_, i) => i % 3 === 0), { transport: structuredClone });
  assert.equal(r.status, 'zero', firstDifferences(r));
});

for (const [name, tier] of [['tie-order', 'decision'], ['drop-cited-ids', 'evidence'], ['reason-wording', 'wording']]) {
  test(`a fault in the wrapped engine (${name}) is caught in the ${tier} tier`, async () => {
    const r = await compare([...templates, ...census.slice(0, 40)], { engineDir: copyEngine(faultByName(name).patches) });
    assert.equal(r.status, 'differs');
    assert.ok(r.differencesByTier[tier] > 0, `${name}: expected a ${tier} difference`);
  });
}

// Faults in the wrapper's own output: each mutates a clone of what the wrapper returned, and the harness must see it.
const mutated = (change) => (output) => {
  const copy = structuredClone(output);
  change(copy);
  return copy;
};
const firstProductRow = (o) => o.rows.find((row) => row.productId !== undefined && row.requirements.length > 1);
const WRAPPER_FAULTS = [
  ['two listing places swapped', 'differs', 'decision', 'listingRank', (o) => {
    const [a, b] = o.rows.filter((row) => row.productId === undefined);
    [a.listingRank, b.listingRank] = [b.listingRank, a.listingRank];
  }],
  ['a row names another Best product', 'differs', 'decision', 'gradeId', (o) => {
    const row = o.rows.find((x) => x.best !== undefined);
    row.best = o.rows.find((x) => x.productId !== undefined && x.productId !== row.best && x.materialId !== row.materialId).productId;
  }],
  ['a product row says another state', 'differs', 'decision', 'state.id', (o) => { firstProductRow(o).stateId = 'conditioned'; }],
  ['a reason entry is reworded', 'differs', 'wording', 'reason', (o) => { firstProductRow(o).reasons[0].text += ' (reworded)'; }],
  ['a product row loses its last requirement', 'not-computable', null, null, (o) => { firstProductRow(o).requirements.pop(); }],
  ['a result loses its constraintId', 'not-computable', null, null, (o) => { delete firstProductRow(o).requirements[0].constraintId; }],
];
for (const [what, status, tier, field, change] of WRAPPER_FAULTS) {
  test(`a fault in the wrapper's output (${what}) is not missed`, async () => {
    const r = await compare(quick.slice(0, 4), { transport: mutated(change) });
    assert.equal(r.status, status, `${what}: ${r.differences.slice(0, 3).map((d) => `${d.record} ${d.tier}.${d.field}`).join('; ')}`);
    if (tier) assert.ok(r.differences.some((d) => d.tier === tier && d.field === field), `${what}: expected ${tier}.${field}`);
    else assert.ok(r.casesNotComputable > 0 && r.differences.length === 0, `${what}: a case the wrapper could not answer is never read as equal`);
  });
}
