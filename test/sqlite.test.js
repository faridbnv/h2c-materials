// The SQLite view is generated from the same tables and the same schema, so it must hold exactly what they hold
// and give every column name back. It is a convenience, not a second source of truth (D45, D75): the moment it
// says something the CSV tables do not, it is worse than not having it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSqlite, sqlName } from '../scripts/data/sqlite.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'h2c-sqlite-'));
const out = join(dir, 'h2c.sqlite');
const result = writeSqlite(root, out);
const db = new DatabaseSync(out, { readOnly: true });
const all = (q) => db.prepare(q).all();

test('every table holds exactly the rows the manifest counts', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8'));
  const tables = manifest.tables ?? manifest;
  for (const [name, entry] of Object.entries(tables)) {
    const expected = typeof entry === 'number' ? entry : entry.rows;
    const [{ n }] = all(`SELECT COUNT(*) AS n FROM "${name}"`);
    assert.equal(n, expected, `${name}: ${n} rows in SQLite, ${expected} in the manifest`);
    assert.equal(result.tables[name], expected);
  }
});

test('every column name is recoverable: _columns reproduces each CSV header, in order', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8'));
  for (const name of Object.keys(manifest.tables ?? manifest)) {
    const header = readFileSync(join(root, 'data/tables', `${name}.csv`), 'utf8').split('\n')[0];
    const csv = [...header.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"')).filter((s, i, a) => i < a.length - 1);
    const stored = all(`SELECT csv_column FROM _columns WHERE table_name = '${name}' ORDER BY position`).map((r) => r.csv_column);
    assert.deepEqual(stored, csv, `${name}: _columns does not reproduce the CSV header`);
  }
});

test('a number is a number, and a missing state is null beside the word that was written', () => {
  // The whole reason for a typed view: AVG() must never read "Not published" as zero, and a query must still be
  // able to tell "no value here" from "the source did not publish one".
  const [{ t }] = all("SELECT typeof(normalized_value) AS t FROM measurements WHERE normalized_value IS NOT NULL LIMIT 1");
  assert.equal(t, 'real');
  const missing = all('SELECT normalized_value_state AS s, COUNT(*) AS n FROM measurements WHERE normalized_value IS NULL GROUP BY s');
  assert.ok(missing.length > 0, 'no measurement carries a missing state');
  for (const r of missing) assert.ok(r.s && r.s.length > 2, `a null value with no state recorded (${r.n} rows)`);
  const [{ bad }] = all("SELECT COUNT(*) AS bad FROM measurements WHERE normalized_value IS NOT NULL AND normalized_value_state IS NOT NULL");
  assert.equal(bad, 0, 'a row carries both a value and a missing state');
  // A boolean is 0 or 1, not the word.
  const flags = all("SELECT DISTINCT quarantined FROM prices WHERE quarantined IS NOT NULL").map((r) => r.quarantined);
  assert.ok(flags.every((v) => v === 0 || v === 1), `prices.quarantined holds ${flags.join(', ')}`);
});

test('the joined view reaches every measurement, and the compiled headlines are all there', () => {
  const [{ n }] = all('SELECT COUNT(*) AS n FROM v_measurements');
  const [{ m }] = all('SELECT COUNT(*) AS m FROM measurements');
  assert.equal(n, m, 'v_measurements loses rows: a measurement points at a material, grade or source that is not there');
  const [{ h }] = all('SELECT COUNT(*) AS h FROM headlines_compiled');
  assert.equal(h, result.headlines);
  const [{ k }] = all('SELECT COUNT(*) AS k FROM headlines_compiled WHERE known = 1 AND value IS NULL');
  assert.equal(k, 0, 'a known headline with no value');
});

test('the column naming rule keeps units and never collides', () => {
  assert.equal(sqlName('Nozzle min °C'), 'nozzle_min_c');
  assert.equal(sqlName('Raw uncertainty ±'), 'raw_uncertainty_pm');
  assert.equal(sqlName('Neat density min kg/m³'), 'neat_density_min_kg_m3');
  assert.equal(sqlName('Charpy strength kJ/m²'), 'charpy_strength_kj_m2');
  assert.equal(sqlName('Rating 1–5'), 'rating_1_5');
  assert.equal(sqlName('H2C SourceID'), 'h2c_sourceid');
  assert.equal(sqlName('45/45'), 'c_45_45', 'a name that starts with a digit is not a legal bare identifier');
  // Two headers that differ only in their unit mark must not become one column.
  assert.notEqual(sqlName('Nozzle min °C'), sqlName('Nozzle min'));
  const dupes = all('SELECT table_name, column_name, COUNT(*) AS n FROM _columns GROUP BY table_name, column_name HAVING n > 1');
  assert.deepEqual(dupes, []);
});

test.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

test('each value knows how far it sits from its material\'s other values measured the same way', () => {
  // measurement_z holds every comparable point value once; a group of one has no spread and no z, and the spread
  // view counts exactly the rows the table holds (PLAN-REMAINING 2.1).
  const [{ n }] = all('SELECT COUNT(*) AS n FROM measurement_z');
  const [{ eligible }] = all(`SELECT COUNT(*) AS eligible FROM measurements WHERE normalized_value IS NOT NULL AND operator = '='
    AND data_status NOT LIKE 'Retired%' AND data_status NOT LIKE '%implausible%'`);
  assert.equal(n, eligible);
  const [{ lonely }] = all('SELECT COUNT(*) AS lonely FROM measurement_z WHERE group_n = 1 AND z IS NOT NULL');
  assert.equal(lonely, 0, 'a value alone in its group was given a z');
  const [{ spread }] = all('SELECT SUM(n) AS spread FROM v_property_spread');
  assert.equal(spread, n);
  const [row] = all('SELECT * FROM v_measurement_z WHERE z IS NOT NULL LIMIT 1');
  for (const c of ['material', 'manufacturer', 'variant', 'median', 'mad', 'z', 'sourceid']) assert.ok(c in row, `v_measurement_z lacks ${c}`);
});
