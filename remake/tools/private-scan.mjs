#!/usr/bin/env node
// The private-material scan (pack 02 section 10; must-not-change S11-13 and S06-21; untested-rules question 4).
//
// The repository and the published site carry digests, URLs, locators and short whole-value quotes. Makers' document bytes,
// their text, OCR output, working packets and the owner's machine paths stay in the private store. This tool looks at a
// BUILT SITE (a directory, or a zip of one) and FAILS when it finds any of:
//   cache-path       a path inside a .cache folder, or the text ".cache/" in a file
//   workspace-path   a .workspace folder, private.sqlite, workspace.sqlite
//   database-file    a .sqlite, .sqlite3, .db file, or any file that starts with the SQLite header
//   source-original  a .pdf file or a file that starts with %PDF-, a file named by a 64-hex digest, a by-sha folder, or a
//                    saved copy of a web page ("saved from url=")
//   packet-name      a file or folder named for a working packet (packet, PACKETS.md, proposals, readings, audits, ocr, ...)
//   ocr-field        a quoted JSON key of the text cache or the optical sidecar (squeezed, textLayer, ocrText, psm, ...)
//   private-name     an H2C_ variable name such as H2C_SOURCE_BACKUP
//   absolute-path    /Users/<name>/, C:\Users\, /home/runner/work/
//   extension        a file whose extension is not on the allow-list (html, css, js, json, svg, png, woff2, txt, ico, map)
//   archive          a zip inside the site, or a file that starts like a zip under another name
//   symlink, unreadable, too-large, zip-error, unsafe-name, empty
//                    a thing the scan cannot look at is a failure, never a pass
// A finding names the file, the rule and a count. It never prints the matched text: the CI log of a public repository is
// public, and the match is the very thing that must not be published.
//
//   node remake/tools/private-scan.mjs <site-dir | file.zip> [more ...]     exit 0 clean, 1 findings, 2 the scan did not run
//
// Used by preview-assemble.mjs (the end of `inject` and of `stage`), so the preview deploy fails closed. Node built-ins only:
// the deploy job installs nothing. Tri-state, as everywhere: OK, FAIL, NOT RUN. An empty site, a missing path and an
// unsupported zip are never OK.
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

/** Extensions a published site may hold, lower case with the dot. Anything else is a finding. */
export const ALLOWED_EXTENSIONS = ['.html', '.css', '.js', '.json', '.svg', '.png', '.woff2', '.txt', '.ico', '.map'];
/**
 * Files allowed by name although their extension is not on the list, wherever they sit (the site root, or previous/<release>/).
 * Each is something the preview workflow publishes on purpose: pages.yml publishes the validation report beside the page, and
 * the preview adds .nojekyll. A new name here is a review decision.
 */
export const ALLOWED_NAMES = ['validation-report.md', '.nojekyll'];
/** Text types whose content is searched. The other allowed types are binary: png, woff2 and ico are checked by name and header only. */
const BINARY_EXTENSIONS = new Set(['.png', '.woff2', '.ico']);
/** What each binary type starts with. A file with the extension and another start is searched as text and reported. */
const BINARY_SIGNATURES = { '.png': [[0x89, 0x50, 0x4e, 0x47]], '.woff2': [[0x77, 0x4f, 0x46, 0x32]], '.ico': [[0, 0, 1, 0], [0, 0, 2, 0]] };
const isBinaryOfItsKind = (bytes, ext) => (BINARY_SIGNATURES[ext] ?? []).some((sig) => sig.every((v, i) => bytes[i] === v));

/** A file bigger than this cannot be searched in memory here, which is a failure and not a skip. */
export const MAX_FILE_BYTES = 256 * 1024 * 1024;
/** What one zip entry may inflate to; a zip bomb is a finding. */
export const MAX_ENTRY_BYTES = 256 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 200_000;

const PACKET_SEGMENT = /^(?:packets?|proposals|readings|audits|ocr(?:-text)?)(?![a-z])/i;
const FORBIDDEN_SEGMENTS = new Map([
  ['.cache', 'cache-path'], ['.workspace', 'workspace-path'], ['by-sha', 'source-original'],
  ['packet', 'packet-name'], ['packets', 'packet-name'], ['proposals', 'packet-name'], ['readings', 'packet-name'],
  ['audits', 'packet-name'], ['ocr', 'packet-name'], ['ocr-text', 'packet-name'], ['.git', 'workspace-path'], ['.github', 'workspace-path'],
]);

