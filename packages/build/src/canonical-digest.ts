// A digest that names a value exactly, for a cache key (WP-21).
//
// Two values with the same digest are indistinguishable to any code that reads them: the same types, the same numbers (-0 and NaN
// included), the same strings code unit by code unit, the same keys in the same order, the same holes, and the same sharing of
// objects between places. It is the digest of build/src/build-cache.js, re-written for the new package. A key built from anything
// less exact (JSON text, v8.serialize bytes, whose string encoding follows V8's internal representation) can name two different
// inputs alike, and a cache keyed by it would serve one input's result for the other.
//
// A value that is not plain data throws Uncacheable: a class instance, a Map, a function, a symbol, a getter, a non-enumerable or
// read-only property, a frozen object. The caller must then not cache; it must never fall back to a weaker digest.
import { createHash } from 'node:crypto';

/** The value cannot be named exactly, so nothing computed from it may be stored or looked up. */
export class Uncacheable extends Error {}

const isPlainValue = (d: PropertyDescriptor): boolean => 'value' in d && d.enumerable === true && d.writable === true && d.configurable === true;

/**
 * The canonical SHA-256 (hex) of a value made of plain objects, arrays and primitives. `sharing: false` leaves out which objects are the
 * same object (for comparing two values that were copied apart); everything else about the value still counts. Only for values with no cycles.
 */
export function canonicalDigest(value: unknown, { sharing = true }: { sharing?: boolean } = {}): string {
  const hash = createHash('sha256');
  let parts: string[] = [];
  let size = 0;
  const emit = (s: string): void => {
    parts.push(s);
    size += s.length;
    if (size > 1 << 20) { hash.update(parts.join(''), 'utf16le'); parts = []; size = 0; }
  };
  const seen = new Map<object, number>();
  const walk = (v: unknown): void => {
    if (v === null) { emit('n'); return; }
    switch (typeof v) {
      case 'undefined': emit('u'); return;
      case 'boolean': emit(v ? 't' : 'f'); return;
      case 'number': emit(Object.is(v, -0) ? 'd-0;' : `d${String(v)};`); return;
      case 'string': emit(`s${v.length}:${v}`); return;
      case 'object': break;
      case 'bigint':
      case 'function':
      case 'symbol': throw new Uncacheable(`a ${typeof v} value`);
    }
    if (sharing) {
      const known = seen.get(v);
      if (known !== undefined) { emit(`r${known};`); return; }
      seen.set(v, seen.size);
    }
    if (!Object.isExtensible(v)) throw new Uncacheable('a frozen, sealed or non-extensible object');
    const proto: unknown = Object.getPrototypeOf(v);
    const keys = Reflect.ownKeys(v);
    if (Array.isArray(v)) {
      if (proto !== Array.prototype) throw new Uncacheable('an array subclass');
      emit(`a${v.length}[`);
      let present = 0;
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, i);
        if (!d) { emit('h'); continue; }
        present++;
        if (!isPlainValue(d)) throw new Uncacheable('an array element that is not a plain value');
        walk(d.value);
      }
      if (keys.length !== present + 1) throw new Uncacheable('an array with properties besides its elements');
      emit(']');
      return;
    }
    if (proto !== Object.prototype) throw new Uncacheable('an object that is not a plain object');
    emit(`o${keys.length}{`);
    for (const k of keys) {
      if (typeof k === 'symbol') throw new Uncacheable('a symbol key');
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d || !isPlainValue(d)) throw new Uncacheable(`property "${k}" is not a plain value`);
      emit(`k${k.length}:${k}`);
      walk(d.value);
    }
    emit('}');
  };
  walk(value);
  hash.update(parts.join(''), 'utf16le');
  return hash.digest('hex');
}
