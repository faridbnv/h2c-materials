#!/usr/bin/env node
// Fetching the documents the ledger lists: the bytes, their digest, and where each one went.
//
// A document is its bytes. Everything downstream is keyed by SHA-256, so the same file served from a manufacturer
// and from a retailer is one document, read once; a file that changed is a different key, not a stale entry. The
// ledger records the digest, and a second copy of it becomes `duplicate-of` rather than a second source.
//
// Politeness is deliberate: two requests at a time per host, spaced, with a few retries on the statuses that mean
// "later". This walks 43 publishers' libraries, and none of them owes us their bandwidth.
//
//   npm run ingest:fetch -- --provider "3D-Fuel"     every document of one provider
//   npm run ingest:fetch -- --batch b06              every document assigned to a batch
//   npm run ingest:fetch -- --doc <doc_key>          one document
//   npm run ingest:fetch -- --provider X --limit 5   the first few, to see what a library serves
//   npm run ingest:fetch -- ... --refetch            fetch again even where a digest is recorded
//   npm run ingest:fetch -- --stage <file> --doc <doc_key>    a document the owner saved from a browser (R084)
//   npm run ingest:fetch -- --stage <folder> --provider X     a folder of them, each matched to its row by file name
//   npm run ingest:fetch -- --stage <folder> --provider X --recursive     a maker's whole library, subfolders and
//                                                            all: its data sheets are staged and the rest counted
//   ... --recursive --create --root-url <url of the folder>  and a data sheet no row carries gets a row of its own
//
// Writes .cache/sources/by-sha/<sha>.<ext> and updates the ledger. Nothing here touches data/.

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, relative, sep } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { sha256, cacheDir } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PER_HOST = 2;
const SPACING_MS = 500;
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * How a host serves a document. Most serve the file; some serve a viewer around it, and the adapter rewrites the
 * link to the file the viewer shows. A host that cannot be fetched at all says so, so the ledger records why
 * rather than a failure that looks like a network problem.
 */
export function adapter(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return { kind: 'invalid', reason: 'not a URL' }; }
  const host = parsed.hostname.replace(/^www\./, '');
  const drive = /drive\.google\.com$/.test(host) && /\/file\/d\/([^/]+)/.exec(parsed.pathname);
  if (drive) return { kind: 'pdf', host, url: `https://drive.google.com/uc?export=download&id=${drive[1]}` };
  // A SharePoint share link serves its viewer, whatever is asked of it. The file itself is behind the download
  // form, which takes the share token out of the link: "/:b:/g/<token>?e=..." becomes
  // "/_layouts/15/download.aspx?share=<token>", and that returns the bytes.
  if (/sharepoint\.com$/.test(host)) {
    const share = /\/:[a-z]:\/[a-z]\/([^/?]+)/i.exec(parsed.pathname);
    if (share) return { kind: 'pdf', host, url: `${parsed.origin}/_layouts/15/download.aspx?share=${share[1]}` };
    return { kind: 'pdf', host, url: url.includes('download=1') ? url : `${url}${url.includes('?') ? '&' : '?'}download=1` };
  }
  if (/^isanmate\.com$/.test(host)) return { kind: 'manual', host, reason: 'the library disallows fetching tools; save each sheet from a browser and stage it' };
  if (/\.pdf(\?|$)/i.test(parsed.pathname + parsed.search)) return { kind: 'pdf', host, url };
  return { kind: 'page', host, url };
}

async function get(url, { tries = 3 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: '*/*' }, redirect: 'follow' })
      .catch((e) => ({ ok: false, status: 0, statusText: e.message }));
    if (response.ok) return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers?.get('content-type') ?? '' };
    if (!RETRY_STATUS.has(response.status) || attempt === tries) return { error: `HTTP ${response.status || 0} ${response.statusText ?? ''}`.trim() };
    await sleep(attempt * 2000);
  }
  return { error: 'unreachable' };
}

