// The database as one material's drawer reads it (WP-26): the core (every material, its fields cut to what a decision and the first screen read),
// with the open material's detail joined in row by row (the rest of each row the core carries part of, and the records only the detail holds),
// and the shared part (the filament guide's rows, the method's rules). The drawer's facts layer (packages/pages/src/facts) reads a database; this
// is a database as far as it looks, for this material, and the drawer never shows a row without the document its record cites because the
// detail carries every source a record cites.
//
// A test holds this equal to the whole database: the drawer built from these parts shows what the drawer built from the compiled database shows,
// for every material and every tab (tests/remake/drawer-parts.test.mjs).
import type { DetailShard } from '@atlas/domain';
import { join } from '@atlas/publish/shards';
import type { Loose } from '@atlas/pages/loose';
import type { Shared } from '../../parts.ts';

const rowsOf = (value: unknown): Loose[] => (Array.isArray(value) ? value : []);

/** The rows of one section: each rest joined to the core row it completes, by ID. */
function joined(coreRows: readonly Loose[], rests: unknown): Loose[] {
  const byId = new Map<string, Loose>(coreRows.map((row) => [row.id, row]));
  return rowsOf(rests).map((rest) => join(byId.get(rest.id), rest));
}

/**
 * A section whose core rows carry no ID of their own (coverage: nothing downloads an ID per row for a join the drawer alone makes): the
 * material's rows are the core's rows of that material, in the order the detail lists their rests. A count that differs is a damaged release.
 */
function joinedInOrder(coreRows: readonly Loose[], rests: unknown, materialId: string, what: string): Loose[] {
  const mine = coreRows.filter((row) => row.materialId === materialId);
  const rest = rowsOf(rests);
  if (mine.length !== rest.length) throw new Error(`${what} of ${materialId}: the core holds ${mine.length} rows and the detail ${rest.length}`);
  return rest.map((one, i) => join(mine[i], one));
}

export function drawerDbOf(core: Loose, detail: DetailShard, shared: Shared): Loose {
  const records: Loose = detail.records;
  const id = detail.materialId;
  const mine = (rows: readonly Loose[]) => rows.filter((row) => row.materialId !== id);
  return {
    ...core,
    meta: { ...core.meta, knowHow: shared.knowHow },
    registry: { ...core.registry, ...shared.registry },
    materials: core.materials.map((m: Loose) => (m.id === id ? join(m, records.material) : m)),
    grades: [...mine(core.grades), ...joined(core.grades, records.grades)],
    measurements: joined(core.measurements, records.measurements),
    // The material's own evidence and the family's records its Best uses and Limitations point to (the detail carries both).
    evidence: joined(core.evidence, records.evidence),
    coverage: joinedInOrder(core.coverage, records.coverage, id, 'its coverage'),
    polymerEvidence: joined(core.polymerEvidence ?? [], records.polymerEvidence),
    profiles: rowsOf(records.profiles),
    prices: rowsOf(records.prices),
    knowHow: rowsOf(records.knowHow),
    polymers: records.polymer ? [records.polymer] : [],
    polymerEnvironment: rowsOf(records.polymerEnvironment),
    // The documents the material's records cite, and the ones the guide's rows cite (the detail does not repeat what the shared part holds).
    sources: [...rowsOf(records.sources), ...rowsOf(shared.sources).filter((row) => !rowsOf(records.sources).some((have) => have.id === row.id))],
    printGuide: shared.tables.printGuide,
    method: shared.tables.method,
  };
}
