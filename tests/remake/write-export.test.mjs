// WP-10 slice (d) (proofs DP-5, DP-11, DP-13): export to the sandbox export directory with stage, journal and promote, replay
// equality, immutability, and the command line that drives them. An export that is interrupted leaves the target exactly as it
// was (or, once its journal is written, is finished by the next call); a stale or tampered change set is told apart from a good one.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { csvText, parseCsv } from '../../packages/data/src/csv.ts';
import { ExportRefusedError, exportChangeSet, exportPending } from '../../packages/data/src/export.ts';
import { parseChangeSet } from '../../packages/data/src/parse.ts';
import { checkImmutable, replayFile } from '../../packages/data/src/replay.ts';
import { roundtrip } from '../../packages/data/src/roundtrip.ts';
import { columnIndex, copyData, editRecords, editText, realData } from './data-helpers.mjs';
import { command, dropTemplate, measurement, root, scratch } from './write-helpers.mjs';

after(dropTemplate);

const cli = (...args) => spawnSync(process.execPath, [join(root, 'packages/data/src/cli.ts'), ...args], { encoding: 'utf8' });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** Every file under a directory with its digest: what "the target is unchanged" compares. */
function tree(dir) {
  const out = {};
  const walk = (d) => { for (const name of readdirSync(d).sort()) { const p = join(d, name); if (statSync(p).isDirectory()) walk(p); else out[relative(dir, p)] = sha(readFileSync(p)); } };
  if (existsSync(dir)) walk(dir);
  return out;
}
const notesCommand = (ws, text = 'Reviewed on 2026-10-21.') => {
  const cur = measurement(ws).get('Notes');
  return command(ws, { set: { Notes: `${cur} ${text}` }, expect: { cells: { Notes: cur } } });
};

// ---------------------------------------------------------------- the export

test('export writes a change set with typed provenance and the canonical CSV of the changed table only, to the sandbox export directory', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws);
    sb.ws.apply(cmd);
    const result = await exportChangeSet(sb.ws, { title: 'Correct the PLA density from the 2025 data sheet', topic: 'pla-density' });
    assert.match(result.changeSet.id, /^\d{4}-\d{2}-\d{2}-pla-density-[0-9a-f]{4}$/);
    assert.equal(result.exportDir, join(sb.dir, 'export'));
    assert.deepEqual(result.tables, ['measurements']);
    assert.deepEqual(Object.keys(tree(join(sb.dir, 'export'))).sort(), [
      'data/manifest.json', 'data/review/change-sets/' + `${result.changeSet.id}.json`, 'data/tables/measurements.csv',
    ].sort(), 'only the changed table, the manifest and the change set; no staging, no journal');

    const file = JSON.parse(readFileSync(result.changeSetPath, 'utf8'));
    const parsed = parseChangeSet(file);
    assert.ok(parsed.ok, parsed.problems?.join('; '));
    const [record] = file.records;
    assert.equal(record.seq, 1);
    assert.equal(record.kind, 'correctValue');
    assert.deepEqual(record.actor, cmd.actor, 'typed provenance: who acted, with the model');
    assert.deepEqual(record.reviewedBy, []);
    assert.deepEqual(record.evidence, cmd.evidence);
    assert.deepEqual(record.before, cmd.expect.cells);
    assert.deepEqual(record.after, cmd.set);
    assert.equal(record.quoteCheck.status, 'verified');
    assert.equal(file.base.snapshotDigest, sb.ws.stamp().snapshotDigest);
    assert.notEqual(file.result.snapshotDigest, file.base.snapshotDigest);
    assert.deepEqual(file.impact, { answersMoved: { moved: null, estimatesPending: true }, reportPath: null }, 'impact is not claimed before WP-11 computes it');

    // The CSV is canonical: parse and write again gives the same bytes; the manifest names exactly those bytes and keeps its other entries.
    const csv = readFileSync(join(sb.dir, 'export/data/tables/measurements.csv'), 'utf8');
    const reparsed = parseCsv(csv, 'measurements');
    assert.equal(csvText(reparsed.header, reparsed.records.map((r) => r.cells)), csv);
    const baseManifest = JSON.parse(readFileSync(join(realData, 'manifest.json'), 'utf8'));
    const manifest = JSON.parse(readFileSync(join(sb.dir, 'export/data/manifest.json'), 'utf8'));
    assert.equal(manifest.tables.measurements.sha256, sha(csv));
    assert.equal(manifest.tables.measurements.rows, baseManifest.tables.measurements.rows);
    assert.deepEqual({ ...manifest.tables, measurements: null }, { ...baseManifest.tables, measurements: null }, 'every other table keeps its entry');
    assert.deepEqual(Object.keys(manifest.tables), Object.keys(baseManifest.tables), 'and the order');
    // Against the real CSV the diff is exactly the three cells of one row.
    const was = parseCsv(readFileSync(join(realData, 'tables/measurements.csv'), 'utf8'), 'was').records;
    const now = reparsed.records;
    const changed = now.flatMap((r, i) => r.cells.flatMap((c, k) => (c === was[i].cells[k] ? [] : [`${i}:${reparsed.header[k]}`])));
    assert.deepEqual(changed, ['0:Raw value', '0:Raw numeric', '0:Normalized value']);
    assert.equal(sb.ws.journal()[0].status, 'exported');
    assert.equal(sb.ws.journal()[0].changeSetId, result.changeSet.id);
    assert.ok(existsSync(result.backup), 'a backup was made before the export');
    assert.equal(sha(`${JSON.stringify(baseManifest, null, 2)}\n`), sha(readFileSync(join(realData, 'manifest.json'))), 'the manifest writer reproduces the committed manifest byte for byte');
  } finally { sb.cleanup(); }
});

