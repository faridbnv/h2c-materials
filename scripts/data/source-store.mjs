#!/usr/bin/env node
// The source documents' bytes, as a store addressed by digest, that can be listed, backed up and restored (A08, the
// review of 2026-09-27).
//
// Every source in data/tables/sources.csv records the SHA-256 of the document it was read from, and a decision is only
// as replayable as those bytes: the text index, the hash-checked re-reads and the audits all start from them. They are
// the makers' documents, so the repository never carries them; they live in the document cache (.cache/, or wherever
// H2C_DOCUMENT_CACHE puts it; scripts/ingest/context.mjs), named by their digest. A publisher can take a URL down or
// serve other bytes under it, and a digest can tell that the answer changed but cannot bring the old bytes back. What
// can is a copy kept somewhere private, and this is the contract for that copy:
//
//   npm run data:sources -- --manifest          every registered source: its digest, whether its bytes are in the
//                                                cache and hash to it, and whether its text is cached (CSV on stdout)
//   npm run data:sources -- --export <dir>       the present, verified bytes to <dir>/<sha256>.<ext>, and
//                                                <dir>/manifest.csv saying which source each is and where it came from
//   npm run data:sources -- --restore <dir>      bytes back into the cache, only those that hash to a registered
//                                                digest; then every digest still absent, by SourceID
//
// Nothing here fetches. A document fetched again is a new retrieval to be read and recorded as one, never a way to
// fill a hole in the evidence for a decision already made: bytes that do not hash to the recorded digest are not that
// source, whatever their name says. The text (text/<sha>.json) is not part of a bundle: it is re-read from the bytes.

import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../build/src/csv.js';
import { DOCUMENT_CACHE, SOURCES_BY_ID, SOURCES_BY_SHA, TEXT_CACHE, projectRoot } from '../ingest/context.mjs';
import { cachedText } from '../lib/pdf-text.mjs';

const DIGEST = /^[0-9a-f]{64}$/;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** What a document is, by its first bytes, which is how the fetcher named it: a PDF, or a page. */
export const extensionOf = (bytes) => (Buffer.from(bytes).subarray(0, 5).toString('latin1') === '%PDF-' ? 'pdf' : 'html');
/** A path inside the cache as the cache names it, never the machine's own path to it. */
const inCache = (path) => relative(DOCUMENT_CACHE, path).split(sep).join('/');

/**
 * Put bytes in the store under their digest. Written aside and renamed into place, so a copy interrupted half-way is
 * never found under a digest it does not hash to; a damaged copy already there is replaced. Returns { sha, path }.
 */
export function storeBytes(bytes) {
  const sha = sha256(bytes);
  const path = join(SOURCES_BY_SHA, `${sha}.${extensionOf(bytes)}`);
  if (existsSync(path) && sha256(readFileSync(path)) === sha) return { sha, path, stored: false };
  mkdirSync(SOURCES_BY_SHA, { recursive: true });
  const aside = `${path}.${process.pid}.tmp`;
  writeFileSync(aside, bytes);
  renameSync(aside, path);
  return { sha, path, stored: true };
}

/**
 * Where a source's bytes are, and whether they are its bytes: by digest (sources/by-sha, where the pipeline writes)
 * or by SourceID (sources/<id>.pdf, where npm run audit:sources wrote before the pipeline existed), the same two
 * places ingest:extract's documentPath looks. A copy there that hashes to something else is a mismatch, not a copy.
 */
export function locate(sha, sourceId) {
  const candidates = [...['pdf', 'html'].map((ext) => join(SOURCES_BY_SHA, `${sha}.${ext}`)), join(SOURCES_BY_ID, `${sourceId}.pdf`)];
  let mismatch = null;
  for (const path of candidates.filter(existsSync)) {
    if (sha256(readFileSync(path)) === sha) return { bytes: 'present', path };
    mismatch ??= path;
  }
  return mismatch ? { bytes: 'mismatch', path: mismatch } : { bytes: 'absent', path: null };
}

/** The registered sources, in file order: each SourceID with its recorded digest and where it came from. */
export function registered(root = projectRoot) {
  return readCsv(join(root, 'data/tables/sources.csv')).records.map((r) => r.values);
}

/**
 * One row per registered source: its digest, whether the cache holds its bytes and they hash to it (present, absent,
 * mismatch, or not-recorded where the source records no digest), and whether its text is cached by the current reader
 * (cached, stale where an older reader wrote it, absent).
 */
export function manifest(root = projectRoot) {
  return registered(root).map((s) => {
    const sha = String(s.SHA256 ?? '').toLowerCase();
    if (!DIGEST.test(sha)) return { SourceID: s.SourceID, SHA256: s.SHA256 ?? '', Bytes: 'not-recorded', Text: 'not-recorded', File: '' };
    const found = locate(sha, s.SourceID);
    const text = cachedText(sha) ? 'cached' : existsSync(join(TEXT_CACHE, `${sha}.json`)) ? 'stale' : 'absent';
    return { SourceID: s.SourceID, SHA256: sha, Bytes: found.bytes, Text: text, File: found.bytes === 'present' ? inCache(found.path) : '' };
  });
}

const BUNDLE = ['SourceID', 'SHA256', 'File', 'Size', 'URL', 'Access date', 'Access state'];

/**
 * Copy every present, verified document to `dir` as <sha256>.<ext>, with manifest.csv naming, for each file, the
 * sources recorded from it, the URL and date it was retrieved from, and its size. A file already there and whole is
 * kept. Only bytes that hash to their source's digest leave the cache; the others are reported.
 */
