// The structural commands (WP-17; pack 04 section 5, 03 ADR-02 and ADR-03): `addVocab`, `addColumn` and `schemaEdit` change a schema file
// and the data that follows from it in one change set, always Tier 1. No database is migrated in place: the tables are read, reshaped to
// the edited schema, and the workspace's tables are dropped and loaded again under the new storage DDL, inside the command's transaction.
// A schema the generator refuses, or data the new schema refuses, is a refusal that changes nothing.
//
// What the service does not do: create or drop a whole table (the 36 tables are the schema owner's), or change a vocabulary word that is
// there (a word that goes needs a ruling and a migration of the data that uses it: a later command).
import type { AddColumnCommand, AddVocabCommand, CanonicalCells, JsonValue, PatchOp, SchemaEditCommand } from '@atlas/domain/contracts';
import { csvText, parseCsv } from './csv.ts';
import { sha256Of } from './digest.ts';
import { constraintKind } from './driver.ts';
import type { Db } from './driver.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { PatchError, applyPatch, isObject, orderedValue } from './json-patch.ts';
import { createViews, DataInputError } from './rebuild.ts';
import { SchemaInvalidError, modelWith } from './schema-model.ts';
import type { SchemaFiles, SchemaModel } from './schema-model.ts';
import { quoteIdent, readCells, storageOf } from './storage.ts';
import { Refusal, checkExpectation, checkRuleRows, isCanonicalText, knownTable, plainJson, putMeta, requireRuling } from './write-core.ts';
import type { Env, Plan } from './write-core.ts';

const tableFile = (table: TableName): string => `schema/tables/${table}.schema.json`;
const textList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []);

/** A table's schema document as the model holds it now. */
function tableDocument(env: Env, table: TableName): Record<string, unknown> {
  const text = env.model.fileText(tableFile(table));
  const parsed: unknown = text === null ? null : JSON.parse(text);
  if (!isObject(parsed)) throw new Error(`internal: ${tableFile(table)} is not a JSON object`);
  return parsed;
}

const fieldsOf = (doc: Record<string, unknown>): Record<string, unknown>[] => (Array.isArray(doc.fields) ? doc.fields.filter(isObject) : []);
const fieldNames = (doc: Record<string, unknown>): string[] => fieldsOf(doc).flatMap((f) => (typeof f.name === 'string' ? [f.name] : []));
const documentText = (doc: unknown): string => `${JSON.stringify(doc, null, 2)}\n`;

/** The model of the schema after `files` replace those of the current model; the generator's own refusal becomes ours. */
function modelAfter(env: Env, files: SchemaFiles): SchemaModel {
  try {
    return modelWith({ ...env.model.overlay, ...files });
  } catch (error) {
    if (error instanceof SchemaInvalidError) throw new Refusal('schema-patch-invalid', `the schema this gives is not valid: ${error.message}`);
    throw error;
  }
}

/** What an existing row holds in a new column: one of the words the column declares for a missing value (D3, D47), or nothing if it is optional. */
function checkFill(field: Record<string, unknown>, name: string, fill: string | null | undefined): string | null {
  const missing = textList(field.missing);
  const required = isObject(field.constraints) && field.constraints.required === true;
  if (fill === undefined || fill === null) {
    if (required) {
      throw new Refusal('schema-violation', `${name} is a new required column; the rows that exist hold ${missing.length ? `one of ${missing.join(', ')}` : 'a value'} in it. Give fill${missing.length ? ' as one of those words' : ''}, never an invented value`);
    }
    return null;
  }
  if (!missing.includes(fill)) {
    throw new Refusal('schema-violation', `${JSON.stringify(fill)} is not a missing-state word ${name} declares${missing.length ? ` (${missing.join(', ')})` : ' (it declares none)'}; existing rows get a declared word or nothing, never an invented value`);
  }
  return fill;
}

type RowMap = (row: CanonicalCells) => CanonicalCells;

/** Every table's rows under the current model, as cells in the order of the new model's columns; a table in `reshapes` has its rows reshaped on the way. */
function readReshaped(env: Env, next: SchemaModel, reshapes: ReadonlyMap<TableName, RowMap>): Map<TableName, (string | null)[][]> {
  const rows = new Map<TableName, (string | null)[][]>();
  for (const table of TABLE_NAMES) {
    const old = storageOf(table, env.model).header;
    const target = storageOf(table, next).header;
    const reshape = reshapes.get(table);
    rows.set(table, [...readCells(env.db, table, env.model)].map((cells) => {
      if (reshape === undefined) return cells;
      const moved = reshape(Object.fromEntries(old.map((name, k) => [name, cells[k] ?? null])));
      return target.map((name) => moved[name] ?? null);
    }));
  }
  return rows;
}

