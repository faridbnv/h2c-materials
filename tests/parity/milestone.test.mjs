// The milestone corpus (5,000 seeded replays), generated at run time and pinned: a change to the seed or the generator fails a test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { MILESTONE_REPLAYS, PR_REPLAYS, engineCorpusCases, mutationCases, syntheticDb } from '../../packages/parity/src/corpora.ts';
import { RANDOM_SEED, digestOfCases, randomCases } from '../../packages/parity/src/corpus.ts';
import { cli, corpus, db, root } from './helpers.mjs';

// Two pins. The first needs no data (a made-up db), so a change to the generator or the seed fails whatever the data is.
// The second is the real db's, and holds while the release is the one pinned (the data moves daily; a new release is a re-pin).
const SYNTHETIC = { r5000: 'sha256:34ab4d0f4f9ac7e3ef015d383ccf24f099accf9c84666193fd3adad171b9b9c9', r1000: 'sha256:ddcd944befaa83e4fcb15aa8054f7e518c5a507048a0bf2c557a877fa25630fd' };
const REAL = { release: '7c6da496722d', milestone: 'sha256:76357b8b95880f6cb5abe305da660154be2f1ba64be278e52204c29cf75db0b9' };

test('the sizes are the contract\'s: 1,000 per code PR, 5,000 at a milestone, seed 7', () => {
  assert.equal(PR_REPLAYS, 1000);
  assert.equal(MILESTONE_REPLAYS, 5000);
  assert.equal(RANDOM_SEED, 7);
});

test('the generator is pinned on a made-up db: the 5,000 and the 1,000 each have the digest recorded here', () => {
  const syn = syntheticDb();
  assert.equal(digestOfCases(randomCases(syn, 5000)), SYNTHETIC.r5000, 'the milestone generator or its seed changed');
  assert.equal(digestOfCases(randomCases(syn, 1000)), SYNTHETIC.r1000);
  assert.deepEqual(randomCases(syn, 5000).slice(0, 1000), randomCases(syn, 1000), 'the first 1,000 of the 5,000 are the 1,000');
});

test('the milestone corpus is v0\'s templates and census plus 5,000 replays whose first 1,000 are exactly v0\'s', async () => {
  const ms = engineCorpusCases(corpus, db, true);
  assert.equal(ms.length, 30 + 276 + 5000);
  assert.equal(new Set(ms.map((c) => c.id)).size, ms.length);
  assert.equal(ms.filter((c) => c.group === 'random').length, 5000);
  assert.equal(ms.at(-1).id, 'random/5000');
  const v0Random = corpus.cases.filter((c) => c.group === 'random');
  if (corpus.generatedFrom.release === db.meta.release.id) assert.deepEqual(ms.filter((c) => c.group === 'random').slice(0, 1000), v0Random);
  else assert.equal(digestOfCases(ms.filter((c) => c.group === 'random').slice(0, 1000)), digestOfCases(randomCases(db, 1000)));
  assert.deepEqual(engineCorpusCases(corpus, db, false), corpus.cases, 'PR mode is v0 as it is');
});

test('the milestone corpus on the real db is pinned for the release it was pinned on', () => {
  if (db.meta.release.id !== REAL.release) { console.log(`# real-db pin skipped: this db is release ${db.meta.release.id}, pinned for ${REAL.release}`); return; }
  assert.equal(digestOfCases(engineCorpusCases(corpus, db, true)), REAL.milestone);
});

test('the mutation cases are 30 templates, 60 census cases and 150 random ones', () => {
  const m = mutationCases(corpus);
  assert.deepEqual(['template', 'census', 'random'].map((g) => m.filter((c) => c.group === g).length), [30, 60, 150]);
});

test('CLI: --milestone runs the 5,000-replay corpus (a slice of it, here: ids random/49xx)', () => {
  const r = spawnSync(process.execPath, [cli, '--noop', '--milestone', '--only', 'random/49', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /milestone \(5000 replays; per PR 1000\)/);
  assert.match(r.stdout, /cases: 100 compared of 5306 in the corpus/);
  assert.match(r.stdout, /RESULT: zero/);
});

test('CLI: without --milestone the same selection finds nothing, which is an error and not a pass', () => {
  const r = spawnSync(process.execPath, [cli, '--noop', '--only', 'random/49', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 70);
  assert.match(r.stderr, /selection is empty/);
});

test('CLI: --milestone with --fault is a usage error', () => {
  const r = spawnSync(process.execPath, [cli, '--milestone', '--fault', 'tie-order'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 64);
  assert.match(r.stderr, /--milestone is a size for --noop or --new/);
});
