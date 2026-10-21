// JSON Patch (RFC 6902) for a table's schema file (WP-17; pack 04 section 5: `schemaEdit` is "any other schema change by JSON patch").
// The six operations, applied to a deep copy; a patch that does not apply is an error that names the operation, never a half-applied document.
import type { PatchOp } from '@atlas/domain/contracts';

export class PatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatchError';
  }
}

type Container = Record<string, unknown> | unknown[];
const isContainer = (value: unknown): value is Container => typeof value === 'object' && value !== null;
const isObject = (value: unknown): value is Record<string, unknown> => isContainer(value) && !Array.isArray(value);

function pointer(path: string, at: string): string[] {
  if (path === '') return [];
  if (!path.startsWith('/')) throw new PatchError(`${at}: ${JSON.stringify(path)} is not a JSON pointer (it starts with "/")`);
  return path.slice(1).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function indexOf(list: readonly unknown[], key: string, at: string, allowEnd: boolean): number {
  if (allowEnd && key === '-') return list.length;
  if (!/^(?:0|[1-9]\d*)$/.test(key)) throw new PatchError(`${at}: ${JSON.stringify(key)} is not a position in a list`);
  const index = Number(key);
  if (index > list.length || (index === list.length && !allowEnd)) throw new PatchError(`${at}: position ${index} is outside the list of ${list.length}`);
  return index;
}

function parentOf(doc: unknown, keys: readonly string[], at: string): Container {
  let node: unknown = doc;
  for (const key of keys.slice(0, -1)) {
    if (Array.isArray(node)) node = node[indexOf(node, key, at, false)];
    else if (isObject(node) && key in node) node = node[key];
    else throw new PatchError(`${at}: there is nothing at ${JSON.stringify(key)}`);
  }
  if (!isContainer(node)) throw new PatchError(`${at}: the path leads into a value that has no members`);
  return node;
}

function read(doc: unknown, path: string, at: string): unknown {
  const keys = pointer(path, at);
  if (keys.length === 0) return doc;
  const parent = parentOf(doc, keys, at);
  const key = keys.at(-1) ?? '';
  if (Array.isArray(parent)) return parent[indexOf(parent, key, at, false)];
  if (!(key in parent)) throw new PatchError(`${at}: there is nothing at ${path}`);
  return parent[key];
}

function put(doc: unknown, path: string, value: unknown, mode: 'add' | 'replace', at: string): unknown {
  const keys = pointer(path, at);
  if (keys.length === 0) return value;
  const parent = parentOf(doc, keys, at);
  const key = keys.at(-1) ?? '';
  if (Array.isArray(parent)) {
    if (mode === 'add') parent.splice(indexOf(parent, key, at, true), 0, value);
    else parent[indexOf(parent, key, at, false)] = value;
  } else {
    if (mode === 'replace' && !(key in parent)) throw new PatchError(`${at}: there is nothing at ${path} to replace`);
    parent[key] = value;
  }
  return doc;
}

function take(doc: unknown, path: string, at: string): unknown {
  const keys = pointer(path, at);
  if (keys.length === 0) throw new PatchError(`${at}: the whole document cannot be removed`);
  const parent = parentOf(doc, keys, at);
  const key = keys.at(-1) ?? '';
  if (Array.isArray(parent)) return parent.splice(indexOf(parent, key, at, false), 1)[0];
  if (!(key in parent)) throw new PatchError(`${at}: there is nothing at ${path} to remove`);
  const value = parent[key];
  delete parent[key];
  return value;
}

/**
 * A value with its object keys in the order the repository's schema files write them (name, type, role, description, ... constraints),
 * then any other key alphabetically. A command travels as canonical JSON, whose keys are sorted; a value inserted into a schema file must
 * come out as the same text whichever order it arrived in, or the same command would make two different schemas.
 */
const KEY_ORDER = ['name', 'type', 'role', 'description', 'vocabulary', 'reference', 'delimiter', 'item', 'missing', 'trueValues', 'falseValues', 'constraints', 'required', 'pattern', 'unique', 'enum', 'minimum', 'maximum'];
export function orderedValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedValue);
  if (!isObject(value)) return value;
  const rank = (key: string): number => { const k = KEY_ORDER.indexOf(key); return k < 0 ? KEY_ORDER.length : k; };
  const keys = Object.keys(value).sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : Number(a > b)));
  return Object.fromEntries(keys.map((key) => [key, orderedValue(value[key])]));
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(orderedValue(a)) === JSON.stringify(orderedValue(b));

/** `doc` with `ops` applied in order, on a copy. Throws PatchError at the first operation that does not apply. */
export function applyPatch(doc: unknown, ops: readonly PatchOp[]): unknown {
  let out: unknown = structuredClone(doc);
  ops.forEach((op, k) => {
    const at = `patch[${k}] (${op.op} ${op.path})`;
    switch (op.op) {
      case 'add':
      case 'replace':
        out = put(out, op.path, orderedValue(structuredClone(op.value)), op.op, at);
        break;
      case 'remove':
        take(out, op.path, at);
        break;
      case 'move':
        out = put(out, op.path, take(out, op.from, at), 'add', at);
        break;
      case 'copy':
        out = put(out, op.path, orderedValue(structuredClone(read(out, op.from, at))), 'add', at);
        break;
      case 'test':
        if (!same(read(out, op.path, at), op.value)) throw new PatchError(`${at}: the document holds ${JSON.stringify(read(out, op.path, at))}, not the expected ${JSON.stringify(op.value)}`);
        break;
    }
  });
  return out;
}
