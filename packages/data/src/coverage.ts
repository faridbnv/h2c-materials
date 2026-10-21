// The change-set coverage measurement (WP-17; pack 04 section 11 and ADR-03 "Confidence: Medium for the share of bulk edits a generator can
// express, measured in M2"; evidence for owner question Q2-10). READ ONLY: it reads Git history and the working tree and writes one JSON file
// (remake/measure/change-set-coverage.json). It changes no data, no schema and no migration.
//
// The question: what share of the changes the archived migrations made can the write service's commands express? The pack's recipe is to take
// the last 14 days of main's migration commits, derive commands from each commit's table and schema diff, apply them through the service in a
// legacy mode with the evidence guards off, and byte-compare with the child commit. Main is frozen at the cutover candidate, so the window is
// the 14 days before main's last commit, and this reads the history (and the migration scripts the commits add, in archive/migrations) without
// running a single migration.
//
// Two results, not to be confused (the pack: "byte identity tests the service; it cannot prove expressiveness, since a diff-derived command set
// can express any cell edit, so the residue is the result"):
//   expressiveness  every change in a commit's diff is classified as one a command expresses (and which), one that waits for the proposal
//                   commands of WP-28, or RESIDUE: a change no command can make (a row removed, a row inserted between rows, rows reordered,
//                   a table created or dropped, a vocabulary word removed or changed). The residue is listed with its reasons.
//   byte identity   for each commit whose every change is expressed and that changes no schema, the derived commands are applied through
//                   the real pipeline (legacy mode) to a rebuild of the parent's tables and the result is compared byte for byte with the
//                   child's CSV. That proves the service's order and canonical bytes, not the share.
// "Legacy mode" (applyLegacyCommand) turns off the judgement guards (evidence, Notes tokens, rulings, reviewers, natural keys, the
// measurements rules), because history holds data today's judgement would refuse; the structural guards stay. Negative tests show each of
// those guards fires on the same command in normal mode (tests/remake/reports.test.mjs).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EvidenceRef, Sha256, WriteCommand } from '@atlas/domain/contracts';
import { CsvError, parseCsv } from './csv.ts';
import { isSourceId, newOpId, snapshotDigestOf, tableDigests, toSha256 } from './digest.ts';
import { TABLES, TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { DataInputError, REPO_ROOT, buildInMemory } from './rebuild.ts';
import { isObject } from './json-patch.ts';
import { BASE_MODEL, SchemaInvalidError, addressKeyOf, isSchemaFilePath, modelWith, recordIdOf } from './schema-model.ts';
import type { SchemaFiles, SchemaModel } from './schema-model.ts';
import { exportTable, isTableName, quoteIdent } from './storage.ts';
import type { Db } from './driver.ts';
import { applyLegacyCommand, initWorkspaceTables, putMeta } from './write.ts';
import type { WriteContext } from './write.ts';

// ---------------------------------------------------------------- what a change is, and whether a command makes it

export type UnitKind =
  | 'edit-cells' | 'append-rows' | 'append-source-rows'
  | 'add-column' | 'drop-column' | 'reorder-columns' | 'schema-document' | 'vocab-add'
  | 'insert-mid-table' | 'remove-rows' | 'reorder-rows' | 'ambiguous-rows' | 'unreadable-table'
  | 'create-table' | 'drop-table' | 'vocab-change' | 'vocab-new-file' | 'outside-file';

export type Status = 'expressed' | 'later' | 'residue';

/** How each kind of change is made by the write service, or why it cannot be. */
export const KINDS: Readonly<Record<UnitKind, { readonly status: Status; readonly by: string }>> = {
  'edit-cells': { status: 'expressed', by: 'correctValue (reviseProfile, reclassifyProduct, retireRecord and moveGrade for their columns)' },
  'append-rows': { status: 'expressed', by: 'addMeasurement, addRecord' },
  'append-source-rows': { status: 'later', by: 'the proposal commands of WP-28: a source enters through the ingest journey, fetched and hashed' },
  'add-column': { status: 'expressed', by: 'addColumn (or schemaEdit)' },
  'drop-column': { status: 'expressed', by: 'schemaEdit, with a ruling' },
  'reorder-columns': { status: 'expressed', by: 'schemaEdit (a move in the patch)' },
  'schema-document': { status: 'expressed', by: 'schemaEdit' },
  'vocab-add': { status: 'expressed', by: 'addVocab' },
  'insert-mid-table': { status: 'residue', by: 'no command: a row is appended at the end (table-io append(..., { after }) splices rows into headline_definitions)' },
  'remove-rows': { status: 'residue', by: 'no command deletes: nothing is deleted, a record is retired (D72 lets a record the build now derives leave, with a ledger row)' },
  'reorder-rows': { status: 'residue', by: 'no command moves a row: order is data, and a reorder is a different file' },
  'ambiguous-rows': { status: 'residue', by: 'the rows have no unique key to match them by, so no command can address them' },
  'unreadable-table': { status: 'residue', by: 'the table is not canonical CSV in this commit' },
  'create-table': { status: 'residue', by: 'no command creates a table (schemaEdit changes the 36 tables it has)' },
  'drop-table': { status: 'residue', by: 'no command drops a table' },
  'vocab-change': { status: 'residue', by: 'a vocabulary word removed or changed: addVocab only adds' },
  'vocab-new-file': { status: 'residue', by: 'no command creates a vocabulary file' },
  'outside-file': { status: 'residue', by: 'a file beside the 36 tables and their schema (schema/db.schema.json, schema/estimate-model.schema.json, the data/review files): no command changes it' },
};

// The kinds in the order KINDS lists them (the order of the report).
const KIND_NAMES: readonly UnitKind[] = Object.keys(KINDS).filter((name): name is UnitKind => Object.hasOwn(KINDS, name));

export interface Unit { readonly kind: UnitKind; readonly table: string; readonly count: number; readonly detail: string }

/** A concrete change the derived commands make (only for commits whose every change is a row edit or an append). */
type Op =
  | { readonly type: 'edit'; readonly table: TableName; readonly id: string; readonly expect: Readonly<Record<string, string | null>>; readonly set: Readonly<Record<string, string | null>> }
  | { readonly type: 'append'; readonly table: TableName; readonly row: Readonly<Record<string, string | null>> };

interface TableDiff { readonly units: Unit[]; readonly ops: Op[]; readonly headerChanged: boolean }

// ---------------------------------------------------------------- the diff of one table

type Row = Readonly<Record<string, string | null>>;

function rowsOf(text: string, label: string): { header: string[]; rows: Row[] } | 'unreadable' {
  try {
    const { header, records } = parseCsv(text, label);
    return { header: [...header], rows: records.map((r) => Object.fromEntries(header.map((name, k) => [name, r.cells[k] ?? null]))) };
  } catch (error) {
    if (error instanceof CsvError) return 'unreadable';
    throw error;
  }
}

/** The columns a row of `table` is matched by: its primary key, else its first unique key; null when the table has neither in both headers. */
function keyColumnsOf(table: string, p: readonly string[], c: readonly string[]): readonly string[] | null {
  if (!isTableName(table)) return null;
  const key = addressKeyOf(TABLES[table]);
  return key.length && key.every((name) => p.includes(name) && c.includes(name)) ? key : null;
}

/** Row position by ID, or null when a row has no ID or two rows share one (the rows cannot be matched by key). */
function indexRows(rows: readonly Row[], key: readonly string[] | null): Map<string, number> | null {
  const out = new Map<string, number>();
  for (const [k, row] of rows.entries()) {
    const id = key === null ? null : recordIdOf(key, row);
    if (id === null || out.has(id)) return null;
    out.set(id, k);
  }
  return out;
}

/** How many rows hold something other than the most common value of a column. */
function valueExceptions(rows: readonly Row[], name: string): number {
  const counts = new Map<string | null, number>();
  for (const row of rows) counts.set(row[name] ?? null, (counts.get(row[name] ?? null) ?? 0) + 1);
  return rows.length - Math.max(0, ...counts.values());
}

const shortList = (items: readonly string[]): string => (items.length > 4 ? `${items.slice(0, 4).join(', ')} and ${items.length - 4} more` : items.join(', '));

export function diffTable(table: string, was: string | null, now: string | null): TableDiff {
  const units: Unit[] = [];
  const unit = (kind: UnitKind, count: number, detail: string): void => { units.push({ kind, table, count, detail }); };
  if (was === null && now === null) return { units, ops: [], headerChanged: false };
  if (was === null) return { units: [{ kind: 'create-table', table, count: 1, detail: 'a table that did not exist' }], ops: [], headerChanged: true };
  if (now === null) return { units: [{ kind: 'drop-table', table, count: 1, detail: 'a table that no longer exists' }], ops: [], headerChanged: true };
  const p = rowsOf(was, `${table} (parent)`);
  const c = rowsOf(now, `${table} (child)`);
  if (p === 'unreadable' || c === 'unreadable') return { units: [{ kind: 'unreadable-table', table, count: 1, detail: 'not canonical CSV' }], ops: [], headerChanged: false };

  const added = c.header.filter((name) => !p.header.includes(name));
  const dropped = p.header.filter((name) => !c.header.includes(name));
  const common = p.header.filter((name) => c.header.includes(name));
  const reordered = common.join('\0') !== c.header.filter((name) => p.header.includes(name)).join('\0');
  const headerChanged = added.length > 0 || dropped.length > 0 || reordered;
  for (const name of added) unit('add-column', 1, name);
  for (const name of dropped) unit('drop-column', 1, name);
  if (reordered) unit('reorder-columns', 1, 'the order of existing columns changed');

  const key = keyColumnsOf(table, p.header, c.header);
  const pIndex = indexRows(p.rows, key);
  const cIndex = indexRows(c.rows, key);
  if (key === null || pIndex === null || cIndex === null) {
    const same = p.rows.length === c.rows.length && p.rows.every((row, k) => common.every((name) => row[name] === c.rows[k]?.[name]));
    if (!same || headerChanged) unit('ambiguous-rows', Math.max(Math.abs(c.rows.length - p.rows.length), 1), 'rows without a unique key to match them by');
    return { units, ops: [], headerChanged };
  }

  const ops: Op[] = [];
  const removed = [...pIndex.keys()].filter((id) => !cIndex.has(id));
  const addedIds = [...cIndex.keys()].filter((id) => !pIndex.has(id));
  if (removed.length) unit('remove-rows', removed.length, shortList(removed));

  // Matched rows keep their relative order, or the file was reordered.
  const matched = [...cIndex].filter(([id]) => pIndex.has(id));
  const inOrder = matched.every(([id], k) => k === 0 || (pIndex.get(id) ?? 0) > (pIndex.get(matched[k - 1]?.[0] ?? '') ?? 0));
  if (!inOrder) unit('reorder-rows', matched.length, 'rows that stayed changed their order');

  // Added rows after the last matched row are appended; any other added row was inserted between rows.
  const lastMatched = matched.reduce((last, [, at]) => Math.max(last, at), -1);
  const appended = addedIds.filter((id) => (cIndex.get(id) ?? -1) > lastMatched);
  const inserted = addedIds.filter((id) => (cIndex.get(id) ?? -1) < lastMatched);
  if (inserted.length) unit('insert-mid-table', inserted.length, shortList(inserted));
  if (appended.length) {
    unit(table === 'sources' ? 'append-source-rows' : 'append-rows', appended.length, shortList(appended));
    for (const id of appended) {
      const row = c.rows[cIndex.get(id) ?? -1];
      if (row !== undefined && isTableName(table)) ops.push({ type: 'append', table, row });
    }
  }

  // Cell edits of rows that stayed: over the columns both files have; a column that was added is judged against its most common value.
  let edited = 0;
  let cells = 0;
  for (const [id, at] of matched) {
    const before = p.rows[pIndex.get(id) ?? -1];
    const after = c.rows[at];
    if (before === undefined || after === undefined) continue;
    const changed = common.filter((name) => before[name] !== after[name]);
    if (changed.length === 0) continue;
    edited++;
    cells += changed.length;
    if (isTableName(table)) ops.push({ type: 'edit', table, id, expect: Object.fromEntries(changed.map((name) => [name, before[name] ?? null])), set: Object.fromEntries(changed.map((name) => [name, after[name] ?? null])) });
  }
  for (const name of added) {
    const exceptions = valueExceptions(c.rows, name);
    if (exceptions > 0) { edited += exceptions; cells += exceptions; }
  }
  if (edited) unit('edit-cells', edited, `${cells} cell(s) in ${edited} row(s)`);
  return { units, ops, headerChanged };
}

// ---------------------------------------------------------------- the schema files of one commit

export function diffVocabulary(stem: string, was: string | null, now: string | null): Unit[] {
  const table = `schema/vocab/${stem}.csv`;
  if (was === null) return now === null ? [] : [{ kind: 'vocab-new-file', table, count: 1, detail: 'a vocabulary that did not exist' }];
  if (now === null) return [{ kind: 'vocab-change', table, count: 1, detail: 'a vocabulary file removed' }];
  const p = rowsOf(was.replace(/^﻿/, ''), table);
  const c = rowsOf(now.replace(/^﻿/, ''), table);
  if (p === 'unreadable' || c === 'unreadable') return [{ kind: 'vocab-change', table, count: 1, detail: 'not canonical CSV' }];
  const words = (rows: readonly Row[]): string[] => rows.map((r) => r.Value ?? '');
  const pw = words(p.rows);
  const cw = words(c.rows);
  // Words added anywhere, the words that were there kept in their order with their other cells unchanged: addVocab (at the end, or `after` a word).
  const kept = cw.filter((word) => pw.includes(word));
  const unchanged = p.rows.every((row) => {
    const same = c.rows.find((other) => other.Value === row.Value);
    return same !== undefined && p.header.every((name) => row[name] === same[name]);
  });
  if (p.header.join() === c.header.join() && kept.join('\0') === pw.join('\0') && unchanged) {
    return cw.length > pw.length ? [{ kind: 'vocab-add', table, count: cw.length - pw.length, detail: shortList(cw.filter((word) => !pw.includes(word))) }] : [];
  }
  return [{ kind: 'vocab-change', table, count: Math.max(1, pw.filter((word) => !cw.includes(word)).length), detail: 'a word removed, moved or changed' }];
}

/** A table's schema document without its field list: what is left is the part of the file a column change does not explain. */
function documentOutsideFields(text: string): string {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed)) return text;
  return JSON.stringify(Object.fromEntries(Object.entries(parsed).filter(([k]) => k !== 'fields')));
}

