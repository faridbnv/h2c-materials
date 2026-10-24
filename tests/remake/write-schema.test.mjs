// WP-17 (exit evidence: "a schemaEdit test changes the schema file and the data in one change set and round-trips"; DP-1, DP-6, DP-14).
// addVocab, addColumn and schemaEdit change a schema file and the data that follows from it in one change set, always Tier 1. The schema is
// edited inside a scratch sandbox (the workspace's own copy: the repository's schema/ is never written), the tables are rebuilt under the
// edited schema, and the change set is proved three ways: replay equality, a fresh rebuild from the export, and the byte-identical round trip.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportChangeSet } from '../../packages/data/src/export.ts';
import { readManifest, Workspace } from '../../packages/data/src/workspace.ts';
import { replayFile } from '../../packages/data/src/replay.ts';
import { roundtrip } from '../../packages/data/src/roundtrip.ts';
import { buildInMemory } from '../../packages/data/src/rebuild.ts';
import { BASE_MODEL, modelWith, readOverlay } from '../../packages/data/src/schema-model.ts';
import { exportTable, readRow, storageOf, textExpression } from '../../packages/data/src/storage.ts';
import { TABLE_NAMES } from '../../packages/data/src/generated/columns.ts';
import { ACTOR, HASH, QUOTE, SOURCE, cmd, dropTemplate, fingerprint, journalSize, recordBy, refusedWith, schemaExpect, scratch } from './write-helpers.mjs';
import { realData, root } from './data-helpers.mjs';

after(dropTemplate);

const evidence = { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'Table 1', quote: QUOTE };
const CHECKED_ON = { name: 'Checked on', type: 'string', role: 'editorial', description: 'The date a person last checked the rule against its sources.', missing: ['Not published'], constraints: { required: true } };

const addColumn = (ws, over = {}) => cmd(ws, 'addColumn', {
  target: { table: 'method' }, expect: schemaExpect(ws), column: { name: 'Checked on', field: CHECKED_ON, after: 'Topic', fill: 'Not published' }, ...over,
});
const addVocab = (ws, over = {}) => cmd(ws, 'addVocab', {
  target: { table: 'coverage' }, expect: schemaExpect(ws), vocab: { stem: 'coverage-status', value: 'Under review', extra: { Meaning: 'A finding someone is checking now.' } }, ...over,
});
const schemaEdit = (ws, patch, over = {}) => cmd(ws, 'schemaEdit', { target: { table: 'method' }, expect: schemaExpect(ws), schema: { patch }, ...over });
const rows = (ws, table) => Number(ws.db.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n);
/** One cell of the record whose first column holds `key`, read under the workspace's own (possibly edited) schema. */
function cellOf(ws, table, keyColumn, key, column) {
  const header = storageOf(table, ws.schema).header;
  const ord = ws.db.prepare(`SELECT _ord FROM "${table}" WHERE ${textExpression(table, keyColumn, ws.schema)} = ?`).get(key)._ord;
  return readRow(ws.db, table, ord, ws.schema)[header.indexOf(column)];
}

// ---------------------------------------------------------------- addVocab

test('addVocab: a word is added to a vocabulary, the workspace takes the new DDL, and the word can be used at once', async () => {
  const sb = await scratch();
  try {
    const was = sb.ws.stamp().schemaSha256;
    assert.equal(sb.ws.schema, BASE_MODEL);
    const result = sb.ws.apply(addVocab(sb.ws));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.notEqual(sb.ws.stamp().schemaSha256, was, 'the schema digest moved');
    assert.deepEqual(Object.keys(sb.ws.schema.overlay), ['schema/vocab/coverage-status.csv']);
    assert.match(sb.ws.schema.overlay['schema/vocab/coverage-status.csv'], /\nUnder review,A finding someone is checking now\.\n$/);
    const [draft] = sb.ws.drafts();
    assert.equal(draft.record.kind, 'addVocab');
    assert.equal(draft.record.tier, 1, 'a schema command is always Tier 1');
    assert.equal(draft.record.recordId, 'vocab:coverage-status');
    // before the word the column refused it; now the correction of a coverage finding to it passes the database
    const finding = recordBy(sb.ws, 'coverage', 'CoverageID', 'C00018');
    const use = cmd(sb.ws, 'correctValue', { target: { table: 'coverage', id: 'C00018' }, expect: { cells: { Status: finding.get('Status') } }, set: { Status: 'Under review' }, evidence });
    assert.equal(sb.ws.apply(use).status, 'applied');
    assert.equal(recordBy(sb.ws, 'coverage', 'CoverageID', 'C00018').get('Status'), 'Under review');
    // the same opId again, and the workspace reopened, still hold the edited schema
    assert.equal(sb.ws.apply(addVocab(sb.ws, { opId: draft.record.opId, expect: { schemaDigest: was } })).status, 'duplicate');
    const digest = sb.ws.schema.digest;
    sb.ws.close();
    const reopened = await sb.open();
    assert.equal(reopened.schema.digest, digest, 'the edited schema is part of the workspace file');
    assert.equal(reopened.rebased, null, 'a pending schema edit is not "Git moved"');
    reopened.close();
  } finally { sb.cleanup(); }
});