/** One document: fetch, hash, store, and say what happened in the ledger's words. */
export async function fetchDocument(row, { digests, refetch = false }) {
  // A document already in the database is fetched again only to check it is still what it was: whatever comes
  // back, the ledger goes on saying it was applied, because it was.
  const entered = ['applied', 'registered'].includes(row.status);
  if (row.sha256 && !refetch) return { status: row.status === 'inventoried' ? 'fetched' : row.status, note: row.status_note };
  if (entered && !process.argv.includes('--recheck')) return { status: row.status, note: row.status_note };
  const how = adapter(row.url);
  if (how.kind === 'invalid' || how.kind === 'manual') return { status: how.kind === 'manual' ? 'needs-staging' : 'unreachable', note: how.reason };

  const got = await get(how.url);
  if (got.error) return { status: 'unreachable', note: `${got.error} on ${new Date().toISOString().slice(0, 10)}` };

  const isPdf = got.bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  if (how.kind === 'pdf' && !isPdf) {
    // A link that says .pdf and serves a page is a library that lost the file, or a consent wall.
    return { status: 'unreachable', note: `served ${got.type || 'something'} rather than a PDF` };
  }
  const sha = sha256(got.bytes);
  const twin = digests.get(sha);
  const extension = isPdf ? 'pdf' : 'html';
  const path = cacheDir('sources/by-sha', `${sha}.${extension}`);
  if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, got.bytes); }
  if (twin && twin !== row.doc_key) return { sha256: sha, status: 'duplicate-of', duplicate_of: twin, duplicate_kind: 'identical-sha', note: '' };
  digests.set(sha, row.doc_key);
  return { sha256: sha, status: isPdf ? 'fetched' : 'fetched-page', note: isPdf ? '' : `served ${got.type || 'a page'}; it is hashed as what was read` };
}

/**
 * A document the owner supplies is a document like any other: its bytes are hashed and cached where a fetched
 * one's are, the row gets the digest, and the note says the copy was staged, which is what the source row's
 * Access state (retrieved-copy) is later written from. What the pipeline never does is take anyone's word for
 * which document a file is: one file is staged against one named row, and a folder is matched by the file name
 * the maker's own URL carries (or, where that fails, by a product name that one row alone carries). A file that
 * matches nothing is listed, not guessed at. Everything downstream reads the bytes, so a staged document travels
 * the pipeline exactly as a fetched one does.
 */
export function stageDocument(row, bytes, name, { digests, date = new Date().toISOString().slice(0, 10) }) {
  const isPdf = bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const sha = sha256(bytes);
  const path = cacheDir('sources/by-sha', `${sha}.${isPdf ? 'pdf' : 'html'}`);
  if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); }
  const twin = digests.get(sha);
  if (twin && twin !== row.doc_key) {
    return { sha256: sha, status: 'duplicate-of', duplicate_of: twin, duplicate_kind: 'identical-sha', note: `staged copy: ${name}, hashed ${date}; the same bytes as ${twin}` };
  }
  digests.set(sha, row.doc_key);
  return { sha256: sha, status: isPdf ? 'fetched' : 'fetched-page', note: `staged copy: ${name}, hashed ${date} (R084)${isPdf ? '' : '; served as a page, hashed as what was read'}` };
}

/** The statuses a staged file may stand in for: nothing fetched, or fetched and found unreadable. */
const STAGEABLE = new Set(['needs-staging', 'gated', 'unreachable', 'inventoried', 'unreadable']);

/**
 * What a file in a maker's library is, by its name. A library holds far more than data sheets — safety sheets in
 * three languages, declarations, case studies, leaflets, spool drawings, the text of a web page — and only a data
 * sheet is staged. The rest is counted by kind so the report says what was passed over, and nothing is guessed:
 * a name that says neither is "other", and staying out is what "other" does.
 */
export function stageKind(name) {
  const n = String(name).normalize('NFKC');
  if (/(^|[\s_(.-])m?sds([\s_).-]|$)|safety[\s_-]*data|safety data sheet/i.test(n)) return 'safety-sheet';
  if (/(^|[\s_-])tds([\s_.-]|$)|technical[\s_-]*data|data[\s_-]?sheet/i.test(n)) return 'data-sheet';
  if (/statement|declaration|conformity|compliance|^ul94/i.test(n)) return 'declaration';
  if (/case[\s_-]*stud|\bCS\b|study report|et al\.?|biomechanics|prosthes|exoskeleton|antimicrobial|inactivator/i.test(n)) return 'case-study';
  if (/website text/i.test(n)) return 'website-text';
  if (/spool/i.test(n)) return 'spool';
  if (/leaflet|flyer|overview|brochure/i.test(n)) return 'leaflet';
  return 'other';
}

