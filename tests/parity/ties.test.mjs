// Tie-shuffle: the product order is data, and among tied products the first one wins. The permutation and the sample are
// seeded and pinned; the first-wins check is exact against the old engine's own tie sets; and it can fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runParity } from '../../packages/parity/src/compare.ts';
import { digestOfCases } from '../../packages/parity/src/corpus.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { faultByName } from '../../packages/parity/src/faults.ts';
import { createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { TIE_PROBE, TIE_SAMPLE_MILESTONE, TIE_SAMPLE_PR, TIE_SEED, checkFirstWins, digestOfPermutation, permuteProductOrder, tieSample } from '../../packages/parity/src/ties.ts';
import { corpus, sha, engineFiles } from './helpers.mjs';

// Pinned: a change to the seed, the sampler or the permutation fails here (parity/corpus/** needs the owner's attest, so nothing is a file).
const PIN = {
  seed: 20261021,
  samplePr: 'sha256:6958dcd9e8bd218f9c98afdaf163f76bf4568f06d17ebb6d41125d8dd430ba81',
  sampleMilestone: 'sha256:d8ffc96f0893e00ea4ffa5e16f2aba87076e0d573552f71aa6808426c663b587',
  permutation: 'sha256:edda2bd52b3e9380221741f9d07aa52fbe545738567ed7673e327a602c9689ec',
};

const gradeDb = { materials: Array.from({ length: 12 }, (_, i) => ({ id: `S${i}`, gradeIds: Array.from({ length: i % 6 }, (__, k) => `G${i}-${k + 1}`) })) };

test('the seed, the samples and the permutation are pinned', () => {
  assert.equal(TIE_SEED, PIN.seed);
  assert.equal(digestOfCases(tieSample(corpus.cases, TIE_SAMPLE_PR)), PIN.samplePr);
  assert.equal(digestOfCases(tieSample(corpus.cases, TIE_SAMPLE_MILESTONE)), PIN.sampleMilestone);
  assert.equal(digestOfPermutation(gradeDb), PIN.permutation);
  assert.equal(tieSample(corpus.cases, TIE_SAMPLE_PR).length, 110);
  assert.equal(tieSample(corpus.cases, TIE_SAMPLE_MILESTONE).length, 468);
});

test('the sample keeps every template case and draws the rest from the corpus in corpus order', () => {
  const s = tieSample(corpus.cases, TIE_SAMPLE_PR);
  assert.equal(s.filter((c) => c.group === 'template').length, 30);
  const index = new Map(corpus.cases.map((c, i) => [c.id, i]));
  for (const group of ['template', 'census', 'random']) {
    const at = s.filter((c) => c.group === group).map((c) => index.get(c.id));
    assert.deepEqual(at, [...at].sort((x, y) => x - y), `${group} cases stay in corpus order`);
  }
});

test('every material with two or more products really changes order; the same products stay; one product or none stays put', () => {
  const db = permuteProductOrder(gradeDb);
  gradeDb.materials.forEach((m, i) => {
    const p = db.materials[i].gradeIds;
    assert.deepEqual([...p].sort(), [...m.gradeIds].sort());
    if (m.gradeIds.length >= 2) assert.notDeepEqual(p, m.gradeIds, m.id);
    else assert.deepEqual(p, m.gradeIds);
  });
  assert.deepEqual(permuteProductOrder(gradeDb).materials, db.materials, 'deterministic');
  assert.notDeepEqual(permuteProductOrder(gradeDb, 1).materials, db.materials, 'another seed, another order');
});

test('the real db: the permutation moves the product order of materials with 2+ products and nothing else', () => {
  const db = readDb();
  const p = permuteProductOrder(db);
  let moved = 0;
  db.materials.forEach((m, i) => {
    const ids = m.gradeIds ?? [];
    if (ids.length >= 2) { assert.notDeepEqual(p.materials[i].gradeIds, ids); moved++; }
    assert.deepEqual({ ...p.materials[i], gradeIds: 0 }, { ...m, gradeIds: 0 }, 'only gradeIds differ');
  });
  assert.ok(moved > 50, `${moved} materials reordered`);
  assert.equal(p.grades, db.grades, 'grades are shared, not copied or edited');
});

test('the tie probe is one read-only line: the probed engine answers exactly as the real one', async () => {
  const cases = corpus.cases.filter((c) => c.group === 'template').slice(0, 6);
  const probed = await createOldAdapter({ name: 'probed', db: readDb(), engineDir: copyEngine([TIE_PROBE]) });
  const plain = await createOldAdapter({ name: 'plain', db: readDb(), engineDir: copyEngine([]) });
  const r = await runParity({ corpusName: 'v0', cases, before: plain, after: probed });
  assert.equal(r.status, 'zero');
});

const sample = tieSample(corpus.cases, { template: 6, census: 4, random: 4 });

test('first wins, old against a second copy: the representative is the earliest tied product in the permuted order, everywhere', async () => {
  const base = readDb();
  const permutedDb = permuteProductOrder(readDb());
  const after = await createOldAdapter({ name: 'old copy', db: permutedDb, engineDir: copyEngine([]) });
  const r = await checkFirstWins({ cases: sample, base, permutedDb, permuted: after, beforeName: 'old' });
  assert.equal(r.status, 'zero');
  assert.ok(r.unitsCompared > 1000, `${r.unitsCompared} materials`);
  assert.match(r.notes.join(' '), /\d+ material-cases with products tied for best, [1-9]\d* of them where the permuted order must change/);
});

test('the swapped-tie fault is named by the rule check, material by material', async () => {
  const f = faultByName('tie-order');
  const base = readDb();
  const permutedDb = permuteProductOrder(readDb());
  const after = await createOldAdapter({ name: 'fault', db: permutedDb, engineDir: copyEngine(f.patches) });
  const r = await checkFirstWins({ cases: sample, base, permutedDb, permuted: after, beforeName: 'old' });
  assert.equal(r.status, 'differs');
  assert.ok(r.differenceCount > 100, `${r.differenceCount}`);
  for (const d of r.differences.slice(0, 20)) assert.ok(d.record.startsWith('material:') && d.tier === 'decision' && d.before !== d.after);
});

test('the same fault is also caught by plain parity on the permuted db', async () => {
  const f = faultByName('tie-order');
  const before = await createOldAdapter({ name: 'old', db: permuteProductOrder(readDb()) });
  const after = await createOldAdapter({ name: 'fault', db: permuteProductOrder(readDb()), engineDir: copyEngine(f.patches) });
  const r = await runParity({ corpusName: 'ties', cases: sample, before, after });
  assert.equal(r.status, 'differs');
  assert.ok(r.differencesByTier.decision > 0);
});

test('a sample with no tied products proves nothing: not computable, never zero', async () => {
  const db = readDb();
  const after = await createOldAdapter({ name: 'old copy', db: permuteProductOrder(db) });
  const r = await checkFirstWins({ cases: [], base: db, permutedDb: permuteProductOrder(db), permuted: after, beforeName: 'old' });
  assert.equal(r.status, 'not-computable');
  assert.match(r.notComputable.map((n) => n.reason).join(' '), /proved nothing/);
});

test('a side that cannot answer is not computable in the rule check', async () => {
  const db = readDb();
  const dead = { name: 'dead', evaluate: (c) => ({ caseId: c.id, outcome: 'not-computable', reason: 'no engine' }) };
  const r = await checkFirstWins({ cases: sample.slice(0, 3), base: db, permutedDb: permuteProductOrder(db), permuted: dead, beforeName: 'old' });
  assert.equal(r.status, 'not-computable');
  assert.equal(r.unitsCompared, 0);
});

test('the tie checks never wrote to the real engine files', () => {
  assert.equal(engineFiles.length, 10);
  for (const f of engineFiles) assert.ok(sha(f).length === 64);
});
