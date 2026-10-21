// The records of a change set, as the preview reads them: a ChangeSet (change.ts), or a bare list of change records. Only
// what the preview uses is checked here (the table, the record, the cells before and after); the staging refuses the rest.
import { TABLE_NAMES } from '@atlas/data';
import type { CanonicalCells } from '@atlas/domain';
import { oneOf } from '../guards.ts';
import { ImpactRefusal } from './stage.ts';
import type { ImpactRecords } from './preview.ts';

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function cellsOf(value: unknown, where: string): CanonicalCells {
  if (!isRecord(value)) throw new ImpactRefusal(`${where}: expected the changed cells`);
  const out: Record<string, string | null> = {};
  for (const [column, cell] of Object.entries(value)) {
    if (cell !== null && typeof cell !== 'string') throw new ImpactRefusal(`${where}: ${column} is not canonical text or null`);
    out[column] = cell;
  }
  return out;
}

export function impactRecordsOf(value: unknown): ImpactRecords {
  const list: unknown = Array.isArray(value) ? value : isRecord(value) ? value.records : undefined;
  if (!Array.isArray(list) || list.length === 0) throw new ImpactRefusal('no records: expected a ChangeSet or a list of change records');
  const records: unknown[] = list;
  return records.map((r, i) => {
    const where = `record ${i + 1}`;
    if (!isRecord(r) || typeof r.recordId !== 'string') throw new ImpactRefusal(`${where}: needs a table and a recordId`);
    return { table: oneOf(TABLE_NAMES, r.table, `${where} table`), recordId: r.recordId, before: cellsOf(r.before, `${where} before`), after: cellsOf(r.after, `${where} after`) };
  });
}
