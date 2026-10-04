#!/usr/bin/env node
// The reader round's packet: what a vision reader is handed for one document, and the batches that group documents.
//
//   npm run ingest:read-packet -- --docs docs/audits/2026-10-04-reader-round/DOCS.csv --tier 1 --round r1
//   npm run ingest:read-packet -- --docs <DOCS.csv> --only B-pla-cf-TDS,B-pc-TDS --round r1 --no-render   (no batches; --batches to make them)
//
// For each document, under <cache>/readings/<round>/<SourceID>/ (the document cache, scripts/ingest/context.mjs):
//
//   p-N.png       the page rendered at 200 dpi, gray (pdftoppm); a page already rendered is left alone
//   text.txt      the text, one line per row, each prefixed [pN], in reading order when scripts/lib/pdf-layout.mjs exists
//   held.json     every row the tables hold from this source: measurements, profiles, page_context, and its products
//   targets.json  the TARGETS.csv rows this document's products and materials open (what is missing)
//   doc.json      the DOCS.csv row and how the packet was made
//
// and under <cache>/readings/<round>/batches/: batch-NN.json (documents grouped by page count) and index.csv.
//
// The reader is a person or a model looking at the images; this script reads no value. Nothing here writes to data/
// or to the document cache's text, sources, ocr or pages folders.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { DOCUMENT_CACHE, projectRoot } from './context.mjs';
import { heldFor, loadDocument, loadTables, locate, targetsFor } from './read-common.mjs';

const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(`--${name}`);

/** Documents grouped for one reader: a tier at a time, at most `size` documents and about `pages` pages a batch. */
export function planBatches(docs, { size = 25, pages = 45 } = {}) {
  const ordered = [...docs].sort((a, b) => Number(a.Tier) - Number(b.Tier) || String(a.Publisher).localeCompare(String(b.Publisher)) || a.SourceID.localeCompare(b.SourceID));
  const batches = [];
  let current = null;
  for (const d of ordered) {
    const weight = Math.max(1, Number(d.Pages) || 0);
    if (current && (current.tier !== d.Tier || current.docs.length >= size || (current.pages + weight > pages))) current = null;
    if (!current) { current = { tier: d.Tier, docs: [], pages: 0 }; batches.push(current); }
    current.docs.push(d);
    current.pages += weight;
  }
  return batches;
}

const textLines = (doc) => {
  const out = [];
  for (const n of [...doc.pages.keys()].sort((a, b) => a - b)) {
    const p = doc.pages.get(n);
    const lines = doc.blockAvailable && p.block.length ? p.block : p.line;
    if (lines.length < 3 && p.ocr.length > lines.length) out.push(...p.ocr.map((t) => `[p${n} ocr] ${t}`));
    else if (lines.length > 400) out.push(...lines.slice(0, 400).map((t) => `[p${n}] ${t}`), `[p${n}] (${lines.length - 400} more lines not shown)`);
    else out.push(...lines.map((t) => `[p${n}] ${t}`));
    if (!lines.length && !p.ocr.length) out.push(`[p${n}] (no text on this page: read the image)`);
  }
  return out;
};

const run = (command, args) => new Promise((done) => {
  const child = spawn(command, args, { stdio: 'ignore' });
  child.on('error', () => done(false));
  child.on('close', (code) => done(code === 0));
});

async function pool(jobs, width) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    while (next < jobs.length) { const i = next++; results[i] = await jobs[i](); }
  }));
  return results;
}

