// The SQLite view is generated from the same tables and the same schema, so it must hold exactly what they hold
// and give every column name back. It is a convenience, not a second source of truth (D45, D75): the moment it
// says something the CSV tables do not, it is worse than not having it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync, mkdtempSync, existsSync, cpSync, mkdirSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSqlite, sqlName, readStamp, currentInputs, askCurrent, queryFile, StaleCompiledError } from '../scripts/data/sqlite.mjs';
import { PROPOSALS, LEDGER, RETRIEVED, proposalFiles } from '../scripts/data/record-tier.mjs';
import { cacheDir } from '../scripts/lib/pdf-text.mjs';
import { readCsv, writeCsv } from '../build/src/csv.js';
import { releaseIdentity, RELEASE_INPUTS } from '../build/src/release.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'h2c-sqlite-'));
const out = join(dir, 'h2c.sqlite');
const hashOf = (path) => (existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null);
const dbJsonBefore = hashOf(join(root, 'dist/db.json'));
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

// The record tier (D85): what the sources publish that the decision tier does not hold. It is derived from the
// committed proposals and the ledger, so it must hold each line the reader read exactly once, carry the source the
// ledger registered its document as, and change nothing the page is built from.
const proposalDir = join(root, PROPOSALS);
const proposals = proposalFiles(proposalDir).map((rel) => ({ rel, ...JSON.parse(readFileSync(join(proposalDir, rel), 'utf8')) }));
const lineKey = (sha, page, text) => `${sha}\u0000${page}\u0000${text}`;

test('the record tier holds each line once, by document, page and text', () => {
  const [{ n }] = all('SELECT COUNT(*) AS n FROM source_facts');
  assert.equal(n, result.record.facts);
  const dupes = all('SELECT sha256, page, text, COUNT(*) AS n FROM source_facts GROUP BY sha256, page, text HAVING n > 1');
  assert.deepEqual(dupes, [], 'a line recorded twice: the batches that re-read a document were not deduplicated');
  const [{ orphans }] = all('SELECT COUNT(*) AS orphans FROM source_facts f LEFT JOIN documents d USING (sha256) WHERE d.sha256 IS NULL');
  assert.equal(orphans, 0, 'a fact on a document the documents table does not know');
});

test('every line a proposal skipped is a fact, and every fact is a line its proposal read on that page', () => {
  const skipped = new Set(proposals.flatMap((p) => (p.skipped ?? []).map((s) => lineKey(p.document.sha256, s.page, s.text))));
  const facts = all('SELECT kind, sha256, page, text, proposal, sourceid FROM source_facts');
  const recorded = new Set(facts.map((f) => lineKey(f.sha256, f.page, f.text)));
  const missing = [...skipped].filter((k) => !recorded.has(k));
  assert.deepEqual(missing.slice(0, 5), [], `${missing.length} skipped line(s) are not in source_facts`);
  // A skipped line leaves 'skipped' only to become 'unapplied': the row another batch made of it on a document the
  // database cites no source for.
  const unappliedSkipped = facts.filter((f) => f.kind === 'unapplied' && skipped.has(lineKey(f.sha256, f.page, f.text))).length;
  assert.equal(facts.filter((f) => f.kind === 'skipped').length + unappliedSkipped, skipped.size);
  const byRel = new Map(proposals.map((p) => [p.rel, p]));
  for (const f of facts) {
    const p = byRel.get(f.proposal);
    assert.ok(p, `a fact on ${f.sha256.slice(0, 16)} names a proposal that does not exist: ${f.proposal}`);
    assert.equal(p.document.sha256, f.sha256, `${f.proposal} is not the proposal of the fact's document`);
    const lines = f.kind === 'skipped' ? (p.skipped ?? []).map((s) => [s.page, s.text])
      : [...(p.measurements ?? []), ...(p.profiles ?? [])].filter((r) => r.review?.status !== 'rejected').map((r) => [r.evidence?.page, r.evidence?.text])
        .concat((p.settings ?? []).map((s) => [s.page, s.line]));
    assert.ok(lines.some(([page, text]) => page === f.page && text === f.text), `${f.proposal} does not read "${f.text}" on page ${f.page}`);
    if (f.kind === 'unapplied') assert.equal(f.sourceid, null, `an unapplied row on ${f.proposal}, whose document is registered as ${f.sourceid}`);
  }
});

