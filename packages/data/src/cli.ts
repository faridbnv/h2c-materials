// npm run db:rebuild | db:roundtrip | db:diff | db:query | db:measure | db:backup | db:restore | change:apply | change:generate |
//         change:export | change:replay | change:status | change:coverage | report:reviewers | drafts:export | drafts:import
//         (node packages/data/src/cli.ts <command> [flags])
//   rebuild   [--data <dir>] [--out <file>]          a fresh .workspace/atlas.sqlite from data/tables and the generated DDL; a workspace
//                                                    that holds drafts is backed up, rebuilt and its drafts replayed, never thrown away
//   roundtrip [--data <dir>]                         CSV -> SQLite -> CSV; every table must come back byte-identical
//   diff      --against <git ref> [--limit <n>] [--db <file>]   the workspace database against the committed CSV at a ref
//   query     "<select ...>" [--json] [--db <file>]            read-only SQL on .workspace/atlas.sqlite
//   measure   [--out <file>]                         time rebuild and round trip three times each; write the medians
//   apply <file>        [--data <dir>] [--workspace <dir>]   apply the command(s) of a JSON file through the write service; stops at the first refusal
//   generate <module>   [--apply] [--data <dir>] [--workspace <dir>]   run a generator (a module whose default export is a sweep): its commands and
//                                                    their count; refused when the count is not the sweep's expectCount; with --apply, applied as one batch
//   export              --title <text> --topic <words-with-hyphens> [--generator <module>] [--data <dir>] [--workspace <dir>] [--out <dir>]
//                                                    the drafts as a change set (JSON) and canonical CSV in the sandbox export directory; a schema edit
//                                                    brings its schema files; --generator names the sweep that made them, whose expectCount must equal the records
//   coverage            [--ref <ref>] [--days <n>] [--range <a..b>] [--no-replay] [--out <file>]   the change-set coverage measurement over main's history (read only)
//   reviewers           [--out <file>] [--check] [--data <dir>]   the reviewer-kind report from the existing free-text cells (read only)
//   replay [<file>...]  [--data <dir>] [--tables <dir>] [--changesets <dir>] [--immutable-against <ref>]
//                                                    replay equality: each change set applied to a fresh rebuild of its base must give its result
//   status              [--data <dir>] [--workspace <dir>]   the base stamp, drafts, conflicts, backups and the export directory
//   backup              [--data <dir>] [--workspace <dir>]   an online backup of the workspace (the last 20 routine ones are kept; safety backups are not pruned)
//   restore <file>|--latest  [--data <dir>] [--workspace <dir>]   put a verified backup in place (the current file is backed up first)
//   drafts-export <file> / drafts-import <file>      the pending commands as a JSON text copy, and back into a workspace
// diff also takes --fail-on-diff (exit 1 when there is any difference).
// Exit: 0 ok; 1 the check failed (a table differs, the data breaks a constraint, a timing is over budget, --fail-on-diff found a
// difference); 3 nothing to check (change:replay with no change set: not run, never a pass); 64 bad usage; 70 the tool itself
// crashed (an uncaught error: a bug or a missing prerequisite, never a verdict).
// Only the flags above exist: a stray argument, an unknown or repeated flag, or a flag npm swallowed is a usage error, so a
// check can never run on the default data when it was asked to run on other data.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, arch, platform, release, totalmem, tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { WriteCommand } from '@atlas/domain/contracts';
import { ExportRefusedError, exportChangeSet, exportPending } from './export.ts';
import { parseCommand, readJson } from './parse.ts';
import { changeSetFiles, checkImmutable, exportDrafts, importDrafts, replayFile } from './replay.ts';
import type { ReplayResult } from './replay.ts';
import { Workspace, WriterLockedError, holdsDrafts, listBackups, modelOfDb, protectedDirHolding, takeLock } from './workspace.ts';
import type { WorkspaceOptions, WriterLock } from './workspace.ts';
import { open } from './driver.ts';
import type { Db } from './driver.ts';
import { diffAgainstRef } from './diff.ts';
import { measureCoverage, writeCoverageReport } from './coverage.ts';
import { renderReviewerKindReport, reviewerKindReport } from './reviewer-kinds.ts';
import { SweepCountError, SweepOutputError, applySweep, generatorRefOf, runSweep } from './sweep.ts';
import type { Sweep } from './sweep.ts';
import { DataInputError, DEFAULT_DATA_DIR, REPO_ROOT, WORKSPACE_DB, rebuildWorkspace } from './rebuild.ts';
import { roundtrip } from './roundtrip.ts';
import type { RoundtripResult } from './roundtrip.ts';

const REBUILD_BUDGET_MS = 5000;
const ROUNDTRIP_BUDGET_MS = 10000;

class UsageError extends Error {}

interface Parsed {
  /** The flags that carry a value, by name without the dashes. */
  readonly values: ReadonlyMap<string, string>;
  /** The flags that stand alone. */
  readonly switches: ReadonlySet<string>;
  /** Everything that is not a flag. */
  readonly rest: readonly string[];
}

