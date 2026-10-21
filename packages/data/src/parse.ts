// Reading the write service's JSON files back into typed values: a command, a change record, a change set. Nothing is
// cast: each field is checked and a branded ID is made by its guard. A file that does not fit is reported with every problem
// found, never half-read (a command that is not fully understood is not applied).
import { readFileSync } from 'node:fs';
import type {
  Actor, AlsoChanged, CanonicalCells, ChangeRecord, ChangeSet, CommandBase, DuplicateOf, EvidenceRef, Expectation, GeneratorRef, JsonValue, LedgerRow,
  OpId, OtherWriteKind, PatchOp, QuoteCheck, Sha256, WriteCommand, WriteKind,
} from '@atlas/domain/contracts';
import { isChangeRecordId, isChangeSetId, isOpId, isSha256, isSourceId } from './digest.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { isObject } from './json-patch.ts';

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problems: readonly string[] };

const OTHER_KINDS: readonly OtherWriteKind[] = [
  'addRecord', 'retireRecord', 'moveGrade', 'reviseProfile', 'reclassifyProduct', 'acceptProposal', 'rejectProposal', 'holdProposal', 'addVocab',
  'addColumn', 'schemaEdit',
];
const KINDS: readonly WriteKind[] = ['correctValue', 'addMeasurement', ...OTHER_KINDS];

const isKind = (v: unknown): v is WriteKind => KINDS.some((k) => k === v);
const isTable = (v: unknown): v is TableName => typeof v === 'string' && TABLE_NAMES.some((t) => t === v);

const isJson = (v: unknown): v is JsonValue => {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(isJson);
  return isObject(v) && Object.values(v).every(isJson);
};

/** Collects problems while a value is read; every reader returns null after adding at least one. */
class Reader {
  readonly problems: string[] = [];
  fail(path: string, message: string): null { this.problems.push(`${path}: ${message}`); return null; }

  text(v: unknown, path: string): string | null { return typeof v === 'string' && v !== '' ? v : this.fail(path, 'expected non-empty text'); }
  optionalText(v: unknown, path: string): string | undefined | null { return v === undefined ? undefined : this.text(v, path); }

  sha256(v: unknown, path: string): Sha256 | null {
    return typeof v === 'string' && isSha256(v) ? v : this.fail(path, 'expected 64 lowercase hex characters');
  }
  optionalSha256(v: unknown, path: string): Sha256 | undefined | null { return v === undefined ? undefined : this.sha256(v, path); }

  opId(v: unknown, path: string): OpId | null {
    return typeof v === 'string' && isOpId(v) ? v : this.fail(path, 'expected a ULID (26 characters of Crockford base32)');
  }
  kind(v: unknown, path: string): WriteKind | null { return isKind(v) ? v : this.fail(path, `expected one of ${KINDS.join(', ')}`); }

  /** Every item must read; one that does not leaves the whole list unread (its problem is already recorded). */
  list<T>(v: unknown, path: string, expected: string, item: (value: unknown, itemPath: string) => T | null): T[] | null {
    if (!Array.isArray(v)) return this.fail(path, expected);
    const out: T[] = [];
    v.forEach((entry: unknown, k) => {
      const read = item(entry, `${path}[${k}]`);
      if (read !== null) out.push(read);
    });
    return out.length === v.length ? out : null;
  }

  cells(v: unknown, path: string): CanonicalCells | null {
    if (!isObject(v)) return this.fail(path, 'expected an object of cells');
    const out: Record<string, string | null> = {};
    let allCanonical = true;
    for (const [name, cell] of Object.entries(v)) {
      if (cell === null || typeof cell === 'string') {
        out[name] = cell;
      } else {
        this.fail(`${path}.${name}`, 'a cell is canonical text or null, never a number');
        allCanonical = false;
      }
    }
    return allCanonical ? out : null;
  }

  actor(v: unknown, path: string): Actor | null {
    if (!isObject(v)) return this.fail(path, 'expected an actor');
    const name = this.text(v.name, `${path}.name`);
    if (name === null) return null;
    if (v.kind === 'human') return { kind: 'human', name };
    if (v.kind !== 'agent') return this.fail(`${path}.kind`, 'expected "human" or "agent"');
    const model = this.text(v.model, `${path}.model`);
    const session = this.optionalText(v.session, `${path}.session`);
    if (model === null || session === null) return null;
    return session === undefined ? { kind: 'agent', name, model } : { kind: 'agent', name, model, session };
  }

