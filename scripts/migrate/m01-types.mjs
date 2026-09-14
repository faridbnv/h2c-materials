#!/usr/bin/env node
// Migration m01: canonical scalar values, replacing the workbook's display formatting.
//
//  - Numbers in number-typed columns lose display padding: "1400.00" -> "1400", "1.40" -> "1.4".
//    Number(text) is unchanged, so nothing that reads the value changes.
//  - Sources "Access date" written by Excel as "2026-09-11 00:00:00" becomes "2026-09-11".
//  - Prices "Headline sample" "0", written by an audit script, becomes "FALSE" like its column.
//
// Re-runnable: a second run changes nothing.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

export function migrate(t) {
  for (const name of t.tables()) {
    const numberColumns = t.schemas[name].fields.filter((f) => f.type === 'number').map((f) => f.name);
    const pk = t.schemas[name].primaryKey;
    for (const row of t.rows(name)) {
      for (const col of numberColumns) {
        const v = row[col];
        if (v == null || !NUMBER_RE.test(v)) continue;
        const canonical = String(Number(v));
        if (canonical === v) continue;
        if (Number(canonical) !== Number(v)) throw new Error(`${name} ${row[pk]} ${col}: ${v} would change value`);
        t.set(name, row[pk], col, canonical);
      }
    }
  }
  for (const row of t.rows('sources')) {
    const m = /^(\d{4}-\d{2}-\d{2}) 00:00:00$/.exec(row['Access date'] ?? '');
    if (m) t.set('sources', row.SourceID, 'Access date', m[1]);
  }
  for (const row of t.rows('prices')) {
    if (row['Headline sample'] === '0') t.set('prices', row.PriceID, 'Headline sample', 'FALSE');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const changes = t.save();
  const byColumn = new Map();
  for (const c of changes) byColumn.set(`${c.table}.${c.field}`, (byColumn.get(`${c.table}.${c.field}`) ?? 0) + 1);
  for (const [k, n] of byColumn) console.log(`${n}\t${k}`);
  console.log(`${changes.length} value(s) made canonical`);
}