interface Command {
  readonly run: (parsed: Parsed) => number | Promise<number>;
  /** The npm script that runs it, for messages (default `db:<name>`). */
  readonly script?: string;
  /** Flags that take a value. */
  readonly valued: readonly string[];
  /** Flags that stand alone. */
  readonly switches: readonly string[];
  /** Whether bare arguments (the SQL of db:query) are allowed. */
  readonly positional?: boolean;
}

function parseArgs(name: string, command: Command, argv: readonly string[]): Parsed {
  // `npm run db:roundtrip --data x` (no `--`) is read by npm as its own option and never reaches this program; npm leaves it in
  // the environment, which is the only trace. Running on the default data then would be a pass on the wrong input.
  for (const flag of [...command.valued, ...command.switches]) {
    if (process.env[`npm_config_${flag}`] !== undefined) throw new UsageError(`npm took --${flag} for itself; write npm run ${command.script ?? `db:${name}`} -- --${flag} <value>`);
  }
  const values = new Map<string, string>();
  const switches = new Set<string>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? '';
    if (!token.startsWith('--')) { rest.push(token); continue; }
    const flag = token.slice(2);
    if (values.has(flag) || switches.has(flag)) throw new UsageError(`${token} given twice`);
    if (command.switches.includes(flag)) { switches.add(flag); continue; }
    if (!command.valued.includes(flag)) throw new UsageError(`unknown flag ${token} for ${name}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new UsageError(`${token} needs a value`);
    values.set(flag, value);
    i++;
  }
  if (rest.length && !command.positional) throw new UsageError(`unexpected argument ${JSON.stringify(rest[0])} for ${name} (flags only; a value follows the flag that takes one)`);
  return { values, switches, rest };
}

const secs = (ms: number): string => `${(ms / 1000).toFixed(2)} s`;
const median = (values: readonly number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? Number.NaN;

function printRoundtrip(result: RoundtripResult, dataDir: string): void {
  console.log(`db:roundtrip  ${dataDir}  (${result.expected} tables in the schema)`);
  for (const t of result.tables) {
    const label = t.status === 'identical' ? 'identical' : t.status.toUpperCase();
    console.log(`  ${label.padEnd(12)} ${t.table.padEnd(22)} ${String(t.rows).padStart(6)} rows ${String(t.bytes).padStart(9)} bytes${t.detail ? `   ${t.detail}` : ''}`);
  }
  for (const problem of result.problems) console.log(`  PROBLEM      ${problem}`);
  console.log(`ROUNDTRIP: ${result.identical}/${result.expected} tables byte-identical`);
  console.log(`  read ${secs(result.ms.read)}, rebuild ${secs(result.ms.load)}, export and compare ${secs(result.ms.export)}, total ${secs(result.ms.total)} (budget ${secs(ROUNDTRIP_BUDGET_MS)})`);
  console.log(result.ok ? 'RESULT: pass' : 'RESULT: FAIL (the round trip passes only when every table of the schema is byte-identical)');
}

/** The sandbox rule for `--out`: a command writes nothing inside, or over, the data it reads or the repository's own data/. */
function requireOutsideData(out: string, dataDir: string, command: string): void {
  const protectedDir = protectedDirHolding(resolve(out), resolve(dataDir));
  if (protectedDir !== null) throw new UsageError(`--out ${out} is inside ${protectedDir}; ${command} writes only outside the data it reads`);
}

async function runRebuild(parsed: Parsed): Promise<number> {
  const dataDir = parsed.values.get('data') ?? DEFAULT_DATA_DIR;
  const dbPath = parsed.values.get('out') ?? WORKSPACE_DB;
  requireOutsideData(dbPath, dataDir, 'a rebuild');
  if (!holdsDrafts(dbPath)) {
    // Plain rebuild, under the writer lock: a draft applied by another process between the look and the swap would be lost otherwise.
    let lock: WriterLock;
    try { lock = takeLock(join(dirname(resolve(dbPath)), 'writer.lock')); } catch (error) { return verdictOf(error); }
    try {
      if (!holdsDrafts(dbPath)) return plainRebuild(dataDir, dbPath);
    } finally { lock.release(); }
  }
  // A workspace with work in it is never thrown away: the write service backs it up, rebuilds it and replays the drafts.
  const outcome = await Workspace.rebuild({ dataDir, workspaceDir: dirname(resolve(dbPath)), dbFile: basename(dbPath) });
  console.log(`db:rebuild  ${dbPath}  (kept the drafts)`);
  console.log(`  backup ${outcome.backup}`);
  console.log(`  replayed ${outcome.applied} draft(s), ${outcome.merged} already merged, ${outcome.conflicts.length} conflict(s)`);
  for (const c of outcome.conflicts) console.log(`  CONFLICT ${c.opId} (${c.code}): ${c.detail}`);
  return outcome.conflicts.length ? 1 : 0;
}

function plainRebuild(dataDir: string, dbPath: string): number {
  const report = rebuildWorkspace({ dataDir, dbPath });
  console.log(`db:rebuild  ${dbPath}`);
  for (const line of report.checks) console.log(`  ok  ${line}`);
  console.log(`  ${report.tables.length} tables, ${report.rows} rows, ${report.views.length} views (${report.views.map((v) => `${v.view} ${v.rows}`).join(', ')})`);
  console.log(`  base stamp: commit ${report.stamp.commit?.slice(0, 12)} (tree ${report.stamp.tree}), manifest ${report.stamp.manifest_sha256?.slice(0, 12)}, SQLite ${report.stamp.sqlite_version}, Node ${report.stamp.node_version} (${report.stamp.driver_class})`);
  console.log(`  read ${secs(report.ms.read)}, load ${secs(report.ms.load)}, verify ${secs(report.ms.verify)}, total ${secs(report.ms.total)} (budget ${secs(REBUILD_BUDGET_MS)})`);
  return 0;
}

function runRoundtrip(parsed: Parsed): number {
  const dataDir = parsed.values.get('data') ?? DEFAULT_DATA_DIR;
  const result = roundtrip({ dataDir });
  printRoundtrip(result, dataDir);
  return result.ok ? 0 : 1;
}

/** The workspace database (or the one named by `--db`), opened read-only; it must already exist. */
function openWorkspace(dbPath: string): Db {
  if (!existsSync(dbPath)) throw new UsageError(`${dbPath} does not exist; run npm run db:rebuild first`);
  return open(dbPath, { readOnly: true });
}

function runDiff(parsed: Parsed): number {
  const against = parsed.values.get('against');
  if (against === undefined) throw new UsageError('db:diff needs --against <git ref>');
  const limit = Number(parsed.values.get('limit') ?? 20);
  if (!Number.isInteger(limit) || limit < 0) throw new UsageError('--limit needs a whole number');
  const dbPath = parsed.values.get('db') ?? WORKSPACE_DB;
  const db = openWorkspace(dbPath);
  try {
    const result = diffAgainstRef(db, against, REPO_ROOT, modelOfDb(db));
    console.log(`db:diff  ${dbPath} against ${against} (${result.sha.slice(0, 12)})`);
    for (const t of result.tables) {
      if (t.status === 'unchanged') continue;
      const summary: string[] = [t.status];
      if (t.added.length) summary.push(`${t.added.length} added`);
      if (t.removed.length) summary.push(`${t.removed.length} removed`);
      if (t.changedRecords) summary.push(`${t.changedRecords} record(s) changed`);
      if (t.reordered) summary.push('order moved');
      console.log(`  ${t.table}: ${summary.join(', ')}`);
      for (const key of t.added.slice(0, limit)) console.log(`      + ${key}`);
      for (const key of t.removed.slice(0, limit)) console.log(`      - ${key}`);
      for (const c of t.changes.slice(0, limit)) console.log(`      ~ ${c.key}: ${c.column}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    }
    console.log(`DIFF: ${result.differences} difference(s) in ${result.tables.length} tables`);
    return parsed.switches.has('fail-on-diff') && result.differences > 0 ? 1 : 0;
  } finally {
    db.close();
  }
}

