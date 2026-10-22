// The database as a brief reads it (WP-27): the core, with the records of the materials the brief cites joined in row by row (the rest of each row
// the core carries part of, and the sources only the detail holds). The same join the drawer uses for one material (drawer/db.ts), for the materials
// a brief or an export names, and only ever made from detail shards that all arrived (parts.ts loadCited): a brief is never written from a database
// that lacks the document a record cites.
import type { DetailShard } from '@atlas/domain';
import type { Loose } from '@atlas/pages/loose';
import { join } from '@atlas/publish/shards';

const rowsOf = (value: unknown): Loose[] => (Array.isArray(value) ? value : []);

/** The rows of one section: each rest joined to the core row it completes, by ID. */
function joined(coreRows: readonly Loose[], rests: unknown): Loose[] {
  const byId = new Map<string, Loose>(coreRows.map((row) => [row.id, row]));
  return rowsOf(rests).map((rest) => join(byId.get(rest.id), rest) as Loose);
}

export function citedDbOf(core: Loose, details: ReadonlyMap<string, DetailShard>): Loose {
  const ids = new Set(details.keys());
  const records = (shard: DetailShard): Loose => shard.records;
  const outside = (rows: readonly Loose[]) => rows.filter((row) => !ids.has(row.materialId));
  const sources = new Map<string, Loose>();
  for (const shard of details.values()) for (const source of rowsOf(records(shard).sources)) sources.set(source.id, source);
  return {
    ...core,
    materials: core.materials.map((m: Loose) => { const shard = details.get(m.id); return shard ? join(m, records(shard).material) : m; }),
    grades: [...outside(core.grades), ...[...details.values()].flatMap((shard) => joined(core.grades, records(shard).grades))],
    measurements: [...outside(core.measurements), ...[...details.values()].flatMap((shard) => joined(core.measurements, records(shard).measurements))],
    sources: [...sources.values()],
  };
}
