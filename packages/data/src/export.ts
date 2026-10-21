// Export (WP-10; pack 04 section 8): the drafts of a workspace become one change set (JSON, typed provenance) and the canonical
// CSV of the tables they changed, written to the SANDBOX export directory, never into data/. It reuses the stage, journal and
// promote steps of scripts/data/table-io.mjs (the digest lock, the write-ahead journal linked into place whole, rename promote
// with a recovery that finishes an interrupted promote).
//
//   1 Lock and check    the writer lock; the workspace must be current with Git (else the open check comes first)
//   2 Read once         every table from the one workspace connection, under the lock
//   3 Stage             candidate CSVs, the manifest and the change-set file under <export>/.save/<token>/
//   4 Re-import         the staged snapshot is loaded into a fresh database and must check out and equal the claimed result
//   5 Journal, promote  the journal names each staged file, its destination and digest; renames follow; a crash before the
//                       journal leaves the target exactly as it was, and one after it is finished by the next call
//
// What lands in <export>/data/ mirrors data/: tables/<t>.csv for each CHANGED table only, manifest.json (the whole manifest,
// the changed entries replaced), review/change-sets/<id>.json. An export holds every pending change since the approved base
// (drafts and exported-but-unmerged), so a change set always applies to the Git snapshot and `change:replay` can prove it.
import { randomBytes } from 'node:crypto';
import { closeSync, constants, copyFileSync, cpSync, existsSync, fsyncSync, linkSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { ChangeRecord, ChangeSet, GeneratorRef, Sha256 } from '@atlas/domain/contracts';
import { csvText, parseCsv } from './csv.ts';
import { isChangeSetId, sha256Of, snapshotDigestOf, tableDigests, toSha256 } from './digest.ts';
import type { TableDigest } from './digest.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { readJson } from './parse.ts';
import { buildInMemory } from './rebuild.ts';
import { replayChangeSet } from './replay.ts';
import { BASE_MODEL, modelWith } from './schema-model.ts';
import type { SchemaFiles, SchemaModel } from './schema-model.ts';
import { exportTable } from './storage.ts';
import { RULE_TABLES, tablesTouched } from './write.ts';
import { behindReason, protectedDirHolding, readManifest, snapshotDigestOfReport } from './workspace.ts';
import type { SnapshotManifest, Workspace } from './workspace.ts';

export type ExportRefusalCode =
  | 'nothing-to-export' | 'conflicts-pending' | 'stale-base' | 'rule-row-not-alone' | 'bad-title' | 'bad-topic' | 'unsafe-target' | 'workspace-drifted'
  | 'target-changed' | 'verification-failed' | 'change-set-immutable' | 'generator-count';

/** An export that did not complete. Nothing was promoted (or the interrupted promote is finished by the next call). */
export class ExportRefusedError extends Error {
  readonly code: ExportRefusalCode;
  constructor(code: ExportRefusalCode, message: string) {
    super(message);
    this.name = 'ExportRefusedError';
    this.code = code;
  }
}

export interface ExportHooks {
  /** Test hook, called after staging and verifying and before the journal: a target that moves here must stop the export. */
  readonly beforeCommit?: () => void;
  /** Test hook: stop with an error before the journal is written (a crash before the commit point). */
  readonly failBeforeCommit?: boolean;
  /** Test hook: stop after this many renames (a crash during promote, journal in place). */
  readonly failAfterRenames?: number;
}

export interface ExportOptions {
  readonly title: string;
  /** Short words joined by hyphens: it is in the file name ('pla-basic-density'). */
  readonly topic: string;
  /** Default: the workspace's `export/`. */
  readonly exportDir?: string;
  /** Present when the pending changes are the output of a generator: the change set names it, and its `expectCount` must be the number of records. */
  readonly generator?: GeneratorRef;
  readonly hooks?: ExportHooks;
}

export interface ExportResult {
  readonly changeSet: ChangeSet;
  readonly changeSetPath: string;
  readonly exportDir: string;
  readonly tables: readonly TableName[];
  readonly files: readonly string[];
  readonly backup: string;
  /** True when an interrupted export was found and finished first. */
  readonly recovered: boolean;
  /** Files of an earlier export that this one does not write, removed so they do not contradict its manifest. */
  readonly retired: readonly string[];
}

interface JournalFile { readonly staged: string; readonly to: string; readonly sha256: string }
interface Journal { readonly note: string; readonly token: string; readonly files: readonly JournalFile[]; readonly remove: readonly string[] }

const EXPORT_JOURNAL = '.save-journal.json';
const EXPORT_MARKER = '.atlas-export';
const EXPORT_STAGING = '.save';

const digestOf = (path: string): string | null => (existsSync(path) ? sha256Of(readFileSync(path)) : null);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function writeDurably(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, 'w');
  try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
}