function runQuery(parsed: Parsed): number {
  const [sql, ...extra] = parsed.rest;
  if (sql === undefined || extra.length) throw new UsageError('db:query needs exactly one SQL string');
  const db = openWorkspace(parsed.values.get('db') ?? WORKSPACE_DB);
  try {
    const rows = db.prepare(sql).all();
    if (parsed.switches.has('json')) console.log(JSON.stringify(rows, null, 2));
    else {
      const columns = Object.keys(rows[0] ?? {});
      if (columns.length) console.log(columns.join('\t'));
      for (const row of rows) console.log(columns.map((c) => String(row[c] ?? 'NULL')).join('\t'));
      console.error(`${rows.length} row(s)`);
    }
    return 0;
  } finally {
    db.close();
  }
}

interface Timing {
  readonly runsMs: readonly number[];
  readonly medianMs: number;
  readonly budgetMs: number;
  readonly withinBudget: boolean;
}

function timing(runs: readonly number[], budgetMs: number): Timing {
  const middle = median(runs);
  return { runsMs: runs.map(Math.round), medianMs: Math.round(middle), budgetMs, withinBudget: middle <= budgetMs };
}

function runMeasure(parsed: Parsed): number {
  const out = parsed.values.get('out') ?? join(REPO_ROOT, 'remake/measure/sqlite-rebuild.json');
  requireOutsideData(out, DEFAULT_DATA_DIR, 'a measurement');
  const scratch = mkdtempSync(join(tmpdir(), 'atlas-measure-'));
  try {
    const rebuilds: number[] = [];
    const roundtrips: number[] = [];
    let last = null;
    for (let run = 0; run < 3; run++) {
      const built = rebuildWorkspace({ dbPath: join(scratch, `atlas-${run}.sqlite`) });
      rebuilds.push(built.ms.total);
      last = built;
      const trip = roundtrip();
      if (!trip.ok) {
        console.error(`db:measure: the round trip failed (${trip.identical}/${trip.expected}); fix that before recording a timing. Nothing was written.`);
        return 1;
      }
      roundtrips.push(trip.ms.total);
    }
    if (last === null) throw new Error('measure: no run happened');
    const cpu = cpus()[0];
    const record = {
      schema: 1,
      status: 'measured',
      measuredAt: new Date().toISOString(),
      machine: { os: `${platform()} ${release()}`, arch: arch(), cpu: cpu?.model ?? 'unknown', cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30) },
      node: last.stamp.node_version,
      sqlite: last.stamp.sqlite_version,
      driverClass: last.stamp.driver_class,
      commit: last.stamp.commit,
      tree: last.stamp.tree,
      tables: last.tables.length,
      rows: last.rows,
      rebuild: timing(rebuilds, REBUILD_BUDGET_MS),
      roundtrip: timing(roundtrips, ROUNDTRIP_BUDGET_MS),
      peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`db:measure  rebuild median ${secs(record.rebuild.medianMs)} (budget ${secs(REBUILD_BUDGET_MS)}), round trip median ${secs(record.roundtrip.medianMs)} (budget ${secs(ROUNDTRIP_BUDGET_MS)}), peak ${record.peakRssMb} MB`);
    console.log(`wrote ${out}`);
    return record.rebuild.withinBudget && record.roundtrip.withinBudget ? 0 : 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- the write service

/** The workspace options the flags give. A flag is the only way to move the sandbox, and it is never `data/`. */
function workspaceOptions(parsed: Parsed): WorkspaceOptions {
  const dataDir = parsed.values.get('data');
  const workspaceDir = parsed.values.get('workspace');
  return { ...(dataDir === undefined ? {} : { dataDir }), ...(workspaceDir === undefined ? {} : { workspaceDir }) };
}

/** A held lock or a refused export is a verdict (exit 1), not a crash; anything else is rethrown. */
function verdictOf(error: unknown): number {
  if (error instanceof ExportRefusedError) { console.error(`FAIL (${error.code}): ${error.message}`); return 1; }
  if (error instanceof WriterLockedError) { console.error(`FAIL: ${error.message}`); return 1; }
  throw error;
}

/**
 * Run `fn` on an open workspace. Conflicts the open check held are always printed, and a command that otherwise passes still fails
 * (exit 1) while any are held, unless `failOnConflicts` is off: a pass must not hide a draft that was left out.
 */
async function withWorkspace(parsed: Parsed, fn: (ws: Workspace) => Promise<number> | number, failOnConflicts = true): Promise<number> {
  let ws: Workspace | undefined;
  try {
    ws = await Workspace.open(workspaceOptions(parsed));
    const { rebased } = ws;
    if (rebased) {
      console.log(`open check: ${rebased.reason}; backed up to ${rebased.backup}; replayed ${rebased.applied} draft(s), ${rebased.merged} already merged, ${rebased.conflicts.length} conflict(s)`);
    }
    const code = await fn(ws);
    const held = ws.conflicts();
    for (const c of held) console.log(`  CONFLICT ${c.opId} (${c.code}): ${c.detail}`);
    if (held.length && failOnConflicts && code === 0) {
      console.log(`RESULT: FAIL (the command ran, but ${held.length} draft(s) no longer apply and are held as conflicts, not applied; write them again against what the records hold now)`);
      return 1;
    }
    return code;
  } catch (error) {
    return verdictOf(error);
  } finally { ws?.close(); }
}

/** What the quote check found for the record an opId made: a skipped one says so, it is never a pass. */
function quoteLine(ws: Workspace, opId: string): string {
  const check = ws.journal().find((e) => e.record.opId === opId)?.record.quoteCheck;
  if (check === undefined) return '';
  return check.status === 'verified' ? '    quote check: verified on its hash-checked page\n' : `    quote check: NOT RUN (${check.reason ?? 'store absent'}); the quote is not verified\n`;
}

/** What still rests on a record a command retired (a grade's measurements, profiles, prices, evidence): the person decides each; the command moved none. */
function dependentsLines(ws: Workspace, opId: string): string {
  const dependents = ws.journal().find((e) => e.record.opId === opId)?.record.args?.dependents;
  if (!Array.isArray(dependents) || dependents.length === 0) return '';
  const lines = dependents.flatMap((d) => (typeof d === 'object' && d !== null && !Array.isArray(d) ? [`      ${String(d.table).padEnd(12)} ${String(d.record).padEnd(14)} ${String(d.action)}`] : []));
  return `    ${dependents.length} record(s) still rest on it (this command moved none):\n${lines.join('\n')}\n`;
}

const oneFile = (parsed: Parsed, what: string): string => {
  const [file, ...extra] = parsed.rest;
  if (file === undefined || extra.length) throw new UsageError(`${what} needs exactly one file`);
  return file;
};

async function runApply(parsed: Parsed): Promise<number> {
  const file = oneFile(parsed, 'change:apply');
  const json = readJson(file);
  const items: readonly unknown[] = Array.isArray(json) ? json : [json];
  const commands: WriteCommand[] = [];
  const problems: string[] = [];
  items.forEach((item, k) => {
    const command = parseCommand(item);
    if (command.ok) commands.push(command.value);
    else problems.push(...command.problems.map((p) => `command ${k + 1}: ${p}`));
  });
  if (commands.length === 0 && problems.length === 0) {
    console.error(`change:apply: ${file} holds no commands; nothing was applied`);
    return 1;
  }
  if (problems.length) {
    console.error(`change:apply: ${file} has ${problems.length} problem(s); nothing was applied:\n  ${problems.join('\n  ')}`);
    return 1;
  }
  return withWorkspace(parsed, (ws) => {
    let applied = 0;
    for (const command of commands) {
      const result = ws.apply(command);
      if (result.status === 'refused') {
        console.log(`  REFUSED  ${command.opId}  ${result.code}: ${result.detail}`);
        if (result.code === 'stale') console.log(`           expected ${JSON.stringify(result.expected)}\n           found    ${JSON.stringify(result.current)}`);
        console.log(`change:apply: ${applied} applied before the refusal; ${commands.length - applied - 1} command(s) after it were not tried. RESULT: FAIL`);
        return 1;
      }
      console.log(`  ${result.status.toUpperCase().padEnd(9)} ${command.opId}  ${result.changeRecordIds.join(', ')}`);
      process.stdout.write(quoteLine(ws, command.opId));
      process.stdout.write(dependentsLines(ws, command.opId));
      applied++;
    }
    const journal = ws.journal();
    const unchecked = commands.filter((c) => { const record = journal.find((e) => e.record.opId === c.opId)?.record; return record?.evidence !== undefined && record.quoteCheck?.status !== 'verified'; }).length;
    console.log(`change:apply: ${applied} of ${commands.length} command(s) done (draft, not approved)${unchecked ? `; ${unchecked} without a verified quote check (not run)` : ''}. RESULT: pass`);
    return 0;
  });
}

function runExport(parsed: Parsed): Promise<number> {
  const title = parsed.values.get('title');
  const topic = parsed.values.get('topic');
  if (title === undefined || topic === undefined) throw new UsageError('change:export needs --title <text> and --topic <words-with-hyphens>');
  const out = parsed.values.get('out');
  const generatorFile = parsed.values.get('generator');
  return withWorkspace(parsed, async (ws) => {
    const sweep = generatorFile === undefined ? undefined : await loadSweep(generatorFile);
    const result = await exportChangeSet(ws, { title, topic, ...(out === undefined ? {} : { exportDir: out }), ...(sweep === undefined ? {} : { generator: generatorRefOf(sweep) }) });
    console.log(`change:export  ${result.changeSet.id}${result.recovered ? '  (finished an interrupted export first)' : ''}`);
    console.log(`  ${result.changeSet.records.length} record(s) in ${result.tables.join(', ')}; base ${result.changeSet.base.snapshotDigest.slice(0, 12)} -> result ${result.changeSet.result.snapshotDigest.slice(0, 12)}`);
    for (const file of result.files) console.log(`  wrote ${file}`);
    for (const file of result.retired) console.log(`  removed ${file} (an earlier export's file that this one does not write)`);
    console.log(`  backup ${result.backup}`);
    const quoted = result.changeSet.records.filter((r) => r.evidence !== undefined);
    const unchecked = quoted.filter((r) => r.quoteCheck?.status !== 'verified').length;
    if (unchecked) console.log(`  quote check NOT RUN for ${unchecked} of ${quoted.length} record(s) with a quote: their quotes are not verified (see the change set)`);
    console.log('  impact: not computed (the impact preview is WP-11); sandbox only, nothing was written to data/. RESULT: pass');
    return 0;
  });
}

const isSweep = (value: unknown): value is Sweep =>
  typeof value === 'object' && value !== null && 'emit' in value && typeof value.emit === 'function' && 'path' in value && typeof value.path === 'string'
  && 'version' in value && typeof value.version === 'string' && 'args' in value && Array.isArray(value.args) && 'expectCount' in value && typeof value.expectCount === 'number';

/** A generator module: its default export (or `sweep`) is a Sweep. The code is the author's own, run like any script. */
async function loadSweep(file: string): Promise<Sweep> {
  const loaded: unknown = await import(pathToFileURL(resolve(file)).href);
  const candidates = typeof loaded === 'object' && loaded !== null ? [Reflect.get(loaded, 'default'), Reflect.get(loaded, 'sweep')] : [];
  const sweep = candidates.find(isSweep);
  if (sweep === undefined) throw new UsageError(`${file} does not export a sweep (a default export { path, version, args, expectCount, emit(view) })`);
  return sweep;
}

function runGenerate(parsed: Parsed): Promise<number> {
  const file = oneFile(parsed, 'change:generate');
  const apply = parsed.switches.has('apply');
  return withWorkspace(parsed, async (ws) => {
    const sweep = await loadSweep(file);
    try {
      if (!apply) {
        const { commands, ref } = runSweep(ws, sweep);
        console.log(`change:generate  ${ref.path} ${ref.version}: ${commands.length} command(s), as expected (expectCount ${ref.expectCount}); nothing applied (add --apply)`);
        for (const command of commands.slice(0, 5)) console.log(`  ${command.kind} ${command.target.table} ${command.target.id ?? ''}`);
        if (commands.length > 5) console.log(`  ... and ${commands.length - 5} more`);
        return 0;
      }
      const done = applySweep(ws, sweep);
      if (done.status === 'refused') {
        console.log(`  REFUSED  command ${done.batch.index + 1} (${done.batch.opId})  ${done.batch.result.code}: ${done.batch.result.detail}`);
        console.log('change:generate: the whole batch was refused; nothing was applied. RESULT: FAIL');
        return 1;
      }
      console.log(`change:generate: ${done.applied} applied, ${done.duplicates} already there, from ${done.ref.path} (expectCount ${done.ref.expectCount}). Export with: npm run change:export -- --generator ${file} --title ... --topic ... RESULT: pass`);
      return 0;
    } catch (error) {
      if (error instanceof SweepCountError || error instanceof SweepOutputError) { console.error(`FAIL: ${error.message}`); return 1; }
      throw error;
    }
  });
}

function runCoverage(parsed: Parsed): number {
  const out = parsed.values.get('out') ?? join(REPO_ROOT, 'remake/measure/change-set-coverage.json');
  requireOutsideData(out, DEFAULT_DATA_DIR, 'a coverage report');
  const days = parsed.values.get('days');
  const ref = parsed.values.get('ref');
  const range = parsed.values.get('range');
  if (days !== undefined && (!/^\d+$/.test(days) || Number(days) < 1)) throw new UsageError('--days needs a whole number of days');
  const report = measureCoverage({
    ...(ref === undefined ? {} : { ref }), ...(days === undefined ? {} : { days: Number(days) }), ...(range === undefined ? {} : { range }), replay: !parsed.switches.has('no-replay'),
  });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeCoverageReport(report, out);
  const { units, commits, byteReplay } = report;
  console.log(`change:coverage  ${report.window.ref} (last data commit ${report.window.anchor.slice(0, 10)}, ${report.window.anchorDate}): ${report.window.commits} commit(s) ${report.window.range ?? `in the ${report.window.days} days before`}`);
  console.log(`  ${units.total} change(s): ${units.expressed} expressed (${(100 * units.expressedShare).toFixed(1)}%), ${units.later} wait for WP-28, ${units.residue} residue`);
  console.log(`  ${commits.withSnapshotChange} commit(s) change the tables or a file beside them: ${commits.allExpressed} fully expressed, ${commits.withLater} with a change that waits, ${commits.withResidue} with residue (${(100 * commits.residueShare).toFixed(1)}%; ${commits.withResidueInTables} without counting files beside the tables, ${(100 * commits.residueShareInTables).toFixed(1)}%; ADR-03 trigger at ${100 * commits.adrRevisitTrigger.threshold}%: ${commits.adrRevisitTrigger.fired ? 'FIRED' : 'not fired'}, ${commits.adrRevisitTrigger.firedInTables ? 'fired' : 'not fired'} without those files)`);
  console.log(byteReplay.requested
    ? `  byte replay through the service: ${byteReplay.identical} identical, ${byteReplay.differs} differ, ${byteReplay.skipped} skipped (parent cannot be rebuilt under its own schema) of ${byteReplay.eligible} eligible commits`
    : '  byte replay through the service: not requested (--no-replay)');
  if (byteReplay.requested && byteReplay.skipped > 0) console.log(`  WARNING: ${byteReplay.skipped} eligible commit(s) were not replayed; the replay covers ${byteReplay.attempted}`);
  console.log(`  wrote ${out}`);
  return byteReplay.differs > 0 ? 1 : 0;
}

function runReviewers(parsed: Parsed): number {
  const out = resolve(parsed.values.get('out') ?? join(REPO_ROOT, 'docs/next/reviewer-kind-report.md'));
  const dataDir = parsed.values.get('data') ?? DEFAULT_DATA_DIR;
  requireOutsideData(out, dataDir, 'a report');
  const text = renderReviewerKindReport(reviewerKindReport(dataDir));
  if (parsed.switches.has('check')) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : null;
    if (current === text) { console.log(`report:reviewers: ${out} is current`); return 0; }
    console.error(`report:reviewers: ${out} is ${current === null ? 'missing' : 'stale'}; run npm run report:reviewers and commit it`);
    return 1;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`report:reviewers: wrote ${out}`);
  return 0;
}

