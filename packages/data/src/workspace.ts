// The workspace: a SQLite copy of one approved snapshot plus labelled drafts, on this machine, never committed (WP-10; pack 04
// sections 3 and 9, 02 section 3.3). Before cutover it is a SANDBOX: it reads the frozen baseline (data/) and writes only under
// its own directory (.workspace/, git-ignored): the database, its backups and the exported change sets. It refuses to be placed
// inside the data it reads from (owner ruling Q2-08 B).
//
//   open        creates the workspace from the snapshot if there is none, or runs the open check: when Git moved (the manifest,
//               the schema or the storage DDL differ from the base stamp) it backs up, rebuilds from the CSV, and replays the
//               drafts in order, skipping any already in a merged change set; a draft whose `expect` no longer holds is kept as
//               a conflict and shown, never applied silently
//   apply       one command, one transaction, under the writer lock
//   backup      the SQLite online backup, verified, the last 20 kept
//   restore     a verified backup put in place by a rename, after a safety backup of what it replaces
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { ChangeLogEntry, ChangeRecord, CommandResult, Sha256, WriteCommand } from '@atlas/domain/contracts';
import { parseCsv } from './csv.ts';
import { sha256Of, snapshotDigestOf, toSha256 } from './digest.ts';
import type { TableDigest } from './digest.ts';
import { open } from './driver.ts';
import type { Db, Row } from './driver.ts';
import { defaultTextStore } from './evidence.ts';
import type { PageTextStore } from './evidence.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { parseChangeSet, parseCommand, readJson } from './parse.ts';
import { DEFAULT_DATA_DIR, REPO_ROOT, STORAGE_DDL, rebuildWorkspace, schemaDigest } from './rebuild.ts';
import type { BuildReport } from './rebuild.ts';
import { countRows, quoteIdent } from './storage.ts';
import { applyCommand, baseStampOf, initWorkspaceTables, readJournal, readMeta } from './write.ts';
import type { ApplyOptions, BaseStamp, JournalEntry, MergedOps, WriteContext } from './write.ts';

const WORKSPACE_DIR = join(REPO_ROOT, '.workspace');
export const DEFAULT_RULINGS = join(REPO_ROOT, 'docs/next/rulings.csv');
const BACKUPS_KEPT = 20;
const systemClock = (): Date => new Date();

// ---------------------------------------------------------------- paths

export interface WorkspaceOptions {
  /** The approved snapshot to read: data/ (frozen baseline on this branch). Never written. */
  readonly dataDir?: string;
  /** Where the sandbox lives: the database, `backups/`, `export/` and the lock. Default `.workspace/`. */
  readonly workspaceDir?: string;
  /** The database file name inside `workspaceDir`. */
  readonly dbFile?: string;
  /** The private text store; `null` for none (the quote check is then "not run"). Default: the old tool's cache, when it exists. */
  readonly store?: PageTextStore | null;
  readonly rulingsPath?: string;
  /** Where merged change sets are (default `<dataDir>/review/change-sets`). */
  readonly mergedChangeSetsDir?: string;
  readonly now?: () => Date;
}

export interface WorkspacePaths {
  readonly dataDir: string;
  readonly workspaceDir: string;
  readonly dbPath: string;
  readonly backupDir: string;
  readonly exportDir: string;
  readonly lockPath: string;
  readonly mergedChangeSetsDir: string;
}

const inside = (child: string, parent: string): boolean => {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
};

/**
 * The sandbox rule: the data directory being read, or the repository's own data/, that `path` lies inside or contains (nothing may be
 * written there: a directory that contains data/ is refused too, because an export writes `<dir>/data/...`), or null.
 */
export function protectedDirHolding(path: string, dataDir: string): string | null {
  return [dataDir, resolve(DEFAULT_DATA_DIR)].find((dir) => inside(path, dir) || inside(dir, path)) ?? null;
}

