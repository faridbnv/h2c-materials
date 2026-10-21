// The editor: the sandbox workspace, the private source store and the impact preview behind the operations the interface needs.
// Every change goes through the write service (`Workspace.apply`, `exportChangeSet`) and so through every one of its guards; nothing
// here writes a record any other way. Operations run one at a time, so a restore never meets a read half way.
import { basename, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import type { ChangeSet, CorrectValueCommand, WriteCommand } from '@atlas/domain/contracts';
import { isSha256, isSourceId, newOpId, sha256Of } from '@atlas/data/digest';
import { ExportRefusedError, exportChangeSet } from '@atlas/data/export';
import { readMeta } from '@atlas/data/write';
import type { JournalEntry } from '@atlas/data/write';
import { Workspace, WriterLockedError, listBackups } from '@atlas/data/workspace';
import type { WorkspaceOptions } from '@atlas/data/workspace';
import { REPO_ROOT } from '@atlas/data/rebuild';
import type {
  BackupEntry, Cells, ConflictAction, ConflictEntry, CorrectionRequest, CorrectionResponse, DraftEntry, EditorRefusalCode, ExportResponse,
  ImpactResponse, MeasurementDetail, ProductDetail, ProductHit, SourceInfo, SourcePage, WorkspaceState,
} from '../shared/api.ts';
import { engineImpact } from './impact.ts';
import type { ImpactProvider } from './impact.ts';
import { buildProductIndex, pageOfLocator, plainFactor, productDetail, recordOf, sourceRowOf } from './records.ts';
import type { ProductIndex } from './records.ts';
import { SOURCE_NOTES, digestOf, openSourceLibrary } from './source.ts';
import type { SourceLibrary } from './source.ts';

export interface EditorOptions {
  /** Where the sandbox lives (default `.workspace/`). */
  readonly workspaceDir?: string;
  /** The approved snapshot the workspace is built from (default `data/`, read only). */
  readonly dataDir?: string;
  /** The private source store (default: $H2C_SOURCE_BACKUP, $H2C_DOCUMENT_CACHE, then `.cache/`). */
  readonly sourceStore?: string;
  readonly env?: NodeJS.ProcessEnv;
  /** The impact preview (default: WP-11's, when it is on this branch). */
  readonly impact?: ImpactProvider;
  /** Make a backup this often while the editor runs, when something changed since the last one (default every ten minutes; 0 for never). */
  readonly backupEveryMs?: number;
  /** The clock the workspace names its backups by (tests); default the system's. */
  readonly now?: () => Date;
}

/** A request the editor turned down for its own reason, or the write service's refusal code. */
export type Refusal = Extract<CorrectionResponse, { status: 'refused' }>;
const refuse = (code: EditorRefusalCode, detail: string): Refusal => ({ status: 'refused', code, detail });

/** How a conflict was settled, or why it was not. */
export type Resolution = { readonly status: 'applied' | 'discarded' } | Refusal;

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Thrown for every request after the workspace could not be opened again: the service answers 503 `restart-needed` until the editor is restarted. */
export class RestartNeeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RestartNeeded';
  }
}

const rebasedOf = (ws: Workspace): WorkspaceState['rebased'] =>
  (ws.rebased === null ? null : { reason: ws.rebased.reason, applied: ws.rebased.applied, merged: ws.rebased.merged, conflicts: ws.rebased.conflicts.length });

/** How often the editor makes a backup while something has changed. The interface says the same. */
export const DEFAULT_BACKUP_EVERY_MS = 600_000;

const BACKUP_NAME = /^atlas-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z-([a-z-]+?)(?:-\d+)?\.sqlite$/;

function backupEntry(path: string): BackupEntry {
  const name = basename(path);
  const m = BACKUP_NAME.exec(name);
  const at = m === null ? null : `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`;
  return { name, at, reason: m?.[8] ?? 'unknown' };
}

const SLUG_TOPIC = /[^a-z0-9]+/g;
/** Words for the change set's file name: the records it holds, 40 characters at most. */
function topicOf(records: readonly { readonly table: string; readonly recordId: string }[]): string {
  const [first] = records;
  const head = `${first?.table ?? 'changes'}-${first?.recordId ?? ''}`.toLowerCase().replace(SLUG_TOPIC, '-');
  const topic = records.length > 1 ? `${head}-and-${records.length - 1}-more` : head;
  return topic.slice(0, 40).replace(/^-+|-+$/g, '') || 'corrections';
}

