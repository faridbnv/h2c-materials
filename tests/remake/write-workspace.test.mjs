// WP-10 slice (c) (proofs DP-9, DP-10, DP-12): drafts, backups and the open check. Pending work survives a restart and a kill; a
// backup is consistent and restorable; when Git moves, the workspace backs itself up, rebuilds, replays the drafts, skips what a
// merged change set already holds, and keeps what no longer applies as a conflict instead of applying it silently.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { open } from '../../packages/data/src/driver.ts';
import { exportChangeSet } from '../../packages/data/src/export.ts';
import { exportDrafts, importDrafts, readDraftsFile } from '../../packages/data/src/replay.ts';
import { ExportRefusedError } from '../../packages/data/src/export.ts';
import { Workspace, isSafetyBackup, listBackups, verifyWorkspaceFile } from '../../packages/data/src/workspace.ts';
import { columnIndex, copyData, editRecords } from './data-helpers.mjs';
import { command, dropTemplate, journalSize, measurement, root, scratch } from './write-helpers.mjs';

after(dropTemplate);

// ---------------------------------------------------------------- drafts survive a restart

test('drafts survive a restart: the cells and the change record are there when the workspace is opened again', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    sb.ws.close();
    sb.ws = await sb.open();
    assert.equal(sb.ws.rebased, null, 'nothing moved, so no open check work');
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250');
    const [draft] = sb.ws.drafts();
    assert.equal(draft.record.opId, cmd.opId);
    assert.equal(draft.status, 'draft');
  } finally { sb.cleanup(); }
});

test('drafts survive a process that is killed after the command returned (no clean close, no checkpoint)', async () => {
  const sb = await scratch();
  try {
    sb.ws.close();
    const script = join(sb.dir, 'writer.mjs');
    writeFileSync(script, `
      import { Workspace } from ${JSON.stringify(join(root, 'packages/data/src/workspace.ts'))};
      import { command } from ${JSON.stringify(join(root, 'tests/remake/write-helpers.mjs'))};
      const ws = await Workspace.open({ workspaceDir: ${JSON.stringify(sb.dir)}, store: null });
      const result = ws.apply(command(ws));
      if (result.status !== 'applied') { console.error(JSON.stringify(result)); process.exit(3); }
      process.kill(process.pid, 'SIGKILL');
    `);
    const child = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    sb.ws = await sb.open();
    assert.equal(sb.ws.drafts().length, 1);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250');
    assert.equal(sb.ws.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- backup and restore

test('a backup is the SQLite online backup: verified, complete with the journal, named by time and reason', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const info = await sb.ws.backup('manual');
    assert.match(info.path, /atlas-\d{8}T\d{9}Z-manual\.sqlite$/);
    assert.ok(info.pages > 0);
    assert.equal(verifyWorkspaceFile(info.path).drafts, 1, 'the backup holds the draft');
    assert.equal(existsSync(`${info.path}.partial`), false);
    await assert.rejects(() => sb.ws.backup('Bad Reason!'), /lowercase words/);
  } finally { sb.cleanup(); }
});

test('restore puts a verified backup in place after a safety backup of what it replaces', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const kept = await sb.ws.backup('manual');
    const cur = measurement(sb.ws).get('Notes');
    assert.equal(sb.ws.apply(command(sb.ws, { set: { Notes: `${cur} Reviewed on 2026-10-21.` }, expect: { cells: { Notes: cur } } })).status, 'applied');
    assert.equal(sb.ws.drafts().length, 2);
    sb.ws.close();
    const done = await Workspace.restore(sb.options, kept.path);
    assert.equal(done.drafts, 1);
    assert.ok(done.safety && existsSync(done.safety), 'what was replaced is saved first');
    assert.equal(verifyWorkspaceFile(done.safety).drafts, 2);
    sb.ws = await sb.open();
    assert.equal(sb.ws.drafts().length, 1, 'back to the state of the backup');
    assert.equal(measurement(sb.ws).get('Notes'), cur);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250');
  } finally { sb.cleanup(); }
});