/** Link the journal into place whole, and only while no other export holds one. */
function commitJournal(dir: string, journal: Journal): void {
  const path = join(dir, EXPORT_JOURNAL);
  const aside = `${path}.${journal.token}`;
  writeDurably(aside, `${JSON.stringify(journal, null, 2)}\n`);
  try {
    linkSync(aside, path);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error)) throw error;
    if (error.code === 'EEXIST') throw new ExportRefusedError('target-changed', `${EXPORT_JOURNAL} is held by another export; nothing was written`);
    if (!['EPERM', 'ENOTSUP', 'ENOSYS'].includes(String(error.code))) throw error;
    copyFileSync(aside, path, constants.COPYFILE_EXCL); // no hard links here: still refuses a second journal
  } finally { rmSync(aside, { force: true }); }
}

function removeStaging(dir: string, token: string): void {
  rmSync(join(dir, EXPORT_STAGING, token), { recursive: true, force: true });
  try { rmdirSync(join(dir, EXPORT_STAGING)); } catch { /* another export's folder is there, or none was made */ }
}

/** Rename every staged file over its destination (digest-checked, so doing it twice ends in the same state), remove what the export retires, then drop the journal. */
function promote(dir: string, journal: Journal, failAfter?: number): void {
  journal.files.forEach((file, i) => {
    if (failAfter === i) throw new Error(`export interrupted after ${i} of ${journal.files.length} renames (test hook)`);
    const from = resolve(dir, file.staged);
    const to = resolve(dir, file.to);
    if (existsSync(from)) {
      if (digestOf(from) !== file.sha256) throw new Error(`${file.staged} is not the file ${EXPORT_JOURNAL} recorded; the interrupted export cannot be finished`);
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
    } else if (digestOf(to) !== file.sha256) {
      throw new Error(`${EXPORT_JOURNAL} names ${file.to}, and neither its staged copy nor the file itself is the one it recorded; the interrupted export cannot be finished`);
    }
  });
  for (const gone of journal.remove) rmSync(resolve(dir, gone), { force: true });
  if (failAfter === journal.files.length) throw new Error(`export interrupted after all ${journal.files.length} renames, before its journal was removed (test hook)`);
  rmSync(join(dir, EXPORT_JOURNAL), { force: true });
  removeStaging(dir, journal.token);
}

function readJournalFile(dir: string): Journal | null {
  const path = join(dir, EXPORT_JOURNAL);
  if (!existsSync(path)) return null;
  const parsed = readJson(path);
  if (typeof parsed === 'object' && parsed !== null && 'token' in parsed && typeof parsed.token === 'string' && 'files' in parsed && Array.isArray(parsed.files) && 'remove' in parsed && Array.isArray(parsed.remove)) {
    const files: JournalFile[] = [];
    for (const f of parsed.files) {
      if (typeof f === 'object' && f !== null && 'staged' in f && 'to' in f && 'sha256' in f && typeof f.staged === 'string' && typeof f.to === 'string' && typeof f.sha256 === 'string') files.push({ staged: f.staged, to: f.to, sha256: f.sha256 });
      else throw new Error(`${path} lists a file entry that is not { staged, to, sha256 }`);
    }
    const journal: Journal = { note: 'note' in parsed && typeof parsed.note === 'string' ? parsed.note : '', token: parsed.token, files, remove: parsed.remove.map(String) };
    // A journal is followed blindly (renames and removals), so every path in it must lie inside the export directory.
    const paths = [...journal.files.flatMap((f) => [f.staged, f.to]), ...journal.remove];
    const outside = paths.find((rel) => { const out = relative(dir, resolve(dir, rel)); return out === '' || out === '..' || out.startsWith('..') || isAbsolute(out); });
    if (outside !== undefined) throw new Error(`${path} names ${outside}, which is outside ${dir}; it will not be followed`);
    return journal;
  }
  throw new Error(`${path} cannot be read as an export journal; it is linked into place whole, so this is damage, not an interrupted export`);
}