const cellsOf = (value: Cells | null | undefined): Cells => value ?? {};

export class Editor {
  readonly library: SourceLibrary;
  readonly impact: ImpactProvider;
  #ws: Workspace;
  readonly #wsOptions: WorkspaceOptions;
  #rebased: WorkspaceState['rebased'];
  readonly #backupEveryMs: number;
  /** Set when a restore left no workspace to work on; every later request is refused with it. */
  #restartNeeded: string | null = null;
  readonly #dataDir: string;
  #tail: Promise<unknown> = Promise.resolve();
  #index: { readonly digest: string; readonly value: ProductIndex } | null = null;
  #timer: NodeJS.Timeout | null = null;
  #impactRun: { readonly key: string; readonly promise: Promise<ImpactResponse> } | null = null;

  private constructor(ws: Workspace, wsOptions: WorkspaceOptions, library: SourceLibrary, impact: ImpactProvider, dataDir: string, backupEveryMs: number) {
    this.#ws = ws;
    this.#backupEveryMs = backupEveryMs;
    this.#wsOptions = wsOptions;
    this.library = library;
    this.impact = impact;
    this.#dataDir = dataDir;
    this.#rebased = rebasedOf(ws);
  }

  static async open(options: EditorOptions = {}): Promise<Editor> {
    const library = openSourceLibrary({ ...(options.sourceStore === undefined ? {} : { explicit: options.sourceStore }), ...(options.env === undefined ? {} : { env: options.env }), repoRoot: REPO_ROOT });
    const wsOptions: WorkspaceOptions = {
      store: library.textStore,
      ...(options.workspaceDir === undefined ? {} : { workspaceDir: options.workspaceDir }),
      ...(options.dataDir === undefined ? {} : { dataDir: options.dataDir }),
      ...(options.now === undefined ? {} : { now: options.now }),
    };
    const ws = await Workspace.open(wsOptions);
    const dataDir = ws.paths.dataDir;
    const impact = options.impact ?? engineImpact(dataDir);
    const every = options.backupEveryMs ?? DEFAULT_BACKUP_EVERY_MS;
    const editor = new Editor(ws, wsOptions, library, impact, dataDir, every);
    await editor.backupIfDue();
    if (every > 0) {
      editor.#timer = setInterval(() => { editor.backupIfDue().catch((error: unknown) => console.error(`backup failed: ${messageOf(error)}`)); }, every);
      editor.#timer.unref();
    }
    return editor;
  }

  /** Run `fn` after every earlier operation has finished. Refused outright once the workspace could not be opened again. */
  #run<T>(fn: () => T | Promise<T>, { whenBroken = false } = {}): Promise<T> {
    const guarded = (): T | Promise<T> => {
      if (this.#restartNeeded !== null && !whenBroken) throw new RestartNeeded(this.#restartNeeded);
      return fn();
    };
    const next = this.#tail.then(guarded, guarded);
    this.#tail = next.catch(() => undefined);
    return next;
  }