function resolvePaths(options: WorkspaceOptions = {}): WorkspacePaths {
  const dataDir = resolve(options.dataDir ?? DEFAULT_DATA_DIR);
  const workspaceDir = resolve(options.workspaceDir ?? WORKSPACE_DIR);
  const protectedDir = protectedDirHolding(workspaceDir, dataDir);
  if (protectedDir !== null) throw new Error(`the workspace ${workspaceDir} is inside ${protectedDir}; the write service works in a sandbox outside the data it reads (Q2-08 B)`);
  const dbFile = options.dbFile ?? 'atlas.sqlite';
  if (dbFile !== basename(dbFile) || dbFile === '') throw new Error(`the database file name ${JSON.stringify(dbFile)} must be a plain file name`);
  return {
    dataDir, workspaceDir, dbPath: join(workspaceDir, dbFile), backupDir: join(workspaceDir, 'backups'), exportDir: join(workspaceDir, 'export'),
    lockPath: join(workspaceDir, 'writer.lock'), mergedChangeSetsDir: resolve(options.mergedChangeSetsDir ?? join(dataDir, 'review', 'change-sets')),
  };
}

// ---------------------------------------------------------------- the writer lock (one writer per workspace)

interface LockHolder { readonly pid: number; readonly host: string; readonly since: string; readonly token: string }

export class WriterLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriterLockedError';
  }
}

export interface WriterLock { release(): void }

function readHolder(lockPath: string): LockHolder | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'pid' in parsed && 'host' in parsed && 'since' in parsed && 'token' in parsed
      && typeof parsed.pid === 'number' && typeof parsed.host === 'string' && typeof parsed.since === 'string' && typeof parsed.token === 'string') {
      return { pid: parsed.pid, host: parsed.host, since: parsed.since, token: parsed.token };
    }
  } catch { /* unreadable: treated as held below */ }
  return null;
}

const processAlive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (error) { return error instanceof Error && 'code' in error && error.code === 'EPERM'; }
};

