#!/usr/bin/env node
// Migration m07: remove PDF and web extraction artifacts from text (text-cleanup.mjs: ligatures, full-width
// punctuation in non-CJK text, dashes between numbers, run-together words, whitespace).
//
// Applies to free-text columns only: a column with a vocabulary, a reference, an enum, a pattern, a key
// role or a URL is left alone. Wording never changes. Re-runnable.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { cleanText } from './text-cleanup.mjs';

export function textColumns(schema) {
  return schema.fields.filter((f) => f.type === 'string' && f.role !== 'key' && !f.vocabulary && !f.reference && !f.embeddedReferences
    && !f.constraints?.enum && !f.constraints?.pattern && f.name !== 'URL').map((f) => f.name);
}

export function migrate(t) {
  for (const name of t.tables()) {
    const schema = t.schemas[name];
    const pk = schema.primaryKey;
    if (!pk) continue; // link tables hold identifiers only
    for (const column of textColumns(schema)) {
      for (const row of t.rows(name)) {
        const v = row[column];
        const clean = cleanText(v);
        if (v != null && clean !== v) t.set(name, row[pk], column, clean, { expect: v });
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const changes = t.save();
  const byColumn = new Map();
  for (const c of changes) byColumn.set(`${c.table}.${c.field}`, (byColumn.get(`${c.table}.${c.field}`) ?? 0) + 1);
  for (const [k, n] of [...byColumn].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${k}`);
  console.log(`${changes.length} cell(s) cleaned`);
}