test('every fact whose document is registered carries that source, and the source\'s own grades', () => {
  const registered = new Map();
  for (const r of readCsv(join(root, LEDGER)).records.map((x) => x.values)) {
    if (r.sha256 && r.registered_source_id) registered.set(r.sha256, r.registered_source_id);
  }
  const bySha = new Map(readCsv(join(root, 'data/tables/sources.csv')).records.map((x) => [x.values.SHA256, x.values.SourceID]));
  for (const f of all('SELECT sha256, sourceid FROM source_facts')) {
    const expected = registered.get(f.sha256) ?? bySha.get(f.sha256) ?? null;
    if (f.sourceid !== expected) assert.fail(`a fact on ${f.sha256.slice(0, 16)} carries ${f.sourceid}; the ledger says ${expected}`);
  }
  const [{ unknown }] = all('SELECT COUNT(*) AS unknown FROM source_facts f WHERE f.sourceid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sources s WHERE s.sourceid = f.sourceid)');
  assert.equal(unknown, 0, 'a fact carries a source sources.csv does not have');
  const wrong = all(`WITH own AS (SELECT sourceid, group_concat(gradeid, ',' ORDER BY gradeid) AS ids FROM grades WHERE status = 'active' GROUP BY sourceid)
    SELECT f.fact_id, f.gradeids, own.ids FROM source_facts f LEFT JOIN own ON own.sourceid = f.sourceid
    WHERE COALESCE(f.gradeids, '') != COALESCE(own.ids, '') LIMIT 5`);
  assert.deepEqual(wrong, [], 'gradeids is not the list of active grades whose source is the fact\'s');
});

test('a fact names only a property the registry keeps, and says how it was found', () => {
  const unknown = all(`SELECT DISTINCT property FROM source_facts WHERE property IS NOT NULL AND property NOT IN
    (SELECT property FROM properties WHERE replaced_by IS NULL OR replaced_by = 'Not applicable')`);
  assert.deepEqual(unknown, []);
  const [{ bad }] = all(`SELECT COUNT(*) AS bad FROM source_facts WHERE (property IS NULL) != (property_by IS NULL)
    OR property_by NOT IN ('reader', 'name')`);
  assert.equal(bad, 0);
});

test('a skipped fact is found by its words and its page', () => {
  // The gate of re-center lane 1, on the line the report quotes (Spectrum PP, page 1).
  const rows = all("SELECT kind, sourceid, page, text FROM source_facts WHERE text LIKE '%low processing (linear) shrinkage%' AND page = 1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'skipped');
  assert.equal(rows[0].sourceid, 'S-SPECTRUM-en-tds-spectrum-pp');
});

test('writing the SQLite file leaves dist/db.json as it was', () => {
  assert.equal(hashOf(join(root, 'dist/db.json')), dbJsonBefore);
});

test('the full-text index finds a document by its words, page by page', { skip: !existsSync(cacheDir('text')) && 'no text cache (.cache/text): the index is built only where the documents were read' }, () => {
  assert.ok(result.record.fulltext, 'the text cache is present but no index was built');
  const [{ pages }] = all('SELECT COUNT(*) AS pages FROM documents_fts');
  const [{ expected }] = all('SELECT SUM(text_pages) AS expected FROM documents');
  assert.equal(pages, expected, 'the index and documents.text_pages disagree');
  const hits = all("SELECT sha256, page FROM documents_fts WHERE documents_fts MATCH 'annealing'");
  assert.ok(hits.length > 0, 'no cached document mentions annealing');
  const [{ strays }] = all('SELECT COUNT(*) AS strays FROM documents_fts f LEFT JOIN documents d USING (sha256) WHERE d.text_pages IS NULL');
  assert.equal(strays, 0);
});

// One generation (F13; review finding A05). The file used to set the tables as they are beside whatever dist/db.json was
// on disk, and a query was answered from any file already written. Now the file is stamped with what it was written
// from, the compiled tables go in only from a dist/db.json of the same release, and a plain query is of the tables as
// they are or refused.
test('the file is stamped with the release it was written from, and its raw and compiled tables are of that one release', () => {
  const stamp = readStamp(out);
  const release = releaseIdentity(root);
  const built = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8')).meta.release;
  assert.equal(stamp['release.digest'], release.digest);
  assert.equal(stamp.compiled, 'current');
  assert.equal(stamp['compiled.release.digest'], built.digest, 'the compiled tables name the release dist/db.json was built from');
  assert.equal(stamp['compiled.sha256'], hashOf(join(root, 'dist/db.json')));
  assert.equal(stamp.generation, currentInputs(root).generation, 'a file just written is of the inputs as they are');
  const tables = all('SELECT table_name, tier, release_id FROM _tables');
  for (const tier of ['raw', 'derived', 'compiled', 'record']) assert.ok(tables.some((t) => t.tier === tier), `no ${tier} table is listed`);
  assert.deepEqual([...new Set(tables.map((t) => t.release_id))], [release.id], 'two generations in one file');
});

test('every compiled product value is its own measurement\'s value in the raw table beside it', () => {
  const [{ n }] = all('SELECT COUNT(*) AS n FROM products_compiled WHERE measurementid IS NOT NULL');
  assert.ok(n > 0);
  const apart = all(`SELECT p.gradeid, p.headline_key, p.value, m.normalized_value FROM products_compiled p
    LEFT JOIN measurements m ON m.measurementid = p.measurementid
    WHERE p.measurementid IS NOT NULL AND (m.measurementid IS NULL OR abs(p.value - m.normalized_value) > 1e-9) LIMIT 5`);
  assert.deepEqual(apart, [], 'a product value that is not its measurement\'s: the compiled and raw tables are of two generations');
});

// A copy of what the release is read from: the tables copied, to be edited, and every other input linked, so before
// any edit the copy makes this checkout's release and its dist/db.json is current for it.
const copies = [];
function projectCopy({ compiled }) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-sqlite-generation-'));
  copies.push(dir);
  cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
  for (const p of Object.values(RELEASE_INPUTS).flat().filter((p) => p !== 'data/tables')) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    symlinkSync(join(root, p), join(dir, p));
  }
  if (compiled) {
    mkdirSync(join(dir, 'dist'));
    symlinkSync(join(root, 'dist/db.json'), join(dir, 'dist/db.json'));
  }
  return dir;
}
test.after(() => { for (const dir of copies) rmSync(dir, { recursive: true, force: true }); });

