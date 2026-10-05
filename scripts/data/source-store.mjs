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
//   npm run data:sources -- --manifest          every registered source and ledger document: its digest, whether its bytes are in the
//                                                cache and hash to it, and whether its text is cached (CSV on stdout)
//   npm run data:sources -- --export <dir> --derived       the present, verified bytes to <dir>/<sha256>.<ext>, and
//                                                <dir>/manifest.csv saying which source each is and where it came from
//   npm run data:sources -- --restore <dir>      bytes back into the cache, only those that hash to a registered or ledger
//                                                digest; then every digest still absent, by SourceID
//
// Nothing here fetches. A document fetched again is a new retrieval to be read and recorded as one, never a way to
// fill a hole in the evidence for a decision already made: bytes that do not hash to the recorded digest are not that
// source, whatever their name says. --derived preserves what was made from them too: the text, the optical reading and
// its text, the reading-order view, the text-quality flags, the reviewed page images, and the page images and packets
// the page readers worked from (readings/<run>/<SourceID>/). An export also writes index.csv, one row per source a
// person can search by maker, title or product, and README.md, which says what each folder holds and how to restore.

import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, lstatSync, realpathSync, readFileSync, readSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../build/src/csv.js';
import { LEDGER, LEDGER_REL, DOCUMENT_CACHE, SOURCES_BY_ID, SOURCES_BY_SHA, TEXT_CACHE, projectRoot } from '../ingest/context.mjs';
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
 * One row per registered source or ledger-only document: its digest, whether the cache holds its bytes and they hash to it (present, absent,
 * mismatch, or not-recorded where the source records no digest), and whether its text is cached by the current reader
 * (cached, stale where an older reader wrote it, absent).
 */
export function inventory(root = projectRoot) {
  const sources = registered(root).map((s) => ({ ...s, Registered: 'TRUE', doc_key: '', 'Ledger status': '' }));
  const ledger = root === projectRoot ? LEDGER : join(root, LEDGER_REL);
  if (!existsSync(ledger)) return sources;
  const rows = readCsv(ledger).records.map((r) => r.values);
  for (const r of rows) {
    if (!DIGEST.test(r.sha256 ?? '')) continue;
    const matches = sources.filter((s) => s.SHA256 === r.sha256);
    if (matches.length) {
      for (const s of matches) { s.doc_key = [s.doc_key, r.doc_key].filter(Boolean).join('; '); s['Ledger status'] = [s['Ledger status'], r.status].filter(Boolean).join('; '); }
    } else sources.push({ SourceID: r.registered_source_id ?? '', SHA256: r.sha256, URL: r.url, 'Access date': r.checked, 'Access state': r.access_status, Registered: 'FALSE', doc_key: r.doc_key, 'Ledger status': r.status });
  }
  return sources;
}

export function manifest(root = projectRoot) {
  return inventory(root).map((s) => {
    const sha = String(s.SHA256 ?? '').toLowerCase();
    if (!DIGEST.test(sha)) return { SourceID: s.SourceID, Registered: s.Registered, doc_key: s.doc_key, 'Ledger status': s['Ledger status'], SHA256: s.SHA256 ?? '', Bytes: 'not-recorded', Text: 'not-recorded', File: '' };
    const found = locate(sha, s.SourceID);
    const text = cachedText(sha) ? 'cached' : existsSync(join(TEXT_CACHE, `${sha}.json`)) ? 'stale' : 'absent';
    return { SourceID: s.SourceID, Registered: s.Registered, doc_key: s.doc_key, 'Ledger status': s['Ledger status'], SHA256: sha, Bytes: found.bytes, Text: text, File: found.bytes === 'present' ? inCache(found.path) : '' };
  });
}

const BUNDLE = ['SourceID', 'Registered', 'doc_key', 'Ledger status', 'SHA256', 'File', 'Size', 'URL', 'Access date', 'Access state'];

