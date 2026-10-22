// The database as a brief reads it (WP-27): the core, with the records of the materials the brief cites joined in row by row (the rest of each row
// the core carries part of, and the sources only the detail holds). The same join the drawer uses for one material (drawer/db.ts), for the materials
// a brief or an export names, and only ever made from detail shards that all arrived (parts.ts loadCited): a brief is never written from a database
// that lacks the document a record cites.
import type { DetailShard } from '@atlas/domain';
import type { Loose } from '@atlas/pages/loose';
import { join } from '@atlas/publish/shards';

/** The parts of a product's print recipe, in the order the build lists them (build/src/products.js RECIPE_AXES). */
const RECIPE_AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle', 'drying'];

const rowsOf = (value: unknown): Loose[] => (Array.isArray(value) ? value : []);

const records = (shard: DetailShard): Loose => shard.records;

export function citedDbOf(core: Loose, details: ReadonlyMap<string, DetailShard>): Loose {
  const sources = new Map<string, Loose>();
  for (const shard of details.values()) for (const source of rowsOf(records(shard).sources)) sources.set(source.id, source);
  // A section's rows, each completed by the detail's rest of it where a cited material has one.
  const completed = (rows: readonly Loose[], section: string): Loose[] => {
    const rest = new Map<string, Loose>();
    for (const shard of details.values()) for (const row of rowsOf(records(shard)[section])) rest.set(row.id, row);
    return rows.map((row) => (rest.has(row.id) ? (join(row, rest.get(row.id)) as Loose) : row));
  };
  return {
    ...core,
    materials: core.materials.map((m: Loose) => { const shard = details.get(m.id); return shard ? join(m, records(shard).material) : m; }),
    grades: completed(core.grades, 'grades'),
    measurements: completed(core.measurements, 'measurements'),
    sources: [...sources.values()],
  };
}

/**
 * The cited materials' records put on the rows the engine reads, in place: each material's headline values, each product's and each measurement's rest of its row. An
 * export writes the rows on screen, and a row is whole only with its detail; this is done once every shard it cites has arrived, never before.
 */
export function joinCited(core: Loose, details: ReadonlyMap<string, DetailShard>): void {
  const on = (rows: readonly Loose[], section: string): void => {
    const byId = new Map<string, Loose>(rows.map((row) => [row.id, row]));
    for (const shard of details.values()) {
      for (const rest of rowsOf(records(shard)[section])) {
        const row = byId.get(rest.id);
        if (!row) throw new Error(`the detail of ${shard.materialId} names ${section} ${rest.id}, which the core does not hold`);
        Object.assign(row, join(row, rest));
      }
    }
  };
  for (const shard of details.values()) {
    const material = core.materials.find((m: Loose) => m.id === shard.materialId);
    if (!material) throw new Error(`the detail of ${shard.materialId} is of a material the core does not hold`);
    Object.assign(material, join(material, records(shard).material));
  }
  on(core.grades, 'grades');
  // Where a product's recipe was read from is listed in the order the build wrote it; the core's part of the list and the detail's part join in two runs.
  for (const grade of core.grades) {
    const from = grade.print?.from;
    if (from && typeof from === 'object') grade.print.from = Object.fromEntries([...RECIPE_AXES, ...Object.keys(from)].filter((k, i, all) => k in from && all.indexOf(k) === i).map((k) => [k, from[k]]));
  }
  on(core.measurements, 'measurements');
}
