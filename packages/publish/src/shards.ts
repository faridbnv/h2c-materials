// The data a release publishes, in parts (WP-25; pack 02 sections 6 and 9.6). Pure functions on plain JSON, no Node: the build
// tools write the parts with them and the browser (and the parity harness) reads the parts back with them.
//
//   core        the fields any answer reads (the engine's input); cut from the compiled database by a declared field list
//   estimates   the estimate stage's overlay, for Explore with estimates on
//   reference   the Ashby reference set
//   detail      one material's records (drawer, pages, brief, export); never read by a decision
//
// Every part names its release. A reader computes only when every part its mode needs has arrived and names the page's release.
import { publicSourceLink } from './source-link.ts';

/** A declared field list (the same shape as @atlas/domain's FieldSpec; the types that check a declaration live there). */
export type FieldSpec = true | { readonly [key: string]: FieldSpec };

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type Obj = { [key: string]: unknown };

const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The spec of a key: its own, else the wildcard's, else none (the key is not carried). */
function specOf(spec: { readonly [key: string]: FieldSpec }, key: string): FieldSpec | undefined {
  return Object.hasOwn(spec, key) ? spec[key] : spec['*'];
}

/** The record cut down to the fields `spec` names (a record whose fields are all carried is returned as it is). */
export function pruneRecord(value: Obj, spec: FieldSpec): Obj {
  if (spec === true) return value;
  const out: Obj = {};
  for (const [key, child] of Object.entries(value)) {
    const childSpec = specOf(spec, key);
    if (childSpec !== undefined && child !== undefined) out[key] = prune(child, childSpec);
  }
  return out;
}

/** The value cut down to the fields `spec` names. A named field the value does not have stays absent; key order is the value's. */
export function prune(value: unknown, spec: FieldSpec): unknown {
  if (spec === true) return value;
  if (Array.isArray(value)) return value.map((element: unknown) => prune(element, spec));
  return isObject(value) ? pruneRecord(value, spec) : value;
}

/**
 * What `prune(value, spec)` left out: the rest of the value, so that `join(prune(value, spec), omit(value, spec))` is the value again
 * (the detail shards carry the rest of the rows the core carries part of, and no field twice). Undefined where nothing is left. An
 * array keeps its length, with null where an element has nothing left, so that join pairs the elements by place.
 */
export function omit(value: unknown, spec: FieldSpec): unknown {
  if (spec === true) return undefined;
  if (Array.isArray(value)) {
    const rest = value.map((element: unknown) => omit(element, spec) ?? null);
    return rest.every((element) => element === null) ? undefined : rest;
  }
  return isObject(value) ? omitRecord(value, spec) : undefined;
}

/** `omit` for a record: what is left of it, or undefined where `spec` carries all of it. */
export function omitRecord(value: Obj, spec: FieldSpec): Obj | undefined {
  if (spec === true) return undefined;
  const out: Obj = {};
  for (const [key, child] of Object.entries(value)) {
    const childSpec = specOf(spec, key);
    const rest = childSpec === undefined ? child : omit(child, childSpec);
    if (rest !== undefined) out[key] = rest;
  }
  return Object.keys(out).length ? out : undefined;
}

/** `prune`'s result and `omit`'s put together: every field either holds, the values of `rest` where it has them. */
export function join(carried: unknown, rest: unknown): unknown {
  // null in `rest` is a placeholder (an array element with nothing left) where the core carries something, and a real null where it does not.
  if (rest === undefined || (rest === null && carried !== undefined)) return carried;
  if (carried === undefined) return rest;
  if (Array.isArray(carried) && Array.isArray(rest)) return Array.from({ length: Math.max(carried.length, rest.length) }, (_, i) => join(carried[i], rest[i]));
  if (isObject(carried) && isObject(rest)) {
    const out: Obj = { ...carried };
    for (const [key, child] of Object.entries(rest)) out[key] = join(carried[key], child);
    return out;
  }
  return rest;
}

/** Two declarations as one: a field either names is carried; `true` wins over a narrower list. */
export function mergeSpecs(a: FieldSpec, b: FieldSpec): FieldSpec {
  if (a === true || b === true) return true;
  const out: { [key: string]: FieldSpec } = { ...a };
  for (const [key, spec] of Object.entries(b)) out[key] = Object.hasOwn(out, key) ? mergeSpecs(out[key] ?? true, spec) : spec;
  return out;
}

/** The engine read a field the part does not carry. */
export class MissingFieldError extends Error {
  readonly field: string;
  constructor(part: string, field: string) {
    super(`${part} does not carry "${field}", which was read`);
    this.name = 'MissingFieldError';
    this.field = field;
  }
}