/**
 * Copy every present, verified document to `dir` as <sha256>.<ext>, with manifest.csv naming, for each file, the
 * sources recorded from it, the URL and date it was retrieved from, and its size. A file already there and whole is
 * kept. Only bytes that hash to their source's digest leave the cache; the others are reported.
 */
export function exportBundle(dir, root = projectRoot, { derived = false } = {}) {
  const target = resolve(dir);
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const physical = realpathSync(ancestor);
  const inside = (parent) => target === parent || target.startsWith(parent + sep);
  // The bundle holds the makers' documents, and the repository never carries them.
  if (inside(resolve(root)) || inside(projectRoot) || [resolve(root), projectRoot].some((r) => physical === r || physical.startsWith(r + sep))) throw new Error(`${dir} is inside the repository; a bundle of the makers' documents is kept outside it`);
  mkdirSync(target, { recursive: true });
  const sources = inventory(root);
  const idsBySha = new Map();
  for (const s of sources) if (s.SourceID) idsBySha.set(String(s.SHA256 ?? '').toLowerCase(), [...(idsBySha.get(String(s.SHA256 ?? '').toLowerCase()) ?? []), s.SourceID]);
  const derivedRows = [], derivedSeen = new Set();
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
    const s = sources.find((s) => s.SourceID === entry.SourceID && s.SHA256 === entry.SHA256);
    rows.push({ SourceID: entry.SourceID, Registered: entry.Registered, doc_key: entry.doc_key, 'Ledger status': entry['Ledger status'], SHA256: entry.SHA256, File: file, Size: String(statSync(to).size), URL: s.URL, 'Access date': s['Access date'], 'Access state': s['Access state'] });
    if (derived && !derivedSeen.has(entry.SHA256)) {
      derivedSeen.add(entry.SHA256);
      for (const file of derivedFiles(entry.SHA256, idsBySha.get(entry.SHA256) ?? [])) {
        const from = join(DOCUMENT_CACHE, file), to = join(target, file);
        const hash = sha256(readFileSync(from));
        copyWhole(from, to, hash);
        derivedRows.push({ 'Document SHA256': entry.SHA256, File: file, SHA256: hash, Size: String(statSync(from).size) });
      }
    }
  }
  rows.sort((a, b) => a.SourceID.localeCompare(b.SourceID));
  writeFileSync(join(target, 'manifest.csv.tmp'), csvText(BUNDLE, rows));
  renameSync(join(target, 'manifest.csv.tmp'), join(target, 'manifest.csv'));
  if (derived) {
    writeFileSync(join(target, 'derived-manifest.csv.tmp'), csvText(['Document SHA256', 'File', 'SHA256', 'Size'], derivedRows));
    renameSync(join(target, 'derived-manifest.csv.tmp'), join(target, 'derived-manifest.csv'));
  }
  writeIndex(target, root, rows, derivedRows);
  return { sources: rows.length, files: copied.size + kept.size, copied: copied.size, kept: kept.size, derived: derivedRows.length, missing };
}

/** A file's first bytes, which say what it is. */
function head(path) {
  const fd = openSync(path, 'r');
  try { const buffer = Buffer.alloc(5); return buffer.subarray(0, readSync(fd, buffer, 0, 5, 0)); } finally { closeSync(fd); }
}

/**
 * Bring a bundle's bytes back into the cache: every file in `dir` whose bytes hash to a registered or ledger digest is stored
 * under that digest, whatever its name. A file that hashes to no inventory digest is not a source and is left out, and
 * so is one named for a digest it does not hash to. Returns what was restored, what was already there, what was left
 * out and why, and every inventory digest the cache still lacks, by SourceID.
 */