/** How a replayed digest stands against the one the change set names. */
const comparedWith = (actual: string | null, expected: string, what: string): string =>
  actual === expected ? `= the change set's ${what}` : `<> expected ${expected.slice(0, 12)}`;

function printReplay(result: ReplayResult): void {
  const { baseDigest, resultDigest } = result;
  console.log(`change:replay  ${result.id}  (${result.records} record(s))`);
  console.log(`  base   ${baseDigest.actual.slice(0, 12)} ${comparedWith(baseDigest.actual, baseDigest.expected, 'base')}`);
  console.log(`  result ${resultDigest.actual?.slice(0, 12) ?? 'not computed'} ${comparedWith(resultDigest.actual, resultDigest.expected, 'result')}`);
  for (const t of result.tables) console.log(`  ${t.status.toUpperCase().padEnd(10)} ${t.table}${t.detail ? `   ${t.detail}` : ''}`);
  for (const line of result.quoteChecks) console.log(`  quote  ${line}`);
  for (const problem of result.problems) console.log(`  PROBLEM  ${problem}`);
}

/** The exported CSV to compare a change set with: --tables, or, beside an export (<root>/data/review/change-sets/x.json), <root>/data/tables. */
function exportedTablesDir(file: string, tablesFlag: string | undefined, dataDir: string): string | undefined {
  if (tablesFlag !== undefined) return tablesFlag;
  // A change set inside the snapshot itself (merged) sits beside every table, not only the ones it changed: no per-table comparison.
  if (resolve(file).startsWith(`${resolve(dataDir)}${sep}`)) return undefined;
  const beside = join(resolve(dirname(file), '..', '..', '..'), 'data', 'tables');
  return existsSync(beside) && basename(dirname(resolve(file))) === 'change-sets' ? beside : undefined;
}

