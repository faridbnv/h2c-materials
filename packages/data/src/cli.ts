// npm run db:rebuild | db:roundtrip | db:diff | db:query | db:measure   (node packages/data/src/cli.ts <command> [flags])
//   rebuild   [--data <dir>] [--out <file>]          a fresh .workspace/atlas.sqlite from data/tables and the generated DDL
//   roundtrip [--data <dir>]                         CSV -> SQLite -> CSV; every table must come back byte-identical
//   diff      --against <git ref> [--limit <n>] [--db <file>]   the workspace database against the committed CSV at a ref
//   query     "<select ...>" [--json] [--db <file>]            read-only SQL on .workspace/atlas.sqlite
//   measure   [--out <file>]                         time rebuild and round trip three times each; write the medians
// Exit: 0 ok; 1 the check failed (a table differs, the data breaks a constraint, a diff was asked to fail); 64 bad usage;
// 70 the tool itself crashed (an uncaught error: a bug or a missing prerequisite, never a verdict). Only the flags above exist.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, arch, platform, release, totalmem, tmpdir } from 'node:os';
import { join } from 'node:path';
import { open } from './driver.ts';
import { diffAgainstRef } from './diff.ts';
import { DataInputError, DEFAULT_DATA_DIR, REPO_ROOT, WORKSPACE_DB, rebuildWorkspace } from './rebuild.ts';
import { roundtrip } from './roundtrip.ts';
import type { RoundtripResult } from './roundtrip.ts';

const REBUILD_BUDGET_MS = 5000;
const ROUNDTRIP_BUDGET_MS = 10000;

class UsageError extends Error {}

const SWITCHES: Record<string, readonly string[]> = { rebuild: [], roundtrip: [], diff: [], query: ['json'], measure: [] };
const VALUED: Record<string, readonly string[]> = {
  rebuild: ['data', 'out'], roundtrip: ['data'], diff: ['against', 'limit', 'db'], query: ['db'], measure: ['out'],
};

interface Parsed { readonly flags: Map<string, string | true>; readonly rest: readonly string[] }

function parseArgs(command: string, argv: readonly string[]): Parsed {
  const flags = new Map<string, string | true>();
  const rest: string[] = [];
  const switches = SWITCHES[command] ?? [];
  const valued = VALUED[command] ?? [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? '';
    if (!token.startsWith('--')) { rest.push(token); continue; }
    const name = token.slice(2);
    if (flags.has(name)) throw new UsageError(`${token} given twice`);
    if (switches.includes(name)) { flags.set(name, true); continue; }
    if (!valued.includes(name)) throw new UsageError(`unknown flag ${token} for ${command}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new UsageError(`${token} needs a value`);
    flags.set(name, value);
    i++;
  }
  return { flags, rest };
}

const flag = (parsed: Parsed, name: string): string | undefined => {
  const value = parsed.flags.get(name);
  return typeof value === 'string' ? value : undefined;
};
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
  const dataDir = flag(parsed, 'data') ?? DEFAULT_DATA_DIR;
  const dbPath = flag(parsed, 'out') ?? WORKSPACE_DB;
  const report = rebuildWorkspace({ dataDir, dbPath });
  console.log(`db:rebuild  ${dbPath}`);
  for (const line of report.checks) console.log(`  ok  ${line}`);
  console.log(`  ${report.tables.length} tables, ${report.rows} rows, ${report.views.length} views (${report.views.map((v) => `${v.view} ${v.rows}`).join(', ')})`);
  console.log(`  base stamp: commit ${report.stamp.commit?.slice(0, 12)}, manifest ${report.stamp.manifest_sha256?.slice(0, 12)}, SQLite ${report.stamp.sqlite_version}, Node ${report.stamp.node_version} (${report.stamp.driver_class})`);
  console.log(`  read ${secs(report.ms.read)}, load ${secs(report.ms.load)}, verify ${secs(report.ms.verify)}, total ${secs(report.ms.total)} (budget ${secs(REBUILD_BUDGET_MS)})`);
  return 0;
}

function runRoundtrip(parsed: Parsed): number {
  const dataDir = flag(parsed, 'data') ?? DEFAULT_DATA_DIR;
  const result = roundtrip({ dataDir });
  printRoundtrip(result, dataDir);
  return result.ok ? 0 : 1;
}

function runDiff(parsed: Parsed): number {
  const against = flag(parsed, 'against');
  if (against === undefined) throw new UsageError('db:diff needs --against <git ref>');
  const limit = Number(flag(parsed, 'limit') ?? 20);
  if (!Number.isInteger(limit) || limit < 0) throw new UsageError('--limit needs a whole number');
  const dbPath = flag(parsed, 'db') ?? WORKSPACE_DB;
  if (!existsSync(dbPath)) throw new UsageError(`${dbPath} does not exist; run npm run db:rebuild first`);
  const db = open(dbPath, { readOnly: true });
  try {
    const result = diffAgainstRef(db, against);
    console.log(`db:diff  ${dbPath} against ${against} (${result.sha.slice(0, 12)})`);
    for (const t of result.tables) {
      if (t.status === 'unchanged') continue;
      console.log(`  ${t.table}: ${t.status}${t.added.length ? `, ${t.added.length} added` : ''}${t.removed.length ? `, ${t.removed.length} removed` : ''}${t.changedRecords ? `, ${t.changedRecords} record(s) changed` : ''}${t.reordered ? ', order moved' : ''}`);
      for (const key of t.added.slice(0, limit)) console.log(`      + ${key}`);
      for (const key of t.removed.slice(0, limit)) console.log(`      - ${key}`);
      for (const c of t.changes.slice(0, limit)) console.log(`      ~ ${c.key}: ${c.column}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    }
    console.log(`DIFF: ${result.differences} difference(s) in ${result.tables.length} tables`);
    return 0;
  } finally {
    db.close();
  }
}