function diffSchemaDocument(table: string, was: string | null, now: string | null): Unit[] {
  if (was === null || now === null) return []; // a table created or dropped is counted by its CSV
  const label = `schema/tables/${table}.schema.json`;
  const out: Unit[] = [];
  if (documentOutsideFields(was) !== documentOutsideFields(now)) out.push({ kind: 'schema-document', table: label, count: 1, detail: 'title, description or keys changed' });
  const fields = (text: string): Map<string, string> => {
    const parsed: unknown = JSON.parse(text);
    const list = typeof parsed === 'object' && parsed !== null && 'fields' in parsed && Array.isArray(parsed.fields) ? parsed.fields : [];
    return new Map(list.flatMap((f: unknown) => (typeof f === 'object' && f !== null && 'name' in f && typeof f.name === 'string' ? [[f.name, JSON.stringify(f)] as const] : [])));
  };
  const before = fields(was);
  const after = fields(now);
  const changedFields = [...after].filter(([name, spec]) => before.has(name) && before.get(name) !== spec).map(([name]) => name);
  if (changedFields.length) out.push({ kind: 'schema-document', table: label, count: changedFields.length, detail: `the specification of ${shortList(changedFields)} changed` });
  return out;
}

// ---------------------------------------------------------------- the history

const git = (repo: string, args: readonly string[]): string => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const blob = (repo: string, rev: string, path: string): string => git(repo, ['show', `${rev}:${path}`]);

