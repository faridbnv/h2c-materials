#!/usr/bin/env node
// A SQLite view of the database, for asking questions of it.
//
//   npm run db:sqlite                           write dist/h2c.sqlite from the tables as they are
//   npm run sql -- "select ..."                 ask the tables as they are: the file is rewritten first when it is not of them
//   npm run sql -- --build "select ..."         the same, and build dist/db.json first when it is not of them either
//   npm run sql -- --snapshot "select ..."      ask the file as it was written, and say which release that was
//   npm run sql -- --rebuild "select ..."       rewrite the file whatever its stamp says
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
// The record tier (D85) goes in with it: source_facts, documents and, where the text cache is present, the full-text
// index documents_fts (scripts/data/record-tier.mjs).
//
// One generation (F13; review finding A05). The file holds the raw tables, read from data/tables; the compiled
// headlines, products and spreads, read from dist/db.json; and the record tier. The compiled part used to be read from
// whatever dist/db.json was on disk, so after an edit and before a build the file set the new measurement beside the old
// product value; and a query was answered from any file already written, however old. Now:
//
//   - The file is stamped (_generation) with what it was written from: the release the tables, schema, rules and engine
//     make (build/src/release.js, D96), the compiled database's bytes and the release it was built from, the record
//     tier's inputs and this writer's own code, and one digest over them all. _tables names every table's tier and the
//     release its rows are of.
//   - dist/db.json is read only when it is of the release the tables make now. When it is not, nothing is written: the
//     command says to run `npm run build`, or runs it with --build. Without a dist/db.json (a fresh clone) the raw and
//     record tiers are written and the stamp says the compiled one is absent.
//   - A plain query checks the stamp against the inputs first and rewrites the file when they differ, so it answers
//     from the tables as they are or refuses. --snapshot answers from the file as it is, and says which release it holds.
//   - How much of the corpus the full-text index holds is stamped beside it (fulltext complete, partial or unavailable),
//     so a search of a partial text cache does not read as a search of every sheet.
//
// Requires node:sqlite (Node 24 or newer), which is in the standard library: no dependency is added for this.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { loadSchemas } from '../../build/src/schema.js';
import { releaseIdentity } from '../../build/src/release.js';
import { projectRoot } from './table-io.mjs';
import { writeRecordTier, recordInputs } from './record-tier.mjs';

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

// ---------------------------------------------------------------- generation

/** The layout this writer makes. A file of another layout is rewritten whatever its inputs, as is one of other code. */
const FORMAT = 'h2c-sqlite 2';
const here = dirname(fileURLToPath(import.meta.url));
const WRITER = ['sqlite.mjs', 'record-tier.mjs', '../lib/pdf-text.mjs', '../ingest/archive.mjs'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const dbJsonOf = (root) => join(root, 'dist/db.json');

/** dist/db.json is of another release than the tables make: its products and headlines are not of these measurements. */
export class StaleCompiledError extends Error {}

/**
 * What a file written now would be written from: the release (id, digest and the digest of each part), the compiled
 * database (absent, or its bytes' digest), the record tier's inputs, this writer's code, and `generation`, one digest
 * over them all, which is what a stamp is compared by. `compiledBytes` is dist/db.json as the caller already read it,
 * so the digest is of the bytes it goes on to import.
 */
export function currentInputs(root = projectRoot, { compiledBytes } = {}) {
  const release = releaseIdentity(root);
  const bytes = compiledBytes ?? (existsSync(dbJsonOf(root)) ? readFileSync(dbJsonOf(root)) : null);
  const compiled = bytes ? { state: 'present', sha256: sha256(bytes) } : { state: 'absent', sha256: null };
  const record = recordInputs(root);
  const writer = sha256(WRITER.map((f) => `${sha256(readFileSync(join(here, f)))}  ${f}`).join('\n'));
  const parts = [`format ${FORMAT}`, `release ${release.digest}`, `compiled ${compiled.sha256 ?? 'absent'}`, `record ${record.digest ?? 'absent'}`, `writer ${writer}`];
  return { release, compiled, record, writer, generation: sha256(parts.join('\n')) };
}

/** The stamp of a written file as { key: value }; {} for a file written before files carried one, null for no file. */
export function readStamp(file) {
  if (!existsSync(file)) return null;
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    return Object.fromEntries(db.prepare('SELECT key, value FROM _generation').all().map((r) => [r.key, r.value]));
  } catch {
    return {};
  } finally {
    db?.close();
  }
}

