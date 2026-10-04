#!/usr/bin/env node
// Is each cached page's text a reading of the page? (reader round, 2026-10-04; flags defined in scripts/lib/text-quality.mjs)
//
//   npm run ingest:quality                          every cached PDF that data/tables/sources.csv records (SHA256)
//   npm run ingest:quality -- --all-cached          every cached PDF reading, recorded or not
//   npm run ingest:quality -- --docs list.csv       the documents in a CSV with a sha column
//   npm run ingest:quality -- --sha <sha>           one document
//   npm run ingest:quality -- --train-bigrams       rebuild scripts/ingest/lexicon/letter-bigrams.csv from the cached text
//
// Writes .cache/quality/<sha>.json per document and, unless --no-report, a summary and the flagged pages in
// docs/audits/2026-10-04-reader-round/text-quality/ (summary.md, pages.csv). A flag asks for a look at the page image or
// an optical reading (npm run ingest:ocr-pass); it never changes the data. Nothing here touches data/.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { cacheDir, projectRoot } from '../lib/pdf-text.mjs';
import { BROKEN, docQuality, isBroken, loadLabels, scoredWords, trainBigrams } from '../lib/text-quality.mjs';

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);
const REPORT = join(projectRoot, 'docs/audits/2026-10-04-reader-round/text-quality');
const SHA = /^[0-9a-f]{64}$/;

