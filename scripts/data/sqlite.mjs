#!/usr/bin/env node
// A SQLite view of the database, for asking questions of it.
//
//   npm run db:sqlite                       write dist/h2c.sqlite
//   npm run sql -- "select ..."             run one query against it (writes it first if missing)
//
// The CSV tables stay the source of truth (D45); this is generated, read-only and gitignored with the rest of
// dist/. It exists because a question like "which materials publish a 0.45 MPa heat deflection on a printed
// specimen, and from how many manufacturers" is a join over four tables, and the alternative was a one-off script
// each time. `npm run trace` answers the questions about one record; this answers the ones about many.
//
// What the schema gives it that a plain CSV import cannot:
//
//   - A number is REAL, not text. A missing state is NULL, and the word that was written ("Not published", "Not
//     applicable") is kept in a sibling <column>_state, so a query can tell "no value" from "not measured here"
//     without parsing prose, and AVG() never silently swallows a missing state as zero.
//   - Every column name is recoverable. _columns maps each SQL name back to the CSV header it came from, with its
//     position, declared type and role, so nothing is guessed from a mangled identifier.
//
// Requires node:sqlite (Node 24 or newer), which is in the standard library: no dependency is added for this.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { loadSchemas } from '../../build/src/schema.js';
import { projectRoot } from './table-io.mjs';

const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 24) {
  console.error(`This needs node:sqlite, which is stable from Node 24; this is Node ${process.versions.node}. Upgrade Node, or read the CSV tables directly.`);
  process.exit(2);
}

/**
 * The SQL name of a CSV column. Mechanical and reversible by _columns, never clever: the unit marks a header
 * carries ("°C", "±", "kg/m³", "%") become letters rather than being dropped, so "Nozzle min °C" and "Nozzle min"
 * could not collide. A collision is an error, not a silent overwrite.
 */