/** Take the lock or throw WriterLockedError naming who holds it. A lock left by a process that is gone (same host) is taken over. */
export function takeLock(lockPath: string): WriterLock {
  mkdirSync(dirname(lockPath), { recursive: true });
  const holder: LockHolder = { pid: process.pid, host: hostname(), since: new Date().toISOString(), token: randomBytes(8).toString('hex') };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx');
      try { writeFileSync(fd, `${JSON.stringify(holder)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
      return {
        release() {
          // Only our own lock: a lock another process took over after we died is not ours to remove.
          if (readHolder(lockPath)?.token === holder.token) unlinkSync(lockPath);
        },
      };
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
      const current = readHolder(lockPath);
      if (current !== null && current.host === holder.host && !processAlive(current.pid)) {
        // The dead holder's lock is moved aside, not deleted: of two processes that both saw it dead only one rename finds the file,
        // and the moved file is checked to be the dead one's before it is thrown away.
        const aside = `${lockPath}.stale-${holder.token}`;
        try { renameSync(lockPath, aside); } catch (renameError) {
          if (renameError instanceof Error && 'code' in renameError && renameError.code === 'ENOENT') continue;
          throw renameError;
        }
        if (readHolder(aside)?.token === current.token) { rmSync(aside, { force: true }); continue; }
        // It was a fresh lock another process had just taken: put it back (if the place is still free) and give way.
        try { linkSync(aside, lockPath); } catch { /* the place is taken again; the file moved aside is that writer's old one */ }
        rmSync(aside, { force: true });
        throw new WriterLockedError(`another writer took the workspace while its stale lock was being cleared; one writer at a time`);
      }
      throw new WriterLockedError(current === null
        ? `${lockPath} exists and cannot be read; if no writer is running, remove it`
        : `another writer holds the workspace (process ${current.pid} on ${current.host} since ${current.since}); one writer at a time`);
    }
  }
  throw new WriterLockedError(`${lockPath} could not be taken (another writer took it first)`);
}

// ---------------------------------------------------------------- inputs the context needs

/** The IDs of the rulings file (first column "Id"). A missing file is an empty set: a rule row then has no ruling to cite. */
export function loadRulings(path: string): ReadonlySet<string> {
  if (!existsSync(path)) return new Set();
  const { header, records } = parseCsv(readFileSync(path, 'utf8'), path);
  const column = header.indexOf('Id');
  if (column < 0) throw new Error(`${path} has no "Id" column`);
  return new Set(records.map((r) => r.cells[column]).filter((id): id is string => typeof id === 'string'));
}

/** opId to the record of everything already in a merged change set. A file that does not parse stops the open: it is not skipped. */
function loadMergedOps(dir: string): MergedOps {
  const ops = new Map<string, ChangeRecord>();
  if (!existsSync(dir)) return ops;
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const parsed = parseChangeSet(readJson(join(dir, name)));
    if (!parsed.ok) throw new Error(`${join(dir, name)} is not a change set: ${parsed.problems.join('; ')}`);
    for (const record of parsed.value.records) ops.set(record.opId, record);
  }
  return ops;
}

// ---------------------------------------------------------------- the open check

export interface SnapshotManifest {
  /** The whole file, so that a rewritten manifest keeps every key it does not change. */
  readonly raw: Readonly<Record<string, unknown>>;
  readonly tables: Readonly<Record<string, { readonly rows: number; readonly sha256: string }>>;
}

export function readManifest(dataDir: string): SnapshotManifest {
  const raw = readJson(join(dataDir, 'manifest.json'));
  if (typeof raw !== 'object' || raw === null || !('tables' in raw) || typeof raw.tables !== 'object' || raw.tables === null) throw new Error(`${join(dataDir, 'manifest.json')} has no "tables" object`);
  const tables: Record<string, { rows: number; sha256: string }> = {};
  for (const [name, entry] of Object.entries(raw.tables)) {
    if (typeof entry === 'object' && entry !== null && 'rows' in entry && 'sha256' in entry && typeof entry.rows === 'number' && typeof entry.sha256 === 'string') tables[name] = { rows: entry.rows, sha256: entry.sha256 };
    else throw new Error(`manifest.json: ${name} is not { rows, sha256 }`);
  }
  return { raw: Object.fromEntries(Object.entries(raw)), tables };
}

/**
 * The CSV files under `dataDir` are the ones its manifest names (SHA-256 of each). A hand edit without `npm run data:fmt` leaves
 * them apart; the workspace is never opened or exported on such data, because a rebuild from it would be refused.
 */
function requireFilesMatchManifest(dataDir: string): void {
  const problems: string[] = [];
  for (const [table, entry] of Object.entries(readManifest(dataDir).tables)) {
    const file = join(dataDir, 'tables', `${table}.csv`);
    if (!existsSync(file)) problems.push(`${table}: the CSV file is missing`);
    else if (entry.sha256 !== sha256Of(readFileSync(file))) problems.push(`${table}: the CSV differs from the manifest's SHA-256 (a hand edit without npm run data:fmt?)`);
  }
  if (problems.length) throw new Error(`${dataDir} is not a consistent snapshot:\n  ${problems.join('\n  ')}`);
}

/** Why the workspace is behind Git (what differs from its base stamp), or null when it is current. */
export function behindReason(db: Db, dataDir: string): string | null {
  const manifestPath = join(dataDir, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} is missing: ${dataDir} is not a data snapshot`);
  requireFilesMatchManifest(dataDir);
  const reasons: string[] = [];
  if (readMeta(db, 'manifest_sha256') !== sha256Of(readFileSync(manifestPath))) reasons.push('data/manifest.json moved (a merge, a pull or a hand edit)');
  if (readMeta(db, 'schema_sha256') !== schemaDigest()) reasons.push('the schema moved');
  if (readMeta(db, 'storage_ddl_sha256') !== sha256Of(readFileSync(STORAGE_DDL, 'utf8'))) reasons.push('the generated storage DDL moved');
  return reasons.length ? reasons.join('; ') : null;
}

/** The snapshot digest of a build: from the per-table row counts and digests it verified against the manifest. */
export function snapshotDigestOfReport(report: BuildReport): Sha256 {
  return snapshotDigestOf(new Map<TableName, TableDigest>(report.tables.map((t) => [t.table, { rows: t.rows, sha256: toSha256(t.sha256) }] as const)));
}

const hasTable = (db: Db, name: string): boolean => db.prepare("SELECT 1 AS found FROM sqlite_schema WHERE type = 'table' AND name = ?").get(name) !== undefined;

/** The journal entries that are not yet in a merged change set. */
const pendingEntries = (db: Db): number => Number(db.prepare(`SELECT count(*) AS n FROM "change_log" WHERE "status" <> 'merged'`).get()?.n);

/** Whether the file at `path` holds journal entries or conflicts (work that a rebuild would lose). */
export function holdsDrafts(path: string): boolean {
  if (!existsSync(path)) return false;
  const db = open(path, { readOnly: true });
  try {
    if (!hasTable(db, 'change_log')) return false;
    return pendingEntries(db) > 0 || (hasTable(db, 'change_conflicts') && countRows(db, 'change_conflicts') > 0);
  } finally { db.close(); }
}

export interface ConflictEntry { readonly opId: string; readonly code: string; readonly detail: string; readonly foundAt: string; readonly command: WriteCommand }

export interface RebaseReport {
  readonly reason: string;
  readonly backup: string;
  readonly applied: number;
  readonly merged: number;
  readonly conflicts: readonly ConflictEntry[];
}

export interface BackupInfo { readonly path: string; readonly pages: number; readonly pruned: readonly string[] }

const BACKUP_REASON = /^[a-z][a-z-]*$/;

/** The journal columns a merged entry keeps when the workspace is rebuilt (its status becomes `merged`). */
const KEPT_COLUMNS = ['op_id', 'change_record_id', 'command_sha256', 'command_json', 'record_json', 'table_name', 'record_id', 'kind', 'applied_at', 'change_set_id'];
const INSERT_MERGED = `INSERT INTO "change_log" (${KEPT_COLUMNS.map(quoteIdent).join(', ')}, "status") VALUES (${KEPT_COLUMNS.map(() => '?').join(', ')}, 'merged')`;

/** Backups, oldest first (the names sort by time). */
export function listBackups(backupDir: string): string[] {
  return existsSync(backupDir) ? readdirSync(backupDir).filter((f) => f.startsWith('atlas-') && f.endsWith('.sqlite')).sort().map((f) => join(backupDir, f)) : [];
}

function requireIntegrity(db: Db, path: string): void {
  const integrity = db.prepare('PRAGMA integrity_check').all().map((row) => String(Object.values(row)[0]));
  if (integrity.length !== 1 || integrity[0] !== 'ok') throw new Error(`${path}: integrity_check says ${integrity.join('; ')}`);
}

/** A backup is usable when it opens, passes `integrity_check`, and holds the workspace tables. Throws, naming why not. */
export function verifyWorkspaceFile(path: string): { readonly drafts: number } {
  const db = open(path, { readOnly: true });
  try {
    requireIntegrity(db, path);
    for (const name of ['_meta', 'change_log', 'change_conflicts', ...TABLE_NAMES]) {
      if (!hasTable(db, name)) throw new Error(`${path} has no table ${name}; it is not a workspace backup`);
    }
    baseStampOf(db);
    return { drafts: pendingEntries(db) };
  } finally { db.close(); }
}

/** When a backup was made, read from its name (`atlas-<yyyymmdd>T<hhmmssmmm>Z-<reason>.sqlite`), or null when the name does not say. */
function backupTime(path: string): number | null {
  const stamp = /atlas-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z-/.exec(basename(path));
  if (!stamp) return null;
  const [, year, month, day, hour, minute, second, millis] = stamp;
  const at = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}Z`);
  return Number.isFinite(at) ? at : null;
}