interface Change { readonly status: 'A' | 'M' | 'D'; readonly path: string }

function changesBetween(repo: string, parent: string, child: string, paths: readonly string[]): Change[] {
  return git(repo, ['diff-tree', '-r', '--no-renames', '--name-status', parent, child, '--', ...paths]).split('\n').filter(Boolean).flatMap((line) => {
    const [status, path] = line.split('\t');
    return (status === 'A' || status === 'M' || status === 'D') && path !== undefined ? [{ status, path }] : [];
  });
}

const OBSERVATIONAL: ReadonlySet<string> = new Set([
  'measurements', 'fatigue_tests', 'profiles', 'profile_notes', 'page_context', 'prices', 'evidence', 'polymer_environment', 'know_how_reads', 'product_claims',
  'print_guide', 'print_guide_materials', 'impact_test_guesses', 'fx_rates', 'reference_envelopes',
]);

/** The pack's classes of migration (04 section 11), guessed from what a commit changed, not from the script's text. Heuristic, medium confidence. */
export function classOf(units: readonly Unit[]): string {
  const kinds = new Set(units.map((u) => u.kind));
  const schema: readonly UnitKind[] = ['add-column', 'drop-column', 'reorder-columns', 'schema-document', 'vocab-add', 'vocab-change', 'vocab-new-file', 'create-table', 'drop-table'];
  if (schema.some((k) => kinds.has(k))) return '2 Schema or model change plus backfill';
  const tables = new Set(units.map((u) => u.table));
  if (tables.size === 0) return '6 Unclassified';
  const appended = units.filter((u) => u.kind === 'append-rows' || u.kind === 'append-source-rows').reduce((sum, u) => sum + u.count, 0);
  const onlyAppends = units.every((u) => u.kind === 'append-rows' || u.kind === 'append-source-rows');
  if (onlyAppends && appended >= 20) return '1 Bulk import or pipeline batch';
  const observational = [...tables].some((t) => OBSERVATIONAL.has(t));
  const identity = [...tables].some((t) => !OBSERVATIONAL.has(t));
  if (observational && identity) return '5 Mixed or editorial';
  return observational ? '3 Correction of observational data' : '4 Reference, identity, classification';
}

