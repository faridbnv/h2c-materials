// WP-20: the new build (packages/build, reading the clean SQLite reconstruction) against the old one. Each test is one of the
// exit proofs: P-build is zero, two runs are byte-identical, and the tie order follows the file order (_ord) through the whole
// build, not only through the loader. Four whole builds run side by side (about 30 s each on a quiet machine); none of them
// writes into data/, build/ or dist/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildInCopy, buildNew, compareBuilds } from '../../packages/parity/src/p-build.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { parseCsv } from '../../packages/data/src/csv.ts';
import { root, sha } from './helpers.mjs';

const buildDate = readDb().meta.build;
const dist = { path: join(root, 'dist', 'db.json'), label: 'old build (dist/db.json)' };
const real = { db: sha('dist/db.json'), manifest: sha('data/manifest.json'), products: sha('build/src/products.js') };

// The same tables with the records of three tables in the opposite order. A first-wins rule, a tie, a "first of equals" now
// meets its candidates the other way round, so anything that reads the file in the wrong order shows in the database.
const scratch = mkdtempSync(join(tmpdir(), 'h2c-build-new-'));
const reversedTables = join(scratch, 'tables');
cpSync(join(root, 'data', 'tables'), reversedTables, { recursive: true });
for (const table of ['profiles', 'measurements', 'grades']) {
  const path = join(reversedTables, `${table}.csv`);
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');
  assert.equal(lines.pop(), '', 'a canonical file ends with a newline');
  const header = lines.shift();
  assert.equal(parseCsv(text, table).records.length, lines.length, `${table}: one record per line, so reversing the lines reverses the records`);
  writeFileSync(path, `${[header, ...lines.reverse()].join('\n')}\n`);
}
test.after(() => rmSync(scratch, { recursive: true, force: true }));

const settle = (promise) => { promise.catch(() => undefined); return promise; };
const first = settle(buildNew({ label: 'new build', buildDate }));
const second = settle(buildNew({ label: 'new build, second run', buildDate }));
const newReversed = settle(buildNew({ label: 'new build, records reversed', tablesDir: reversedTables, buildDate }));
const oldReversed = settle(buildInCopy({ label: 'old build, records reversed', tablesDir: reversedTables, buildDate }));

test('P-build: the new build\'s db.json equals the old build\'s, value by value (1.2 million of them)', async () => {
  const built = await first;
  const r = await compareBuilds(dist, { path: built.dbPath, label: built.label });
  assert.equal(r.status, 'zero', r.differences.slice(0, 5).map((d) => `${d.record} ${d.field}`).join('; '));
  assert.equal(r.differenceCount, 0);
  assert.ok(r.unitsCompared > 1_000_000, `${r.unitsCompared} values compared`);
});

test('the new build is the old one byte for byte: db.json, reference.json and the same release identity', async () => {
  const built = await first;
  const out = dirname(built.dbPath);
  assert.ok(readFileSync(dist.path).equals(readFileSync(built.dbPath)), 'db.json');
  assert.ok(readFileSync(join(root, 'dist', 'reference.json')).equals(readFileSync(join(out, 'reference.json'))), 'reference.json');
});

test('reproducible on one machine: two runs of the new build give the same bytes', async () => {
  const [a, b] = [await first, await second];
  for (const file of ['db.json', 'reference.json', 'validation-report.md']) {
    assert.ok(readFileSync(join(dirname(a.dbPath), file)).equals(readFileSync(join(dirname(b.dbPath), file))), `${file} differs between two runs`);
  }
});

test('tie order is kept through _ord: with the records of three tables reversed, the new build still equals the old one, and the answer did move', async () => {
  const [n, o] = [await newReversed, await oldReversed];
  const same = await compareBuilds({ path: o.dbPath, label: o.label }, { path: n.dbPath, label: n.label });
  assert.equal(same.status, 'zero', same.differences.slice(0, 5).map((d) => `${d.record} ${d.field}`).join('; '));
  // Not vacuous: the reversal changes the database, so the equality above is about order, not about an order that never mattered.
  const moved = await compareBuilds(dist, { path: n.dbPath, label: n.label });
  assert.equal(moved.status, 'differs', 'reversing the records changed nothing, so the test proves nothing about order');
  assert.ok(moved.differenceCount > 0);
});

test('P-build can fail on the new side: one changed value is named by its record and field', async () => {
  const built = await first;
  const db = JSON.parse(readFileSync(built.dbPath, 'utf8'));
  const was = db.materials[0].fullName;
  db.materials[0].fullName = `${was} (changed)`;
  const changed = join(scratch, 'changed-db.json');
  writeFileSync(changed, JSON.stringify(db));
  const r = await compareBuilds(dist, { path: changed, label: 'new build, one value changed' });
  assert.equal(r.status, 'differs');
  assert.equal(r.differenceCount, 1);
  assert.match(r.differences[0].field, /fullName/);
});

test('a build that cannot reconstruct its tables exits 1 and writes no db.json', () => {
  const bad = mkdtempSync(join(tmpdir(), 'h2c-build-bad-'));
  try {
    cpSync(join(root, 'data'), join(bad, 'data'), { recursive: true });
    const materials = join(bad, 'data', 'tables', 'materials.csv');
    writeFileSync(materials, readFileSync(materials, 'utf8').replace(',', ',x', 1)); // a hand edit; the manifest still holds the old digest
    const out = join(bad, 'out');
    const run = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(root, 'packages/build/src/cli.ts'), '--out', out, '--data-dir', join(bad, 'data')], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /do not reconstruct/);
    assert.equal(existsSync(join(out, 'db.json')), false);
  } finally {
    rmSync(bad, { recursive: true, force: true });
  }
});

test('the new build wrote nothing into the project: the old db, the manifest and the old code are as they were', async () => {
  await Promise.all([first, second, newReversed, oldReversed]);
  assert.equal(sha('dist/db.json'), real.db);
  assert.equal(sha('data/manifest.json'), real.manifest);
  assert.equal(sha('build/src/products.js'), real.products);
});