  evidence(v: unknown, path: string): EvidenceRef | null {
    if (!isObject(v)) return this.fail(path, 'expected evidence');
    const locator = this.text(v.locator, `${path}.locator`);
    const quote = this.text(v.quote, `${path}.quote`);
    const { sourceId, page } = v;
    if (typeof sourceId !== 'string' || !isSourceId(sourceId)) return this.fail(`${path}.sourceId`, 'expected a source ID');
    const sha256 = this.sha256(v.sha256, `${path}.sha256`);
    if (sha256 === null) return null;
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) return this.fail(`${path}.page`, 'expected a 1-based page number');
    if (locator === null || quote === null) return null;
    return { sourceId, sha256, page, locator, quote };
  }

  base(v: unknown, path: string): CommandBase | null {
    if (!isObject(v)) return this.fail(path, 'expected a base');
    const commit = this.text(v.commit, `${path}.commit`);
    const snapshotDigest = this.sha256(v.snapshotDigest, `${path}.snapshotDigest`);
    return commit === null || snapshotDigest === null ? null : { snapshotDigest, commit };
  }

  target(v: unknown, path: string): { readonly table: TableName; readonly id?: string } | null {
    const table = isObject(v) && isTable(v.table) ? v.table : this.fail(`${path}.table`, 'expected a table of the schema');
    const id = isObject(v) ? this.optionalText(v.id, `${path}.id`) : null;
    if (table === null || id === null) return null;
    return id === undefined ? { table } : { table, id };
  }

  expect(v: unknown, path: string): Expectation | null {
    if (!isObject(v)) return this.fail(path, 'expected an expectation');
    const rowHash = this.optionalSha256(v.rowHash, `${path}.rowHash`);
    if (rowHash === null) return null;
    const schemaDigest = this.optionalSha256(v.schemaDigest, `${path}.schemaDigest`);
    if (schemaDigest === null) return null;
    const cells = v.cells === undefined ? undefined : this.cells(v.cells, `${path}.cells`);
    if (cells === null) return null;
    const withCells = cells === undefined ? {} : { cells };
    const withSchema = schemaDigest === undefined ? {} : { schemaDigest };
    if (rowHash !== undefined) return { rowHash, ...withCells, ...withSchema };
    if (cells !== undefined) return { cells, ...withSchema };
    if (schemaDigest !== undefined) return { schemaDigest };
    // An expectation that names nothing is refused by the service (expectation-empty); it is still a value that can be asked about.
    return { cells: {} };
  }

  rulings(v: unknown, path: string): readonly string[] | null {
    return v === undefined ? [] : this.list(v, path, 'expected a list of ruling IDs', (item, at) => this.text(item, at));
  }

  quoteCheck(v: unknown, path: string): QuoteCheck | undefined | null {
    if (v === undefined) return undefined;
    if (!isObject(v)) return this.fail(path, 'expected a quote check');
    const commit = this.text(v.commit, `${path}.commit`);
    const reason = this.optionalText(v.reason, `${path}.reason`);
    if (v.status !== 'verified' && v.status !== 'not-run') return this.fail(`${path}.status`, 'expected "verified" or "not-run"');
    const opsDigest = this.sha256(v.opsDigest, `${path}.opsDigest`);
    if (commit === null || reason === null || opsDigest === null) return null;
    return reason === undefined ? { status: v.status, opsDigest, commit } : { status: v.status, opsDigest, commit, reason };
  }

  /** A field a kind requires: reported when it is missing, so that every missing field of a command is listed together. */
  required<T>(value: T | undefined, path: string, message: string): T | null {
    return value === undefined ? this.fail(path, message) : value;
  }

  actors(v: unknown, path: string): readonly Actor[] | undefined | null {
    return v === undefined ? undefined : this.list(v, path, 'expected a list of actors', (item, at) => this.actor(item, at));
  }

  duplicateOf(v: unknown, path: string): DuplicateOf | undefined | null {
    if (v === undefined) return undefined;
    if (!isObject(v)) return this.fail(path, 'expected { id, reason }');
    const id = this.text(v.id, `${path}.id`);
    const reason = this.text(v.reason, `${path}.reason`);
    return id === null || reason === null ? null : { id, reason };
  }

  /** A JSON object of plain values (a record's `args`). */
  jsonObject(v: unknown, path: string): { readonly [key: string]: JsonValue } | undefined | null {
    if (v === undefined) return undefined;
    return isObject(v) && Object.values(v).every(isJson) ? Object.fromEntries(Object.entries(v).flatMap(([k, item]) => (isJson(item) ? [[k, item]] : []))) : this.fail(path, 'expected an object of JSON values');
  }

  textMap(v: unknown, path: string): Readonly<Record<string, string>> | undefined | null {
    if (v === undefined) return undefined;
    if (!isObject(v) || !Object.values(v).every((item) => typeof item === 'string')) return this.fail(path, 'expected an object of text');
    return Object.fromEntries(Object.entries(v).flatMap(([k, item]) => (typeof item === 'string' ? [[k, item]] : [])));
  }

  patch(v: unknown, path: string): readonly PatchOp[] | null {
    return this.list(v, path, 'expected a list of patch operations', (item, at): PatchOp | null => {
      if (!isObject(item) || typeof item.path !== 'string') return this.fail(at, 'expected an operation with a "path"');
      switch (item.op) {
        case 'add': case 'replace': case 'test': return 'value' in item ? { op: item.op, path: item.path, value: item.value } : this.fail(at, `${item.op} needs a "value"`);
        case 'remove': return { op: 'remove', path: item.path };
        case 'move': case 'copy': return typeof item.from === 'string' ? { op: item.op, from: item.from, path: item.path } : this.fail(at, `${item.op} needs a "from"`);
        default: return this.fail(at, 'op is add, remove, replace, move, copy or test');
      }
    });
  }

  alsoChanged(v: unknown, path: string): readonly AlsoChanged[] | undefined | null {
    if (v === undefined) return undefined;
    return this.list(v, path, 'expected a list of changed rows', (item, at): AlsoChanged | null => {
      const table = isObject(item) && isTable(item.table) ? item.table : this.fail(`${at}.table`, 'expected a table of the schema');
      const recordId = isObject(item) ? this.text(item.recordId, `${at}.recordId`) : this.fail(at, 'expected a changed row');
      const before = isObject(item) ? this.cells(item.before, `${at}.before`) : null;
      const after = isObject(item) ? this.cells(item.after, `${at}.after`) : null;
      return table === null || recordId === null || before === null || after === null ? null : { table, recordId, before, after };
    });
  }

  ledger(v: unknown, path: string): readonly LedgerRow[] | undefined | null {
    if (v === undefined) return undefined;
    return this.list(v, path, 'expected a list of ledger rows', (item, at): LedgerRow | null => {
      if (!isObject(item)) return this.fail(at, 'expected a ledger row');
      const table = this.text(item.Table, `${at}.Table`);
      const record = this.text(item.Record, `${at}.Record`);
      const where = this.text(item.Where, `${at}.Where`);
      return table === null || record === null || where === null ? null : { Table: table, Record: record, Where: where };
    });
  }

  tier(v: unknown, path: string): 0 | 1 | undefined | null {
    if (v === undefined) return undefined;
    if (v === 0) return 0;
    if (v === 1) return 1;
    return this.fail(path, 'expected 0 or 1');
  }

  generator(v: unknown, path: string): GeneratorRef | undefined | null {
    if (v === undefined) return undefined;
    if (!isObject(v)) return this.fail(path, 'expected { path, version, args, expectCount }');
    const where = this.text(v.path, `${path}.path`);
    const version = this.text(v.version, `${path}.version`);
    const args = this.list(v.args, `${path}.args`, 'expected a list of text', (item, at) => this.text(item, at));
    const count = typeof v.expectCount === 'number' && Number.isInteger(v.expectCount) && v.expectCount >= 0 ? v.expectCount : this.fail(`${path}.expectCount`, 'expected a whole number from 0');
    return where === null || version === null || args === null || count === null ? null : { path: where, version, args, expectCount: count };
  }

  /** The schema's digest before and after a change set that edits it; absent on a change set that does not. */
  schemaDigests(v: unknown, path: string): { readonly base: Sha256; readonly result: Sha256 } | undefined | null {
    if (v === undefined) return undefined;
    const base = isObject(v) ? this.sha256(v.base, `${path}.base`) : this.fail(path, 'expected { base, result }');
    const result = isObject(v) ? this.sha256(v.result, `${path}.result`) : null;
    return base === null || result === null ? null : { base, result };
  }

  impact(v: unknown, path: string): ChangeSet['impact'] | null {
    const answers = isObject(v) && isObject(v.answersMoved) ? v.answersMoved : null;
    const answersMoved = answers !== null && (answers.moved === null || typeof answers.moved === 'number') && typeof answers.estimatesPending === 'boolean'
      ? { moved: answers.moved, estimatesPending: answers.estimatesPending }
      : this.fail(`${path}.answersMoved`, 'expected { moved, estimatesPending }');
    const reportPath = isObject(v) && (v.reportPath === null || typeof v.reportPath === 'string') ? v.reportPath : undefined;
    if (reportPath === undefined) this.fail(`${path}.reportPath`, 'expected text or null');
    return answersMoved === null || reportPath === undefined ? null : { answersMoved, reportPath };
  }
}

