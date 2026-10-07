#!/usr/bin/env node
// What the import's sheet reader (readSheet, with the row builder) reads from every cached registered document, one line
// per value: run before and after a reader change and diff the two files (completeness round, item 12c and 12d).
//
//   node docs/audits/2026-10-07-completeness-round/tooling/reader-parity.mjs > before.txt
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';
import { cachedText } from '../../../../scripts/lib/pdf-text.mjs';
import { readSheet, measurementRow } from '../../../../scripts/ingest/propose.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const rows = (t) => readCsv(join(ROOT, 'data/tables', `${t}.csv`)).records.map((r) => r.values);
const registry = new Map(rows('properties').map((r) => [r.Property, r]));
const out = [];
for (const s of rows('sources').filter((x) => /^[0-9a-f]{64}$/.test(x.SHA256)).sort((a, b) => a.SourceID.localeCompare(b.SourceID))) {
  const text = cachedText(s.SHA256);
  if (!text) continue;
  let sheet;
  try { sheet = readSheet(text, registry); } catch (e) { out.push(`${s.SourceID}\tERROR ${e.message}`); continue; }
  for (const v of sheet.values) {
    const r = measurementRow(v, { sourceId: s.SourceID, materialId: 'M000', gradeId: 'G000-00' });
    out.push([s.SourceID, v.page, v.property, r['Raw value'], r.Direction, r['Specimen type'], r['Specimen / print parameters']].join('\t'));
  }
}
process.stdout.write(`${out.join('\n')}\n`);