test('a no-change export writes nothing: with no pending change the export is refused and the directory is not even created', async () => {
  const sb = await scratch();
  try {
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'Nothing', topic: 'nothing' }), (e) => e instanceof ExportRefusedError && e.code === 'nothing-to-export');
    assert.equal(existsSync(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); }
});

test('the same drafts export to the same change set, byte for byte; a later correction exports a larger one beside it (cumulative from the approved base)', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const a = await exportChangeSet(sb.ws, { title: 'First', topic: 'first' });
    const again = await exportChangeSet(sb.ws, { title: 'First', topic: 'first' });
    assert.equal(again.changeSet.id, a.changeSet.id);
    assert.equal(readFileSync(again.changeSetPath, 'utf8'), readFileSync(a.changeSetPath, 'utf8'));
    sb.ws.apply(notesCommand(sb.ws));
    const b = await exportChangeSet(sb.ws, { title: 'First', topic: 'first' });
    assert.notEqual(b.changeSet.id, a.changeSet.id);
    assert.equal(b.changeSet.records.length, 2, 'it holds everything pending since the approved base, so it replays on the Git snapshot');
    assert.deepEqual(b.changeSet.records.map((r) => r.seq), [1, 2]);
    assert.ok(existsSync(a.changeSetPath), 'the earlier change set is kept');
    assert.equal(b.changeSet.base.snapshotDigest, a.changeSet.base.snapshotDigest);
  } finally { sb.cleanup(); }
});

test('refusals: a title and topic that cannot name a file, a target inside data/, a workspace that moved under the export', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    await assert.rejects(() => exportChangeSet(sb.ws, { title: ' ', topic: 'x' }), (e) => e.code === 'bad-title');
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'Has Spaces' }), (e) => e.code === 'bad-topic');
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'ok', exportDir: join(root, 'data', 'review') }), (e) => e.code === 'unsafe-target');
    // A table changed outside the write service is not exported as if the change set explained it.
    sb.ws.db.exec("UPDATE materials SET original_name = 'tampered' WHERE materialid = 'M001'");
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'ok' }), (e) => e.code === 'workspace-drifted' && /materials/.test(e.message));
    assert.equal(existsSync(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); }
});

test('a rule row travels alone in its change set: the export refuses a mix even if one got into the journal', async () => {
  const sb = await scratch({ store: null });
  try {
    sb.ws.apply(command(sb.ws));
    sb.ws.apply(notesCommand(sb.ws));
    const [row] = sb.ws.db.prepare('SELECT "seq", "record_json" FROM "change_log" ORDER BY "seq" LIMIT 1').all();
    const record = JSON.parse(row.record_json);
    sb.ws.db.prepare('UPDATE "change_log" SET "record_json" = ? WHERE "seq" = ?').run(JSON.stringify({ ...record, table: 'class_limits', recordId: 'CL01' }), row.seq);
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'mix' }), (e) => e.code === 'rule-row-not-alone');
    assert.equal(existsSync(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); }
});