test('addVocab refusals: a vocabulary and a table that exist and use each other, a new word, canonical text, and the schema the writer saw', async () => {
  await refusedWith('unknown-target', (ws) => addVocab(ws, { vocab: { stem: 'no-such-words', value: 'x' } }));
  await refusedWith('unknown-target', (ws) => addVocab(ws, { target: { table: 'grades' } }));
  await refusedWith('unknown-target', (ws) => addVocab(ws, { vocab: { stem: 'coverage-status', value: 'Under review', extra: { Colour: 'red' } } }));
  await refusedWith('no-change', (ws) => addVocab(ws, { vocab: { stem: 'coverage-status', value: 'Gap' } }));
  await refusedWith('not-canonical', (ws) => addVocab(ws, { vocab: { stem: 'coverage-status', value: ' Under review ' } }));
  await refusedWith('expectation-empty', (ws) => addVocab(ws, { expect: { cells: {} } }));
  const stale = await refusedWith('stale', (ws) => addVocab(ws, { expect: { schemaDigest: 'a'.repeat(64) } }));
  assert.match(stale.detail, /schema moved/);
  // a word of the six missing-state words cannot become an ordinary value: the generator refuses it
  const leak = await refusedWith('schema-patch-invalid', (ws) => addVocab(ws, { target: { table: 'grades' }, vocab: { stem: 'grade-status', value: 'Not published' } }));
  assert.match(leak.detail, /missing-state word/);
});

// ---------------------------------------------------------------- addColumn

test('addColumn: a column is added after another, existing rows hold the declared missing-state word, and the typed pair is stored', async () => {
  const sb = await scratch();
  try {
    const count = rows(sb.ws, 'method');
    const result = sb.ws.apply(addColumn(sb.ws));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(rows(sb.ws, 'method'), count, 'no row appears or goes');
    const header = (await import('../../packages/data/src/storage.ts')).storageOf('method', sb.ws.schema).header;
    assert.deepEqual(header, ['Section', 'Topic', 'Checked on', 'Definition / rule'], 'the column is where "after" put it');
    const stored = sb.ws.db.prepare('SELECT checked_on, checked_on_state FROM method LIMIT 1').get();
    assert.deepEqual({ ...stored }, { checked_on: null, checked_on_state: 'Not published' }, 'a missing-state word is stored as a word, never as a value');
    assert.equal(exportTable(sb.ws.db, 'method', sb.ws.schema).split('\n')[0], 'Section,Topic,Checked on,Definition / rule');
    const [draft] = sb.ws.drafts();
    assert.equal(draft.record.kind, 'addColumn');
    assert.equal(draft.record.tier, 1);
    assert.deepEqual(draft.record.args.tables, ['method']);
    assert.deepEqual(draft.record.args.files, ['schema/tables/method.schema.json']);
    // the new column can be corrected like any other, and a stale schema digest is refused
    const topic = sb.ws.db.prepare('SELECT topic FROM method ORDER BY _ord LIMIT 1').get().topic;
    const fix = cmd(sb.ws, 'correctValue', { target: { table: 'method', id: topic }, expect: { cells: { 'Checked on': 'Not published' } }, set: { 'Checked on': '2026-10-21' }, evidence });
    assert.equal(sb.ws.apply(fix).status, 'applied');
    assert.equal(cellOf(sb.ws, 'method', 'Topic', topic, 'Checked on'), '2026-10-21');
  } finally { sb.cleanup(); }
});