export function sqlName(header) {
  const name = String(header)
    .normalize('NFKD').replace(/\p{M}+/gu, '')
    .replace(/°\s*C/gi, ' c').replace(/±/g, ' pm').replace(/%/g, ' pct')
    .replace(/³/g, '3').replace(/²/g, '2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!name) throw new Error(`Column "${header}" has no SQL name`);
  return /^\d/.test(name) ? `c_${name}` : name;
}

const SQL_TYPE = { number: 'REAL', integer: 'INTEGER', boolean: 'INTEGER', date: 'TEXT', string: 'TEXT', list: 'TEXT' };
const TYPED = new Set(['number', 'integer', 'boolean']);
const quote = (id) => `"${id.replace(/"/g, '""')}"`;

/** The value and the missing state of one cell: a number, or NULL plus the word that stood in its place. */
function cellOf(field, raw) {
  const text = raw == null ? null : String(raw);
  if (!TYPED.has(field.type)) return [text, null];
  if (text == null || text === '' || (field.missing ?? []).includes(text)) return [null, text];
  if (field.type === 'boolean') return [(field.trueValues ?? ['TRUE']).includes(text) ? 1 : 0, null];
  const n = Number(text);
  return Number.isFinite(n) ? [n, null] : [null, text];
}

export function writeSqlite(root = projectRoot, out = join(root, 'dist/h2c.sqlite')) {
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true });
  const db = new DatabaseSync(out);
  db.exec('PRAGMA journal_mode = OFF');
  db.exec(`CREATE TABLE _columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, csv_column TEXT NOT NULL,
    position INTEGER NOT NULL, schema_type TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY (table_name, column_name))`);
  const insertColumn = db.prepare('INSERT INTO _columns VALUES (?,?,?,?,?,?)');

  const counts = {};
  for (const [table, schema] of Object.entries(schemas)) {
    const path = join(root, 'data/tables', `${table}.csv`);
    if (!existsSync(path)) continue;
    const { header, records } = readCsv(path);
    const fields = schema.fields.filter((f) => header.includes(f.name));

    const seen = new Map();
    const cols = fields.map((f, i) => {
      const name = sqlName(f.name);
      if (seen.has(name)) throw new Error(`${table}: "${f.name}" and "${seen.get(name)}" both become "${name}"`);
      seen.set(name, f.name);
      insertColumn.run(table, name, f.name, i, f.type, f.role ?? '');
      return { field: f, name, typed: TYPED.has(f.type) };
    });

    const ddl = cols.flatMap((c) => [`${quote(c.name)} ${SQL_TYPE[c.field.type] ?? 'TEXT'}`, ...(c.typed ? [`${quote(`${c.name}_state`)} TEXT`] : [])]);
    db.exec(`CREATE TABLE ${quote(table)} (${ddl.join(', ')})`);
    const names = cols.flatMap((c) => [c.name, ...(c.typed ? [`${c.name}_state`] : [])]);
    const insert = db.prepare(`INSERT INTO ${quote(table)} (${names.map(quote).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`);
    db.exec('BEGIN');
    for (const { values } of records) {
      insert.run(...cols.flatMap((c) => {
        const [value, state] = cellOf(c.field, values[c.field.name]);
        return c.typed ? [value, state] : [value];
      }));
    }
    db.exec('COMMIT');
    counts[table] = records.length;
  }

  // Indexes on the identifiers every join uses. Without them a question over measurements takes seconds.
  for (const [table, column] of [['measurements', 'materialid'], ['measurements', 'gradeid'], ['measurements', 'sourceid'],
    ['grades', 'materialid'], ['profiles', 'materialid'], ['evidence', 'materialid'], ['prices', 'materialid'],
    ['coverage', 'materialid'], ['profile_notes', 'profileid'], ['reference_envelopes', 'name']]) {
    if (counts[table]) db.exec(`CREATE INDEX ${quote(`ix_${table}_${column}`)} ON ${quote(table)} (${quote(column)})`);
  }

  // A measurement with the names a reader needs to make sense of it. The conditions that decide whether two values
  // may be compared (specimen, direction, the two states, the load) are here, because leaving them out of the easy
  // view is how a query ends up averaging a dry value with a conditioned one.
  db.exec(`CREATE VIEW v_measurements AS SELECT
      m.measurementid, m.materialid, mat.original_name AS material, mat.family, mat.base_polymer,
      m.gradeid, g.manufacturer, g.product_name AS grade,
      m.property, m.normalized_value AS value, m.normalized_value_state AS value_state, m.normalized_unit AS unit,
      m.operator, m.data_status, m.specimen_type, m.direction, m.moisture_state, m.post_processing_state,
      m.standard_load AS standard, m.test_load_mpa AS load_mpa,
      m.sourceid, s.publisher, s.title AS source_title, s.source_class, s.access_state, s.url, m.locator
    FROM measurements m
    JOIN materials mat ON mat.materialid = m.materialid
    JOIN grades g ON g.gradeid = m.gradeid
    JOIN sources s ON s.sourceid = m.sourceid`);

  // Everything a reader is shown for a material, in one row per material and headline.
  const dbJson = join(root, 'dist/db.json');
  let headlines = 0;
  if (existsSync(dbJson)) {
    const compiled = JSON.parse(readFileSync(dbJson, 'utf8'));
    db.exec(`CREATE TABLE headlines_compiled (materialid TEXT NOT NULL, material TEXT NOT NULL, headline_key TEXT NOT NULL,
      known INTEGER NOT NULL, value REAL, unit TEXT, measurementid TEXT,
      estimate_lo REAL, estimate_hi REAL, estimate_centre REAL, precision TEXT, strength TEXT,
      PRIMARY KEY (materialid, headline_key))`);
    const ins = db.prepare('INSERT INTO headlines_compiled VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    db.exec('BEGIN');
    for (const m of compiled.materials) {
      for (const [key, h] of Object.entries(m.headline ?? {})) {
        const e = h.estimate;
        ins.run(m.id, m.name, key, h.known ? 1 : 0, h.known ? h.value ?? null : null, h.unit ?? null,
          h.measurementId ?? null, e?.lo ?? null, e?.hi ?? null, e?.centre ?? null, e?.precision ?? null, e?.strength ?? null);
        headlines++;
      }
    }
    db.exec('COMMIT');
  }

  db.close();
  return { out, tables: counts, headlines };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const query = process.argv.slice(2).filter((a) => !a.startsWith('--')).join(' ').trim();
  const out = join(projectRoot, 'dist/h2c.sqlite');
  if (!query || !existsSync(out) || process.argv.includes('--rebuild')) {
    const r = writeSqlite(projectRoot, out);
    const rows = Object.values(r.tables).reduce((a, b) => a + b, 0);
    console.error(`${out.slice(projectRoot.length + 1)}: ${Object.keys(r.tables).length} tables, ${rows} rows, ${r.headlines} compiled headlines`);
  }
  if (!query) process.exit(0);
  const db = new DatabaseSync(out, { readOnly: true });
  const rows = db.prepare(query).all();
  if (!rows.length) { console.log('(no rows)'); process.exit(0); }
  const cols = Object.keys(rows[0]);
  const width = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (cells) => cells.map((v, i) => String(v ?? '').padEnd(width[i])).join('  ').trimEnd();
  console.log(line(cols));
  console.log(width.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(cols.map((c) => r[c])));
  console.error(`\n${rows.length} row(s)`);
}
