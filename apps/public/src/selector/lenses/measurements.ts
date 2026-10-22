// The measurements the chart views read beyond what the core carries (the test pairs compare conditions, an open mark names the standard its value was
// measured to): the rest of each of a material's measurement rows, from its detail part, put on the rows the engine reads, in place and only where the row lacks
// the field. Done before the chart draws, so the drawing never shows a pair or a record from part of its data.
import type { Loose } from '@atlas/pages/loose';
import { join } from '@atlas/publish/shards';
import type { Store } from '../store.ts';

const joined = new Set<string>();

/** Each product's material on the product itself, as the lenses read it (the core's products are listed by their material, not the other way round). */
export function stampGrades(db: Loose): void {
  const grades = new Map<string, Loose>(db.grades.map((g: Loose) => [g.id, g]));
  for (const material of db.materials) {
    for (const id of material.gradeIds ?? []) {
      const grade = grades.get(id);
      if (grade && grade.materialId === undefined) grade.materialId = material.id;
    }
  }
}

/** The materials whose measurement rows the view being drawn reads whole. */
export function measurementsNeeded(state: Loose): string[] {
  const plot = state.scenario.plot;
  if (plot.view === 'measured' || plot.view === 'measured-mixed') return state.rows.map((r: Loose) => r.material.id);
  const open = state.inspect?.key ? String(state.inspect.key).split('|')[0] : null;
  return open ? [open] : [];
}

export async function joinMeasurements(store: Store, ids: readonly string[]): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => !joined.has(id));
  if (!missing.length) return;
  const details = await (await store.lens()).loadMeasurements(missing);
  const byId = new Map<string, Loose>(store.state.db.measurements.map((m: Loose) => [m.id, m]));
  for (const [id, shard] of details) {
    const rows: Loose[] = (shard.records as Loose).measurements ?? [];
    for (const rest of rows) {
      const row = byId.get(rest.id);
      if (!row) throw new Error(`the detail of ${id} names measurement ${rest.id}, which the core does not hold`);
      Object.assign(row, join(row, rest));
    }
    joined.add(id);
  }
}