test('addColumn refusals: the fill is a declared word, the name is new, the field is a field of that name, and the schema it gives is valid', async () => {
  const column = (over) => ({ name: 'Checked on', field: CHECKED_ON, after: 'Topic', fill: 'Not published', ...over });
  await refusedWith('schema-violation', (ws) => addColumn(ws, { column: column({ fill: '2026-01-01' }) }));
  await refusedWith('schema-violation', (ws) => addColumn(ws, { column: column({ fill: null }) }));
  await refusedWith('schema-patch-invalid', (ws) => addColumn(ws, { column: column({ name: 'Topic', field: { ...CHECKED_ON, name: 'Topic' } }) }));
  await refusedWith('schema-patch-invalid', (ws) => addColumn(ws, { column: column({ after: 'No such column' }) }));
  await refusedWith('schema-patch-invalid', (ws) => addColumn(ws, { column: column({ field: { ...CHECKED_ON, name: 'Other' } }) }));
  const bad = await refusedWith('schema-patch-invalid', (ws) => addColumn(ws, { column: column({ field: { ...CHECKED_ON, vocabulary: 'no-such-words' } }) }));
  assert.match(bad.detail, /vocabulary/);
  await refusedWith('expectation-empty', (ws) => addColumn(ws, { expect: {} }));
  await refusedWith('stale', (ws) => addColumn(ws, { expect: { schemaDigest: 'b'.repeat(64) } }));
  await refusedWith('unknown-target', (ws) => addColumn(ws, { target: { table: 'no_such_table' } }));
});

// ---------------------------------------------------------------- schemaEdit

test('schemaEdit: a JSON patch to a table\'s schema file; a patch that changes no column leaves the data alone, a reorder moves the cells with their names', async () => {
  const sb = await scratch();
  try {
    const before = fingerprint(sb.ws);
    const text = (op) => ({ op: 'replace', path: '/description', value: op });
    assert.equal(sb.ws.apply(schemaEdit(sb.ws, [text('Method rules in words (edited in the sandbox).')])).status, 'applied');
    assert.equal(fingerprint(sb.ws), before, 'a description edit changes no cell');
    assert.match(sb.ws.schema.overlay['schema/tables/method.schema.json'], /edited in the sandbox/);
    // move "Definition / rule" to the front: the header and every row follow
    assert.equal(sb.ws.apply(schemaEdit(sb.ws, [{ op: 'move', from: '/fields/2', path: '/fields/0' }])).status, 'applied');
    const csv = exportTable(sb.ws.db, 'method', sb.ws.schema);
    assert.equal(csv.split('\n')[0], 'Definition / rule,Section,Topic');
    assert.equal(sb.ws.drafts().length, 2);
    assert.ok(sb.ws.drafts().every((d) => d.record.tier === 1));
  } finally { sb.cleanup(); }
});

test('schemaEdit: a column the patch adds gets a declared fill, a rename keeps its data, a column removed needs a ruling that exists', async () => {
  const sb = await scratch();
  try {
    const topics = sb.ws.db.prepare('SELECT topic FROM method ORDER BY _ord').all().map((r) => r.topic);
    const add = schemaEdit(sb.ws, [{ op: 'add', path: '/fields/-', value: CHECKED_ON }], { schema: { patch: [{ op: 'add', path: '/fields/-', value: CHECKED_ON }], fill: { 'Checked on': 'Not published' } } });
    assert.equal(sb.ws.apply(add).status, 'applied');
    const rename = schemaEdit(sb.ws, [{ op: 'replace', path: '/fields/3/name', value: 'Last checked' }], { schema: { patch: [{ op: 'replace', path: '/fields/3/name', value: 'Last checked' }], renames: { 'Checked on': 'Last checked' } } });
    assert.equal(sb.ws.apply(rename).status, 'applied');
    assert.equal(cellOf(sb.ws, 'method', 'Topic', topics[0], 'Last checked'), 'Not published', 'the data went across the new name');
    const edited = sb.ws.db.prepare('SELECT last_checked_state AS s FROM method LIMIT 1').get();
    assert.equal(edited.s, 'Not published', 'the data went across the new name');
    // dropping it needs a ruling
    const drop = (over) => schemaEdit(sb.ws, [{ op: 'remove', path: '/fields/3' }], over);
    assert.equal(sb.ws.apply(drop()).code, 'ruling-missing');
    assert.equal(sb.ws.apply(drop({ rulings: ['R-NO-SUCH'] })).code, 'ruling-missing');
    assert.equal(sb.ws.apply(drop({ rulings: ['R-OQ09a'] })).status, 'applied');
    assert.equal(exportTable(sb.ws.db, 'method', sb.ws.schema).split('\n')[0], 'Section,Topic,Definition / rule');
    assert.equal(rows(sb.ws, 'method'), topics.length);
  } finally { sb.cleanup(); }
});

