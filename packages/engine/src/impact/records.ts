// The records of a change set, as the preview reads them: a ChangeSet (change.ts), or a bare list of change records. Only
// what the preview uses is checked here (the table, the record, the cells before and after); the staging refuses the rest.
import { TABLE_NAMES } from '@atlas/data';
import type { CanonicalCells } from '@atlas/domain';
import { isRecord, oneOf } from '../guards.ts';
import { ImpactRefusal } from './stage.ts';
import type { ImpactRecords } from './preview.ts';

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
  return records.flatMap((r, i) => {
    const where = `record ${i + 1}`;
    if (!isRecord(r) || typeof r.recordId !== 'string') throw new ImpactRefusal(`${where}: needs a table and a recordId`);
    const own = {
      table: oneOf(TABLE_NAMES, r.table, `${where} table`), recordId: r.recordId, before: cellsOf(r.before, `${where} before`), after: cellsOf(r.after, `${where} after`),
      ...(typeof r.kind === 'string' ? { kind: r.kind } : {}),
    };
    // A command that moves records with it (moveGrade) lists them in `alsoChanged`: the preview applies them too, or it would price half the change.
    const also: unknown = r.alsoChanged;
    if (also === undefined) return [own];
    if (!Array.isArray(also)) throw new ImpactRefusal(`${where}: alsoChanged is a list of changed records`);
    const rest: unknown[] = also;
    return [own, ...rest.map((e, k) => {
      const at = `${where} alsoChanged ${k + 1}`;
      if (!isRecord(e) || typeof e.recordId !== 'string') throw new ImpactRefusal(`${at}: needs a table and a recordId`);
      return { table: oneOf(TABLE_NAMES, e.table, `${at} table`), recordId: e.recordId, before: cellsOf(e.before, `${at} before`), after: cellsOf(e.after, `${at} after`), kind: 'correctValue' };
    })];
  });
}