  async close(): Promise<void> {
    if (this.#timer !== null) clearInterval(this.#timer);
    await this.#run(() => { if (this.#restartNeeded === null) this.#ws.close(); }, { whenBroken: true });
    this.impact.close();
  }

  // ------------------------------------------------------------ the workspace strip

  state(): Promise<WorkspaceState> {
    return this.#run(() => {
      const ws = this.#ws;
      const stamp = ws.stamp();
      const manifestMoved = readMeta(ws.db, 'manifest_sha256') !== sha256Of(readFileSync(join(this.#dataDir, 'manifest.json')));
      const lastBackup = listBackups(ws.paths.backupDir).at(-1);
      return {
        sandbox: true, commit: stamp.commit, snapshotDigest: stamp.snapshotDigest,
        behind: manifestMoved ? 'The data moved since this workspace was built (a merge, a pull or a hand edit). Restart the editor: it rebuilds and re-applies your drafts.' : null,
        drafts: ws.drafts().length, conflicts: ws.conflicts().length, lastBackupAt: lastBackup === undefined ? null : backupEntry(lastBackup).at,
        rebased: this.#rebased, exportDir: ws.paths.exportDir,
        source: { available: this.library.root !== null, note: this.library.root === null ? 'Source not available on this computer. The private source store is not here.' : 'The private source store is available.' },
        impact: { available: this.impact.unavailable === null, note: this.impact.unavailable ?? 'The impact preview is available.' },
      };
    });
  }

  // ------------------------------------------------------------ find and read

  search(query: string): Promise<ProductHit[]> {
    return this.#run(() => {
      const digest = this.#ws.stamp().snapshotDigest;
      if (this.#index === null || this.#index.digest !== digest) this.#index = { digest, value: buildProductIndex(this.#ws.db) };
      return this.#index.value.search(query);
    });
  }

  #draftedMeasurements(): Set<string> {
    return new Set(this.#ws.drafts().filter((e) => e.record.table === 'measurements').map((e) => e.record.recordId));
  }

  product(gradeId: string): Promise<ProductDetail | null> {
    return this.#run(() => productDetail(this.#ws.db, gradeId, this.#draftedMeasurements()));
  }

  #sourceInfo(sourceId: string | null): SourceInfo | null {
    const row = sourceRowOf(this.#ws.db, sourceId);
    if (row !== null) return this.library.describe(row);
    return sourceId === null ? null : { sourceId, title: null, publisher: null, revision: null, accessState: null, sha256: null, availability: 'unknown-source', note: SOURCE_NOTES['unknown-source'], pageCount: null, imagePages: [] };
  }

  measurement(id: string): Promise<MeasurementDetail | null> {
    return this.#run(() => {
      const found = recordOf(this.#ws.db, 'measurements', id);
      if (found === null) return null;
      const stamp = this.#ws.stamp();
      return {
        id, property: found.cells.Property ?? '', cells: found.cells, base: { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit },
        source: this.#sourceInfo(found.cells.SourceID ?? null), pageHint: pageOfLocator(found.cells.Locator ?? null), factor: plainFactor(found.cells),
        pendingDraft: this.#draftedMeasurements().has(id),
      };
    });
  }