/** Insert the rows under the new storage DDL. Every row the database refuses is a problem; the first five are reported in one refusal. */
function loadRows(db: Db, next: SchemaModel, rows: ReadonlyMap<TableName, readonly (readonly (string | null)[])[]>): void {
  const problems: string[] = [];
  for (const table of TABLE_NAMES) {
    const storage = storageOf(table, next);
    const insert = db.prepare(storage.insertSql);
    (rows.get(table) ?? []).forEach((cells, k) => {
      try {
        insert.run(...storage.encode(k + 1, cells));
      } catch (error) {
        if (constraintKind(error) === null) throw error;
        if (problems.length < 5) problems.push(`${table} row ${k + 1} (${cells[0] ?? 'empty first cell'}): ${(error instanceof Error ? error.message : String(error)).slice(0, 160)}`);
      }
    });
  }
  if (problems.length) throw new Refusal('schema-violation', `the data does not fit the schema this gives:\n  ${problems.join('\n  ')}`);
}

/** Foreign keys all have their parent, and every view of db/views still runs. */
function proveReferencesAndViews(db: Db): void {
  const dangling = db.prepare('PRAGMA foreign_key_check').all();
  if (dangling.length) throw new Refusal('schema-violation', `${dangling.length} reference(s) have no parent row under the schema this gives (first: ${String(dangling[0]?.table)} to ${String(dangling[0]?.parent)})`);
  try {
    createViews(db);
  } catch (error) {
    // A view SQLite cannot make or query under the new columns is the schema's fault; a view file that cannot be read is not.
    const sqliteFailed = typeof error === 'object' && error !== null && 'errcode' in error;
    if (!(error instanceof DataInputError) && !sqliteFailed) throw error;
    const why = error instanceof DataInputError ? error.problems.join('; ') : error instanceof Error ? error.message : String(error);
    throw new Refusal('schema-violation', `a view of db/views no longer works under the schema this gives (${why}); a column a view reads is not dropped or renamed here`);
  }
}

/**
 * Read every table under the current model, reshape the ones that change, drop the tables and the views, create them again under the new
 * storage DDL and load the rows, then prove the result the way a rebuild does (every constraint, foreign keys, every view queried). The
 * transaction is the caller's; any problem is a refusal that rolls it back.
 */
function rebuildUnder(env: Env, next: SchemaModel, reshapes: ReadonlyMap<TableName, RowMap>): void {
  const { db } = env;
  db.exec('PRAGMA defer_foreign_keys = ON');
  const rows = readReshaped(env, next, reshapes);
  for (const view of db.prepare("SELECT name FROM sqlite_schema WHERE type = 'view'").all()) db.exec(`DROP VIEW ${quoteIdent(String(view.name))}`);
  for (const table of TABLE_NAMES) db.exec(`DROP TABLE ${quoteIdent(table)}`);
  db.exec(next.storageDdl);
  loadRows(db, next, rows);
  proveReferencesAndViews(db);

  putMeta(db, 'schema_sha256', next.digest);
  putMeta(db, 'storage_ddl_sha256', sha256Of(next.storageDdl));
  if (Object.keys(next.overlay).length) putMeta(db, 'schema_overlay', JSON.stringify(next.overlay));
  else db.prepare('DELETE FROM "_meta" WHERE "key" = ?').run('schema_overlay');
}

/** The plan every structural command shares: the new files, how rows change shape, and a record that says which schema moved to which. */
function schemaPlan(
  env: Env, command: AddVocabCommand | AddColumnCommand | SchemaEditCommand, table: TableName, files: SchemaFiles, reshapes: ReadonlyMap<TableName, RowMap>,
  after: CanonicalCells, args: { readonly [key: string]: JsonValue },
): Plan {
  const next = modelAfter(env, files);
  const rulings = command.rulings ?? [];
  if (!env.legacy) checkRuleRows(env.ctx, table, `schema:${table}`, rulings);
  return {
    table, recordId: command.kind === 'addVocab' ? `vocab:${command.vocab.stem}` : `schema:${table}`,
    recordBefore: { 'schema digest': env.model.digest }, recordAfter: { 'schema digest': next.digest, ...after }, writes: [], rulings, reviewedBy: command.reviewedBy ?? [],
    perform: () => {
      rebuildUnder(env, next, reshapes);
      env.pendingModel = next;
    },
    args: { expect: plainJson(command.expect), ...args, files: Object.keys(files).sort(), tables: [...reshapes.keys()].sort() },
  };
}

