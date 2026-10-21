// WP-09 (proofs DP-1, DP-2, DP-17): CSV -> SQLite -> CSV is byte-identical for every table of the schema, and the round trip
// cannot pass on a partial or skipped set: a mangled cell, a lossy store, a missing table, a missing or extra file, a header
// change and a manifest that disagrees with the files each make it fail, with the table named.
// This is the file next-verify's "New-code tests" step runs for the round trip (the step globs tests/remake/*.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TABLE_NAMES } from '../../packages/data/src/generated/columns.ts';
import { open } from '../../packages/data/src/driver.ts';
import { diffAgainstRef } from '../../packages/data/src/diff.ts';
import { DataInputError, buildInMemory, rebuildWorkspace } from '../../packages/data/src/rebuild.ts';
import { roundtrip } from '../../packages/data/src/roundtrip.ts';
import { columnIndex, copyData, editRecords, editText, realData, realRecords, root } from './data-helpers.mjs';

const cli = (...args) => spawnSync(process.execPath, [join(root, 'packages/data/src/cli.ts'), ...args], { encoding: 'utf8' });
const REBUILD_BUDGET_MS = 5000;
const ROUNDTRIP_BUDGET_MS = 10000;

/** Run `fn` on a scratch copy of the data, then remove it. */
async function withCopy(fn) {
  const { dir, cleanup } = copyData();
  try { return await fn(dir); } finally { cleanup(); }
}
const statusOf = (result, table) => result.tables.find((t) => t.table === table)?.status;

// ---------------------------------------------------------------- the real data

test('the real data round-trips byte-identical: 36 of 36 tables, within the time budget', () => {
  const result = roundtrip();
  const bad = result.tables.filter((t) => t.status !== 'identical').map((t) => `${t.table}: ${t.status} ${t.detail}`);
  assert.deepEqual(bad, []);
  assert.equal(result.expected, 36);
  assert.equal(result.identical, 36);
  assert.equal(result.tables.length, 36);
  assert.equal(result.ok, true);
  assert.ok(result.ms.total <= ROUNDTRIP_BUDGET_MS, `round trip took ${Math.round(result.ms.total)} ms, budget ${ROUNDTRIP_BUDGET_MS} ms`);
  console.log(`  round trip: ${result.identical}/${result.expected} identical in ${Math.round(result.ms.total)} ms`);
});

test('the set of tables is the same four ways: the schema, the CSV files, the manifest and the database', () => {
  const files = readdirSync(join(realData, 'tables')).filter((f) => f.endsWith('.csv')).map((f) => f.slice(0, -4)).sort();
  const manifest = Object.keys(JSON.parse(readFileSync(join(realData, 'manifest.json'), 'utf8')).tables).sort();
  const { db } = buildInMemory(realData);
  try {
    const stored = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_meta'").all().map((r) => r.name).sort();
    assert.deepEqual(files, [...TABLE_NAMES].sort());
    assert.deepEqual(manifest, [...TABLE_NAMES].sort());
    assert.deepEqual(stored, [...TABLE_NAMES].sort());
  } finally { db.close(); }
});