/** Whether a written file is of the inputs as they are now. */
export const isCurrent = (stamp, inputs) => !!stamp?.generation && stamp.generation === inputs.generation;

function staleMessage(built, release) {
  return `dist/db.json was built from release ${built?.id ?? '(unidentified)'}; the tables, schema, rules and engine now make `
    + `release ${release.id}. Its products and headlines are not of these measurements, so no SQLite file was written from it. `
    + 'Run `npm run build`, then ask again, or pass --build to build it first.';
}

/**
 * Write the SQLite file from the tables as they are, and dist/db.json only where it is of the same release (A05).
 * Throws StaleCompiledError, having written nothing, when dist/db.json is of another. The file is written beside its
 * place and moved there whole, so a failed write leaves the last good file, or none, and never half of one.
 */
export function writeSqlite(root = projectRoot, out = join(root, 'dist/h2c.sqlite')) {
  const compiledBytes = existsSync(dbJsonOf(root)) ? readFileSync(dbJsonOf(root)) : null;
  const inputs = currentInputs(root, { compiledBytes });
  const compiled = compiledBytes ? JSON.parse(compiledBytes.toString('utf8')) : null;
  if (compiled && compiled.meta?.release?.digest !== inputs.release.digest) throw new StaleCompiledError(staleMessage(compiled.meta?.release, inputs.release));

  mkdirSync(dirname(out), { recursive: true });
  const tmp = `${out}.${process.pid}.tmp`;
  rmSync(tmp, { force: true });
  let db;
  try {
    db = new DatabaseSync(tmp);
    const written = writeTables(db, root, compiled, inputs);
    // The tables must not have moved while they were read: the stamp says they are of the release computed first.
    const after = releaseIdentity(root);
    if (after.digest !== inputs.release.digest) throw new Error(`The tables changed while ${relative(root, out)} was written (release ${inputs.release.id}, now ${after.id}); ask again`);
    db.close();
    db = null;
    renameSync(tmp, out);
    return { out, ...written, generation: inputs.generation, release: inputs.release.id };
  } catch (e) {
    db?.close();
    rmSync(tmp, { force: true });
    throw e;
  }
}

