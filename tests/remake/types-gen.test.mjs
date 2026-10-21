// WP-06: the generator's output equals the schema, loads into SQLite, and is current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdtempSync, cpSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, loadTables, loadVocab, patternToGlob, sqlName, staleFiles, OUTPUTS } from '../../remake/tools/types-gen.mjs';
import { TABLE_NAMES, TABLE_COLUMNS, TABLES } from '../../packages/data/src/generated/columns.ts';
import * as rows from '../../packages/data/src/generated/rows.ts';
import { readCsv } from '../../build/src/csv.js';
import { sqlName as oldSqlName } from '../../scripts/data/sqlite.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const schemas = loadTables(root);
const ddl = readFileSync(join(root, OUTPUTS.sql), 'utf8');

test('36 tables, and each generated column list equals the schema file\'s fields in order', () => {
  assert.equal(schemas.length, 36);
  assert.deepEqual([...TABLE_NAMES], schemas.map((t) => t.name));
  for (const t of schemas) {
    assert.deepEqual([...TABLE_COLUMNS[t.name]], t.fields.map((f) => f.name), t.name);
    assert.deepEqual(TABLES[t.name].columns.map((c) => c.name), t.fields.map((f) => f.name), t.name);
    assert.deepEqual([...TABLES[t.name].primaryKey], t.primaryKey == null ? [] : [].concat(t.primaryKey), t.name);
  }
});

test('column lists also equal the header of the real CSV file', () => {
  for (const t of schemas) {
    const { header } = readCsv(join(root, 'data/tables', `${t.name}.csv`));
    assert.deepEqual([...TABLE_COLUMNS[t.name]], header, t.name);
  }
});

test('SQL names are the old exporter\'s names', () => {
  for (const t of schemas) for (const f of t.fields) assert.equal(sqlName(f.name), oldSqlName(f.name));
});

test('vocabulary constants hold each vocab file\'s values, in file order', () => {
  const vocab = loadVocab(root);
  assert.equal(Object.keys(vocab).length, readdirSync(join(root, 'schema/vocab')).filter((f) => f.endsWith('.csv')).length);
  assert.deepEqual([...rows.DIRECTIONS], vocab.directions);
  assert.deepEqual([...rows.MISSING_STATES], vocab['missing-states']);
});

test('the committed generated files are current (types:check)', () => {
  assert.deepEqual(staleFiles(root), []);
});