/** A command from JSON. Every field the kind needs must be there and well formed; the guards run later, in the service. */
export function parseCommand(input: unknown): Parsed<WriteCommand> {
  if (!isObject(input)) return { ok: false, problems: ['a command is a JSON object'] };
  const r = new Reader();
  const opId = r.opId(input.opId, 'opId');
  const kind = r.kind(input.kind, 'kind');
  const target = r.target(input.target, 'target');
  const expect = r.expect(input.expect, 'expect');
  const reason = r.text(input.reason, 'reason');
  const rulings = r.rulings(input.rulings, 'rulings');
  const actor = r.actor(input.actor, 'actor');
  const reviewedBy = r.actors(input.reviewedBy, 'reviewedBy');
  const base = r.base(input.base, 'base');
  const set = input.set === undefined ? undefined : r.cells(input.set, 'set');
  const row = input.row === undefined ? undefined : r.cells(input.row, 'row');
  const evidence = input.evidence === undefined ? undefined : r.evidence(input.evidence, 'evidence');
  const apart = r.optionalText(input.apart, 'apart');
  if (opId === null || kind === null || target === null || expect === null || reason === null || rulings === null || actor === null || reviewedBy === null
    || base === null || set === null || row === null || evidence === null || apart === null) {
    return { ok: false, problems: r.problems };
  }
  const common = { opId, target, expect, reason, ...(rulings.length ? { rulings } : {}), actor, ...(reviewedBy === undefined || reviewedBy.length === 0 ? {} : { reviewedBy }), base };
  const optional = { ...(evidence === undefined ? {} : { evidence }), ...(apart === undefined ? {} : { apart }) };
  switch (kind) {
    case 'correctValue': {
      const requiredSet = r.required(set, 'set', 'a correction names the cells it sets');
      const requiredEvidence = r.required(evidence, 'evidence', 'a correction carries its evidence');
      if (requiredSet === null || requiredEvidence === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, set: requiredSet, evidence: requiredEvidence, ...(apart === undefined ? {} : { apart }) } };
    }
    case 'reviseProfile':
    case 'reclassifyProduct': {
      const requiredSet = r.required(set, 'set', `${kind} names the cells it sets`);
      return requiredSet === null ? { ok: false, problems: r.problems } : { ok: true, value: { ...common, kind, set: requiredSet, ...optional } };
    }
    case 'addMeasurement': {
      const requiredRow = r.required(row, 'row', 'a new measurement gives its row');
      const requiredEvidence = r.required(evidence, 'evidence', 'a new measurement carries its evidence');
      const duplicateOf = r.duplicateOf(input.duplicateOf, 'duplicateOf');
      if (requiredRow === null || requiredEvidence === null || duplicateOf === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, row: requiredRow, evidence: requiredEvidence, ...(duplicateOf === undefined ? {} : { duplicateOf }) } };
    }
    case 'addRecord': {
      const requiredRow = r.required(row, 'row', 'a new record gives its row');
      return requiredRow === null ? { ok: false, problems: r.problems } : { ok: true, value: { ...common, kind, row: requiredRow, ...(evidence === undefined ? {} : { evidence }) } };
    }
    case 'retireRecord': {
      const retire = isObject(input.retire) ? input.retire : null;
      const as = retire?.as === 'retired' || retire?.as === 'superseded' ? retire.as : r.fail('retire.as', 'expected "retired" or "superseded"');
      const successor = retire === null ? null : r.optionalText(retire.successor, 'retire.successor');
      if (retire === null) r.fail('retire', 'a retirement gives { as, successor? }');
      if (retire === null || as === null || successor === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, retire: successor === undefined ? { as } : { as, successor } } };
    }
    case 'moveGrade': {
      const moveTo = r.text(input.moveTo, 'moveTo');
      const expectMaterial = r.text(input.expectMaterial, 'expectMaterial');
      return moveTo === null || expectMaterial === null ? { ok: false, problems: r.problems } : { ok: true, value: { ...common, kind, moveTo, expectMaterial } };
    }
    case 'addVocab': {
      const v = isObject(input.vocab) ? input.vocab : null;
      const stem = v === null ? r.fail('vocab', 'a vocabulary word gives { stem, value, extra? }') : r.text(v.stem, 'vocab.stem');
      const value = v === null ? null : r.text(v.value, 'vocab.value');
      const extra = v === null || v.extra === undefined ? undefined : r.cells(v.extra, 'vocab.extra');
      const after = v === null ? null : r.optionalText(v.after, 'vocab.after');
      if (stem === null || value === null || extra === null || after === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, vocab: { stem, value, ...(extra === undefined ? {} : { extra }), ...(after === undefined ? {} : { after }) } } };
    }
    case 'addColumn': {
      const c = isObject(input.column) ? input.column : null;
      if (c === null) return { ok: false, problems: [...r.problems, 'column: a new column gives { name, field, after?, fill }'] };
      const before = r.problems.length;
      const name = r.text(c.name, 'column.name');
      const field = isObject(c.field) ? c.field : r.fail('column.field', 'expected the schema field of the column');
      const after = r.optionalText(c.after, 'column.after');
      const fill = 'fill' in c && (c.fill === null || typeof c.fill === 'string') ? c.fill : r.fail('column.fill', 'give what the existing rows hold: a missing-state word, or null');
      if (r.problems.length > before || name === null || field === null || after === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, column: { name, field, ...(after === undefined ? {} : { after }), fill: typeof fill === 'string' ? fill : null } } };
    }
    case 'schemaEdit': {
      const s = isObject(input.schema) ? input.schema : null;
      const patch = s === null ? r.fail('schema', 'a schema edit gives { patch, fill?, renames? }') : r.patch(s.patch, 'schema.patch');
      const fill = s === null || s.fill === undefined ? undefined : r.cells(s.fill, 'schema.fill');
      const renames = s === null ? null : r.textMap(s.renames, 'schema.renames');
      if (patch === null || fill === null || renames === null) return { ok: false, problems: r.problems };
      return { ok: true, value: { ...common, kind, schema: { patch, ...(fill === undefined ? {} : { fill }), ...(renames === undefined ? {} : { renames }) } } };
    }
    case 'acceptProposal':
    case 'rejectProposal':
    case 'holdProposal':
      return { ok: true, value: { ...common, kind, ...(set === undefined ? {} : { set }), ...(evidence === undefined ? {} : { evidence }) } };
  }
}

