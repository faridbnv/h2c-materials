// A save is one transaction over several files (A04, the review of 2026-09-27): interrupted anywhere, the next open
// finds the old world or the new one, whole; a second writer from the same base is refused rather than overwritten; a
// save with nothing to write writes nothing; and a guarded edit run twice changes nothing the second time. Each test
// works on a copy of schema/ and of a few of data/'s tables, in the operating system's temporary folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { buildManifest, checkData } from '../build/src/schema.js';
import { openTables, recoverSave, SAVE_JOURNAL, SAVE_STAGING } from '../scripts/data/table-io.mjs';
import { correct } from '../scripts/migrate/source-edits.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A world of a few real tables, their manifest, and the review ledgers beside them. */
function world(tables = ['coverage', 'method', 'polymers']) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-table-io-'));
  cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
  mkdirSync(join(dir, 'data/tables'), { recursive: true });
  for (const name of tables) cpSync(join(root, 'data/tables', `${name}.csv`), join(dir, 'data/tables', `${name}.csv`));
  cpSync(join(root, 'data/review'), join(dir, 'data/review'), { recursive: true });
  const parsed = Object.fromEntries(tables.map((n) => [n, readCsv(join(dir, 'data/tables', `${n}.csv`))]));
  writeFileSync(join(dir, 'data/manifest.json'), JSON.stringify(buildManifest(join(dir, 'data'), parsed), null, 2) + '\n');
  return dir;
}
const open = (dir) => openTables(dir, { allowMissing: true });
const FILES = ['data/manifest.json', 'data/review/removed-records.csv', 'data/review/accepted-findings.csv', 'data/tables/coverage.csv', 'data/tables/method.csv', 'data/tables/polymers.csv'];
const snapshot = (dir) => Object.fromEntries(FILES.map((f) => [f, readFileSync(join(dir, f), 'utf8')]));
const leftovers = (dir) => [SAVE_JOURNAL, SAVE_STAGING].filter((p) => existsSync(join(dir, p)));

