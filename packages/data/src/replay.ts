// Replay equality, immutability and the drafts text copy (WP-10; pack 04 sections 6, 9 and 14: DP-10, DP-13).
//
//   change:replay    applies a change set to a fresh rebuild of its base snapshot, through the same command pipeline and guards as
//                    a live edit, and requires (a) the base digest it names, (b) the result digest it claims, and (c) when the
//                    exported CSV is at hand, those exact bytes. A change set that does not replay says exactly what differs.
//   immutability     a change set that is already on the base branch is byte-identical in the head (a merged one cannot change)
//   drafts:export    the pending commands as one JSON file, the recovery path if a workspace file is lost
//   drafts:import    replays that file into a workspace; what no longer applies is kept as a conflict, never dropped
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ChangeSet, QuoteCheck, WriteCommand } from '@atlas/domain/contracts';
import { snapshotDigestOf, tableDigests } from './digest.ts';
import { resolveRef } from './diff.ts';
import { defaultTextStore } from './evidence.ts';
import type { PageTextStore } from './evidence.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { parseChangeSet, parseCommand, readJson } from './parse.ts';
import { DEFAULT_DATA_DIR, REPO_ROOT, buildInMemory } from './rebuild.ts';
import { firstDifference } from './roundtrip.ts';
import { DEFAULT_RULINGS, loadRulings, protectedDirHolding, snapshotDigestOfReport } from './workspace.ts';
import type { ReplayOutcome, Workspace } from './workspace.ts';
import { applyCommand, commandOfRecord, initWorkspaceTables, readJournal } from './write.ts';

// ---------------------------------------------------------------- replay equality

export interface ReplayOptions {
  /** The approved snapshot the change set applies to. Default data/. Read only. */
  readonly dataDir?: string;
  /** The exported CSV to compare with (an export's `data/tables`). Without it only the digest is checked. */
  readonly tablesDir?: string;
  readonly store?: PageTextStore | null;
  readonly rulingsPath?: string;
}

export type TableCheck = { readonly table: string; readonly status: 'identical' | 'differs' | 'missing' | 'unexpected'; readonly detail: string };

export interface ReplayResult {
  readonly ok: boolean;
  readonly id: string;
  readonly records: number;
  readonly baseDigest: { readonly expected: string; readonly actual: string };
  readonly resultDigest: { readonly expected: string; readonly actual: string | null };
  readonly tables: readonly TableCheck[];
  /** One line per record that has evidence: what was checked, in the words of 04 section 5.1 (never a bare "verified"). */
  readonly quoteChecks: readonly string[];
  readonly problems: readonly string[];
}

function describeQuote(seq: number, recorded: QuoteCheck | undefined, replayed: QuoteCheck | undefined): string | null {
  if (recorded === undefined) return null;
  const at = `record ${seq}`;
  if (replayed !== undefined && recorded.opsDigest !== replayed.opsDigest) return `${at}: stale (the record's ops digest ${recorded.opsDigest.slice(0, 12)} is not the digest of what it now says, ${replayed.opsDigest.slice(0, 12)})`;
  if (replayed?.status === 'verified') return `${at}: verified here (quote found on its hash-checked page)`;
  if (recorded.status === 'verified') return `${at}: verified locally (ops digest ${recorded.opsDigest.slice(0, 12)}, commit ${recorded.commit.slice(0, 12)}; not re-checkable here: ${replayed?.reason ?? 'store absent'})`;
  return `${at}: not run: ${recorded.reason ?? 'store absent'}`;
}

/** The exported CSV of every table the change set changes against the replayed text, and any CSV the export holds beyond those. */
function compareTables(tablesDir: string, touched: ReadonlySet<TableName>, texts: ReadonlyMap<TableName, string>): TableCheck[] {
  const tables: TableCheck[] = [];
  for (const table of TABLE_NAMES.filter((t) => touched.has(t))) {
    const path = join(tablesDir, `${table}.csv`);
    if (!existsSync(path)) {
      tables.push({ table, status: 'missing', detail: `${path} does not exist` });
      continue;
    }
    const exported = readFileSync(path, 'utf8');
    const replayed = texts.get(table) ?? '';
    tables.push(exported === replayed ? { table, status: 'identical', detail: '' } : { table, status: 'differs', detail: firstDifference(exported, replayed) });
  }
  const files = existsSync(tablesDir) ? readdirSync(tablesDir).filter((f) => f.endsWith('.csv')) : [];
  for (const file of files) {
    const name = file.slice(0, -4);
    if (!TABLE_NAMES.some((t) => t === name && touched.has(t))) tables.push({ table: name, status: 'unexpected', detail: 'the export holds a CSV the change set does not change' });
  }
  return tables;
}

