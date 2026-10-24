// The estimate stage's cache (WP-21; pack 03 ADR-10, EV-07): its key, and its store.
//
// A stored result is served only under a key that names EVERYTHING the stage's output can depend on:
//
//   inputs    the compiled core database the stage reads (every value, key order, undefined, -0, shared references; only the build
//             label meta.build is left out, a stamp the stage never reads) and the ledger's estimate conversions
//   code      the bytes of every module the stage loads (found by following its imports), the model configuration and the schema
//             and vocabularies it reads, and the version of every package it imports
//   runtime   Node, V8, ICU, CLDR, Unicode, platform, architecture, the default collator and a probe of how it sorts (the stage
//             sorts with localeCompare and uses V8's Math.log and Math.exp: gap-1, owner ruling OQ-07 A)
//   format    this file's version of the key and of the entry
//
// Anything that cannot be named exactly turns the cache off for that call, loudly (a note, never a silent fallback): a value that
// is not plain data, a code file edited after this process started (the module in memory may be older than the bytes on disk), a
// module that cannot be found. A damaged entry, an entry for another key and an unreadable folder read as a miss, and are said.
// The entry is a check on the key, not a replacement for it: what a caller gets is decided by the key alone.
//
// H2C_NO_BUILD_CACHE=1 turns it off here as it does for the old build's cache.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize, serialize } from 'node:v8';
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { canonicalDigest } from './canonical-digest.ts';
import type { RuntimeFingerprint } from './runtime-fingerprint.ts';
import type { Dyn } from './types.ts';

/** The version of the key and of the stored entry: change it and every earlier entry is a miss. */
export const STAGE_FORMAT = 'h2c-estimate-stage 1';
const MAGIC = Buffer.from('H2CEST1\n');
const KEY_LENGTH = 64;
const HEADER = MAGIC.length + KEY_LENGTH + 32;
const MAX_ENTRIES = 12;
const MAX_BYTES = 256 * 1024 * 1024;

const SRC = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(SRC, '../../..');
/** Where entries live by default: .cache/ is git-ignored. */
export const DEFAULT_CACHE_DIR = join(PROJECT, '.cache', 'estimates');

/** The modules whose code decides what is stored: the stage's computation, and the code that shapes and stores its output. */
const ENTRY_MODULES = ['estimate/index.ts', 'estimate-stage.ts', 'estimate-cache.ts'];
/** Data the modules read at run time: the model configuration, the schema that checks it and the vocabularies. Whole folders, so a file read later is covered. */
const CONFIG_FOLDERS = ['build/mappings', 'schema'];

/** False when the environment turns the cache off (H2C_NO_BUILD_CACHE set to anything but "" or "0"). */
export function cacheEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.H2C_NO_BUILD_CACHE;
  return v === undefined || v === '' || v === '0';
}

export interface CodeDigest {
  digest: string;
  /** Every source file, from the project root, that went into the digest. */
  files: string[];
  /** Imported packages and their installed versions. */
  packages: Record<string, string>;
}