test('schemaEdit refusals: the patch applies, adds nothing without a fill, changes something, and the data and the views still fit the schema it gives', async () => {
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/no/such/path', value: 1 }]));
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, [{ op: 'test', path: '/title', value: 'Not the title' }]));
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, [{ op: 'replace', path: 'no-slash', value: 1 }]));
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, []));
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, [{ op: 'add', path: '/fields/-', value: { ...CHECKED_ON, name: 'Topic' } }]));
  await refusedWith('schema-patch-invalid', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/description', value: 'x' }], { schema: { patch: [{ op: 'replace', path: '/description', value: 'x' }], fill: { 'Nothing added': 'Not published' } } }));
  await refusedWith('schema-violation', (ws) => schemaEdit(ws, [{ op: 'add', path: '/fields/-', value: CHECKED_ON }]));
  await refusedWith('no-change', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/title', value: 'Method' }]));
  await refusedWith('expectation-empty', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/title', value: 'Method rules' }], { expect: { cells: { Topic: null } } }));
  await refusedWith('stale', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/title', value: 'Method rules' }], { expect: { schemaDigest: 'c'.repeat(64) } }));
  // the data must fit: a text column made an integer column
  const data = await refusedWith('schema-violation', (ws) => schemaEdit(ws, [{ op: 'replace', path: '/fields/2/type', value: 'integer' }]));
  assert.match(data.detail, /does not fit the schema/);
  // a view of db/views reads grades.Status: it cannot be dropped from under it
  const view = await refusedWith('schema-violation', (ws) => schemaEdit(ws, [{ op: 'remove', path: '/fields/3' }], { target: { table: 'grades' }, rulings: ['R-OQ09a'] }));
  assert.match(view.detail, /view|reference|schema/i);
});

// ---------------------------------------------------------------- the round trip: rebuild, export, replay

/** A fresh data directory holding an export laid over the approved snapshot: what a merged change set would leave in the repository. */
function mergedTree(exportDir) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-merged-'));
  const data = join(dir, 'data');
  cpSync(join(realData, 'tables'), join(data, 'tables'), { recursive: true });
  cpSync(join(realData, 'manifest.json'), join(data, 'manifest.json'));
  cpSync(join(exportDir, 'data', 'tables'), join(data, 'tables'), { recursive: true });
  cpSync(join(exportDir, 'data', 'manifest.json'), join(data, 'manifest.json'));
  return { dir, data, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('schemaEdit round trip: schema file and data in one change set; export, replay equality, a fresh rebuild and the byte-identical round trip all agree', async () => {
  const sb = await scratch({ store: null });
  let merged = null;
  try {
    assert.equal(sb.ws.apply(addVocab(sb.ws, { actor: ACTOR })).status, 'applied');
    assert.equal(sb.ws.apply(addColumn(sb.ws)).status, 'applied');
    assert.equal(sb.ws.apply(schemaEdit(sb.ws, [{ op: 'replace', path: '/description', value: 'Method rules in words (the sandbox edit).' }])).status, 'applied');
    const topic = sb.ws.db.prepare('SELECT topic FROM method ORDER BY _ord LIMIT 1').get().topic;
    // a data change that uses the edited schema, in the same change set
    assert.equal(sb.ws.apply(cmd(sb.ws, 'correctValue', { target: { table: 'method', id: topic }, expect: { cells: { 'Checked on': 'Not published' } }, set: { 'Checked on': '2026-10-21' }, evidence })).status, 'applied');
    assert.equal(sb.ws.apply(cmd(sb.ws, 'correctValue', { target: { table: 'coverage', id: 'C00018' }, expect: { cells: { Status: recordBy(sb.ws, 'coverage', 'CoverageID', 'C00018').get('Status') } }, set: { Status: 'Under review' }, evidence })).status, 'applied');

    const exported = await exportChangeSet(sb.ws, { title: 'Add a checked-on date to the method rules', topic: 'method-checked-on' });
    const { changeSet } = exported;
    assert.equal(changeSet.records.length, 5);
    assert.deepEqual(changeSet.schema, { base: BASE_MODEL.digest, result: sb.ws.schema.digest });
    assert.deepEqual(exported.tables, ['coverage', 'method'], 'the CSV of the tables that changed, and not of the vocabulary');
    const out = join(sb.dir, 'export');
    for (const path of ['schema/tables/method.schema.json', 'schema/vocab/coverage-status.csv', 'db/generated/storage.sql', 'packages/data/src/generated/columns.ts', 'data/tables/method.csv', 'data/tables/coverage.csv', 'data/manifest.json']) {
      assert.ok(existsSync(join(out, path)), `${path} is in the export`);
    }
    assert.match(readFileSync(join(out, 'packages/data/src/generated/columns.ts'), 'utf8'), /method: \["Section", "Topic", "Checked on", "Definition \/ rule"\]/, 'the generated column list follows the edited schema');
    assert.match(readFileSync(join(root, 'schema/vocab/coverage-status.csv'), 'utf8'), /^Value,Meaning/, 'the repository\'s own schema is untouched');
    assert.doesNotMatch(readFileSync(join(root, 'schema/vocab/coverage-status.csv'), 'utf8'), /Under review/);

    // 1. replay equality: the change set applied to its base gives its result, and the exported files are the ones it makes
    const replay = replayFile(exported.changeSetPath, { store: null, tablesDir: join(out, 'data', 'tables') });
    assert.deepEqual(replay.problems, []);
    assert.equal(replay.ok, true);
    assert.deepEqual(replay.tables.filter((t) => t.table.startsWith('schema/')).map((t) => [t.table, t.status]).sort(), [['schema/tables/method.schema.json', 'identical'], ['schema/vocab/coverage-status.csv', 'identical']]);

    // 2. a fresh rebuild from the merged tree, under the schema files the export brought, has the workspace's tables exactly
    merged = mergedTree(out);
    const model = modelWith(readOverlay(out));
    assert.equal(model.digest, sb.ws.schema.digest);
    const rebuilt = buildInMemory(merged.data, model);
    try {
      let different = 0;
      for (const table of TABLE_NAMES) if (exportTable(rebuilt.db, table, model) !== exportTable(sb.ws.db, table, sb.ws.schema)) different++;
      assert.equal(different, 0, '0 differences between the workspace and a clean rebuild of the export');
    } finally { rebuilt.db.close(); }

    // 3. the round trip over the merged tree is byte-identical for all 36 tables, under the edited schema (and refused under the old one)
    const trip = roundtrip({ dataDir: merged.data, model });
    assert.equal(trip.ok, true, JSON.stringify(trip.problems));
    assert.equal(trip.identical, 36);
    assert.equal(roundtrip({ dataDir: merged.data }).ok, false, 'the old schema does not read the new tables: the schema file and the data travel together');

    // a schema file that is not the one the change set makes fails the replay comparison
    const altered = join(out, 'schema/tables/method.schema.json');
    writeFileSync(altered, readFileSync(altered, 'utf8').replace('sandbox edit', 'hand edit'));
    const bad = replayFile(exported.changeSetPath, { store: null, tablesDir: join(out, 'data', 'tables') });
    assert.equal(bad.ok, false);
    assert.ok(bad.tables.some((t) => t.table === 'schema/tables/method.schema.json' && t.status === 'differs'));

    // the manifest the export wrote lists every table, and the unchanged ones are the repository's own
    const manifest = readManifest(join(out, 'data'));
    assert.equal(Object.keys(manifest.tables).length, 36);
    assert.equal(manifest.tables.grades.sha256, readManifest(realData).tables.grades.sha256);
  } finally { merged?.cleanup(); sb.cleanup(); }
});

test('a workspace with a pending schema edit survives a rebuild that replays the journal: the edited schema comes back with the drafts', async () => {
  const sb = await scratch({ store: null });
  try {
    assert.equal(sb.ws.apply(addColumn(sb.ws)).status, 'applied');
    const state = fingerprint(sb.ws);
    const digest = sb.ws.schema.digest;
    sb.ws.close();
    const report = await Workspace.rebuild(sb.options);
    assert.equal(report.conflicts.length, 0);
    assert.equal(report.applied, 1);
    const reopened = await sb.open();
    try {
      assert.equal(reopened.schema.digest, digest, 'the schema edit was replayed with the journal');
      assert.equal(fingerprint(reopened), state);
      assert.equal(journalSize(reopened), 1);
    } finally { reopened.close(); }
  } finally { sb.cleanup(); }
});

test('a session that did not apply a schema edit reads it before it writes: two sessions on one workspace file never disagree about the columns', async () => {
  const sb = await scratch({ store: null });
  try {
    const second = await sb.open();
    try {
      assert.equal(sb.ws.apply(addColumn(sb.ws)).status, 'applied');
      assert.notEqual(second.schema.digest, sb.ws.schema.digest, 'the second session still holds the schema it opened');
      // its next write, under the lock, finds the schema moved and takes the new one: a stale command is refused as stale, not as a SQL error
      const stale = second.apply(addColumn(second, { column: { name: 'Another', field: { ...CHECKED_ON, name: 'Another' }, fill: 'Not published' }, expect: { schemaDigest: BASE_MODEL.digest } }));
      assert.equal(stale.code, 'stale');
      assert.equal(second.schema.digest, sb.ws.schema.digest);
      const topic = second.db.prepare('SELECT topic FROM method ORDER BY _ord LIMIT 1').get().topic;
      assert.equal(second.apply(cmd(second, 'correctValue', { target: { table: 'method', id: topic }, expect: { cells: { 'Checked on': 'Not published' } }, set: { 'Checked on': '2026-10-21' }, evidence })).status, 'applied');
    } finally { second.close(); }
  } finally { sb.cleanup(); }
});

test('an edit that is undone leaves the repository\'s own schema, not a model that only looks edited; an overlay file equal to the repository\'s is no edit', async () => {
  const base = readFileSync(join(root, 'schema/vocab/coverage-status.csv'), 'utf8');
  assert.equal(modelWith({ 'schema/vocab/coverage-status.csv': base }), BASE_MODEL);
  assert.equal(modelWith({}), BASE_MODEL);
});

test('an export marks its directory and retires only what an earlier export wrote there, naming what it removed; a directory that holds data and no mark is refused', async () => {
  const sb = await scratch({ store: null });
  try {
    assert.equal(sb.ws.apply(addVocab(sb.ws)).status, 'applied');
    // a directory that holds somebody else's schema file and data: the export refuses it and leaves every file where it was
    const foreign = join(sb.dir, 'foreign');
    mkdirSync(join(foreign, 'schema', 'tables'), { recursive: true });
    writeFileSync(join(foreign, 'schema', 'tables', 'foreign.schema.json'), '{}\n');
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'A word for coverage', topic: 'coverage-word', exportDir: foreign }), (e) => e.code === 'unsafe-target');
    assert.ok(existsSync(join(foreign, 'schema', 'tables', 'foreign.schema.json')));
    assert.ok(!existsSync(join(foreign, '.atlas-export')), 'a refused directory is not marked');
    // an empty directory is fine: the export marks it as its own
    const out = join(sb.dir, 'elsewhere');
    const first = await exportChangeSet(sb.ws, { title: 'A word for coverage', topic: 'coverage-word', exportDir: out });
    assert.deepEqual(first.retired, []);
    assert.ok(existsSync(join(out, '.atlas-export')));
    // once the directory is the export's own, a file an earlier export left that this one does not write is removed, and reported
    mkdirSync(join(out, 'schema', 'tables'), { recursive: true });
    writeFileSync(join(out, 'schema', 'tables', 'left-over.schema.json'), '{}\n');
    const second = await exportChangeSet(sb.ws, { title: 'A word for coverage', topic: 'coverage-word', exportDir: out });
    assert.ok(second.retired.includes('schema/tables/left-over.schema.json'), JSON.stringify(second.retired));
    assert.ok(!existsSync(join(out, 'schema', 'tables', 'left-over.schema.json')));
  } finally { sb.cleanup(); }
});