const CONTENT_RULES = [
  // JS minified by a bundler writes `a.cache/2`; a path is preceded by a separator, a quote or a space, never by a name.
  { rule: 'cache-path', note: '".cache/" path text', re: /(?<![\w$)\]])\.cache[\\/]/g },
  { rule: 'workspace-path', note: 'a workspace file name', re: /(?<![\w$)\]-])\.workspace[\\/]|\b(?:private|workspace)\.sqlite3?\b/g },
  { rule: 'private-name', note: 'an H2C_ variable name', re: /\bH2C_[A-Z][A-Z0-9_]*\b/g },
  { rule: 'absolute-path', note: 'an absolute path on a machine', re: /\\?\/Users\\?\/[^\s"'<>\/\\]+|[A-Za-z]:\\+Users\\+[^\s"'<>\/\\]+|\/home\/runner\/work\//g },
  // Quoted keys only: the words are common in prose ("squeezed") and in bundled code (contextLayer, pageText).
  { rule: 'ocr-field', note: 'a text-cache or OCR key', re: /\\?"(?:squeezed|textLayer|text_layer|ocrText|ocr_text|ocrLines|ocr_lines|ocrPages|ocr_pages|psm)\\?"\s*:|\\?"ocr\\?"\s*:\s*\{/g },
  { rule: 'packet-name', note: 'a working packet file name', re: /\bPACKETS\.(?:md|csv)\b|\bledger\.fetch-journal\b/g },
  { rule: 'source-original', note: 'a saved copy of a web page', re: /saved from url=/gi },
];

// A PDF header may follow a few bytes of junk (a viewer accepts one in the first kilobyte), so it is looked for there.
// A PDF or a database carried as base64 text inside a data file (the start of the encoding, aligned at offset 0).
const ENCODED_RULES = [
  { rule: 'source-original', note: 'a PDF carried as base64 text', re: /JVBERi0/g },
  { rule: 'database-file', note: 'a SQLite database carried as base64 text', re: /U1FMaXRlIGZvcm1hdCAz/g },
];

const MAGIC = [
  { rule: 'source-original', note: 'a PDF', test: (b) => b.subarray(0, 1024).includes('%PDF-', 0, 'latin1') },
  { rule: 'database-file', note: 'a SQLite database', test: (b) => b.length >= 16 && b.toString('latin1', 0, 16) === 'SQLite format 3\0' },
  { rule: 'archive', note: 'a zip', test: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6) },
];

const SHA_NAMED = /^[0-9a-f]{64}(\.|$)/;

/** One finding: where, which rule, how many times, and a note on what kind of thing it is. The matched text is never kept. */
const finding = (path, rule, note, count = 1) => ({ path, rule, note, count });

/** Findings from a path alone: its folders, its name and its extension. `path` uses '/'. */
export function checkPath(path, { allowNames = ALLOWED_NAMES } = {}) {
  const found = [];
  const parts = path.split('/').filter(Boolean);
  const name = parts.at(-1) ?? '';
  for (const part of parts) {
    const rule = FORBIDDEN_SEGMENTS.get(part.toLowerCase());
    if (rule) found.push(finding(path, rule, `a path segment named ${part}`));
  }
  // A folder named for a packet or a round's working files, however it is numbered or dated (packet-02, proposals-2026).
  for (const part of parts.slice(0, -1)) if (PACKET_SEGMENT.test(part) && !FORBIDDEN_SEGMENTS.has(part.toLowerCase())) found.push(finding(path, 'packet-name', `a folder named ${part}`));
  const lower = name.toLowerCase();
  if (parts.some((part) => /(?:^|[^a-z])packets?(?:[^a-z]|$)/i.test(part))) found.push(finding(path, 'packet-name', 'a name that says packet'));
  if (/^(private|workspace)\.sqlite3?$/.test(lower)) found.push(finding(path, 'workspace-path', 'a workspace database'));
  if (SHA_NAMED.test(lower)) found.push(finding(path, 'source-original', 'a file named by a document digest'));
  const ext = extname(lower);
  if (/^\.(sqlite3?|db|db-wal|db-shm|db-journal)$/.test(ext) || /-journal$/.test(lower)) found.push(finding(path, 'database-file', `a ${ext || 'journal'} file`));
  if (ext === '.pdf') found.push(finding(path, 'source-original', 'a PDF'));
  if (ext === '.zip') found.push(finding(path, 'archive', 'a zip inside the site'));
  if (!ALLOWED_EXTENSIONS.includes(ext) && !allowNames.includes(name)) {
    found.push(finding(path, 'extension', ext ? `extension ${ext} is not on the allow-list` : 'no extension, and not an allowed name'));
  }
  if (parts.some((p) => p === '..') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) found.push(finding(path, 'unsafe-name', 'a path that leaves the site'));
  return found;
}

/** Findings from a file's bytes: its header, then (for text types) its content. `ext` is the lower-case extension. */
export function checkContent(path, bytes, ext) {
  const found = [];
  for (const m of MAGIC) {
    if (!m.test(bytes)) continue;
    // A zip under a name that is not .zip, and a PDF or database under any name, are findings; checkPath reports the honest names.
    if (m.rule === 'archive' && ext === '.zip') continue;
    if (m.rule === 'source-original' && ext === '.pdf') continue;
    if (m.rule === 'database-file' && /^\.(sqlite3?|db)$/.test(ext)) continue;
    found.push(finding(path, m.rule, `the file starts like ${m.note}`));
  }
  if (BINARY_EXTENSIONS.has(ext)) {
    if (isBinaryOfItsKind(bytes, ext)) return found;
    found.push(finding(path, 'extension', `the content is not a ${ext} file; it is searched as text`));
  }
  // Latin-1 reads every byte as one character, which finds ASCII text however the bytes around it are meant. A file with NUL
  // bytes may be UTF-16 (a PowerShell redirect writes it): it is searched as UTF-16 in both byte orders as well.
  const views = [bytes.toString('latin1')];
  if (bytes.includes(0)) views.push(bytes.toString('utf16le'), bytes.subarray(1).toString('utf16le'));
  const counts = new Map();
  for (const text of views) {
    for (const { rule, note, re } of CONTENT_RULES.concat(ENCODED_RULES)) {
      re.lastIndex = 0;
      let n = 0;
      while (re.exec(text) !== null) { n++; if (n >= 99_999) break; }
      if (n) counts.set(rule + '\0' + note, Math.max(n, counts.get(rule + '\0' + note) ?? 0));
    }
  }
  for (const [k, n] of counts) { const [rule, note] = k.split('\0'); found.push(finding(path, rule, note, n)); }
  return found;
}

/** Every file under `dir` as { path, size }, with symbolic links and things that are not files reported as findings. */
function listTree(dir, skip) {
  const files = [];
  const found = [];
  const walk = (d) => {
    let names;
    try { names = readdirSync(d); } catch (e) { found.push(finding(relative(dir, d).split(sep).join('/') || '.', 'unreadable', `the folder cannot be read (${e.code ?? e.message})`)); return; }
    for (const name of names.sort()) {
      const p = join(d, name);
      const rel = relative(dir, p).split(sep).join('/');
      if (skip(rel)) continue;
      let st;
      try { st = lstatSync(p); } catch (e) { found.push(finding(rel, 'unreadable', `cannot be examined (${e.code ?? e.message})`)); continue; }
      if (st.isSymbolicLink()) found.push(finding(rel, 'symlink', 'a symbolic link; the scan does not follow it'));
      else if (st.isDirectory()) { found.push(...checkPath(`${rel}/x`).filter((f) => f.rule !== 'extension' && f.rule !== 'archive' && f.rule !== 'source-original' && f.rule !== 'database-file').map((f) => ({ ...f, path: rel }))); walk(p); }
      else if (st.isFile()) files.push({ path: rel, file: p, size: st.size });
      else found.push(finding(rel, 'unreadable', 'not a regular file'));
    }
  };
  walk(dir);
  return { files, found };
}

/** One result object: { source, files, textFiles, findings }. */
const emptyResult = (source) => ({ source, files: 0, textFiles: 0, findings: [] });

/**
 * Scan a built site folder. `skip(relPath)` leaves a path out (the preview repo's own .git); `allowNames` replaces
 * ALLOWED_NAMES; `allowPaths` lists exact relative paths allowed whatever their extension (the preview repo's README.md).
 */
export function scanTree(dir, { skip = () => false, allowNames = ALLOWED_NAMES, allowPaths = [] } = {}) {
  const result = emptyResult(dir);
  let st;
  try { st = lstatSync(dir); } catch (e) { throw new Error(`private-scan: cannot examine ${dir} (${e.code ?? e.message})`); }
  if (!st.isDirectory()) throw new Error(`private-scan: ${dir} is not a folder`);
  const { files, found } = listTree(dir, skip);
  result.findings.push(...found);
  for (const { path, file, size } of files) {
    result.files++;
    const ext = extname(path).toLowerCase();
    const pathFindings = checkPath(path, { allowNames }).filter((f) => !(f.rule === 'extension' && allowPaths.includes(path)));
    result.findings.push(...pathFindings);
    if (size > MAX_FILE_BYTES) { result.findings.push(finding(path, 'too-large', `${size} bytes is over the ${MAX_FILE_BYTES} the scan reads`)); continue; }
    let bytes;
    try { bytes = readFileSync(file); } catch (e) { result.findings.push(finding(path, 'unreadable', `cannot be read (${e.code ?? e.message})`)); continue; }
    if (!BINARY_EXTENSIONS.has(ext)) result.textFiles++;
    result.findings.push(...checkContent(path, bytes, ext));
  }
  if (result.files === 0) result.findings.push(finding('.', 'empty', 'the site holds no file; an empty scan is never a pass'));
  return result;
}

// ---- zip --------------------------------------------------------------------------------------------------------------
// A small reader for what `zip -r` and actions/upload-artifact make: stored and deflated entries, no encryption, no zip64.
// Anything else is a finding: a scan that skipped an entry would pass what it could not see.

const u16 = (b, o) => b.readUInt16LE(o);
const u32 = (b, o) => b.readUInt32LE(o);

function zipEntries(buf) {
  const lowest = Math.max(0, buf.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = buf.length - 22; i >= lowest; i--) if (u32(buf, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('no end-of-central-directory record: not a zip, or truncated');
  const count = u16(buf, eocd + 10);
  const size = u32(buf, eocd + 12);
  const offset = u32(buf, eocd + 16);
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff) throw new Error('a zip64 archive; this scan reads plain zips only');
  if (count > MAX_ZIP_ENTRIES) throw new Error(`${count} entries is over the ${MAX_ZIP_ENTRIES} the scan reads`);
  const entries = [];
  let p = offset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || u32(buf, p) !== 0x02014b50) throw new Error('the central directory is damaged');
    const flags = u16(buf, p + 8), method = u16(buf, p + 10), csize = u32(buf, p + 20), usize = u32(buf, p + 24);
    const nameLen = u16(buf, p + 28), extraLen = u16(buf, p + 30), commentLen = u16(buf, p + 32);
    const external = u32(buf, p + 38), local = u32(buf, p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, flags, method, csize, usize, external, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  // The record's count is only a claim: unpackers read on to the end of the directory, so the directory must end where the record says.
  if (p !== offset + size) throw new Error('the central directory does not end where the end record says; entries may be hidden past its count');
  return entries;
}

/** One entry's bytes, or a string saying why it cannot be read. */
function zipBytes(buf, e) {
  if (e.flags & 1) return 'encrypted';
  if (e.usize > MAX_ENTRY_BYTES) return `inflates to ${e.usize} bytes, over the ${MAX_ENTRY_BYTES} the scan reads`;
  if (e.local + 30 > buf.length || u32(buf, e.local) !== 0x04034b50) return 'its local header is damaged';
  const start = e.local + 30 + u16(buf, e.local + 26) + u16(buf, e.local + 28);
  const data = buf.subarray(start, start + e.csize);
  if (data.length !== e.csize) return 'its data is cut short';
  if (e.method === 0) return data;
  if (e.method === 8) {
    try { return inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }); } catch (err) { return `does not inflate (${err.code ?? err.message})`; }
  }
  return `uses compression method ${e.method}, which the scan does not read`;
}

