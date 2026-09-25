// A content-addressed cache of buildDatabase's result, so the build, the lint, the snapshot, the trace and the tests
// that compile the same tables with the same code compute the estimate stage once, not once each.
//
// The key is a SHA-256 of everything the result can depend on:
//
//   the tables      the in-memory `wb` object itself, walked canonically (every value, key order, undefined, -0,
//                   shared references), never the CSV files: a test that edits `wb` before building gets its own key
//   the code        the bytes of every file under build/src/, build/mappings/ and schema/ (the vocabularies and the
//                   estimate model are read from there), and the installed dependency tree (build/node_modules)
//   the runtime     Node's version, platform and architecture, ICU's version and the default collation locale
//                   (the estimate stage sorts with localeCompare)
//   the options     snapshot, build and estimates
//
// A key that cannot be computed safely is no key: a `wb` holding anything other than plain objects, arrays and
// primitives, a result that does not survive serialisation exactly, a build that changed its own input, or a code
// file modified after this process started (its modules may be older than the bytes on disk) turns the cache off for
// that call or that process. A hit returns a fresh deserialised copy, so a caller may mutate what it gets.
//
// H2C_NO_BUILD_CACHE=1 turns it off; `buildDatabase(wb, { cache: false })` turns it off for one call.
// The entries live in .cache/build/ (git-ignored), least recently used first out beyond MAX_BYTES.

import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';

const FORMAT = 'h2c-build-cache 1';
const MAGIC = Buffer.from('H2CBUILD1\n');
const MAX_BYTES = 512 * 1024 * 1024;
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE_DIR = join(projectRoot, '.cache/build');
const CODE_ROOTS = ['build/src', 'build/mappings', 'schema'];
const CODE_FILES = ['build/package-lock.json', 'build/node_modules/.package-lock.json'];

export class Uncacheable extends Error {}

/** False when the environment turns the cache off (H2C_NO_BUILD_CACHE set to anything but "" or "0"). */
export function cacheEnabled() {
  const v = process.env.H2C_NO_BUILD_CACHE;
  return v === undefined || v === '' || v === '0';
}

/**
 * The canonical digest of a value made of plain objects, arrays and primitives. Two values with the same digest are
 * indistinguishable to any code that reads them: same types, same numbers (-0 and NaN included), same strings code
 * unit by code unit, same keys in the same order, same holes, and the same sharing of objects between places.
 * Anything else (a class instance, a Map, a function, a symbol, a getter, a non-enumerable or read-only property, a
 * frozen object) throws Uncacheable.
 */
export function canonicalDigest(value) {
  const hash = createHash('sha256');
  let parts = [];
  let size = 0;
  const emit = (s) => { parts.push(s); size += s.length; if (size > 1 << 20) { hash.update(parts.join(''), 'utf16le'); parts = []; size = 0; } };
  const seen = new Map();
  const walk = (v) => {
    if (v === null) return emit('n');
    switch (typeof v) {
      case 'undefined': return emit('u');
      case 'boolean': return emit(v ? 't' : 'f');
      case 'number': return emit(Object.is(v, -0) ? 'd-0;' : `d${v};`);
      case 'string': return emit(`s${v.length}:${v}`);
      case 'object': break;
      default: throw new Uncacheable(`a ${typeof v} value`);
    }
    if (seen.has(v)) return emit(`r${seen.get(v)};`);
    seen.set(v, seen.size);
    if (!Object.isExtensible(v)) throw new Uncacheable('a frozen, sealed or non-extensible object');
    const proto = Object.getPrototypeOf(v);
    const keys = Reflect.ownKeys(v);
    if (Array.isArray(v)) {
      if (proto !== Array.prototype) throw new Uncacheable('an array subclass');
      emit(`a${v.length}[`);
      let present = 0;
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, i);
        if (!d) { emit('h'); continue; }
        present++;
        if (!('value' in d) || !d.enumerable || !d.writable || !d.configurable) throw new Uncacheable('an array element that is not a plain value');
        walk(d.value);
      }
      if (keys.length !== present + 1) throw new Uncacheable('an array with properties besides its elements');
      return emit(']');
    }
    if (proto !== Object.prototype) throw new Uncacheable('an object that is not a plain object');
    emit(`o${keys.length}{`);
    for (const k of keys) {
      if (typeof k === 'symbol') throw new Uncacheable('a symbol key');
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!('value' in d) || !d.enumerable || !d.writable || !d.configurable) throw new Uncacheable(`property "${k}" is not a plain value`);
      emit(`k${k.length}:${k}`);
      walk(d.value);
    }
    emit('}');
  };
  walk(value);
  hash.update(parts.join(''), 'utf16le');
  return hash.digest('hex');
}