test('types:check notices a stale file and a changed schema', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'types-gen-test-'));
  try {
    cpSync(join(root, 'schema'), join(tmp, 'schema'), { recursive: true });
    for (const rel of Object.values(OUTPUTS)) {
      mkdirSync(join(tmp, rel, '..'), { recursive: true });
      cpSync(join(root, rel), join(tmp, rel));
    }
    assert.deepEqual(staleFiles(tmp), []);
    // A schema change without regeneration.
    const file = join(tmp, 'schema/tables/fx_rates.schema.json');
    writeFileSync(file, readFileSync(file, 'utf8').replace('"CAD per unit"', '"CAD per one unit"'));
    assert.ok(staleFiles(tmp).includes(OUTPUTS.columns));
    assert.ok(staleFiles(tmp).includes(OUTPUTS.sql));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('generation is deterministic', () => {
  assert.deepEqual(generate(root), generate(root));
});

test('patterns become GLOB: exact where they can, flagged where not', () => {
  assert.deepEqual(patternToGlob('^M\\d{3}$'), { globs: ['M[0-9][0-9][0-9]'], exact: true });
  assert.deepEqual(patternToGlob('^https?://').globs.sort(), ['http://*', 'https://*']);
  assert.deepEqual(patternToGlob('^.+$'), { globs: ['?*'], exact: true });
  const grade = patternToGlob('^G\\d{3}-(\\d{2,3}|R\\d+)$');
  assert.equal(grade.exact, false);
  assert.ok(grade.globs.includes('G[0-9][0-9][0-9]-[0-9][0-9]'));
  assert.equal(patternToGlob('\\d+'), null);
});

function loaded({ foreignKeys }) {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
  db.exec(ddl);
  return db;
}

test('the DDL loads into node:sqlite; every table is STRICT with the generated columns', () => {
  const db = loaded({ foreignKeys: true });
  const tables = db.prepare("PRAGMA table_list").all().filter((t) => t.schema === 'main' && t.type === 'table' && !t.name.startsWith('sqlite_'));
  assert.equal(tables.length, 36);
  for (const t of tables) assert.equal(t.strict, 1, `${t.name} is not STRICT`);
  for (const t of schemas) {
    const expected = TABLES[t.name].columns.flatMap((c) => (c.missing.length ? [c.sqlName, `${c.sqlName}_state`] : [c.sqlName]));
    const actual = db.prepare(`PRAGMA table_info("${t.name}")`).all().map((c) => c.name);
    assert.deepEqual(actual, expected, t.name);
  }
});

test('constraints refuse what the schema forbids', () => {
  const db = loaded({ foreignKeys: true });
  const insert = (sql) => db.exec(sql);
  const ok = "INSERT INTO fx_rates (currency, rate_date, cad_per_unit, sourceid, locator, notes) VALUES ('EUR', '2026-01-02', 1.5, 'S', 'p. 1', 'n')";
  assert.throws(() => db.exec(ok), /FOREIGN KEY/); // sourceid must exist
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec(ok);
  assert.throws(() => db.exec(ok), /UNIQUE/);
  assert.throws(() => insert("INSERT INTO fx_rates VALUES ('XXX', '2026-01-02', 1.5, 'S', 'p', 'n')"), /CHECK/); // not in currencies
  assert.throws(() => insert("INSERT INTO fx_rates VALUES ('CAD', '2026-01-03', -1, 'S', 'p', 'n')"), /CHECK/); // minimum 0
  assert.throws(() => insert("INSERT INTO fx_rates VALUES ('CAD', '2026-01-03', 'abc', 'S', 'p', 'n')"), /cannot store TEXT value in REAL/); // STRICT type
});

/** One CSV record as the DDL stores it: [sqlColumns, values], with a missing word moved to its _state column. */
function decode(t, record) {
  const columns = [];
  const values = [];
  for (const f of t.fields) {
    const raw = record.values[f.name];
    const missing = f.missing ?? [];
    const isWord = raw !== null && missing.includes(raw);
    let value = isWord ? null : raw;
    if (value !== null && (f.type === 'number' || f.type === 'integer')) value = Number(value);
    if (value !== null && f.type === 'boolean') value = (f.trueValues ?? ['TRUE']).includes(value) ? 1 : 0;
    columns.push(sqlName(f.name));
    values.push(value);
    if (missing.length) { columns.push(`${sqlName(f.name)}_state`); values.push(isWord ? raw : null); }
  }
  return [columns, values];
}

const insertSql = (table, columns) => `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

test('a missing word and a value never sit together, and a required cell is never empty', () => {
  const db = loaded({ foreignKeys: false });
  const t = schemas.find((x) => x.name === 'measurements');
  const [record] = readCsv(join(root, 'data/tables/measurements.csv')).records;
  const [columns, values] = decode(t, record);
  const withCell = (value, state) => {
    const copy = [...values];
    copy[columns.indexOf('raw_numeric')] = value;
    copy[columns.indexOf('raw_numeric_state')] = state;
    return copy;
  };
  const insert = db.prepare(insertSql('measurements', columns));
  assert.throws(() => insert.run(...withCell(1.2, 'Not published')), /CHECK/);
  assert.throws(() => insert.run(...withCell(null, null)), /CHECK/);
  assert.throws(() => insert.run(...withCell(null, 'Zero')), /CHECK/);
  insert.run(...withCell(null, 'Not published'));
  // AVG over a column with missing words does not count them as 0.
  assert.equal(db.prepare('SELECT avg(raw_numeric) AS a FROM measurements').get().a, null);
});

test('every row of all 36 real tables loads under STRICT, CHECK and FOREIGN KEY, with no dangling reference', () => {
  const db = loaded({ foreignKeys: false });
  let total = 0;
  for (const t of schemas) {
    const { records } = readCsv(join(root, 'data/tables', `${t.name}.csv`));
    const [columns] = decode(t, records[0] ?? { values: Object.fromEntries(t.fields.map((f) => [f.name, null])) });
    const insert = db.prepare(insertSql(t.name, columns));
    db.exec('BEGIN');
    for (const record of records) insert.run(...decode(t, record)[1]);
    db.exec('COMMIT');
    assert.equal(db.prepare(`SELECT count(*) AS n FROM "${t.name}"`).get().n, records.length, t.name);
    total += records.length;
  }
  assert.equal(total, 39473);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
