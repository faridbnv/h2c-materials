// The parity CLI's contract with its callers: only known flags, and one exit code per outcome (docs/next/parity-contract.md).
//   0 zero / matches transitions   1 differs   2 not computable   3 fault NOT caught   4 partial run   5 fault caught
//   64 usage   70 crash
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLI_ONLY, CLI_SMALL, cli, root } from './helpers.mjs';

const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
const SMALL = CLI_SMALL;

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
    [['--new', '--placeholder'], /choose one of/],
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
  const ok = run('--noop', '--only', CLI_ONLY, '--allow-partial', '--corpus', join(root, 'parity', 'corpus', 'v0.json'));
  assert.equal(ok.status, 0, ok.stderr);
});

test('a caught fault exits 5 (not 1, not 70); a zero run exits 0; a new side that answers nothing exits 2', () => {
  const caught = run('--fault', 'tie-order', ...SMALL);
  assert.equal(caught.status, 5, caught.stderr);
  assert.match(caught.stdout, /fault tie-order: caught/);
  // 5 is its own code: a caught fault is neither "differs" (1) nor a crash (70).
  assert.notEqual(caught.status, 1);
  assert.notEqual(caught.status, 70);
  assert.equal(run('--noop', ...SMALL).status, 0);
  assert.equal(run('--placeholder', ...SMALL).status, 2, 'old against a new side that answers nothing is not computable');
  const wrapped = run(...SMALL);
  assert.equal(wrapped.status, 0, `old against the wrapped engine: ${wrapped.stdout}${wrapped.stderr}`);
  // The new side reads the new build's database, which differs from the old by the registered reprint transition (WP-23): on these
  // cases that is zero or exactly the transition's listed differences, never an unexpected one.
  assert.match(wrapped.stdout, /RESULT: (zero|matches-transition)/);
  assert.doesNotMatch(wrapped.stdout, /UNEXPECTED|MISSING/);
  assert.match(wrapped.stdout, /old\s+vs\s+new \(wrapper\)/);
});

test('a run over a selection without --allow-partial exits 4', () => {
  assert.equal(run('--noop', '--only', CLI_ONLY).status, 4);
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

test('surfaces: an unknown or repeated surface, an empty list, and flags that do not fit the surfaces are usage errors (64)', () => {
  const cases = [
    [['--noop', '--surface', 'enginee'], /unknown surface/],
    [['--noop', '--surface', 'engine,engine'], /given twice/],
    [['--noop', '--surface', 'engine,'], /unknown surface ""/],
    [['--noop', '--surface', 'engine', '--tables-dir', '.'], /--tables-dir applies to the build and pages surfaces only/],
    [['--noop', '--surface', 'engine,build', '--tables-dir', '.'], /--tables-dir applies to the build and pages surfaces only/],
    [['--noop', '--tables-dir', '.'], /--tables-dir applies to the build and pages surfaces only/],
    [['--noop', '--only', ''], /empty one is not a value/],
    [['--noop', '--tables-dir', ''], /empty one is not a value/],
    [['--noop', '--surface', ''], /empty one is not a value/],
    [['--fault', 'tie-order', '--emit-transition', '/tmp/x.json', '--kind', 'bogus'], /known kinds are/],
    [['--noop', '--surface', 'build', '--tables-dir', '/no/such/dir'], /not a directory/],
    [['--fault', 'tie-order', '--surface', 'build'], /a fault is planted in the engine/],
    [['--fault', 'tie-order', '--surface', 'engine,pages'], /a fault is planted in the engine/],
    [['--milestone', '--fault', 'tie-order'], /--milestone is a size/],
  ];
  for (const [args, message] of cases) {
    const r = run(...args);
    assert.equal(r.status, 64, args.join(' '));
    assert.match(r.stderr, message, args.join(' '));
    assert.equal(r.stdout, '', 'nothing ran');
  }
});

test('with --only and no --surface only the engine runs; asking for the others as well is allowed and says so', () => {
  const r = run('--noop', ...SMALL);
  assert.match(r.stdout, /surfaces: engine\n/);
  const both = run('--noop', ...SMALL, '--surface', 'engine,ties');
  assert.equal(both.status, 0, both.stderr);
  assert.match(both.stdout, /surfaces: engine, ties/);
  assert.equal(both.stdout.match(/^RESULT:/gm).length, 1, 'exactly one RESULT line, which is what CI reads');
});

test('--json writes one file with every surface, the overall status and the timings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-cli-json-'));
  try {
    const out = join(dir, 'r.json');
    const r = run('--noop', ...SMALL, '--surface', 'engine,links', '--json', out);
    assert.equal(r.status, 0, r.stderr);
    const j = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(j.status, 'zero');
    assert.deepEqual(Object.keys(j.parity).sort(), ['engine', 'links']);
    assert.equal(j.surfaceReports.length, 1);
    assert.ok(j.timings.length >= 2 && j.wallMs > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the new surfaces and flags are documented in the CLI header and in the contract', () => {
  const doc = readFileSync(join(root, 'docs/next/parity-contract.md'), 'utf8');
  const header = readFileSync(cli, 'utf8').split('\n').slice(0, 24).join('\n');
  for (const word of ['--mutate', '--milestone', '--surface', '--tables-dir']) {
    assert.ok(header.includes(word), `${word} in the header`);
    assert.ok(doc.includes(word), `${word} in the contract`);
  }
  assert.match(doc, /parity:mutate/);
});

test('the last line says what the exit code says: a partial run is RESULT: partial, not zero; the last line is the only RESULT line', () => {
  const partial = run('--noop', '--only', CLI_ONLY);
  assert.equal(partial.status, 4);
  assert.match(partial.stdout.trim().split('\n').at(-1), /^RESULT: partial$/);
  const ok = run('--noop', ...SMALL);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout.trim().split('\n').at(-1), /^RESULT: zero$/);
});

test('a module that fails to load is a crash (70), never 1 (which means differs)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-cli-load-'));
  try {
    const src = join(root, 'packages', 'parity', 'src');
    cpSync(src, join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'run-cli.ts'), 'export const x = ;\n');
    const r = spawnSync(process.execPath, [join(dir, 'src', 'cli.ts'), '--noop'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 70, r.stderr);
    assert.match(r.stderr, /internal error, exit 70/);
    const missingExport = join(dir, 'src', 'run-cli.ts');
    writeFileSync(missingExport, "import { noSuchExport } from './compare.ts';\nexport const runCli = () => noSuchExport;\n");
    assert.equal(spawnSync(process.execPath, [join(dir, 'src', 'cli.ts'), '--noop'], { cwd: root, encoding: 'utf8' }).status, 70);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