async function main() {
  const docsPath = resolve(projectRoot, arg('docs', 'docs/audits/2026-10-04-reader-round/DOCS.csv'));
  const targetsPath = resolve(projectRoot, arg('targets', join(dirname(docsPath), 'TARGETS.csv')));
  const round = arg('round', 'r1');
  const tier = arg('tier');
  const only = arg('only')?.split(',');
  const size = Number(arg('batch-size', 25)), batchPages = Number(arg('batch-pages', 45)), dpi = Number(arg('dpi', 200));
  const render = !flag('no-render');
  const root = join(DOCUMENT_CACHE, 'readings', round);
  const started = performance.now();

  let docs = readCsv(docsPath).records.map((r) => r.values);
  if (tier) docs = docs.filter((d) => d.Tier === tier);
  if (only) docs = docs.filter((d) => only.includes(d.SourceID));
  const targets = existsSync(targetsPath) ? readCsv(targetsPath).records.map((r) => r.values) : [];
  const tables = loadTables();
  mkdirSync(join(root, 'batches'), { recursive: true });

  const stats = { docs: docs.length, pdfs: 0, pagesRendered: 0, pagesKept: 0, pagesFailed: 0, noText: 0, stale: 0, noBytes: 0 };
  const jobs = [];
  const entries = new Map();
  for (const d of docs) {
    const dir = join(root, d.SourceID);
    mkdirSync(dir, { recursive: true });
    const doc = await loadDocument({ sha: d.SHA256, sourceId: d.SourceID });
    const held = heldFor(tables, d.SourceID);
    const lines = textLines(doc);
    const note = doc.source === 'stale-cache' ? 'text cache written by an older extractor: layout may differ' : doc.source === 'none' ? 'no cached text and no document bytes in the cache' : doc.source === 'bytes' ? 'text read from the document bytes in memory (not cached)' : '';
    writeFileSync(join(dir, 'text.txt'), `# ${d.SourceID} | sha ${d.SHA256} | ${doc.kind} | ${doc.blockAvailable ? 'reading-order blocks' : 'line view'} | text from ${doc.source}${note ? ` (${note})` : ''}\n${lines.join('\n')}\n`);
    writeFileSync(join(dir, 'held.json'), `${JSON.stringify(held, null, 1)}\n`);
    writeFileSync(join(dir, 'targets.json'), `${JSON.stringify(targetsFor(targets, d), null, 1)}\n`);
    if (doc.source === 'stale-cache') stats.stale++;
    if (doc.source === 'none') stats.noText++;
    const located = d.SHA256 ? locate(d.SHA256, d.SourceID) : { bytes: 'absent' };
    if (located.bytes !== 'present') stats.noBytes++;
    const isPdf = located.bytes === 'present' && String(readFileSync(located.path).subarray(0, 5)) === '%PDF-';
    let pageCount = 0;
    if (isPdf) {
      stats.pdfs++;
      pageCount = Number(d.Pages) || doc.pages.size;
      if (!pageCount) { try { pageCount = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [located.path], { encoding: 'utf8' }))?.[1]) || 0; } catch { pageCount = 0; } }
    }
    const pngs = [];
    for (let n = 1; render && n <= pageCount; n++) {
      const png = join(dir, `p-${n}.png`);
      pngs.push(png);
      if (existsSync(png) && statSync(png).size > 0) { stats.pagesKept++; continue; }
      jobs.push(async () => {
        const ok = await run('pdftoppm', ['-r', String(dpi), '-gray', '-png', '-f', String(n), '-l', String(n), '-singlefile', located.path, join(dir, `p-${n}`)]);
        if (ok) stats.pagesRendered++; else stats.pagesFailed++;
        return ok;
      });
    }
    entries.set(d.SourceID, { row: d, dir, pngs: render ? pngs : [], held, textSource: doc.source, note, bytes: located.bytes });
    writeFileSync(join(dir, 'doc.json'), `${JSON.stringify({ ...d, packet: { round, dpi, textSource: doc.source, note, bytes: located.bytes, pages: pageCount || doc.pages.size, blockView: doc.blockAvailable, ocrSidecar: doc.ocrAvailable } }, null, 1)}\n`);
  }
  await pool(jobs, Number(arg('concurrency', 6)));

  // A run over a few documents (--only) is for looking at them: it leaves the round's batches as the full run made them.
  const batches = only && !flag('batches') ? [] : planBatches(docs, { size, pages: batchPages });
  const index = [];
  batches.forEach((b, i) => {
    const name = `batch-${String(i + 1).padStart(2, '0')}`;
    const manifest = {
      round, batch: name, tier: b.tier, pages: b.pages,
      output: join(root, 'out', `${name}.csv`),
      schema: join(dirname(docsPath), 'READING-SCHEMA.md'),
      prompt: join(dirname(docsPath), 'READER-PROMPT.md'),
      docs: b.docs.map((d) => {
        const e = entries.get(d.SourceID);
        return {
          SourceID: d.SourceID, dir: e.dir, kind: d.Kind, pages: Number(d.Pages) || 0, publisher: d.Publisher, title: d.Title, url: d.URL,
          images: e.pngs.filter((p) => existsSync(p)), text: join(e.dir, 'text.txt'), held: join(e.dir, 'held.json'), targets: join(e.dir, 'targets.json'),
          products: e.held.products, textSource: e.textSource, note: e.note,
        };
      }),
    };
    writeFileSync(join(root, 'batches', `${name}.json`), `${JSON.stringify(manifest, null, 1)}\n`);
    index.push({ batch: name, tier: b.tier, docs: b.docs.length, pages: b.pages, manifest: join(root, 'batches', `${name}.json`), output: manifest.output });
  });
  if (batches.length) writeFileSync(join(root, 'batches', 'index.csv'), csvText(['batch', 'tier', 'docs', 'pages', 'manifest', 'output'], index));
  mkdirSync(join(root, 'out'), { recursive: true });

  const seconds = (performance.now() - started) / 1000;
  let disk = '';
  try { disk = execFileSync('du', ['-sh', root], { encoding: 'utf8' }).split('\t')[0]; } catch { /* du is a convenience */ }
  const summary = { ...stats, batches: batches.length, seconds: Number(seconds.toFixed(1)), disk };
  if (batches.length) writeFileSync(join(root, `packet-${tier ? `tier${tier}` : 'all'}.json`), `${JSON.stringify(summary, null, 1)}\n`);
  console.log(JSON.stringify(summary));
}

if (process.argv[1]?.endsWith('read-packet.mjs')) await main();
