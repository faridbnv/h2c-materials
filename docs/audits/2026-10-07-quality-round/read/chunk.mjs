#!/usr/bin/env node
// Packs read/queue.csv into chunks of about 45 tasks, each document whole (a document with more tasks than that is split
// by page), so each reader opens each document once. Writes read/chunk-NN.csv.
//
//   node docs/audits/2026-10-07-quality-round/read/chunk.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SIZE = 45;
const { header, records } = (() => { const r = readCsv(join(HERE, 'queue.csv')); return { header: r.header ?? Object.keys(r.records[0].values), records: r.records.map((x) => x.values) }; })();
const cols = Object.keys(records[0]);
const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const groups = new Map();
for (const t of records) {
  const doc = t.SHA256 || t.SourceID;
  const parts = groups.get(doc) ?? groups.set(doc, []).get(doc);
  parts.push(t);
}
// A document larger than a chunk is split by page.
const units = [];
for (const [, list] of groups) {
  if (list.length <= SIZE) { units.push(list); continue; }
  const byPage = new Map();
  for (const t of list) (byPage.get(t.Page) ?? byPage.set(t.Page, []).get(t.Page)).push(t);
  let cur = [];
  for (const [, l] of [...byPage].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (cur.length && cur.length + l.length > SIZE) { units.push(cur); cur = []; }
    cur.push(...l);
  }
  if (cur.length) units.push(cur);
}
units.sort((a, b) => b.length - a.length);
const chunks = [];
for (const u of units) {
  const c = chunks.find((x) => x.length + u.length <= SIZE);
  if (c) c.push(...u); else chunks.push([...u]);
}
chunks.forEach((c, i) => {
  c.sort((a, b) => (a.SHA256 || a.SourceID).localeCompare(b.SHA256 || b.SourceID) || Number(a.Page) - Number(b.Page));
  writeFileSync(join(HERE, `chunk-${String(i + 1).padStart(2, '0')}.csv`), [cols.join(','), ...c.map((t) => cols.map((h) => q(t[h])).join(','))].join('\n') + '\n');
});
console.log(`${chunks.length} chunks: ${chunks.map((c) => c.length).join(' ')}; documents per chunk: ${chunks.map((c) => new Set(c.map((t) => t.SHA256 || t.SourceID)).size).join(' ')}`);