// Operating-system litter is no code.
const LITTER = /^(\.DS_Store|Thumbs\.db)$/;
// 2 s: the coarsest timestamp a filesystem keeps. A file modified within this window of the process's start, or after it, may be newer
// than the module the process loaded from it.
const LATE_MS = 2000;
const IMPORT_FORMS = [/\bfrom\s*(['"])([^'"\n]+)\1/g, /\bimport\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g, /^\s*import\s+(['"])([^'"\n]+)\1/gm];
const BUILTINS = new Set(builtinModules);

const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');
const rel = (path: string): string => relative(PROJECT, path).split('\\').join('/');

/** The package.json of the installed package a file belongs to (walking up), as { name, version }. */
function packageOf(file: string): { name: string; version: string } {
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
    const path = join(dir, 'package.json');
    if (!existsSync(path)) continue;
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'name' in parsed && 'version' in parsed && typeof parsed.name === 'string' && typeof parsed.version === 'string') {
      return { name: parsed.name, version: parsed.version };
    }
  }
  throw new Error(`no package.json above ${file}`);
}

/**
 * The code digest of the estimate stage: its modules and their imports, followed from `entries`, plus the configuration folders.
 * Throws when an import cannot be followed. A test (tests/remake/estimate-stage.test.mjs) loads the stage and checks every module
 * Node loaded is in this list, so an import written in a form this does not read cannot go unnoticed.
 */
export function computeCodeDigest(entries: readonly string[] = ENTRY_MODULES, folders: readonly string[] = CONFIG_FOLDERS): CodeDigest {
  const sources = new Set<string>();
  const packages: Record<string, string> = {};
  const visit = (file: string): void => {
    if (sources.has(file)) return;
    sources.add(file);
    const text = readFileSync(file, 'utf8');
    const requireFrom = createRequire(file);
    for (const form of IMPORT_FORMS) {
      for (const m of text.matchAll(form)) {
        const spec = m[2] ?? '';
        if (spec.startsWith('node:') || BUILTINS.has(spec)) continue;
        if (spec.startsWith('.')) {
          const target = resolve(dirname(file), spec);
          if (!existsSync(target)) throw new Error(`${rel(file)} imports ${spec}, which is not a file`);
          visit(target);
          continue;
        }
        const resolved = realpathSync(requireFrom.resolve(spec));
        if (resolved.split('/').includes('node_modules')) {
          const pkg = packageOf(resolved);
          packages[pkg.name] = pkg.version;
        } else visit(resolved);
      }
    }
  };
  for (const entry of entries) visit(join(SRC, entry));
  const files = new Set([...sources].map(rel));
  for (const folder of folders) {
    for (const f of readdirSync(join(PROJECT, folder), { recursive: true, withFileTypes: true })) {
      if (f.isSymbolicLink()) throw new Error(`${rel(join(f.parentPath, f.name))} is a symbolic link: the digest does not follow links`);
      if (f.isFile() && !LITTER.test(f.name)) files.add(rel(join(f.parentPath, f.name)));
    }
  }
  const sorted = [...files].sort();
  const started = performance.timeOrigin;
  // ctime as well as mtime: a copy that keeps the old modification time (cp -p, rsync -t) still changes the status time.
  const late = sorted.find((f) => { const st = statSync(join(PROJECT, f)); return Math.max(st.mtimeMs, st.ctimeMs) >= started - LATE_MS; });
  if (late) throw new LateCode(`${late} changed after this process started, so the code in memory may not be the code on disk`);
  const pairs = sorted.map((f) => [f, sha256(readFileSync(join(PROJECT, f)))]);
  return { digest: sha256(JSON.stringify({ format: STAGE_FORMAT, files: pairs, packages })), files: sorted, packages };
}

/** A code file was modified after this process started: nothing may be looked up or stored under a key made from it. */
export class LateCode extends Error {}

let processCode: { digest: CodeDigest } | { error: string } | undefined;
/** The code digest, taken once per process; null (with the reason) where it cannot be taken safely. */
export function stageCode(): { digest: CodeDigest } | { error: string } {
  if (processCode) return processCode;
  try {
    processCode = { digest: computeCodeDigest() };
  } catch (error) {
    processCode = { error: error instanceof Error ? error.message : String(error) };
  }
  return processCode;
}

export interface KeyParts {
  inputs: string;
  code: string;
  runtime: RuntimeFingerprint;
  options: Dyn;
}

/** The cache key: a digest of every part, under the format version. */
export function stageKey(parts: KeyParts): string {
  return sha256(JSON.stringify({ format: STAGE_FORMAT, inputs: parts.inputs, code: parts.code, runtime: parts.runtime, options: canonicalDigest(parts.options) }));
}

export type EntryRead = { overlay: Dyn } | { miss: 'absent' } | { miss: 'unreadable'; why: string } | { miss: 'damaged'; why: string };

const entryPath = (dir: string, key: string): string => join(dir, `${key}.bin`);
const isKey = (key: string): boolean => /^[0-9a-f]{64}$/.test(key);

/** An entry's bytes: a marker, the key, the SHA-256 of the body, and the body (the overlay serialised, compressed). */
export function encodeEntry(key: string, overlay: Dyn): Buffer {
  if (!isKey(key)) throw new Error(`not a cache key: ${key}`);
  const body = zstdCompressSync(serialize(overlay));
  return Buffer.concat([MAGIC, Buffer.from(key, 'latin1'), createHash('sha256').update(body).digest(), body]);
}

/** The overlay an entry's bytes hold, deserialised afresh; throws if they are damaged or belong to another key. */
export function decodeEntry(key: string, bytes: Buffer): Dyn {
  if (bytes.length < HEADER || !bytes.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('not an estimate cache entry');
  if (bytes.subarray(MAGIC.length, MAGIC.length + KEY_LENGTH).toString('latin1') !== key) throw new Error('an entry for another key');
  const body = bytes.subarray(HEADER);
  if (!createHash('sha256').update(body).digest().equals(bytes.subarray(MAGIC.length + KEY_LENGTH, HEADER))) throw new Error('a damaged entry (checksum)');
  return deserialize(zstdDecompressSync(body));
}

/** The stored overlay for this key. A damaged entry is removed and reads as a miss that says why. */
export function readEntry(dir: string, key: string): EntryRead {
  const path = entryPath(dir, key);
  let bytes: Buffer;
  try {
    bytes = readFileSync(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return { miss: 'absent' };
    return { miss: 'unreadable', why: error instanceof Error ? error.message : String(error) };
  }
  try {
    const overlay: Dyn = decodeEntry(key, bytes);
    try { const now = new Date(); utimesSync(path, now, now); } catch { /* recency is a hint for pruning only */ }
    return { overlay };
  } catch (error) {
    try { unlinkSync(path); } catch { /* another process removed it */ }
    return { miss: 'damaged', why: error instanceof Error ? error.message : String(error) };
  }
}

/** Remove an entry (one that proved not to fit). */
export function removeEntry(dir: string, key: string): void {
  try { unlinkSync(entryPath(dir, key)); } catch { /* already gone */ }
}

/** Store an overlay under its key. Written to a temporary name and renamed, so a reader never sees half an entry. Returns the reason it was not stored, or null. */
export function writeEntry(dir: string, key: string, overlay: Dyn): string | null {
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.${key}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
    try {
      writeFileSync(tmp, encodeEntry(key, overlay));
      renameSync(tmp, entryPath(dir, key));
    } catch (error) {
      try { unlinkSync(tmp); } catch { /* never written */ }
      throw error;
    }
    try { prune(dir); } catch { /* the entry is stored; pruning runs again on the next write */ }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Keep the folder to MAX_ENTRIES entries and MAX_BYTES, least recently used out first, and clear temporary files an interrupted write left. */
function prune(dir: string): void {
  const entries: { path: string; size: number; mtimeMs: number }[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    let st;
    try { st = statSync(path); } catch { continue; }
    if (name.endsWith('.tmp')) { if (Date.now() - st.mtimeMs > 3600e3) try { unlinkSync(path); } catch { /* gone */ } continue; }
    if (name.endsWith('.bin')) entries.push({ path, size: st.size, mtimeMs: st.mtimeMs });
  }
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  let total = 0;
  entries.forEach((e, i) => {
    total += e.size;
    if (i >= MAX_ENTRIES || total > MAX_BYTES) try { unlinkSync(e.path); } catch { /* another process removed it */ }
  });
}
