#!/usr/bin/env node
// Reading a document that has no text layer: a scan, and what the pipeline may do with one.
//
// A scanned sheet is bytes that say nothing to a reader of spans. ocrmypdf writes a text layer over the page
// images, and the result reads like any other document — except that every character came from a guess about a
// picture, and a guess is not a transcription. So:
//
//   - The hashed bytes are never touched. OCR runs on a copy, and the copy's text is cached under the original
//     document's digest, marked as an optical reading. The document is still its own bytes.
//   - Every row read from one is marked `ocr`, and apply.mjs refuses a batch that holds an OCR row nobody looked
//     at on the page image (APPLY-OCR-UNVERIFIED). This script renders those images.
//   - A page whose OCR finds nothing stays `needs-ocr` and says why, rather than becoming an empty reading.
//
//   npm run ingest:ocr -- --provider "Fiberlogy"      every scanned document of a provider
//   npm run ingest:ocr -- --doc <doc_key>
//   npm run ingest:ocr -- --all --limit 20
//   npm run ingest:ocr -- ... --refresh               read again, ignoring what is cached
//
// Writes .cache/text/<sha>.json (the optical reading), .cache/pages/<sha>/p<N>.png (what a reviewer reads) and
// .cache/ocr/<sha>.pdf (the copy with its text layer). Nothing here touches data/.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { cacheDir, documentText, sha256 } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';
import { documentPath } from './extract.mjs';

const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const MIN_CHARACTERS = 40;   // per page: below this a "text layer" is a header and a page number

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);
const has = (tool) => { try { execFileSync('which', [tool], { stdio: 'pipe' }); return true; } catch { return false; } };

/**
 * A copy of the document with a text layer over its page images. ocrmypdf is told to keep the pages as they are
 * (--force-ocr rasterises a page that already carries text, which is exactly what a scan with a stray label needs)
 * and to leave the original alone.
 */
export function ocrCopy(source, sha, { refresh = false, language = 'eng' } = {}) {
  const out = cacheDir('ocr', `${sha}.pdf`);
  if (!refresh && existsSync(out) && statSync(out).size > 0) return out;
  mkdirSync(cacheDir('ocr'), { recursive: true });
  execFileSync('ocrmypdf', ['--force-ocr', '--quiet', '--language', language, '--output-type', 'pdf', source, out], { stdio: 'pipe' });
  return out;
}

/** The page images a reviewer reads a row against, one per page, at a size that shows a decimal point. */
export function pageImages(source, sha, { refresh = false, dpi = 150 } = {}) {
  const dir = cacheDir('pages', sha);
  if (!refresh && existsSync(join(dir, 'p-1.png'))) return dir;
  mkdirSync(dir, { recursive: true });
  execFileSync('pdftoppm', ['-png', '-r', String(dpi), source, join(dir, 'p')], { stdio: 'pipe' });
  return dir;
}

const characters = (text) => text.pages.reduce((n, p) => n + p.lines.reduce((m, l) => m + l.text.trim().length, 0), 0);

if (process.argv[1]?.endsWith('ocr.mjs')) {
  for (const tool of ['ocrmypdf', 'pdftoppm']) {
    if (!has(tool)) { console.error(`${tool} is not installed: brew install ocrmypdf poppler`); process.exit(2); }
  }
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const provider = arg('provider'), doc = arg('doc'), limit = Number(arg('limit') ?? 0);
  if (!provider && !doc && !flag('all')) { console.error('name what to read: --provider, --doc or --all'); process.exit(2); }
  // A document already read optically is read again only when asked: --refresh re-runs the ones this run covers,
  // which is how a better OCR pass or another language reaches documents that already have a reading.
  const optical = (r) => /read optically/.test(r.status_note ?? '');
  let wanted = rows.filter((r) => (r.status === 'needs-ocr' || (flag('refresh') && optical(r))) && r.sha256
    && (provider ? r.provider === provider || r.manufacturer === provider : true)
    && (doc ? r.doc_key === doc : true));
  if (limit > 0) wanted = wanted.slice(0, limit);
  if (!wanted.length) { console.log('no scanned document to read'); process.exit(0); }

  let read = 0, empty = 0, failed = 0;
  for (const row of wanted) {
    const source = documentPath(row.sha256, row.registered_source_id);
    if (!source || !existsSync(source)) { row.status_note = 'the document is not in the cache; fetch it again'; failed++; continue; }
    try {
      const copy = ocrCopy(source, row.sha256, { refresh: flag('refresh') });
      // The digest of the copy is not the document's digest, and never becomes it: the text is cached under the
      // original, with the optical reading's own extractor string, so nothing mistakes it for a transcription.
      const text = await documentText(readFileSync(copy), { sha: row.sha256, refresh: true });
      const found = characters(text);
      // The cache says which reading this is. Nothing downstream may mistake an optical reading for a
      // transcription: apply.mjs refuses a row from one that nobody checked against the page image.
      writeFileSync(cacheDir('text', `${row.sha256}.json`), JSON.stringify({ ...text, ocr: { tool: 'ocrmypdf', copy: sha256(readFileSync(copy)), date: new Date().toISOString().slice(0, 10) } }));
      if (found < MIN_CHARACTERS * text.pages.length) {
        row.status_note = `optical reading found ${found} character(s) on ${text.pages.length} page(s): too little to read`;
        empty++;
      } else {
        pageImages(source, row.sha256, { refresh: flag('refresh') });
        row.status = 'extracted';
        row.status_note = `read optically (${found} characters); every value from it needs a person to read the page image`;
        row.updated = new Date().toISOString().slice(0, 10);
        read++;
      }
    } catch (e) {
      row.status_note = `optical reading failed: ${String(e.message).slice(0, 100)}`;
      failed++;
    }
    process.stdout.write(`\r${read + empty + failed} of ${wanted.length}`);
  }
  process.stdout.write('\n');
  writeFileSync(LEDGER, csvText(HEADER, rows));
  console.log(`  ${read} read optically`);
  if (empty) console.log(`  ${empty} found too little text to read; they stay needs-ocr`);
  if (failed) console.log(`  ${failed} failed; the ledger says why`);
}
