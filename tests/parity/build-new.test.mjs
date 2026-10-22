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
import { BUILD_CASE, loadTransitions, partOf, settleSurface } from '../../packages/parity/src/transitions.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { spreadNote } from '../../app/js/ui/format.js';
import { parseCsv } from '../../packages/data/src/csv.ts';
import { root, sha } from './helpers.mjs';

const buildDate = readDb().meta.build;
const dist = { path: join(root, 'dist', 'db.json'), label: 'old build (dist/db.json)' };
// Since WP-23 the new build differs from the old one by exactly one registered transition (the reprint ruling): these are its
// listed build differences. Everything else must still be equal.
const listed = partOf(loadTransitions(join(root, 'parity', 'transitions')), (d) => d.case === BUILD_CASE);
// The shapes of what the transition moves (ids and positions set aside): on other data it reaches other records, by the same paths.
const shape = (d) => `${d.record}|${d.field}`.replace(/\[[A-Z]\d+(-\d+)?\]/g, '[]').replace(/\[\d+\]/g, '[]')
  .replace(/\|headline\.[A-Za-z0-9]+\./, '|headline.*.').replace(/\|summary\.[A-Za-z0-9]+\./, '|summary.*.')
  .replace(/^meta\|estimateModel\.properties\..*$/, 'meta|estimateModel.properties');
const listedShapes = new Set(listed.flatMap((f) => f.differences.map(shape)));
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

test('P-build: the new build\'s db.json equals the old build\'s value by value (1.2 million of them), apart from the registered reprint transition', async () => {
  const built = await first;
  const r = await compareBuilds(dist, { path: built.dbPath, label: built.label });
  assert.ok(r.unitsCompared > 1_000_000, `${r.unitsCompared} values compared`);
  assert.equal(r.status, 'differs', 'the reprint ruling moves the database, so a build with it cannot equal the old one');
  const settled = settleSurface(r, listed, BUILD_CASE);
  assert.equal(settled.status, 'matches-transition', [...settled.transitions.unexpected, ...settled.transitions.missing].slice(0, 5).map((d) => `${d.record} ${d.field}`).join('; '));
});

test('the page\'s own spread sentence (the old tool\'s spreadNote) does not call a twin silent: who shares a data sheet and who publishes nothing read as before', async () => {
  const built = await first;
  const after = JSON.parse(readFileSync(built.dbPath, 'utf8'));
  const before = readDb();
  const productsOf = (db, materialId) => db.grades.filter((g) => g.materialId === materialId && !g.retired).length;
  // the two clauses about the products that are not in the median: who shares a data sheet, and who publishes no value
  const clauses = (note) => [/(One of them shares|\d+ of them share) a data sheet[^.]*\./.exec(note)?.[0] ?? '', /(One publishes|The other \d+ publish) no value on file\./.exec(note)?.[0] ?? ''];
  let checked = 0, twinned = 0;
  for (const m of after.materials) {
    for (const [key, e] of Object.entries(m.headline)) {
      if (!e.spread) continue;
      const old = before.materials.find((x) => x.id === m.id).headline[key];
      assert.deepEqual(clauses(spreadNote(e, productsOf(after, m.id))), clauses(spreadNote(old, productsOf(before, m.id))), `${m.id} ${key}`);
      checked++;
      if (e.spread.twins) twinned++;
    }
  }
  assert.ok(checked > 1000 && twinned >= 100, `${checked} spreads checked, ${twinned} with a twin`);
  // the worked case: PPS-GF tensile strength in the print plane. QIDI reprints Polymaker's table; it publishes it, so it is not silent.
  const pps = after.materials.find((x) => x.id === 'M074').headline.tensileStrengthXY;
  const note = spreadNote(pps, productsOf(after, 'M074'));
  assert.equal(pps.value, 68.05);
  assert.match(note, /One of them shares a data sheet with another product/);
  assert.doesNotMatch(note, /no value on file/);
});

test('the new build is the old one byte for byte in reference.json and in its release identity; db.json differs by the transition only', async () => {
  const built = await first;
  const out = dirname(built.dbPath);
  assert.ok(readFileSync(join(root, 'dist', 'reference.json')).equals(readFileSync(join(out, 'reference.json'))), 'reference.json');
  assert.deepEqual(JSON.parse(readFileSync(built.dbPath, 'utf8')).meta.release, readDb().meta.release, 'release identity');
});

test('reproducible on one machine: two runs of the new build give the same bytes', async () => {
  const [a, b] = [await first, await second];
  for (const file of ['db.json', 'reference.json', 'validation-report.md']) {
    assert.ok(readFileSync(join(dirname(a.dbPath), file)).equals(readFileSync(join(dirname(b.dbPath), file))), `${file} differs between two runs`);
  }
});

test('tie order is kept through _ord: with the records of three tables reversed, the new build still equals the old one (apart from the registered reprint transition), and the answer did move', async () => {
  const [n, o] = [await newReversed, await oldReversed];
  const same = await compareBuilds({ path: o.dbPath, label: o.label }, { path: n.dbPath, label: n.label });
  const outside = same.differences.filter((d) => !listedShapes.has(shape(d)));
  assert.equal(same.truncated, false);
  assert.equal(outside.length, 0, outside.slice(0, 5).map((d) => `${d.record} ${d.field}`).join('; '));
  // Not vacuous: the reversal changes the database, so the equality above is about order, not about an order that never mattered.
  // What is not in the database is the same too: the validation report (every warning, with the row it names, which the reversal
  // moves) and the release identity (which digests the tables that build read, not the project's own).
  // The report's calibration tables (rows starting with a bar) carry numbers the reprint transition moves; every other line is equal.
  const prose = (path) => readFileSync(path, 'utf8').split('\n').filter((line) => !line.startsWith('|')).join('\n');
  assert.equal(prose(join(dirname(n.dbPath), 'validation-report.md')), prose(join(o.dir, 'build', 'reports', 'validation-report.md')), 'validation report');
  assert.deepEqual(JSON.parse(readFileSync(n.dbPath, 'utf8')).meta.release, JSON.parse(readFileSync(o.dbPath, 'utf8')).meta.release, 'release identity');
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
  const r = await compareBuilds({ path: built.dbPath, label: built.label }, { path: changed, label: 'new build, one value changed' });
  assert.equal(r.status, 'differs');
  assert.equal(r.differenceCount, 1);
  assert.match(r.differences[0].field, /fullName/);
});

test('a build that cannot reconstruct its tables exits 1 and writes no db.json', () => {
  const bad = mkdtempSync(join(tmpdir(), 'h2c-build-bad-'));
  try {
    cpSync(join(root, 'data'), join(bad, 'data'), { recursive: true });
    const materials = join(bad, 'data', 'tables', 'materials.csv');
    const [header, ...rows] = readFileSync(materials, 'utf8').split('\n');
    writeFileSync(materials, [header, `x${rows[0]}`, ...rows.slice(1)].join('\n')); // a hand edit of a record; the manifest still holds the old digest
    const out = join(bad, 'out');
    const run = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(root, 'packages/build/src/cli.ts'), '--out', out, '--data-dir', join(bad, 'data')], { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /do not reconstruct/);
    assert.match(run.stderr, /SHA-256/, 'the digest check is what refused it');
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
