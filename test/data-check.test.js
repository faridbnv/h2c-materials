// The data gate: every kind of defect an editor or agent can introduce is caught before compile,
// with a message that names the file, line, record and field.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkData } from '../build/src/schema.js';
import { openTables, nextId } from '../scripts/data/table-io.mjs';
import { diffTables } from '../scripts/data/diff-lib.mjs';

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
    assert.ok(m.some((x) => /^data\/tables\/coverage\.csv:1190  C00002 CoverageID "C00002" repeats line 3; it must be unique$/.test(x)), m.join('\n'));
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
