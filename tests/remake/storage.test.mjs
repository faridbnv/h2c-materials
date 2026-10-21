// WP-09 (proofs DP-2, DP-3, DP-6): lossless storage, the constraints that refuse bad data, row order, and the relational views.
// "4.30" stays "4.30"; each missing-state word stays a word and never becomes a number; a missing word is not counted as 0;
// a dangling reference is refused; every view returns what an independent count over the CSV says.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { constraintKind } from '../../packages/data/src/driver.ts';
import { TABLES, TABLE_NAMES } from '../../packages/data/src/generated/columns.ts';
import { MISSING_STATES } from '../../packages/data/src/generated/rows.ts';
import { DataInputError, buildInMemory } from '../../packages/data/src/rebuild.ts';
import { exportTable, readCells, storageOf } from '../../packages/data/src/storage.ts';
import { columnIndex, copyData, editRecords, emptyDb, insertRecord, realData, realRecords } from './data-helpers.mjs';

let real; // the real data, rebuilt once
before(() => { real = buildInMemory(realData); });
after(() => real?.db.close());

const TYPED = new Set(['number', 'integer', 'boolean']);
const expectedColumns = (table) => ['_ord', ...TABLES[table].columns.flatMap((c) => {
  const state = c.missing.length ? [`${c.sqlName}_state`] : [];
  return TYPED.has(c.type) ? [`${c.sqlName}_text`, c.sqlName, ...state] : [c.sqlName, ...state];
})];
const tableInfo = (table) => real.db.prepare(`PRAGMA table_xinfo("${table}")`).all();

test('every table has exactly the stored and generated columns the generated column facts say, and is STRICT', () => {
  for (const table of TABLE_NAMES) {
    const info = tableInfo(table);
    assert.deepEqual(info.map((c) => c.name), expectedColumns(table), table);
    // Typed columns and their words are generated (hidden = 2 for a virtual generated column); the rest are stored.
    for (const c of TABLES[table].columns.filter((x) => TYPED.has(x.type))) {
      assert.equal(info.find((x) => x.name === c.sqlName).hidden, 2, `${table}.${c.sqlName} is generated`);
      assert.equal(info.find((x) => x.name === `${c.sqlName}_text`).hidden, 0);
    }
  }
  const strict = real.db.prepare('PRAGMA table_list').all().filter((t) => TABLE_NAMES.includes(t.name));
  assert.equal(strict.length, TABLE_NAMES.length);
  assert.ok(strict.every((t) => t.strict === 1));
});

test('"4.30" stays "4.30": the text is exact, the typed column is the number', () => {
  const db = emptyDb();
  const [template] = realRecords('measurements');
  const cells = [...template];
  const set = (name, value) => { cells[columnIndex('measurements', name)] = value; };
  set('MeasurementID', 'V999990'); set('Raw numeric', '4.30'); set('Normalized value', '4.30'); set('Conversion factor', '1.0');
  insertRecord(db, 'measurements', 1, cells);
  const row = db.prepare('SELECT raw_numeric_text, raw_numeric, normalized_value_text, normalized_value, conversion_factor_text FROM measurements').get();
  assert.equal(row.raw_numeric_text, '4.30');
  assert.equal(row.normalized_value_text, '4.30');
  assert.equal(row.conversion_factor_text, '1.0');
  assert.equal(row.raw_numeric, 4.3);
  assert.equal(row.normalized_value, 4.3);
  const [back] = readCells(db, 'measurements');
  assert.equal(back[columnIndex('measurements', 'Normalized value')], '4.30');
  assert.match(exportTable(db, 'measurements'), /,4\.30,/);
});

test('every missing-state word survives as itself: the state holds the word and the typed value is NULL, never 0', () => {
  const declared = new Map(); // word -> { numeric: [table, column], text: [table, column] }
  for (const table of TABLE_NAMES) {
    for (const c of TABLES[table].columns) {
      for (const word of c.missing) {
        const slot = declared.get(word) ?? {};
        const kind = TYPED.has(c.type) ? 'numeric' : 'text';
        slot[kind] ??= [table, c.name];
        declared.set(word, slot);
      }
    }
  }
  // The words no column declares are exactly these two (the second is only a Data status value); a change here is a schema change to look at.
  assert.deepEqual(MISSING_STATES.filter((w) => !declared.has(w)).sort(), ['Not available in sampled Canadian market', 'Unresolved unit / layout']);
  for (const word of MISSING_STATES) {
    for (const [kind, where] of Object.entries(declared.get(word) ?? {})) {
      const [table, column] = where;
      const db = emptyDb();
      const cells = [...realRecords(table)[0]];
      cells[columnIndex(table, column)] = word;
      insertRecord(db, table, 1, cells);
      const sql = TABLES[table].columns.find((c) => c.name === column).sqlName;
      const row = db.prepare(`SELECT "${sql}" AS value, "${sql}_state" AS state FROM "${table}"`).get();
      assert.equal(row.state, word, `${table}.${column} (${kind})`);
      assert.equal(row.value, null, `${table}.${column}: a word is never a value`);
      assert.equal([...readCells(db, table)][0][columnIndex(table, column)], word);
    }
  }
});

