// The commands that change rows (WP-10 correctValue; WP-17 the rest; pack 04 section 5): each is a planner that checks the command against
// the guards and returns a Plan, and write.ts runs the plan in one transaction.
//
// Ported from the old write path, each guard after reading the code it comes from (scripts/data/records.mjs newRecord, retireGrade,
// moveGrade; scripts/data/table-io.mjs set, update, append; AGENTS.md "Retire a duplicate record", "Move a product"):
//   addMeasurement / addRecord   append at the end, key and natural key unique, evidence when a decision-reading column is written
//   retireRecord                 the word the table's convention has, a successor that exists; nothing is deleted
//   moveGrade                    the grade and the records filed under it change material together, every ID stays (D86), D72 ledger rows
//   reviseProfile                a raw profile cell and the typed cells read from it change together
//   reclassifyProduct            Role, Variant and Shared formulation key; the Role agrees with the -R# of the ID
import type {
  AddMeasurementCommand, AddRecordCommand, CanonicalCells, CorrectValueCommand, DuplicateOf, LedgerRow, MoveGradeCommand, ReclassifyProductCommand,
  RetireRecordCommand, ReviseProfileCommand,
} from '@atlas/domain/contracts';
import type { Param } from './driver.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { isObject } from './json-patch.ts';
import { quoteIdent, storageOf, textExpression } from './storage.ts';
import {
  MEASUREMENT_TOGETHER, PROFILE_TOGETHER, Refusal, StaleRefusal, applySet, cellAt, cellsOfRow, checkEvidence, checkExpectation, checkMissingAsNumber,
  checkNotes, checkOwnership, checkReviewer, checkRuleRows, checkTogether, checkTypedWords, checkUnit, columnOf, decisionReading, expectRecord, idOfRow,
  isCanonicalText, keyColumns, knownTable, locate, nextOrd, plainJson, shown,
} from './write-core.ts';
import type { Env, Plan, RowWrite, TogetherGroups } from './write-core.ts';

const isCanonicalCell = (value: unknown): value is string | null => value === null || isCanonicalText(value);

/** The rows of `table` (with their `_ord`) that satisfy a SQL condition over the columns' text expressions, in file order. */
function rowsWhere(env: Env, table: TableName, where: string, params: readonly Param[]): { readonly ord: number; readonly cells: CanonicalCells }[] {
  const hits = env.db.prepare(`SELECT _ord FROM ${quoteIdent(table)} WHERE ${where} ORDER BY _ord`).all(...params);
  return hits.flatMap((hit) => {
    const ord = hit._ord;
    const cells = typeof ord === 'number' ? cellsOfRow(env, table, ord) : null;
    return typeof ord === 'number' && cells !== null ? [{ ord, cells }] : [];
  });
}

/** Every cell of a set is canonical cell text (trimmed, not empty) or null, in a column the table has. */
function checkCells(env: Env, table: TableName, cells: CanonicalCells): void {
  for (const [name, value] of Object.entries(cells)) {
    if (!columnOf(env, table, name)) throw new Refusal('unknown-target', `${table} has no column "${name}"`);
    if (!isCanonicalCell(value)) {
      throw new Refusal('not-canonical', `${table}.${name}: ${JSON.stringify(value)} is not canonical cell text (trimmed text, or null for an empty cell)`);
    }
  }
}

/** The measurement guards on the cells a command writes (04 section 5.1): together, missing-as-number, unit, and the grade's owner. */
function checkRowGuards(env: Env, table: TableName, together: TogetherGroups, touched: ReadonlySet<string>, after: CanonicalCells, apart: string | undefined): void {
  checkTogether(together, touched, apart);
  if (table === 'measurements') {
    checkMissingAsNumber(touched, after);
    checkUnit(env, touched, after);
  }
  checkOwnership(env, table, touched, after);
}

// ---------------------------------------------------------------- correctValue, reviseProfile, reclassifyProduct: cells of one record