  /** A source and its digest, when the store holds the document. */
  #storedSource(sourceId: string): { readonly info: SourceInfo; readonly sha256: string } | null {
    const info = this.#sourceInfo(sourceId);
    return info === null || info.availability !== 'available' || info.sha256 === null ? null : { info, sha256: info.sha256 };
  }

  /** The stored text of one page of a source, or null when the store does not hold it. */
  sourcePage(sourceId: string, page: number): Promise<SourcePage | null> {
    return this.#run(() => {
      const stored = this.#storedSource(sourceId);
      if (stored === null) return null;
      const lines = this.library.pages(stored.sha256)?.get(page);
      return lines === undefined || stored.info.pageCount === null ? null : { sourceId, page, pageCount: stored.info.pageCount, lines };
    });
  }

  sourceImage(sourceId: string, page: number): Promise<string | null> {
    return this.#run(() => {
      const stored = this.#storedSource(sourceId);
      return stored === null ? null : this.library.imagePath(stored.sha256, page);
    });
  }

  // ------------------------------------------------------------ the correction

  /** A value correction, written against the values the writer saw. The write service decides; the editor adds only that the page must be on this computer. */
  correct(request: CorrectionRequest): Promise<CorrectionResponse> {
    return this.#run((): CorrectionResponse => {
      const ws = this.#ws;
      const found = recordOf(ws.db, 'measurements', request.measurementId);
      if (found === null) return refuse('not-found', `There is no measurement ${request.measurementId} in this workspace.`);
      const row = sourceRowOf(ws.db, found.cells.SourceID ?? null);
      const info = row === null ? null : this.library.describe(row);
      const sha256 = row === null ? null : digestOf(row.sha256);
      if (row === null || info === null || info.availability !== 'available' || sha256 === null) {
        return refuse('source-unavailable', info?.note ?? 'This record names no source in the sources table, so a correction cannot be checked against a page.');
      }
      const { snapshotDigest } = request.base;
      if (!isSourceId(row.sourceId) || !isSha256(snapshotDigest)) return refuse('bad-request', 'The correction names a source or a base that is not an ID.');
      const command: CorrectValueCommand = {
        opId: newOpId(), kind: 'correctValue', target: { table: 'measurements', id: request.measurementId }, expect: { cells: request.expect }, set: request.set,
        evidence: { sourceId: row.sourceId, sha256, page: request.evidence.page, locator: request.evidence.locator, quote: request.evidence.quote },
        reason: request.reason, actor: { kind: 'human', name: userInfo().username }, base: { snapshotDigest, commit: request.base.commit },
      };
      const result = ws.apply(command);
      if (result.status === 'refused') {
        return result.code === 'stale'
          ? { status: 'refused', code: 'stale', detail: result.detail, stale: { expected: cellsOf(result.expected.cells ?? request.expect), current: result.current.cells } }
          : { status: 'refused', code: result.code, detail: result.detail };
      }
      const entry = ws.drafts().find((e) => e.record.opId === command.opId);
      const check = entry?.record.quoteCheck;
      return { status: result.status, opId: command.opId, quoteCheck: check === undefined ? null : { status: check.status, reason: check.reason ?? null } };
    });
  }

  // ------------------------------------------------------------ drafts and conflicts

  #labelOf(table: string, recordId: string): string {
    if (table !== 'measurements') return `${table} ${recordId}`;
    const found = recordOf(this.#ws.db, 'measurements', recordId);
    if (found === null) return `Measurement ${recordId}`;
    const grade = recordOf(this.#ws.db, 'grades', found.cells.GradeID ?? '');
    return `${found.cells.Property ?? 'Value'} of ${grade?.cells['Product name'] ?? found.cells.GradeID ?? 'a product'} (${recordId})`;
  }

  #draftOf(entry: JournalEntry): DraftEntry | null {
    const { record } = entry;
    if (entry.status === 'merged') return null;
    const evidence = record.evidence === undefined ? null : { sourceId: record.evidence.sourceId, page: record.evidence.page, locator: record.evidence.locator, quote: record.evidence.quote };
    return {
      seq: entry.seq, opId: record.opId, status: entry.status, changeSetId: entry.changeSetId, table: record.table, recordId: record.recordId,
      label: this.#labelOf(record.table, record.recordId), before: record.before, after: record.after, reason: record.reason, evidence,
      quoteCheck: record.quoteCheck === undefined ? null : { status: record.quoteCheck.status, reason: record.quoteCheck.reason ?? null }, at: record.at,
    };
  }

  drafts(): Promise<DraftEntry[]> {
    return this.#run(() => this.#ws.drafts().flatMap((entry) => { const d = this.#draftOf(entry); return d === null ? [] : [d]; }));
  }

  #conflictOf(command: WriteCommand, code: string, detail: string, foundAt: string): ConflictEntry {
    const table = command.target.table;
    const recordId = command.target.id ?? '';
    const wanted = 'set' in command && command.set !== undefined ? command.set : {};
    const found = table === 'measurements' ? recordOf(this.#ws.db, table, recordId) : null;
    const now = found === null ? null : Object.fromEntries(Object.keys(wanted).map((name) => [name, found.cells[name] ?? null]));
    const cited = 'evidence' in command ? command.evidence : undefined;
    const evidence = cited === undefined ? null : { sourceId: cited.sourceId, page: cited.page, quote: cited.quote };
    return {
      opId: command.opId, code, detail, foundAt, table, recordId, label: this.#labelOf(table, recordId), expected: cellsOf(command.expect.cells), now, wanted,
      reason: command.reason, evidence,
    };
  }

  conflicts(): Promise<ConflictEntry[]> {
    return this.#run(() => this.#ws.conflicts().map((c) => this.#conflictOf(c.command, c.code, c.detail, c.foundAt)));
  }

  /**
   * Settle one conflict. "Apply my change" writes the draft again as a new command against what the record holds now (every
   * guard runs again); "discard" backs up first. The draft is dropped from the conflicts only when one of those has succeeded.
   */
  resolveConflict(opId: string, action: ConflictAction): Promise<Resolution> {
    return this.#run(async (): Promise<Resolution> => {
      const ws = this.#ws;
      const conflict = ws.conflicts().find((c) => c.opId === opId);
      if (conflict === undefined) return refuse('not-found', 'This conflict is no longer there.');
      const { command } = conflict;
      const drop = (): Promise<void> => ws.locked(() => { ws.db.prepare('DELETE FROM "change_conflicts" WHERE "op_id" = ?').run(opId); return Promise.resolve(); });
      if (action === 'discard') {
        await ws.backup('before-discard');
        await drop();
        return { status: 'discarded' };
      }
      if (command.kind !== 'correctValue') return refuse('bad-request', 'Only value corrections can be applied again in this version.');
      const found = recordOf(ws.db, command.target.table, command.target.id ?? '');
      if (found === null) return refuse('not-found', `The record ${command.target.id ?? ''} is no longer in the data.`);
      const stamp = ws.stamp();
      const expect = Object.fromEntries(Object.keys(command.set).map((name) => [name, found.cells[name] ?? null]));
      const again: CorrectValueCommand = { ...command, opId: newOpId(), expect: { cells: expect }, base: { snapshotDigest: stamp.snapshotDigest, commit: stamp.commit } };
      const result = ws.apply(again);
      if (result.status === 'refused') return { status: 'refused', code: result.code, detail: result.detail };
      await drop();
      return { status: 'applied' };
    });
  }

  // ------------------------------------------------------------ the impact preview

  /** Which answers the pending corrections would move. Runs outside the operation queue: it can take as long as the engine does. */
  async previewImpact(): Promise<ImpactResponse> {
    const pending = await this.#run(() => this.#ws.drafts().map((e) => e.record));
    if (pending.length === 0) return { status: 'nothing-pending', reason: 'There are no drafts yet, so there is nothing to preview.' };
    const key = pending.map((r) => r.id).join(',');
    if (this.#impactRun?.key === key) return this.#impactRun.promise;
    const promise = this.impact.preview(pending);
    this.#impactRun = { key, promise };
    return promise.finally(() => { if (this.#impactRun?.promise === promise) this.#impactRun = null; });
  }

  // ------------------------------------------------------------ backups and export

  backups(): Promise<BackupEntry[]> {
    return this.#run(() => listBackups(this.#ws.paths.backupDir).map(backupEntry).reverse());
  }

  /** A backup when the newest is older than the editor's interval (ten minutes by default) and something changed since it. */
  backupIfDue(): Promise<unknown> {
    return this.#run(() => this.#ws.backupIfDue(this.#backupEveryMs > 0 ? this.#backupEveryMs : DEFAULT_BACKUP_EVERY_MS));
  }

  backupNow(): Promise<BackupEntry> {
    return this.#run(async () => backupEntry((await this.#ws.backup('manual')).path));
  }

  /** Put a backup in place of the workspace, after a safety backup of what it replaces. The name must be one of the listed backups. */
  restore(name: string): Promise<{ readonly status: 'restored'; readonly drafts: number } | Refusal> {
    return this.#run(async () => {
      const chosen = listBackups(this.#ws.paths.backupDir).find((path) => basename(path) === name);
      if (chosen === undefined) return refuse('not-found', 'That backup is not in the list.');
      this.#ws.close();
      let outcome: { readonly status: 'restored'; readonly drafts: number } | Refusal;
      try {
        const restored = await Workspace.restore(this.#wsOptions, chosen);
        outcome = { status: 'restored', drafts: restored.drafts };
      } catch (error) {
        outcome = refuse(error instanceof WriterLockedError ? 'busy' : 'bad-request', messageOf(error));
      }
      // Opening again is its own step, with its own failure: a restore that worked must not read as one that did not, and an editor
      // with no open workspace must say so to every later request instead of failing in whatever way a closed database does.
      try {
        this.#ws = await Workspace.open(this.#wsOptions);
      } catch (error) {
        const said = outcome.status === 'restored' ? 'The backup was restored, but' : `The restore was refused (${outcome.detail}), and`;
        const detail = `${said} the editor could not open the workspace again (${messageOf(error)}). The editor must be restarted: stop it and run npm run editor.`;
        this.#restartNeeded = detail;
        if (this.#timer !== null) clearInterval(this.#timer);
        this.#index = null;
        return refuse('restart-needed', detail);
      }
      this.#index = null;
      this.#rebased = rebasedOf(this.#ws);
      return outcome;
    });
  }

  /** "Prepare review": the pending corrections become a change set and the changed tables, in the sandbox export folder, never in data/. */
  prepareReview(title: string): Promise<ExportResponse | Refusal> {
    return this.#run(async () => {
      const records = this.#ws.drafts().map((e) => e.record);
      try {
        const result = await exportChangeSet(this.#ws, { title, topic: topicOf(records) });
        const set: ChangeSet = result.changeSet;
        return { changeSetId: set.id, changeSetPath: result.changeSetPath, exportDir: result.exportDir, tables: result.tables, files: result.files, records: set.records.length };
      } catch (error) {
        if (error instanceof ExportRefusedError) return refuse('export-refused', error.message);
        if (error instanceof WriterLockedError) return refuse('busy', error.message);
        throw error;
      }
    });
  }
}