export function exportBundle(dir, root = projectRoot) {
  const target = resolve(dir);
  const inside = (parent) => target === parent || target.startsWith(parent + sep);
  // The bundle holds the makers' documents, and the repository never carries them.
  if (inside(projectRoot) && !inside(DOCUMENT_CACHE)) throw new Error(`${dir} is inside the repository; a bundle of the makers' documents is kept outside it`);
  mkdirSync(target, { recursive: true });
  const sources = new Map(registered(root).map((s) => [s.SourceID, s]));
  const rows = [], copied = new Set(), kept = new Set(), missing = [];
  for (const entry of manifest(root)) {
    if (entry.Bytes !== 'present') { if (entry.Bytes !== 'not-recorded') missing.push(entry); continue; }
    const from = join(DOCUMENT_CACHE, entry.File);
    const file = `${entry.SHA256}.${extensionOf(head(from))}`;
    const to = join(target, file);
    // Two sources can be one document; it is one file in the bundle, named in the manifest once for each.
    if (!copied.has(file) && !kept.has(file)) {
      if (existsSync(to) && sha256(readFileSync(to)) === entry.SHA256) kept.add(file);
      else { copyFileSync(from, `${to}.tmp`); renameSync(`${to}.tmp`, to); copied.add(file); }
    }
    const s = sources.get(entry.SourceID);
    rows.push({ SourceID: entry.SourceID, SHA256: entry.SHA256, File: file, Size: String(statSync(to).size), URL: s.URL, 'Access date': s['Access date'], 'Access state': s['Access state'] });
  }
  rows.sort((a, b) => a.SourceID.localeCompare(b.SourceID));
  writeFileSync(join(target, 'manifest.csv'), csvText(BUNDLE, rows));
  return { sources: rows.length, files: copied.size + kept.size, copied: copied.size, kept: kept.size, missing };
}

/** A file's first bytes, which say what it is. */
function head(path) {
  const fd = openSync(path, 'r');
  try { const buffer = Buffer.alloc(5); return buffer.subarray(0, readSync(fd, buffer, 0, 5, 0)); } finally { closeSync(fd); }
}

/**
 * Bring a bundle's bytes back into the cache: every file in `dir` whose bytes hash to a registered digest is stored
 * under that digest, whatever its name. A file that hashes to nothing registered is not a source and is left out, and
 * so is one named for a digest it does not hash to. Returns what was restored, what was already there, what was left
 * out and why, and every registered digest the cache still lacks, by SourceID.
 */
export function restoreBundle(dir, root = projectRoot) {
  const sources = registered(root);
  const wanted = new Map();
  for (const s of sources) {
    const sha = String(s.SHA256 ?? '').toLowerCase();
    if (DIGEST.test(sha)) wanted.set(sha, [...(wanted.get(sha) ?? []), s.SourceID]);
  }
  const restored = [], already = [], refused = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (name.startsWith('.') || name === 'manifest.csv' || !statSync(path).isFile()) continue;
    const bytes = readFileSync(path);
    const sha = sha256(bytes);
    const claimed = /^([0-9a-f]{64})\./.exec(name)?.[1];
    if (!wanted.has(sha)) {
      refused.push({ file: name, sha, why: claimed && claimed !== sha ? `named for ${claimed} but hashes to ${sha}` : 'hashes to no registered source' });
      continue;
    }
    (storeBytes(bytes).stored ? restored : already).push({ file: name, sha, sources: wanted.get(sha) });
  }
  const absent = manifest(root).filter((m) => m.Bytes === 'absent' || m.Bytes === 'mismatch');
  return { restored, already, refused, absent };
}

const ACTION = 'restore it from a bundle that holds it; a document fetched again is a new retrieval, recorded as one, not this source';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] ?? '' : null; };
  const count = (list, key) => list.reduce((m, x) => m.set(x[key], (m.get(x[key]) ?? 0) + 1), new Map());
  const say = (m) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', ');
  if (at('manifest') !== null) {
    const rows = manifest();
    process.stdout.write(csvText(['SourceID', 'SHA256', 'Bytes', 'Text', 'File'], rows));
    console.error(`${rows.length} registered source(s). Bytes: ${say(count(rows, 'Bytes'))}. Text: ${say(count(rows, 'Text'))}.`);
  } else if (at('export')) {
    const r = exportBundle(at('export'));
    console.log(`${r.sources} source(s) in ${r.files} file(s) -> ${at('export')} (${r.copied} copied, ${r.kept} already there), manifest.csv beside them`);
    if (r.missing.length) console.log(`${r.missing.length} registered source(s) with no verified bytes to export: ${say(count(r.missing, 'Bytes'))} (npm run data:sources -- --manifest lists them)`);
  } else if (at('restore')) {
    const r = restoreBundle(at('restore'));
    console.log(`${r.restored.length} document(s) restored into the cache, ${r.already.length} already there, ${r.refused.length} file(s) left out`);
    for (const x of r.refused) console.log(`  - ${x.file}: ${x.why}`);
    if (r.absent.length) {
      console.log(`${r.absent.length} registered source(s) still without their bytes; for each, ${ACTION}:`);
      for (const m of r.absent) console.log(`  ${m.SourceID}  ${m.SHA256}${m.Bytes === 'mismatch' ? '  (the cached copy hashes to something else)' : ''}`);
    }
  } else {
    console.error('usage: npm run data:sources -- --manifest | --export <dir> | --restore <dir>');
    process.exit(2);
  }
}
