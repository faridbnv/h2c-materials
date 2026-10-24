// WP-20: a P-erase pair may declare the few literal edits a MOVE forces (a path written relative to the old place), and
// nothing else. The declared list is complete (an undeclared edit still fails), and a stale rewrite fails loudly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { applyRewrites, compareErased, compareSplit } from '../../remake/tools/p-erase.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const oldJs = "import { join } from 'node:path';\nconst here = '/a/b';\nexport const vocab = join(here, '../../schema/vocab/x.csv');\n";
const movedTs = "import { join } from 'node:path';\nconst here: string = '/a/b';\nexport const vocab = join(here, '../../../schema/vocab/x.csv');\n";

test('a moved path is equal to the old file only with its declared rewrite', () => {
  const rewrite = { from: "'../../schema/vocab/", to: "'../../../schema/vocab/" };
  assert.equal(compareErased(oldJs, movedTs, [rewrite]).equal, true);
  const without = compareErased(oldJs, movedTs);
  assert.equal(without.equal, false);
  assert.match(without.firstDifference.erased, /\.\.\/\.\.\/\.\.\/schema/);
});

test('a rewrite does not excuse any other edit', () => {
  const rewrite = { from: "'../../schema/vocab/", to: "'../../../schema/vocab/" };
  const changed = movedTs.replace("'/a/b'", "'/a/c'");
  const result = compareErased(oldJs, changed, [rewrite]);
  assert.equal(result.equal, false);
});

test('a rewrite that matches nothing is stale and throws', () => {
  assert.throws(() => applyRewrites(oldJs, [{ from: "'../../nothing/", to: "'x'" }]), /rewrite not found/);
});

test('every rewrite declared in remake/p-erase.json is a path or an import of a file outside the moved tree', () => {
  const pairs = JSON.parse(readFileSync(join(root, 'remake/p-erase.json'), 'utf8')).pairs;
  const declared = pairs.filter((p) => p.rewrites);
  assert.ok(declared.length > 0);
  for (const { new: file, rewrites } of declared) {
    for (const { from, to } of rewrites) {
      assert.match(from, /\.\.?\//, `${file}: a rewrite is for a relative path`);
      if (/^['"]@atlas\//.test(to)) continue; // an import of an old engine file, now of the package that ports it (WP-24)
      if (file.startsWith('packages/pages/')) {
        // app/pages and app/js/ui moved into one package: an import specifier written for the new place, with no other text changed.
        assert.ok(/^['"]\.{1,2}\/[\w./-]+['"]$/.test(from) && /^['"]\.{1,2}\/[\w./-]+['"]$/.test(to), `${file}: ${from} -> ${to} is one import specifier`);
        continue;
      }
      assert.ok(to.split('../').length > from.split('../').length, `${file}: the moved file is deeper, so the path gains a level`);
    }
  }
});

const splitOld = "// header\nexport const a = 1;\nexport function f(x) { return x + a; }\nexport const b = [a, 2];\n";
const splitNew = "import { f } from './moved.ts';\nexport const a: number = 1;\nexport { f };\nexport const b = [a, 2];\n";
const splitMoved = "// moved\nexport function f(x: number) { return x + 1; }\n";

test('split: code moved to a module of its own equals the old file; an edit, an addition or a loss does not', () => {
  const edit = (t) => t.replace('x + 1', 'x + 2');
  assert.equal(compareSplit(splitOld, splitNew, [splitMoved.replace('x + 1', 'x + a')]).equal, true, 'comments and wiring are not compared');
  assert.equal(compareSplit(splitOld, splitNew, [splitMoved]).equal, false, 'a changed body is not a move');
  assert.equal(compareSplit(splitOld, splitNew, [edit(splitMoved)]).equal, false);
  assert.equal(compareSplit(splitOld, splitNew, []).equal, false, 'a statement that went nowhere is a loss');
  assert.equal(compareSplit(splitOld, splitNew + 'export const extra = 3;\n', [splitMoved.replace('x + 1', 'x + a')]).equal, false, 'a statement that was added is not a move');
});
