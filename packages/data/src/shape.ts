/**
 * A small runtime shape that is also a TypeScript type: `Infer<typeof shape>` is the type of any value `shape.check`
 * accepts. One definition, so the type and the validator cannot drift apart. Hand-written on purpose (no schema-library
 * dependency, WP-06); checks structure and primitive kinds, not the pattern/minimum constraints that the build's Ajv
 * pass (build/src/contract.js) already enforces.
 */
export interface Shape<T> {
  readonly name: string;
  /** Pushes one message per problem found (at most `LIMIT` in all) and returns whether `value` is a T. */
  readonly check: (value: unknown, path: string, problems: string[]) => value is T;
}

export type Infer<S> = S extends Shape<infer T> ? T : never;

/** Shapes keyed by field name. */
export type Fields = { readonly [key: string]: Shape<unknown> };

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type Required_<R extends Fields> = { readonly [K in keyof R]: Infer<R[K]> };
type Optional_<O extends Fields> = { readonly [K in keyof O]?: Infer<O[K]> };
export type ObjectOf<R extends Fields, O extends Fields> = Simplify<Required_<R> & Optional_<O>>;

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const LIMIT = 40;

function fail(problems: string[], message: string): false {
  if (problems.length < LIMIT) problems.push(message);
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : null;
}

const kind = (value: unknown): string => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);

function primitive<T extends string | number | boolean | null>(name: string, test: (value: unknown) => value is T): Shape<T> {
  return {
    name,
    check: (value, path, problems): value is T => test(value) || fail(problems, `${path}: expected ${name}, found ${kind(value)}`),
  };
}

export const str: Shape<string> = primitive('string', (v): v is string => typeof v === 'string');
export const num: Shape<number> = primitive('number', (v): v is number => typeof v === 'number' && Number.isFinite(v));
export const int: Shape<number> = primitive('integer', (v): v is number => Number.isInteger(v));
export const bool: Shape<boolean> = primitive('boolean', (v): v is boolean => typeof v === 'boolean');
export const nul: Shape<null> = primitive('null', (v): v is null => v === null);

export const json: Shape<JsonValue> = {
  name: 'JSON value',
  check: (value, path, problems): value is JsonValue => {
    const ok = value === null || ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value))
      || Array.isArray(value) || (typeof value === 'object');
    return ok || fail(problems, `${path}: expected a JSON value, found ${kind(value)}`);
  },
};

export function lit<const V extends string | number | boolean>(...allowed: readonly V[]): Shape<V> {
  const name = allowed.map((v) => JSON.stringify(v)).join(' | ');
  const test = (value: unknown): value is V => allowed.some((a) => a === value);
  return { name, check: (value, path, problems): value is V => test(value) || fail(problems, `${path}: expected ${name}, found ${JSON.stringify(value)}`) };
}

export function arr<T>(item: Shape<T>): Shape<readonly T[]> {
  return {
    name: `array of ${item.name}`,
    check: (value, path, problems): value is readonly T[] => {
      if (!Array.isArray(value)) return fail(problems, `${path}: expected array, found ${kind(value)}`);
      const before = problems.length;
      value.forEach((element: unknown, i) => item.check(element, `${path}[${i}]`, problems));
      return problems.length === before;
    },
  };
}

export function record<T>(item: Shape<T>): Shape<{ readonly [key: string]: T }> {
  return {
    name: `map of ${item.name}`,
    check: (value, path, problems): value is { readonly [key: string]: T } => {
      const entries = asRecord(value);
      if (!entries) return fail(problems, `${path}: expected object, found ${kind(value)}`);
      const before = problems.length;
      for (const [key, entry] of Object.entries(entries)) item.check(entry, `${path}.${key}`, problems);
      return problems.length === before;
    },
  };
}

export function union<const Shapes extends readonly Shape<unknown>[]>(...shapes: Shapes): Shape<Infer<Shapes[number]>> {
  const name = shapes.map((s) => s.name).join(' or ');
  return {
    name,
    check: (value, path, problems): value is Infer<Shapes[number]> => {
      // Each variant is tried with its own problem list; only "none matched" is reported.
      const matched = shapes.some((s) => s.check(value, path, []));
      return matched || fail(problems, `${path}: matches none of: ${name}`);
    },
  };
}

/** An object with the keys in `required` always present and those in `optional` allowed. Extra keys are a problem unless `open`. */
export function obj<const R extends Fields, const O extends Fields = {}>(
  required: R,
  optional?: O,
  options?: { readonly open?: boolean },
): Shape<ObjectOf<R, O>> {
  const optionalFields: Fields = optional ?? {};
  return {
    name: 'object',
    check: (value, path, problems): value is ObjectOf<R, O> => {
      const entries = asRecord(value);
      if (!entries) return fail(problems, `${path}: expected object, found ${kind(value)}`);
      const before = problems.length;
      for (const [key, shape] of Object.entries(required)) {
        if (!(key in entries)) fail(problems, `${path}.${key}: required key is missing`);
        else shape.check(entries[key], `${path}.${key}`, problems);
      }
      for (const [key, entry] of Object.entries(entries)) {
        const shape = optionalFields[key];
        if (key in required) continue;
        if (shape) shape.check(entry, `${path}.${key}`, problems);
        else if (options?.open !== true) fail(problems, `${path}.${key}: key is not in the contract`);
      }
      return problems.length === before;
    },
  };
}
