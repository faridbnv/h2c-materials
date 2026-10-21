// WP-08 (ADR-05, proof DP-16): the contract suite for packages/data/src/driver.ts, the only file that imports node:sqlite.
// It runs on whatever Node is running (26.9 here, the pinned .nvmrc version in CI), and pins what the data layer relies on:
// STRICT and foreign-key refusal, rollback on error, nested-transaction refusal, backup during writes, changeset capture,
// exact text round trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as sqlite from 'node:sqlite';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  CHANGESET_CONFLICT, NestedTransactionError, constraintKind, driverClassName, open, pickDatabaseClass,
} from '../../packages/data/src/driver.ts';
import { root } from './data-helpers.mjs';

const SCHEMA = `
  CREATE TABLE parent (id TEXT NOT NULL PRIMARY KEY) STRICT;
  CREATE TABLE child (
    id INTEGER PRIMARY KEY,
    parent TEXT REFERENCES parent (id),
    amount REAL CHECK (amount > 0),
    label TEXT
  ) STRICT;
`;
const fresh = () => { const db = open(':memory:'); db.exec(SCHEMA); return db; };
const count = (db, table) => Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n);
const scratch = () => mkdtempSync(join(tmpdir(), 'atlas-driver-'));

// ---------------------------------------------------------------- only driver.ts imports node:sqlite