function writeTables(db, root, compiled, inputs) {
  const { tables: schemas } = loadSchemas(join(root, 'schema'));
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
    ['grades', 'materialid'], ['grades', 'sourceid'], ['sources', 'sourceid'], ['profiles', 'materialid'],
    ['evidence', 'materialid'], ['prices', 'materialid'], ['coverage', 'materialid'], ['profile_notes', 'profileid'], ['reference_envelopes', 'name']]) {
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

  // How far each value sits from its material's other values measured the same way (PLAN-REMAINING 2.1): the
  // working list for the sweep. Grouped by everything that decides whether two values may be compared — material,
  // property, unit, direction, the two states and whether the specimen was printed or moulded — and robust: the
  // median and the median absolute deviation, so one wild value cannot hide itself by moving the mean. A value
  // physics already rules out, a retired duplicate and a bound are left out; a group of one has no spread and no z.
  const form = (t) => (/^Printed/.test(t ?? '') ? 'printed' : /^Raw material/.test(t ?? '') ? 'moulded' : /^(Film|Filament)/.test(t ?? '') ? 'other' : 'unstated');
  const rows = db.prepare(`SELECT measurementid, materialid, gradeid, property, unit, value, direction, moisture_state, post_processing_state, specimen_type
    FROM v_measurements WHERE value IS NOT NULL AND operator = '=' AND data_status NOT LIKE 'Retired%' AND data_status NOT LIKE '%implausible%'`).all();
  const groups = new Map();
  for (const r of rows) {
    const key = [r.materialid, r.property, r.unit, r.direction, r.moisture_state, r.post_processing_state, form(r.specimen_type)].join('|');
    (groups.get(key) ?? groups.set(key, []).get(key)).push(r);
  }
  const median = (xs) => { const a = [...xs].sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
  db.exec(`CREATE TABLE measurement_z (measurementid TEXT PRIMARY KEY, materialid TEXT NOT NULL, gradeid TEXT NOT NULL, property TEXT NOT NULL,
    unit TEXT, direction TEXT, moisture_state TEXT, post_processing_state TEXT, specimen_form TEXT NOT NULL,
    value REAL NOT NULL, group_n INTEGER NOT NULL, group_grades INTEGER NOT NULL, median REAL NOT NULL, mad REAL, z REAL)`);
  const insZ = db.prepare('INSERT INTO measurement_z VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  for (const list of groups.values()) {
    const values = list.map((r) => r.value);
    const med = median(values);
    const mad = list.length > 1 ? 1.4826 * median(values.map((v) => Math.abs(v - med))) : null;
    const grades = new Set(list.map((r) => r.gradeid)).size;
    for (const r of list) {
      insZ.run(r.measurementid, r.materialid, r.gradeid, r.property, r.unit, r.direction, r.moisture_state, r.post_processing_state,
        form(r.specimen_type), r.value, list.length, grades, med, mad, mad ? (r.value - med) / mad : null);
    }
  }
  db.exec('COMMIT');
  db.exec('CREATE INDEX ix_measurement_z_material ON measurement_z (materialid)');
  // The spread of one material's values for one property measured one way: how many grades publish it, the middle
  // and the ends, and which grade sits at each end.
  db.exec(`CREATE VIEW v_property_spread AS SELECT z.materialid, mat.original_name AS material, z.property, z.unit, z.direction,
      z.moisture_state, z.post_processing_state, z.specimen_form, COUNT(*) AS n, COUNT(DISTINCT z.gradeid) AS grades,
      MIN(z.median) AS median, MIN(z.mad) AS mad, MIN(z.value) AS min, MAX(z.value) AS max,
      (SELECT z2.gradeid FROM measurement_z z2 WHERE z2.materialid = z.materialid AND z2.property = z.property AND z2.unit IS z.unit
        AND z2.direction IS z.direction AND z2.moisture_state IS z.moisture_state AND z2.post_processing_state IS z.post_processing_state
        AND z2.specimen_form = z.specimen_form ORDER BY z2.value ASC LIMIT 1) AS grade_at_min,
      (SELECT z2.gradeid FROM measurement_z z2 WHERE z2.materialid = z.materialid AND z2.property = z.property AND z2.unit IS z.unit
        AND z2.direction IS z.direction AND z2.moisture_state IS z.moisture_state AND z2.post_processing_state IS z.post_processing_state
        AND z2.specimen_form = z.specimen_form ORDER BY z2.value DESC LIMIT 1) AS grade_at_max
    FROM measurement_z z JOIN materials mat ON mat.materialid = z.materialid
    GROUP BY z.materialid, z.property, z.unit, z.direction, z.moisture_state, z.post_processing_state, z.specimen_form`);
  // The sweep's list, in the words a reader wants: the value, how far out it sits, and where it came from.
  db.exec(`CREATE VIEW v_measurement_z AS SELECT z.measurementid, z.materialid, mat.original_name AS material, z.gradeid, g.manufacturer,
      g.product_name AS grade, g.variant, z.property, z.value, z.unit, z.direction, z.specimen_form, z.group_n, z.group_grades, z.median, z.mad, z.z,
      m.sourceid, m.locator
    FROM measurement_z z JOIN materials mat ON mat.materialid = z.materialid JOIN grades g ON g.gradeid = z.gradeid
    JOIN measurements m ON m.measurementid = z.measurementid`);

  // Everything a reader is shown for a material, in one row per material and headline. Only from a compiled database
  // of this release (writeSqlite refused any other), and not at all without one.
  let headlines = 0;
  if (compiled) {
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
    // Every product's own value per headline, by rule (build/src/products.js), and every material's spread across its
    // products: "which PLA products state an XY modulus above 2.5 GPa" is one query.
    db.exec(`CREATE TABLE products_compiled (gradeid TEXT NOT NULL, materialid TEXT NOT NULL, manufacturer TEXT, product TEXT,
      variant TEXT, headline_key TEXT NOT NULL, value REAL NOT NULL, level TEXT NOT NULL, caveat TEXT, measurementid TEXT,
      anneal_c REAL, anneal_h REAL, pinned INTEGER NOT NULL, twin_of TEXT, PRIMARY KEY (gradeid, headline_key))`);
    db.exec(`CREATE TABLE summaries_compiled (materialid TEXT NOT NULL, material TEXT NOT NULL, headline_key TEXT NOT NULL,
      products INTEGER NOT NULL, n INTEGER NOT NULL, min REAL, q1 REAL, median REAL, q3 REAL, max REAL, typical TEXT,
      as_published_n INTEGER, as_published_min REAL, as_published_max REAL, variants_n INTEGER, variants_min REAL, variants_max REAL,
      twins INTEGER, PRIMARY KEY (materialid, headline_key))`);
    const insP = db.prepare('INSERT INTO products_compiled VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const insS = db.prepare('INSERT INTO summaries_compiled VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const g of compiled.grades) {
      for (const [key, v] of Object.entries(g.headline ?? {})) {
        // twin_of: the sibling whose own value this is, where the product's sheet prints its table (D89).
        insP.run(g.id, g.materialId, g.manufacturer, g.product, g.variant ?? null, key, v.value, v.level, v.caveat ?? null,
          v.measurementId ?? null, v.anneal?.tempC ?? null, v.anneal?.hours ?? null, v.pinned ? 1 : 0, v.from?.origin === 'twin' ? v.from.gradeId : null);
      }
    }
    for (const m of compiled.materials) {
      for (const [key, s] of Object.entries(m.summary ?? {})) {
        insS.run(m.id, m.name, key, s.products, s.n, s.min ?? null, s.q1 ?? null, s.median ?? null, s.q3 ?? null, s.max ?? null, s.typical ?? null,
          s.asPublished?.n ?? null, s.asPublished?.min ?? null, s.asPublished?.max ?? null, s.variants?.n ?? null, s.variants?.min ?? null, s.variants?.max ?? null,
          s.twins ?? null);
      }
    }
    db.exec('COMMIT');
  }

  // The record tier (D85): documents, the lines the import reader read without them becoming data, and the full-text
  // index of the cached documents (scripts/data/record-tier.mjs). It is computed from the committed files, not from
  // the tables above, and nothing reads it back.
  const record = inputs.record.state === 'present' ? writeRecordTier(db, root) : null;

  // What every table is, and the release its rows are of: the compiled tables' is the one dist/db.json names, which is
  // how a reader sees, rather than takes on trust, that the raw and compiled rows are of one generation.
  const TIER = { measurement_z: 'derived', headlines_compiled: 'compiled', products_compiled: 'compiled', summaries_compiled: 'compiled',
    documents: 'record', source_facts: 'record', documents_fts: 'record', _columns: 'meta' };
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'documents_fts_%' ORDER BY name").all().map((r) => r.name);
  const tables = names.map((name) => {
    const tier = counts[name] !== undefined ? 'raw' : TIER[name] ?? 'meta';
    return [name, tier, db.prepare(`SELECT COUNT(*) AS n FROM ${quote(name)}`).get().n, tier === 'compiled' ? compiled.meta.release.id : inputs.release.id];
  });
  db.exec('CREATE TABLE _tables (table_name TEXT PRIMARY KEY, tier TEXT NOT NULL, rows INTEGER NOT NULL, release_id TEXT NOT NULL)');
  const insTable = db.prepare('INSERT INTO _tables VALUES (?,?,?,?)');
  for (const row of tables) insTable.run(...row);

  const corpus = record?.corpus ?? { state: 'unavailable', sources: null, indexed: 0 };
  const stamp = {
    format: FORMAT,
    generation: inputs.generation,
    'release.id': inputs.release.id,
    'release.digest': inputs.release.digest,
    'release.inputs': JSON.stringify(inputs.release.inputs),
    compiled: compiled ? 'current' : 'absent',
    'compiled.release.id': compiled?.meta.release.id ?? null,
    'compiled.release.digest': compiled?.meta.release.digest ?? null,
    'compiled.sha256': inputs.compiled.sha256,
    record: inputs.record.state,
    'record.digest': inputs.record.digest,
    writer: inputs.writer,
    // The corpus the full-text index is measured against: the sources registered as retrieved, and how many of them
    // it holds the text of (record-tier.mjs); documents and pages count everything indexed, registered or not.
    fulltext: corpus.state,
    'fulltext.sources': corpus.sources,
    'fulltext.sources_indexed': corpus.indexed,
    'fulltext.documents': record?.fulltext?.documents ?? 0,
    'fulltext.pages': record?.fulltext?.pages ?? 0,
    'fulltext.ocr_pages': record?.fulltext?.ocrPages ?? 0,
  };
  // Written last: a file with a stamp is a file that was finished.
  db.exec('CREATE TABLE _generation (key TEXT PRIMARY KEY, value TEXT)');
  const insStamp = db.prepare('INSERT INTO _generation VALUES (?,?)');
  for (const [key, value] of Object.entries(stamp)) insStamp.run(key, value == null ? null : String(value));
  return { tables: counts, headlines, record, stamp: Object.fromEntries(Object.entries(stamp).map(([k, v]) => [k, v == null ? null : String(v)])) };
}

/**
 * The file at `out`, of the inputs as they are: written first when it is missing, of other inputs, or `rebuild`. With
 * `build`, a dist/db.json of another release is rebuilt (`npm run build`) rather than refused. Returns the stamp, and
 * what was written when something was.
 */
export function ensureCurrent(root = projectRoot, out = join(root, 'dist/h2c.sqlite'), { build = false, rebuild = false, log = () => {} } = {}) {
  const before = readStamp(out);
  const current = isCurrent(before, currentInputs(root));
  if (current && !rebuild) return { stamp: before, written: null };
  if (before && !current) log(`${relative(root, out)} ${before.generation ? `was written from release ${before['release.id']}` : 'carries no generation'}; the inputs have changed since, so it is written again`);
  let written;
  try {
    written = writeSqlite(root, out);
  } catch (e) {
    if (!(e instanceof StaleCompiledError) || !build) throw e;
    log('dist/db.json is not of these tables; building it first (--build)');
    // The build's report goes to stderr, so standard output stays the query's.
    const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: ['ignore', 2, 2], shell: process.platform === 'win32' });
    if (r.status !== 0) throw new Error('npm run build failed, so no SQLite file was written');
    written = writeSqlite(root, out);
  }
  return { stamp: written.stamp, written };
}

