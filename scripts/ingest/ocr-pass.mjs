#!/usr/bin/env node
// A second reading of chosen pages, optical, kept beside the text layer rather than over it. (Reader round, 2026-10-04.)
//
// ingest:ocr rewrites a document's cached text from an ocrmypdf copy, which is right for a scan and wrong for a page
// whose text layer is mostly sound: the optical text replaces the layer's, mistakes and all, and nothing remains to
// compare. This pass leaves .cache/text/<sha>.json alone and writes .cache/ocr-text/<sha>.json: the same page shape
// (lines of spans in PDF points, y up, so pageLines, columnPositions and numberOnPage read it unchanged), with the
// tool, resolution and page-segmentation modes it was made with. A person or a guard decides which reading a value
// is bound to; nothing here makes that choice for them, and nothing here touches data/.
//
//   npm run ingest:ocr-pass -- --sha <sha> [--pages 1,3-4]    named pages of one document (all pages when none named)
//   npm run ingest:ocr-pass -- --docs list.csv [--flagged]    documents in a CSV with a sha column; --flagged keeps the
//                                                             pages ingest:quality flagged (empty, glyph, letters, garble)
//   ... --threshold [230]                                     binarise the page before recognition (light-grey text on a
//                                                             white page, the Recreus sheet); the cut-off is a grey level
//   ... --refresh                                             read pages again; otherwise a page already read is kept
//
// Each page is rendered at 300 dpi (grey) to .cache/pages/<sha>/o-<N>.png, which a reviewer reads a value against, and
// recognised twice by tesseract, with page segmentation 6 (one uniform block: a table's rows stay rows) and 4 (a
// column of text of variable sizes). The reading kept as the page's is the one with more numeric tokens, then the one
// with the higher mean word confidence, then 6; the other is kept as `alt`, so a number only one of them read is
// still there to be found.

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readCsv } from '../../build/src/csv.js';
import { cacheDir, pageLines, squeezed } from '../lib/pdf-text.mjs';
import { docQuality, isBroken } from '../lib/text-quality.mjs';
import { documentPath } from './extract.mjs';

const run = promisify(execFile);
export const TOOL = 'tesseract 5.5.3';
export const DPI = 300;
export const MODES = [6, 4];
const WORKERS = 4;
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);
const SHA = /^[0-9a-f]{64}$/;