test('a fresh rebuild writes a complete database file within budget, with its base stamp, and leaves nothing beside it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-rebuild-'));
  try {
    const path = join(dir, 'ws', 'atlas.sqlite');
    const report = rebuildWorkspace({ dbPath: path });
    assert.ok(report.ms.total <= REBUILD_BUDGET_MS, `rebuild took ${Math.round(report.ms.total)} ms, budget ${REBUILD_BUDGET_MS} ms`);
    console.log(`  rebuild: ${report.rows} rows, ${Math.round(report.ms.total)} ms`);
    assert.deepEqual(readdirSync(join(dir, 'ws')), ['atlas.sqlite']);
    const db = open(path, { readOnly: true });
    try {
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
      assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
      assert.equal(db.prepare('SELECT count(*) AS n FROM measurements').get().n, 15852);
      const meta = Object.fromEntries(db.prepare('SELECT key, value FROM _meta').all().map((r) => [r.key, r.value]));
      assert.match(meta.sqlite_version, /^3\./);
      assert.equal(meta.node_version, process.version);
      assert.match(meta.manifest_sha256, /^[0-9a-f]{64}$/);
      assert.match(meta.schema_sha256, /^[0-9a-f]{64}$/);
      assert.equal(meta.tables, '36');
      assert.equal(meta.rows, String(report.rows));
    } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a failed rebuild leaves the database already in place untouched and no partial file behind', () => withCopy((data) => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-rebuild-'));
  try {
    const path = join(dir, 'atlas.sqlite');
    rebuildWorkspace({ dbPath: path });
    const before = readFileSync(path);
    editRecords(data, 'grades', (rows) => { rows[0][columnIndex('grades', 'MaterialID')] = 'M999'; });
    assert.throws(() => rebuildWorkspace({ dataDir: data, dbPath: path }), DataInputError);
    assert.ok(readFileSync(path).equals(before));
    assert.deepEqual(readdirSync(dir), ['atlas.sqlite']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}));

// ---------------------------------------------------------------- the round trip must fail, with the table named

test('a hand edit that is not canonical fails the round trip for exactly that table (trailing space, CRLF, needless quotes)', async () => {
  const cases = {
    'a space after a value': { change: (text) => text.replace('\nM001,PLA,', '\nM001,PLA ,'), status: 'differs', detail: /^line \d+:/ },
    'quotes where none are needed': { change: (text) => text.replace('\nM001,PLA,', '\n"M001",PLA,'), status: 'differs', detail: /^line \d+:/ },
    'CRLF line endings': { change: (text) => text.replaceAll('\n', '\r\n'), status: 'problem', detail: /CRLF line endings; canonical files use LF/, keepManifest: false },
  };
  for (const [name, { change, status, detail, keepManifest = true }] of Object.entries(cases)) {
    await withCopy((dir) => {
      editText(dir, 'materials', change, { keepManifest });
      const result = roundtrip({ dataDir: dir });
      assert.equal(result.ok, false, name);
      assert.equal(statusOf(result, 'materials'), status, name);
      assert.equal(result.identical, status === 'differs' ? 35 : 0, name);
      assert.match(result.tables.find((t) => t.table === 'materials').detail, detail, name);
    });
  }
});

test('a pin in headlines (empty in the committed data) also round-trips, so that table is proven by more than its header', () => withCopy((dir) => {
  const measurement = realRecords('measurements')[0];
  const key = realRecords('headline_definitions')[0][0];
  editRecords(dir, 'headlines', (rows) => { rows.push([measurement[columnIndex('measurements', 'MaterialID')], key, measurement[0], 'a pin for the test']); });
  const result = roundtrip({ dataDir: dir });
  assert.equal(result.ok, true);
  assert.equal(result.tables.find((t) => t.table === 'headlines').rows, 1);
}));

test('a file that is not valid UTF-8 fails with a plain reason, not a replacement character that hides the damage', () => withCopy((dir) => {
  const path = join(dir, 'tables', 'fx_rates.csv');
  const bytes = readFileSync(path);
  writeFileSync(path, Buffer.concat([bytes.subarray(0, 40), Buffer.from([0xff, 0xfe]), bytes.subarray(40)]));
  const result = roundtrip({ dataDir: dir });
  assert.equal(result.ok, false);
  assert.match(result.tables.find((t) => t.table === 'fx_rates').detail, /not valid UTF-8/);
}));

test('a rebuild reports every constraint failure it found, with the true count, not only the first twenty', () => withCopy((dir) => {
  editRecords(dir, 'grades', (rows) => { for (const row of rows.slice(0, 30)) row[columnIndex('grades', 'Status')] = 'mislaid'; });
  assert.throws(() => buildInMemory(dir), (e) => e instanceof DataInputError && e.problems.length === 30 && /30 problem\(s\)/.test(e.message) && /and 10 more/.test(e.message));
}));

