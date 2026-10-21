// WP-19: the old unit tests of the engine, unedited, run against the new engine. Each file under test/ that imports an engine
// module is run by `node --test` in a child process with the module resolution hook tests/parity/redirect-engine.mjs, which
// sends every import of app/js/engine/<name>.js to the staged engine (the old files with the ported modules switched in). That
// is the metamorphic relations (test/metamorphic.test.js), the 38 constraints cases, the product, workspace, screening and
// acceptance cases: 317 tests that were written against the old files and now hold for the port.
//
// A control runs one file against a staged engine with a fault planted in the port of constraints, and must fail: the port is
// what the files ran against.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PORT_DIR, WIRED, stageEngine } from '@atlas/engine';
import { root } from './helpers.mjs';

const OLD_TESTS = [
  'acceptance', 'bounds', 'brief', 'constraints', 'coverage-priority06-09', 'database', 'evidence-ledger', 'format', 'gate-verdicts', 'indices',
  'know-how', 'metamorphic', 'new-property', 'own-anchor', 'polymer-environment', 'product-claims', 'product-screening', 'registry-ui', 'scenario',
  'screening', 'search', 'selection-products', 'templates', 'workspace', 'workspace-acceptance',
].map((name) => `test/${name}.test.js`);

/** `node --test` over the given files with every engine import redirected to the staged engine `dir`. */
function runOnStaged(dir, files) {
  // Inside `node --test` the environment says "you are a test child", which makes a nested runner speak the child protocol, not text.
  const { NODE_TEST_CONTEXT: _context, ...env } = process.env;
  const child = spawn(process.execPath, ['--import', join(root, 'tests/parity/redirect-engine.mjs'), '--test', ...files], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...env, ATLAS_STAGED_ENGINE: dir, ATLAS_OLD_ENGINE_URL: pathToFileURL(join(root, 'app/js/engine') + '/').href },
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  return new Promise((resolve) => child.on('exit', (code) => {
    const count = (word) => Number(new RegExp(`^ℹ ${word} (\\d+)`, 'm').exec(out)?.[1] ?? Number.NaN);
    resolve({ code, tests: count('tests'), pass: count('pass'), fail: count('fail'), out });
  }));
}

test('constraints and workspace are in the committed switch, so the files below run against their ports', () => {
  assert.ok(WIRED.includes('constraints') && WIRED.includes('workspace'));
});

test('the old unit tests, the metamorphic relations among them, hold unedited against the new engine', async () => {
  const dir = stageEngine();
  const r = await runOnStaged(dir, OLD_TESTS);
  assert.equal(r.code, 0, r.out.slice(-3000));
  assert.equal(r.fail, 0);
  assert.ok(r.tests >= 300, `a real run: ${r.tests} tests`);
  assert.equal(r.pass, r.tests);
});

test('control: a fault planted in the port of constraints fails the old tests, so they ran against the port', async () => {
  const faultDir = mkdtempSync(join(tmpdir(), 'h2c-old-tests-fault-'));
  try {
    cpSync(PORT_DIR, faultDir, { recursive: true });
    const find = 'if (lo !== null && lo >= threshold) return STATUS.PASS;';
    const source = readFileSync(join(PORT_DIR, 'constraints.ts'), 'utf8');
    assert.equal(source.split(find).length - 1, 1);
    writeFileSync(join(faultDir, 'constraints.ts'), source.replace(find, 'if (lo !== null && lo > threshold) return STATUS.PASS;'));
    const r = await runOnStaged(stageEngine(WIRED, { portDir: faultDir }), ['test/constraints.test.js', 'test/metamorphic.test.js']);
    assert.notEqual(r.code, 0);
    assert.ok(r.fail > 0, `the planted fault must fail something: ${r.fail}`);
  } finally {
    rmSync(faultDir, { recursive: true, force: true });
  }
});
