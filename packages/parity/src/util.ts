// Small shared helpers.

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