const readText = (sha) => {
  const path = cacheDir('text', `${sha}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
const isPdfReading = (text) => text?.extractor?.startsWith('pdfjs');

/** Which sources print this digest: sha -> [SourceID]. */
export function sourcesBySha() {
  const bySha = new Map();
  for (const { values } of readCsv(join(projectRoot, 'data/tables/sources.csv')).records) {
    const sha = (values.SHA256 ?? '').trim().toLowerCase();
    if (SHA.test(sha)) bySha.set(sha, [...(bySha.get(sha) ?? []), values.SourceID]);
  }
  return bySha;
}

/** The documents a run covers, as digests. */
export function selectedShas(bySha) {
  if (arg('sha')) return [arg('sha')];
  if (arg('docs')) return readCsv(arg('docs')).records.map((r) => r.values.sha ?? r.values.SHA256 ?? r.values.sha256).filter((s) => SHA.test(s ?? ''));
  if (flag('all-cached')) return readdirSync(cacheDir('text')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  return [...bySha.keys()];
}

/** The letter-bigram table, trained on the words that recur across cached PDF readings (five sheets or more). */
function train() {
  const documentsOf = new Map();
  for (const f of readdirSync(cacheDir('text')).filter((x) => x.endsWith('.json'))) {
    const text = JSON.parse(readFileSync(cacheDir('text', f), 'utf8'));
    // An optical reading's misreads are not language; a cipher is not either, and it occurs in one sheet.
    if (!isPdfReading(text) || text.ocr) continue;
    const seen = new Set();
    for (const p of text.pages) for (const w of scoredWords(p.lines.map((l) => l.text).join(' '))) seen.add(w);
    for (const w of seen) documentsOf.set(w, (documentsOf.get(w) ?? 0) + 1);
  }
  const vocabulary = [...documentsOf].filter(([, n]) => n >= 5);
  const rows = trainBigrams(vocabulary);
  const header = Object.keys(rows[0]);
  writeFileSync(join(projectRoot, 'scripts/ingest/lexicon/letter-bigrams.csv'), csvText(header, rows));
  console.log(`letter-bigrams.csv trained on ${vocabulary.length} words`);
}

/** How much a broken page costs a reader: see the report's ranking note. */
const pageSeverity = (p) => (p.flags.includes('garble') ? 3 : p.flags.includes('empty') || p.flags.includes('letters') ? 2 : (p.detail.glyphs ?? 0) >= 0.02 * p.chars ? 1 : 0.3);

const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)} %` : 'n/a');

function report(results, bySha, { write = true } = {}) {
  let heavyGlyph = 0;
  const rows = [];
  const counts = {};
  const docs = [];
  let pageTotal = 0;
  for (const r of results) {
    const id = (bySha.get(r.sha) ?? []).join(';');
    pageTotal += r.pageCount;
    let broken = 0, severity = 0;
    const flagsHere = {};
    for (const p of r.pages) {
      if (!p.flags.length) continue;
      rows.push({ sha: r.sha, source_id: id, page: p.page, flags: p.flags.join(' '), chars: p.chars, letter_ratio: p.letterRatio });
      if (p.chars && (p.detail.glyphs ?? 0) >= 0.02 * p.chars) heavyGlyph++;
      for (const f of p.flags) { counts[f] = (counts[f] ?? 0) + 1; flagsHere[f] = (flagsHere[f] ?? 0) + 1; }
      if (isBroken(p)) { broken++; severity += pageSeverity(p); }
    }
    if (broken) docs.push({ sha: r.sha, id, pages: r.pageCount, broken, severity, flagsHere, optical: r.optical });
  }
  const anyFlag = (names) => results.filter((r) => r.pages.some((p) => p.flags.some((f) => names.includes(f)))).length;
  docs.sort((a, b) => b.severity - a.severity || b.broken / b.pages - a.broken / a.pages);
  const lines = [
    '# Cached text quality',
    '',
    `Generated by \`npm run ingest:quality\` over ${results.length} cached PDF readings (${pageTotal} pages). Flags are defined in \`scripts/lib/text-quality.mjs\`; a flag asks for a look at the page image or an optical reading, never changes data. \`pages.csv\` lists every flagged page.`,
    '',
    '## Pages by flag',
    '',
    '| flag | pages | share of pages | documents |',
    '| --- | ---: | ---: | ---: |',
    ...['empty', 'glyph', 'letters', 'garble', 'label-no-number'].map((f) => `| ${f} | ${counts[f] ?? 0} | ${pct(counts[f] ?? 0, pageTotal)} | ${anyFlag([f])} |`),
    `| of which glyph with 2 % or more of the page's characters | ${heavyGlyph} | ${pct(heavyGlyph, pageTotal)} | ${results.filter((r) => r.pages.some((p) => (p.detail.glyphs ?? 0) >= 0.02 * p.chars && p.chars)).length} |`,
    `| broken (empty, glyph, letters or garble) | ${rows.filter((r) => r.flags.split(' ').some((f) => BROKEN.has(f))).length} | | ${docs.length} |`,
    '',
    `## The ${Math.min(30, docs.length)} worst documents`,
    '',
    'Ranked by severity: a garbled page counts 3, an empty or letterless page 2, a page with glyphs in 2 % or more of its characters 1, and a few stray private-use characters (a bullet or an icon) 0.3.',
    '',
    '| source | sha | pages | broken | severity | flags (pages) | reading |',
    '| --- | --- | ---: | ---: | ---: | --- | --- |',
    ...docs.slice(0, 30).map((d) => `| ${d.id || '(not in sources.csv)'} | ${d.sha.slice(0, 12)} | ${d.pages} | ${d.broken} | ${d.severity.toFixed(1)} | ${Object.entries(d.flagsHere).map(([f, n]) => `${f} ${n}`).join(', ')} | ${d.optical ? 'optical' : 'text layer'} |`),
    '',
    'A document already read optically (`reading` = optical) is flagged on the recognised text, so its flags mean the recognition went wrong.',
    '',
  ];
  if (write) {
    mkdirSync(REPORT, { recursive: true });
    writeFileSync(join(REPORT, 'summary.md'), lines.join('\n'));
    writeFileSync(join(REPORT, 'pages.csv'), csvText(['sha', 'source_id', 'page', 'flags', 'chars', 'letter_ratio'], rows));
  }
  return { counts, docs, pageTotal };
}

if (process.argv[1]?.endsWith('quality.mjs')) {
  if (flag('train-bigrams')) { train(); process.exit(0); }
  const bySha = sourcesBySha();
  const labels = loadLabels();
  mkdirSync(cacheDir('quality'), { recursive: true });
  const results = [];
  let skipped = 0;
  for (const sha of selectedShas(bySha)) {
    const text = readText(sha);
    if (!isPdfReading(text)) { skipped++; continue; }
    const result = docQuality(text, { labels });
    writeFileSync(cacheDir('quality', `${sha}.json`), JSON.stringify(result));
    results.push(result);
  }
  const { counts, docs, pageTotal } = report(results, bySha, { write: !flag('no-report') });
  console.log(`${results.length} PDF readings, ${pageTotal} pages (${skipped} selected digests skipped: not a cached PDF reading)`);
  for (const [f, n] of Object.entries(counts)) console.log(`  ${f.padEnd(16)} ${n} pages`);
  console.log(`  ${docs.length} documents with a broken page`);
}