const fileIdentity = (path: string): string => {
  const { dev, ino } = statSync(path);
  return `${dev}:${ino}`;
};

const sidecars = (path: string): string[] => [path, `${path}-journal`, `${path}-wal`, `${path}-shm`];

/** Why the existing workspace file must be rebuilt (Git moved, or it is a plain `db:rebuild` file), or null when it is current. */
function rebuildReason(paths: WorkspacePaths): string | null {
  const db = open(paths.dbPath);
  try {
    if (hasTable(db, 'change_log')) return behindReason(db, paths.dataDir);
    // A plain `db:rebuild` file: the snapshot without the workspace tables yet.
    if (readMeta(db, 'manifest_sha256') === undefined) throw new Error(`${paths.dbPath} is not a workspace (no base stamp); remove it and let the service rebuild it`);
    return 'the file had no workspace tables';
  } finally { db.close(); }
}

// ---------------------------------------------------------------- the workspace

export class Workspace implements Disposable {
  readonly paths: WorkspacePaths;
  readonly db: Db;
  readonly rulingsPath: string;
  readonly #store: PageTextStore | null;
  readonly now: () => Date;
  readonly #mergedOps: MergedOps;
  /** Which file this session opened: a restore or rebuild by another process replaces it, and this session must not go on writing to the old one. */
  readonly #fileId: string;
  /** Set when `open` ran the open check. */
  rebased: RebaseReport | null = null;

  private constructor(paths: WorkspacePaths, db: Db, options: WorkspaceOptions) {
    this.paths = paths;
    this.db = db;
    this.rulingsPath = options.rulingsPath ?? DEFAULT_RULINGS;
    this.#fileId = fileIdentity(paths.dbPath);
    this.#store = options.store === undefined ? defaultTextStore(REPO_ROOT) : options.store;
    this.now = options.now ?? systemClock;
    this.#mergedOps = loadMergedOps(paths.mergedChangeSetsDir);
  }