test('a missing word is refused where the column does not declare it, and a non-number is refused in a number column', () => {
  const db = emptyDb();
  const [template] = realRecords('fatigue_tests');
  const column = columnIndex('fatigue_tests', 'Frequency Hz');
  const declares = TABLES.fatigue_tests.columns[column].missing;
  assert.ok(declares.length > 0 && !declares.includes('Insufficient comparable data'));
  const attempt = (value) => { const cells = [...template]; cells[column] = value; insertRecord(db, 'fatigue_tests', 1, cells); };
  for (const bad of ['Insufficient comparable data', 'abc', '4,30', '.5', '5.', '+5', 'NaN', 'Infinity', '0x10', '1 000']) {
    assert.throws(() => attempt(bad), (e) => constraintKind(e) === 'check', JSON.stringify(bad));
  }
  attempt(declares[0]); // a word the column declares is fine
});

test('a seeded AVG over a column that holds missing words does not count them as 0', () => {
  const db = emptyDb();
  const [template] = realRecords('measurements');
  const put = (ord, value) => {
    const cells = [...template];
    cells[columnIndex('measurements', 'MeasurementID')] = `V99999${ord}`;
    cells[columnIndex('measurements', 'Normalized value')] = value;
    insertRecord(db, 'measurements', ord, cells);
  };
  put(1, '10'); put(2, 'Not published'); put(3, '20'); put(4, 'Insufficient comparable data');
  const row = db.prepare('SELECT avg(normalized_value) AS typed, count(normalized_value) AS counted, count(*) AS total, sum(normalized_value) AS total_value FROM measurements').get();
  assert.equal(row.typed, 15); // not (10 + 0 + 20 + 0) / 4 = 7.5
  assert.equal(row.counted, 2);
  assert.equal(row.total, 4);
  assert.equal(row.total_value, 30);
  // On the real table the typed column agrees with an average taken over the CSV by a reader who skips the words.
  const cells = realRecords('measurements').map((r) => r[columnIndex('measurements', 'Normalized value')]);
  const numbers = cells.filter((c) => c !== null && !MISSING_STATES.includes(c)).map(Number);
  assert.ok(numbers.length < cells.length, 'the real column holds missing words');
  const got = real.db.prepare('SELECT avg(normalized_value) AS a, count(normalized_value) AS n FROM measurements').get();
  assert.equal(got.n, numbers.length);
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  assert.ok(Math.abs(got.a - mean) / Math.abs(mean) < 1e-9, `${got.a} vs ${mean}`); // floating-point summation order differs, so a relative bound
});

test('a blank required cell, a vocabulary word that is not in the vocabulary, and a repeated key are refused', () => {
  const db = emptyDb();
  const [template] = realRecords('grades');
  const make = (change) => { const cells = [...template]; change(cells); return cells; };
  const col = (name) => columnIndex('grades', name);
  assert.throws(() => insertRecord(db, 'grades', 1, make((c) => { c[col('Manufacturer')] = null; })), (e) => constraintKind(e) === 'not-null');
  assert.throws(() => insertRecord(db, 'grades', 1, make((c) => { c[col('Status')] = 'mislaid'; })), (e) => constraintKind(e) === 'check');
  insertRecord(db, 'grades', 1, template);
  assert.throws(() => insertRecord(db, 'grades', 2, template), (e) => constraintKind(e) === 'primary-key');
  assert.throws(() => insertRecord(db, 'grades', 1, make((c) => { c[col('GradeID')] = 'G999-99'; })), (e) => constraintKind(e) === 'unique'); // _ord repeated
});

test('a dangling reference makes the rebuild fail, naming the file, line, column and value', () => {
  const { dir, cleanup } = copyData();
  try {
    editRecords(dir, 'grades', (rows) => { rows[4][columnIndex('grades', 'MaterialID')] = 'M999'; });
    assert.throws(() => buildInMemory(dir), (e) => e instanceof DataInputError
      && /grades\.csv:6: MaterialID "M999" has no row in materials/.test(e.message));
  } finally { cleanup(); }
});

test('a constraint failure in the data makes the rebuild fail, naming the file, line and record', () => {
  const { dir, cleanup } = copyData();
  try {
    editRecords(dir, 'grades', (rows) => { rows[2][columnIndex('grades', 'Status')] = 'mislaid'; });
    assert.throws(() => buildInMemory(dir), (e) => e instanceof DataInputError && /grades\.csv:4 \(G\d{3}-\d+\): CHECK constraint failed/.test(e.message));
  } finally { cleanup(); }
});