/** A change record from JSON (a record of a change-set file, or of the workspace journal). */
export function parseChangeRecord(input: unknown, path = 'record'): Parsed<ChangeRecord> {
  if (!isObject(input)) return { ok: false, problems: [`${path}: a change record is a JSON object`] };
  const r = new Reader();
  const { id, seq, table } = input;
  const recordId = typeof id === 'string' && isChangeRecordId(id) ? id : r.fail(`${path}.id`, 'expected CR-<opId>');
  const opId = r.opId(input.opId, `${path}.opId`);
  const recordSeq = typeof seq === 'number' && Number.isInteger(seq) && seq >= 0 ? seq : r.fail(`${path}.seq`, 'expected a whole number from 0');
  const kind = r.kind(input.kind, `${path}.kind`);
  const recordTable = isTable(table) ? table : r.fail(`${path}.table`, 'expected a table of the schema');
  const target = r.text(input.recordId, `${path}.recordId`);
  const before = r.cells(input.before, `${path}.before`);
  const after = r.cells(input.after, `${path}.after`);
  const evidence = input.evidence === undefined ? undefined : r.evidence(input.evidence, `${path}.evidence`);
  const reason = r.text(input.reason, `${path}.reason`);
  const rulings = r.rulings(input.rulings, `${path}.rulings`);
  const actor = r.actor(input.actor, `${path}.actor`);
  const reviewedBy = r.list(input.reviewedBy, `${path}.reviewedBy`, 'expected a list of actors', (item, at) => r.actor(item, at));
  const base = r.base(input.base, `${path}.base`);
  const at = r.text(input.at, `${path}.at`);
  const cellsApart = r.optionalText(input.cellsApart, `${path}.cellsApart`);
  const quoteCheck = r.quoteCheck(input.quoteCheck, `${path}.quoteCheck`);
  const args = r.jsonObject(input.args, `${path}.args`);
  const alsoChanged = r.alsoChanged(input.alsoChanged, `${path}.alsoChanged`);
  const ledger = r.ledger(input.ledger, `${path}.ledger`);
  const duplicateOf = r.duplicateOf(input.duplicateOf, `${path}.duplicateOf`);
  const tier = r.tier(input.tier, `${path}.tier`);
  if (args === null || alsoChanged === null || ledger === null || duplicateOf === null || tier === null) return { ok: false, problems: r.problems };
  if (recordId === null || opId === null || recordSeq === null || kind === null || recordTable === null || target === null || before === null
    || after === null || evidence === null || reason === null || rulings === null || actor === null || reviewedBy === null || base === null
    || at === null || cellsApart === null || quoteCheck === null) {
    return { ok: false, problems: r.problems };
  }
  const common = {
    id: recordId, opId, seq: recordSeq, table: recordTable, recordId: target, before, after, reason, rulings, actor, reviewedBy, base, at,
    ...(cellsApart === undefined ? {} : { cellsApart }), ...(quoteCheck === undefined ? {} : { quoteCheck }),
    ...(args === undefined ? {} : { args }), ...(alsoChanged === undefined ? {} : { alsoChanged }), ...(ledger === undefined ? {} : { ledger }),
    ...(duplicateOf === undefined ? {} : { duplicateOf }), ...(tier === undefined ? {} : { tier }),
  };
  if (kind === 'correctValue' || kind === 'addMeasurement') {
    if (evidence === undefined) return { ok: false, problems: [`${path}.evidence: a ${kind} record carries its evidence`] };
    return { ok: true, value: { ...common, kind, evidence } };
  }
  return { ok: true, value: { ...common, kind, ...(evidence === undefined ? {} : { evidence }) } };
}