test('a save interrupted at any rename leaves the new world whole after the next open, and before its journal the old one', () => {
  // One change that touches four files and the manifest: a table edited, a record removed with its ledger row, and a
  // file staged with them.
  const edit = (t, dir) => {
    const [first, second] = t.rows('coverage');
    t.set('coverage', first.CoverageID, 'Finding', `${first.Finding} (edited by the test)`);
    t.remove('coverage', second.CoverageID, { migration: 'mtest', where: 'nowhere: a test of the save' });
    const accepted = readFileSync(join(dir, 'data/review/accepted-findings.csv'), 'utf8');
    t.stageFile(join(dir, 'data/review/accepted-findings.csv'), `${accepted}TEST-CODE,coverage,C99999,,a row the test adds,2026-09-28\n`);
  };
  // The two worlds: before, and after a save nothing interrupted.
  const reference = world();
  const before = snapshot(reference);
  const t = open(reference);
  edit(t, reference);
  t.save();
  const after = snapshot(reference);
  assert.deepEqual(leftovers(reference), []);
  const touched = FILES.filter((f) => before[f] !== after[f]);
  assert.deepEqual(touched, ['data/manifest.json', 'data/review/removed-records.csv', 'data/review/accepted-findings.csv', 'data/tables/coverage.csv']);
  rmSync(reference, { recursive: true, force: true });

  // Stopped before the journal: nothing was committed, and the old world stands.
  const early = world();
  try {
    const u = open(early);
    edit(u, early);
    assert.throws(() => u.save({ failBeforeCommit: true }), /before its journal was written/);
    open(early);
    assert.deepEqual(snapshot(early), before);
    assert.ok(!existsSync(join(early, SAVE_JOURNAL)));
  } finally { rmSync(early, { recursive: true, force: true }); }

  // Stopped after the journal, at every rename in turn (0 to all five): the next open finishes it.
  for (let n = 0; n <= touched.length; n++) {
    const dir = world();
    try {
      const u = open(dir);
      edit(u, dir);
      assert.throws(() => u.save({ failAfter: n }), /interrupted after/);
      assert.ok(existsSync(join(dir, SAVE_JOURNAL)), `after ${n} rename(s) the journal is still there`);
      const mixed = snapshot(dir);
      if (n > 0 && n < touched.length) assert.notDeepEqual(mixed, after, `after ${n} rename(s) the world on disk is part new, part old`);
      open(dir);
      assert.deepEqual(snapshot(dir), after, `interrupted after ${n} rename(s)`);
      assert.deepEqual(leftovers(dir), [], `interrupted after ${n} rename(s)`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('the world a recovered save leaves passes the gate: its manifest is the one its tables have', () => {
  const dir = world();
  try {
    const t = open(dir);
    t.set('coverage', t.rows('coverage')[0].CoverageID, 'Finding', 'recovered by the next open');
    assert.throws(() => t.save({ failAfter: 1 }));
    const stale = () => checkData(join(dir, 'data'), join(dir, 'schema'), { formatting: false }).issues.filter((i) => i.code === 'SCHEMA-MANIFEST');
    // The table is renamed and the manifest is not: the mixture the gate would refuse, until the save is finished.
    assert.equal(stale().length, 1);
    assert.ok(recoverSave(dir), 'there was a save to finish');
    assert.equal(recoverSave(dir), null, 'and finishing it twice is nothing');
    assert.deepEqual(stale(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('two scripts open the same tables; the first saves, and the second is refused, writing nothing', () => {
  const dir = world();
  try {
    const first = open(dir), second = open(dir);
    const [a, b] = first.rows('coverage');
    first.set('coverage', a.CoverageID, 'Finding', 'the first writer\'s finding');
    first.save();
    const saved = snapshot(dir);
    second.set('coverage', b.CoverageID, 'Finding', 'the second writer\'s finding');
    assert.throws(() => second.save(), /data\/manifest\.json.* changed since these tables were opened: another writer saved in between\. Nothing was written/);
    assert.deepEqual(snapshot(dir), saved, 'the first writer\'s save stands');
    assert.deepEqual(leftovers(dir), []);
    // Opened again, the second writer's change applies to what is there now.
    const again = open(dir);
    again.set('coverage', b.CoverageID, 'Finding', 'the second writer\'s finding');
    again.save();
    const rows = new Map(open(dir).rows('coverage').map((r) => [r.CoverageID, r.Finding]));
    assert.equal(rows.get(a.CoverageID), 'the first writer\'s finding');
    assert.equal(rows.get(b.CoverageID), 'the second writer\'s finding');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a writer that finds another save stopped part-way finishes it, and is then refused as the second writer', () => {
  const dir = world();
  try {
    const first = open(dir), second = open(dir);
    const [a, b] = first.rows('coverage');
    first.set('coverage', a.CoverageID, 'Finding', 'the first writer\'s finding');
    assert.throws(() => first.save({ failAfter: 1 }));
    second.set('coverage', b.CoverageID, 'Finding', 'the second writer\'s finding');
    assert.throws(() => second.save(), /another writer saved in between/);
    const rows = new Map(open(dir).rows('coverage').map((r) => [r.CoverageID, r.Finding]));
    assert.equal(rows.get(a.CoverageID), 'the first writer\'s finding');
    assert.notEqual(rows.get(b.CoverageID), 'the second writer\'s finding');
    assert.deepEqual(leftovers(dir), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a table edited by hand, or a staged file that moved, after the tables were opened is not saved over', () => {
  const dir = world();
  try {
    const t = open(dir);
    t.set('coverage', t.rows('coverage')[0].CoverageID, 'Finding', 'a script\'s finding');
    const path = join(dir, 'data/tables/coverage.csv');
    writeFileSync(path, readFileSync(path, 'utf8').replace('Superseded', 'Superseded by hand'));
    assert.throws(() => t.save(), /data\/tables\/coverage\.csv changed since these tables were opened/);
    assert.match(readFileSync(path, 'utf8'), /Superseded by hand/);

    const u = open(dir);
    const accepted = join(dir, 'data/review/accepted-findings.csv');
    u.stageFile(accepted, `${readFileSync(accepted, 'utf8')}TEST-CODE,coverage,C99999,,staged,2026-09-28\n`);
    writeFileSync(accepted, `${readFileSync(accepted, 'utf8')}OTHER-CODE,coverage,C99998,,written meanwhile,2026-09-28\n`);
    assert.throws(() => u.save(), /accepted-findings\.csv changed since these tables were opened/);
    assert.match(readFileSync(accepted, 'utf8'), /written meanwhile/);
    assert.doesNotMatch(readFileSync(accepted, 'utf8'), /TEST-CODE/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a save with nothing to write writes nothing, not even the manifest', () => {
  const dir = world();
  try {
    // A manifest out of step with its tables is data:fmt's to refresh; a save that changed nothing leaves it alone.
    const manifest = join(dir, 'data/manifest.json');
    writeFileSync(manifest, readFileSync(manifest, 'utf8').replace(/"rows": \d+/, '"rows": 0'));
    const before = snapshot(dir);
    const times = FILES.map((f) => statSync(join(dir, f)).mtimeMs);
    const t = open(dir);
    const row = t.rows('coverage')[0];
    assert.equal(t.set('coverage', row.CoverageID, 'Finding', row.Finding), false);
    assert.deepEqual(t.save(), []);
    assert.deepEqual(snapshot(dir), before);
    assert.deepEqual(FILES.map((f) => statSync(join(dir, f)).mtimeMs), times);
    assert.deepEqual(leftovers(dir), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a guarded edit run a second time is a no-op: it changes no record and writes no file', () => {
  const dir = world(['measurements', 'coverage']);
  try {
    const target = readCsv(join(dir, 'data/tables/measurements.csv')).records.map((r) => r.values).find((m) => m['Specimen / print parameters'] === 'Not published');
    const run = () => {
      const t = open(dir);
      const n = correct(t, { source: target.SourceID, ids: [target.MeasurementID], migration: 'mtest', date: '2026-09-28',
        set: { 'Specimen / print parameters': ['Not published', 'Printed as the test says'] }, note: 'a correction the test makes twice' });
      return { n, changes: t.save() };
    };
    const first = run();
    assert.equal(first.n, 1);
    assert.ok(first.changes.length >= 2, 'the value and its note');
    const between = readFileSync(join(dir, 'data/tables/measurements.csv'));
    const time = statSync(join(dir, 'data/manifest.json')).mtimeMs;
    const second = run();
    assert.equal(second.n, 0);
    assert.deepEqual(second.changes, []);
    assert.ok(readFileSync(join(dir, 'data/tables/measurements.csv')).equals(between));
    assert.equal(statSync(join(dir, 'data/manifest.json')).mtimeMs, time);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
