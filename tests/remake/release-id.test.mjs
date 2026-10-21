// WP-14: release identity v2 (remake/tools/release-id.mjs). The ID is the same from two checkouts at different paths,
// changes when one data cell changes, does not change when a file moves, and records the runtime it ran on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { NODE_PIN_FILE, RELEASE_ID_PATTERN, RELEASE_INPUTS, currentRuntime, releaseIdentity } from '../../remake/tools/release-id.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A checkout of just the release inputs, at `dest`. */
function checkout(dest) {
  for (const p of [...Object.values(RELEASE_INPUTS).flatMap((spec) => spec.paths), NODE_PIN_FILE]) {
    mkdirSync(dirname(join(dest, p)), { recursive: true });
    cpSync(join(root, p), join(dest, p), { recursive: true });
  }
  return dest;
}

/** A new checkout under a folder of its own, `depth` folders down. */
function fresh(...depth) {
  const dest = join(mkdtempSync(join(tmpdir(), 'h2c-rid-')), ...depth);
  mkdirSync(dest, { recursive: true });
  return checkout(dest);
}

const a = fresh('a');
const base = releaseIdentity(a);

test('the ID is 12 hex characters, and the checkout in place gives the same one', () => {
  assert.match(base.id, RELEASE_ID_PATTERN);
  assert.equal(releaseIdentity(root).id, base.id);
  for (const [part, n] of Object.entries(base.files)) assert.ok(n > 0, `the ${part} part found no file`);
});

test('two checkouts at different paths and depths give the same ID and the same part digests', () => {
  const b = fresh('a-very', 'much-deeper', 'checkout with spaces');
  const other = releaseIdentity(b);
  assert.equal(other.id, base.id);
  assert.deepEqual(other.inputs, base.inputs);
});