type CellEditCommand = CorrectValueCommand | ReviseProfileCommand | ReclassifyProductCommand;

interface CellEditSpec {
  /** The only table the command changes, if it has one. */
  readonly table?: TableName;
  /** The only columns it may set, if it has a list. */
  readonly columns?: readonly string[];
  readonly together: TogetherGroups;
  /** A correction always carries evidence; the others carry it when a decision-reading column is written. */
  readonly evidence: 'always' | 'decision';
  /** A guard of the command's own, run on the record's ID and the cells after the change. */
  readonly extra?: (id: string, after: CanonicalCells) => void;
}

function planCellEdit(env: Env, command: CellEditCommand, spec: CellEditSpec): Plan {
  const { id } = command.target;
  const table = knownTable(command.target.table);
  if (typeof id !== 'string' || id === '') throw new Refusal('unknown-target', 'a correction names the record it changes (target.id)');
  if (spec.table !== undefined && table !== spec.table) throw new Refusal('not-for-command', `${command.kind} changes ${spec.table} records; ${table} is changed by correctValue`);
  const names = Object.keys(command.set);
  if (names.length === 0) throw new Refusal('no-change', 'set is empty: a correction sets at least one cell');
  checkCells(env, table, command.set);
  const allowed = spec.columns;
  if (allowed !== undefined) {
    const outside = names.filter((name) => !allowed.includes(name));
    if (outside.length) throw new Refusal('not-for-command', `${command.kind} sets ${allowed.join(', ')}; ${outside.join(', ')} ${outside.length === 1 ? 'is' : 'are'} changed by correctValue`);
  }

  const { ord, current } = expectRecord(env, command, { table, id }, names);

  // Nothing is deleted and no key moves (rule 3; table-io `set` on a primary key).
  const { after, changed } = applySet(current, command.set);
  const keys = keyColumns(env, table);
  const rekeyed = changed.find((name) => keys.has(name));
  if (rekeyed !== undefined) {
    throw new Refusal('delete-refused', `${table}.${rekeyed} identifies the record; changing it would remove ${id} under its old key, and nothing is deleted (re-keying needs the removal ledger, a later command)`);
  }
  if (changed.length === 0) throw new Refusal('no-change', `every cell already holds the value the command sets (${names.join(', ')}); there is nothing to record`);

  // Rule rows cite a ruling and travel alone (rule 4; EV-04); new Notes text carries no ID (rule 6, OQ-16 A).
  const rulings = command.rulings ?? [];
  if (!env.legacy) {
    checkRuleRows(env.ctx, table, id, rulings);
    checkNotes(cellAt(current, 'Notes'), command.set.Notes);
  }
  checkTypedWords(env, table, changed, after);
  let reviewedBy = command.reviewedBy ?? [];
  if (!env.legacy) {
    checkRowGuards(env, table, spec.together, new Set(names), after, command.apart);
    spec.extra?.(id, after);
    reviewedBy = checkReviewer(env, table, command.set, command.reviewedBy);
  }
  // Evidence (rule 2): a correction always carries it; another command when a decision-reading column is written. Always checked when given.
  const evidence = command.evidence;
  const needed = spec.evidence === 'always' || decisionReading(env, table, changed);
  const quoteCheck = !env.legacy && (needed || evidence !== undefined) ? checkEvidence(env, command, evidence, table, id, command.set, changed, after) : undefined;

  const write: RowWrite = { table, id, mode: 'update', ord, before: current, after, changed };
  return {
    table, recordId: id,
    recordBefore: Object.fromEntries(names.map((name) => [name, cellAt(current, name)])),
    recordAfter: Object.fromEntries(names.map((name) => [name, cellAt(command.set, name)])),
    writes: [write], rulings, reviewedBy,
    ...(evidence === undefined ? {} : { evidence }),
    ...(quoteCheck === undefined ? {} : { quoteCheck }),
    ...(command.apart === undefined ? {} : { cellsApart: command.apart }),
    ...(command.kind === 'correctValue' ? {} : { args: { expect: plainJson(command.expect) } }),
  };
}

