// The parity CLI's contract with its callers: only known flags, and one exit code per outcome (docs/next/parity-contract.md).
//   0 zero / matches transitions   1 differs   2 not computable   3 fault NOT caught   4 partial run   5 fault caught
//   64 usage   70 crash
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cli, root } from './helpers.mjs';

const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
const SMALL = ['--only', 'template/', '--allow-partial'];

test('an unknown flag is a usage error (64), never ignored', () => {
  for (const args of [['--bogus'], ['--noop', '--bogus'], ['--noop', '--allow-partials'], ['--only=template/'], ['-noop'], ['--NOOP']]) {
    const r = run(...args, ...SMALL);
    assert.equal(r.status, 64, args.join(' '));
    assert.match(r.stderr, /unknown flag/, args.join(' '));
    assert.equal(r.stdout, '', 'nothing ran');
  }
});

test('a stray argument, a repeated flag, a missing value and a flag used as a value are usage errors (64)', () => {
  const cases = [
    [['--noop', 'template/'], /unexpected argument/],
    [['--only', '--noop'], /needs a value, but the next argument is the flag --noop/],
    [['--fault', '--only', 'template/'], /needs a value/],
    [['--db'], /needs a value/],
    [['--noop', '--noop'], /given twice/],
    [['--only', 'template/', '--only', 'census/'], /given twice/],
    [['--noop', '--new'], /choose one of/],
  ];
  for (const [args, message] of cases) {
    const r = run(...args);
    assert.equal(r.status, 64, args.join(' '));
    assert.match(r.stderr, message, args.join(' '));
  }
});

test('--list-faults and every known flag are accepted', () => {
  const r = run('--list-faults');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /tie-order/);
  const ok = run('--noop', '--only', 'template/', '--allow-partial', '--corpus', join(root, 'parity', 'corpus', 'v0.json'));
  assert.equal(ok.status, 0, ok.stderr);
});

test('a caught fault exits 5 (not 1, not 70); a zero run exits 0; the placeholder new side exits 2', () => {
  const caught = run('--fault', 'tie-order', ...SMALL);
  assert.equal(caught.status, 5, caught.stderr);
  assert.match(caught.stdout, /fault tie-order: caught/);
  // 5 is its own code: a caught fault is neither "differs" (1) nor a crash (70).
  assert.notEqual(caught.status, 1);
  assert.notEqual(caught.status, 70);
  assert.equal(run('--noop', ...SMALL).status, 0);
  assert.equal(run(...SMALL).status, 2, 'old against the placeholder new side is not computable');
});

test('a run over a selection without --allow-partial exits 4', () => {
  assert.equal(run('--noop', '--only', 'template/').status, 4);
});

test('a crash exits 70, never 1 (which means differs) and never 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-cli-'));
  try {
    const missingDb = run('--noop', ...SMALL, '--db', join(dir, 'no-such-db.json'));
    assert.equal(missingDb.status, 70, missingDb.stderr);
    assert.match(missingDb.stderr, /internal error, exit 70/);
    assert.match(missingDb.stderr, /ENOENT/);
    const bad = join(dir, 'corpus.json');
    writeFileSync(bad, '{ not json');
    const badCorpus = run('--noop', ...SMALL, '--corpus', bad);
    assert.equal(badCorpus.status, 70, badCorpus.stderr);
    assert.equal(run('--noop', ...SMALL, '--corpus', join(dir, 'nope.json')).status, 70);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the exit codes are documented in docs/next/parity-contract.md and in the CLI header', () => {
  const doc = readFileSync(join(root, 'docs/next/parity-contract.md'), 'utf8');
  const header = readFileSync(cli, 'utf8').split('\n').slice(0, 20).join('\n');
  for (const code of ['0', '1', '2', '3', '4', '5', '64', '70']) {
    assert.match(doc, new RegExp(`\\| \`?${code}\`? \\|`), `exit ${code} in the contract's table`);
  }
  assert.match(header, /5 a fault was injected and caught/);
  assert.match(header, /70 the tool itself crashed/);
});