/**
 * DEVELOPMENT ONLY. The value, behind a Proxy that throws (MissingFieldError) when anything reads a field the declaration does not
 * carry but the value holds. It is meant for the WHOLE database: the engine then fails at the first field the published part would
 * have lost, naming it. A field neither the declaration nor the value has is undefined, as it is for the engine anyway (it reads some
 * keys no row has). Behind a part that has already been cut there is nothing left to catch; the parity check is the proof there.
 * Cost is a call per read: tests and the dev server, never the shipped page. Reads of a symbol, of what every object has
 * (toString, constructor...) and of an array's length and methods are not field reads.
 */
export function guarded<T>(value: T, spec: FieldSpec, part = 'core', path = ''): T {
  if (spec === true || typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) {
    return new Proxy(value, {
      get(target, key, receiver) {
        const v: unknown = Reflect.get(target, key, receiver);
        return typeof key === 'string' && /^\d+$/.test(key) ? guarded(v, spec, part, `${path}[]`) : v;
      },
    });
  }
  return new Proxy(value, {
    get(target, key, receiver) {
      const v: unknown = Reflect.get(target, key, receiver);
      if (typeof key === 'symbol' || key in Object.prototype) return v;
      const childSpec = specOf(spec, key);
      if (childSpec === undefined) {
        if (Object.hasOwn(target, key)) throw new MissingFieldError(part, path === '' ? key : `${path}.${key}`);
        return v;
      }
      return guarded(v, childSpec, part, path === '' ? key : `${path}.${key}`);
    },
    has(target, key) {
      return typeof key === 'symbol' || key in Object.prototype || specOf(spec, key) !== undefined ? Reflect.has(target, key) : false;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).filter((key) => typeof key === 'symbol' || specOf(spec, key) !== undefined);
    },
  });
}

// ------------------------------------------------------------------ the estimates

/** The fields the estimate stage writes, by object (build/src/estimate-stage.ts). The estimates part carries these, cut to the declared list. */
const GRADE_ESTIMATE_FIELDS = ['estimateVersion', 'estimate', 'estimateWithheld'] as const;
const HEADLINE_ESTIMATE_FIELDS = ['estimate', 'notApplicable'] as const;
const PRINT_ESTIMATE_FIELDS = ['nozzleEstimate', 'bedEstimate'] as const;
const META_ESTIMATE_FIELDS = ['estimateCoverage', 'estimateModel', 'printEstimates'] as const;

/** The estimate stage's fields of a compiled database, as the overlay that puts them back. */
export interface Overlay {
  grades: { [gradeId: string]: Obj };
  materials: { [materialId: string]: { headline: { [key: string]: Obj }; print: Obj } };
  meta: Obj;
}

function picked(source: unknown, names: readonly string[]): Obj {
  const out: Obj = {};
  if (isObject(source)) for (const name of names) if (source[name] !== undefined) out[name] = source[name];
  return out;
}

