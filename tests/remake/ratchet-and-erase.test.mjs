// WP-06: the type ratchet and P-erase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countEscapes, measure, compare } from '../../remake/tools/types-ratchet.mjs';
import { compareErased, erase, rewriteSpecifiers } from '../../remake/tools/p-erase.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const fixture = (name) => readFileSync(join(root, 'tests/remake/fixtures/p-erase', name), 'utf8');

test('ratchet counts casts, any, @ts-expect-error and @ts-ignore, and not "as const" or text in strings', () => {
  const text = [
    'const a = x as string;',
    'const b = <number>y;',
    'const c = [1] as const;',
    'let d: any; let e: Array<any>;',
    "const note = '// @ts-expect-error in a string';",
    '// @ts-expect-error the reason',
    'const f: number = "s";',
    '/* @ts-ignore */',
    'const g = { as: 1 };',
  ].join('\n');
  assert.deepEqual(countEscapes(text), { casts: 2, any: 2, tsExpectError: 1, tsIgnore: 1 });
});

test('the committed baseline holds for the tree as it is', () => {
  const baseline = JSON.parse(readFileSync(join(root, 'remake/types-ratchet.json'), 'utf8'));
  assert.deepEqual(compare(baseline, measure(root)), []);
});

test('an increase fails, a new file starts at zero, a decrease passes', () => {
  const baseline = { files: { 'packages/a/x.ts': { casts: 2, any: 0, tsExpectError: 0, tsIgnore: 0 } } };
  const counts = (casts) => ({ casts, any: 0, tsExpectError: 0, tsIgnore: 0 });
  assert.deepEqual(compare(baseline, { files: { 'packages/a/x.ts': counts(2) } }), []);
  assert.deepEqual(compare(baseline, { files: { 'packages/a/x.ts': counts(1) } }), []);
  assert.equal(compare(baseline, { files: { 'packages/a/x.ts': counts(3) } }).length, 1);
  assert.equal(compare(baseline, { files: { 'packages/b/y.ts': counts(1) } }).length, 1);
});

test('the CLI exits 1 when a cast is added and says which file', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ratchet-'));
  try {
    mkdirSync(join(tmp, 'remake/tools'), { recursive: true });
    cpSync(join(root, 'remake/tools/types-ratchet.mjs'), join(tmp, 'remake/tools/types-ratchet.mjs'));
    cpSync(join(root, 'remake/types-ratchet.json'), join(tmp, 'remake/types-ratchet.json'));
    mkdirSync(join(tmp, 'packages/p/src'), { recursive: true });
    writeFileSync(join(tmp, 'packages/p/src/a.ts'), 'export const a = 1;\n');
    // typescript is resolved from the repo's node_modules through a link
    mkdirSync(join(tmp, 'node_modules'));
    cpSync(join(root, 'node_modules/typescript'), join(tmp, 'node_modules/typescript'), { recursive: true });
    const run = () => spawnSync(process.execPath, [join(tmp, 'remake/tools/types-ratchet.mjs')], { encoding: 'utf8' });
    assert.equal(run().status, 0);
    writeFileSync(join(tmp, 'packages/p/src/a.ts'), 'export const a = (1 as unknown) as number;\n');
    const failed = run();
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /packages\/p\/src\/a\.ts: casts 2 is above the baseline 0/);
    const update = spawnSync(process.execPath, [join(tmp, 'remake/tools/types-ratchet.mjs'), '--update'], { encoding: 'utf8' });
    assert.equal(update.status, 0, 'a newly converted file may be recorded at its measured count');
    assert.equal(run().status, 0);
    writeFileSync(join(tmp, 'packages/p/src/a.ts'), 'export const a = (1 as unknown) as number as number;\n');
    assert.equal(spawnSync(process.execPath, [join(tmp, 'remake/tools/types-ratchet.mjs'), '--update'], { encoding: 'utf8' }).status, 1, '--update never raises a recorded count');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('P-erase: a label-only conversion erases to its old file', () => {
  assert.deepEqual(compareErased(fixture('gate.old.js'), fixture('gate.new.ts')), { equal: true });
});

test('P-erase: a behaviour change hidden among the labels is named', () => {
  const result = compareErased(fixture('gate.old.js'), fixture('gate.changed.ts'));
  assert.equal(result.equal, false);
  assert.match(result.firstDifference.old, /edge: "indeterminate"/);
  assert.match(result.firstDifference.erased, /edge: "fail"/);
});

test('P-erase: layout does not matter, a renamed variable does; import specifiers go back to .js', () => {
  assert.equal(compareErased('const a = f(1,\n 2);', 'const a: number = f(1, 2,);').equal, true);
  assert.equal(compareErased('const a = f(1);', 'const b: number = f(1);').equal, false);
  assert.equal(rewriteSpecifiers("import { x } from './a.ts'; export * from \"../b.ts\"; await import('./c.ts');"), "import { x } from './a.js'; export * from \"../b.js\"; await import('./c.js');");
  assert.equal(rewriteSpecifiers("import y from 'pkg/file.ts'"), "import y from 'pkg/file.ts'", 'a package specifier is left alone');
  assert.match(erase('export function f(x: number): number { return x!; }'), /return x/);
});

test('P-erase: the parentheses a cast leaves behind are not a change, but grouping that decides is', () => {
  assert.equal(compareErased('const w = { a: 1 }[k] ?? "";', 'const w = ({ a: 1 } as Record<string, number>)[k] ?? "";').equal, true);
  assert.equal(compareErased('const v = (a + b) * c;', 'const v: number = (a + b) * c;').equal, true);
  assert.equal(compareErased('const v = (a + b) * c;', 'const v: number = a + b * c;').equal, false, 'dropping a needed pair of parentheses is a change');
  assert.equal(compareErased('const v = a + b * c;', 'const v: number = (a + b) * c;').equal, false, 'adding one is a change');
  assert.equal(compareErased('const f = () => ({ a: 1 });', 'const f = (): object => ({ a: 1 });').equal, true);
  assert.equal(compareErased('const f = () => ({ a: 1 });', 'const f = (): number => 1;').equal, false);
});

test('npm run parity:erase passes on the committed pairs', () => {
  const run = spawnSync(process.execPath, [join(root, 'remake/tools/p-erase.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /[1-9]\d* pair\(s\) label-only/);
});