test('restore refuses a damaged file and a file that is not a workspace, and leaves the workspace as it was', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    const good = await sb.ws.backup('manual');
    sb.ws.close();
    const bytes = readFileSync(good.path);
    const damaged = join(sb.dir, 'damaged.sqlite');
    writeFileSync(damaged, Buffer.concat([bytes.subarray(0, 4096 * 3), Buffer.alloc(4096 * 3, 0x41), bytes.subarray(4096 * 6)]));
    await assert.rejects(() => Workspace.restore(sb.options, damaged));
    const notWorkspace = join(sb.dir, 'plain.sqlite');
    const plain = open(notWorkspace);
    plain.exec('CREATE TABLE t (x INTEGER) STRICT');
    plain.close();
    await assert.rejects(() => Workspace.restore(sb.options, notWorkspace), /not a workspace backup/);
    writeFileSync(join(sb.dir, 'garbage.sqlite'), 'this is not a database file at all, just text '.repeat(200));
    await assert.rejects(() => Workspace.restore(sb.options, join(sb.dir, 'garbage.sqlite')));
    sb.ws = await sb.open();
    assert.equal(sb.ws.drafts().length, 1, 'the workspace was not touched');
    assert.equal(readdirSync(sb.dir).filter((f) => f.includes('.restore-')).length, 0, 'no staged restore is left behind');
  } finally { sb.cleanup(); }
});

test('the last 20 routine backups are kept and the oldest go; an hourly backup is made when the newest is older than an hour and the work changed', async () => {
  let clock = Date.parse('2026-10-21T08:00:00.000Z');
  const sb = await scratch({ now: () => new Date(clock) });
  try {
    for (let n = 0; n < 22; n++) { clock += 1000; await sb.ws.backup('manual'); }
    const kept = listBackups(join(sb.dir, 'backups'));
    assert.equal(kept.length, 20);
    assert.match(kept[0], /T080003000Z/, 'the first two (08:00:01 and 08:00:02) were pruned');
    clock += 10 * 60_000;
    assert.equal(await sb.ws.backupIfDue(), null, 'ten minutes after the last one: not due');
    clock += 2 * 3_600_000;
    assert.equal(await sb.ws.backupIfDue(), null, 'two hours on, but nothing changed since the newest backup: no copy');
    sb.ws.apply(command(sb.ws));
    const due = await sb.ws.backupIfDue();
    assert.match(due.path, /-hourly\.sqlite$/);
    assert.equal(listBackups(join(sb.dir, 'backups')).length, 20);
    clock += 2 * 3_600_000;
    assert.equal(await sb.ws.backupIfDue(), null, 'and again nothing to keep');
  } finally { sb.cleanup(); }
});