/** A change-set file from JSON. */
export function parseChangeSet(input: unknown): Parsed<ChangeSet> {
  if (!isObject(input)) return { ok: false, problems: ['a change set is a JSON object'] };
  const r = new Reader();
  const { id, records, base, result } = input;
  const changeSetId = typeof id === 'string' && isChangeSetId(id) ? id : r.fail('id', 'expected date-topic-4hex');
  const title = r.text(input.title, 'title');
  const baseDigest = r.sha256(isObject(base) ? base.snapshotDigest : undefined, 'base.snapshotDigest');
  const resultDigest = r.sha256(isObject(result) ? result.snapshotDigest : undefined, 'result.snapshotDigest');
  const recordList: ChangeRecord[] = [];
  if (!Array.isArray(records) || records.length === 0) {
    r.fail('records', 'expected a non-empty list');
  } else {
    records.forEach((item: unknown, k) => {
      const parsed = parseChangeRecord(item, `records[${k}]`);
      if (parsed.ok) recordList.push(parsed.value); else r.problems.push(...parsed.problems);
    });
  }
  const impact = r.impact(input.impact, 'impact');
  const generator = r.generator(input.generator, 'generator');
  const schema = r.schemaDigests(input.schema, 'schema');
  // The records report their own problems into r.problems and still leave a list behind.
  if (r.problems.length || changeSetId === null || title === null || baseDigest === null || resultDigest === null || impact === null || generator === null || schema === null) {
    return { ok: false, problems: r.problems };
  }
  return {
    ok: true,
    value: {
      id: changeSetId, title, records: recordList, base: { snapshotDigest: baseDigest }, result: { snapshotDigest: resultDigest }, impact,
      ...(generator === undefined ? {} : { generator }), ...(schema === undefined ? {} : { schema }),
    },
  };
}

/** JSON from a file; a file that is missing or is not JSON throws an error that names the file. */
export function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