/** `doc` with `patch` applied; a patch that does not apply, or that leaves something that is not a document, is a refusal. */
function patchedDocument(doc: Record<string, unknown>, patch: readonly PatchOp[]): Record<string, unknown> {
  try {
    const result = applyPatch(doc, patch);
    if (!isObject(result)) throw new PatchError('the patch leaves something that is not a schema document');
    return result;
  } catch (error) {
    if (error instanceof PatchError) throw new Refusal('schema-patch-invalid', error.message);
    throw error;
  }
}

// ---------------------------------------------------------------- addVocab

const csvField = (value: string): string => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

/** The text of a vocabulary file with `value` added: appended, or (`after` given) placed after that word in a file already in canonical form. */
function vocabularyWith(path: string, text: string, stem: string, value: string, extra: CanonicalCells | undefined, after: string | undefined): string {
  const bom = text.startsWith('﻿') ? '﻿' : '';
  const plain = text.slice(bom.length);
  const { header, records } = parseCsv(plain, path);
  const unknownExtra = Object.keys(extra ?? {}).filter((name) => !header.includes(name) || name === 'Value');
  if (unknownExtra.length) throw new Refusal('unknown-target', `${path} has the columns ${header.join(', ')}; ${unknownExtra.join(', ')} ${unknownExtra.length === 1 ? 'is' : 'are'} not another column of it`);
  const cells = header.map((name) => (name === 'Value' ? value : (extra?.[name] ?? null)));
  if (after === undefined) return `${text}${text.endsWith('\n') ? '' : '\n'}${cells.map((cell) => csvField(cell ?? '')).join(',')}\n`;

  // Inside the file: only a file already in canonical form is rewritten, so the rest of it is not reformatted behind the edit.
  const rows = records.map((record) => [...record.cells]);
  if (csvText(header, rows) !== plain) throw new Refusal('schema-patch-invalid', `${path} is not in canonical CSV form, so a word cannot be placed inside it; omit "after" to append it`);
  const at = rows.findIndex((row) => row[0] === after);
  if (at < 0) throw new Refusal('unknown-target', `${stem} has no word ${JSON.stringify(after)} to put ${JSON.stringify(value)} after`);
  rows.splice(at + 1, 0, cells);
  return `${bom}${csvText(header, rows)}`;
}

export function planAddVocab(env: Env, command: AddVocabCommand): Plan {
  const table = knownTable(command.target.table);
  checkExpectation(env, command, { table, id: null }, []);
  if (typeof command.vocab !== 'object' || command.vocab === null) throw new Refusal('schema-patch-invalid', 'a vocabulary word gives vocab { stem, value, extra? }');
  const { stem, value, extra, after } = command.vocab;
  const vocabulary = env.model.vocabulary(stem);
  if (vocabulary === null) throw new Refusal('unknown-target', `there is no vocabulary ${JSON.stringify(stem)} (schema/vocab/${stem}.csv)`);
  if (!vocabulary.users.some((user) => user.table === table)) {
    throw new Refusal('unknown-target', `${table} takes no words from ${stem}; its columns that do are ${vocabulary.users.map((u) => `${u.table}.${u.column}`).join(', ')}`);
  }
  if (!isCanonicalText(value) || /[\n\r]/.test(value)) {
    throw new Refusal('not-canonical', `the new word ${JSON.stringify(value)} is not canonical text (trimmed, on one line)`);
  }
  if (vocabulary.values.includes(value)) throw new Refusal('no-change', `${stem} already has the word ${JSON.stringify(value)}; there is nothing to record`);

  const path = `schema/vocab/${stem}.csv`;
  const text = env.model.fileText(path);
  if (text === null) throw new Error(`internal: the schema holds no file ${path}`);
  const grown = vocabularyWith(path, text, stem, value, extra, after);
  return schemaPlan(env, command, table, { [path]: grown }, new Map(), { Value: value, ...(extra ?? {}) }, { vocab: plainJson(command.vocab) });
}

// ---------------------------------------------------------------- addColumn

