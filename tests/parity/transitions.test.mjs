// Transition files: the run passes only when observed differences equal the listed ones exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runParity, exitCode } from '../../packages/parity/src/compare.ts';
import { faultByName } from '../../packages/parity/src/faults.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { createOld, createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { buildTransition, digestOf, loadTransitions, validateTransition } from '../../packages/parity/src/transitions.ts';
import { cli, root, small } from './helpers.mjs';

const known = new Set(small.map((c) => c.id));
const fault = faultByName('untested-as-zero');
const observe = async (transitions) => runParity({
  corpusName: 'v0', cases: small, knownCaseIds: known, before: await createOld(readDb()),
  after: await createOldAdapter({ name: 'fault', db: readDb(), engineDir: copyEngine(fault.patches) }), transitions,
});
const file = (differences, over = {}) => buildTransition({ id: 't', kind: 'science', description: 'test', ruling: 'OQ-test', corpus: 'v0', differences, ...over });

const observed = (await observe(undefined)).differences;
test('setup: the fault moves a handful of differences on the small set', () => assert.ok(observed.length > 3));

test('exactly the listed differences: matches-transition, exit 0', async () => {
  const r = await observe([file(observed)]);
  assert.equal(r.status, 'matches-transition');
  assert.equal(r.transitions.unexpected.length, 0);
  assert.equal(r.transitions.missing.length, 0);
  assert.equal(r.transitions.expected, observed.length);
  assert.equal(exitCode(r.status), 0);
});

test('one observed difference not listed (an extra diff) fails', async () => {
  const r = await observe([file(observed.slice(1))]);
  assert.equal(r.status, 'differs');
  assert.equal(r.transitions.unexpected.length, 1);
  assert.deepEqual(r.transitions.unexpected[0], observed[0]);
  assert.equal(exitCode(r.status), 1);
});

test('one listed difference not observed (a missing diff) fails', async () => {
  const phantom = { ...observed[0], record: 'material:NOPE', before: '"a"', after: '"b"' };
  const r = await observe([file([...observed, phantom])]);
  assert.equal(r.status, 'differs');
  assert.equal(r.transitions.missing.length, 1);
  assert.equal(r.transitions.missing[0].record, 'material:NOPE');
});

test('a listed difference with a different after value is both missing and unexpected', async () => {
  const wrong = { ...observed[0], after: '99999' };
  const r = await observe([file([wrong, ...observed.slice(1)])]);
  assert.equal(r.status, 'differs');
  assert.equal(r.transitions.unexpected.length, 1);
  assert.equal(r.transitions.missing.length, 1);
});

test('an empty transition list is no waiver', async () => {
  const r = await observe([file([])]);
  assert.equal(r.status, 'differs');
});

test('listing differences when the run is clean fails: they are missing', async () => {
  const r = await runParity({ corpusName: 'v0', cases: small, knownCaseIds: known, before: await createOld(readDb()), after: await createOldAdapter({ name: 'same', db: readDb(), engineDir: copyEngine([]) }), transitions: [file(observed)] });
  assert.equal(r.status, 'differs');
  assert.equal(r.transitions.missing.length, observed.length);
});

test('two files may split the list but not list one difference twice', async () => {
  const half = Math.floor(observed.length / 2);
  const r = await observe([file(observed.slice(0, half), { id: 'a' }), file(observed.slice(half), { id: 'b' })]);
  assert.equal(r.status, 'matches-transition');
  await assert.rejects(observe([file(observed, { id: 'a' }), file(observed.slice(0, 1), { id: 'b' })]), /already lists/);
});

test('a transition naming a case that is not in the corpus is an error', async () => {
  await assert.rejects(observe([file([{ ...observed[0], case: 'template/none/strict' }])]), /not in the corpus/);
});

test('a tampered file is refused: digest, ruling, kind, tier rule', () => {
  const good = file(observed);
  assert.doesNotThrow(() => validateTransition(good, 'g'));
  assert.throws(() => validateTransition({ ...good, differences: good.differences.slice(1) }, 'x'), /digest/);
  assert.throws(() => validateTransition({ ...good, ruling: '  ' }, 'x'), /ruling/);
  assert.throws(() => validateTransition({ ...good, kind: 'oops' }, 'x'), /kind/);
  const decisionAsDisplay = buildTransition({ ...good, kind: 'display' });
  assert.throws(() => validateTransition(decisionAsDisplay, 'x'), /needs kind "science"/);
  assert.equal(digestOf(observed), digestOf([...observed].reverse()), 'the digest does not depend on order');
});

test('wording-only differences may be a display or wording transition', () => {
  const w = { case: 'c', record: 'req:M/G/c0:x', tier: 'wording', field: 'reason', before: '"a"', after: '"b"' };
  assert.doesNotThrow(() => validateTransition(buildTransition({ id: 'w', kind: 'wording', description: 'd', ruling: 'ADR-x', corpus: 'v0', differences: [w] }), 'w'));
});

test('CLI: a transition file for a fault run passes with exit 0, and fails with exit 1 when one line is removed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-trans-'));
  try {
    const out = join(dir, '2026-10-21-fault.json');
    const base = [cli, '--fault', 'untested-as-zero', '--only', 'template/'];
    const emit = spawnSync(process.execPath, [...base, '--emit-transition', out, '--id', 'fault', '--kind', 'science', '--ruling', 'OQ-test', '--description', 'x'], { cwd: root, encoding: 'utf8' });
    assert.equal(emit.status, 1);
    const ok = spawnSync(process.execPath, [...base, '--transitions', dir], { cwd: root, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /RESULT: matches-transition/);
    // Remove one listed line and recompute the digest, as a careless editor would: the run must now fail.
    const t = JSON.parse(JSON.stringify(loadTransitions(dir)[0]));
    t.differences = t.differences.slice(1);
    t.digest = digestOf(t.differences);
    delete t.__file;
    writeFileSync(out, JSON.stringify(t));
    const bad = spawnSync(process.execPath, [...base, '--transitions', dir], { cwd: root, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /1 unexpected/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
