// "Not computable" is its own outcome: never equal, never zero, never a pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import { compareCase, exitCode, runParity } from '../../packages/parity/src/compare.ts';
import { canon, notComputable } from '../../packages/parity/src/canon.ts';
import { createNewPlaceholder } from '../../packages/parity/src/new-adapter.ts';
import { createOld, readDb } from '../../packages/parity/src/old-adapter.ts';
import { cli, root, small, corpus } from './helpers.mjs';

const computed = (records, caseId = 'c') => ({ caseId, outcome: 'computed', records });
const fake = (name, fn) => ({ name, evaluate: fn });

test('the new-side placeholder is not computable: status not-computable, exit 2, never zero', async () => {
  const r = await runParity({ corpusName: 'v0', cases: small, before: await createOld(readDb()), after: createNewPlaceholder() });
  assert.equal(r.status, 'not-computable');
  assert.equal(r.casesCompared, 0);
  assert.equal(r.casesNotComputable, small.length);
  assert.equal(r.differences.length, 0);
  assert.equal(exitCode(r.status), 2);
});

test('CLI default mode exits 2 with the placeholder', () => {
  const r = spawnSync(process.execPath, [cli, '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /NOT COMPUTABLE/);
  assert.match(r.stdout, /RESULT: not-computable/);
});

test('a not-computable value is not equal to 0, to absent, or to another not-computable value', () => {
  const rec = (v) => computed({ 'material:M': { decision: { n: v } } });
  for (const [a, b] of [[0, notComputable('x')], [notComputable('x'), 0], [notComputable('x'), notComputable('x')], [null, notComputable('x')], [undefined, notComputable('x')]]) {
    const c = compareCase(rec(a), rec(b));
    assert.equal(c.differences.length, 0);
    assert.equal(c.notComputable.length, 1, 'must be reported as not computable, not as equal');
  }
});

test('a case one side could not compute is not "equal"', () => {
  const bad = { caseId: 'c', outcome: 'not-computable', reason: 'boom' };
  for (const [a, b] of [[bad, computed({ 'material:M': { decision: { n: 0 } } })], [computed({ 'material:M': { decision: { n: 0 } } }), bad], [bad, bad]]) {
    const c = compareCase(a, b);
    assert.equal(c.notComputable.length, 1);
    assert.equal(c.differences.length, 0);
  }
});

test('"computed" with no records cannot read as zero differences', async () => {
  const same = fake('empty', (c) => computed({}, c.id));
  const r = await runParity({ corpusName: 'v0', cases: small, before: same, after: same });
  assert.equal(r.status, 'not-computable');
  assert.equal(r.casesCompared, 0);
});

test('an empty corpus selection is an error, not zero differences', async () => {
  await assert.rejects(runParity({ corpusName: 'v0', cases: [], before: createNewPlaceholder(), after: createNewPlaceholder() }), /nothing was compared/);
});

test('an engine that throws on a case is reported as not computable with the reason', async () => {
  const adapter = await createOld(readDb());
  const bad = { id: 'x', group: 'random', name: 'x', scenario: { ...small[0].scenario, constraints: [{ kind: 'numeric', property: 'density', operator: '=~', value: 1, mandatory: true }] } };
  const r = adapter.evaluate(bad);
  assert.equal(r.outcome, 'not-computable');
  assert.match(r.reason, /old: .*Unsupported operator/);
  // And at the run level it is not zero: the whole run is not computable.
  const run = await runParity({ corpusName: 'v0', cases: [bad], before: adapter, after: await createOld(readDb()) });
  assert.equal(run.status, 'not-computable');
});

test('0 and -0, NaN, undefined and null are all distinguished', () => {
  const rec = (v) => computed({ 'material:M': { decision: { n: v } } });
  for (const [a, b] of [[0, -0], [null, undefined], [1, '1'], [NaN, 0], [Infinity, null]]) {
    assert.equal(compareCase(rec(a), rec(b)).differences.length, 1, `${String(a)} vs ${String(b)}`);
  }
  assert.equal(compareCase(rec(NaN), rec(NaN)).differences.length, 0, 'NaN equals NaN under Object.is');
  assert.equal(compareCase(rec(0.1 + 0.2), rec(0.3)).differences.length, 1, 'no tolerance');
});

test('canon: key order does not matter, array order does, cycles throw', () => {
  assert.equal(canon({ b: 1, a: [1, 2] }), canon({ a: [1, 2], b: 1 }));
  assert.notEqual(canon([1, 2]), canon([2, 1]));
  assert.notEqual(canon(0), canon(-0));
  const o = {}; o.self = o;
  assert.throws(() => canon(o), /cycle/);
  assert.throws(() => canon(() => 1), /cannot encode/);
});

test('a record that exists on one side only is a difference', () => {
  const c = compareCase(computed({ 'material:M1': { decision: { verdict: 'PASS' } } }), computed({ 'material:M1': { decision: { verdict: 'PASS' } }, 'material:M2': { decision: { verdict: 'FAIL' } } }));
  assert.equal(c.differences.length, 1);
  assert.equal(c.differences[0].record, 'material:M2');
  assert.equal(c.differences[0].field, '(record)');
});

test('a case with a case summary but no material records is not computable (a wrong db cannot read as zero)', () => {
  const only = computed({ case: { decision: { 'counts.pass': 0 } } });
  assert.equal(compareCase(only, only).notComputable.length, 2);
});

test('a record with a tier outside the four, or no tiers, throws instead of being skipped', () => {
  const a = computed({ 'material:M': { decision: { n: 1 }, decison: { n: 2 } } });
  assert.throws(() => compareCase(a, a), /unknown tier/);
  const b = computed({ 'material:M': { decision: { n: 1 } }, 'material:N': {} });
  assert.throws(() => compareCase(b, b), /no tiers/);
});

test('an adapter that throws is not computable for that case, and the run is not zero', async () => {
  const boom = fake('boom', () => { throw new Error('kaboom'); });
  const r = await runParity({ corpusName: 'v0', cases: small, before: boom, after: boom });
  assert.equal(r.status, 'not-computable');
  assert.match(r.notComputable[0].reason, /kaboom/);
});

test('a partial run says so: the whole corpus is the denominator, and the CLI exits 4 without --allow-partial', async () => {
  const known = new Set([...small.map((c) => c.id), 'other/1', 'other/2']);
  const r = await runParity({ corpusName: 'v0', cases: small, knownCaseIds: known, before: await createOld(readDb()), after: await createOld(readDb()) });
  assert.equal(r.status, 'zero');
  assert.equal(r.partial, true);
  assert.equal(r.casesInCorpus, small.length + 2);
  const cliRun = spawnSync(process.execPath, [cli, '--noop', '--only', 'template/'], { cwd: root, encoding: 'utf8' });
  assert.equal(cliRun.status, 4);
  assert.match(cliRun.stdout, /PARTIAL RUN/);
  assert.match(cliRun.stdout, /compared of 1306 in the corpus/);
});

test('the corpus is pinned: a truncated or edited file is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-corpus-'));
  try {
    const cut = { ...corpus, cases: corpus.cases.slice(0, 100) };
    writeFileSync(join(dir, 'cut.json'), JSON.stringify(cut));
    assert.throws(() => loadCorpus(join(dir, 'cut.json')), /digest/);
    const edited = structuredClone(corpus);
    edited.cases[0].scenario.anneal = !edited.cases[0].scenario.anneal;
    writeFileSync(join(dir, 'edited.json'), JSON.stringify(edited));
    assert.throws(() => loadCorpus(join(dir, 'edited.json')), /digest/);
    const counts = { ...corpus, counts: { ...corpus.counts, random: 5 } };
    writeFileSync(join(dir, 'counts.json'), JSON.stringify(counts));
    assert.throws(() => loadCorpus(join(dir, 'counts.json')), /counts say/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI refuses --noop with transitions, and refuses to write a transition from a noop or a not-computable run', () => {
  const a = spawnSync(process.execPath, [cli, '--noop', '--transitions', tmpdir(), '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(a.status, 64);
  const b = spawnSync(process.execPath, [cli, '--noop', '--emit-transition', join(tmpdir(), 'nope.json'), '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(b.status, 64);
  const c = spawnSync(process.execPath, [cli, '--emit-transition', join(tmpdir(), 'nope2.json'), '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(c.status, 64);
  assert.match(c.stderr, /refusing to write a transition/);
});