test('hourly backups never prune a safety backup: before-discard, before-restore and the others stay however many routine ones follow', async () => {
  let clock = Date.parse('2026-10-21T08:00:00.000Z');
  const sb = await scratch({ now: () => new Date(clock) });
  try {
    const safety = [];
    for (const reason of ['before-discard', 'before-export', 'before-restore']) { clock += 1000; safety.push((await sb.ws.backup(reason)).path); }
    for (let n = 0; n < 24; n++) {
      clock += 3_600_000;
      // a new conflict is work that changed: the count is part of what an hourly backup compares
      sb.ws.db.prepare('INSERT INTO change_conflicts (op_id, command_json, code, detail, found_at) VALUES (?, ?, ?, ?, ?)').run(`conflict-${n}`, '{}', 'TEST', 'a test conflict', new Date(clock).toISOString());
      await sb.ws.backupIfDue();
    }
    const all = listBackups(join(sb.dir, 'backups'));
    for (const path of safety) assert.ok(all.includes(path), `${path} was pruned`);
    assert.equal(all.filter((f) => !isSafetyBackup(f)).length, 20, 'the routine ones keep their last 20');
    assert.equal(all.filter(isSafetyBackup).length, 3);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- the open check: Git moved (DP-10)

/** A scratch copy of the data that a test may move, and a sandbox on it. */
async function onScratchData() {
  const data = copyData();
  const sb = await scratch({ dataDir: data.dir });
  const cleanup = sb.cleanup;
  sb.cleanup = () => { cleanup(); data.cleanup(); };
  return { sb, data };
}

test('when Git moved, the open check backs up, rebuilds on the new base and replays the drafts; a retry of an old opId is still a duplicate', async () => {
  const { sb, data } = await onScratchData();
  try {
    const cmd = command(sb.ws);
    const oldBase = sb.ws.stamp().snapshotDigest;
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    sb.ws.close();
    // A merge from Git: a canonical change to an unrelated record, manifest in step.
    editRecords(data.dir, 'materials', (rows) => { rows[1][columnIndex('materials', 'Limitations')] = 'Edited upstream.'; });
    sb.ws = await sb.open();
    const rebased = sb.ws.rebased;
    assert.ok(rebased, 'the open check ran');
    assert.match(rebased.reason, /manifest/);
    assert.equal(rebased.applied, 1);
    assert.deepEqual(rebased.conflicts, []);
    assert.ok(existsSync(rebased.backup) && verifyWorkspaceFile(rebased.backup).drafts === 1, 'backed up first');
    assert.notEqual(sb.ws.stamp().snapshotDigest, oldBase, 'the base moved');
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250', 'the draft is replayed');
    assert.equal(sb.ws.db.prepare("SELECT limitations FROM materials WHERE materialid = 'M002'").get().limitations, 'Edited upstream.', 'and Git\'s change is in');
    assert.equal(sb.ws.drafts()[0].record.base.snapshotDigest, sb.ws.stamp().snapshotDigest, 'the record takes the new base');
    assert.equal(sb.ws.apply(cmd).status, 'duplicate', 'the retry after a rebase writes nothing');
    assert.equal(journalSize(sb.ws), 1);
  } finally { sb.cleanup(); }
});

test('a draft whose expectation no longer holds after Git moved becomes a conflict: kept, shown, never applied', async () => {
  const { sb, data } = await onScratchData();
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    sb.ws.close();
    editRecords(data.dir, 'measurements', (rows) => { rows[0][columnIndex('measurements', 'Normalized value')] = '1241'; });
    sb.ws = await sb.open();
    assert.equal(sb.ws.rebased.applied, 0);
    assert.equal(sb.ws.rebased.conflicts.length, 1);
    const [conflict] = sb.ws.conflicts();
    assert.equal(conflict.opId, cmd.opId);
    assert.equal(conflict.code, 'stale');
    assert.match(conflict.detail, /Normalized value: expected "1240", found "1241"/);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1241', 'Git\'s value stands; the draft was not applied');
    assert.equal(sb.ws.drafts().length, 0);
    const retry = sb.ws.apply(cmd);
    assert.equal(retry.status, 'refused', 'a conflict is not a duplicate');
    assert.match(retry.detail, /held as a conflict/);
    // The conflict survives another rebuild: it is kept until it is dealt with.
    // An export would leave the conflicted draft out without saying so: it is refused until the conflict is dealt with.
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'T', topic: 'held' }), (e) => e instanceof ExportRefusedError && e.code === 'conflicts-pending' && e.message.includes(cmd.opId));
    sb.ws.close();
    const again = await Workspace.rebuild(sb.options);
    assert.equal(again.conflicts.length, 1);
  } finally { sb.cleanup(); }
});

test('export, merge, reopen: what a merged change set holds is skipped by the open check, kept as merged, and a retry is a duplicate (the whole loop)', async () => {
  const { sb, data } = await onScratchData();
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    const exported = await exportChangeSet(sb.ws, { title: 'Correct the PLA density', topic: 'pla-density' });
    sb.ws.close();
    // The merge: the exported tables, manifest and change set arrive in data/ (done here on a scratch copy; before cutover this never happens on the branch).
    cpSync(join(exported.exportDir, 'data'), data.dir, { recursive: true });
    sb.ws = await sb.open();
    assert.ok(sb.ws.rebased, 'Git moved');
    assert.equal(sb.ws.rebased.applied, 0, 'nothing is replayed: the merged change set already holds it');
    assert.equal(sb.ws.rebased.merged, 1);
    assert.equal(sb.ws.drafts().length, 0);
    assert.equal(sb.ws.journal(['merged']).length, 1);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250', 'the value comes from the new base');
    assert.equal(sb.ws.apply(cmd).status, 'duplicate');
    assert.equal(journalSize(sb.ws), 1);
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'Nothing', topic: 'nothing' }), /no pending changes/);
  } finally { sb.cleanup(); }
});

test('a hand edit to a CSV that is canonical becomes the next base (DP-5): the open check treats it as Git moving', async () => {
  const { sb, data } = await onScratchData();
  try {
    sb.ws.close();
    editRecords(data.dir, 'materials', (rows) => { rows[2][columnIndex('materials', 'Limitations')] = 'Hand edited, canonical.'; });
    sb.ws = await sb.open();
    assert.ok(sb.ws.rebased);
    assert.equal(sb.ws.db.prepare("SELECT limitations FROM materials WHERE materialid = 'M003'").get().limitations, 'Hand edited, canonical.');
  } finally { sb.cleanup(); }
});

