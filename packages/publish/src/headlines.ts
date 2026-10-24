// The rest of every material's headline values, put on a core model (WP-27): the reference part carries them, because the core holds only the values a decision and the
// table read and the chart lenses read every headline. Its own module, so the first screen, which never opens a chart, does not carry it.
import type { Obj } from './shards.ts';

const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);
const rowsOf = (value: unknown): Obj[] => (Array.isArray(value) ? value.filter(isObject) : []);

/**
 * Put the rest of the materials' headlines on a core model, in place (the reference part carries them: the core holds the values a decision and the table
 * read, and the chart lenses read every headline). A field the core already has stays as it is; a material or a headline the core lacks is an error,
 * never skipped.
 */
export function applyHeadlines(model: Obj, headlines: { readonly [materialId: string]: Obj }, meta: Obj = {}): void {
  const materials = new Map(rowsOf(model['materials']).map((m) => [String(m['id']), m]));
  for (const [id, rest] of Object.entries(headlines)) {
    const material = materials.get(id);
    const own = material?.['headline'];
    if (!material || !isObject(own)) throw new HeadlinesDoNotFitError(`material ${id}`);
    for (const [key, fields] of Object.entries(rest)) {
      if (!isObject(fields)) throw new HeadlinesDoNotFitError(`headline ${key} of ${id}`);
      const target = own[key];
      if (target === undefined) { own[key] = { ...fields }; continue; }
      if (!isObject(target)) throw new HeadlinesDoNotFitError(`headline ${key} of ${id}`);
      for (const [field, value] of Object.entries(fields)) if (!Object.hasOwn(target, field)) target[field] = value;
    }
  }
  // The few facts of the database's meta the lenses read and the core does not carry (the properties almost no sheet publishes).
  const own = isObject(model['meta']) ? model['meta'] : (model['meta'] = {});
  for (const [field, value] of Object.entries(meta)) if (!Object.hasOwn(own, field)) own[field] = value;
}

/** The headlines do not belong to the core they were applied to. */
export class HeadlinesDoNotFitError extends Error {
  constructor(what: string) {
    super(`the headlines name ${what}, which the core does not have`);
    this.name = 'HeadlinesDoNotFitError';
  }
}