// ---------------------------------------------------------------- the replay through the service (legacy mode)

/** The evidence a legacy command carries: the type requires some, and legacy mode does not look at it. */
function legacyEvidence(): EvidenceRef {
  const sourceId = 'LEGACY-REPLAY';
  if (!isSourceId(sourceId)) throw new Error('internal: not a source ID');
  return { sourceId, sha256: toSha256('0'.repeat(64)), page: 1, locator: 'legacy replay', quote: 'legacy replay' };
}

/** The tables in the order their foreign keys allow rows to be added: parents before children (a self reference or a cycle keeps the listing order). */
function parentsFirst(db: Db): TableName[] {
  const parents = new Map<TableName, Set<string>>(TABLE_NAMES.map((table) => [table, new Set<string>()]));
  for (const table of TABLE_NAMES) {
    for (const link of db.prepare(`PRAGMA foreign_key_list(${quoteIdent(table)})`).all()) {
      const parent = String(link.table);
      if (parent !== table) parents.get(table)?.add(parent);
    }
  }
  const ordered: TableName[] = [];
  const left = new Set<TableName>(TABLE_NAMES);
  while (left.size) {
    const next = [...left].find((table) => [...(parents.get(table) ?? [])].every((parent) => !isTableName(parent) || !left.has(parent)));
    const take = next ?? [...left][0];
    if (take === undefined) break;
    ordered.push(take);
    left.delete(take);
  }
  return ordered;
}

/** Rows are added parents first, in the file order of each table, and edits follow: a commit's edits may point at rows it adds. */
function inApplyOrder(ops: readonly Op[], db: Db): Op[] {
  const order = parentsFirst(db);
  const appended = ops.filter((op) => op.type === 'append').sort((a, b) => order.indexOf(a.table) - order.indexOf(b.table));
  return [...appended, ...ops.filter((op) => op.type === 'edit')];
}

