// The build cache (build/src/build-cache.js) hands back a stored result only for the same tables, code, runtime and
// options. What makes that safe is the canonical digest of the in-memory tables: two values it cannot tell apart must be
// values no code can tell apart, and a value it cannot describe exactly must not be cached at all. The reproducible-build
// test (contract.test.js) and the audit (npm run audit:data) compare a cached build with a cold one end to end.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalDigest, keyOf, encodeEntry, decodeEntry, Uncacheable } from '../build/src/build-cache.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = canonicalDigest;

test('the digest tells apart every pair of values code could tell apart', () => {
  const pairs = [
    [0, -0], [1, '1'], [null, undefined], [NaN, null], [Infinity, -Infinity], [Infinity, 'Infinity'], [0.1 + 0.2, 0.3],
    [{ a: undefined }, {}], [{ a: 1, b: 2 }, { b: 2, a: 1 }], [[1, , 3], [1, undefined, 3]], [[], {}],
    ['\ud800', '\ud801'], ['a', 'a\u0000'], [{ ab: 'c' }, { a: 'bc' }], [['ab', 'c'], ['a', 'bc']],
    [true, 'true'], [{ a: [] }, { a: {} }],
  ];
  for (const [a, b] of pairs) assert.notEqual(d(a), d(b), `${String(a)} and ${String(b)} digest alike`);
  // Sharing is part of the value: a mutation through one path shows through the other only when they are one object.
  const row = { x: 1 };
  assert.notEqual(d({ p: row, q: row }), d({ p: { x: 1 }, q: { x: 1 } }));
});

test('the digest is the same for the same content, however it was made', () => {
  const wb = loadTables(join(root, 'data'));
  assert.equal(d(wb), d(loadTables(join(root, 'data'))));
  assert.equal(d(wb), d(structuredClone(wb)));
  assert.equal(d({ a: [1, 'x', null, { b: -0, c: undefined }] }), d({ a: [1, 'x', null, { b: -0, c: undefined }] }));
});

test('anything but plain data is refused, never described approximately', () => {
  class Row { constructor() { this.a = 1; } }
  const getter = {}; Object.defineProperty(getter, 'a', { get: () => 1, enumerable: true, configurable: true });
  const hidden = {}; Object.defineProperty(hidden, 'a', { value: 1, enumerable: false, writable: true, configurable: true });
  const extra = [1, 2]; extra.note = 'x';
  for (const v of [new Map(), new Set(), new Date(0), new Row(), () => 1, Symbol('s'), 1n, { [Symbol('k')]: 1 }, getter, hidden,
    Object.freeze({ a: 1 }), Object.create(null), extra, new Uint8Array(2), /x/]) {
    assert.throws(() => d({ v }), Uncacheable, String(v?.constructor?.name ?? typeof v));
  }
});

test('an edit to the tables in memory, another option or other code is another key', () => {
  const wb = loadTables(join(root, 'data'));
  const options = { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: true };
  const key = keyOf('code', wb, options);
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(keyOf('code', loadTables(join(root, 'data')), options), key);
  const edited = structuredClone(wb);
  edited.Grades.rows[0].Status = edited.Grades.rows[0].Status === 'active' ? 'retired' : 'active';
  assert.notEqual(keyOf('code', edited, options), key);
  assert.notEqual(keyOf('code', wb, { ...options, estimates: false }), key);
  assert.notEqual(keyOf('code', wb, { ...options, build: 'other' }), key);
  assert.notEqual(keyOf('other code', wb, options), key);
});

test('an entry gives back exactly the result it was made from, and a damaged or misfiled one is refused', () => {
  const wb = loadTables(join(root, 'data'));
  const result = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false, cache: false });
  const key = 'a'.repeat(64);
  const { bytes, copy } = encodeEntry(key, { db: result.db, issues: result.issues, timing: result.timing });
  assert.deepStrictEqual(copy.db, result.db);
  assert.deepStrictEqual(decodeEntry(key, bytes), { db: result.db, issues: result.issues, timing: result.timing });
  assert.throws(() => decodeEntry('b'.repeat(64), bytes), /another key/);
  const damaged = Buffer.from(bytes);
  damaged[damaged.length - 5] ^= 0xff;
  assert.throws(() => decodeEntry(key, damaged), /damaged/);
  assert.throws(() => encodeEntry(key, { db: new Map() }), Uncacheable);
});
