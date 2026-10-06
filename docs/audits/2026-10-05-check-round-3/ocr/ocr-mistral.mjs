#!/usr/bin/env node
// Check round 3 (2026-10-05): an independent, image-based reading of the pages that hold the deciding values, by
// Mistral's OCR API, model mistral-ocr-latest only. A one-off check, not a workflow step. compare.mjs reads the output.
//
//   node docs/audits/2026-10-05-check-round-3/ocr/ocr-mistral.mjs <shas.csv|shas.txt> [--sha <hex>[,<hex>]] [--images]
//        [--dry-run] [--concurrency 4] [--max-docs N] [--out .cache/ocr-mistral] [--confidence word|page|off] [--keep-raw]
//
// - Input: SHA-256s (any 64-hex string found in the file, or --sha). Each is resolved to its original bytes with
//   locate(sha, sourceId) (sources.csv maps SourceID to SHA256). A PDF goes whole, as a base64 data URI in a
//   `document_url`; limits 50 MB and 1,000 pages (a document over either is skipped and reported). A web page (HTML) is
//   never sent: it is checked against its own tables elsewhere. --images renders each page (pdftoppm, 150 dpi PNG) and
//   sends it as an `image_url` data URI, page by page, for a document where the PDF route fails a positive control.
// - The key: MISTRAL_API_KEY, else the macOS Keychain item `h2c-mistral` (security find-generic-password -s h2c-mistral
//   -w). It is never printed, logged or written: every message that leaves this script has it redacted, and no request
//   header is ever echoed.
// - Output: .cache/ocr-mistral/<sha>.json
//     { sha, sourceIds, model (as returned), requestedModel: 'mistral-ocr-latest', date, route: 'pdf'|'images',
//       usage (as returned: usage_info { pages_processed, doc_size_bytes }; summed over pages for --images),
//       droppedParams, pages: [{ page (1-based; Mistral's index + 1), markdown, tables: [{ id, html }], header, footer,
//       confidence, lines }] }
//   `lines` is the markdown split into non-empty lines with each table placeholder replaced by the table's rows, cells
//   joined with ' | '. Written atomically (tmp + rename); a sha whose file exists is skipped, so a run resumes.
//
// The request (POST https://api.mistral.ai/v1/ocr), as the API documents it:
//   { model: 'mistral-ocr-latest', document: { type: 'document_url', document_url: 'data:application/pdf;base64,...' }
//     | { type: 'image_url', image_url: 'data:image/png;base64,...' }, table_format: 'html', include_image_base64: false,
//     extract_header: true, extract_footer: true, confidence_scores_granularity: 'word'|'page' }
// The response: { pages: [{ index (0-based), markdown (a table is a placeholder link "[tbl-0.html](tbl-0.html)"),
//   tables: [{ id, content, format }], header, footer, images, dimensions, confidence_scores? }], model,
//   usage_info: { pages_processed, doc_size_bytes } }.
// A parameter the API rejects as unknown (HTTP 422 naming it) is dropped, the request repeated, and the name recorded in
// `droppedParams` and logged: nothing is dropped silently.
// First live run (2026-10-05): the key's workspace answered every OCR request HTTP 429 with
// `x-ratelimit-limit-req-minute: 0` (and GET /v1/models, 200, lists no OCR capability): no request quota for the OCR
// endpoint on this plan. The script stops on that, as it does on 401/403, with a message naming the cause.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { locate, registered } from '../../../../scripts/data/source-store.mjs';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
import { htmlTableToGrid, gridLines } from './grid.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const ENDPOINT = 'https://api.mistral.ai/v1/ocr';
const MODEL = 'mistral-ocr-latest';
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 1000;
const USD_PER_1000_PAGES = 4;