function editMeasurement(dir, id, column, value) {
  const path = join(dir, 'data/tables/measurements.csv');
  const { header, records } = readCsv(path);
  const rows = records.map((r) => r.values);
  rows.find((r) => r.MeasurementID === id)[column] = value;
  writeCsv(path, header, rows);
}

const V = 'V002780'; // Spectrum PLA Matt's heat deflection, 116 °C, the value of its annealed state (S04)
const valueOf = `SELECT normalized_value AS value FROM measurements WHERE measurementid = '${V}'`;

test('after a measurement is edited, a plain query refuses while dist/db.json is of the old tables, and never answers from them', () => {
  const dir = projectCopy({ compiled: true });
  const file = join(dir, 'dist/h2c.sqlite');
  assert.equal(releaseIdentity(dir).digest, releaseIdentity(root).digest, 'the copy does not make this checkout\'s release');

  const before = askCurrent(dir, file, valueOf);
  assert.ok(before.written, 'the first question writes the file');
  assert.equal(before.rows[0].value, 116);
  assert.equal(queryFile(file, `SELECT value FROM products_compiled WHERE measurementid = '${V}'`).rows[0].value, 116);

  editMeasurement(dir, V, 'Normalized value', '117');
  assert.throws(() => askCurrent(dir, file, valueOf), (e) => e instanceof StaleCompiledError && /npm run build/.test(e.message));
  assert.throws(() => writeSqlite(dir, file), StaleCompiledError);
  // Nothing was written: the file is the one of the old tables, and says so to a reader who asks it as a snapshot.
  const stamp = readStamp(file);
  assert.equal(stamp.generation, before.stamp.generation);
  assert.notEqual(stamp['release.digest'], releaseIdentity(dir).digest);
  assert.equal(queryFile(file, valueOf).rows[0].value, 116);
});

test('without a compiled database the raw tables are still asked, the stamp says so, and an edit is answered at once', () => {
  const dir = projectCopy({ compiled: false });
  const file = join(dir, 'h2c.sqlite');
  const first = askCurrent(dir, file, valueOf);
  assert.equal(first.rows[0].value, 116);
  assert.equal(first.stamp.compiled, 'absent');
  assert.equal(queryFile(file, "SELECT COUNT(*) AS n FROM _tables WHERE tier = 'compiled'").rows[0].n, 0);
  assert.throws(() => queryFile(file, 'SELECT * FROM products_compiled'), /no dist\/db\.json.*npm run build/);
  assert.equal(askCurrent(dir, file, valueOf).written, null, 'a file of the inputs as they are is asked as it is');

  editMeasurement(dir, V, 'Normalized value', '117');
  const after = askCurrent(dir, file, valueOf);
  assert.ok(after.written, 'the edit is not seen until the file is written again');
  assert.equal(after.rows[0].value, 117);
  assert.equal(after.stamp['release.digest'], releaseIdentity(dir).digest);
});

test('the full-text index says how much of the retrieved corpus it holds, and names the sources it does not', () => {
  const stamp = readStamp(out);
  const retrieved = RETRIEVED.map((s) => `'${s}'`).join(', ');
  const [{ sources }] = all(`SELECT COUNT(*) AS sources FROM sources WHERE access_state IN (${retrieved})`);
  const [{ missing }] = all('SELECT COUNT(*) AS missing FROM v_sources_without_text');
  assert.equal(Number(stamp['fulltext.sources']), sources);
  assert.equal(Number(stamp['fulltext.sources_indexed']), sources - missing);
  assert.equal(stamp.fulltext, !result.record.fulltext ? 'unavailable' : missing ? 'partial' : 'complete');
  if (stamp.fulltext === 'unavailable') {
    assert.equal(Number(stamp['fulltext.sources_indexed']), 0);
    assert.throws(() => queryFile(out, "SELECT * FROM documents_fts WHERE documents_fts MATCH 'annealing'"), /no text cache/);
  }
  const [{ nodigest }] = all("SELECT COUNT(*) AS nodigest FROM v_sources_without_text WHERE reason LIKE 'no SHA-256%'");
  const [{ expected }] = all(`SELECT COUNT(*) AS expected FROM sources WHERE access_state IN (${retrieved}) AND (sha256 IS NULL OR length(sha256) != 64)`);
  assert.equal(nodigest, expected, 'a retrieved source with no digest is named as one, not as one whose text was not read');
});
