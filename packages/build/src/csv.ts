// Reading a vocabulary CSV (schema/vocab/*.csv) in the shape the old build/src/csv.js gave: { header, records }, each record
// { values, line }. The reader is @atlas/data's, which has no dependency and reads exactly as the old one does (trim, an empty
// cell is null, a record with every cell empty is dropped), so the vocabulary modules keep their code as it was.
// The data tables themselves no longer come through here: the build reads them from the SQLite reconstruction (load.ts).
import { readFileSync } from 'node:fs';
import { parseCsv } from '@atlas/data/csv';

export interface CsvRecord {
  values: Record<string, string | null>;
  /** The 1-based file line the record starts on. */
  line: number;
}

export interface CsvTable {
  header: string[];
  records: CsvRecord[];
}

export function readCsv(path: string): CsvTable {
  const { header, records } = parseCsv(readFileSync(path, 'utf8'), path);
  return {
    header: [...header],
    records: records.map(({ cells, line }) => ({ values: Object.fromEntries(header.map((h, k) => [h, cells[k] ?? null])), line })),
  };
}