/** Only a measurement's raw, numeric and normalized cells are one fact; correctValue on another table keeps its own old rules. */
export const planCorrectValue = (env: Env, command: CorrectValueCommand): Plan =>
  planCellEdit(env, command, { together: command.target.table === 'measurements' ? MEASUREMENT_TOGETHER : [], evidence: 'always' });

export const planReviseProfile = (env: Env, command: ReviseProfileCommand): Plan =>
  planCellEdit(env, command, { table: 'profiles', together: PROFILE_TOGETHER, evidence: 'decision' });

const CLASSIFICATION_COLUMNS = ['Role', 'Variant', 'Shared formulation key'] as const;

/** A non-procurement grade (study, reference) carries an -R# in its ID; a procurement grade does not (the build checks it too). */
function checkRoleMatchesId(id: string, after: CanonicalCells): void {
  const role = cellAt(after, 'Role');
  if (role === null) return;
  const study = /-R\d+$/.test(id);
  if ((role === 'procurement') === study) {
    throw new Refusal('role-id-mismatch', `${id} is ${study ? 'an -R# grade' : 'a numbered grade'}, so its Role is ${study ? 'study or reference' : 'procurement'}, not ${shown(role)}; a grade whose Role changes is re-filed, not relabelled`);
  }
}

export const planReclassifyProduct = (env: Env, command: ReclassifyProductCommand): Plan =>
  planCellEdit(env, command, { table: 'grades', columns: CLASSIFICATION_COLUMNS, together: [], evidence: 'decision', extra: checkRoleMatchesId });

// ---------------------------------------------------------------- addMeasurement, addRecord: a new row at the end

/** The columns that make a new measurement the same observation as an existing one (grade, property, source, locator and condition cells). */
const MEASUREMENT_NATURAL_KEY: readonly string[] = [
  'GradeID', 'Property', 'SourceID', 'Locator', 'Specimen type', 'Direction', 'Moisture state', 'Post-processing state', 'Anneal °C', 'Anneal h',
  'Test temperature °C', 'Test load MPa', 'Notch', 'Standards',
];

/** The IDs of the rows of `table` whose natural-key cells equal `row`'s. */
function naturalKeyMatches(env: Env, table: TableName, key: readonly string[], row: CanonicalCells): string[] {
  const where = key.map((name) => `${textExpression(table, name, env.model)} IS ?`).join(' AND ');
  return rowsWhere(env, table, where, key.map((name) => cellAt(row, name))).flatMap(({ cells }) => {
    const id = idOfRow(env, table, cells);
    return id === null ? [] : [id];
  });
}

/** A new record that is a twin of one that exists is refused unless the command says why (duplicateOf, which names a twin that is there). Returns the duplicateOf to keep. */
function checkNotATwin(env: Env, command: AddMeasurementCommand | AddRecordCommand, table: TableName, full: CanonicalCells): DuplicateOf | undefined {
  const key = env.model.naturalKey(table) ?? (table === 'measurements' ? MEASUREMENT_NATURAL_KEY : null);
  const duplicateOf = command.kind === 'addMeasurement' ? command.duplicateOf : undefined;
  if (key !== null) {
    const twins = naturalKeyMatches(env, table, key, full);
    if (twins.length && duplicateOf === undefined) {
      throw new Refusal('duplicate-key', `${table} ${twins.slice(0, 3).join(', ')} ${twins.length === 1 ? 'is' : 'are'} the same observation (${key.join(', ')} are equal); an append that is a twin on purpose says so in duplicateOf {id, reason}`);
    }
  }
  if (duplicateOf !== undefined) {
    if (typeof duplicateOf.reason !== 'string' || duplicateOf.reason.trim() === '') throw new Refusal('duplicate-of-invalid', 'duplicateOf gives the reason the new record is a twin on purpose');
    if (locate(env, table, duplicateOf.id) === null) throw new Refusal('duplicate-of-invalid', `duplicateOf names ${table} ${duplicateOf.id}, which does not exist`);
  }
  return duplicateOf;
}