test('an export when Git moved after the workspace was opened is refused: the open check comes first', async () => {
  const data = copyData();
  const sb = await scratch({ dataDir: data.dir });
  try {
    sb.ws.apply(command(sb.ws));
    editRecords(data.dir, 'materials', (rows) => { rows[1][columnIndex('materials', 'Limitations')] = 'Edited upstream.'; });
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'late' }), (e) => e.code === 'stale-base' && /open check/.test(e.message));
    assert.equal(existsSync(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); data.cleanup(); }
});

// ---------------------------------------------------------------- interrupted export (DP-11)

test('an export killed before its journal leaves the target exactly as it was, with no staging and no journal; the next export succeeds', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const first = await exportChangeSet(sb.ws, { title: 'First', topic: 'first' });
    const target = join(sb.dir, 'export');
    const before = tree(target);
    sb.ws.apply(notesCommand(sb.ws));
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'Second', topic: 'second', hooks: { failBeforeCommit: true } }), /interrupted before its journal/);
    assert.deepEqual(tree(target), before, 'not one byte of the target moved');
    assert.equal(exportPending(target), false);
    assert.equal(existsSync(join(target, '.save')), false);
    assert.deepEqual(sb.ws.journal().map((e) => e.status), ['exported', 'draft'], 'and the journal says nothing was exported');
    const second = await exportChangeSet(sb.ws, { title: 'Second', topic: 'second' });
    assert.equal(second.changeSet.records.length, 2);
    assert.ok(existsSync(first.changeSetPath));
  } finally { sb.cleanup(); }
});

test('an export killed on its very first run leaves no export directory content at all', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'First', topic: 'first', hooks: { failBeforeCommit: true } }), /interrupted/);
    assert.deepEqual(tree(join(sb.dir, 'export')), {});
    assert.equal(sb.ws.journal()[0].status, 'draft');
  } finally { sb.cleanup(); }
});

test('an export killed during promote is finished by the next call: the new state whole, never a mix', async () => {
  const sb = await scratch();
  const clean = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    clean.ws.apply({ ...command(clean.ws), opId: sb.ws.journal()[0].record.opId });
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'First', topic: 'first', hooks: { failAfterRenames: 1 } }), /interrupted after 1 of 3 renames/);
    const target = join(sb.dir, 'export');
    assert.equal(exportPending(target), true, 'the journal says an export is waiting');
    assert.equal(sb.ws.journal()[0].status, 'draft');
    // A reader of the half-finished target is told to finish it first.
    const journal = JSON.parse(readFileSync(join(target, '.save-journal.json'), 'utf8'));
    const stagedSet = journal.files.find((f) => f.to.includes('change-sets/')).staged;
    const stopped = cli('replay', join(target, stagedSet), '--tables', join(target, 'data/tables'));
    assert.equal(stopped.status, 1);
    assert.match(stopped.stdout, /an interrupted export is waiting/);
    const finished = await exportChangeSet(sb.ws, { title: 'First', topic: 'first' });
    assert.equal(finished.recovered, true);
    assert.equal(exportPending(target), false);
    assert.equal(existsSync(join(target, '.save')), false);
    const result = replayFile(finished.changeSetPath, { tablesDir: join(target, 'data/tables'), store: null });
    assert.equal(result.ok, true, result.problems.join('; '));
    assert.equal(sb.ws.journal()[0].status, 'exported');
    // Same inputs, uninterrupted, give the same files.
    const uninterrupted = await exportChangeSet(clean.ws, { title: 'First', topic: 'first' });
    assert.equal(sha(readFileSync(join(uninterrupted.exportDir, 'data/tables/measurements.csv'))), sha(readFileSync(join(target, 'data/tables/measurements.csv'))));
  } finally { sb.cleanup(); clean.cleanup(); }
});