export function restoreBundle(dir, root = projectRoot) {
  const sources = inventory(root);
  const wanted = new Map();
  for (const s of sources) {
    const sha = String(s.SHA256 ?? '').toLowerCase();
    if (DIGEST.test(sha)) wanted.set(sha, [...(wanted.get(sha) ?? []), s.SourceID]);
  }
  const restored = [], already = [], refused = [], verified = new Set(), derivedRestored = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (name.startsWith('.') || ['manifest.csv', 'derived-manifest.csv', 'index.csv', 'README.md'].includes(name) || !lstatSync(path).isFile()) continue;
    const bytes = readFileSync(path);
    const sha = sha256(bytes);
    const claimed = /^([0-9a-f]{64})\./.exec(name)?.[1];
    if (!wanted.has(sha) || (claimed && claimed !== sha)) {
      refused.push({ file: name, sha, why: claimed && claimed !== sha ? `named for ${claimed} but hashes to ${sha}` : 'hashes to no source-register or ledger digest' });
      continue;
    }
    verified.add(sha);
    (storeBytes(bytes).stored ? restored : already).push({ file: name, sha, sources: wanted.get(sha) });
  }
  const derivedManifest = join(dir, 'derived-manifest.csv');
  if (existsSync(derivedManifest)) for (const { values: r } of readCsv(derivedManifest).records) {
    const doc = r['Document SHA256'];
    const leaf = r.File?.split('/').at(-1);
    const reading = /^readings\/(r1|r1l|r1u)\/([A-Za-z0-9_.-]+)\/[A-Za-z0-9_.-]+$/.exec(r.File ?? '');
    const safe = DIGEST.test(doc ?? '') && !['.', '..'].includes(leaf) && (
      [`text/${doc}.json`, `ocr/${doc}.pdf`, `ocr-text/${doc}.json`, `layout/${doc}.json`, `quality/${doc}.json`].includes(r.File) ||
      new RegExp(`^pages/${doc}/[A-Za-z0-9_.-]+$`).test(r.File) ||
      Boolean(reading && (wanted.get(doc) ?? []).includes(reading[2])));
    if (!safe || !verified.has(doc)) { refused.push({ file: r.File, why: 'derived file has no verified document or an unsafe path' }); continue; }
    const from = join(dir, r.File);
    if (!existsSync(from) || !lstatSync(from).isFile() || !realpathSync(from).startsWith(realpathSync(dir) + sep) || sha256(readFileSync(from)) !== r.SHA256) { refused.push({ file: r.File, why: 'derived digest mismatch or file absent' }); continue; }
    copyWhole(from, join(DOCUMENT_CACHE, r.File), r.SHA256);
    derivedRestored.push(r.File);
  }
  const absent = manifest(root).filter((m) => m.Bytes === 'absent' || m.Bytes === 'mismatch');
  return { restored, already, refused, absent, derivedRestored };
}

// The page readers' runs (docs/audits/2026-10-04-reader-round): page images and packets, by SourceID.
const READING_RUNS = ['r1', 'r1l', 'r1u'];

/** Derived evidence is keyed to verified source bytes, with every file hashed independently. */
function derivedFiles(sha, sourceIds = []) {
  const files = [`text/${sha}.json`, `ocr/${sha}.pdf`, `ocr-text/${sha}.json`, `layout/${sha}.json`, `quality/${sha}.json`]
    .filter((f) => existsSync(join(DOCUMENT_CACHE, f)));
  const folder = (rel) => {
    const at = join(DOCUMENT_CACHE, rel);
    if (existsSync(at)) for (const name of readdirSync(at).sort()) if (statSync(join(at, name)).isFile()) files.push(`${rel}/${name}`);
  };
  folder(`pages/${sha}`);
  for (const run of READING_RUNS) for (const id of sourceIds) if (/^[A-Za-z0-9_.-]+$/.test(id)) folder(`readings/${run}/${id}`);
  return files;
}

/**
 * index.csv and README.md beside the bundle, for a person who opens the folder: one row per source with its maker,
 * title, the products it is recorded for and the files that hold it, so a document is found by name, not by digest.
 */