/** Apply `changeSet` to a fresh rebuild of the snapshot in `options.dataDir` and compare. Throws DataInputError if the snapshot itself does not rebuild. */
export function replayChangeSet(changeSet: ChangeSet, options: ReplayOptions = {}): ReplayResult {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const problems: string[] = [];
  const quoteChecks: string[] = [];
  const { db, report } = buildInMemory(dataDir);
  try {
    const actualBase = snapshotDigestOfReport(report);
    const baseDigest = { expected: changeSet.base.snapshotDigest, actual: actualBase };
    const failed = (): ReplayResult => ({ ok: false, id: changeSet.id, records: changeSet.records.length, baseDigest, resultDigest: { expected: changeSet.result.snapshotDigest, actual: null }, tables: [], quoteChecks, problems });
    if (actualBase !== changeSet.base.snapshotDigest) {
      problems.push(`the change set applies to snapshot ${changeSet.base.snapshotDigest.slice(0, 12)}, but ${dataDir} is snapshot ${actualBase.slice(0, 12)}: replay it on the base it names`);
      return failed();
    }
    initWorkspaceTables(db, actualBase);
    const rulings = loadRulings(options.rulingsPath ?? DEFAULT_RULINGS);
    const store = options.store === undefined ? defaultTextStore(REPO_ROOT) : options.store;
    for (const record of [...changeSet.records].sort((a, b) => a.seq - b.seq)) {
      let command: WriteCommand;
      try { command = commandOfRecord(record); } catch (error) { problems.push(`record ${record.seq} (${record.opId}): ${error instanceof Error ? error.message : String(error)}`); continue; }
      const result = applyCommand({ db, store, rulings, mergedOps: new Map(), now: () => new Date(record.at) }, command);
      if (result.status !== 'applied') {
        problems.push(`record ${record.seq} (${record.opId}) did not replay: ${result.status === 'refused' ? `refused ${result.code}: ${result.detail}` : 'its opId repeats an earlier record of the change set'}`);
      }
    }
    if (problems.length) return failed();

    const replayed = readJournal(db).map((entry) => entry.record);
    for (const record of changeSet.records) {
      const replayedCheck = replayed.find((r) => r.opId === record.opId)?.quoteCheck;
      const line = describeQuote(record.seq, record.quoteCheck, replayedCheck);
      if (line !== null) quoteChecks.push(line);
      // A record whose evidence no longer matches what its quote check was made on is not the change that was checked.
      if (record.quoteCheck !== undefined && replayedCheck !== undefined && record.quoteCheck.opsDigest !== replayedCheck.opsDigest) {
        problems.push(`record ${record.seq} (${record.opId}): its quote check is stale; the evidence or cells changed after it was made`);
      }
    }

    const touched = new Set<TableName>(changeSet.records.map((r) => r.table));
    const { digests, texts } = tableDigests(db, touched);
    const actualResult = snapshotDigestOf(digests);
    if (actualResult !== changeSet.result.snapshotDigest) {
      problems.push(`replaying gives snapshot ${actualResult.slice(0, 12)}, not the result ${changeSet.result.snapshotDigest.slice(0, 12)} the change set claims`);
    }
    const tables = options.tablesDir === undefined ? [] : compareTables(options.tablesDir, touched, texts);
    for (const t of tables) if (t.status !== 'identical') problems.push(`${t.table}: ${t.status}${t.detail ? ` (${t.detail})` : ''}`);
    return {
      ok: problems.length === 0, id: changeSet.id, records: changeSet.records.length, baseDigest,
      resultDigest: { expected: changeSet.result.snapshotDigest, actual: actualResult }, tables, quoteChecks, problems,
    };
  } finally { db.close(); }
}

const unreadable = (path: string, why: string): ReplayResult => ({
  ok: false, id: path, records: 0, baseDigest: { expected: '', actual: '' }, resultDigest: { expected: '', actual: null }, tables: [], quoteChecks: [], problems: [`${path} is not a readable change set: ${why}`],
});