test('a canonical edit round-trips: Git is the authority and the edit becomes the new base', () => withCopy((dir) => {
  editRecords(dir, 'materials', (rows) => { rows[0][columnIndex('materials', 'Best uses')] = 'An edited sentence, with a comma and "quotes".'; });
  const result = roundtrip({ dataDir: dir });
  assert.equal(result.ok, true);
  assert.equal(result.identical, 36);
}));

test('a cell that storage mangles ("4.30" read back as "4.3") is caught, and so is every other kind of damage to a stored value', () => withCopy((dir) => {
  const first = (db, where) => Number(db.prepare(`SELECT min(_ord) AS o FROM measurements WHERE ${where}`).get().o);
  editRecords(dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Raw numeric')] = '4.30'; });
  const clean = roundtrip({ dataDir: dir });
  assert.equal(clean.ok, true, '"4.30" in the file comes back as "4.30"');
  const mangles = {
    'a trailing zero lost': ['measurements', (db) => db.prepare("UPDATE measurements SET raw_numeric_text = '4.3' WHERE _ord = 1").run()],
    'a trailing zero added': ['measurements', (db) => db.prepare("UPDATE measurements SET raw_numeric_text = raw_numeric_text || '0' WHERE _ord = ?").run(first(db, 'raw_numeric IS NOT NULL AND _ord > 1'))],
    'a word turned into another word': ['measurements', (db) => db.prepare("UPDATE measurements SET normalized_value_text = 'Insufficient comparable data' WHERE _ord = ?").run(first(db, "normalized_value_text = 'Not published'"))],
    'a text cell changed': ['materials', (db) => db.prepare("UPDATE materials SET best_uses = best_uses || '.' WHERE _ord = 1").run()],
    'two rows swapped': ['grades', (db) => db.exec('UPDATE grades SET _ord = 1000001 WHERE _ord = 1; UPDATE grades SET _ord = 1 WHERE _ord = 2; UPDATE grades SET _ord = 2 WHERE _ord = 1000001')],
  };
  for (const [name, [table, mangle]] of Object.entries(mangles)) {
    const result = roundtrip({ dataDir: dir, afterLoad: mangle });
    assert.equal(result.ok, false, name);
    assert.equal(statusOf(result, table), 'differs', name);
    assert.equal(result.identical, 35, name);
  }
}));

test('a table that is missing from the rebuilt database fails the round trip: it is never skipped', () => {
  const result = roundtrip({ afterLoad: (db) => db.exec('DROP TABLE "fx_rates"') });
  assert.equal(result.ok, false);
  assert.equal(statusOf(result, 'fx_rates'), 'missing-table');
  assert.equal(result.identical, 35);
  assert.equal(result.tables.length, 36);
});

test('an extra table in the database fails the round trip', () => {
  const result = roundtrip({ afterLoad: (db) => db.exec('CREATE TABLE "stray" (x TEXT) STRICT') });
  assert.equal(result.ok, false);
  assert.equal(result.identical, 36);
  assert.match(result.problems.join('\n'), /table stray that is not in the schema/);
});

test('a missing CSV file fails the round trip and reports every table as failed or not checked, never as passed', () => withCopy((dir) => {
  rmSync(join(dir, 'tables', 'fx_rates.csv'));
  const result = roundtrip({ dataDir: dir });
  assert.equal(result.ok, false);
  assert.equal(result.identical, 0);
  assert.equal(result.tables.length, 36);
  assert.equal(statusOf(result, 'fx_rates'), 'problem');
  assert.ok(result.tables.filter((t) => t.table !== 'fx_rates').every((t) => t.status === 'not-checked'));
}));

test('an extra CSV file, a changed header, a manifest that disagrees and a missing manifest each fail the round trip', async () => {
  await withCopy((dir) => {
    writeFileSync(join(dir, 'tables', 'stray.csv'), 'A,B\n1,2\n');
    const result = roundtrip({ dataDir: dir });
    assert.equal(result.ok, false);
    assert.ok(result.tables.some((t) => t.table === 'stray' && t.status === 'problem'));
  });
  await withCopy((dir) => {
    editText(dir, 'fx_rates', (text) => text.replace('Currency,', 'Money,'));
    const result = roundtrip({ dataDir: dir });
    assert.equal(result.ok, false);
    assert.match(result.tables.find((t) => t.table === 'fx_rates').detail, /the header is \[Money/);
  });
  await withCopy((dir) => {
    editText(dir, 'fx_rates', (text) => text.replace('\n', '\n '), { keepManifest: false }); // an edit that `data:fmt` has not seen
    const result = roundtrip({ dataDir: dir });
    assert.equal(result.ok, false);
    assert.match(result.tables.find((t) => t.table === 'fx_rates').detail, /differs from the manifest/);
  });
  await withCopy((dir) => {
    rmSync(join(dir, 'manifest.json'));
    const result = roundtrip({ dataDir: dir });
    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /manifest\.json: missing/);
  });
});

// ---------------------------------------------------------------- the commands

test('npm run db:roundtrip: exit 0 and "36/36" on the real data; exit 1, the table named and "FAIL" on a damaged copy', () => {
  const good = cli('roundtrip');
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /ROUNDTRIP: 36\/36 tables byte-identical/);
  assert.match(good.stdout, /RESULT: pass/);
  assert.doesNotMatch(good.stdout, /SKIPPED|not run:|NOT RUN/); // wp:check reads these words as "nothing ran"
  const { dir, cleanup } = copyData();
  try {
    editText(dir, 'materials', (text) => text.replace('\nM001,PLA,', '\nM001,PLA ,'));
    const bad = cli('roundtrip', '--data', dir);
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /DIFFERS\s+materials/);
    assert.match(bad.stdout, /ROUNDTRIP: 35\/36/);
    assert.match(bad.stdout, /RESULT: FAIL/);
    editRecords(dir, 'grades', (rows) => { rows[0][columnIndex('grades', 'MaterialID')] = 'M999'; });
    const broken = cli('roundtrip', '--data', dir);
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /grades\.csv:2: MaterialID "M999" has no row in materials/);
  } finally { cleanup(); }
});