test('a hand edit that is not canonical, or does not match the manifest, stops the open: it never builds a workspace on data that fails the round trip', async () => {
  const { sb, data } = await onScratchData();
  try {
    sb.ws.close();
    editRecords(data.dir, 'materials', (rows) => { rows[2][columnIndex('materials', 'Limitations')] = 'Stale manifest.'; }, { keepManifest: false });
    await assert.rejects(() => sb.open(), /not a consistent snapshot[\s\S]*materials: the CSV differs from the manifest/);
    assert.ok(existsSync(sb.options.workspaceDir), 'and the workspace file that was there is untouched');
    assert.equal(verifyWorkspaceFile(join(sb.dir, 'atlas.sqlite')).drafts, 0);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- the text copy of the drafts (DP-10)

test('drafts:export then drafts:import gives the same journal in a fresh workspace', async () => {
  const sb = await scratch();
  const other = await scratch();
  try {
    const first = command(sb.ws);
    assert.equal(sb.ws.apply(first).status, 'applied');
    const cur = measurement(sb.ws).get('Notes');
    assert.equal(sb.ws.apply(command(sb.ws, { set: { Notes: `${cur} Reviewed on 2026-10-21.` }, expect: { cells: { Notes: cur } } })).status, 'applied');
    const file = join(sb.dir, 'drafts.json');
    const written = exportDrafts(sb.ws, file);
    assert.equal(written.commands.length, 2);
    const outcome = await importDrafts(other.ws, file);
    assert.equal(outcome.applied, 2);
    assert.deepEqual(outcome.conflicts, []);
    const shape = (ws) => ws.drafts().map((d) => ({ opId: d.record.opId, table: d.record.table, id: d.record.recordId, before: d.record.before, after: d.record.after, status: d.status, reason: d.record.reason }));
    assert.deepEqual(shape(other.ws), shape(sb.ws));
    assert.equal(measurement(other.ws).get('Normalized value'), '1250');
    // Importing the same file again is idempotent.
    assert.equal((await importDrafts(other.ws, file)).duplicates, 2);
    assert.equal(journalSize(other.ws), 2);
  } finally { sb.cleanup(); other.cleanup(); }
});

test('drafts:import refuses a file with a command it does not understand, whole; a command that no longer applies becomes a conflict', async () => {
  const sb = await scratch();
  const other = await scratch({ store: null });
  try {
    sb.ws.apply(command(sb.ws));
    const file = join(sb.dir, 'drafts.json');
    exportDrafts(sb.ws, file);
    const text = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(join(sb.dir, 'bad.json'), JSON.stringify({ ...text, commands: [text.commands[0], { opId: 'nope' }] }));
    assert.throws(() => readDraftsFile(join(sb.dir, 'bad.json')), /nothing imported/);
    await assert.rejects(() => importDrafts(other.ws, join(sb.dir, 'bad.json')), /nothing imported/);
    assert.equal(journalSize(other.ws), 0, 'not even the good command was applied');
    // The record moved in the other workspace first, so the imported command is stale there.
    const cur = measurement(other.ws).get('Raw value');
    other.ws.apply(command(other.ws, { set: { 'Raw value': '1.26', 'Raw numeric': '1.26', 'Normalized value': '1260' } , evidence: { ...command(other.ws).evidence, quote: 'Density ISO 1183 g/cc 1.26' } }));
    assert.equal(cur, '1.24');
    const outcome = await importDrafts(other.ws, file);
    assert.equal(outcome.conflicts.length, 1);
    assert.equal(outcome.conflicts[0].code, 'stale');
    assert.equal(other.ws.conflicts().length, 1);
    assert.equal(measurement(other.ws).get('Normalized value'), '1260', 'the conflicting command was kept, not applied');
  } finally { sb.cleanup(); other.cleanup(); }
});

// ---------------------------------------------------------------- the sandbox rule (Q2-08 B)

test('the sandbox: a whole session writes nothing under data/, and the workspace cannot be placed inside it', async () => {
  const before = readFileSync(join(root, 'data', 'manifest.json'));
  const status = () => spawnSync('git', ['status', '--porcelain', '--', 'data'], { cwd: root, encoding: 'utf8' }).stdout;
  const dirty = status();
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    await exportChangeSet(sb.ws, { title: 'Sandbox check', topic: 'sandbox' });
    await sb.ws.backup('manual');
    await assert.rejects(() => exportChangeSet(sb.ws, { title: 'Into data', topic: 'into-data', exportDir: join(root, 'data', 'out') }), /inside .*data/);
    await assert.rejects(() => Workspace.open({ workspaceDir: join(root, 'data'), store: null }), /sandbox/);
    assert.equal(existsSync(join(root, 'data', 'out')), false);
  } finally { sb.cleanup(); }
  assert.ok(readFileSync(join(root, 'data', 'manifest.json')).equals(before));
  assert.equal(status(), dirty, 'git sees no change under data/');
});

// ---------------------------------------------------------------- failures while rebuilding, restoring and replacing (silent-failure review)

test('a rebuild that cannot replay the journal leaves the old workspace, drafts and all, in place', async () => {
  const { sb, data } = await onScratchData();
  try {
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied');
    sb.ws.close();
    const raw = open(join(sb.dir, 'atlas.sqlite'));
    raw.exec("UPDATE change_log SET command_json = '{}'");
    raw.close();
    editRecords(data.dir, 'materials', (rows) => { rows[1][columnIndex('materials', 'Limitations')] = 'Edited upstream.'; });
    await assert.rejects(() => sb.open(), /holds a command that does not parse/);
    assert.equal(verifyWorkspaceFile(join(sb.dir, 'atlas.sqlite')).drafts, 1, 'the draft is still in the file that was there');
    assert.deepEqual(readdirSync(sb.dir).filter((f) => f.includes('.rebase-') || f.includes('.partial')), [], 'no half-built workspace is left');
    assert.equal(listBackups(join(sb.dir, 'backups')).length, 1, 'and the backup is the second copy');
  } finally { sb.cleanup(); }
});

test('a session whose workspace file was replaced by a restore does not go on writing to the old file', async () => {
  const sb = await scratch();
  try {
    const kept = await sb.ws.backup('manual');
    await Workspace.restore(sb.options, kept.path); // another process restores while this session is open
    assert.throws(() => sb.ws.apply(command(sb.ws)), /replaced by another process/);
    await assert.rejects(() => sb.ws.backup('manual'), /replaced by another process/);
    sb.ws.close();
    sb.ws = await sb.open();
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied', 'after reopening it writes to the restored file');
  } finally { sb.cleanup(); }
});

test('restoring the oldest of 20 backups works: the safety backup cannot prune the file being restored', async () => {
  let clock = Date.parse('2026-10-21T08:00:00.000Z');
  const sb = await scratch({ now: () => new Date(clock) });
  try {
    sb.ws.apply(command(sb.ws));
    for (let n = 0; n < 20; n++) { clock += 1000; await sb.ws.backup('manual'); }
    const oldest = listBackups(join(sb.dir, 'backups'))[0];
    sb.ws.close();
    const done = await Workspace.restore(sb.options, oldest);
    assert.equal(done.drafts, 1);
    assert.ok(existsSync(done.safety));
    assert.equal(listBackups(join(sb.dir, 'backups')).length, 21, 'the 20 routine ones and the safety backup of what the restore replaced');
    sb.ws = await sb.open();
    assert.equal(sb.ws.drafts().length, 1);
  } finally { sb.cleanup(); }
});

test('an opId that is already in a merged change set is a duplicate only for the same change; another command with it is refused', async () => {
  const data = copyData();
  const sb = await scratch({ dataDir: data.dir });
  const other = await scratch({ dataDir: data.dir });
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    const exported = await exportChangeSet(sb.ws, { title: 'T', topic: 'merged-op' });
    // The change set is merged into Git (here: only the change-set file, so the base digest is unchanged for this test).
    cpSync(join(exported.exportDir, 'data/review'), join(data.dir, 'review'), { recursive: true });
    other.ws.close();
    other.ws = await other.open();
    assert.equal(other.ws.apply(cmd).status, 'duplicate', 'the same change again');
    assert.equal(measurement(other.ws).get('Normalized value'), '1240', 'and it is not applied a second time');
    const different = other.ws.apply({ ...cmd, set: { 'Raw value': '1.26', 'Raw numeric': '1.26', 'Normalized value': '1260' } });
    assert.equal(different.status, 'refused');
    assert.equal(different.code, 'opid-conflict');
    assert.match(different.detail, /merged change set/);
  } finally { sb.cleanup(); other.cleanup(); data.cleanup(); }
});

test('drafts:export will not write into data/', async () => {
  const sb = await scratch();
  try {
    sb.ws.apply(command(sb.ws));
    assert.throws(() => exportDrafts(sb.ws, join(root, 'data', 'drafts.json')), /sandbox/);
    assert.equal(existsSync(join(root, 'data', 'drafts.json')), false);
  } finally { sb.cleanup(); }
});