/**
 * The ledger row a staged file belongs to: named outright, or the one row whose URL carries the file's name.
 *
 * A file in a library also has a place in it. Where the caller passes the file's path inside the folder it
 * staged, the row whose URL ends in the most of that path is the file's: FormFutura files a "TDS - High Gloss
 * PLA.pdf" under High Gloss PLA and another under High Gloss PLA - ColorMorph, and the name alone cannot say
 * which row either is. Two rows that share as much of the path as each other are two rows, and a question.
 */
export function rowForStagedFile(name, candidates, { path } = {}) {
  const squash = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9]+/g, '');
  const segmentsOf = (url) => { try { return new URL(url).pathname.split('/').map((s) => decodeURIComponent(s)); } catch { return []; } };
  const fileNameOf = (url) => segmentsOf(url).pop() ?? '';
  const byUrl = candidates.filter((r) => squash(fileNameOf(r.url)) && squash(fileNameOf(r.url)) === squash(name));
  if (byUrl.length > 1 && path?.length > 1) {
    const shared = (r) => {
      const url = segmentsOf(r.url).map(squash), mine = path.map(squash);
      let n = 0;
      while (n < mine.length && n < url.length && mine[mine.length - 1 - n] === url[url.length - 1 - n]) n++;
      return n;
    };
    const best = Math.max(...byUrl.map(shared));
    const deepest = byUrl.filter((r) => shared(r) === best);
    if (deepest.length === 1 && best > 1) return { row: deepest[0], how: `the last ${best} parts of the path its URL carries` };
  }
  if (byUrl.length === 1) return { row: byUrl[0], how: 'the file name its URL carries' };
  if (byUrl.length > 1) return { why: `${byUrl.length} rows carry this file name in their URL` };
  // The longest product name the file name contains is the product: "ABSpro Flame Retardant" contains "ABSpro",
  // and a file named for the first is not the second. Two names of one length are two products, and a question.
  const byProduct = candidates.filter((r) => squash(r.product_raw).length >= 4 && squash(name).includes(squash(r.product_raw)))
    .sort((a, b) => squash(b.product_raw).length - squash(a.product_raw).length);
  const longest = byProduct.filter((r) => squash(r.product_raw).length === squash(byProduct[0]?.product_raw).length);
  if (longest.length === 1) return { row: longest[0], how: `the product name "${longest[0].product_raw}" in the file name` };
  return { why: byProduct.length ? `${longest.length} products' names fit the file name alike: ${longest.map((r) => r.product_raw).join(', ')}` : 'no row carries this file name in its URL, and no product name fits it' };
}

/**
 * A row for a data sheet the owner's copy of a library holds and the inventory never listed. It is built as
 * `harvest.mjs` builds the rows an index lists: keyed by its URL, which is the library's own address for the file
 * (the folder's URL and the file's path inside it), with where it was found as its discovery. The maker, the
 * brand and the language are the sibling rows' — the same library — and the product is the folder it is filed
 * under, which is how the library names it. Nothing here decides what the product is made of; the reader does.
 */
export function rowForUnlistedFile(path, { rootUrl, sibling, date }) {
  const url = `${rootUrl.replace(/\/+$/, '')}/${path.map((s) => encodeURIComponent(s)).join('/')}`;
  const folders = path.slice(0, -1).filter((f) => !/^(data\s*sheets?|datasheets?|declarations?|documents?)\b/i.test(f.trim()));
  const product = folders.at(-1) ?? path.at(-1).replace(/\.pdf$/i, '');
  return {
    doc_key: `url:${createHash('sha1').update(url).digest('hex').slice(0, 16)}`, sha256: '',
    provider: sibling.provider, provider_kind: sibling.provider_kind, brand: sibling.brand, manufacturer: sibling.manufacturer,
    product_raw: product, url, source_page_url: rootUrl, format: 'PDF', access_status: 'supplied by the owner from the maker’s library',
    language: sibling.language, mechanical_evidence: '', variants: '',
    discovery: `staged ${date} from the owner's copy of the maker's library (R084); the inventory did not list it`,
    registered_source_id: '', registered_by: '', duplicate_of: '', duplicate_kind: '', primary: 'TRUE',
    batch: '', status: 'inventoried', status_note: '', checked: date, updated: date,
  };
}

