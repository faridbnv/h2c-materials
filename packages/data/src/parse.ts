// Reading the write service's JSON files back into typed values: a command, a change record, a change set. Nothing is
// cast: each field is checked and a branded ID is made by its guard. A file that does not fit is reported with every problem
// found, never half-read (a command that is not fully understood is not applied).
import { readFileSync } from 'node:fs';
import type {
  Actor, CanonicalCells, ChangeRecord, ChangeSet, CommandBase, EvidenceRef, Expectation, OpId, OtherWriteKind, QuoteCheck, Sha256,
  WriteCommand, WriteKind,
} from '@atlas/domain/contracts';
import { isChangeRecordId, isChangeSetId, isOpId, isSha256, isSourceId } from './digest.ts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problems: readonly string[] };

const OTHER_KINDS: readonly OtherWriteKind[] = [
  'retireRecord', 'moveGrade', 'reviseProfile', 'reclassifyProduct', 'acceptProposal', 'rejectProposal', 'holdProposal', 'addVocab',
  'addColumn', 'schemaEdit',
];
const KINDS: readonly WriteKind[] = ['correctValue', 'addMeasurement', ...OTHER_KINDS];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isKind = (v: unknown): v is WriteKind => KINDS.some((k) => k === v);
const isTable = (v: unknown): v is TableName => typeof v === 'string' && TABLE_NAMES.some((t) => t === v);

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
  const base = r.base(input.base, 'base');
  const set = input.set === undefined ? undefined : r.cells(input.set, 'set');
  const row = input.row === undefined ? undefined : r.cells(input.row, 'row');
  const evidence = input.evidence === undefined ? undefined : r.evidence(input.evidence, 'evidence');
  const apart = r.optionalText(input.apart, 'apart');
  if (opId === null || kind === null || target === null || expect === null || reason === null || rulings === null || actor === null
    || base === null || set === null || row === null || evidence === null || apart === null) {
    return { ok: false, problems: r.problems };
  }
  const common = { opId, target, expect, reason, ...(rulings.length ? { rulings } : {}), actor, base };
  if (kind === 'correctValue') {
    const requiredSet = r.required(set, 'set', 'a correction names the cells it sets');
    const requiredEvidence = r.required(evidence, 'evidence', 'a correction carries its evidence');
    if (requiredSet === null || requiredEvidence === null) return { ok: false, problems: r.problems };
    return { ok: true, value: { ...common, kind, set: requiredSet, evidence: requiredEvidence, ...(apart === undefined ? {} : { apart }) } };
  }
  if (kind === 'addMeasurement') {
    const requiredRow = r.required(row, 'row', 'a new measurement gives its row');
    const requiredEvidence = r.required(evidence, 'evidence', 'a new measurement carries its evidence');
    if (requiredRow === null || requiredEvidence === null) return { ok: false, problems: r.problems };
    return { ok: true, value: { ...common, kind, row: requiredRow, evidence: requiredEvidence } };
  }
  return { ok: true, value: { ...common, kind, ...(set === undefined ? {} : { set }), ...(evidence === undefined ? {} : { evidence }) } };
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
  if (recordId === null || opId === null || recordSeq === null || kind === null || recordTable === null || target === null || before === null
    || after === null || evidence === null || reason === null || rulings === null || actor === null || reviewedBy === null || base === null
    || at === null || cellsApart === null || quoteCheck === null) {
    return { ok: false, problems: r.problems };
  }
  const common = {
    id: recordId, opId, seq: recordSeq, table: recordTable, recordId: target, before, after, reason, rulings, actor, reviewedBy, base, at,
    ...(cellsApart === undefined ? {} : { cellsApart }), ...(quoteCheck === undefined ? {} : { quoteCheck }),
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
  // The records report their own problems into r.problems and still leave a list behind.
  if (r.problems.length || changeSetId === null || title === null || baseDigest === null || resultDigest === null || impact === null) {
    return { ok: false, problems: r.problems };
  }
  return {
    ok: true,
    value: { id: changeSetId, title, records: recordList, base: { snapshotDigest: baseDigest }, result: { snapshotDigest: resultDigest }, impact },
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