export function planAddColumn(env: Env, command: AddColumnCommand): Plan {
  const table = knownTable(command.target.table);
  checkExpectation(env, command, { table, id: null }, []);
  if (typeof command.column !== 'object' || command.column === null) throw new Refusal('schema-patch-invalid', 'a new column gives column { name, field, after?, fill }');
  const { name, field, after, fill } = command.column;
  const doc = tableDocument(env, table);
  const names = fieldNames(doc);
  if (!isCanonicalText(name)) throw new Refusal('not-canonical', `the new column's name ${JSON.stringify(name)} is not canonical text`);
  if (names.includes(name)) throw new Refusal('schema-patch-invalid', `${table} has a column "${name}" already`);
  if (!isObject(field) || field.name !== name) throw new Refusal('schema-patch-invalid', `column.field is the schema field of "${name}" and carries "name": ${JSON.stringify(name)}`);
  if (after !== undefined && !names.includes(after)) throw new Refusal('schema-patch-invalid', `${table} has no column "${after}" to put "${name}" after`);
  const filled = checkFill(field, name, fill);

  const at = after === undefined ? names.length : names.indexOf(after) + 1;
  const grown = patchedDocument(doc, [{ op: 'add', path: `/fields/${at}`, value: field }]);
  const reshape: RowMap = (row) => ({ ...row, [name]: filled });
  return schemaPlan(env, command, table, { [tableFile(table)]: documentText(grown) }, new Map([[table, reshape]]), { [name]: filled }, { column: plainJson(command.column) });
}

// ---------------------------------------------------------------- schemaEdit

/** A row of the old columns as a row of the new: a renamed column keeps its cell, an added one takes its fill, the rest are kept. */
function reshapeTo(now: readonly string[], renamed: ReadonlyMap<string, string>, fills: ReadonlyMap<string, string | null>): RowMap {
  return (row) => Object.fromEntries(now.map((name) => {
    const from = [...renamed].find(([, to]) => to === name)?.[0];
    return [name, from !== undefined ? (row[from] ?? null) : fills.has(name) ? (fills.get(name) ?? null) : (row[name] ?? null)];
  }));
}

export function planSchemaEdit(env: Env, command: SchemaEditCommand): Plan {
  const table = knownTable(command.target.table);
  checkExpectation(env, command, { table, id: null }, []);
  if (typeof command.schema !== 'object' || command.schema === null) throw new Refusal('schema-patch-invalid', 'a schema edit gives schema { patch, fill?, renames? }');
  const { patch, fill, renames } = command.schema;
  if (!Array.isArray(patch) || patch.length === 0) throw new Refusal('schema-patch-invalid', 'a schema edit gives a patch of at least one operation');
  const before = tableDocument(env, table);
  const edited = patchedDocument(before, patch);
  if (JSON.stringify(orderedValue(edited)) === JSON.stringify(orderedValue(before))) throw new Refusal('no-change', `the patch leaves ${tableFile(table)} as it is; there is nothing to record`);

  const was = fieldNames(before);
  const now = fieldNames(edited);
  if (new Set(now).size !== now.length) throw new Refusal('schema-patch-invalid', `the patch gives ${table} two columns of one name`);
  const renamed = new Map(Object.entries(renames ?? {}));
  for (const [from, to] of renamed) {
    if (!was.includes(from) || !now.includes(to) || was.includes(to)) throw new Refusal('schema-patch-invalid', `renames: ${JSON.stringify(from)} to ${JSON.stringify(to)} must be a column that is there and one that is new`);
  }
  const added = now.filter((name) => !was.includes(name) && ![...renamed.values()].includes(name));
  const dropped = was.filter((name) => !now.includes(name) && !renamed.has(name));
  if (dropped.length && !env.legacy) requireRuling(env.ctx, command.rulings ?? [], `dropping ${table}.${dropped.join(', ')} removes the data in it`);
  const fills = new Map<string, string | null>();
  for (const name of added) {
    const field = fieldsOf(edited).find((f) => f.name === name);
    if (field === undefined) throw new Error(`internal: the edited schema lost its column ${name}`);
    fills.set(name, checkFill(field, name, fill?.[name]));
  }
  const unused = Object.keys(fill ?? {}).filter((name) => !added.includes(name));
  if (unused.length) throw new Refusal('schema-patch-invalid', `fill gives ${unused.join(', ')}, which the patch does not add as a column of ${table}`);

  const changesRows = added.length > 0 || dropped.length > 0 || renamed.size > 0 || was.some((name, k) => now[k] !== name);
  const reshapes = changesRows ? new Map([[table, reshapeTo(now, renamed, fills)]]) : new Map<TableName, RowMap>();
  return schemaPlan(env, command, table, { [tableFile(table)]: documentText(edited) }, reshapes, {}, { schema: plainJson(command.schema) });
}
