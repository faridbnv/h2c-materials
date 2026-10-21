// WP-20: the new build's loader, schema gate and failure behaviour. The slow proofs (P-build against the old build, tie order,
// reproducibility) build the whole database and live in tests/parity/build-new.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyData, editRecords, editText, emptyDb, root } from './data-helpers.mjs';
import { buildInMemory } from '../../packages/data/src/rebuild.ts';
import { loadSheet, loadSheets, loadWorkbook, loadReference, snapshotDate, TABLES } from '../../packages/build/src/load.ts';
import { checkTables, loadSchemas } from '../../packages/build/src/schema-gate.ts';
import { runBuild } from '../../packages/build/src/build.ts';
import { loadReference as oldLoadReference, loadTables as oldLoadTables } from '../../build/src/load.js';
import { join } from 'node:path';

const { db } = buildInMemory(join(root, 'data'));
test.after(() => db.close());

test('the workbook read from SQLite equals the one the old loader read from the CSV files: same rows, same keys in the same order, same numbers', () => {
  const fromSqlite = loadWorkbook(db);
  const fromCsv = oldLoadTables(join(root, 'data'));
  assert.deepEqual(Object.keys(fromSqlite), Object.keys(fromCsv));
  for (const sheet of Object.keys(fromCsv)) {
    // JSON text compares the key order of every row as well as its values.
    assert.equal(JSON.stringify(fromSqlite[sheet]), JSON.stringify(fromCsv[sheet]), `${sheet} differs`);
  }
  assert.ok(Object.values(fromCsv).reduce((n, s) => n + s.rows.length, 0) > 30_000);
});

test('the reference rows read from SQLite equal the old loader\'s', () => {
  assert.equal(JSON.stringify(loadReference(db)), JSON.stringify(oldLoadReference(join(root, 'data'))));
});

test('the snapshot date comes from the Method rows, and a missing one is an error', () => {
  assert.equal(snapshotDate(loadWorkbook(db).Method.rows), '2026-09-21');
  assert.throws(() => snapshotDate([]), /no Scope \/ Snapshot row/);
});

test('rows come back in _ord order, not insertion or key order: the tie order of every first-wins rule', () => {
  const inserted = loadSheet(db, 'profiles').rows.map((r) => r.ProfileID);
  assert.ok(inserted.length > 100);
  // Reverse _ord without touching the physical order (three steps, since _ord is UNIQUE and checked per row).
  const n = inserted.length;
  db.exec('BEGIN');
  try {
    db.exec('UPDATE "profiles" SET _ord = _ord + 100000');
    db.exec(`UPDATE "profiles" SET _ord = 300000 + ${n + 1} - (_ord - 100000)`);
    db.exec('UPDATE "profiles" SET _ord = _ord - 300000');
    const reversed = loadSheet(db, 'profiles').rows;
    assert.deepEqual(reversed.map((r) => r.ProfileID), [...inserted].reverse());
    // The line a row came from follows its place, not the order it was stored in.
    assert.deepEqual(reversed.map((r) => r.__row), inserted.map((_, k) => k + 2));
  } finally {
    db.exec('ROLLBACK');
  }
  assert.deepEqual(loadSheet(db, 'profiles').rows.map((r) => r.ProfileID), inserted, 'the rollback restored the file order');
});

test('a row\'s line counts the lines of a multi-line cell before it, as csv-parse did', () => {
  const scratch = emptyDb();
  try {
    scratch.exec('PRAGMA foreign_keys = OFF');
    const insert = scratch.prepare('INSERT INTO "method" (_ord, section, topic, definition_rule) VALUES (?, ?, ?, ?)');
    insert.run(1, 'Scope', 'A', 'one\ntwo\nthree');
    insert.run(2, 'Scope', 'B', 'plain');
    const rows = loadSheet(scratch, 'method').rows;
    // The header is line 1; record 1 spans lines 2-4 and reports its last line; record 2 is line 5.
    assert.deepEqual(rows.map((r) => r.__row), [4, 5]);
  } finally {
    scratch.close();
  }
});

