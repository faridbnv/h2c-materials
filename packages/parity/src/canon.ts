// Canonical encoding of values, so two engines' composite values compare as strings without losing what Object.is sees.
import { Composite } from './types.ts';
import type { Atom, NotComputable, Value } from './types.ts';

/** A field that exists on one side only. */
export const ABSENT: unique symbol = Symbol('absent');

export const notComputable = (reason: string): NotComputable => ({ notComputable: true, reason });
export const isNotComputable = (v: unknown): v is NotComputable =>
  typeof v === 'object' && v !== null && (v as NotComputable).notComputable === true;

/** Where a composite value points back to a scenario constraint, the encoder writes its position, not its content. */
export type Identity = ReadonlyMap<object, string>;

/**
 * A deterministic string for any plain value. Object keys are sorted; array order is kept; -0, NaN and the infinities
 * are spelled out, so 0 and -0 differ as they do under Object.is; `undefined` is spelled out, so present-but-undefined
 * differs from absent. A value that cannot be encoded (function, symbol, cycle) throws: the caller turns that into
 * "not computable", never into an empty string.
 */
export function canon(value: unknown, identity?: Identity): string {
  const stack = new Set<object>();
  const enc = (v: unknown): string => {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    switch (typeof v) {
      case 'boolean': return v ? 'true' : 'false';
      case 'number': return Object.is(v, -0) ? '-0' : String(v);
      case 'string': return JSON.stringify(v);
      case 'bigint': return `${v}n`;
      case 'object': break;
      case 'undefined': case 'function': case 'symbol': throw new Error(`cannot encode a ${typeof v}`);
    }
    const o = v as object;
    const tag = identity?.get(o);
    if (tag !== undefined) return `<${tag}>`;
    if (stack.has(o)) throw new Error('cannot encode a cycle');
    stack.add(o);
    try {
      if (Array.isArray(o)) return `[${o.map(enc).join(',')}]`;
      if (o instanceof Map) return `Map[${[...o].map(([k, x]) => `${enc(k)}=>${enc(x)}`).join(',')}]`;
      if (o instanceof Set) return `Set[${[...o].map(enc).join(',')}]`;
      if (isNotComputable(o)) throw new Error('a not-computable marker inside a composite value');
      const proto = Object.getPrototypeOf(o);
      if (proto !== Object.prototype && proto !== null) throw new Error(`cannot encode a ${proto?.constructor?.name ?? 'non-plain'} object`);
      const keys = Object.keys(o).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${enc((o as Record<string, unknown>)[k])}`).join(',')}}`;
    } finally {
      stack.delete(o);
    }
  };
  return enc(value);
}

/** A string, a number, a boolean, null or undefined: compared as it is, never encoded. */
export function isAtom(value: unknown): value is Atom {
  return value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * A list, an object or another non-atom as a Composite value. An atom stays an atom: wrapping one would let a composite
 * and an atom show alike.
 */
export function composite(value: unknown, identity?: Identity): Composite {
  if (isAtom(value)) throw new Error('composite() takes a list or an object; an atom stays an atom');
  return new Composite(canon(value, identity));
}

/**
 * How a value is shown in a difference and in a transition file: type-faithful, so 1 and "1" never look alike, and the string
 * "[1]" (shown quoted) never looks like the list [1] (shown bare).
 */
export function show(v: Value | typeof ABSENT): string {
  if (v === ABSENT) return '<absent>';
  if (isNotComputable(v)) return `<not-computable: ${v.reason}>`;
  if (v instanceof Composite) return v.text;
  return canon(v);
}