/** Read a change-set file and replay it. A file that is not a change set is a failed result, not an exception. */
export function replayFile(path: string, options: ReplayOptions = {}): ReplayResult {
  let json: unknown;
  try { json = JSON.parse(readFileSync(path, 'utf8')); } catch (error) {
    return unreadable(path, error instanceof Error ? error.message : String(error));
  }
  const parsed = parseChangeSet(json);
  return parsed.ok ? replayChangeSet(parsed.value, options) : unreadable(path, parsed.problems.join('; '));
}

/** The change-set files of a directory, oldest name first. */
export const changeSetFiles = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f)) : []);

// ---------------------------------------------------------------- immutability

export interface ImmutabilityResult {
  readonly ref: string;
  readonly sha: string;
  /** Change-set files the ref holds. */
  readonly checked: number;
  readonly problems: readonly string[];
}

const git = (args: readonly string[], cwd: string): Buffer => execFileSync('git', args, { cwd, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

/** Every change set that `ref` holds under `dir` (repository-relative) is, byte for byte, in the working tree: none changed, none removed. */
export function checkImmutable(ref: string, dir = 'data/review/change-sets', repo: string = REPO_ROOT): ImmutabilityResult {
  const sha = resolveRef(ref, repo);
  const listed = git(['ls-tree', '-r', '--name-only', sha, '--', dir], repo).toString('utf8').split('\n').filter((f) => f.endsWith('.json'));
  const problems: string[] = [];
  for (const file of listed) {
    const head = join(repo, file);
    if (!existsSync(head)) problems.push(`${file} is in ${ref} and gone from the working tree; a merged change set is never removed`);
    else if (!readFileSync(head).equals(git(['show', `${sha}:${file}`], repo))) problems.push(`${file} differs from ${ref}; a merged change set is immutable`);
  }
  return { ref, sha, checked: listed.length, problems };
}

// ---------------------------------------------------------------- drafts text copy

const DRAFTS_FORMAT = 'atlas-drafts/1';

export interface DraftsFile {
  readonly format: typeof DRAFTS_FORMAT;
  readonly exportedAt: string;
  readonly base: { readonly snapshotDigest: string; readonly commit: string };
  /** Pending commands in the order applied, then the conflicts' commands. */
  readonly commands: readonly WriteCommand[];
}

/** The pending work as a text copy. Written beside its target and renamed, so a half-written file is never taken for one. */
export function exportDrafts(ws: Workspace, path: string): DraftsFile {
  const stamp = ws.stamp();
  const file: DraftsFile = {
    format: DRAFTS_FORMAT, exportedAt: ws.now().toISOString(), base: { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit },
    commands: [...ws.drafts().map((d) => d.command), ...ws.conflicts().map((c) => c.command)],
  };
  const target = resolve(path);
  const protectedDir = protectedDirHolding(target, ws.paths.dataDir);
  if (protectedDir !== null) throw new Error(`${target} is inside ${protectedDir}; the write service writes only to its sandbox before cutover (Q2-08 B)`);
  const partial = `${target}.partial-${process.pid}`;
  writeFileSync(partial, `${JSON.stringify(file, null, 2)}\n`);
  try { renameSync(partial, target); } catch (error) { rmSync(partial, { force: true }); throw error; }
  return file;
}

/** The commands of a drafts file. A file with a command that does not parse is refused whole: nothing is imported from it. */
export function readDraftsFile(path: string): WriteCommand[] {
  const parsed = readJson(path);
  if (typeof parsed !== 'object' || parsed === null || !('format' in parsed) || parsed.format !== DRAFTS_FORMAT || !('commands' in parsed) || !Array.isArray(parsed.commands)) {
    throw new Error(`${path} is not a drafts file (format ${DRAFTS_FORMAT})`);
  }
  const commands: WriteCommand[] = [];
  const problems: string[] = [];
  parsed.commands.forEach((raw: unknown, k) => {
    const command = parseCommand(raw);
    if (command.ok) commands.push(command.value); else problems.push(...command.problems.map((p) => `commands[${k}].${p}`));
  });
  if (problems.length) throw new Error(`${path}: ${problems.length} problem(s), nothing imported:\n  ${problems.join('\n  ')}`);
  return commands;
}

export async function importDrafts(ws: Workspace, path: string): Promise<ReplayOutcome> {
  return ws.replayDrafts(readDraftsFile(path));
}