/** The exit status of a check that had nothing to check: not run. */
const EXIT_NOT_RUN = 3;

function runReplay(parsed: Parsed): number {
  const dataDir = parsed.values.get('data') ?? DEFAULT_DATA_DIR;
  const tablesFlag = parsed.values.get('tables');
  const changesets = parsed.values.get('changesets');
  if (changesets !== undefined && !existsSync(changesets)) throw new UsageError(`--changesets ${changesets} does not exist`);
  const dir = changesets ?? join(dataDir, 'review', 'change-sets');
  const files = parsed.rest.length ? parsed.rest : changeSetFiles(dir);
  let failedSets = 0;
  for (const file of files) {
    const tablesDir = exportedTablesDir(file, tablesFlag, dataDir);
    // An export that stopped half-way is not compared.
    const exportDir = tablesDir === undefined ? undefined : dirname(dirname(tablesDir));
    if (exportDir !== undefined && exportPending(exportDir)) {
      console.log(`change:replay  ${file}\n  PROBLEM  an interrupted export is waiting in ${exportDir} (.save-journal.json); run change:export to finish it before comparing`);
      failedSets++;
      continue;
    }
    const result = replayFile(file, { dataDir, ...(tablesDir === undefined ? {} : { tablesDir }) });
    printReplay(result);
    if (!result.ok) failedSets++;
  }
  const ref = parsed.values.get('immutable-against');
  let immutabilityFailed = false;
  if (ref !== undefined) {
    const immutable = checkImmutable(ref);
    console.log(`change:replay  immutability against ${ref} (${immutable.sha.slice(0, 12)}): ${immutable.checked} change set(s) there`);
    for (const problem of immutable.problems) console.log(`  PROBLEM  ${problem}`);
    immutabilityFailed = immutable.problems.length > 0;
  }
  if (files.length === 0 && ref === undefined) {
    // Nothing was replayed, so nothing was proved: not a pass. wp:check reads a non-zero exit as a package that cannot pass.
    console.log(`change:replay: 0 change sets in ${dir}; nothing to replay`);
    console.log('RESULT: nothing-to-replay');
    return EXIT_NOT_RUN;
  }
  console.log(`REPLAY: ${files.length - failedSets}/${files.length} change set(s) replay to their result${ref === undefined ? '' : ', immutability checked'}`);
  const failed = failedSets > 0 || immutabilityFailed;
  console.log(failed ? 'RESULT: FAIL' : 'RESULT: pass');
  return failed ? 1 : 0;
}

