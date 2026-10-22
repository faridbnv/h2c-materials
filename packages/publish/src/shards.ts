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

// ------------------------------------------------------------------ the detail parts' encoding

/**
 * The encoding of a detail part (owner decision 2026-10-22, the site budget): every array of two or more plain records is written as
 * `{ keys, rows }`, the field names once and a row of values per record, instead of every name on every row. A record's fields that are
 * missing (not null: missing) are listed in `absent` as row, column pairs. The part says so in its `encoding` field, and a reader refuses
 * a part that says nothing or says another, so a part is never read as the shape it is not. `decodeDetail(encodeDetail(part))` is the
 * part, key order included; an array whose records would not come back exactly (the same fields in another order) stays an array.
 */
export const DETAIL_ENCODING = 'rows-1';

/** A detail part could not be encoded, or its encoding is not one this reader knows or is damaged. */
export class DetailEncodingError extends Error {
  constructor(what: string) {
    super(what);
    this.name = 'DetailEncodingError';
  }
}

const isTable = (value: unknown): value is { keys: unknown; rows: unknown; absent?: unknown } => {
  if (!isObject(value)) return false;
  const names = Object.keys(value);
  return (names.length === 2 && names.includes('keys') && names.includes('rows')) || (names.length === 3 && names.includes('keys') && names.includes('rows') && names.includes('absent'));
};

/** The fields a record holds, as JSON would write them: a field whose value is undefined is not there. */
const heldKeys = (record: Obj): string[] => Object.keys(record).filter((key) => record[key] !== undefined);

function encodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const records = value.filter(isObject);
    return records.length === value.length && records.length >= 2 ? encodeTable(records) ?? value.map(encodeValue) : value.map(encodeValue);
  }
  if (!isObject(value)) return value;
  if (isTable(value)) throw new DetailEncodingError('a record has exactly the fields of an encoded table (keys, rows), which a reader could not tell from one');
  const out: Obj = {};
  for (const [key, child] of Object.entries(value)) if (child !== undefined) out[key] = encodeValue(child);
  return out;
}

/** The records as a table, or undefined where they would not come back exactly (a record whose fields are in another order than the first-seen columns). */
function encodeTable(records: readonly Obj[]): Obj | undefined {
  const keys: string[] = [];
  const column = new Map<string, number>();
  for (const record of records) {
    for (const key of heldKeys(record)) {
      if (!column.has(key)) { column.set(key, keys.length); keys.push(key); }
    }
  }
  const absent: number[] = [];
  const rows: unknown[][] = [];
  for (const [r, record] of records.entries()) {
    const held = heldKeys(record);
    const columns = held.map((key) => column.get(key) ?? -1);
    if (columns.some((c, i) => i > 0 && c <= (columns[i - 1] ?? -1))) return undefined;
    const row: unknown[] = Array.from({ length: keys.length }, () => null);
    for (const key of held) row[column.get(key) ?? -1] = encodeValue(record[key]);
    for (let c = 0; c < keys.length; c++) if (record[keys[c] ?? ''] === undefined) absent.push(r, c);
    rows.push(row);
  }
  return absent.length ? { keys, rows, absent } : { keys, rows };
}

function decodeValue(value: unknown, where: string): unknown {
  if (Array.isArray(value)) return value.map((element, i) => decodeValue(element, `${where}[${i}]`));
  if (!isObject(value)) return value;
  if (!isTable(value)) {
    const out: Obj = {};
    for (const [key, child] of Object.entries(value)) out[key] = decodeValue(child, `${where}.${key}`);
    return out;
  }
  const { keys, rows, absent = [] } = value;
  if (!Array.isArray(keys) || !keys.every((key): key is string => typeof key === 'string') || new Set(keys).size !== keys.length) throw new DetailEncodingError(`${where}: the table's keys are not a list of distinct names`);
  if (!Array.isArray(rows) || !rows.every((row) => Array.isArray(row) && row.length === keys.length)) throw new DetailEncodingError(`${where}: the table's rows are not lists of one value per key`);
  const cells: unknown[] = Array.isArray(absent) ? absent : [];
  const numbers = cells.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0);
  if (!Array.isArray(absent) || cells.length % 2 !== 0 || numbers.length !== cells.length) throw new DetailEncodingError(`${where}: the table's absent list is not row, column pairs`);
  const missing = new Set<string>();
  for (let i = 0; i < numbers.length; i += 2) {
    const r = numbers[i] ?? 0;
    const c = numbers[i + 1] ?? 0;
    if (r >= rows.length || c >= keys.length) throw new DetailEncodingError(`${where}: the table's absent list names a cell it does not have`);
    missing.add(`${r},${c}`);
  }
  return rows.map((row: unknown[], r) => {
    const record: Obj = {};
    keys.forEach((key, c) => {
      if (!missing.has(`${r},${c}`)) record[key] = decodeValue(row[c], `${where}[${r}].${key}`);
    });
    return record;
  });
}

/** The part with its records written as tables and `encoding` set. */
export function encodeDetail(part: Obj): Obj {
  const { records, ...rest } = part;
  return { ...rest, encoding: DETAIL_ENCODING, records: encodeValue(records) };
}

/** The part as the page reads it: `records` as the plain objects they were. A part with no encoding, or another, throws (DetailEncodingError). */
export function decodeDetail(part: Obj): Obj {
  const { encoding, records, ...rest } = part;
  if (encoding === undefined) throw new DetailEncodingError('the part says no encoding');
  if (encoding !== DETAIL_ENCODING) throw new DetailEncodingError(`the part says encoding ${JSON.stringify(encoding)}, which this reader does not know (it knows ${DETAIL_ENCODING})`);
  return { ...rest, records: decodeValue(records, 'records') };
}
