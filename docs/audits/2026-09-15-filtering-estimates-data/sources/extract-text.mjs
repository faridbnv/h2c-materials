#!/usr/bin/env node
// Workstream D helper: hash-check cached source PDFs against sources.csv and dump their text by page.
// Usage: node docs/audits/2026-09-15-filtering-estimates-data/sources/extract-text.mjs <outDir> [SourceID|file.pdf ...]
// Read-only on data; writes only <outDir>/<name>.txt. Same approach as scripts/audit/source-completeness.mjs.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readCsv } from '../../../../build/src/csv.js';

const root = resolve(new URL('../../../../', import.meta.url).pathname);
const [outDir, ...ids] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const sources = new Map(readCsv(join(root, 'data/tables/sources.csv')).records.map((r) => [r.values.SourceID, r.values]));
const targets = ids.length ? ids : readdirSync(join(root, '.cache/sources')).filter((f) => f.endsWith('.pdf')).map((f) => f.slice(0, -4));
for (const t of targets) {
  const path = t.endsWith('.pdf') ? t : join(root, '.cache/sources', `${t}.pdf`);
  const id = basename(path, '.pdf');
  if (!existsSync(path)) { console.log(`${id}: missing`); continue; }
  const bytes = readFileSync(path);
  const sha = createHash('sha256').update(bytes).digest('hex');
  const rec = sources.get(id)?.SHA256 ?? '';
  const status = !rec ? 'no-record' : sha === rec ? 'hash-ok' : `HASH-DIFFERS recorded ${rec.slice(0, 12)}`;
  try {
    const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise;
    const out = [`# ${id} sha256=${sha} ${status}`];
    for (let n = 1; n <= doc.numPages; n++) {
      out.push(`--- page ${n} ---`);
      const { items } = await (await doc.getPage(n)).getTextContent();
      const lines = new Map();
      for (const it of items) { const y = Math.round(it.transform[5]); if (!lines.has(y)) lines.set(y, []); lines.get(y).push([it.transform[4], it.str]); }
      for (const [, parts] of [...lines].sort((a, b) => b[0] - a[0])) {
        const text = parts.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join(' ').replace(/\s+/g, ' ').trim();
        if (text) out.push(`p${n}: ${text}`);
      }
    }
    writeFileSync(join(outDir, `${id}.txt`), out.join('\n'));
    if (status !== 'hash-ok') console.log(`${id}: ${status}`);
  } catch (e) { console.log(`${id}: ${status} extract-error ${e.message}`); }
}