export function planAdd(env: Env, command: AddMeasurementCommand | AddRecordCommand): Plan {
  const table = knownTable(command.target.table);
  if (command.kind === 'addMeasurement' && table !== 'measurements') throw new Refusal('not-for-command', `addMeasurement appends to measurements; ${table} takes addRecord`);
  if (command.kind === 'addRecord' && table === 'measurements') throw new Refusal('not-for-command', 'a new measurement is an addMeasurement (natural key, evidence); addRecord appends to the other tables');
  if (command.kind === 'addRecord' && table === 'sources') throw new Refusal('not-for-command', 'a source enters through the ingest journey, fetched and hashed (WP-28); the write service does not add one by hand');
  const { row } = command;
  if (!isObject(row)) throw new Refusal('not-canonical', 'a new record gives its row as an object of cells');
  checkCells(env, table, row);
  const header = storageOf(table, env.model).header;
  const full: CanonicalCells = Object.fromEntries(header.map((name) => [name, cellAt(row, name)]));
  const id = idOfRow(env, table, full);
  if (id === null) throw new Refusal('schema-violation', `${table}: a new record gives every cell of its key (${[...keyColumns(env, table)].join(', ')})`);

  checkExpectation(env, command, { table, id: null }, []);
  if (locate(env, table, id) !== null) throw new Refusal('duplicate-key', `${table} already has a record ${id}; an ID is never reused (a changed record is a correction, a replaced one is retired)`);

  const rulings = command.rulings ?? [];
  const touched = new Set(header);
  let reviewedBy = command.reviewedBy ?? [];
  let duplicateOf: DuplicateOf | undefined;
  if (!env.legacy) {
    duplicateOf = checkNotATwin(env, command, table, full);
    checkRuleRows(env.ctx, table, id, rulings);
    checkNotes(null, row.Notes);
  }
  checkTypedWords(env, table, header, full);
  if (!env.legacy) {
    checkRowGuards(env, table, table === 'measurements' ? MEASUREMENT_TOGETHER : [], touched, full, undefined);
    reviewedBy = checkReviewer(env, table, full, command.reviewedBy);
  }
  const evidence = command.evidence;
  const needed = command.kind === 'addMeasurement' || decisionReading(env, table, header);
  const quoteCheck = !env.legacy && (needed || evidence !== undefined) ? checkEvidence(env, command, evidence, table, id, full, header, full) : undefined;

  const write: RowWrite = { table, id, mode: 'insert', ord: nextOrd(env, table), before: null, after: full, changed: header };
  return {
    table, recordId: id, recordBefore: {}, recordAfter: full, writes: [write], rulings, reviewedBy,
    ...(evidence === undefined ? {} : { evidence }),
    ...(quoteCheck === undefined ? {} : { quoteCheck }),
    ...(duplicateOf === undefined ? {} : { duplicateOf }),
    args: { expect: plainJson(command.expect) },
  };
}

// ---------------------------------------------------------------- retireRecord: marked, never deleted

/** What a table's retirement writes. The word is the table's own vocabulary; nothing is deleted (rule 3). */
interface Retirement {
  readonly as: 'retired' | 'superseded';
  /** The successor is required (it is named in a cell, or the old record is replaced by it). */
  readonly successor: boolean;
  /** The cells the retirement replaces: all named in `expect`, or the row hash. */
  readonly columns: readonly string[];
  readonly cells: (current: CanonicalCells, successor: string | undefined, reason: string) => CanonicalCells;
  /** Whether a record is retired already (a successor must not be). */
  readonly isRetired: (cells: CanonicalCells) => boolean;
}

const DUPLICATE = 'Retired duplicate record';

