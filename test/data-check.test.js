// The data gate: every kind of defect an editor or agent can introduce is caught before compile,
// with a message that names the file, line, record and field.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkData } from '../build/src/schema.js';
import { openTables, nextId } from '../scripts/data/table-io.mjs';
import { diffTables, allowedRemovals } from '../scripts/data/diff-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function copy() {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-data-'));
  cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
  cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
  return dir;
}
const check = (dir) => checkData(join(dir, 'data'), join(dir, 'schema')).issues;
const messages = (issues) => issues.map((i) => `${i.where}  ${i.message}`);

function seeded(edit) {
  const dir = copy();
  try {
    const t = openTables(dir);
    edit(t, dir);
    t.save();
    return messages(check(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the current data tables pass the schema gate', () => {
  assert.deepEqual(messages(checkData(join(root, 'data'), join(root, 'schema')).issues), []);
});

test('a broken reference names the file, line, record and field', () => {
  const m = seeded((t) => t.set('measurements', 'V000384', 'GradeID', 'G020-99'));
  assert.equal(m.length, 1);
  assert.match(m[0], /^data\/tables\/measurements\.csv:\d+  V000384 GradeID "G020-99" is not a GradeID in grades\.csv$/);
});

test('a broken item inside a list is caught', () => {
  const m = seeded((t) => t.set('profiles', 'P0001', 'H2C SourceID', 'H2C-WIKI; NO-SUCH-SOURCE'));
  assert.deepEqual(m.map((x) => x.replace(/:\d+/, ':N')), ['data/tables/profiles.csv:N  P0001 H2C SourceID item "NO-SUCH-SOURCE" is not a SourceID in sources.csv']);
});

test('a repeated primary key is caught', () => {
  const dir = copy();
  try {
    const path = join(dir, 'data/tables/coverage.csv');
    const text = readFileSync(path, 'utf8');
    writeFileSync(path, text + text.split('\n')[2] + '\n');
    const m = messages(check(dir));
    const line = text.split('\n').length;
    assert.ok(m.some((x) => x === `data/tables/coverage.csv:${line}  C00002 CoverageID "C00002" repeats line 3; it must be unique`), m.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a value outside its vocabulary is caught', () => {
  const m = seeded((t) => t.set('measurements', 'V000384', 'Direction', 'Sideways'));
  assert.match(m.join('\n'), /V000384 Direction "Sideways" is not in schema\/vocab\/directions\.csv/);
});

test('a malformed number is caught, and a missing state is only accepted where declared', () => {
  const comma = seeded((t) => t.set('measurements', 'V000384', 'Normalized value', '1,40'));
  assert.match(comma.join('\n'), /V000384 Normalized value "1,40" is not a number or one of: Not published, Insufficient comparable data/);
  const state = seeded((t) => t.set('measurements', 'V000384', 'Conversion factor', 'Not published'));
  assert.match(state.join('\n'), /V000384 Conversion factor "Not published" is not a number$/m);
});

test('a blank required cell is caught', () => {
  const m = seeded((t) => t.set('grades', 'G020-01', 'Manufacturer', ''));
  assert.match(m.join('\n'), /G020-01 Manufacturer is empty; write the value or an explicit missing state/);
});

test('an undeclared column fails until the schema declares it', () => {
  const dir = copy();
  try {
    const path = join(dir, 'data/tables/coverage.csv');
    const lines = readFileSync(path, 'utf8').split('\n');
    writeFileSync(path, lines.map((l, i) => (l ? `${l},${i === 0 ? 'Reviewer' : ''}` : l)).join('\n'));
    const m = messages(check(dir));
    assert.ok(m.some((x) => x === 'data/tables/coverage.csv:1  column "Reviewer" is not declared in schema/tables/coverage.schema.json'), m.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a file saved in a non-canonical format, and a stale manifest, are caught', () => {
  const dir = copy();
  try {
    const path = join(dir, 'data/tables/method.csv');
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('\n', '\r\n'));
    const m = messages(check(dir));
    assert.ok(m.includes('data/tables/method.csv  is not in canonical CSV format; run `npm run data:fmt`'), m.join('\n'));
    assert.ok(m.some((x) => x.startsWith('data/manifest.json  is stale for method')), m.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scripted edits refuse to overwrite data that moved, and never duplicate a key', () => {
  const dir = copy();
  try {
    const t = openTables(dir);
    assert.throws(() => t.set('measurements', 'V000384', 'Normalized value', '2', { expect: '9.99' }), /expected "9\.99", found "1\.4"; the data moved/);
    assert.throws(() => t.append('coverage', { CoverageID: 'C00002' }), /CoverageID C00002 already exists/);
    assert.throws(() => t.append('coverage', { CoverageID: 'C99999', Reviewer: 'x' }), /unknown columns Reviewer/);
    assert.equal(t.changes().length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('new IDs continue each sequence and are never reused', () => {
  assert.equal(nextId('measurements', ['V000001', 'V002049']), 'V002050');
  assert.equal(nextId('prices', ['CA0104']), 'CA0105');
  assert.equal(nextId('grades', ['G020-01', 'G020-03', 'G021-05'], { materialId: 'M020' }), 'G020-04');
  assert.equal(nextId('grades', ['G055-01', 'G055-R1'], { materialId: 'M055', study: true }), 'G055-R2');
  assert.equal(nextId('grades', [], { materialId: 'M103' }), 'G103-01');
  // A generic material collects one grade per manufacturer, so the sequence runs past 99 into three digits.
  assert.equal(nextId('grades', ['G020-98', 'G020-99'], { materialId: 'M020' }), 'G020-100');
  assert.equal(nextId('grades', ['G020-100'], { materialId: 'M020' }), 'G020-101');
  assert.throws(() => nextId('grades', []), /pass the MaterialID/);
});

test('the changelog matches records by key: edits, additions and deletions', () => {
  const schemas = { coverage: { primaryKey: 'CoverageID' } };
  const from = 'CoverageID,Status\nC1,Gap\nC2,Gap\nC3,Resolved\n';
  const to = 'CoverageID,Status\nC3,Resolved\nC1,Evidence recorded\nC4,Gap\n';
  assert.deepEqual(diffTables(schemas, (side) => (side === 'from' ? from : to)), [
    { table: 'coverage', record: 'C1', action: 'Edited', field: 'Status', before: 'Gap', after: 'Evidence recorded' },
    { table: 'coverage', record: 'C4', action: 'Added', field: null, before: null, after: null },
    { table: 'coverage', record: 'C2', action: 'Removed', field: null, before: null, after: null },
  ]);
});

test('a record leaves a table only where the ledger says which migration moved it and where', () => {
  // Records are retired, never deleted (D45). The one exception is a record the build now derives instead, and it is
  // an exception only with a row in data/review/removed-records.csv naming the migration (D72).
  const log = [
    { table: 'coverage', record: 'C1', action: 'Removed', field: null },
    { table: 'coverage', record: 'C2', action: 'Removed', field: null },
    { table: 'coverage', record: '(column)', action: 'Removed', field: 'Manufacturer count' },
    { table: 'coverage', record: 'C3', action: 'Edited', field: 'Status' },
  ];
  const ledger = [{ Table: 'coverage', Record: 'C1', Migration: 'm48', Where: 'derived by the build' }];
  const one = allowedRemovals(log, ledger);
  assert.equal(one.removed.length, 2, 'a dropped column is not a deleted record');
  assert.deepEqual(one.unledgered.map((c) => c.record), ['C2'], 'C2 has no ledger row and must still fail');
  // A ledger row for another table does not cover this one.
  assert.deepEqual(allowedRemovals(log, [{ Table: 'evidence', Record: 'C1' }]).unledgered.map((c) => c.record), ['C1', 'C2']);
  // With no ledger at all, every removal fails, which is what the rule was before D72.
  assert.equal(allowedRemovals(log, []).unledgered.length, 2);
  assert.equal(allowedRemovals(log, undefined).unledgered.length, 2);
  // A ledger row that covered nothing here is history, not a defect: it authorised a removal in an earlier commit.
  assert.deepEqual(allowedRemovals(log, ledger).unused, []);
  assert.equal(allowedRemovals([], ledger).unused.length, 1);
});

test('replacing a headline\'s value measurement is an edit, not a deletion; dropping a selection is a deletion', () => {
  const schemas = { headlines: { primaryKey: null, identity: ['MaterialID', 'HeadlineKey', 'Use'], uniqueKeys: [['MaterialID', 'HeadlineKey', 'MeasurementID']] } };
  const from = 'MaterialID,HeadlineKey,MeasurementID,Use\nM1,hdt045,V1,value\nM1,hdt045,V2,context\nM1,hdt045,V3,context\n';
  const replaced = 'MaterialID,HeadlineKey,MeasurementID,Use\nM1,hdt045,V9,value\nM1,hdt045,V2,context\nM1,hdt045,V3,context\n';
  assert.deepEqual(diffTables(schemas, (side) => (side === 'from' ? from : replaced)), [
    { table: 'headlines', record: 'M1 | hdt045 | value', action: 'Edited', field: 'MeasurementID', before: 'V1', after: 'V9' },
  ]);
  // One citation of a headline replaced by another, in a different role, is an edit too.
  const withReplace = { headlines: { ...schemas.headlines, replacedWithin: ['MaterialID', 'HeadlineKey'] } };
  const repointed = 'MaterialID,HeadlineKey,MeasurementID,Use\nM1,hdt045,V8,context\nM1,hdt045,V2,context\nM1,hdt045,V3,context\n';
  assert.deepEqual(diffTables(withReplace, (side) => (side === 'from' ? from : repointed)).map((c) => `${c.action} ${c.field}`), ['Edited MeasurementID', 'Edited Use']);
  const dropped = 'MaterialID,HeadlineKey,MeasurementID,Use\nM1,hdt045,V1,value\nM1,hdt045,V2,context\n';
  assert.deepEqual(diffTables(schemas, (side) => (side === 'from' ? from : dropped)).map((c) => c.action), ['Removed']);
});

test('an identifier mentioned in prose must exist', () => {
  const m = seeded((t) => t.set('sources', 'H2C-WIKI', 'Applicable grades', 'Family guidance; see G020-01 and G999-01'));
  assert.deepEqual(m.map((x) => x.replace(/:\d+/, ':N')), ['data/tables/sources.csv:N  H2C-WIKI Applicable grades mentions "G999-01", which is not a GradeID in grades.csv']);
});

test('mappings are checked at the gate: an unmapped topic, a family member or a chamber band that points at nothing', () => {
  const m = seeded((t) => {
    t.set('evidence', 'Q00001', 'Topic', 'Resistance to Kryptonite');
    t.append('family_members', { FamilyMaterialID: t.rows('family_entries')[0].MaterialID, MemberMaterialID: 'M999' });
  });
  assert.ok(m.some((x) => /evidence\.csv:\d+  Q00001 Topic "Resistance to Kryptonite" is not in schema\/vocab\/environment-topics\.csv/.test(x)), m.join('\n'));
  assert.ok(m.some((x) => /family_members\.csv:\d+  MemberMaterialID "M999" is not a MaterialID in materials\.csv/.test(x)), m.join('\n'));
});

test('a new record gets the next ID, its template\'s columns and declared missing states, and passes the gate', async () => {
  const { newRecord } = await import('../scripts/data/records.mjs');
  const dir = copy();
  try {
    const t = openTables(dir);
    const { row, unset } = newRecord(t, 'measurements', { like: 'V000384', set: { 'Raw value': '2.1 GPa' } });
    assert.deepEqual(unset, []);
    assert.equal(row.MeasurementID, nextId('measurements', t.rows('measurements').map((r) => r.MeasurementID)));
    assert.equal(row.GradeID, 'G020-01');
    t.append('measurements', row);
    t.save();
    assert.deepEqual(messages(check(dir)), []);
    // Without a template, required columns with no missing state are reported, not guessed.
    const bare = newRecord(t, 'grades', { material: 'M020' });
    assert.equal(bare.row.GradeID, 'G020-04');
    assert.ok(bare.unset.includes('Manufacturer') && bare.unset.includes('Product name'), bare.unset.join(', '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('retiring a grade sets both fields and lists every record left to resolve', async () => {
  const { retireGrade, RETIRED_AVAILABILITY } = await import('../scripts/data/records.mjs');
  const dir = copy();
  try {
    const t = openTables(dir);
    const todo = retireGrade(t, 'G020-03');
    assert.equal(t.get('grades', 'G020-03').Status, 'retired');
    assert.equal(t.get('grades', 'G020-03').Availability, RETIRED_AVAILABILITY);
    const tables = new Set(todo.map((x) => x.table));
    assert.ok(tables.has('measurements') && tables.has('profiles') && tables.has('sources'), [...tables].join(', '));
    assert.ok(todo.every((x) => x.action.length > 10));
    assert.deepEqual(retireGrade(t, 'G020-03').length, todo.length, 'a second run changes nothing and lists the same');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A material is a row in materials.csv and records in six other tables (AGENTS.md). The scaffold writes what needs no
// judgement, refuses to invent the prose a reader is told, and lists the rest.
test('the material scaffold writes a material and its grade, and names what it cannot write', () => {
  const dir = copy();
  try {
    const run = (extra) => spawnSync(process.execPath, [join(root, 'scripts/data/new-material.mjs'), '--root', dir, '--name', 'PA11', '--polymer', 'PA11',
      '--family', 'Nylon / Polyamide', '--manufacturer', 'Arkema', '--product', 'Rilsan PA11', '--source', 'H2C-MANUAL', ...extra], { encoding: 'utf8' });
    const refused = run([]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /--set "Modifier \/ filler=\.\.\."/);
    assert.match(refused.stdout, /"PA11" has no row in polymers.csv/);
    const prose = ['Best uses', 'Identity notes', 'Shared formulation key', 'Composition / filler', 'Colour caveat', 'Availability',
      'Certification claims', 'Selected-grade rationale', 'Source locator', 'Diameter compatibility'].flatMap((c) => ['--set', `${c}=recorded by the test`]);
    // The columns a vocabulary or a reference governs take a real value, as any row does.
    prose.push('--set', 'Modifier / filler=Unfilled / unspecified', '--set', 'Role=Structural / functional / appearance');
    const written = run(prose);
    assert.equal(written.status, 0, written.stderr);
    const t = openTables(dir);
    const material = t.rows('materials').at(-1);
    assert.equal(material['Original name'], 'PA11');
    assert.equal(material['Estimate identity'], 'Not applicable');
    assert.equal(t.rows('grades').at(-1).GradeID, material['Representative grade']);
    assert.deepEqual(check(dir), []);
    assert.match(written.stdout, /Still needed before it is a candidate/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

