// WP-06: Node runs the .ts files of a linked workspace package directly (02 section 8 note).
// Node refuses to strip types under node_modules; a workspace link resolves to its real path, so it does not apply.
// Needs `npm ci` at the root (it creates the node_modules/@atlas/data link).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('@atlas/data is a symlink to packages/data and resolves to the real .ts file', () => {
  const link = join(root, 'node_modules/@atlas/data');
  assert.ok(lstatSync(link).isSymbolicLink(), 'run npm ci: the workspace link is missing');
  assert.equal(realpathSync(link), join(realpathSync(root), 'packages/data'));
  const resolved = fileURLToPath(import.meta.resolve('@atlas/data'));
  assert.equal(resolved, join(realpathSync(root), 'packages/data/src/index.ts'));
  assert.ok(!resolved.includes('node_modules'));
});

test('importing the package by name runs its TypeScript, in this process', async () => {
  const data = await import('@atlas/data');
  assert.equal(data.TABLE_NAMES.length, 36);
  assert.equal(typeof data.checkDb, 'function');
});

test('a plain `node` with no flags runs it too, without a warning', () => {
  const run = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { TABLE_NAMES, TABLES } from '@atlas/data'; console.log(TABLE_NAMES.length, TABLES.fx_rates.columns.length)"], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.trim(), '36 6');
  assert.equal(run.stderr, '', 'Node warned while stripping types');
});