const RETIREMENTS: Partial<Record<TableName, Retirement>> = {
  grades: { as: 'retired', successor: false, columns: ['Status'], cells: () => ({ Status: 'retired' }), isRetired: (c) => c.Status === 'retired' },
  measurements: { as: 'retired', successor: true, columns: ['Data status'], cells: () => ({ 'Data status': DUPLICATE }), isRetired: (c) => c['Data status'] === DUPLICATE },
  evidence: { as: 'retired', successor: true, columns: ['Evidence type'], cells: () => ({ 'Evidence type': DUPLICATE }), isRetired: (c) => c['Evidence type'] === DUPLICATE },
  profiles: {
    as: 'retired', successor: true, columns: ['Profile', 'Locator'],
    cells: (c, successor) => ({ Profile: DUPLICATE, Locator: `Retired duplicate of ${successor ?? ''}: ${cellAt(c, 'Locator') ?? ''}`.trim() }),
    isRetired: (c) => c.Profile === DUPLICATE,
  },
  prices: {
    as: 'retired', successor: false, columns: ['Quarantined', 'Regular price basis'],
    cells: (_c, _s, reason) => ({ Quarantined: 'TRUE', 'Regular price basis': `Quarantined: ${reason}` }), isRetired: (c) => c.Quarantined === 'TRUE',
  },
  coverage: {
    as: 'superseded', successor: true, columns: ['Status', 'Finding'],
    cells: (c, successor) => ({ Status: 'Superseded', Finding: `Superseded by ${successor ?? ''}: ${cellAt(c, 'Finding') ?? ''}`.trim() }), isRetired: (c) => c.Status === 'Superseded',
  },
  sources: {
    as: 'superseded', successor: true, columns: ['Superseded by'], cells: (_c, successor) => ({ 'Superseded by': successor ?? '' }),
    isRetired: (c) => c['Superseded by'] !== null && c['Superseded by'] !== 'Not applicable',
  },
};

/** The tables a record can be retired in, with the cells each retirement replaces (what `expect.cells` names, or the row hash stands for). */
export const RETIREMENT_COLUMNS: Readonly<Partial<Record<TableName, readonly string[]>>> = Object.fromEntries(
  TABLE_NAMES.flatMap((table) => { const r = RETIREMENTS[table]; return r === undefined ? [] : [[table, r.columns]]; }),
);

export function planRetire(env: Env, command: RetireRecordCommand): Plan {
  const { id } = command.target;
  const table = knownTable(command.target.table);
  if (typeof id !== 'string' || id === '') throw new Refusal('unknown-target', 'a retirement names the record it retires (target.id)');
  const retirement = RETIREMENTS[table];
  if (retirement === undefined) {
    throw new Refusal('not-for-command', `${table} has no retirement convention; a record can be retired in ${Object.keys(RETIREMENTS).join(', ')}. Nothing is deleted`);
  }
  if (typeof command.retire !== 'object' || command.retire === null) throw new Refusal('not-for-command', 'a retirement gives retire { as, successor? }');
  const { as, successor } = command.retire;
  if (as !== retirement.as) throw new Refusal('not-for-command', `a ${table} record is ${retirement.as}, not ${as}`);
  if (retirement.successor && (successor === undefined || successor === '')) {
    throw new Refusal('successor-invalid', `${table} ${id} is ${retirement.as} by naming the record that replaces it: give retire.successor`);
  }

  const { ord, current } = expectRecord(env, command, { table, id }, retirement.columns);

  if (successor !== undefined) {
    if (successor === id) throw new Refusal('successor-invalid', `${table} ${id} cannot be replaced by itself`);
    const successorOrd = locate(env, table, successor);
    const successorCells = successorOrd === null ? null : cellsOfRow(env, table, successorOrd);
    if (successorCells === null) throw new Refusal('successor-invalid', `the successor ${successor} is not a record of ${table}`);
    if (retirement.isRetired(successorCells)) throw new Refusal('successor-invalid', `the successor ${successor} is ${retirement.as} itself; name the record that stays`);
  }

  const set = retirement.cells(current, successor, command.reason);
  const { after, changed } = applySet(current, set);
  if (changed.length === 0) throw new Refusal('no-change', `${table} ${id} is already ${retirement.as}; there is nothing to record`);
  checkCells(env, table, set);
  checkTypedWords(env, table, changed, after);
  const rulings = command.rulings ?? [];
  if (!env.legacy) checkRuleRows(env.ctx, table, id, rulings);

  const dependents = table === 'grades' ? gradeDependents(env, id) : [];
  const write: RowWrite = { table, id, mode: 'update', ord, before: current, after, changed };
  return {
    table, recordId: id,
    recordBefore: Object.fromEntries(changed.map((name) => [name, cellAt(current, name)])),
    recordAfter: Object.fromEntries(changed.map((name) => [name, cellAt(after, name)])),
    writes: [write], rulings, reviewedBy: command.reviewedBy ?? [],
    // A retired grade leaves records resting on it; this command does not move them, so the record says which, and the person decides each.
    args: { expect: plainJson(command.expect), retire: plainJson(command.retire), ...(table === 'grades' && dependents.length ? { dependents } : {}) },
  };
}