/** Every file under a folder, with its path inside it, skipping what a file system leaves behind. */
function filesUnder(root) {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const full = join(entry.parentPath ?? entry.path, entry.name);
    out.push({ full, path: relative(root, full).split(sep) });
  }
  return out.sort((a, b) => a.full.localeCompare(b.full));
}

/** Run with at most `PER_HOST` requests in flight per host, spaced, and any number of hosts at once. */
async function run(rows, digests, refetch) {
  const byHost = new Map();
  for (const row of rows) {
    const host = adapter(row.url).host ?? 'unknown';
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(row);
  }
  const done = [];
  await Promise.all([...byHost.values()].map(async (queue) => {
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(PER_HOST, queue.length) }, async () => {
      while (index < queue.length) {
        const row = queue[index++];
        const result = await fetchDocument(row, { digests, refetch });
        Object.assign(row, result.sha256 ? result : { status: result.status, status_note: result.note ?? '' });
        if (result.note !== undefined) row.status_note = result.note ?? '';
        row.updated = new Date().toISOString().slice(0, 10);
        done.push(row);
        process.stdout.write(`\r${done.length} of ${rows.length} fetched`);
        await sleep(SPACING_MS);
      }
    }));
  }));
  process.stdout.write('\n');
  return done;
}

if (process.argv[1]?.endsWith('fetch.mjs') && arg('stage')) {
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const staged = arg('stage'), doc = arg('doc'), provider = arg('provider');
  const folder = statSync(staged).isDirectory();
  const recursive = flag('recursive'), create = flag('create'), rootUrl = arg('root-url');
  if (!folder && !doc && !create) { console.error('one file is staged against one row: --stage <file> --doc <doc_key>'); process.exit(2); }
  if (folder && doc) { console.error('--doc names one row; a folder is matched by file name (--provider narrows it)'); process.exit(2); }
  if (create && (!provider || !rootUrl)) { console.error('--create needs --provider and --root-url: a new row is the maker\'s, at the address the library gives the file'); process.exit(2); }
  // A folder staged recursively is a library, and only its data sheets are documents to stage; a flat folder or a
  // single file is what the owner chose to save, and every file in it is staged as before.
  const files = !folder ? [{ full: staged, path: [basename(staged)] }]
    : recursive ? filesUnder(staged)
      : readdirSync(staged).filter((f) => !f.startsWith('.') && statSync(join(staged, f)).isFile()).map((f) => ({ full: join(staged, f), path: [f] }));
  const candidates = rows.filter((r) => (doc ? r.doc_key === doc : (!provider || r.provider === provider || r.manufacturer === provider) && !r.sha256 && STAGEABLE.has(r.status)));
  if (doc && !candidates.length) { console.error(`no ledger row is keyed ${doc}`); process.exit(2); }
  if (doc && candidates[0].sha256) { console.error(`${doc} is already hashed as ${candidates[0].sha256.slice(0, 12)} (${candidates[0].status}); a staged copy replaces nothing`); process.exit(2); }
  const sibling = provider && rows.find((r) => r.provider === provider);
  const digests = new Map(rows.filter((r) => r.sha256).map((r) => [r.sha256, r.doc_key]));
  const date = new Date().toISOString().slice(0, 10);
  const done = [], unmatched = [], known = [], passed = new Map(), created = [];
  const taken = new Set();
  for (const { full, path } of files) {
    const name = basename(full);
    if (recursive) {
      const kind = stageKind(name);
      if (kind !== 'data-sheet') { passed.set(kind, (passed.get(kind) ?? 0) + 1); continue; }
    }
    const bytes = readFileSync(full);
    // A file whose bytes the ledger already holds is that document: a second copy in another folder, or a
    // browser's second download, is not a second document and matches nothing.
    const already = digests.get(sha256(bytes));
    const pool = candidates.filter((r) => !taken.has(r.doc_key));
    let found = doc ? { row: candidates[0], how: '--doc' } : rowForStagedFile(name, pool, { path });
    // A row the file's own URL names is still that row's, even when the bytes turn out to repeat another document
    // (stageDocument then records it as a duplicate). A row found only by a product name is a weaker claim than
    // the bytes, and loses to them.
    const byItsUrl = found.row && /--doc|its URL carries/.test(found.how);
    if (already && !byItsUrl) { known.push(`${path.join('/')}: the same bytes as ${already}`); continue; }
    if (!found.row && create && !/rows carry|names fit/.test(found.why ?? '')) {
      const row = rowForUnlistedFile(path, { rootUrl, sibling, date });
      if (rows.some((r) => r.doc_key === row.doc_key)) { unmatched.push(`${path.join('/')}: a row keyed ${row.doc_key} exists and is not stageable`); continue; }
      rows.push(row);
      created.push(row.doc_key);
      found = { row, how: 'a new row: the inventory did not list it' };
    }
    if (!found.row) { unmatched.push(`${path.join('/')}: ${found.why}`); continue; }
    taken.add(found.row.doc_key);
    const result = stageDocument(found.row, bytes, path.join('/'), { digests, date });
    Object.assign(found.row, { sha256: result.sha256, status: result.status, status_note: result.note, updated: date,
      ...(result.duplicate_of ? { duplicate_of: result.duplicate_of, duplicate_kind: result.duplicate_kind } : {}) });
    done.push(`${found.row.doc_key}  ${found.row.provider} ${found.row.product_raw}  ->  ${result.status} (${found.how})`);
  }
  if (done.length) writeFileSync(LEDGER, csvText(HEADER, rows));
  console.log(`${done.length} document(s) staged (${created.length} of them new rows), ${known.length} file(s) already in the ledger, ${unmatched.length} file(s) matched no row`);
  if (passed.size) console.log(`not staged, not data sheets: ${[...passed].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  for (const line of done) console.log(`  ${line}`);
  for (const line of known) console.log(`  = ${line}`);
  for (const line of unmatched) console.log(`  ? ${line}`);
  const left = candidates.filter((r) => !taken.has(r.doc_key));
  if (folder && provider && left.length) console.log(`${left.length} row(s) of ${provider} waiting for bytes had no file here:\n${left.map((r) => `  - ${r.doc_key}  ${r.product_raw}`).join('\n')}`);
  console.log(done.length ? 'next: npm run ingest:extract -- --provider <maker>, then ingest:batch -- --propose' : '');
} else if (process.argv[1]?.endsWith('fetch.mjs')) {
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const provider = arg('provider'), batch = arg('batch'), doc = arg('doc'), limit = Number(arg('limit', '0'));
  const wanted = rows.filter((r) => (doc ? r.doc_key === doc : true)
    && (provider ? r.provider === provider || r.manufacturer === provider : true)
    && (batch ? r.batch === batch : true)
    && (flag('refetch') || !['fetched', 'fetched-page', 'duplicate-of', 'applied'].includes(r.status)));
  if (!provider && !batch && !doc) { console.error('name what to fetch: --provider, --batch or --doc'); process.exit(2); }
  const todo = limit ? wanted.slice(0, limit) : wanted;
  if (!todo.length) { console.log('nothing to fetch'); process.exit(0); }
  console.log(`${todo.length} document(s) to fetch, ${new Set(todo.map((r) => adapter(r.url).host)).size} host(s)`);

  const digests = new Map(rows.filter((r) => r.sha256).map((r) => [r.sha256, r.doc_key]));
  await run(todo, digests, flag('refetch'));
  writeFileSync(LEDGER, csvText(HEADER, rows));

  const counts = new Map();
  for (const r of todo) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  for (const [status, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${status}`);
  for (const r of todo.filter((r) => r.status === 'unreachable')) console.log(`        ${r.doc_key} ${r.product_raw}: ${r.status_note}`);
}