test('changing one data cell changes the ID, through the data part alone', () => {
  const b = fresh('b');
  const file = join(b, 'data/tables/measurements.csv');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines[1] = lines[1].replace(/^([^,"]+)/, '$1x'); // the first cell of the first row
  writeFileSync(file, lines.join('\n'));
  const changed = releaseIdentity(b);
  assert.notEqual(changed.id, base.id);
  const moved = Object.keys(base.inputs).filter((k) => changed.inputs[k] !== base.inputs[k]);
  assert.deepEqual(moved, ['data']);
});

test('moving a file does not change the ID: a source file into another folder, a table into a sub-folder, a renamed source file', () => {
  const b = fresh('c');
  mkdirSync(join(b, 'packages/domain/src/moved/deeper'), { recursive: true });
  renameSync(join(b, 'packages/domain/src/core/tidy.ts'), join(b, 'packages/domain/src/moved/deeper/tidy-renamed.ts'));
  mkdirSync(join(b, 'data/tables/sub'));
  renameSync(join(b, 'data/tables/polymers.csv'), join(b, 'data/tables/sub/polymers.csv'));
  assert.equal(releaseIdentity(b).id, base.id);
});

test('what is named IS an input: renaming a table is a new release, and so is adding or removing a file', () => {
  const renamed = fresh('d');
  renameSync(join(renamed, 'data/tables/polymers.csv'), join(renamed, 'data/tables/polymers2.csv'));
  assert.notEqual(releaseIdentity(renamed).id, base.id);
  const added = fresh('e');
  writeFileSync(join(added, 'packages/domain/src/core/new-rule.ts'), 'export const x = 1;\n');
  assert.notEqual(releaseIdentity(added).id, base.id);
});

test('what only draws the page, the impact preview, the command line and operating-system litter are not inputs', () => {
  const b = fresh('f');
  writeFileSync(join(b, 'data/tables/.DS_Store'), 'litter');
  writeFileSync(join(b, 'packages/domain/src/.DS_Store'), 'litter');
  writeFileSync(join(b, 'packages/engine/src/cli.ts'), 'changed\n');
  writeFileSync(join(b, 'packages/engine/src/impact/preview.ts'), 'changed\n');
  writeFileSync(join(b, 'packages/engine/src/impact/base-worker.ts'), 'changed\n');
  mkdirSync(join(b, 'apps/public/src'), { recursive: true });
  writeFileSync(join(b, 'apps/public/src/App.vue'), '<template></template>\n');
  assert.equal(releaseIdentity(b).id, base.id);
  // ...but the engine itself is
  writeFileSync(join(b, 'packages/engine/src/context.ts'), `${readFileSync(join(b, 'packages/engine/src/context.ts'), 'utf8')}\n// edit\n`);
  assert.notEqual(releaseIdentity(b).id, base.id);
});

test('the runtime is an input: the Node pin, the exact Node version and the ICU version each change the ID', () => {
  const runtime = currentRuntime(a);
  assert.deepEqual(Object.keys(runtime), ['nodePin', 'node', 'icu']);
  assert.equal(runtime.nodePin, readFileSync(join(root, NODE_PIN_FILE), 'utf8').trim());
  assert.equal(runtime.node, process.versions.node);
  const ids = [{ ...runtime }, { ...runtime, nodePin: '99.0.0' }, { ...runtime, node: '99.0.0' }, { ...runtime, icu: '0.1' }].map((r) => releaseIdentity(a, { runtime: r }).id);
  assert.equal(new Set(ids).size, 4);
  assert.equal(ids[0], base.id);
});

test('npm run release:id prints the ID alone; --json prints the parts', () => {
  const run = (...args) => spawnSync(process.execPath, [join(root, 'remake/tools/release-id.mjs'), ...args], { encoding: 'utf8', cwd: root });
  const plain = run();
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout.trim(), releaseIdentity(root).id);
  const json = JSON.parse(run('--json').stdout);
  assert.equal(json.id, plain.stdout.trim());
  assert.deepEqual(Object.keys(json.inputs), ['data', 'schema', 'rules', 'engine', 'view', 'questions', 'dependencies', 'runtime']);
});

/** Append a comment to one file of a fresh checkout and give the part digests that moved. */
function movedBy(dir, file) {
  const b = fresh(dir);
  writeFileSync(join(b, file), `${readFileSync(join(b, file), 'utf8')}\n// edit\n`);
  const changed = releaseIdentity(b);
  return { id: changed.id, moved: Object.keys(base.inputs).filter((k) => changed.inputs[k] !== base.inputs[k]) };
}

test('the question /v3/ asks and how its snapshot is compiled are inputs: CASE_ID and the compile options change the ID', () => {
  const b = fresh('q1');
  const file = join(b, 'apps/public/tools/make-data.ts');
  const text = readFileSync(file, 'utf8');
  assert.match(text, /CASE_ID = 'template\/outdoor-structural-part\/strict'/);
  assert.match(text, /compileSnapshot\(snapshot, \{ estimates: false \}\)/);
  writeFileSync(file, text.replace("outdoor-structural-part/strict", "outdoor-structural-part/lenient"));
  const asked = releaseIdentity(b);
  assert.notEqual(asked.id, base.id);
  assert.notEqual(asked.inputs.view, base.inputs.view);
  writeFileSync(file, text.replace('{ estimates: false }', '{ estimates: true }'));
  const compiled = releaseIdentity(b);
  assert.notEqual(compiled.id, base.id);
  assert.notEqual(compiled.id, asked.id);
});

test('the compile, case and stage files of the impact module, the corpus and the words layer are inputs', () => {
  for (const [dir, file, part] of [
    ['i1', 'packages/engine/src/impact/compile.ts', 'engine'],
    ['i2', 'packages/engine/src/impact/cases.ts', 'engine'],
    ['i3', 'packages/engine/src/impact/stage.ts', 'engine'],
    ['i4', 'app/js/ui/labels.js', 'engine'],
    ['i5', 'app/js/ui/registry.js', 'engine'],
    ['i9', 'app/js/ui/table.js', 'engine'],
    ['i6', 'packages/data/src/db-contract.ts', 'engine'],
    ['i7', 'apps/public/tools/build.ts', 'view'],
  ]) {
    const { id, moved } = movedBy(dir, file);
    assert.notEqual(id, base.id, `${file} decides an answer`);
    assert.deepEqual(moved, [part], file);
  }
  const b = fresh('i8');
  const corpus = join(b, 'parity/corpus/v0.json');
  writeFileSync(corpus, `${readFileSync(corpus, 'utf8')} `);
  assert.notEqual(releaseIdentity(b).id, base.id);
});

test('the write service alone is not an input: a change to its workspace, export or command code keeps the ID', () => {
  const b = fresh('w1');
  for (const file of ['workspace.ts', 'export.ts', 'write.ts', 'cli.ts', 'replay.ts', 'rebuild.ts']) {
    // the checkout holds only the inputs, so the write service's file is put there, edited: present or changed, it is no input
    writeFileSync(join(b, 'packages/data/src', file), `${readFileSync(join(root, 'packages/data/src', file), 'utf8')}\n// edit\n`);
  }
  assert.equal(releaseIdentity(b).id, base.id);
});