/** What still rests on a grade, each with what must happen to it (the to-do list the old `data:retire` printed). Read only. */
export function gradeDependents(env: Env, gradeId: string): { readonly table: string; readonly record: string; readonly action: string }[] {
  const on = (table: TableName): CanonicalCells[] => rowsWhere(env, table, `${textExpression(table, 'GradeID', env.model)} = ?`, [gradeId]).map((row) => row.cells);
  const out: { table: string; record: string; action: string }[] = [];
  for (const m of on('measurements').filter((r) => !['Retired duplicate record', 'Unresolved unit / layout'].includes(String(r['Data status'])))) {
    out.push({ table: 'measurements', record: String(m.MeasurementID), action: 'retire as a duplicate if its twin exists under the active grade, else move it to the grade that is its product' });
  }
  for (const p of on('profiles')) out.push({ table: 'profiles', record: String(p.ProfileID), action: 'retire the profile or move it to the active grade (an active profile may not use a retired grade)' });
  for (const price of on('prices').filter((r) => r.Quarantined !== 'TRUE')) out.push({ table: 'prices', record: String(price.PriceID), action: 'quarantine the offer or move it to the active grade' });
  for (const e of on('evidence')) out.push({ table: 'evidence', record: String(e.EvidenceID), action: 'move the record to the active grade or quarantine it' });
  return out;
}

// ---------------------------------------------------------------- moveGrade: a product changes material, every ID stays (D86)

/** The tables whose records are filed under a grade and carry its material. */
const FILED_UNDER_GRADE: readonly TableName[] = ['measurements', 'profiles', 'evidence', 'prices'];

/** A write that files one row under another material: the only cell it changes. */
function refile(table: TableName, id: string, ord: number, cells: CanonicalCells, moveTo: string): RowWrite {
  return { table, id, mode: 'update', ord, before: cells, after: { ...cells, MaterialID: moveTo }, changed: ['MaterialID'] };
}

/** The records filed under a grade go with it. One filed under another material than the grade's is refused: that record is corrected first. */
function recordsMovingWithGrade(env: Env, gradeId: string, from: string | null, moveTo: string): RowWrite[] {
  return FILED_UNDER_GRADE.flatMap((filed) => rowsWhere(env, filed, `${textExpression(filed, 'GradeID', env.model)} = ?`, [gradeId]).map(({ ord, cells }) => {
    const rowId = idOfRow(env, filed, cells);
    if (rowId === null) throw new Error(`internal: a ${filed} record on ${gradeId} could not be read`);
    if (cells.MaterialID !== from) throw new Refusal('ownership-mismatch', `${filed} ${rowId} is on ${gradeId} but filed under ${shown(cells.MaterialID ?? null)}, not ${from ?? ''}; a grade's records belong to its material (D36). Correct that record first`);
    return refile(filed, rowId, ord, cells, moveTo);
  }));
}