function runQuery(parsed: Parsed): number {
  const [sql, ...extra] = parsed.rest;
  if (sql === undefined || extra.length) throw new UsageError('db:query needs exactly one SQL string');
  const dbPath = flag(parsed, 'db') ?? WORKSPACE_DB;
  if (!existsSync(dbPath)) throw new UsageError(`${dbPath} does not exist; run npm run db:rebuild first`);
  const db = open(dbPath, { readOnly: true });
  try {
    const rows = db.prepare(sql).all();
    if (parsed.flags.has('json')) console.log(JSON.stringify(rows, null, 2));
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

function runMeasure(parsed: Parsed): number {
  const out = flag(parsed, 'out') ?? join(REPO_ROOT, 'remake/measure/sqlite-rebuild.json');
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
      if (!trip.ok) throw new Error(`measure: the round trip failed (${trip.identical}/${trip.expected}); fix that before recording a timing`);
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
      tables: last.tables.length,
      rows: last.rows,
      rebuild: { runsMs: rebuilds.map(Math.round), medianMs: Math.round(median(rebuilds)), budgetMs: REBUILD_BUDGET_MS, withinBudget: median(rebuilds) <= REBUILD_BUDGET_MS },
      roundtrip: { runsMs: roundtrips.map(Math.round), medianMs: Math.round(median(roundtrips)), budgetMs: ROUNDTRIP_BUDGET_MS, withinBudget: median(roundtrips) <= ROUNDTRIP_BUDGET_MS },
      peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
    };
    mkdirSync(join(out, '..'), { recursive: true });
    writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`db:measure  rebuild median ${secs(record.rebuild.medianMs)} (budget ${secs(REBUILD_BUDGET_MS)}), round trip median ${secs(record.roundtrip.medianMs)} (budget ${secs(ROUNDTRIP_BUDGET_MS)}), peak ${record.peakRssMb} MB`);
    console.log(`wrote ${out}`);
    return record.rebuild.withinBudget && record.roundtrip.withinBudget ? 0 : 1;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const COMMANDS: Record<string, (parsed: Parsed) => number> = {
  rebuild: runRebuild, roundtrip: runRoundtrip, diff: runDiff, query: runQuery, measure: runMeasure,
};

function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;
  const run = command === undefined ? undefined : COMMANDS[command];
  if (command === undefined || run === undefined) throw new UsageError(`usage: cli.ts <${Object.keys(COMMANDS).join('|')}> [flags]`);
  try {
    return run(parseArgs(command, rest));
  } catch (error) {
    if (error instanceof DataInputError) { console.error(`db:${command}: FAIL\n${error.message}`); return 1; }
    throw error;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (error instanceof UsageError) { console.error(error.message); process.exitCode = 64; }
  else { console.error(error instanceof Error ? (error.stack ?? error.message) : String(error)); process.exitCode = 70; }
}
