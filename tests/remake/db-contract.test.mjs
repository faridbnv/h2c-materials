// WP-06: the typed contract of dist/db.json (packages/data/src/db-contract.ts) holds for a real build, and fails on faults.
// Builds first when dist/db.json is missing (npm run build; dist/ is gitignored).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { checkDb, parseDb, REQUIRED_SECTIONS } from '../../packages/data/src/db-contract.ts';
import { str, num, lit, arr, obj, union, nul, record } from '../../packages/data/src/shape.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const path = join(root, 'dist/db.json');
let real;

before(() => {
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  real = JSON.parse(readFileSync(path, 'utf8'));
});

test('a real dist/db.json satisfies the contract', () => {
  const result = checkDb(real);
  assert.deepEqual(result.ok ? [] : result.problems, []);
  assert.ok(result.ok);
});

test('top-level keys: the required sections are all present and nothing outside the contract is', () => {
  for (const key of REQUIRED_SECTIONS) assert.ok(key in real, key);
  const result = checkDb({ ...real, surprise: 1 });
  assert.ok(!result.ok);
  assert.match(result.problems.join('\n'), /db\.surprise: key is not in the contract/);
});

test('the same text parses through parseDb', () => {
  assert.ok(parseDb(readFileSync(path, 'utf8')).ok);
  assert.ok(!parseDb('{not json').ok);
});

test('faults are named by path: a missing section, a wrong kind, an unknown enum word, an extra key', () => {
  const { grades: _grades, ...withoutGrades } = real;
  assert.match(checkDb(withoutGrades).problems?.join('\n') ?? '', /db\.grades: required key is missing/);

  const wrongKind = structuredClone(real);
  wrongKind.measurements[3].value = 'four';
  assert.match(checkDb(wrongKind).problems?.join('\n') ?? '', /db\.measurements\[3\]\.value/);

  const wrongWord = structuredClone(real);
  wrongWord.registry.properties[0].domain = 'optical';
  assert.match(checkDb(wrongWord).problems?.join('\n') ?? '', /db\.registry\.properties\[0\]\.domain: expected "mechanical" \| "thermal" \| "physical"/);

  const extra = structuredClone(real);
  extra.sources[0].internalNote = 'x';
  assert.match(checkDb(extra).problems?.join('\n') ?? '', /db\.sources\[0\]\.internalNote: key is not in the contract/);

  assert.ok(!checkDb(null).ok);
  assert.ok(!checkDb([]).ok);
});

test('the shape combinators: objects, optional keys, unions, literals, maps', () => {
  const shape = obj({ id: str, kind: lit('a', 'b') }, { weight: union(num, nul), tags: record(str), list: arr(num) });
  const ok = (v) => shape.check(v, 'v', []);
  assert.ok(ok({ id: 'x', kind: 'a' }));
  assert.ok(ok({ id: 'x', kind: 'b', weight: null, tags: { k: 'v' }, list: [1, 2] }));
  assert.ok(!ok({ id: 'x', kind: 'c' }));
  assert.ok(!ok({ id: 'x', kind: 'a', weight: 'heavy' }));
  assert.ok(!ok({ id: 'x', kind: 'a', list: [1, '2'] }));
  assert.ok(!ok({ id: 'x', kind: 'a', extra: 1 }));
  assert.ok(!ok({ kind: 'a' }));
  assert.ok(!ok(null));
  assert.ok(!ok(Object.assign([], { id: 'x', kind: 'a' })));
});