/** A printing citation of a record that moves goes with it: the link's key names the material, so it is re-pointed, and the D72 ledger says so. */
function linksMovingWithRecords(env: Env, from: string | null, moveTo: string, movingIds: ReadonlySet<string>): { readonly writes: RowWrite[]; readonly ledger: LedgerRow[] } {
  const where = `${textExpression('material_links', 'MaterialID', env.model)} = ? AND ${textExpression('material_links', 'Link', env.model)} = 'printing'`;
  const writes: RowWrite[] = [];
  const ledger: LedgerRow[] = [];
  for (const { ord, cells } of rowsWhere(env, 'material_links', where, [from])) {
    if (!movingIds.has(String(cells.RecordID))) continue;
    const was = idOfRow(env, 'material_links', cells) ?? '';
    const write = refile('material_links', was, ord, cells, moveTo);
    writes.push(write);
    ledger.push({ Table: 'material_links', Record: was, Where: `re-pointed: the same row is now ${idOfRow(env, 'material_links', write.after) ?? ''}` });
  }
  return { writes, ledger };
}

export function planMoveGrade(env: Env, command: MoveGradeCommand): Plan {
  const { id } = command.target;
  const table = knownTable(command.target.table);
  if (table !== 'grades') throw new Refusal('not-for-command', `moveGrade moves a grade (grades); ${table} is not one`);
  if (typeof id !== 'string' || id === '') throw new Refusal('unknown-target', 'a move names the grade it moves (target.id)');
  const { moveTo, expectMaterial } = command;
  if (typeof moveTo !== 'string' || moveTo === '') throw new Refusal('unknown-target', 'a move names the material the grade goes to (moveTo)');
  if (typeof expectMaterial !== 'string' || expectMaterial === '') throw new Refusal('expectation-empty', 'a move names the material the grade is under now (expectMaterial), so a concurrent move is refused');

  const { ord, current, currentHash } = expectRecord(env, command, { table, id }, ['MaterialID']);
  const from = cellAt(current, 'MaterialID');
  if (from !== expectMaterial) {
    throw new StaleRefusal(`grade ${id} is under ${shown(from)} now, not ${shown(expectMaterial)} as the command expected: it was moved since. Read the grade again`,
      command.expect, { rowHash: currentHash, cells: current, schemaDigest: env.stamp.schemaSha256 });
  }
  if (from === moveTo) throw new Refusal('no-change', `grade ${id} is under ${moveTo} already`);
  if (locate(env, 'materials', moveTo) === null) throw new Refusal('reference-missing', `${moveTo} is not a material; a grade moves to a material that exists`);

  const filed = recordsMovingWithGrade(env, id, from, moveTo);
  const pins = filed.filter((write) => write.table === 'measurements').flatMap((write) => rowsWhere(env, 'headlines', `${textExpression('headlines', 'MeasurementID', env.model)} = ?`, [write.id]));
  if (pins.length) {
    throw new Refusal('not-for-command', `${pins.length} pinned headline value(s) rest on this grade's measurements (${pins.slice(0, 3).map((p) => idOfRow(env, 'headlines', p.cells) ?? '').join('; ')}${pins.length > 3 ? '; ...' : ''}); a pin names the material it is for, so moving the grade would leave it pointing at another material's measurement. Moving it is a decision about the old material, which no command makes yet`);
  }
  const links = linksMovingWithRecords(env, from, moveTo, new Set(filed.map((write) => write.id)));
  const rulings = command.rulings ?? [];
  if (!env.legacy) checkRuleRows(env.ctx, table, id, rulings);

  return {
    table, recordId: id, recordBefore: { MaterialID: from }, recordAfter: { MaterialID: moveTo }, writes: [refile(table, id, ord, current, moveTo), ...filed, ...links.writes],
    rulings, reviewedBy: command.reviewedBy ?? [],
    args: { expect: plainJson(command.expect), expectMaterial, moveTo }, ...(links.ledger.length ? { ledger: links.ledger } : {}),
  };
}