/** Finish an export that stopped after its journal was written: the new state, whole. True when one was found. */
function recoverExport(dir: string): boolean {
  const journal = readJournalFile(dir);
  if (journal === null) {
    // No journal: a staging folder is an export that never committed. The target was never touched; the leftovers go.
    rmSync(join(dir, EXPORT_STAGING), { recursive: true, force: true });
    return false;
  }
  promote(dir, journal);
  return true;
}

/** Whether an interrupted export is waiting in `dir`: the target may hold a mix until `recoverExport` runs. */
export const exportPending = (dir: string): boolean => existsSync(join(dir, EXPORT_JOURNAL));

// ---------------------------------------------------------------- the export

interface PlannedFile { readonly rel: string; readonly text: string }

const targetChanged = (files: readonly string[]): ExportRefusedError =>
  new ExportRefusedError('target-changed', `${files.join(', ')} changed in the export directory while this export ran; nothing was written. Run it again`);

/** A rule row travels alone in its change set (rule 4). */
function requireRuleRowAlone(records: readonly ChangeRecord[], touched: ReadonlySet<TableName>): void {
  const ruleRows = new Set(records.filter((r) => RULE_TABLES.has(r.table)).map((r) => `${r.table} ${r.recordId}`));
  if (ruleRows.size && (ruleRows.size > 1 || records.some((r) => !RULE_TABLES.has(r.table)))) {
    throw new ExportRefusedError('rule-row-not-alone', `a rule row travels alone in its change set, but this export holds ${[...ruleRows].join(', ')} with ${records.length} record(s) in ${[...touched].join(', ')}`);
  }
}

/** Every table no change record touches is still what the approved snapshot holds: nothing changed the workspace outside the service. */
function requireNoDrift(digests: ReadonlyMap<TableName, TableDigest>, manifest: SnapshotManifest, touched: ReadonlySet<TableName>): void {
  for (const table of TABLE_NAMES) {
    const now = digests.get(table);
    const was = manifest.tables[table];
    if (!touched.has(table) && (now?.sha256 !== was?.sha256 || now?.rows !== was?.rows)) {
      throw new ExportRefusedError('workspace-drifted', `${table} differs from the approved snapshot, but no change record touches it; the workspace was changed outside the write service. Restore a backup or rebuild it`);
    }
  }
}

function digestEntry(digests: ReadonlyMap<TableName, TableDigest>, table: TableName): TableDigest {
  const digest = digests.get(table);
  if (!digest) throw new Error(`internal: no digest for ${table}`);
  return digest;
}

/** Record that the files are in place. If this fails the files are still the right ones and the same export can be run again (the change-set ID follows from its content). */
function markExported(ws: Workspace, records: readonly ChangeRecord[], changeSetId: string): void {
  ws.db.transaction((tx) => {
    const mark = tx.prepare(`UPDATE "change_log" SET "status" = 'exported', "change_set_id" = ? WHERE "op_id" = ? AND "status" IN ('draft', 'exported')`);
    for (const r of records) {
      if (Number(mark.run(changeSetId, r.opId).changes) !== 1) throw new Error(`internal: ${r.opId} could not be marked exported`);
    }
  });
}