test('a target that changed while the export ran is not overwritten: the export stops and the newer work stands', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const manifest = join(sb.dir, 'export/data/manifest.json');
    await assert.rejects(() => exportChangeSet(sb.ws, {
      title: 'First', topic: 'first',
      hooks: { beforeCommit: () => { mkdirSync(join(sb.dir, 'export/data'), { recursive: true }); writeFileSync(manifest, 'newer work\n'); } },
    }), (e) => e instanceof ExportRefusedError && e.code === 'target-changed' && /manifest\.json/.test(e.message));
    assert.equal(readFileSync(manifest, 'utf8'), 'newer work\n');
    assert.deepEqual(Object.keys(tree(join(sb.dir, 'export'))), ['data/manifest.json'], 'nothing else was promoted, nothing staged is left');
    assert.equal(exportPending(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- replay equality (DP-13)

async function exported(options) {
  const sb = await scratch(options);
  sb.ws.apply(command(sb.ws));
  const result = await exportChangeSet(sb.ws, { title: 'Correct the PLA density', topic: 'pla-density' });
  return { sb, result, tablesDir: join(result.exportDir, 'data/tables'), file: result.changeSetPath };
}
const rewrite = (file, edit) => { const json = JSON.parse(readFileSync(file, 'utf8')); edit(json); writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`); };

test('replay equality: the change set applied to a fresh rebuild of its base gives its result digest and the exported CSV, byte for byte', async () => {
  const { sb, tablesDir, file } = await exported({ store: null });
  try {
    const result = replayFile(file, { tablesDir, store: null });
    assert.equal(result.ok, true, result.problems.join('; '));
    assert.equal(result.baseDigest.actual, result.baseDigest.expected);
    assert.equal(result.resultDigest.actual, result.resultDigest.expected);
    assert.deepEqual(result.tables, [{ table: 'measurements', status: 'identical', detail: '' }]);
    assert.deepEqual(result.quoteChecks, ['record 1: not run: store absent'], 'a skipped quote check is said so, never "verified"');
  } finally { sb.cleanup(); }
});

test('replay says what verified locally means: with the store, "verified here"; replayed without it, "verified locally ... not re-checkable here"', async () => {
  const { sb, tablesDir, file } = await exported();
  try {
    const { fakeStore } = await import('./write-helpers.mjs');
    assert.match(replayFile(file, { tablesDir, store: fakeStore }).quoteChecks[0], /verified here/);
    assert.match(replayFile(file, { tablesDir, store: null }).quoteChecks[0], /verified locally \(ops digest [0-9a-f]{12}, commit [0-9a-f]{12}; not re-checkable here: store absent\)/);
    rewrite(file, (json) => { json.records[0].quoteCheck.opsDigest = '0'.repeat(64); });
    const stale = replayFile(file, { tablesDir, store: null });
    assert.match(stale.quoteChecks[0], /stale/);
    assert.equal(stale.ok, false, 'a stale quote check fails the replay');
    assert.match(stale.problems.join('\n'), /quote check is stale/);
  } finally { sb.cleanup(); }
});

test('replay fails and says what differs: a wrong result digest, a record that no longer applies, a changed CSV, a missing and an extra CSV', async () => {
  const { sb, tablesDir, file } = await exported({ store: null });
  try {
    const original = readFileSync(file, 'utf8');
    rewrite(file, (json) => { json.result.snapshotDigest = 'a'.repeat(64); });
    let result = replayFile(file, { tablesDir, store: null });
    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /not the result aaaaaaaaaaaa the change set claims/);

    writeFileSync(file, original);
    rewrite(file, (json) => { json.records[0].before['Raw value'] = '1.99'; });
    result = replayFile(file, { tablesDir, store: null });
    assert.equal(result.ok, false);
    assert.match(result.problems.join('\n'), /did not replay: refused stale: .*Raw value: expected "1\.99", found "1\.24"/);

    writeFileSync(file, original);
    const csv = join(tablesDir, 'measurements.csv');
    const good = readFileSync(csv, 'utf8');
    writeFileSync(csv, good.replace('1250', '1251'));
    result = replayFile(file, { tablesDir, store: null });
    assert.equal(result.ok, false);
    assert.equal(result.tables[0].status, 'differs');
    assert.match(result.tables[0].detail, /line 2: the file has/);
    writeFileSync(csv, good);
    writeFileSync(join(tablesDir, 'grades.csv'), 'x\n');
    assert.deepEqual(replayFile(file, { tablesDir, store: null }).tables.map((t) => `${t.table}:${t.status}`), ['measurements:identical', 'grades:unexpected']);
    writeFileSync(join(tablesDir, 'grades.csv'), '');
    rewrite(file, () => {});
    assert.equal(readFileSync(file, 'utf8'), original);
    // A change set that is not a change set at all.
    writeFileSync(file, '{"id": "x"}');
    assert.match(replayFile(file, { store: null }).problems[0], /is not a readable change set/);
  } finally { sb.cleanup(); }
});

test('replay on a base the change set does not name is refused: replay it where it applies', async () => {
  const { sb, file } = await exported({ store: null });
  const data = copyData();
  try {
    editRecords(data.dir, 'materials', (rows) => { rows[1][columnIndex('materials', 'Limitations')] = 'Edited upstream.'; });
    const result = replayFile(file, { dataDir: data.dir, store: null });
    assert.equal(result.ok, false);
    assert.match(result.problems[0], /applies to snapshot [0-9a-f]{12}, but .* is snapshot [0-9a-f]{12}/);
  } finally { sb.cleanup(); data.cleanup(); }
});

test('a hand-edited non-canonical CSV fails the round trip; a canonical one passes and is the next base (DP-5)', () => {
  const data = copyData();
  try {
    editText(data.dir, 'materials', (text) => text.replace(/\n/, ' \n')); // a space at the end of the header line, manifest in step
    const bad = roundtrip({ dataDir: data.dir });
    assert.equal(bad.ok, false);
    assert.equal(bad.tables.find((t) => t.table === 'materials').status, 'differs');
  } finally { data.cleanup(); }
  const clean = copyData();
  try {
    editRecords(clean.dir, 'materials', (rows) => { rows[0][columnIndex('materials', 'Limitations')] = 'Edited, canonically.'; });
    assert.equal(roundtrip({ dataDir: clean.dir }).ok, true);
  } finally { clean.cleanup(); }
});

// ---------------------------------------------------------------- immutability (DP-13)

test('a change set already on the base branch is byte-identical in the head: a change or a removal is reported', () => {
  const repo = mkdtempSync(join(tmpdir(), 'atlas-immutable-'));
  const git = (...args) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  const dir = join(repo, 'data/review/change-sets');
  mkdirSync(dir, { recursive: true });
  git('init', '-q');
  git('config', 'user.email', 't@example.invalid');
  git('config', 'user.name', 't');
  writeFileSync(join(dir, '2026-11-04-a-0001.json'), '{"merged": true}\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'merged');
  assert.deepEqual(checkImmutable('HEAD', 'data/review/change-sets', repo), { ref: 'HEAD', sha: git('rev-parse', 'HEAD').stdout.trim(), checked: 1, problems: [] });
  writeFileSync(join(dir, '2026-11-04-a-0001.json'), '{"merged": false}\n');
  assert.match(checkImmutable('HEAD', 'data/review/change-sets', repo).problems[0], /differs from HEAD; a merged change set is immutable/);
  writeFileSync(join(dir, '2026-11-04-a-0001.json'), '{"merged": true}\n');
  writeFileSync(join(dir, '2026-11-05-b-0002.json'), '{"new": true}\n');
  assert.equal(checkImmutable('HEAD', 'data/review/change-sets', repo).problems.length, 0, 'a new change set is not a change to a merged one');
  git('rm', '-q', '-f', '2026-11-04-a-0001.json'.replace(/^/, 'data/review/change-sets/'));
  assert.match(checkImmutable('HEAD', 'data/review/change-sets', repo).problems[0], /gone from the working tree/);
  assert.throws(() => checkImmutable('no-such-ref', 'data/review/change-sets', repo), /is not a commit/);
  rmSync(repo, { recursive: true, force: true });
});

// ---------------------------------------------------------------- the command line

test('the command line: apply, status, export, replay, backup, restore, drafts:export and drafts:import, with honest exit codes', async () => {
  const sb = await scratch({ store: null });
  const dir = sb.dir;
  const cmd = command(sb.ws);
  sb.ws.close();
  try {
    const flags = ['--workspace', dir];
    const file = join(dir, 'commands.json');
    writeFileSync(file, JSON.stringify([cmd]));
    let run = cli('apply', file, ...flags);
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /APPLIED\s+\w{26}/);
    assert.match(run.stdout, /RESULT: pass/);
    run = cli('apply', file, ...flags);
    assert.equal(run.status, 0);
    assert.match(run.stdout, /DUPLICATE/, 'the same file again is a retry: nothing new');

    // A stale command: exit 1, the expected and the current values on screen, nothing applied.
    const stale = join(dir, 'stale.json');
    writeFileSync(stale, JSON.stringify({ ...cmd, opId: '01M5F1YMAPMXXC12Z4F6SFJJMS', expect: { cells: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' } } }));
    run = cli('apply', stale, ...flags);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /REFUSED\s+\w{26}\s+stale: .*Raw value: expected "1\.24", found "1\.25"/);
    assert.match(run.stdout, /expected \{"cells"/);
    assert.match(run.stdout, /found\s+\{"rowHash"/);

    // A file with a command that does not parse applies nothing.
    writeFileSync(stale, JSON.stringify([cmd, { opId: 'bad' }]));
    run = cli('apply', stale, ...flags);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /nothing was applied/);

    run = cli('status', ...flags);
    assert.equal(run.status, 0);
    assert.match(run.stdout, /approved base [0-9a-f]{64}/);
    assert.match(run.stdout, /1 pending change/);

    run = cli('export', ...flags);
    assert.equal(run.status, 64, 'a title and topic are required');
    run = cli('export', '--title', 'Correct the PLA density', '--topic', 'pla-density', ...flags);
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /change:export {2}\d{4}-\d{2}-\d{2}-pla-density-[0-9a-f]{4}/);
    assert.match(run.stdout, /sandbox only, nothing was written to data\//);
    const setFile = join(dir, 'export/data/review/change-sets', readdirSync(join(dir, 'export/data/review/change-sets'))[0]);

    run = cli('replay', setFile);
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /IDENTICAL {1,}measurements/);
    assert.match(run.stdout, /result [0-9a-f]{12} = the change set's result/);
    assert.match(run.stdout, /quote {2}record 1: not run: store absent/);
    assert.match(run.stdout, /RESULT: pass/);
    rewrite(setFile, (json) => { json.result.snapshotDigest = 'a'.repeat(64); });
    run = cli('replay', setFile);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /PROBLEM .*not the result/);
    assert.match(run.stdout, /RESULT: FAIL/);

    run = cli('replay'); // the repository's own data/: no change sets there on this branch
    assert.equal(run.status, 0);
    assert.match(run.stdout, /0 change sets in .*data\/review\/change-sets; nothing to replay/);

    run = cli('backup', ...flags);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /verified/);
    const drafts = join(dir, 'drafts.json');
    run = cli('drafts-export', drafts, ...flags);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /1 command/);
    run = cli('restore', '--latest', ...flags);
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /the file it replaced is saved as/);
    run = cli('restore', ...flags);
    assert.equal(run.status, 64);
    run = cli('restore', join(dir, 'nope.sqlite'), ...flags);
    assert.notEqual(run.status, 0);

    // db:rebuild over a workspace that holds drafts keeps them (and says so).
    run = cli('rebuild', '--out', join(dir, 'atlas.sqlite'));
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /kept the drafts/);
    assert.match(run.stdout, /replayed 1 draft/);
    run = cli('drafts-import', drafts, ...flags);
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /1 already there/);
    assert.equal(cli('apply', '--bogus').status, 64);
    assert.equal(cli('apply', file, file).status, 64);
  } finally { sb.cleanup(); }
});

test('the command line reports a writer that cannot start as a failure (exit 1), never as success', async () => {
  const sb = await scratch({ store: null });
  const cmd = command(sb.ws);
  sb.ws.close();
  try {
    writeFileSync(join(sb.dir, 'writer.lock'), `${JSON.stringify({ pid: process.pid, host: (await import('node:os')).hostname(), since: '2026-10-21T00:00:00.000Z', token: 'other' })}\n`);
    const file = join(sb.dir, 'c.json');
    writeFileSync(file, JSON.stringify(cmd));
    const run = cli('apply', file, '--workspace', sb.dir);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /another writer holds the workspace/);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- hardening found in review

test('the export directory may not be, contain or lie inside the data it reads: an export there would write and remove data/ files', async () => {
  const data = copyData();
  const sb = await scratch({ dataDir: data.dir });
  try {
    sb.ws.apply(command(sb.ws));
    const base = join(data.dir, '..'); // contains data/: an export writes <dir>/data/tables and removes the other CSVs there
    const before = tree(data.dir);
    for (const exportDir of [base, data.dir, join(data.dir, 'tables'), join(root, 'data'), root]) {
      await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'unsafe', exportDir }), (e) => e.code === 'unsafe-target', exportDir);
    }
    assert.deepEqual(tree(data.dir), before, 'not one file of the data moved');
  } finally { sb.cleanup(); data.cleanup(); }
});

test('a journal is not followed outside the export directory', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    mkdirSync(join(sb.dir, 'export'), { recursive: true });
    writeFileSync(join(sb.dir, 'export/.save-journal.json'), JSON.stringify({ note: 'x', token: 't', files: [], remove: ['../../../escape.txt'] }));
    writeFileSync(join(sb.dir, '..', 'escape.txt'), 'must survive');
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'escape' }), /outside .*it will not be followed/);
    assert.equal(readFileSync(join(sb.dir, '..', 'escape.txt'), 'utf8'), 'must survive');
    rmSync(join(sb.dir, '..', 'escape.txt'));
  } finally { sb.cleanup(); }
});

test('an edit made inside a table the records touch, outside the write service, is caught: the change set must replay to the workspace\'s result', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    sb.ws.db.exec("UPDATE measurements SET notes = 'edited by hand' WHERE measurementid = 'V000002'");
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'hand' }), (e) => e.code === 'verification-failed' && /does not replay on its base/.test(e.message));
    assert.equal(existsSync(join(sb.dir, 'export')), false);
  } finally { sb.cleanup(); }
});

test('the command line refuses what is not understood: no commands, a missing change-set directory, a rebuild into data/; and says when a quote was not checked', async () => {
  const sb = await scratch({ store: null });
  const cmd = command(sb.ws);
  sb.ws.close();
  try {
    const empty = join(sb.dir, 'empty.json');
    writeFileSync(empty, '[]');
    let run = cli('apply', empty, '--workspace', sb.dir);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /holds no commands/);
    run = cli('replay', '--changesets', join(sb.dir, 'no-such-dir'));
    assert.equal(run.status, 64);
    run = cli('rebuild', '--out', join(root, 'data', 'atlas.sqlite'));
    assert.equal(run.status, 64);
    assert.equal(existsSync(join(root, 'data', 'atlas.sqlite')), false);
    const file = join(sb.dir, 'c.json');
    writeFileSync(file, JSON.stringify(cmd));
    run = cli('apply', file, '--workspace', sb.dir);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /quote check: NOT RUN \(store absent\); the quote is not verified/);
    assert.match(run.stdout, /1 without a verified quote check \(not run\)/);
    run = cli('export', '--title', 'T', '--topic', 'quote', '--workspace', sb.dir);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /quote check NOT RUN for 1 of 1 record/);
  } finally { sb.cleanup(); }
});

test('a held conflict makes the command line fail even when the command itself ran', async () => {
  const data = copyData();
  const sb = await scratch({ dataDir: data.dir, store: null });
  const cmd = command(sb.ws);
  try {
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    sb.ws.close();
    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; });
    const run = cli('status', '--workspace', sb.dir, '--data', data.dir);
    assert.equal(run.status, 1);
    assert.match(run.stdout, /CONFLICT \w{26} \(stale\)/);
    assert.match(run.stdout, /RESULT: FAIL \(the command ran, but 1 draft\(s\) no longer apply/);
    const backup = cli('backup', '--workspace', sb.dir, '--data', data.dir);
    assert.equal(backup.status, 0, 'a backup is not blocked by a conflict, but it prints it');
    assert.match(backup.stdout, /CONFLICT/);
    const exportRun = cli('export', '--title', 'T', '--topic', 'held', '--workspace', sb.dir, '--data', data.dir);
    assert.equal(exportRun.status, 1);
    assert.match(exportRun.stderr, /conflicts-pending/);
  } finally { sb.cleanup(); data.cleanup(); }
});
