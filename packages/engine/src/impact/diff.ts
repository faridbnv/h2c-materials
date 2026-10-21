// The decision diff: which records' answers differ between two runs of the same questions (02 sections 5 and 11).
//
// A record is a material or one of its products in a question. What is compared is the decision (verdict, group, likely, the
// Best product, the counts, the state) and, apart, the listing place. Listing places move whenever any record above them
// moves, so a record whose only change is its place is counted as a shift, not as a moved answer.
import type { RowResult } from '@atlas/domain';

export const DECISION_FIELDS = ['verdict', 'group', 'likely', 'best', 'state', 'counts'] as const;
export type DecisionField = (typeof DECISION_FIELDS)[number] | 'listing' | 'record';

export type Facts = Readonly<Partial<Record<Exclude<DecisionField, 'record'>, string>>>;

/** One record's decision facts, as display text so a report is plain JSON. */
function factsOf(row: RowResult): Facts {
  const common = { verdict: row.verdict, group: row.group, likely: String(row.likely ?? false), listing: String(row.listingRank) };
  return row.productId === undefined
    ? { ...common, best: row.best ?? 'none', counts: `${row.counts.pass}/${row.counts.fail}/${row.counts.untested}` }
    : { ...common, state: row.stateId };
}

/** `material:M001` and `product:M001/G001-01`, each with its facts. */
export function decisionsOf(rows: readonly RowResult[]): Map<string, Facts> {
  return new Map(rows.map((row) => [row.productId === undefined ? `material:${row.materialId}` : `product:${row.materialId}/${row.productId}`, factsOf(row)]));
}

export interface FieldChange {
  readonly field: DecisionField;
  readonly before: string;
  readonly after: string;
}

export interface Move {
  readonly case: string;
  readonly record: string;
  /** The material, whichever kind of record moved. */
  readonly materialId: string;
  readonly changes: readonly FieldChange[];
}

const COMPARED_FIELDS: readonly Exclude<DecisionField, 'record'>[] = [...DECISION_FIELDS, 'listing'];

/** The records whose facts differ, with what changed. A record present on one side only is one change, `record`. */
export function diffDecisions(caseId: string, before: ReadonlyMap<string, Facts>, after: ReadonlyMap<string, Facts>): Move[] {
  const moves: Move[] = [];
  for (const record of new Set([...before.keys(), ...after.keys()])) {
    const a = before.get(record);
    const b = after.get(record);
    const materialId = record.slice(record.indexOf(':') + 1).split('/')[0] ?? record;
    if (!a || !b) {
      moves.push({ case: caseId, record, materialId, changes: [{ field: 'record', before: a ? 'present' : 'absent', after: b ? 'present' : 'absent' }] });
      continue;
    }
    const changes = COMPARED_FIELDS.flatMap((field): FieldChange[] => (a[field] === b[field] ? [] : [{ field, before: a[field] ?? 'none', after: b[field] ?? 'none' }]));
    if (changes.length) moves.push({ case: caseId, record, materialId, changes });
  }
  return moves;
}

/** A move that changes an answer, not only a listing place. */
export const movesAnAnswer = (m: Move): boolean => m.changes.some((c) => c.field !== 'listing');