test('row order is data: _ord follows the file, and a swap of two rows comes back swapped', () => {
  const ids = (db) => db.prepare('SELECT gradeid FROM grades ORDER BY _ord LIMIT 4').all().map((r) => r.gradeid);
  const fileOrder = realRecords('grades').slice(0, 4).map((r) => r[0]);
  assert.deepEqual(ids(real.db), fileOrder);
  const { dir, cleanup } = copyData();
  try {
    editRecords(dir, 'grades', (rows) => { [rows[1], rows[2]] = [rows[2], rows[1]]; });
    const swapped = buildInMemory(dir);
    assert.deepEqual(ids(swapped.db), [fileOrder[0], fileOrder[2], fileOrder[1], fileOrder[3]]);
    swapped.db.close();
  } finally { cleanup(); }
});

// ---------------------------------------------------------------- views

const countRows = (view) => Number(real.db.prepare(`SELECT count(*) AS n FROM ${view}`).get().n);
const countRecords = (table, test) => realRecords(table).filter((r) => test((name) => r[columnIndex(table, name)])).length;

test('the views return what an independent count over the CSV says', () => {
  const OPEN = ['Gap', 'Conflict', 'Partially resolved', 'Quarantined'];
  const open = countRecords('coverage', (c) => OPEN.includes(c('Status'))) + countRecords('measurements', (c) => c('Data status') === 'Unresolved unit / layout');
  const summaries = countRecords('material_summaries', (c) => ['draft', 'revise'].includes(c('Review status')));
  const implausible = countRecords('measurements', (c) => c('Data status') === 'Published value (physically implausible)');
  assert.equal(countRows('v_active_products'), countRecords('grades', (c) => c('Status') === 'active'));
  assert.equal(countRows('v_source_observations'), realRecords('measurements').length);
  assert.equal(countRows('v_profile_lineage'), realRecords('profiles').length);
  assert.equal(countRows('v_headline_candidates'), realRecords('headlines').length);
  assert.equal(countRows('v_open_findings'), open);
  assert.equal(countRows('v_editor_work_queues'), summaries + open + implausible);
  assert.ok(open > 0 && summaries >= 0 && countRows('v_active_products') > 1000);
  const names = real.db.prepare("SELECT name FROM sqlite_schema WHERE type = 'view' ORDER BY name").all().map((r) => r.name);
  assert.deepEqual(names, ['v_active_products', 'v_editor_work_queues', 'v_headline_candidates', 'v_open_findings', 'v_profile_lineage', 'v_source_observations']);
});

test('v_headline_candidates lists a pin with its definition and measurement (seeded: the committed table has no pins today)', () => {
  const { db } = buildInMemory(realData);
  try {
    const measurement = db.prepare('SELECT measurementid, materialid FROM measurements WHERE normalized_value IS NOT NULL ORDER BY _ord LIMIT 1').get();
    const definition = db.prepare('SELECT headlinekey FROM headline_definitions ORDER BY _ord LIMIT 1').get();
    db.prepare('INSERT INTO headlines (_ord, materialid, headlinekey, measurementid, reason) VALUES (1, ?, ?, ?, ?)')
      .run(measurement.materialid, definition.headlinekey, measurement.measurementid, 'seeded');
    const row = db.prepare('SELECT * FROM v_headline_candidates').get();
    assert.equal(row.measurementid, measurement.measurementid);
    assert.equal(row.headlinekey, definition.headlinekey);
    assert.equal(row.pin_reason, 'seeded');
    assert.notEqual(row.normalized_value, null);
  } finally { db.close(); }
});

test('views select stored facts only: the missing-state word stays a word in v_source_observations', () => {
  const row = real.db.prepare("SELECT normalized_value, normalized_value_state, normalized_value_text FROM v_source_observations WHERE normalized_value_state IS NOT NULL LIMIT 1").get();
  assert.equal(row.normalized_value, null);
  assert.equal(row.normalized_value_text, row.normalized_value_state);
  assert.ok(MISSING_STATES.includes(row.normalized_value_state));
});

test('each table\'s INSERT binds one value per stored column (_ord included), and its SELECT reads every cell in order', () => {
  for (const table of TABLE_NAMES) {
    const { insertSql, selectSql, header } = storageOf(table);
    const stored = tableInfo(table).filter((c) => c.hidden === 0).length; // generated columns are hidden = 2
    assert.equal((insertSql.match(/\?/g) ?? []).length, stored, table);
    assert.equal(header.length, TABLES[table].columns.length);
    assert.equal((selectSql.match(/ AS c\d+/g) ?? []).length, header.length);
    assert.match(selectSql, /ORDER BY _ord$/);
  }
});