function writeIndex(target, root, rows, derivedRows) {
  const tables = join(root, 'data/tables');
  const read = (name) => (existsSync(join(tables, name)) ? readCsv(join(tables, name)).records.map((r) => r.values) : []);
  const source = new Map(read('sources.csv').map((s) => [s.SourceID, s]));
  const grade = new Map(read('grades.csv').map((g) => [g.GradeID, g]));
  const byDoc = new Map();
  for (const d of derivedRows) byDoc.set(d['Document SHA256'], [...(byDoc.get(d['Document SHA256']) ?? []), d.File]);
  const kinds = (sha, test) => [...new Set((byDoc.get(sha) ?? []).filter(test).map((f) => f.split('/').slice(0, -1).join('/') || f))].join('; ');
  const index = rows.map((r) => {
    const s = source.get(r.SourceID) ?? {};
    const ids = String(s['Applicable grades'] ?? '').match(/G\d{3}-(?:R)?\d+/g) ?? [];
    const files = byDoc.get(r.SHA256) ?? [];
    // A document the import ledger holds but the register does not (deferred, not a data sheet) is named by its address.
    const unregistered = !s.SourceID;
    const where = unregistered ? (() => { try { const u = new URL(r.URL); return `${u.hostname}${decodeURIComponent(u.pathname)}`; } catch { return r.URL ?? ''; } })() : '';
    return {
      Publisher: unregistered ? '(not in the register)' : s.Publisher ?? '', Title: unregistered ? where : s.Title ?? '', Revision: s.Revision ?? '', SourceID: r.SourceID,
      Products: ids.map((id) => `${id} ${grade.get(id)?.['Product name'] ?? ''}`.trim()).join('; '),
      Document: r.File,
      Text: files.find((f) => f.startsWith('text/')) ?? '',
      'Optical reading': [files.find((f) => f.startsWith('ocr/')), files.find((f) => f.startsWith('ocr-text/'))].filter(Boolean).join('; '),
      'Page images': kinds(r.SHA256, (f) => f.startsWith('pages/') || f.startsWith('readings/')),
      URL: r.URL, 'Access date': r['Access date'], 'In the register': r.Registered,
    };
  }).sort((a, b) => (a['In the register'] === 'TRUE' ? 0 : 1) - (b['In the register'] === 'TRUE' ? 0 : 1)
    || a.Publisher.localeCompare(b.Publisher) || a.Title.localeCompare(b.Title) || a.SourceID.localeCompare(b.SourceID));
  const columns = ['Publisher', 'Title', 'Revision', 'SourceID', 'Products', 'Document', 'Text', 'Optical reading', 'Page images', 'URL', 'Access date', 'In the register'];
  writeFileSync(join(target, 'index.csv.tmp'), csvText(columns, index));
  renameSync(join(target, 'index.csv.tmp'), join(target, 'index.csv'));
  const count = (prefix) => derivedRows.filter((d) => d.File.startsWith(prefix)).length;
  const readme = `# H2C source store

The makers' documents the H2C material database was built from, and what was made from them. The repository never
carries these files (they are the makers' documents); this folder is their private copy. Written by
\`npm run data:sources -- --export <this folder> --derived\` on ${new Date().toISOString().slice(0, 10)}.

## Finding a document

Open **index.csv** (any spreadsheet): one row per source, sorted by maker and title, with the products it is recorded for,
the file that is the document, and the files made from it. Search it by maker, product name or SourceID.

## What each file and folder holds

| Where | What | Files |
|---|---|---:|
| \`<digest>.pdf\`, \`<digest>.html\` | the documents as fetched, named by their SHA-256 (the digest \`data/tables/sources.csv\` records) | ${new Set(rows.map((r) => r.File)).size} |
| \`text/\` | the text read from each document, page by page | ${count('text/')} |
| \`ocr/\` | an optical-recognition copy of a document whose own text layer is missing or broken | ${count('ocr/')} |
| \`ocr-text/\` | the text that optical copy reads | ${count('ocr-text/')} |
| \`layout/\` | the reading-order view of each page | ${count('layout/')} |
| \`quality/\` | flags for pages whose text layer is broken | ${count('quality/')} |
| \`pages/<digest>/\` | page images a reviewer read | ${count('pages/')} |
| \`readings/<run>/<SourceID>/\` | the page images and packets the page readers worked from (the reader round, 2026-10-04) | ${count('readings/')} |
| \`manifest.csv\` | each document's digest, size, URL and access date, by SourceID | |
| \`derived-manifest.csv\` | each made-from file's own digest, so a damaged copy is refused on restore | |

## Restoring

\`npm run data:sources -- --restore <this folder>\` puts back into the repository's \`.cache/\` only files whose bytes hash
to a recorded digest; anything else is refused and named. Nothing here is ever fetched again in place of a lost file.
`;
  writeFileSync(join(target, 'README.md.tmp'), readme);
  renameSync(join(target, 'README.md.tmp'), join(target, 'README.md'));
}
function copyWhole(from, to, hash) {
  if (existsSync(to) && sha256(readFileSync(to)) === hash) return;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, `${to}.tmp`); renameSync(`${to}.tmp`, to);
}
/** The configured backup's age and present documents it does not hold whole. */
export function backupStatus(dir = process.env.H2C_SOURCE_BACKUP, root = projectRoot) {
  if (!dir) return { configured: false, missing: [], ageHours: null };
  const target = resolve(dir), path = join(target, 'manifest.csv');
  const entries = manifest(root).filter((m) => m.Bytes === 'present');
  const missing = [...new Set(entries.map((m) => m.SHA256))].filter((sha) =>
    !['pdf', 'html'].some((ext) => { const p = join(target, `${sha}.${ext}`); return existsSync(p) && sha256(readFileSync(p)) === sha; }));
  return { configured: true, missing, ageHours: existsSync(path) ? (Date.now() - statSync(path).mtimeMs) / 3600000 : null };
}