const rowsOf = (value: unknown): Obj[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** The overlay of a database that has the estimate stage's fields in place: what `applyEstimates` needs to put them on its core. */
export function overlayOf(db: Obj): Overlay {
  const overlay: Overlay = { grades: {}, materials: {}, meta: picked(db['meta'], META_ESTIMATE_FIELDS) };
  for (const grade of rowsOf(db['grades'])) {
    const fields = picked(grade, GRADE_ESTIMATE_FIELDS);
    if (Object.keys(fields).length) overlay.grades[String(grade['id'])] = fields;
  }
  for (const material of rowsOf(db['materials'])) {
    const headline: { [key: string]: Obj } = {};
    const headlines = material['headline'];
    if (isObject(headlines)) {
      for (const [key, h] of Object.entries(headlines)) {
        const fields = picked(h, HEADLINE_ESTIMATE_FIELDS);
        if (Object.keys(fields).length) headline[key] = fields;
      }
    }
    const print = picked(material['print'], PRINT_ESTIMATE_FIELDS);
    if (Object.keys(headline).length || Object.keys(print).length) overlay.materials[String(material['id'])] = { headline, print };
  }
  return overlay;
}

/** The overlay cut to the declared list (a list in the overlay's own shape: grades[], materials[].headline.*, materials[].print, meta). */
export function pruneOverlay(overlay: Overlay, spec: FieldSpec): Overlay {
  if (spec === true) return overlay;
  const out: Overlay = { grades: {}, materials: {}, meta: {} };
  const grades = spec['grades'];
  if (grades !== undefined) for (const [id, fields] of Object.entries(overlay.grades)) out.grades[id] = pruneRecord(fields, grades);
  const materials = spec['materials'];
  if (materials !== undefined && materials !== true) {
    const headlines = materials['headline'];
    const print = materials['print'];
    for (const [id, m] of Object.entries(overlay.materials)) {
      const cutHeadline: { [key: string]: Obj } = {};
      for (const [key, fields] of Object.entries(m.headline)) {
        const headlineSpec = headlines === undefined || headlines === true ? headlines : specOf(headlines, key);
        if (headlineSpec !== undefined) cutHeadline[key] = pruneRecord(fields, headlineSpec);
      }
      out.materials[id] = { headline: cutHeadline, print: print === undefined ? {} : pruneRecord(m.print, print) };
    }
  } else if (materials === true) out.materials = overlay.materials;
  const meta = spec['meta'];
  if (meta !== undefined) out.meta = pruneRecord(overlay.meta, meta);
  return out;
}

/** The estimates are for records the core does not hold, or the core is not what the estimates were cut from. */
export class EstimatesDoNotFitError extends Error {
  constructor(what: string) {
    super(`the estimates name ${what}, which the core does not have`);
    this.name = 'EstimatesDoNotFitError';
  }
}

/** The fields put on `target`, each joined with what `target` already holds of it (the core carries part of some estimate fields; the estimates carry more of the same). */
function putOn(target: Obj, fields: Obj): void {
  for (const [name, value] of Object.entries(fields)) target[name] = join(target[name], value);
}

/**
 * Put the estimates on a core model, in place (the model is the reader's own parse of the core part). A field the estimates carry is
 * joined with the core's, which holds the part of it every mode reads, so the result has both. A record the core lacks is an error,
 * never skipped.
 */
export function applyEstimates(model: Obj, overlay: Overlay): void {
  const grades = new Map(rowsOf(model['grades']).map((g) => [String(g['id']), g]));
  const materials = new Map(rowsOf(model['materials']).map((m) => [String(m['id']), m]));
  for (const id of Object.keys(overlay.grades)) if (!grades.has(id)) throw new EstimatesDoNotFitError(`grade ${id}`);
  for (const [id, { headline, print }] of Object.entries(overlay.materials)) {
    const m = materials.get(id);
    if (!m) throw new EstimatesDoNotFitError(`material ${id}`);
    const headlines = m['headline'];
    for (const key of Object.keys(headline)) if (!isObject(headlines) || !isObject(headlines[key])) throw new EstimatesDoNotFitError(`headline ${key} of ${id}`);
    if (Object.keys(print).length && !isObject(m['print'])) throw new EstimatesDoNotFitError(`print windows of ${id}`);
  }
  for (const [id, fields] of Object.entries(overlay.grades)) putOn(grades.get(id) ?? {}, fields);
  for (const [id, { headline, print }] of Object.entries(overlay.materials)) {
    const m = materials.get(id);
    const headlines = m?.['headline'];
    if (isObject(headlines)) {
      for (const [key, fields] of Object.entries(headline)) {
        const target = headlines[key];
        if (isObject(target)) putOn(target, fields);
      }
    }
    const printWindows = m?.['print'];
    if (Object.keys(print).length && isObject(printWindows)) putOn(printWindows, print);
  }
  const meta = isObject(model['meta']) ? model['meta'] : (model['meta'] = {});
  putOn(meta, overlay.meta);
}

/**
 * Put the rest of the materials' headlines on a core model, in place (the reference part carries them: the core holds the values a decision and the table
 * read, and the chart lenses read every headline). A field the core already has stays as it is; a material or a headline the core lacks is an error,
 * never skipped.
 */
export function applyHeadlines(model: Obj, headlines: { readonly [materialId: string]: Obj }): void {
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
}

/** The headlines do not belong to the core they were applied to. */
export class HeadlinesDoNotFitError extends Error {
  constructor(what: string) {
    super(`the headlines name ${what}, which the core does not have`);
    this.name = 'HeadlinesDoNotFitError';
  }
}

// ------------------------------------------------------------------ what the public may see

/**
 * Every `url` in the value goes through publicUrl (owner ruling R3 C, pack 16): a web address stays, a path on someone's machine
 * is never published and the record says it is a private reference, and anything else that is not an address is no link.
 * Returns a copy; the input is not touched.
 */
export function publicize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((element: unknown) => publicize(element));
  if (!isObject(value)) return value;
  const out: Obj = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'url' && (typeof child === 'string' || child === null)) {
      const link = publicSourceLink(child);
      out[key] = link.kind === 'link' ? link.href : null;
      if (link.kind === 'private') out['privateReference'] = true;
    } else out[key] = publicize(child);
  }
  return out;
}