/** Scan a zip file as it would be unpacked: every entry by name, and every entry's content. Same options as scanTree. */
export function scanZip(file, { allowNames = ALLOWED_NAMES, allowPaths = [] } = {}) {
  const result = emptyResult(file);
  let buf;
  try { buf = readFileSync(file); } catch (e) { throw new Error(`private-scan: cannot read ${file} (${e.code ?? e.message})`); }
  let entries;
  try { entries = zipEntries(buf); } catch (e) { result.findings.push(finding(basename(file), 'zip-error', e.message)); return result; }
  for (const e of entries) {
    const name = e.name.replaceAll('\\', '/');
    const path = name.replace(/\/$/, '');
    if (!path) continue;
    if (name.endsWith('/')) {
      result.findings.push(...checkPath(`${path}/x`).filter((f) => ['cache-path', 'workspace-path', 'packet-name', 'unsafe-name'].includes(f.rule)).map((f) => ({ ...f, path })));
      continue;
    }
    result.files++;
    if (((e.external >>> 16) & 0xf000) === 0xa000) { result.findings.push(finding(path, 'symlink', 'a symbolic link entry')); continue; }
    result.findings.push(...checkPath(path, { allowNames }).filter((f) => !(f.rule === 'extension' && allowPaths.includes(path))));
    const bytes = zipBytes(buf, e);
    if (typeof bytes === 'string') { result.findings.push(finding(path, 'zip-error', bytes)); continue; }
    const ext = extname(path).toLowerCase();
    if (!BINARY_EXTENSIONS.has(ext)) result.textFiles++;
    result.findings.push(...checkContent(path, bytes, ext));
  }
  if (result.files === 0) result.findings.push(finding('.', 'empty', 'the zip holds no file; an empty scan is never a pass'));
  return result;
}

