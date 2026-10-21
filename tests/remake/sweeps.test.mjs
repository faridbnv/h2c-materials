// WP-17 (proofs DP-9, DP-14; pack 04 section 5 "Generators", 02 section 9.1 rule 5): a sweep is a generator that emits explicit commands with
// `expectCount`, is refused when the count differs, never writes a table, travels as one batch (all or none) and is never replayed.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExportRefusedError, exportChangeSet } from '../../packages/data/src/export.ts';
import { parseChangeSet, readJson } from '../../packages/data/src/parse.ts';
import { replayFile } from '../../packages/data/src/replay.ts';
import { SweepCountError, SweepOutputError, applySweep, cellSweep, opIdFromSeed, runSweep } from '../../packages/data/src/sweep.ts';
import { ACTOR, HASH, QUOTE, SOURCE, cmd, dropTemplate, fingerprint, journalSize, root, scratch } from './write-helpers.mjs';

after(dropTemplate);

const evidence = { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'Table 1', quote: QUOTE };
const gaps = (ws) => Number(ws.db.prepare("SELECT count(*) AS n FROM coverage WHERE status = 'Gap'").get().n);
const GAP_SWEEP = {
  path: 'sweeps/gap-to-partial.mjs', version: '1', table: 'coverage', column: 'Status', from: 'Gap', to: 'Partially resolved', expectCount: 28,
  reason: 'Every open gap now has a partial finding.', actor: ACTOR, evidence,
};

test('a sweep emits explicit commands, each expecting the value it replaces, and says how many; the commands are the same on every run', async () => {
  const sb = await scratch();
  try {
    const first = runSweep(sb.ws, cellSweep(GAP_SWEEP));
    assert.equal(gaps(sb.ws), 28, 'running a sweep writes nothing');
    assert.equal(first.commands.length, 28);
    assert.deepEqual(first.ref, { path: 'sweeps/gap-to-partial.mjs', version: '1', args: ['coverage', 'Status', 'Gap', 'Partially resolved'], expectCount: 28 });
    for (const command of first.commands) {
      assert.equal(command.kind, 'correctValue');
      assert.deepEqual(command.expect, { cells: { Status: 'Gap' } }, 'each command names the value it replaces');
      assert.deepEqual(command.set, { Status: 'Partially resolved' });
    }
    const second = runSweep(sb.ws, cellSweep(GAP_SWEEP));
    assert.deepEqual(second.commands.map((c) => c.opId), first.commands.map((c) => c.opId), 'the opIds follow from the generator, its arguments and the base, so a retry is a duplicate');
    assert.equal(new Set(first.commands.map((c) => c.opId)).size, 28);
    assert.equal(opIdFromSeed('a'), opIdFromSeed('a'));
    assert.notEqual(opIdFromSeed('a'), opIdFromSeed('b'));
  } finally { sb.cleanup(); }
});

test('expectCount: a sweep that finds another number of cells than it said is refused before anything is applied', async () => {
  const sb = await scratch();
  try {
    const before = fingerprint(sb.ws);
    for (const expectCount of [27, 29, 0]) {
      assert.throws(() => applySweep(sb.ws, cellSweep({ ...GAP_SWEEP, expectCount })), (error) => error instanceof SweepCountError && error.expected === expectCount && error.found === 28 && /nothing was applied/.test(error.message));
    }
    assert.equal(fingerprint(sb.ws), before);
    assert.equal(journalSize(sb.ws), 0);
  } finally { sb.cleanup(); }
});

test('applySweep: the commands go in as one batch with a change record each; run again on the moved base, the count differs and it is refused', async () => {
  const sb = await scratch();
  try {
    const done = applySweep(sb.ws, cellSweep(GAP_SWEEP));
    assert.equal(done.status, 'applied');
    assert.equal(done.applied, 28);
    assert.equal(gaps(sb.ws), 0);
    assert.equal(journalSize(sb.ws), 28);
    const records = sb.ws.drafts().map((d) => d.record);
    assert.ok(records.every((r) => r.kind === 'correctValue' && r.before.Status === 'Gap' && r.after.Status === 'Partially resolved'), 'an explicit change record per cell');
    // the sweep is not replayed: on the moved base it finds nothing, so it is refused, and the agent decides what to do
    assert.throws(() => applySweep(sb.ws, cellSweep(GAP_SWEEP)), SweepCountError);
    // the same commands again (a retry after a crash) are duplicates, not second edits
    const again = sb.ws.applyBatch(runSweepBefore(sb.ws, records));
    assert.equal(again.status, 'applied');
    assert.ok(again.results.every((r) => r.status === 'duplicate'));
    assert.equal(journalSize(sb.ws), 28);
  } finally { sb.cleanup(); }
});

/** The commands the journal holds, as a retry would send them. */
const runSweepBefore = (ws) => ws.journal().map((entry) => entry.command);