function runStatus(parsed: Parsed): Promise<number> {
  return withWorkspace(parsed, (ws) => {
    const stamp = ws.stamp();
    console.log(`change:status  ${ws.paths.dbPath}`);
    console.log(`  approved base ${stamp.snapshotDigest} (commit ${stamp.commit.slice(0, 12)}); schema ${stamp.schemaSha256.slice(0, 12)}`);
    const drafts = ws.drafts();
    console.log(`  ${drafts.length} pending change(s)${drafts.length ? ':' : ''}`);
    for (const d of drafts) console.log(`    ${d.status.padEnd(9)} ${d.record.opId}  ${d.record.table} ${d.record.recordId}  ${Object.keys(d.record.after).join(', ')}${d.changeSetId ? `  in ${d.changeSetId}` : ''}`);
    const conflicts = ws.conflicts();
    console.log(`  ${conflicts.length} conflict(s)${conflicts.length ? ':' : ''}`);
    for (const c of conflicts) console.log(`    ${c.opId}  ${c.code}: ${c.detail}`);
    console.log(`  ${listBackups(ws.paths.backupDir).length} backup(s) in ${ws.paths.backupDir}`);
    console.log(`  export directory ${ws.paths.exportDir}${exportPending(ws.paths.exportDir) ? '  (an interrupted export is waiting: run change:export)' : ''}`);
    return 0;
  });
}

