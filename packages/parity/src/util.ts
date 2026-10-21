// Small shared helpers.
import { createHash } from 'node:crypto';

/** The value stored under `key`, created with `make()` first if there is none. */
export function getOrCreate<K, V>(map: Map<K, V>, key: K, make: () => V): V {
  let value = map.get(key);
  if (value === undefined) {
    value = make();
    map.set(key, value);
  }
  return value;
}

/** Code-unit string order (not locale order), so sorted output is the same on every machine. */
export const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** sha256 of text or bytes, as hex. */
export const sha256Hex = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');

/** A small seeded generator (mulberry32): the same seed gives the same stream on every machine. Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded Fisher-Yates shuffle; returns a new list. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) throw new Error('shuffled: a list holding undefined cannot be shuffled safely');
    out[i] = b;
    out[j] = a;
  }
  return out;
}