function commandsOf(ops: readonly Op[], base: { readonly snapshotDigest: Sha256; readonly commit: string }, schemaDigest: Sha256): WriteCommand[] {
  const LEGACY_EVIDENCE = legacyEvidence();
  const actor = { kind: 'agent', name: 'coverage-replay', model: 'none' } as const;
  return ops.map((op): WriteCommand => {
    const common = { opId: newOpId(), reason: 'change-set coverage replay (legacy mode)', actor, base };
    if (op.type === 'edit') return { ...common, kind: 'correctValue', target: { table: op.table, id: op.id }, expect: { cells: op.expect }, set: op.set, evidence: LEGACY_EVIDENCE };
    if (op.table === 'measurements') return { ...common, kind: 'addMeasurement', target: { table: op.table }, expect: { schemaDigest }, row: op.row, evidence: LEGACY_EVIDENCE };
    return { ...common, kind: 'addRecord', target: { table: op.table }, expect: { schemaDigest }, row: op.row };
  });
}

export interface ReplayOutcome { readonly status: 'identical' | 'differs' | 'skipped'; readonly detail: string }

/** The schema files at `rev` that differ from the repository's own: the schema the parent's tables were written under. */
function schemaOverlayAt(repo: string, rev: string): SchemaFiles {
  const overlay: Record<string, string> = {};
  for (const path of git(repo, ['ls-tree', '-r', '--name-only', rev, '--', 'schema/tables', 'schema/vocab']).split('\n').filter(isSchemaFilePath)) {
    const text = blob(repo, rev, path);
    if (BASE_MODEL.fileText(path) !== text) overlay[path] = text;
  }
  return overlay;
}