function runBackup(parsed: Parsed): Promise<number> {
  return withWorkspace(parsed, async (ws) => {
    const info = await ws.backup('manual');
    console.log(`db:backup  ${info.path}  (${info.pages} pages, verified${info.pruned.length ? `; ${info.pruned.length} oldest removed` : ''}). RESULT: pass`);
    return 0;
  }, false);
}

async function runRestore(parsed: Parsed): Promise<number> {
  const backupDir = join(parsed.values.get('workspace') ?? dirname(WORKSPACE_DB), 'backups');
  const latest = parsed.switches.has('latest');
  const file = latest ? listBackups(backupDir).at(-1) : parsed.rest[0];
  const extra = latest ? parsed.rest : parsed.rest.slice(1);
  if (file === undefined || extra.length > 0) throw new UsageError(`db:restore needs one backup file, or --latest (backups are in ${backupDir})`);
  try {
    const done = await Workspace.restore(workspaceOptions(parsed), resolve(file));
    console.log(`db:restore  ${done.restored}  (${done.drafts} pending change(s)); the file it replaced is saved as ${done.safety ?? 'nothing: there was no workspace'}. RESULT: pass`);
    return 0;
  } catch (error) {
    return verdictOf(error);
  }
}

function runDraftsExport(parsed: Parsed): Promise<number> {
  const file = oneFile(parsed, 'drafts:export');
  return withWorkspace(parsed, (ws) => {
    const written = exportDrafts(ws, file);
    console.log(`drafts:export  ${resolve(file)}  (${written.commands.length} command(s)). RESULT: pass`);
    return 0;
  });
}