test('the commands refuse bad usage with exit 64 and never ignore a flag', () => {
  for (const args of [[], ['nonsense'], ['roundtrip', '--bogus'], ['diff'], ['rebuild', '--out'], ['roundtrip', '--data', 'a', '--data', 'b'], ['roundtrip', '/some/other/dir'], ['rebuild', 'extra']]) {
    assert.equal(cli(...args).status, 64, JSON.stringify(args));
  }
});

test('a flag that npm swallowed (npm run db:roundtrip --data x, without --) is refused rather than run on the default data', () => {
  const swallowed = spawnSync(process.execPath, [join(root, 'packages/data/src/cli.ts'), 'roundtrip'], { encoding: 'utf8', env: { ...process.env, npm_config_data: '/tmp/x' } });
  assert.equal(swallowed.status, 64);
  assert.match(swallowed.stderr, /npm took --data for itself; write npm run db:roundtrip -- --data/);
  // And through npm itself, the way a person would type it.
  const viaNpm = spawnSync('npm', ['run', '-s', 'db:roundtrip', '--data', '/tmp/x'], { cwd: root, encoding: 'utf8' });
  assert.equal(viaNpm.status, 64);
  assert.doesNotMatch(viaNpm.stdout, /RESULT: pass/);
});

// ---------------------------------------------------------------- db:diff