/** Rebuild the parent's tables, apply the derived commands in legacy mode, and compare every table the commit changed with the child's CSV. */
function replayCommit(repo: string, parent: string, child: string, tables: ReadonlySet<string>, ops: readonly Op[]): ReplayOutcome {
  const scratch = mkdtempSync(join(tmpdir(), 'atlas-coverage-'));
  try {
    const archive = execFileSync('git', ['archive', parent, 'data/tables', 'data/manifest.json'], { cwd: repo, maxBuffer: 1024 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', scratch], { input: archive });
    let model: SchemaModel;
    try {
      model = modelWith(schemaOverlayAt(repo, parent));
    } catch (error) {
      // The generator refuses a schema it cannot model (a table the repository's schema lacks, or one it has no longer): the commit is not replayed.
      // Anything else (a full disk, a bug) is not a reason to skip and stops the measurement.
      if (!(error instanceof SchemaInvalidError)) throw error;
      return { status: 'skipped', detail: `the parent's schema cannot be modelled: ${error.message}`.slice(0, 200) };
    }
    let built;
    try {
      built = buildInMemory(join(scratch, 'data'), model, { views: false });
    } catch (error) {
      if (error instanceof DataInputError) return { status: 'skipped', detail: `the parent's tables do not rebuild under its own schema: ${error.problems[0] ?? ''}`.slice(0, 200) };
      throw error;
    }
    const { db } = built;
    try {
      const digest = snapshotDigestOf(tableDigests(db, new Set(), model).digests);
      initWorkspaceTables(db, digest);
      putMeta(db, 'commit', parent);
      const ctx: WriteContext = { db, store: null, rulings: new Set(), mergedOps: new Map(), now: () => new Date(0), schema: { model } };
      const stamp = { snapshotDigest: digest, commit: parent };
      for (const command of commandsOf(inApplyOrder(ops, db), stamp, toSha256(model.digest))) {
        const result = applyLegacyCommand(ctx, command, { rebase: true });
        if (result.status === 'refused') return { status: 'differs', detail: `the service refused a derived command (${result.code}): ${result.detail}`.slice(0, 300) };
      }
      for (const table of TABLE_NAMES.filter((t) => tables.has(t))) {
        if (exportTable(db, table, model) !== blob(repo, child, `data/tables/${table}.csv`)) return { status: 'differs', detail: `${table}: the exported CSV is not the child's` };
      }
      return { status: 'identical', detail: `${ops.length} command(s) gave the child's ${tables.size} changed table(s) byte for byte` };
    } finally { db.close(); }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------- the measurement

export interface CoverageOptions {
  readonly repo?: string;
  /** The history to measure. Default origin/main, else main. */
  readonly ref?: string;
  /** The window: this many days before the ref's last commit. Default 14. */
  readonly days?: number;
  /** `<from>..<to>` instead of the window (OP-8: a later run can cover all 262 commits). */
  readonly range?: string;
  /** Apply the derived commands through the service and compare bytes (default true). */
  readonly replay?: boolean;
  /** Stop after this many commits (tests). */
  readonly limit?: number;
}

export interface CommitReport {
  readonly commit: string;
  readonly date: string;
  readonly subject: string;
  /** The migration script(s) the commit adds under archive/migrations or scripts/migrate. */
  readonly migrations: readonly string[];
  readonly class: string;
  readonly units: readonly Unit[];
  readonly status: 'all-expressed' | 'has-later' | 'has-residue' | 'no-snapshot-change';
  readonly outsideSnapshot: readonly string[];
  readonly replay: ReplayOutcome | null;
}

export interface CoverageReport {
  readonly schema: 1;
  readonly status: 'measured';
  readonly measuredAt: string;
  readonly method: readonly string[];
  readonly window: { readonly ref: string; readonly head: string; readonly anchor: string; readonly anchorDate: string; readonly days: number | null; readonly range: string | null; readonly commits: number };
  readonly units: {
    readonly total: number; readonly expressed: number; readonly later: number; readonly residue: number; readonly expressedShare: number; readonly expressedOrLaterShare: number;
    /** Changes to files beside the 36 tables and their schema (counted as residue above), and the expressed share without them. */
    readonly outsideFiles: number; readonly expressedShareOfTables: number;
  };
  readonly commits: {
    readonly total: number; readonly withSnapshotChange: number; readonly allExpressed: number; readonly withLater: number; readonly withResidue: number;
    readonly residueShare: number;
    /** Commits with residue other than a file beside the tables, and their share of the commits that change the tables or a file beside them. */
    readonly withResidueInTables: number; readonly residueShareInTables: number;
    readonly adrRevisitTrigger: { readonly threshold: number; readonly fired: boolean; readonly firedInTables: boolean; readonly rule: string };
  };
  readonly byKind: Readonly<Record<string, { readonly status: Status; readonly by: string; readonly count: number; readonly commits: number }>>;
  readonly byClass: Readonly<Record<string, { readonly commits: number; readonly units: number; readonly expressed: number; readonly later: number; readonly residue: number; readonly share: number }>>;
  readonly residue: readonly { readonly kind: string; readonly count: number; readonly commits: number; readonly why: string; readonly examples: readonly string[] }[];
  readonly byteReplay: { readonly requested: boolean; readonly eligible: number; readonly attempted: number; readonly identical: number; readonly differs: number; readonly skipped: number; readonly skippedBecause: Readonly<Record<string, number>> };
  readonly perCommit: readonly CommitReport[];
  readonly notes: readonly string[];
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
const share = (part: number, whole: number): number => (whole === 0 ? 1 : round(part / whole));

/** Files a commit rewrites as a consequence of the changes it makes, not as changes of their own: the manifest, and the ledger of records that left or were re-pointed. */
const BOOKKEEPING: ReadonlySet<string> = new Set(['data/manifest.json', 'data/review/removed-records.csv']);

/** What a commit's files changed: the classified changes, the row operations they come to, and the files outside the 36 tables and their schema. */
interface CommitDiff { readonly units: Unit[]; readonly ops: Op[]; readonly tablesChanged: Set<string>; readonly outside: string[]; headerChanged: boolean }

function diffCommit(repo: string, parent: string, commit: string): CommitDiff {
  const result: CommitDiff = { units: [], ops: [], tablesChanged: new Set(), outside: [], headerChanged: false };
  const read = (change: Change): { was: string | null; now: string | null } => ({
    was: change.status === 'A' ? null : blob(repo, parent, change.path),
    now: change.status === 'D' ? null : blob(repo, commit, change.path),
  });
  for (const change of changesBetween(repo, parent, commit, ['data', 'schema'])) {
    const csv = /^data\/tables\/([a-z0-9_]+)\.csv$/.exec(change.path);
    const doc = /^schema\/tables\/([a-z0-9_]+)\.schema\.json$/.exec(change.path);
    const vocab = /^schema\/vocab\/([a-z0-9-]+)\.csv$/.exec(change.path);
    if (csv?.[1] !== undefined) {
      const { was, now } = read(change);
      const diff = diffTable(csv[1], was, now);
      result.units.push(...diff.units);
      result.ops.push(...diff.ops);
      result.headerChanged ||= diff.headerChanged;
      result.tablesChanged.add(csv[1]);
    } else if (doc?.[1] !== undefined) {
      const { was, now } = read(change);
      result.units.push(...diffSchemaDocument(doc[1], was, now));
    } else if (vocab?.[1] !== undefined) {
      const { was, now } = read(change);
      result.units.push(...diffVocabulary(vocab[1], was, now));
    } else if (!BOOKKEEPING.has(change.path)) {
      // Counted: a commit that also changes such a file is not one the commands make whole.
      result.outside.push(change.path);
      result.units.push({ kind: 'outside-file', table: change.path, count: 1, detail: { A: 'added', M: 'changed', D: 'removed' }[change.status] });
    }
  }
  return result;
}

function statusOf(units: readonly Unit[]): CommitReport['status'] {
  if (units.length === 0) return 'no-snapshot-change';
  const statuses = new Set(units.map((u) => KINDS[u.kind].status));
  if (statuses.has('residue')) return 'has-residue';
  return statuses.has('later') ? 'has-later' : 'all-expressed';
}

function reportCommit(repo: string, commit: string, replay: boolean): CommitReport {
  const parent = git(repo, ['rev-parse', `${commit}^`]).trim();
  const [date = '', subject = ''] = git(repo, ['show', '-s', '--format=%cI%x09%s', commit]).trim().split('\t');
  const migrations = changesBetween(repo, parent, commit, ['archive/migrations', 'scripts/migrate']).filter((c) => c.status === 'A' && /\/m\d+-[^/]*\.mjs$/.test(c.path)).map((c) => c.path.split('/').pop() ?? c.path);
  const { units, ops, tablesChanged, outside, headerChanged } = diffCommit(repo, parent, commit);
  const status = statusOf(units);
  const schemaFree = units.every((u) => u.kind === 'edit-cells' || u.kind === 'append-rows');
  const outcome = replay && status === 'all-expressed' && schemaFree && !headerChanged ? replayCommit(repo, parent, commit, tablesChanged, ops) : null;
  return { commit, date, subject, migrations, class: classOf(units), units, status, outsideSnapshot: outside, replay: outcome };
}

export function measureCoverage(options: CoverageOptions = {}): CoverageReport {
  const repo = options.repo ?? REPO_ROOT;
  const ref = options.ref ?? resolveRef(repo);
  const days = options.range === undefined ? (options.days ?? 14) : null;
  const head = git(repo, ['rev-parse', ref]).trim();
  const scope = ['data/tables', 'data/manifest.json', 'schema'];
  // The window ends at the last commit that changed the tables or the schema, not at the ref's tip: main is frozen for data, but a commit that
  // changes only a workflow (the gate of 2026-10-21) moves the tip without moving the data.
  const anchor = git(repo, ['rev-list', '-1', '--no-merges', head, '--', ...scope]).trim();
  if (anchor === '') throw new Error(`no commit of ${ref} ever changed data/tables or schema/: there is nothing to measure`);
  const anchorDate = git(repo, ['show', '-s', '--format=%cI', anchor]).trim();
  const listing = options.range === undefined
    ? git(repo, ['rev-list', '--no-merges', '--reverse', `--since=${new Date(Date.parse(anchorDate) - (days ?? 14) * 86_400_000).toISOString()}`, anchor, '--', ...scope])
    : git(repo, ['rev-list', '--no-merges', '--reverse', options.range, '--', ...scope]);
  const commits = listing.split('\n').filter(Boolean).slice(0, options.limit);
  if (commits.length === 0) {
    throw new Error(`no commit of ${options.range ?? ref} changed data/tables or schema/ ${options.range === undefined ? `in the ${days} days before ${anchorDate}` : ''}: there is nothing to measure (a shallow clone, a wrong --ref or --days, or a range with no data commits); a share of nothing is not 100%`);
  }
  const replay = options.replay !== false;
  const reports = commits.map((commit) => reportCommit(repo, commit, replay));
  return summarize({ ref, head, anchor, anchorDate }, days, options.range ?? null, reports, replay);
}

function resolveRef(repo: string): string {
  for (const candidate of ['origin/main', 'main']) {
    try {
      git(repo, ['rev-parse', '--verify', '--quiet', candidate]);
      return candidate;
    } catch (error) {
      // `rev-parse --verify --quiet` exits 1 for a ref that does not exist; any other failure (no git, not a repository) is not "try the next".
      if (!(typeof error === 'object' && error !== null && 'status' in error && error.status === 1)) throw error;
    }
  }
  throw new Error('neither origin/main nor main exists in this repository; give --ref (the coverage measurement reads main\'s history)');
}

const countOf = (units: readonly Unit[]): number => units.reduce((n, u) => n + u.count, 0);
const countWithStatus = (units: readonly Unit[], status: Status): number => countOf(units.filter((u) => KINDS[u.kind].status === status));

function summarize(where: { readonly ref: string; readonly head: string; readonly anchor: string; readonly anchorDate: string }, days: number | null, range: string | null, reports: readonly CommitReport[], replay: boolean): CoverageReport {
  const all = reports.flatMap((r) => r.units.map((u) => ({ ...u, commit: r.commit, class: r.class })));
  const total = countOf(all);
  const expressed = countWithStatus(all, 'expressed');
  const later = countWithStatus(all, 'later');
  const residue = countWithStatus(all, 'residue');
  const withChange = reports.filter((r) => r.status !== 'no-snapshot-change');
  const withResidue = withChange.filter((r) => r.status === 'has-residue').length;
  const withResidueInTables = withChange.filter((r) => r.units.some((u) => KINDS[u.kind].status === 'residue' && u.kind !== 'outside-file')).length;
  const outsideFiles = all.filter((u) => u.kind === 'outside-file').length;

  const byKind: Record<string, { status: Status; by: string; count: number; commits: number }> = {};
  for (const kind of KIND_NAMES) {
    const mine = all.filter((u) => u.kind === kind);
    if (mine.length) byKind[kind] = { status: KINDS[kind].status, by: KINDS[kind].by, count: countOf(mine), commits: new Set(mine.map((u) => u.commit)).size };
  }
  const byClass: Record<string, { commits: number; units: number; expressed: number; later: number; residue: number; share: number }> = {};
  for (const name of [...new Set(withChange.map((r) => r.class))].sort()) {
    const mine = all.filter((u) => u.class === name);
    const e = countWithStatus(mine, 'expressed');
    const l = countWithStatus(mine, 'later');
    const r = countWithStatus(mine, 'residue');
    byClass[name] = { commits: withChange.filter((c) => c.class === name).length, units: e + l + r, expressed: e, later: l, residue: r, share: share(e, e + l + r) };
  }
  const residueKinds = KIND_NAMES.filter((k) => KINDS[k].status === 'residue' && all.some((u) => u.kind === k));
  const replays = reports.flatMap((r) => (r.replay === null ? [] : [r.replay]));
  const because: Record<string, number> = {};
  for (const r of replays.filter((x) => x.status === 'skipped')) because[r.detail.slice(0, 80)] = (because[r.detail.slice(0, 80)] ?? 0) + 1;

  return {
    schema: 1,
    status: 'measured',
    measuredAt: new Date().toISOString(),
    method: [
      'Read only: Git history of the ref and the working tree; no migration is run and no file is written but this one.',
      'Window: the commits that changed data/tables, data/manifest.json or schema/ in the 14 days before the last such commit of the ref (main is frozen at the cutover candidate; a later commit that changes only a workflow does not move the window), or the range given.',
      'Each commit\'s table, vocabulary and schema-document diff against its parent is split into changes; each change is classified as one a write command expresses, one that waits for WP-28\'s proposal commands, or residue.',
      'Rows are matched by primary (else first unique) key. A row added after the last row that stayed is an append; a row added anywhere else is a mid-table insert; rows that stayed but changed order are a reorder.',
      replay
        ? 'Commits whose every change is a row edit or an append, with no schema change, are replayed: the derived commands go through the real pipeline in legacy mode (judgement guards off, structural guards on) onto a rebuild of the parent, and every changed table is compared byte for byte with the child. A commit whose parent cannot be rebuilt under its own schema is skipped, and counted as skipped.'
        : 'The byte replay through the service was NOT requested (--no-replay): this is the classification alone.',
      'Class (04 section 11) is guessed from the diff, not from the script: a heuristic, medium confidence. The migration script a commit adds is named beside it.',
    ],
    window: { ...where, days, range, commits: reports.length },
    units: { total, expressed, later, residue, expressedShare: share(expressed, total), expressedOrLaterShare: share(expressed + later, total), outsideFiles, expressedShareOfTables: share(expressed, total - outsideFiles) },
    commits: {
      total: reports.length, withSnapshotChange: withChange.length, allExpressed: withChange.filter((r) => r.status === 'all-expressed').length,
      withLater: withChange.filter((r) => r.status === 'has-later').length, withResidue, residueShare: share(withResidue, withChange.length),
      withResidueInTables, residueShareInTables: share(withResidueInTables, withChange.length),
      adrRevisitTrigger: {
        threshold: 0.1, fired: withChange.length > 0 && withResidue / withChange.length > 0.1, firedInTables: withChange.length > 0 && withResidueInTables / withChange.length > 0.1,
        rule: 'ADR-03: more than 1 change in 10 needing a hand-written generator is the revisit trigger; here, a commit with any residue stands for a change the commands cannot make. `fired` counts a file beside the tables as residue, `firedInTables` does not',
      },
    },
    byKind,
    byClass,
    residue: residueKinds.map((kind) => {
      const mine = all.filter((u) => u.kind === kind);
      return { kind, count: countOf(mine), commits: new Set(mine.map((u) => u.commit)).size, why: KINDS[kind].by, examples: mine.slice(0, 5).map((u) => `${u.commit.slice(0, 10)} ${u.table}: ${u.detail}`) };
    }),
    byteReplay: {
      requested: replay, eligible: replays.length, attempted: replays.length - replays.filter((r) => r.status === 'skipped').length, identical: replays.filter((r) => r.status === 'identical').length, differs: replays.filter((r) => r.status === 'differs').length,
      skipped: replays.filter((r) => r.status === 'skipped').length, skippedBecause: because,
    },
    perCommit: reports,
    notes: [
      'The share is of changes (rows edited, rows appended, rows removed, columns added, and so on), not of cells or of commits; the commit shares are beside it.',
      'A diff-derived command set can express any cell edit, so a high expressed share is expected; the residue is the result, and the byte replay tests the service, not the share.',
      'A column added with a value that differs between rows counts its exceptions as cell edits (correctValue after addColumn).',
      'A file beside the tables (schema/db.schema.json, schema/estimate-model.schema.json, the data/review files) is one residue change per file: no command changes it. The manifest and the removed-records ledger are bookkeeping of the other changes and are not counted.',
      'The schema changes (a column added, dropped or moved, a schema document, a vocabulary word) are classified from the diff, not replayed commit by commit: the commands that make them are tested by their own round trip (tests/remake/write-schema.test.mjs). A fill that is not a declared missing-state word, or a vocabulary file that is not canonical CSV, would be refused by the service.',
      'Only commits that change data/tables, data/manifest.json or schema/ are in the window; a commit that changes only a review file is not.',
    ],
  };
}

export function writeCoverageReport(report: CoverageReport, path: string): void {
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
}
