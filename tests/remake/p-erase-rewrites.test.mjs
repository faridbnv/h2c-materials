// WP-20: a P-erase pair may declare the few literal edits a MOVE forces (a path written relative to the old place), and
// nothing else. The declared list is complete (an undeclared edit still fails), and a stale rewrite fails loudly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { applyRewrites, compareErased } from '../../remake/tools/p-erase.mjs';

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
      assert.match(from, /\.\.\//, `${file}: a rewrite is for a relative path`);
      assert.ok(to.split('../').length > from.split('../').length, `${file}: the moved file is deeper, so the path gains a level`);
    }
  }
});