// ---- the key -----------------------------------------------------------------------------------------------------
let KEY = null;
export function apiKey() {
  if (KEY) return KEY;
  KEY = process.env.MISTRAL_API_KEY?.trim() || null;
  if (!KEY) {
    try { KEY = execFileSync('security', ['find-generic-password', '-s', 'h2c-mistral', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { KEY = null; }
  }
  if (!KEY) throw new Error('No Mistral API key: set MISTRAL_API_KEY or add the Keychain item h2c-mistral (security add-generic-password -s h2c-mistral -a $USER -w).');
  return KEY;
}
/** Any text that leaves this script goes through here first. */
export const redact = (s) => { const t = String(s ?? ''); return KEY ? t.split(KEY).join('[REDACTED]').replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]') : t.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]'); };

class Fatal extends Error {}

// ---- the request -------------------------------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOcr(body, { attempts = 6 } = {}) {
  let last = null;
  for (let n = 0; n < attempts; n++) {
    let res;
    try {
      res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey()}` }, body: JSON.stringify(body) });
    } catch (e) { last = `network error: ${redact(e.message)}`; await sleep(2000 * 2 ** n); continue; }
    const text = await res.text();
    if (res.ok) return JSON.parse(text);
    last = `HTTP ${res.status}: ${redact(text).slice(0, 300)}`;
    if (res.status === 401 || res.status === 403) throw new Fatal(`The API refused the key (HTTP ${res.status}). Check the key in MISTRAL_API_KEY or the Keychain item h2c-mistral. Nothing more was sent.`);
    if (res.status === 429) {
      if (res.headers.get('x-ratelimit-limit-req-minute') === '0') throw new Fatal('HTTP 429 with x-ratelimit-limit-req-minute: 0. The key\'s workspace has no request quota for the OCR endpoint (the plan has not enabled it, or billing is off). Nothing more was sent; this is not retried.');
      const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** n;
      await sleep(Math.min(wait, 60000)); continue;
    }
    if (res.status >= 500) { await sleep(2000 * 2 ** n); continue; }
    const err = new Error(last); err.status = res.status; err.body = text; throw err; // 4xx other than the above: the caller decides
  }
  throw new Error(`gave up after ${attempts} attempts; last: ${last}`);
}

const OPTIONAL = ['extract_header', 'extract_footer', 'confidence_scores_granularity'];

/** One document (or one page image), with the optional parameters dropped one at a time if the API names them unknown. */
async function request(document, options, dropped) {
  const body = { model: MODEL, document, table_format: 'html', include_image_base64: false };
  if (options.confidence !== 'off') body.confidence_scores_granularity = options.confidence;
  body.extract_header = true; body.extract_footer = true;
  for (const d of dropped) delete body[d];
  for (;;) {
    try { return await callOcr(body); } catch (e) {
      if (e.status !== 422) throw e;
      const name = OPTIONAL.find((p) => p in body && e.body.includes(p));
      if (!name) throw new Error(`HTTP 422: ${redact(e.body).slice(0, 400)}`);
      delete body[name]; dropped.add(name);
      console.log(`  the API rejected "${name}"; dropped and repeated (recorded in droppedParams)`);
    }
  }
}

// ---- the response, as stored -------------------------------------------------------------------------------------
const PLACEHOLDER = /\[(tbl-\d+\.(?:html|md))\]\(\1\)/g;

/** A page of the response as stored; `offset` is the page number of Mistral's index 0 (1 for a whole document). */
export function storedPage(p, offset = 1) {
  const tables = (p.tables ?? []).map((t) => ({ id: t.id, html: t.content ?? t.html ?? '', format: t.format }));
  const byId = new Map(tables.map((t) => [t.id, t]));
  const lines = [];
  for (const raw of String(p.markdown ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (PLACEHOLDER.test(line)) {
      PLACEHOLDER.lastIndex = 0;
      const before = line.replace(PLACEHOLDER, '').trim();
      if (before) lines.push(before);
      for (const m of line.matchAll(PLACEHOLDER)) {
        const t = byId.get(m[1]);
        if (!t) { lines.push(m[0]); continue; }
        if (/<table/i.test(t.html)) lines.push(...gridLines(htmlTableToGrid(t.html)));
        else lines.push(...t.html.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
      }
      continue;
    }
    PLACEHOLDER.lastIndex = 0;
    lines.push(line);
  }
  return {
    page: (p.index ?? 0) + offset, markdown: p.markdown ?? '', tables: tables.map(({ id, html }) => ({ id, html })),
    header: p.header ?? null, footer: p.footer ?? null, confidence: confidenceOf(p.confidence_scores ?? p.confidence ?? null), lines,
  };
}

/** The page confidence as stored: the page-level figures, and the words below 0.95 (all of them would be the page again). */
function confidenceOf(c) {
  if (c == null) return null;
  if (typeof c === 'number') return { average: c };
  const words = c.word_confidence_scores ?? c.words ?? null;
  return {
    average: c.average_page_confidence_score ?? c.average ?? null,
    minimum: c.minimum_page_confidence_score ?? c.minimum ?? null,
    lowWords: Array.isArray(words) ? words.filter((w) => w.confidence < 0.95).map((w) => ({ text: w.text, confidence: w.confidence })) : null,
    raw: Array.isArray(words) ? undefined : c,
  };
}

// ---- documents -------------------------------------------------------------------------------------------------
function pageCount(sha, bytes) {
  const cached = cachedText(sha);
  if (cached?.pages?.length) return cached.pages.length;
  return (Buffer.from(bytes).toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length || null;
}

function renderPages(path) {
  try { execFileSync('which', ['pdftoppm'], { stdio: 'ignore' }); } catch { throw new Error('--images needs pdftoppm (brew install poppler); it is not installed.'); }
  const dir = mkdtempSync(join(tmpdir(), 'h2c-ocr-'));
  execFileSync('pdftoppm', ['-r', '150', '-png', path, join(dir, 'p')], { stdio: 'ignore' });
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  return { dir, files: files.map((f) => join(dir, f)) };
}

async function readDocument(job, options) {
  const bytes = readFileSync(job.path);
  const dropped = new Set(options.dropped);
  let pages = [], usage = null, model = null;
  if (!options.images) {
    const res = await request({ type: 'document_url', document_url: `data:application/pdf;base64,${bytes.toString('base64')}` }, options, dropped);
    pages = (res.pages ?? []).map((p) => storedPage(p, 1)); usage = res.usage_info ?? res.usage ?? null; model = res.model;
    if (options.keepRaw) writeAtomic(join(options.out, 'raw', `${job.sha}.json`), res);
  } else {
    const { dir, files } = renderPages(job.path);
    try {
      let sum = 0, size = 0;
      for (const [i, f] of files.entries()) {
        const res = await request({ type: 'image_url', image_url: `data:image/png;base64,${readFileSync(f).toString('base64')}` }, options, dropped);
        const p = res.pages?.[0]; if (p) pages.push(storedPage({ ...p, index: i }, 1));
        sum += (res.usage_info ?? res.usage)?.pages_processed ?? 1; size += (res.usage_info ?? res.usage)?.doc_size_bytes ?? 0; model = res.model;
      }
      usage = { pages_processed: sum, doc_size_bytes: size };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  return { sha: job.sha, sourceIds: job.sourceIds, model, requestedModel: MODEL, date: new Date().toISOString(), route: options.images ? 'images' : 'pdf', usage, droppedParams: [...dropped], pages };
}

function writeAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data));
  renameSync(tmp, path);
}

// ---- the run ---------------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { file: null, shas: [], images: false, dryRun: false, concurrency: 4, maxDocs: Infinity, out: join(root, '.cache/ocr-mistral'), confidence: 'word', keepRaw: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sha') o.shas.push(...argv[++i].split(','));
    else if (a === '--images') o.images = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--keep-raw') o.keepRaw = true;
    else if (a === '--concurrency') o.concurrency = Number(argv[++i]);
    else if (a === '--max-docs') o.maxDocs = Number(argv[++i]);
    else if (a === '--out') o.out = join(root, argv[++i]);
    else if (a === '--confidence') o.confidence = argv[++i];
    else if (!a.startsWith('--')) o.file = a;
    else throw new Error(`unknown option ${a}`);
  }
  if (!['word', 'page', 'off'].includes(o.confidence)) throw new Error('--confidence is word, page or off');
  return o;
}

export async function main(argv) {
  const options = parseArgs(argv);
  const shas = new Set(options.shas);
  if (options.file) for (const m of readFileSync(options.file, 'utf8').matchAll(/\b[0-9a-f]{64}\b/g)) shas.add(m[0]);
  const idsBySha = new Map();
  for (const s of registered()) if (s.SHA256) idsBySha.set(s.SHA256, [...(idsBySha.get(s.SHA256) ?? []), s.SourceID]);
  const jobs = [], skipped = [];
  for (const sha of shas) {
    const sourceIds = idsBySha.get(sha) ?? [];
    if (existsSync(join(options.out, `${sha}.json`))) { skipped.push([sha, 'already read']); continue; }
    const where = locate(sha, sourceIds[0] ?? '');
    if (where.bytes !== 'present') { skipped.push([sha, `bytes ${where.bytes}`]); continue; }
    const bytes = readFileSync(where.path);
    if (Buffer.from(bytes).subarray(0, 5).toString('latin1') !== '%PDF-') { skipped.push([sha, 'HTML: not sent']); continue; }
    if (bytes.length > MAX_BYTES) { skipped.push([sha, `over 50 MB (${bytes.length})`]); continue; }
    const pages = pageCount(sha, bytes);
    if (pages && pages > MAX_PAGES) { skipped.push([sha, `over ${MAX_PAGES} pages (${pages})`]); continue; }
    jobs.push({ sha, sourceIds, path: where.path, bytes: bytes.length, pages });
  }
  const todo = jobs.slice(0, options.maxDocs);
  const reasons = {}; for (const [, r] of skipped) reasons[r.replace(/\(.*/, '').trim()] = (reasons[r.replace(/\(.*/, '').trim()] ?? 0) + 1;
  console.log(`${shas.size} sha(s): ${todo.length} to send, ${skipped.length} skipped ${JSON.stringify(reasons)}${jobs.length > todo.length ? `, ${jobs.length - todo.length} held back by --max-docs` : ''}`);
  const planned = todo.reduce((a, j) => a + (j.pages ?? 1), 0);
  console.log(`route ${options.images ? 'images' : 'pdf'}; ${planned} page(s) planned, about $${(planned * USD_PER_1000_PAGES / 1000).toFixed(3)} at $${USD_PER_1000_PAGES} per 1,000 pages`);
  if (options.dryRun) { for (const j of todo) console.log(`  would send ${j.sha.slice(0, 12)} ${j.sourceIds[0] ?? ''} ${j.pages ?? '?'} page(s) ${j.bytes} bytes`); return; }
  if (!todo.length) return;
  apiKey(); // fail early, before anything is sent
  const totals = { documents: 0, pages: 0, failed: 0 };
  let next = 0, stop = null;
  const worker = async () => {
    while (!stop) {
      const job = todo[next++]; if (!job) return;
      const t0 = Date.now();
      try {
        const doc = await readDocument(job, { ...options, dropped: [] });
        writeAtomic(join(options.out, `${job.sha}.json`), doc);
        const n = doc.usage?.pages_processed ?? doc.pages.length;
        totals.documents++; totals.pages += n;
        console.log(`${job.sha.slice(0, 12)} ${job.sourceIds[0] ?? ''}: ${doc.pages.length} page(s), ${job.bytes} bytes, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      } catch (e) {
        if (e instanceof Fatal) { stop = e; return; }
        totals.failed++; console.log(`${job.sha.slice(0, 12)} ${job.sourceIds[0] ?? ''}: FAILED ${redact(e.message)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker));
  console.log(`documents ${totals.documents}, pages processed ${totals.pages}, failed ${totals.failed}, estimated cost $${(totals.pages * USD_PER_1000_PAGES / 1000).toFixed(3)}`);
  if (stop) { console.error(redact(stop.message)); process.exitCode = 2; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((e) => { console.error(redact(e.message)); process.exitCode = 1; });
}
