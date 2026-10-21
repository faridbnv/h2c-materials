// npm run db:rebuild | db:roundtrip | db:diff | db:query | db:measure   (node packages/data/src/cli.ts <command> [flags])
//   rebuild   [--data <dir>] [--out <file>]          a fresh .workspace/atlas.sqlite from data/tables and the generated DDL
//   roundtrip [--data <dir>]                         CSV -> SQLite -> CSV; every table must come back byte-identical
//   diff      --against <git ref> [--limit <n>] [--db <file>]   the workspace database against the committed CSV at a ref
//   query     "<select ...>" [--json] [--db <file>]            read-only SQL on .workspace/atlas.sqlite
//   measure   [--out <file>]                         time rebuild and round trip three times each; write the medians
// diff also takes --fail-on-diff (exit 1 when there is any difference).
// Exit: 0 ok; 1 the check failed (a table differs, the data breaks a constraint, a timing is over budget, --fail-on-diff found a
// difference); 64 bad usage; 70 the tool itself crashed (an uncaught error: a bug or a missing prerequisite, never a verdict).
// Only the flags above exist: a stray argument, an unknown or repeated flag, or a flag npm swallowed is a usage error, so a
// check can never run on the default data when it was asked to run on other data.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, arch, platform, release, totalmem, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { open } from './driver.ts';
import type { Db } from './driver.ts';
import { diffAgainstRef } from './diff.ts';
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
  readonly run: (parsed: Parsed) => number;
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
    if (process.env[`npm_config_${flag}`] !== undefined) throw new UsageError(`npm took --${flag} for itself; write npm run db:${name} -- --${flag} <value>`);
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

function runRebuild(parsed: Parsed): number {
  const dataDir = parsed.values.get('data') ?? DEFAULT_DATA_DIR;
  const dbPath = parsed.values.get('out') ?? WORKSPACE_DB;
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
    const result = diffAgainstRef(db, against);
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

const COMMANDS: Record<string, Command> = {
  rebuild: { run: runRebuild, valued: ['data', 'out'], switches: [] },
  roundtrip: { run: runRoundtrip, valued: ['data'], switches: [] },
  diff: { run: runDiff, valued: ['against', 'limit', 'db'], switches: ['fail-on-diff'] },
  query: { run: runQuery, valued: ['db'], switches: ['json'], positional: true },
  measure: { run: runMeasure, valued: ['out'], switches: [] },
};

function main(argv: readonly string[]): number {
  const [name, ...rest] = argv;
  const command = name === undefined ? undefined : COMMANDS[name];
  if (name === undefined || command === undefined) throw new UsageError(`usage: cli.ts <${Object.keys(COMMANDS).join('|')}> [flags]`);
  try {
    return command.run(parseArgs(name, command, rest));
  } catch (error) {
    if (error instanceof DataInputError) { console.error(`db:${name}: FAIL\n${error.message}`); return 1; }
    throw error;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (error instanceof UsageError) { console.error(error.message); process.exitCode = 64; }
  else { console.error(error instanceof Error ? (error.stack ?? error.message) : String(error)); process.exitCode = 70; }
}