/** The rows of tesseract's tsv output: { level, block, par, line, word, left, top, width, height, conf, text }. */
export function parseTsv(tsv) {
  const rows = [];
  for (const raw of String(tsv).split('\n').slice(1)) {
    const f = raw.replace(/\r$/, '').split('\t');
    if (f.length < 12) continue;
    rows.push({ level: +f[0], block: +f[2], par: +f[3], line: +f[4], word: +f[5], left: +f[6], top: +f[7], width: +f[8], height: +f[9], conf: +f[10], text: f.slice(11).join('\t') });
  }
  return rows;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/**
 * Word boxes as the spans the cache holds: { x, y, w, str } in PDF points, x from the left, y up from the page's
 * bottom edge. pdf.js reports a span at its baseline; tesseract boxes the word, whose bottom is the baseline plus any
 * descender. The words of one recognised line share one baseline, the median of their bottoms, so a "g" or a "y" does
 * not lift its word out of its row when pageLines groups by rounded y.
 */
export function tsvToSpans(tsv, { dpi = DPI, pageHeightPt, minConf = 0 } = {}) {
  const scale = 72 / dpi;
  const words = parseTsv(tsv).filter((r) => r.level === 5 && r.text.trim() && r.conf >= minConf);
  const rows = new Map();
  for (const w of words) {
    const key = `${w.block}.${w.par}.${w.line}`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(w);
  }
  const spans = [];
  for (const row of rows.values()) {
    const baseline = median(row.map((w) => w.top + w.height));
    const y = pageHeightPt - baseline * scale;
    for (const w of row) spans.push({ x: w.left * scale, y, w: w.width * scale, str: w.text.trim() });
  }
  return spans;
}

const numericTokens = (lines) => lines.reduce((n, l) => n + l.text.split(/\s+/).filter((t) => /^[-+<>~]?\d[\d.,]*%?$/.test(t)).length, 0);

/** One page's reading from one tsv: { lines, squeezed, psm, numeric, confidence }. */
export function readingFromTsv(tsv, psm, geometry) {
  const spans = tsvToSpans(tsv, geometry);
  const lines = pageLines(spans);
  const conf = parseTsv(tsv).filter((r) => r.level === 5 && r.text.trim() && r.conf >= 0).map((r) => r.conf);
  return { psm, lines, squeezed: squeezed(spans), numeric: numericTokens(lines), confidence: conf.length ? Number((conf.reduce((a, b) => a + b, 0) / conf.length).toFixed(1)) : 0 };
}

/** Of the readings of one page, the one kept as its text (the rule in the header above); the rest become `alt`. */
export function chooseReading(readings) {
  const ranked = [...readings].sort((a, b) => b.numeric - a.numeric || b.confidence - a.confidence || MODES.indexOf(a.psm) - MODES.indexOf(b.psm));
  const [best, ...others] = ranked;
  return { psm: best.psm, lines: best.lines, squeezed: best.squeezed, confidence: best.confidence, alt: others.map(({ psm, lines, squeezed: sq, confidence }) => ({ psm, lines, squeezed: sq, confidence })) };
}

/** A page's height in points from its PNG: the IHDR chunk holds pixel width and height. */
export function pngSize(bytes) { return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; }

/** A binary PGM ("P5") thresholded at a grey level: darker becomes black, the rest white. */
export function thresholdPgm(bytes, cut = 230) {
  const text = bytes.subarray(0, 40).toString('latin1');
  const m = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(text);
  if (!m) throw new Error('not a binary PGM');
  const out = Buffer.from(bytes);
  for (let i = m[0].length; i < out.length; i++) out[i] = out[i] > cut ? 255 : 0;
  return out;
}

const textPath = (sha) => cacheDir('ocr-text', `${sha}.json`);
const readExisting = (sha) => (existsSync(textPath(sha)) ? JSON.parse(readFileSync(textPath(sha), 'utf8')) : null);

async function recognise(image, psm) {
  const { stdout } = await run('tesseract', [image, '-', '--psm', String(psm), '-c', 'preserve_interword_spaces=1', 'tsv'], { maxBuffer: 64 * 1024 * 1024, env: { ...process.env, OMP_THREAD_LIMIT: '1' } });
  return stdout;
}

/** One page: render, recognise in each mode, choose. Returns the page entry of the sidecar. */
export async function ocrPage(source, sha, page, { threshold = null, refresh = false } = {}) {
  const dir = cacheDir('pages', sha);
  mkdirSync(dir, { recursive: true });
  const png = join(dir, `o-${page}.png`);
  if (refresh || !existsSync(png)) await run('pdftoppm', ['-png', '-r', String(DPI), '-gray', '-f', String(page), '-l', String(page), '-singlefile', source, join(dir, `o-${page}`)]);
  const { height } = pngSize(readFileSync(png));
  let image = png, scratch = null;
  if (threshold != null) {
    scratch = join(tmpdir(), `h2c-ocr-${process.pid}-${sha.slice(0, 8)}-${page}`);
    await run('pdftoppm', ['-r', String(DPI), '-gray', '-f', String(page), '-l', String(page), '-singlefile', source, scratch]);
    writeFileSync(`${scratch}.pgm`, thresholdPgm(readFileSync(`${scratch}.pgm`), threshold));
    image = `${scratch}.pgm`;
  }
  try {
    const readings = [];
    for (const psm of MODES) readings.push(readingFromTsv(await recognise(image, psm), psm, { pageHeightPt: (height * 72) / DPI }));
    return { page, ...chooseReading(readings), ...(threshold != null ? { threshold } : {}) };
  } finally {
    if (scratch) rmSync(`${scratch}.pgm`, { force: true });
  }
}

function writeSidecar(sha, pages) {
  mkdirSync(cacheDir('ocr-text'), { recursive: true });
  const tmp = `${textPath(sha)}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ sha, tool: TOOL, dpi: DPI, psm: MODES, date: new Date().toISOString().slice(0, 10), pages: pages.sort((a, b) => a.page - b.page) }));
  renameSync(tmp, textPath(sha));
}

/** "1,3-5" as [1,3,4,5]. */
export const pageList = (spec) => [...new Set(String(spec).split(',').flatMap((part) => {
  const [a, b = a] = part.split('-').map(Number);
  return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
}))];

/** Which pages of a document to read: the ones named, the ones quality flagged, or all of them. */
function pagesFor(sha, text) {
  if (arg('pages')) return pageList(arg('pages')).filter((p) => p <= text.pages.length);
  if (flag('flagged')) {
    const quality = existsSync(cacheDir('quality', `${sha}.json`)) ? JSON.parse(readFileSync(cacheDir('quality', `${sha}.json`), 'utf8')) : docQuality(text);
    return quality.pages.filter(isBroken).map((p) => p.page);
  }
  return text.pages.map((p) => p.page);
}

if (process.argv[1]?.endsWith('ocr-pass.mjs')) {
  for (const tool of ['tesseract', 'pdftoppm']) {
    try { await run('which', [tool]); } catch { console.error(`${tool} is not installed: brew install tesseract poppler`); process.exit(2); }
  }
  const shas = arg('sha') ? [arg('sha')] : arg('docs') ? readCsv(arg('docs')).records.map((r) => r.values.sha ?? r.values.SHA256 ?? r.values.sha256) : [];
  if (!shas.length) { console.error('name what to read: --sha <sha> or --docs <csv with a sha column>'); process.exit(2); }
  const threshold = flag('threshold') ? Number(process.argv[process.argv.indexOf('--threshold') + 1]) || 230 : null;
  const tasks = [], sidecars = new Map(), started = Date.now();
  for (const sha of shas.filter((s) => SHA.test(s ?? ''))) {
    const textFile = cacheDir('text', `${sha}.json`);
    const source = documentPath(sha);
    if (!existsSync(textFile) || !source) { console.error(`${sha.slice(0, 12)}: the document or its text is not in the cache`); continue; }
    const text = JSON.parse(readFileSync(textFile, 'utf8'));
    const have = new Map((readExisting(sha)?.pages ?? []).map((p) => [p.page, p]));
    sidecars.set(sha, have);
    for (const page of pagesFor(sha, text)) if (flag('refresh') || !have.has(page)) tasks.push({ sha, source, page });
  }
  let next = 0, done = 0, failed = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const { sha, source, page } = tasks[next++];
      try {
        const entry = await ocrPage(source, sha, page, { threshold, refresh: flag('refresh') });
        sidecars.get(sha).set(page, entry);
        writeSidecar(sha, [...sidecars.get(sha).values()]);
        done++;
      } catch (e) { failed++; console.error(`${sha.slice(0, 12)} p${page}: ${String(e.message).slice(0, 120)}`); }
      process.stdout.write(`\r${done + failed} of ${tasks.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(WORKERS, tasks.length) }, worker));
  const seconds = (Date.now() - started) / 1000;
  console.log(`\n${done} page(s) read optically, ${failed} failed, ${seconds.toFixed(1)} s${done ? ` (${(seconds / done).toFixed(1)} s a page with ${Math.min(WORKERS, tasks.length)} workers)` : ''}`);
}