/** The stamp in a reader's words: which release, whether the compiled tables are in it, and how much text is indexed. */
export function describeStamp(stamp) {
  if (!stamp?.generation) return 'written before files carried their generation, so what it was written from cannot be told';
  const compiled = stamp.compiled === 'current' ? `compiled tables of release ${stamp['compiled.release.id']}` : 'no compiled tables (there was no dist/db.json)';
  const text = stamp.fulltext === 'unavailable' ? 'no full-text index'
    : `full text of ${stamp['fulltext.sources_indexed']} of ${stamp['fulltext.sources']} retrieved sources (${stamp.fulltext})`;
  return `release ${stamp['release.id']}: raw tables, ${compiled}, ${stamp.record === 'present' ? 'the record tier' : 'no record tier'}, ${text}`;
}

const COMPILED = /\b(headlines|products|summaries)_compiled\b/i;

/**
 * Run one query on a written file and return its rows. A table the file does not hold because its tier was not
 * written (no compiled database, no text cache) is said in those words rather than as "no such table", and a question
 * of a partial full-text index is told how partial (`note`).
 */
export function queryFile(file, sql) {
  const stamp = readStamp(file);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const rows = db.prepare(sql).all();
    const note = /\bdocuments_fts\b/i.test(sql) && stamp?.fulltext === 'partial'
      ? `documents_fts holds the text of ${stamp['fulltext.sources_indexed']} of ${stamp['fulltext.sources']} retrieved sources: `
        + 'what it does not find may still be printed on a sheet it does not hold (v_sources_without_text lists them)'
      : null;
    return { rows, stamp, note };
  } catch (e) {
    if (/no such table/i.test(e.message) && COMPILED.test(sql) && stamp?.compiled !== 'current') {
      throw new Error('The compiled tables are not in this file: there was no dist/db.json of these tables when it was written. Run `npm run build`, then ask again.');
    }
    if (/no such table/i.test(e.message) && /\bdocuments_fts\b/i.test(sql) && stamp?.fulltext === 'unavailable') {
      throw new Error('documents_fts was not built: there was no text cache (.cache/text) where this file was written, so no sheet\'s text can be searched here (v_sources_without_text lists the sources).');
    }
    throw e;
  } finally {
    db.close();
  }
}