/** Every code and configuration file the result can depend on, with its bytes' hash and its modification time. */
function codeFiles() {
  const files = [];
  for (const dir of CODE_ROOTS) {
    for (const f of readdirSync(join(projectRoot, dir), { recursive: true, withFileTypes: true })) {
      if (f.isFile()) files.push(relative(projectRoot, join(f.parentPath, f.name)));
    }
  }
  files.push(...CODE_FILES.filter((f) => existsSync(join(projectRoot, f))));
  return files.sort().map((file) => {
    const path = join(projectRoot, file);
    const { mtimeMs } = statSync(path);
    return { file, mtimeMs, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
  });
}

function codeDigest(files) {
  const runtime = [process.version, process.platform, process.arch, process.versions.icu ?? 'no-icu', new Intl.Collator().resolvedOptions().locale];
  return createHash('sha256').update(JSON.stringify({ FORMAT, runtime, files: files.map((f) => [f.file, f.sha256]) })).digest('hex');
}

// The code digest, taken once per process. A file modified after this process started may be newer than the module
// this process loaded from it, so the key could name code that is not what runs: the cache stays off for the process.
let code;
function processCode() {
  if (code !== undefined) return code;
  try {
    const files = codeFiles();
    const started = performance.timeOrigin;
    const late = files.find((f) => f.mtimeMs >= started - 2000); // 2 s: the coarsest timestamp a filesystem keeps
    code = late ? null : codeDigest(files);
    if (late) process.emitWarning(`build cache off in this process: ${late.file} changed after it started`);
  } catch {
    code = null;
  }
  return code;
}

/** The key for a build of `wb` with these options by the code whose digest is `code`. */
export function keyOf(code, wb, options) {
  return createHash('sha256').update(`${code}\n${canonicalDigest(options)}\n${canonicalDigest(wb)}`).digest('hex');
}

/** The cache key for a build of `wb` with these options by this process's code, or null when none can be computed safely. */
export function cacheKey(wb, options) {
  const digest = processCode();
  if (!digest) return null;
  try {
    return keyOf(digest, wb, options);
  } catch (e) {
    if (e instanceof Uncacheable) return null;
    throw e;
  }
}

const entryPath = (key) => join(CACHE_DIR, `${key}.bin`);

/**
 * An entry's bytes: a marker, the key, the SHA-256 of the body, and the body (the result serialised, compressed). The
 * result must survive serialisation exactly (its canonical digest before and after a round trip agree, which throws
 * Uncacheable for anything but plain data); `copy` is that round-tripped result.
 */
export function encodeEntry(key, result) {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error(`not a cache key: ${key}`);
  const payload = serialize(result);
  const copy = deserialize(payload);
  if (canonicalDigest(copy) !== canonicalDigest(result)) throw new Uncacheable('a result that does not survive serialisation');
  const body = zstdCompressSync(payload);
  return { bytes: Buffer.concat([MAGIC, Buffer.from(key, 'latin1'), createHash('sha256').update(body).digest(), body]), copy };
}

/** The result an entry's bytes hold, deserialised afresh; throws if they are damaged or belong to another key. */
export function decodeEntry(key, bytes) {
  const head = MAGIC.length;
  if (!bytes.subarray(0, head).equals(MAGIC)) throw new Error('not a build cache entry');
  const body = bytes.subarray(head + 96);
  if (bytes.subarray(head, head + 64).toString('latin1') !== key) throw new Error('an entry for another key');
  if (!createHash('sha256').update(body).digest().equals(bytes.subarray(head + 64, head + 96))) throw new Error('a damaged entry');
  return deserialize(zstdDecompressSync(body));
}

/** The stored result for this key, deserialised afresh, or null. A damaged entry is removed and reads as a miss. */
export function readEntry(key) {
  const path = entryPath(key);
  let bytes;
  try { bytes = readFileSync(path); } catch { return null; }
  try {
    const value = decodeEntry(key, bytes);
    try { const now = new Date(); utimesSync(path, now, now); } catch { /* recency is a hint for pruning only */ }
    return value;
  } catch {
    try { unlinkSync(path); } catch { /* another process removed it */ }
    return null;
  }
}

/**
 * Store a result under its key and return the round-tripped copy, or null if nothing was stored (the result is not
 * plain data, or the code changed on disk while it was built). Written to a temporary name and renamed, so a reader
 * never sees half an entry.
 */
export function writeEntry(key, result) {
  try {
    if (processCode() !== codeDigest(codeFiles())) return null; // the code changed during the build
    const { bytes, copy } = encodeEntry(key, result);
    mkdirSync(CACHE_DIR, { recursive: true });
    const tmp = join(CACHE_DIR, `.${key}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
    writeFileSync(tmp, bytes);
    renameSync(tmp, entryPath(key));
    try { prune(); } catch { /* the entry is stored; pruning runs again on the next write */ }
    return copy;
  } catch (e) {
    if (!(e instanceof Uncacheable)) process.emitWarning(`build cache: could not store an entry (${e.message})`);
    return null;
  }
}

const MAX_WAIT_MS = 5 * 60e3;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** True unless the lock names a process that has ended (an unreadable or half-written lock is taken as held). */
function lockHeld(lock) {
  const pid = Number.parseInt(readFileSyncOrEmpty(lock), 10);
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return true;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
function readFileSyncOrEmpty(path) { try { return readFileSync(path, 'utf8'); } catch { return ''; } }

/**
 * One build per key at a time across processes: the test files run in parallel and several need the same result.
 * Returns { entry } when another process stored it while this one waited, else { release } to build it here and then
 * call. The lock is only an economy; what a caller gets is decided by the key alone. A lock whose process has ended is
 * taken over, and one older than MAX_WAIT_MS, or a wait longer than that, and this process builds regardless.
 */
export function claim(key) {
  const lock = join(CACHE_DIR, `${key}.lock`);
  const deadline = Date.now() + MAX_WAIT_MS;
  const none = { release: () => {} };
  for (;;) {
    try {
      mkdirSync(CACHE_DIR, { recursive: true });
      writeFileSync(lock, `${process.pid}\n`, { flag: 'wx' });
      return { release: () => { try { unlinkSync(lock); } catch { /* already gone */ } } };
    } catch (e) {
      if (e.code !== 'EEXIST') return none;
    }
    const entry = readEntry(key);
    if (entry) return { entry };
    let since;
    try { since = statSync(lock).mtimeMs; } catch { continue; } // released without storing: build it here
    if (!lockHeld(lock)) { try { unlinkSync(lock); } catch { /* another waiter took it over */ } continue; }
    // A lock this old is a build that stalled, or a crashed one whose process number is in use again: do not wait on it.
    if (Date.now() > deadline || Date.now() - since > MAX_WAIT_MS) return none;
    sleep(250);
  }
}

/** Keep the folder under MAX_BYTES, least recently used out first, and clear temporary files an interrupted write left. */
function prune() {
  const entries = [];
  let total = 0;
  for (const name of readdirSync(CACHE_DIR)) {
    const path = join(CACHE_DIR, name);
    let st;
    try { st = statSync(path); } catch { continue; }
    if (name.endsWith('.tmp') || name.endsWith('.lock')) { if (Date.now() - st.mtimeMs > 3600e3) try { unlinkSync(path); } catch { /* gone */ } continue; }
    if (!name.endsWith('.bin')) continue;
    entries.push({ path, size: st.size, mtimeMs: st.mtimeMs });
    total += st.size;
  }
  entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
  for (const e of entries) {
    if (total <= MAX_BYTES) break;
    try { unlinkSync(e.path); total -= e.size; } catch { /* another process removed it */ }
  }
}