  /** Open the sandbox workspace: create it from the snapshot, or run the open check on the one there. */
  static async open(options: WorkspaceOptions = {}): Promise<Workspace> {
    const paths = resolvePaths(options);
    mkdirSync(paths.workspaceDir, { recursive: true });
    const lock = takeLock(paths.lockPath);
    try {
      let rebased: RebaseReport | null = null;
      if (!existsSync(paths.dbPath)) {
        Workspace.#build(paths);
      } else {
        const reason = rebuildReason(paths);
        if (reason !== null) rebased = await Workspace.#rebuildKeeping(paths, options, reason);
      }
      const db = open(paths.dbPath);
      db.exec('PRAGMA journal_mode = WAL');
      const ws = new Workspace(paths, db, options);
      ws.rebased = rebased;
      return ws;
    } finally { lock.release(); }
  }

  /** A fresh workspace from the snapshot, with its workspace tables. */
  static #build(paths: WorkspacePaths): void {
    const report = rebuildWorkspace({ dataDir: paths.dataDir, dbPath: paths.dbPath });
    const db = open(paths.dbPath);
    try { initWorkspaceTables(db, snapshotDigestOfReport(report)); } finally { db.close(); }
  }

  /**
   * Back up the file, rebuild it from the CSV, and replay the journal onto the new base. The caller holds the lock. The new
   * workspace is built and replayed beside the old one and put in place by a rename only when it is complete and verified, so a
   * failure or a crash at any point leaves the old file, drafts and all (and the backup is a second copy).
   */
  static async #rebuildKeeping(paths: WorkspacePaths, options: WorkspaceOptions, reason: string): Promise<RebaseReport> {
    const old = open(paths.dbPath);
    let backup: string;
    let rows: Row[] = [];
    let conflicts: ConflictEntry[] = [];
    try {
      backup = (await backupFile(old, paths, 'before-rebuild', options.now ?? systemClock)).path;
      if (hasTable(old, 'change_log')) {
        rows = old.prepare('SELECT * FROM "change_log" ORDER BY "seq"').all();
        conflicts = readConflicts(old);
      }
    } finally { old.close(); }
    const mergedOps = loadMergedOps(paths.mergedChangeSetsDir);
    // Everything in the journal is read and understood before anything is built.
    const carried = rows.map((row) => {
      const parsed = parseCommand(JSON.parse(String(row.command_json)));
      if (!parsed.ok) throw new Error(`the journal row ${String(row.op_id)} holds a command that does not parse (${parsed.problems.join('; ')}); the backup ${backup} has it`);
      return { row, command: parsed.value };
    });
    const staged = `${paths.dbPath}.rebase-${process.pid}`;
    for (const file of sidecars(staged)) rmSync(file, { force: true });
    try {
      Workspace.#build({ ...paths, dbPath: staged });
      const db = open(staged);
      const keepMerged = db.prepare(INSERT_MERGED);
      const commands: WriteCommand[] = [];
      let merged = 0;
      let outcome: ReplayOutcome;
      try {
        for (const { row, command } of carried) {
          // Merged is decided by the change sets on this base, not by what the journal said before: on a branch where the change set
          // is not merged, the correction is a draft again.
          if (mergedOps.has(String(row.op_id))) {
            // Already approved: its cells are in the new base. Kept in the journal so a retried opId is still a duplicate.
            keepMerged.run(...KEPT_COLUMNS.map((column) => row[column] ?? null));
            merged++;
          } else {
            commands.push(command);
          }
        }
        for (const conflict of conflicts) commands.push(conflict.command);
        outcome = replayCommands(contextOf(db, options, mergedOps), commands);
      } finally { db.close(); }
      verifyWorkspaceFile(staged);
      for (const file of sidecars(paths.dbPath)) rmSync(file, { force: true });
      renameSync(staged, paths.dbPath);
      return { reason, backup, applied: outcome.applied + outcome.duplicates, merged, conflicts: outcome.conflicts };
    } catch (error) {
      for (const file of sidecars(staged)) rmSync(file, { force: true });
      throw error;
    }
  }

  /** Rebuild the workspace from the snapshot, keeping its drafts (db:rebuild over a workspace that holds work). */
  static async rebuild(options: WorkspaceOptions = {}): Promise<RebaseReport> {
    const paths = resolvePaths(options);
    mkdirSync(paths.workspaceDir, { recursive: true });
    const lock = takeLock(paths.lockPath);
    try { return await Workspace.#rebuildKeeping(paths, options, 'rebuild requested'); } finally { lock.release(); }
  }

  #context(): WriteContext { return contextOf(this.db, { store: this.#store, rulingsPath: this.rulingsPath, now: this.now }, this.#mergedOps); }

  /** The base stamp: which approved snapshot this workspace is a copy of. */
  stamp(): BaseStamp { return baseStampOf(this.db); }

  /** Apply one command under the writer lock. A second writer gets a `writer-locked` refusal and nothing is written. */
  apply(command: WriteCommand, options: ApplyOptions = {}): CommandResult {
    let lock: WriterLock;
    try {
      lock = takeLock(this.paths.lockPath);
    } catch (error) {
      if (error instanceof WriterLockedError) return { status: 'refused', code: 'writer-locked', detail: error.message };
      throw error;
    }
    try {
      this.#requireSameFile();
      return applyCommand(this.#context(), command, options);
    } finally { lock.release(); }
  }

  #requireSameFile(): void {
    if (fileIdentity(this.paths.dbPath) !== this.#fileId) {
      throw new Error(`${this.paths.dbPath} was replaced by another process (a restore or a rebuild) since this session opened it; nothing was written. Close this workspace and open it again`);
    }
  }

  /** Run `fn` holding the writer lock (export, restore). Throws WriterLockedError when another writer holds it. */
  async locked<T>(fn: () => Promise<T>): Promise<T> {
    const lock = takeLock(this.paths.lockPath);
    try {
      this.#requireSameFile();
      return await fn();
    } finally { lock.release(); }
  }

  /** Replay commands onto this workspace (drafts:import): each applies or is kept as a conflict. Holds the writer lock. */
  replayDrafts(commands: readonly WriteCommand[]): Promise<ReplayOutcome> {
    return this.locked(() => Promise.resolve(replayCommands(this.#context(), commands)));
  }

  /** The journal in the order applied. */
  journal(statuses?: readonly ChangeLogEntry['status'][]): JournalEntry[] { return readJournal(this.db, statuses); }

  /** Pending work: drafts and exported-but-unmerged records. */
  drafts(): JournalEntry[] { return this.journal(['draft', 'exported']); }

  conflicts(): ConflictEntry[] { return readConflicts(this.db); }

  /** Online backup (SQLite's backup API, never a copy of the main file), verified before it counts, the last 20 kept. */
  async backup(reason: string): Promise<BackupInfo> {
    this.#requireSameFile();
    return backupFile(this.db, this.paths, reason, this.now);
  }

  /** A backup when the newest is older than `maxAgeMs` (default one hour: the editor calls this on a timer). Null when one is recent. */
  async backupIfDue(maxAgeMs = 3_600_000): Promise<BackupInfo | null> {
    const newest = listBackups(this.paths.backupDir).at(-1);
    const madeAt = newest === undefined ? null : backupTime(newest);
    if (madeAt !== null && this.now().getTime() - madeAt < maxAgeMs) return null;
    return this.backup('hourly');
  }

  /** Put a verified backup in place of the workspace file, after a safety backup of what it replaces. Close any open Workspace first. */
  static async restore(options: WorkspaceOptions, backupPath: string): Promise<{ readonly restored: string; readonly safety: string | null; readonly drafts: number }> {
    const paths = resolvePaths(options);
    mkdirSync(paths.workspaceDir, { recursive: true });
    const lock = takeLock(paths.lockPath);
    try {
      const { drafts } = verifyWorkspaceFile(backupPath); // refuses a backup that is damaged or is not a workspace, before touching anything
      // The backup is copied first: the safety backup below prunes to the last 20 and could otherwise remove the very file being restored.
      const staged = `${paths.dbPath}.restore-${process.pid}`;
      for (const file of sidecars(staged)) rmSync(file, { force: true });
      let safety: string | null = null;
      try {
        const source = open(backupPath, { readOnly: true });
        try { await source.backup(staged); } finally { source.close(); }
        verifyWorkspaceFile(staged);
        if (existsSync(paths.dbPath)) {
          const current = open(paths.dbPath);
          try { safety = (await backupFile(current, paths, 'before-restore', options.now ?? systemClock)).path; } finally { current.close(); }
        }
        for (const file of sidecars(paths.dbPath)) rmSync(file, { force: true }); // a stale -wal beside the restored file would be replayed onto it
        renameSync(staged, paths.dbPath);
      } catch (error) {
        for (const file of sidecars(staged)) rmSync(file, { force: true });
        throw error;
      }
      return { restored: backupPath, safety, drafts };
    } finally { lock.release(); }
  }

  close(): void { this.db.close(); }

  [Symbol.dispose](): void { this.close(); }
}

// ---------------------------------------------------------------- shared pieces

function contextOf(db: Db, options: Pick<WorkspaceOptions, 'store' | 'rulingsPath' | 'now'>, mergedOps: MergedOps): WriteContext {
  return {
    db,
    store: options.store === undefined ? defaultTextStore(REPO_ROOT) : options.store,
    rulings: loadRulings(options.rulingsPath ?? DEFAULT_RULINGS),
    mergedOps,
    now: options.now ?? systemClock,
  };
}

function readConflicts(db: Db): ConflictEntry[] {
  if (!hasTable(db, 'change_conflicts')) return [];
  return db.prepare('SELECT "op_id", "command_json", "code", "detail", "found_at" FROM "change_conflicts" ORDER BY "found_at", "op_id"').all().map((row) => {
    const parsed = parseCommand(JSON.parse(String(row.command_json)));
    if (!parsed.ok) throw new Error(`the conflict ${String(row.op_id)} holds a command that does not parse: ${parsed.problems.join('; ')}`);
    return { opId: String(row.op_id), code: String(row.code), detail: String(row.detail), foundAt: String(row.found_at), command: parsed.value };
  });
}

export interface ReplayOutcome {
  readonly applied: number;
  readonly duplicates: number;
  readonly conflicts: readonly ConflictEntry[];
}

/**
 * Apply commands in order onto the current base (rebased): each that applies becomes a draft, each that is refused is kept as a
 * conflict with the reason, never applied silently and never dropped. Used by the open check and by drafts:import.
 */
function replayCommands(ctx: WriteContext, commands: readonly WriteCommand[]): ReplayOutcome {
  let applied = 0;
  let duplicates = 0;
  const conflicts: ConflictEntry[] = [];
  const foundAt = ctx.now().toISOString();
  for (const command of commands) {
    const result = applyCommand(ctx, command, { rebase: true });
    switch (result.status) {
      case 'applied':
        applied++;
        break;
      case 'duplicate':
        duplicates++;
        break;
      case 'refused': {
        const conflict: ConflictEntry = { opId: command.opId, code: result.code, detail: result.detail, foundAt, command };
        ctx.db.prepare('INSERT OR REPLACE INTO "change_conflicts" ("op_id", "command_json", "code", "detail", "found_at") VALUES (?, ?, ?, ?, ?)')
          .run(conflict.opId, JSON.stringify(command), conflict.code, conflict.detail, foundAt);
        conflicts.push(conflict);
        break;
      }
    }
  }
  return { applied, duplicates, conflicts };
}

async function backupFile(db: Db, paths: WorkspacePaths, reason: string, now: () => Date): Promise<BackupInfo> {
  if (!BACKUP_REASON.test(reason)) throw new Error(`backup reason ${JSON.stringify(reason)} must be lowercase words joined by hyphens`);
  mkdirSync(paths.backupDir, { recursive: true });
  const stamp = now().toISOString().replace(/[-:]/g, '').replace('.', '');
  let target = join(paths.backupDir, `atlas-${stamp}-${reason}.sqlite`);
  for (let n = 2; existsSync(target); n++) target = join(paths.backupDir, `atlas-${stamp}-${reason}-${n}.sqlite`);
  const partial = `${target}.partial`;
  for (const file of sidecars(partial)) rmSync(file, { force: true });
  try {
    const pages = await db.backup(partial);
    // A backup that was not proved is not a backup: it is checked as a workspace before it takes its name.
    if (hasTable(db, 'change_log')) verifyWorkspaceFile(partial);
    else {
      const written = open(partial, { readOnly: true });
      try { requireIntegrity(written, partial); } finally { written.close(); }
    }
    renameSync(partial, target);
    const old = listBackups(paths.backupDir).slice(0, -BACKUPS_KEPT);
    for (const file of old) rmSync(file, { force: true });
    return { path: target, pages, pruned: old };
  } catch (error) {
    for (const file of sidecars(partial)) rmSync(file, { force: true });
    throw error;
  }
}