function gitRepoWithData(dir) {
  mkdirSync(join(dir, 'data'), { recursive: true });
  cpSync(join(realData, 'tables'), join(dir, 'data', 'tables'), { recursive: true });
  cpSync(join(realData, 'manifest.json'), join(dir, 'data', 'manifest.json'));
  const git = (...args) => { const r = spawnSync('git', ['-c', 'user.email=t@example.test', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  git('init', '-q');
  git('add', '.');
  git('commit', '-q', '-m', 'data');
  return git;
}

test('db:diff: a fresh rebuild of a commit differs from it by 0, and an edit shows exactly the edit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-diff-'));
  try {
    const git = gitRepoWithData(dir);
    const { db } = buildInMemory(join(dir, 'data'));
    try {
      const clean = diffAgainstRef(db, 'HEAD', dir);
      assert.equal(clean.differences, 0);
      assert.equal(clean.tables.length, 36);
      assert.equal(clean.sha, git('rev-parse', 'HEAD'));
      // One cell changed, one row added at the end, two rows swapped.
      db.exec("UPDATE materials SET best_uses = 'changed' WHERE _ord = 1");
      db.exec("INSERT INTO fx_rates (_ord, currency, rate_date, cad_per_unit_text, sourceid, locator, notes) SELECT 3, currency, '2000-01-01', cad_per_unit_text, sourceid, locator, notes FROM fx_rates WHERE _ord = 1");
      db.exec('UPDATE profile_notes SET _ord = 1000001 WHERE _ord = 1; UPDATE profile_notes SET _ord = 1 WHERE _ord = 2; UPDATE profile_notes SET _ord = 2 WHERE _ord = 1000001');
      const diff = diffAgainstRef(db, 'HEAD', dir);
      const by = Object.fromEntries(diff.tables.filter((t) => t.differences).map((t) => [t.table, t]));
      assert.deepEqual(Object.keys(by).sort(), ['fx_rates', 'materials', 'profile_notes']);
      assert.deepEqual(by.materials.changes.map((c) => [c.key, c.column, c.after]), [['M001', 'Best uses', 'changed']]);
      assert.equal(by.fx_rates.added.length, 1);
      assert.match(by.fx_rates.added[0], /\| 2000-01-01$/);
      assert.equal(by.profile_notes.reordered, true);
      assert.equal(diff.differences, 3);
      assert.throws(() => diffAgainstRef(db, 'no-such-ref', dir), /not a commit/);
      assert.throws(() => diffAgainstRef(db, '--output=x', dir), /not a git ref/);
    } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the db:diff command reads a database file against a ref, and says so (exit 64) when it has no database or no ref', () => {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-diffcli-'));
  try {
    const db = join(dir, 'atlas.sqlite');
    assert.equal(cli('diff', '--against', 'HEAD', '--db', db).status, 64);
    assert.match(cli('diff', '--against', 'HEAD', '--db', db).stderr, /run npm run db:rebuild first/);
    const built = cli('rebuild', '--out', db);
    assert.equal(built.status, 0, built.stderr);
    assert.match(built.stdout, /ok  integrity_check: ok/);
    const diff = cli('diff', '--against', 'HEAD', '--db', db);
    assert.equal(diff.status, 0, diff.stderr);
    assert.match(diff.stdout, /DIFF: \d+ difference\(s\) in 36 tables/); // 0 on a clean checkout; the tests above pin the content
    const unknown = cli('diff', '--against', 'no-such-ref', '--db', db);
    assert.equal(unknown.status, 70); // a ref that does not resolve is a failure, not "0 differences"
    assert.match(unknown.stderr, /is not a commit in this repository \(git said: /);
    const q = cli('query', 'SELECT count(*) AS n FROM grades', '--db', db);
    assert.equal(q.status, 0);
    assert.match(q.stdout, /^n\n1193\n/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('db:diff --fail-on-diff exits 1 when the database holds anything the ref does not', () => withCopy((dir) => {
  const scratch = mkdtempSync(join(tmpdir(), 'atlas-failondiff-'));
  try {
    editRecords(dir, 'materials', (rows) => { rows[0][columnIndex('materials', 'Best uses')] = 'an edit that no commit has'; });
    const db = join(scratch, 'atlas.sqlite');
    assert.equal(cli('rebuild', '--data', dir, '--out', db).status, 0);
    const diff = cli('diff', '--against', 'HEAD', '--db', db, '--fail-on-diff');
    assert.equal(diff.status, 1);
    assert.match(diff.stdout, /materials: changed, 1 record\(s\) changed/);
    assert.equal(cli('diff', '--against', 'HEAD', '--db', db).status, 0); // without the flag a difference is a report, not a failure
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}));