test('a batch is all or none: the first refusal rolls back every command before it, and names which one it was', async () => {
  const sb = await scratch();
  try {
    const before = fingerprint(sb.ws);
    const good = runSweep(sb.ws, cellSweep({ ...GAP_SWEEP, expectCount: 28 })).commands;
    const stale = { ...good[2], opId: opIdFromSeed('stale'), expect: { cells: { Status: 'Resolved' } } };
    const batch = sb.ws.applyBatch([good[0], good[1], stale, good[3]]);
    assert.equal(batch.status, 'refused');
    assert.equal(batch.index, 2);
    assert.equal(batch.opId, stale.opId);
    assert.equal(batch.result.code, 'stale');
    assert.equal(fingerprint(sb.ws), before, 'the two commands before it were rolled back');
    assert.equal(journalSize(sb.ws), 0);
    const schema = sb.ws.applyBatch([cmd(sb.ws, 'addVocab', { target: { table: 'coverage' }, expect: { schemaDigest: sb.ws.stamp().schemaSha256 }, vocab: { stem: 'coverage-status', value: 'Under review' } })]);
    assert.equal(schema.result.code, 'not-for-command', 'a schema command is applied alone, never in a batch');
  } finally { sb.cleanup(); }
});

test('a sweep that emits something that is not an explicit command, or two commands with one opId, is refused', async () => {
  const sb = await scratch();
  try {
    const base = { path: 'sweeps/bad.mjs', version: '1', args: [], expectCount: 1 };
    assert.throws(() => runSweep(sb.ws, { ...base, emit: () => [{ kind: 'correctValue' }] }), SweepOutputError);
    const one = runSweep(sb.ws, cellSweep({ ...GAP_SWEEP, expectCount: 28 })).commands[0];
    assert.throws(() => runSweep(sb.ws, { ...base, expectCount: 2, emit: () => [one, one] }), (error) => error instanceof SweepOutputError && /opId/.test(error.message));
  } finally { sb.cleanup(); }
});

test('a sweep is handed rows to read and nothing to write with: no database, and the rows it gets are copies', async () => {
  const sb = await scratch();
  try {
    let seen = null;
    runSweep(sb.ws, { path: 'sweeps/look.mjs', version: '1', args: [], expectCount: 0, emit: (view) => {
      seen = Object.keys(view);
      view.rows('coverage')[0].Status = 'Tampered';
      return [];
    } });
    assert.deepEqual(seen.sort(), ['base', 'opId', 'rows', 'schemaDigest']);
    assert.equal(sb.ws.db.prepare("SELECT count(*) AS n FROM coverage WHERE status = 'Tampered'").get().n, 0);
  } finally { sb.cleanup(); }
});

test('the change set names its generator; its expectCount must equal the number of records; replay applies the recorded commands and never runs the sweep', async () => {
  const sb = await scratch({ store: null });
  try {
    const { ref } = applySweep(sb.ws, cellSweep(GAP_SWEEP));
    await assert.rejects(exportChangeSet(sb.ws, { title: 'Open gaps are partial', topic: 'gaps-partial', generator: { ...ref, expectCount: 27 } }), (error) => error instanceof ExportRefusedError && error.code === 'generator-count');
    const out = await exportChangeSet(sb.ws, { title: 'Open gaps are partial', topic: 'gaps-partial', generator: ref });
    assert.deepEqual(out.changeSet.generator, ref);
    const written = readJson(out.changeSetPath);
    assert.deepEqual(written.generator, ref);
    const parsed = parseChangeSet(written);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.value.generator, ref, 'the generator survives the file');
    assert.equal(out.changeSet.records.length, 28);
    const replay = replayFile(out.changeSetPath, { store: null, tablesDir: join(out.exportDir, 'data', 'tables') });
    assert.deepEqual(replay.problems, []);
    assert.equal(replay.ok, true, 'the change set replays from its records alone: the generator\'s code is not needed');
  } finally { sb.cleanup(); }
});

test('change:generate: the command line runs a sweep module, prints its count, refuses a wrong count, and applies it as one batch with --apply', async () => {
  const sb = await scratch({ store: null });
  try {
    const module = (expectCount) => `
      const evidence = ${JSON.stringify(evidence)};
      export default {
        path: 'sweeps/cli-gaps.mjs', version: '1', args: ['coverage', 'Gap'], expectCount: ${expectCount},
        emit(view) {
          return view.rows('coverage').flatMap((row, index) => row.Status !== 'Gap' ? [] : [{
            opId: view.opId(index), kind: 'correctValue', target: { table: 'coverage', id: row.CoverageID }, expect: { cells: { Status: 'Gap' } }, set: { Status: 'Limited comparability' },
            evidence, reason: 'A sweep from the command line.', actor: ${JSON.stringify(ACTOR)}, base: view.base,
          }]);
        },
      };`;
    const run = (file, ...flags) => spawnSync(process.execPath, ['packages/data/src/cli.ts', 'generate', file, '--workspace', sb.dir, ...flags], { cwd: root, encoding: 'utf8' });
    const wrong = join(sb.dir, 'wrong.mjs');
    const right = join(sb.dir, 'right.mjs');
    writeFileSync(wrong, module(27));
    writeFileSync(right, module(28));
    sb.ws.close();
    const bad = run(wrong, '--apply');
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.match(bad.stderr, /expected 27 command\(s\) and emitted 28; nothing was applied/);
    const dry = run(right);
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /28 command\(s\), as expected \(expectCount 28\); nothing applied/);
    const applied = run(right, '--apply');
    assert.equal(applied.status, 0, applied.stdout + applied.stderr);
    assert.match(applied.stdout, /28 applied/);
    const reopened = await sb.open();
    try {
      assert.equal(gaps(reopened), 0);
      assert.equal(journalSize(reopened), 28);
    } finally { reopened.close(); }
  } finally { sb.cleanup(); }
});