/** A folder or a zip, by what is there. */
export function scanPath(path, options = {}) {
  let st;
  try { st = lstatSync(path); } catch (e) { throw new Error(`private-scan: ${path} does not exist (${e.code ?? e.message})`); }
  if (st.isSymbolicLink()) throw new Error(`private-scan: ${path} is a symbolic link; name the real folder`);
  return st.isDirectory() ? scanTree(path, options) : scanZip(path, options);
}

/** The lines that say what was found: file, rule, count, kind. Never the matched text. */
export function describe(result, limit = 40) {
  const lines = result.findings.slice(0, limit).map((f) => `  ${f.rule}: ${f.path}${f.count > 1 ? ` (${f.count} times)` : ''}: ${f.note}`);
  if (result.findings.length > limit) lines.push(`  ... and ${result.findings.length - limit} more`);
  return lines;
}

/** Throws, with the findings listed, unless the scan is clean. `what` starts the message. */
export function assertClean(result, what = 'the site') {
  if (result.findings.length === 0) return result;
  const rules = [...new Set(result.findings.map((f) => f.rule))].join(', ');
  throw new Error(`private-scan: ${what} holds private material or something the scan cannot vouch for (${result.findings.length} finding(s): ${rules}); refusing to publish it\n${describe(result).join('\n')}`);
}

// Not wp-lib's isMain: that compares the real module path with argv[1] as typed, so a run through a symbolic link (a macOS
// /tmp is one) would run nothing and exit 0. Here the real paths are compared, and a run that prints neither OK nor FAIL cannot happen.
const ranDirectly = (() => { try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (ranDirectly) {
  const paths = process.argv.slice(2);
  if (paths.length === 0 || paths.some((p) => p.startsWith('-'))) {
    console.error('private-scan: NOT RUN. usage: private-scan.mjs <site-folder | file.zip> [more ...]');
    process.exit(2);
  }
  let failed = false;
  try {
    for (const p of paths) {
      const r = scanPath(p);
      if (r.findings.length) {
        failed = true;
        console.error(`private-scan: FAIL ${p}: ${r.findings.length} finding(s) in ${r.files} file(s)`);
        for (const l of describe(r)) console.error(l);
      } else console.log(`private-scan: OK ${p}: ${r.files} file(s), ${r.textFiles} searched as text, nothing private found`);
    }
  } catch (e) {
    console.error(`private-scan: NOT RUN. ${e.message}`);
    process.exit(2);
  }
  process.exit(failed ? 1 : 0);
}