const ACTION = 'restore it from a bundle that holds it; a document fetched again is a new retrieval, recorded as one, not this source';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] ?? '' : null; };
  const count = (list, key) => list.reduce((m, x) => m.set(x[key], (m.get(x[key]) ?? 0) + 1), new Map());
  const say = (m) => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', ');
  if (at('manifest') !== null) {
    const rows = manifest();
    process.stdout.write(csvText(['SourceID', 'Registered', 'doc_key', 'Ledger status', 'SHA256', 'Bytes', 'Text', 'File'], rows));
    console.error(`${rows.length} source/ledger entry(s). Bytes: ${say(count(rows, 'Bytes'))}. Text: ${say(count(rows, 'Text'))}.`);
  } else if (at('export')) {
    const r = exportBundle(at('export'), projectRoot, { derived: process.argv.includes('--derived') });
    console.log(`${r.sources} source(s) in ${r.files} file(s) -> ${at('export')} (${r.copied} copied, ${r.kept} already there, ${r.derived} derived files), manifest.csv beside them`);
    if (r.missing.length) console.log(`${r.missing.length} inventory entry/entries with no verified bytes to export: ${say(count(r.missing, 'Bytes'))} (npm run data:sources -- --manifest lists them)`);
  } else if (at('restore')) {
    const r = restoreBundle(at('restore'));
    console.log(`${r.restored.length} document(s) restored into the cache, ${r.already.length} already there, ${r.refused.length} file(s) left out, ${r.derivedRestored.length} derived files restored`);
    for (const x of r.refused) console.log(`  - ${x.file}: ${x.why}`);
    if (r.absent.length) {
      console.log(`${r.absent.length} inventory entry/entries still without their bytes; for each, ${ACTION}:`);
      for (const m of r.absent) console.log(`  ${m.SourceID}  ${m.SHA256}${m.Bytes === 'mismatch' ? '  (the cached copy hashes to something else)' : ''}`);
    }
  } else {
    console.error('usage: npm run data:sources -- --manifest | --export <dir> | --restore <dir>');
    process.exit(2);
  }
}