function runDraftsImport(parsed: Parsed): Promise<number> {
  const file = oneFile(parsed, 'drafts:import');
  return withWorkspace(parsed, async (ws) => {
    const outcome = await importDrafts(ws, file);
    console.log(`drafts:import  ${file}: ${outcome.applied} applied, ${outcome.duplicates} already there, ${outcome.conflicts.length} kept as conflict(s)`);
    for (const c of outcome.conflicts) console.log(`  CONFLICT ${c.opId} (${c.code}): ${c.detail}`);
    console.log(outcome.conflicts.length ? 'RESULT: FAIL (some commands no longer apply; they are kept and shown, not applied)' : 'RESULT: pass');
    return outcome.conflicts.length ? 1 : 0;
  });
}

const COMMANDS: Record<string, Command> = {
  rebuild: { run: runRebuild, valued: ['data', 'out'], switches: [] },
  roundtrip: { run: runRoundtrip, valued: ['data'], switches: [] },
  diff: { run: runDiff, valued: ['against', 'limit', 'db'], switches: ['fail-on-diff'] },
  query: { run: runQuery, valued: ['db'], switches: ['json'], positional: true },
  measure: { run: runMeasure, valued: ['out'], switches: [] },
  apply: { run: runApply, script: 'change:apply', valued: ['data', 'workspace'], switches: [], positional: true },
  generate: { run: runGenerate, script: 'change:generate', valued: ['data', 'workspace'], switches: ['apply'], positional: true },
  export: { run: runExport, script: 'change:export', valued: ['data', 'workspace', 'title', 'topic', 'out', 'generator'], switches: [] },
  coverage: { run: runCoverage, script: 'change:coverage', valued: ['ref', 'days', 'range', 'out'], switches: ['no-replay'] },
  reviewers: { run: runReviewers, script: 'report:reviewers', valued: ['out', 'data'], switches: ['check'] },
  replay: { run: runReplay, script: 'change:replay', valued: ['data', 'tables', 'changesets', 'immutable-against'], switches: [], positional: true },
  status: { run: runStatus, script: 'change:status', valued: ['data', 'workspace'], switches: [] },
  backup: { run: runBackup, script: 'db:backup', valued: ['data', 'workspace'], switches: [] },
  restore: { run: runRestore, script: 'db:restore', valued: ['data', 'workspace'], switches: ['latest'], positional: true },
  'drafts-export': { run: runDraftsExport, script: 'drafts:export', valued: ['data', 'workspace'], switches: [], positional: true },
  'drafts-import': { run: runDraftsImport, script: 'drafts:import', valued: ['data', 'workspace'], switches: [], positional: true },
};

async function main(argv: readonly string[]): Promise<number> {
  const [name, ...rest] = argv;
  const command = name === undefined ? undefined : COMMANDS[name];
  if (name === undefined || command === undefined) throw new UsageError(`usage: cli.ts <${Object.keys(COMMANDS).join('|')}> [flags]`);
  try {
    return await command.run(parseArgs(name, command, rest));
  } catch (error) {
    if (error instanceof DataInputError) { console.error(`db:${name}: FAIL\n${error.message}`); return 1; }
    throw error;
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  if (error instanceof UsageError) { console.error(error.message); process.exitCode = 64; }
  else { console.error(error instanceof Error ? (error.stack ?? error.message) : String(error)); process.exitCode = 70; }
}