/** A plain current query: the file is made current first (ensureCurrent), then asked. */
export function askCurrent(root, out, sql, options = {}) {
  const { stamp, written } = ensureCurrent(root, out, options);
  return { ...queryFile(out, sql), stamp, written };
}

function printWritten(r, out) {
  const rows = Object.values(r.tables).reduce((a, b) => a + b, 0);
  console.error(`${relative(projectRoot, out)}: ${describeStamp(r.stamp)}`);
  console.error(`  ${Object.keys(r.tables).length} tables, ${rows} rows, ${r.headlines} compiled headlines`);
  const t = r.record;
  if (!t) return console.error('  record tier not written: no import ledger in this checkout');
  console.error(`  record tier: ${t.facts} source_facts (${Object.entries(t.kinds).map(([k, n]) => `${n} ${k}`).join(', ')}) on ${t.factDocuments} documents, `
    + (t.fulltext ? `documents_fts: ${t.fulltext.pages} pages of ${t.fulltext.documents} documents, and ${t.fulltext.ocrPages} optical readings of pages whose text layer is broken` : 'documents_fts not built: no text cache (.cache/text)')
    + ` (${(t.ms / 1000).toFixed(1)} s)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const query = args.filter((a) => !a.startsWith('--')).join(' ').trim();
  const out = join(projectRoot, 'dist/h2c.sqlite');
  const name = relative(projectRoot, out);
  const log = (s) => console.error(s);
  let result;
  try {
    if (flag('--snapshot')) {
      // The file as it is, of whatever release it was written from: said before the answer, never assumed current.
      if (!existsSync(out)) throw new Error(`There is no ${name} to ask; npm run db:sqlite writes one`);
      result = queryFile(out, query || 'SELECT key, value FROM _generation ORDER BY key');
      const now = currentInputs(projectRoot);
      log(`Answering from ${name} as written, ${describeStamp(result.stamp)}. `
        + (isCurrent(result.stamp, now) ? 'It is of the inputs as they are.' : `It is not of the inputs as they are (the tables now make release ${now.release.id}); a query without --snapshot writes it again.`));
    } else if (!query) {
      const r = ensureCurrent(projectRoot, out, { build: flag('--build'), rebuild: true, log });
      printWritten(r.written, out);
      process.exit(0);
    } else {
      result = askCurrent(projectRoot, out, query, { build: flag('--build'), rebuild: flag('--rebuild'), log });
      if (result.written) printWritten(result.written, out);
    }
  } catch (e) {
    if (e instanceof StaleCompiledError || /^(The compiled|documents_fts was not|There is no|npm run build failed|The tables changed)/.test(e.message)) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
  const { rows, note } = result;
  if (note) log(note);
  if (!rows.length) { console.log('(no rows)'); process.exit(0); }
  const cols = Object.keys(rows[0]);
  const width = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (cells) => cells.map((v, i) => String(v ?? '').padEnd(width[i])).join('  ').trimEnd();
  console.log(line(cols));
  console.log(width.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(cols.map((c) => r[c])));
  console.error(`\n${rows.length} row(s)`);
}