test('all 36 tables load, and the compiler\'s sheets are the 33 it addresses', () => {
  assert.equal(loadSheets(db).size, 36);
  assert.equal(TABLES.length, 33);
});

test('the schema gate keeps the old cross-column checks and codes: list items, IDs in prose, unique combinations, canonical form, a missing table', () => {
  const schemas = {
    parent: { primaryKey: 'Id', fields: [{ name: 'Id', constraints: { required: true, unique: true } }] },
    child: {
      primaryKey: 'Id', uniqueKeys: [['A', 'B']],
      fields: [
        { name: 'Id' },
        { name: 'A' }, { name: 'B' },
        { name: 'Tags', type: 'list', item: { reference: { table: 'parent', field: 'Id' } } },
        { name: 'Note', embeddedReferences: [{ pattern: 'P\\d+', table: 'parent', field: 'Id' }] },
      ],
    },
    absent: { fields: [{ name: 'X' }] },
  };
  const records = (rows) => rows.map((values, k) => ({ values, line: k + 2 }));
  const tables = {
    parent: { header: ['Id'], records: records([{ Id: 'P1' }, { Id: 'P2' }]) },
    child: {
      header: ['Id', 'A', 'B', 'Tags', 'Note'],
      records: records([
        { Id: 'c1', A: 'a', B: 'b', Tags: 'P1; P1', Note: null },
        { Id: 'c2', A: 'a', B: 'b', Tags: 'P9', Note: 'see P7' },
      ]),
    },
  };
  const issues = checkTables(tables, schemas, {}, { isCanonical: (name) => name !== 'child' });
  assert.deepEqual(issues.map((i) => i.code).sort(), ['SCHEMA-FORMAT', 'SCHEMA-LIST', 'SCHEMA-REFERENCE', 'SCHEMA-REFERENCE', 'SCHEMA-TABLE', 'SCHEMA-UNIQUE']);
  assert.ok(issues.every((i) => i.level === 'error'));
});

test('the real schema gate passes on the real rows', () => {
  const { tables: schemas, vocab } = loadSchemas(join(root, 'schema'));
  const gate = Object.fromEntries([...loadSheets(db)].map(([name, sheet]) => [name, { header: sheet.header, records: sheet.rows.map((values) => ({ values, line: values.__row })) }]));
  assert.deepEqual(checkTables(gate, schemas, vocab), []);
});

test('a build over tables that do not reconstruct fails with every problem, writes nothing and returns no database', () => {
  const { dir, cleanup } = copyData();
  try {
    // A hand edit that leaves the manifest as it was: the digest no longer matches (the reconstruction's own check).
    editText(dir, 'materials', (text) => text.replace('Polymaker', 'Polymakr'), { keepManifest: false });
    const result = runBuild({ dataDir: dir, outDir: null, log: () => undefined });
    assert.equal(result.ok, false);
    assert.equal(result.db, null);
    assert.equal(result.files, null);
    assert.ok(result.errors.some((e) => e.code === 'RECONSTRUCT' && /materials/.test(e.message)), result.errors.map((e) => e.message).join('; '));
  } finally {
    cleanup();
  }
});

test('a build over tables that reconstruct but break a rule of the data fails the schema gate, never passes', () => {
  const { dir, cleanup } = copyData();
  try {
    // A grade ID written into a sentence that points at nothing: SQLite has no foreign key for prose, the gate's embedded-reference check does.
    editRecords(dir, 'sources', (rows, header) => {
      const k = header.indexOf('Applicable grades');
      rows[0][k] = `${rows[0][k] ?? ''} and G999-99`;
    });
    const result = runBuild({ dataDir: dir, outDir: null, estimates: false, log: () => undefined });
    assert.equal(result.ok, false);
    assert.equal(result.db, null);
    assert.ok(result.errors.some((e) => e.code === 'SCHEMA-REFERENCE' && /G999-99/.test(e.message)), result.errors.map((e) => `${e.code} ${e.message}`).join('; '));
  } finally {
    cleanup();
  }
});