export async function exportChangeSet(ws: Workspace, options: ExportOptions): Promise<ExportResult> {
  const dir = resolve(options.exportDir ?? ws.paths.exportDir);
  const protectedDir = protectedDirHolding(dir, ws.paths.dataDir);
  if (protectedDir !== null) throw new ExportRefusedError('unsafe-target', `${dir} is inside ${protectedDir}; before cutover the write service exports only to its sandbox (Q2-08 B)`);
  if (options.title.trim() === '') throw new ExportRefusedError('bad-title', 'a change set needs a title');
  if (!SLUG.test(options.topic) || options.topic.length > 40) throw new ExportRefusedError('bad-topic', `the topic ${JSON.stringify(options.topic)} must be lowercase words joined by hyphens (at most 40 characters): it is in the file name`);

  return ws.locked(async () => {
    const recovered = recoverExport(dir);

    // 1. Check: the workspace is current with Git, and there is something to export.
    const behind = behindReason(ws.db, ws.paths.dataDir);
    if (behind !== null) throw new ExportRefusedError('stale-base', `the workspace is behind Git (${behind}); reopen it so the open check rebuilds and replays the drafts, then export`);
    const held = ws.conflicts();
    if (held.length) {
      throw new ExportRefusedError('conflicts-pending', `${held.length} draft(s) no longer apply and are held as conflicts (${held.map((c) => `${c.opId}: ${c.code}`).join('; ')}); an export would leave them out without saying so. Write them again against what the records hold now, or discard them with a restore, then export`);
    }
    const entries = ws.journal(['draft', 'exported']);
    if (entries.length === 0) throw new ExportRefusedError('nothing-to-export', 'there are no pending changes: a no-change export writes nothing');
    const records: ChangeRecord[] = entries.map((e, k) => ({ ...e.record, seq: k + 1 }));
    if (options.generator !== undefined && options.generator.expectCount !== records.length) {
      throw new ExportRefusedError('generator-count', `the generator ${options.generator.path} expected ${options.generator.expectCount} change(s), but ${records.length} are pending; a sweep that moved is run again on purpose and its new list reviewed, never exported as it stands`);
    }
    const touched = new Set(records.flatMap(tablesTouched));
    requireRuleRowAlone(records, touched);
    const backup = await ws.backup('before-export');

    // 2. Read once: the whole workspace, and prove that no table changed without a change record.
    const stamp = ws.stamp();
    const manifest = readManifest(ws.paths.dataDir);
    const model = ws.schema;
    const { digests, texts } = tableDigests(ws.db, touched, model);
    requireNoDrift(digests, manifest, touched);
    const resultDigest = snapshotDigestOf(digests);
    const changed = TABLE_NAMES.filter((t) => touched.has(t));

    const date = ws.now().toISOString().slice(0, 10);
    const schemaEdited = model.digest !== BASE_MODEL.digest;
    const hash = sha256Of(JSON.stringify({ title: options.title, base: stamp.snapshotDigest, result: resultDigest, ops: records.map((r) => r.opId), ...(schemaEdited ? { schema: model.digest } : {}) })).slice(0, 4);
    const id = `${date}-${options.topic}-${hash}`;
    if (!isChangeSetId(id)) throw new ExportRefusedError('bad-topic', `${id} is not a change set ID`);
    const changeSet: ChangeSet = {
      id, title: options.title, records, base: { snapshotDigest: stamp.snapshotDigest }, result: { snapshotDigest: resultDigest },
      impact: { answersMoved: { moved: null, estimatesPending: true }, reportPath: null },
      ...(options.generator === undefined ? {} : { generator: options.generator }),
      ...(schemaEdited ? { schema: { base: toSha256(BASE_MODEL.digest), result: toSha256(model.digest) } } : {}),
    };

    // The records must explain the result: the change set, applied through the same guards to a fresh rebuild of the base, gives
    // exactly this result. (The per-table drift check above cannot see an out-of-band edit inside a table the records touch.)
    const replay = replayChangeSet(changeSet, { dataDir: ws.paths.dataDir, store: null, rulingsPath: ws.rulingsPath });
    if (!replay.ok) throw new ExportRefusedError('verification-failed', `the change set does not replay on its base, so the workspace holds changes its records do not explain: ${replay.problems.join('; ')}`);

    // 3. Stage.
    const newManifest = { ...manifest.raw, tables: { ...manifest.tables, ...Object.fromEntries(changed.map((t) => [t, digestEntry(digests, t)])) } };
    const token = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}-${randomBytes(3).toString('hex')}`;
    const stageRel = `${EXPORT_STAGING}/${token}`;
    const changeSetRel = `data/review/change-sets/${id}.json`;
    const changeSetText = `${JSON.stringify(changeSet, null, 2)}\n`;
    const planned: PlannedFile[] = [
      ...changed.map((t) => ({ rel: `data/tables/${t}.csv`, text: texts.get(t) ?? '' })),
      { rel: changeSetRel, text: changeSetText },
      { rel: 'data/manifest.json', text: `${JSON.stringify(newManifest, null, 2)}\n` },
      // A schema edit travels with the data it reshaped: the schema files, and the files the generator makes from them.
      ...filesOf(model.overlay),
      ...(model === BASE_MODEL ? [] : filesOf(model.generated())),
      ...ledgerFile(ws.paths.dataDir, records, id),
    ];
    // An earlier export's file that this one does not write would contradict the manifest above: it is retired. The tables' CSV always (as in v1);
    // the other folders only in a directory a previous export marked as its own, so `--out` pointed at a checkout never removes that checkout's files.
    const markedAsOurs = existsSync(join(dir, EXPORT_MARKER));
    const retired = OWNED_DIRS.filter((owned) => owned === 'data/tables' || markedAsOurs).flatMap((owned) => filesUnder(dir, owned).filter((rel) => !planned.some((p) => p.rel === rel)));
    const lockedFiles = [...planned.map((p) => p.rel), ...retired];
    const seen = new Map(lockedFiles.map((rel) => [rel, digestOf(join(dir, rel))]));
    const existingSet = join(dir, changeSetRel);
    if (existsSync(existingSet) && readFileSync(existingSet, 'utf8') !== changeSetText) {
      throw new ExportRefusedError('change-set-immutable', `${changeSetRel} exists with other content; a change set is immutable once written`);
    }
    const moved = (ours: ReadonlyMap<string, string> = new Map()): string[] =>
      lockedFiles.filter((rel) => ![seen.get(rel), ours.get(rel)].includes(digestOf(join(dir, rel))));
    const staged: JournalFile[] = [];
    try {
      for (const p of planned) {
        const stagedRel = `${stageRel}/${p.rel}`;
        writeDurably(join(dir, stagedRel), p.text);
        staged.push({ staged: stagedRel, to: p.rel, sha256: sha256Of(p.text) });
      }

      // 4. Re-import: the staged snapshot into a fresh database, checked, and equal to the result claimed.
      verifyStaged(ws.paths.dataDir, planned, texts, resultDigest, model);
      options.hooks?.beforeCommit?.();
      if (options.hooks?.failBeforeCommit === true) throw new Error('export interrupted before its journal was written (test hook)');
      const before = moved();
      if (before.length) throw targetChanged(before);
    } catch (error) {
      removeStaging(dir, token);
      throw error;
    }

    // 5. Journal (the commit point), the lock again, promote.
    const journal: Journal = { note: 'An export of the write service in progress. The next change:export completes it; change:replay refuses to compare until then.', token, files: staged, remove: retired };
    commitJournal(dir, journal);
    const after = moved(new Map(staged.map((f) => [f.to, f.sha256])));
    if (after.length) {
      rmSync(join(dir, EXPORT_JOURNAL), { force: true });
      removeStaging(dir, token);
      throw targetChanged(after);
    }
    promote(dir, journal, options.hooks?.failAfterRenames);

    // Only an export that writes beyond what v1 wrote (the changed tables, the manifest, the change set) marks its directory: a data-only export leaves it as it was.
    const beyondTables = planned.some((p) => !(p.rel.startsWith('data/tables/') || p.rel === 'data/manifest.json' || p.rel.startsWith('data/review/change-sets/')));
    if (beyondTables && !markedAsOurs) writeDurably(join(dir, EXPORT_MARKER), 'A directory written by change:export (packages/data/src/export.ts). A later export may remove files it wrote here that it no longer writes; it removes nothing else.\n');
    markExported(ws, records, id);
    return { changeSet, changeSetPath: join(dir, changeSetRel), exportDir: dir, tables: changed, files: planned.map((p) => join(dir, p.rel)), backup: backup.path, recovered, retired };
  });
}

const filesOf = (files: Readonly<Record<string, string>>): PlannedFile[] => Object.entries(files).map(([rel, text]) => ({ rel, text }));

const OWNED_DIRS = ['data/tables', 'data/review', 'schema/tables', 'schema/vocab', 'db/generated', 'packages/data/src/generated'] as const;
const LEDGER = 'data/review/removed-records.csv';

/** The files directly under `dir/rel`, as paths relative to `dir` (the change sets are in a folder of their own below data/review: immutable, never retired). */
function filesUnder(dir: string, rel: string): string[] {
  const full = join(dir, rel);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => `${rel}/${entry.name}`);
}

/** The D72 ledger with the rows the records owe: each names the change set that re-pointed it (the old file's `Migration` column). */
function ledgerFile(dataDir: string, records: readonly ChangeRecord[], changeSetId: string): PlannedFile[] {
  const owed = records.flatMap((r) => r.ledger ?? []);
  if (owed.length === 0) return [];
  const path = join(dataDir, 'review', 'removed-records.csv');
  const existing = existsSync(path) ? parseCsv(readFileSync(path, 'utf8'), path).records.map((r) => [...r.cells]) : [];
  const rows = [...existing, ...owed.map((row) => [row.Table, row.Record, changeSetId, row.Where])];
  return [{ rel: LEDGER, text: csvText(['Table', 'Record', 'Migration', 'Where'], rows) }];
}

function buildStaged(scratch: string, model: SchemaModel): ReturnType<typeof buildInMemory> {
  try {
    return buildInMemory(scratch, model);
  } catch (error) {
    throw new ExportRefusedError('verification-failed', `the staged snapshot does not rebuild: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Re-import (04 section 8, step 6): a scratch copy of the approved snapshot with the staged tables and manifest laid over it is
 * loaded into a fresh database with every reconstruction check; each changed table must export to exactly the staged bytes and
 * the whole must equal the digest the change set claims. Any difference stops the export before anything is promoted.
 */
function verifyStaged(dataDir: string, planned: readonly PlannedFile[], texts: ReadonlyMap<TableName, string>, resultDigest: Sha256, expected: SchemaModel): void {
  const scratch = mkdtempSync(join(tmpdir(), 'atlas-export-verify-'));
  try {
    cpSync(join(dataDir, 'tables'), join(scratch, 'tables'), { recursive: true });
    cpSync(join(dataDir, 'manifest.json'), join(scratch, 'manifest.json'));
    for (const p of planned) if (p.rel.startsWith('data/tables/') || p.rel === 'data/manifest.json') writeFileSync(join(scratch, p.rel.slice('data/'.length)), p.text);
    // The schema the staged data is loaded under is the staged schema FILES, not the workspace's model: the files are what is verified.
    const stagedSchema: Record<string, string> = {};
    for (const p of planned) if (p.rel.startsWith('schema/')) stagedSchema[p.rel] = p.text;
    const model = modelFromStaged(stagedSchema);
    if (model.digest !== expected.digest) throw new ExportRefusedError('verification-failed', `the staged schema files give schema ${model.digest.slice(0, 12)}, not the workspace's ${expected.digest.slice(0, 12)}`);
    const built = buildStaged(scratch, model);
    try {
      for (const [table, text] of texts) {
        if (exportTable(built.db, table, model) !== text) throw new ExportRefusedError('verification-failed', `${table}: the staged CSV does not round-trip through a fresh database to the same bytes`);
      }
      const got = snapshotDigestOfReport(built.report);
      if (got !== resultDigest) throw new ExportRefusedError('verification-failed', `the staged snapshot's digest ${got.slice(0, 12)} is not the result ${resultDigest.slice(0, 12)} the change set claims`);
    } finally { built.db.close(); }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

function modelFromStaged(files: SchemaFiles): SchemaModel {
  try {
    return modelWith(files);
  } catch (error) {
    throw new ExportRefusedError('verification-failed', `the staged schema files are not a valid schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}