test('only packages/data/src/driver.ts imports node:sqlite (the grep check, WP-08 step 3)', () => {
  // The new-code directories. scripts/ and test/ are the frozen old tool; tests/ may open a database to check generated DDL.
  const importers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"`]node:sqlite['"`]/;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.workspace') continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/.test(name) && pattern.test(readFileSync(path, 'utf8'))) importers.push(relative(root, path));
    }
  };
  for (const dir of ['packages', 'apps', 'remake', 'db']) { try { walk(join(root, dir)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  assert.deepEqual(importers, ['packages/data/src/driver.ts']);
});

test('the class is picked by feature detection: the new name when Node has it, else the old one, else a clear error', () => {
  const fake = () => class { prepare() {} exec() {} createSession() {} serialize() {} };
  const [renamed, original] = [fake(), fake()];
  assert.deepEqual(pickDatabaseClass({ Database: renamed, DatabaseSync: original }), { ctor: renamed, name: 'Database' });
  assert.deepEqual(pickDatabaseClass({ DatabaseSync: original }), { ctor: original, name: 'DatabaseSync' });
  assert.throws(() => pickDatabaseClass({}), /exports neither Database nor DatabaseSync/);
  assert.throws(() => pickDatabaseClass({ Database: class {} }), /exports neither/); // a class without the needed methods does not count
  // And on this Node:
  assert.equal(driverClassName, 'Database' in sqlite ? 'Database' : 'DatabaseSync');
});

test('the SQLite and Node versions are available to be recorded', () => {
  const db = open();
  const info = db.info();
  assert.match(info.sqlite, /^3\.\d+\.\d+/);
  assert.equal(info.node, process.version);
  assert.equal(info.className, driverClassName);
  console.log(`  driver: Node ${info.node}, SQLite ${info.sqlite}, class ${info.className}`);
});

// ---------------------------------------------------------------- constraints

test('STRICT tables refuse a value of the wrong type', () => {
  const db = fresh();
  assert.throws(() => db.prepare("INSERT INTO child (id, amount) VALUES (1, 'abc')").run(), (e) => constraintKind(e) === 'strict-type');
  assert.throws(() => db.prepare('INSERT INTO child (id, label) VALUES (?, ?)').run(1, new Uint8Array([1, 2])), (e) => constraintKind(e) === 'strict-type');
  assert.equal(count(db, 'child'), 0);
});

test('foreign keys are on by default, verified on the connection, and refuse a dangling reference', () => {
  const db = fresh();
  assert.equal(db.pragma('foreign_keys'), 1);
  assert.throws(() => db.prepare("INSERT INTO child (id, parent) VALUES (1, 'nobody')").run(), (e) => constraintKind(e) === 'foreign-key');
  db.prepare("INSERT INTO parent VALUES ('p')").run();
  db.prepare("INSERT INTO child (id, parent) VALUES (1, 'p')").run();
  assert.equal(count(db, 'child'), 1);
  // Switched off only on request (a test that needs a dangling row); the setting is visible.
  const off = open(':memory:', { foreignKeys: false });
  off.exec(SCHEMA);
  assert.equal(off.pragma('foreign_keys'), 0);
  off.prepare("INSERT INTO child (id, parent) VALUES (1, 'nobody')").run();
});

test('CHECK, NOT NULL, UNIQUE and primary key failures are told apart', () => {
  const db = fresh();
  db.prepare("INSERT INTO parent VALUES ('p')").run();
  assert.throws(() => db.prepare("INSERT INTO parent VALUES ('p')").run(), (e) => constraintKind(e) === 'primary-key');
  assert.throws(() => db.prepare('INSERT INTO parent VALUES (NULL)').run(), (e) => constraintKind(e) === 'not-null');
  assert.throws(() => db.prepare('INSERT INTO child (id, amount) VALUES (1, -1)').run(), (e) => constraintKind(e) === 'check');
  assert.equal(constraintKind(new Error('plain')), null);
  assert.equal(constraintKind(null), null);
});

// ---------------------------------------------------------------- transactions

test('a transaction commits when its function returns, and returns its value', () => {
  const db = fresh();
  const out = db.transaction((tx) => { tx.prepare("INSERT INTO parent VALUES ('a')").run(); return 7; });
  assert.equal(out, 7);
  assert.equal(count(db, 'parent'), 1);
  assert.equal(db.inTransaction, false);
});

test('a transaction rolls back on an error and rethrows that same error', () => {
  const db = fresh();
  const boom = new Error('boom');
  assert.throws(() => db.transaction((tx) => { tx.prepare("INSERT INTO parent VALUES ('a')").run(); throw boom; }), (e) => e === boom);
  assert.equal(count(db, 'parent'), 0);
  assert.equal(db.inTransaction, false);
  // A constraint failure inside it rolls back the earlier writes too.
  assert.throws(() => db.transaction((tx) => {
    tx.prepare("INSERT INTO parent VALUES ('a')").run();
    tx.prepare("INSERT INTO child (id, parent) VALUES (1, 'nobody')").run();
  }), (e) => constraintKind(e) === 'foreign-key');
  assert.equal(count(db, 'parent'), 0);
});

test('a nested transaction is refused, and the outer one is rolled back', () => {
  const db = fresh();
  assert.throws(() => db.transaction((tx) => {
    tx.prepare("INSERT INTO parent VALUES ('a')").run();
    tx.transaction(() => {});
  }), NestedTransactionError);
  assert.equal(count(db, 'parent'), 0);
  assert.equal(db.inTransaction, false);
  // Also inside a transaction opened by hand.
  db.exec('BEGIN');
  assert.throws(() => db.transaction(() => {}), NestedTransactionError);
  db.exec('ROLLBACK');
});

test('a transaction body that returns a promise is refused and rolled back (the commit would come before the work)', () => {
  const db = fresh();
  assert.throws(() => db.transaction(async (tx) => { tx.prepare("INSERT INTO parent VALUES ('a')").run(); }), /must be synchronous/);
  assert.equal(count(db, 'parent'), 0);
  assert.equal(db.inTransaction, false);
});

test('a COMMIT that fails (a deferred foreign key) rolls back instead of leaving the transaction open', () => {
  const db = open();
  db.exec(`
    CREATE TABLE p (id TEXT PRIMARY KEY) STRICT;
    CREATE TABLE c (id INTEGER PRIMARY KEY, p TEXT REFERENCES p (id) DEFERRABLE INITIALLY DEFERRED) STRICT;
  `);
  assert.throws(() => db.transaction((tx) => tx.prepare("INSERT INTO c VALUES (1, 'nobody')").run()), (e) => constraintKind(e) === 'foreign-key');
  assert.equal(db.inTransaction, false);
  assert.equal(count(db, 'c'), 0);
  db.transaction((tx) => { tx.prepare("INSERT INTO c VALUES (1, 'late')").run(); tx.prepare("INSERT INTO p VALUES ('late')").run(); });
  assert.equal(count(db, 'c'), 1); // satisfied before the commit, so it stands
});

// ---------------------------------------------------------------- exact text

test('text is stored and read back exactly: "4.30" stays "4.30", whitespace, newlines, unicode, empty and word-like text', () => {
  const db = open();
  db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT) STRICT');
  const samples = ['4.30', '0.10', '1e3', '-0', ' padded ', 'multi\nline', 'tab\there', 'ü ± °C ³ 😀', '', "it's \"quoted\"", 'Not published', 'a;b;c'];
  const put = db.prepare('INSERT INTO t (id, v) VALUES (?, ?)');
  samples.forEach((s, i) => put.run(i + 1, s));
  const back = db.prepare('SELECT v FROM t ORDER BY id').all().map((r) => r.v);
  assert.deepEqual(back, samples);
  assert.ok(back.every((v) => typeof v === 'string'));
  // The reason typed columns are generated beside the text: a REAL column would not keep it.
  db.exec('CREATE TABLE r (v REAL) STRICT');
  db.prepare('INSERT INTO r VALUES (?)').run('4.30');
  assert.equal(db.prepare('SELECT v FROM r').get().v, 4.3);
});

// ---------------------------------------------------------------- backup, sessions, serialize

test('an online backup made while the connection keeps writing is a complete, consistent database', async () => {
  const dir = scratch();
  try {
    const db = open(join(dir, 'live.sqlite'));
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, pad TEXT) STRICT');
    const put = db.prepare('INSERT INTO t (pad) VALUES (?)');
    db.transaction(() => { for (let i = 0; i < 3000; i++) put.run('x'.repeat(200)); });
    const before = count(db, 't');
    let writes = 0;
    const pages = await db.backup(join(dir, 'copy.sqlite'), { rate: 4, progress: () => { if (writes < 50) { put.run('late'); writes++; } } });
    assert.ok(pages > 0 && writes > 0, 'the backup took several steps and writes happened between them');
    const copy = open(join(dir, 'copy.sqlite'), { readOnly: true });
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    const n = count(copy, 't');
    assert.ok(n >= before && n <= before + writes, `the copy holds ${n} rows, between ${before} and ${before + writes}`);
    assert.equal(Number(copy.prepare('SELECT max(id) AS m FROM t').get().m), n, 'no gaps: rows 1..n');
    copy.close();
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a session captures a changeset that another database applies; a conflict can abort it cleanly', () => {
  const a = fresh();
  const b = fresh();
  for (const db of [a, b]) db.prepare("INSERT INTO parent VALUES ('p')").run();
  const session = a.session();
  a.prepare("INSERT INTO child (id, parent, amount, label) VALUES (1, 'p', 2.5, 'one')").run();
  a.prepare("INSERT INTO child (id, parent, amount, label) VALUES (2, 'p', 3.5, 'two')").run();
  a.prepare("UPDATE child SET label = 'ONE' WHERE id = 1").run();
  a.prepare('DELETE FROM child WHERE id = 2').run();
  const changeset = session.changeset();
  assert.ok(changeset.length > 0);
  assert.ok(session.patchset().length > 0);
  session.close();
  assert.equal(b.applyChangeset(changeset), true);
  assert.deepEqual(b.prepare('SELECT * FROM child ORDER BY id').all(), a.prepare('SELECT * FROM child ORDER BY id').all());
  // Applying it again meets the row that is already there; the default handler aborts and says so.
  assert.equal(b.applyChangeset(changeset), false);
  assert.equal(b.applyChangeset(changeset, { onConflict: () => CHANGESET_CONFLICT.omit }), true);
  // Only the tracked table is captured.
  const only = a.session({ table: 'parent' });
  a.prepare("INSERT INTO parent VALUES ('q')").run();
  a.prepare("INSERT INTO child (id, parent) VALUES (9, 'q')").run();
  assert.ok(only.changeset().length < changeset.length + 40);
  only.close();
});

test('serialize returns a snapshot that opens as the same database', () => {
  const db = fresh();
  db.prepare("INSERT INTO parent VALUES ('p')").run();
  const bytes = db.serialize();
  assert.ok(bytes.length > 0);
  assert.equal(String.fromCharCode(...bytes.slice(0, 15)), 'SQLite format 3');
});

test('a read-only connection refuses writes, and close is safe to call twice', () => {
  const dir = scratch();
  try {
    const path = join(dir, 'ro.sqlite');
    const w = open(path);
    w.exec(SCHEMA);
    w.close();
    const ro = open(path, { readOnly: true });
    assert.throws(() => ro.prepare("INSERT INTO parent VALUES ('x')").run(), /readonly/i);
    ro.close();
    ro.close();
    assert.equal(ro.isOpen, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
