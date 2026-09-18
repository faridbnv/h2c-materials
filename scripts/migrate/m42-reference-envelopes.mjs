#!/usr/bin/env node
// Migration m42: reference.csv carried a min and a max column for each of eight properties, so a ninth reference
// property meant two new columns and a schema change. The envelopes move to data/tables/reference_envelopes.csv, one
// row per reference material and property, and the property list becomes schema/vocab/reference-properties.csv, which
// declares each property's unit. A new reference property is then a vocabulary row and its envelope rows.
//
// The values move unchanged (npm run build:diff: no difference; dist/reference.json byte-identical).
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';

// The eight properties as reference.csv spelled them, in its column order. Held here rather than imported from
// build/src/reference-properties.js: a migration records what was done, and must not follow the code it changed.
export const REFERENCE_KEYS = ['density', 'tensileModulus', 'yieldStrength', 'tensileStrength', 'compressiveStrength', 'elongation', 'fractureToughness', 'thermalExpansion'];

const FINITE = (v) => v != null && v !== '' && Number.isFinite(Number(v));

export function migrate(t) {
  if (t.tables().includes('reference_envelopes') && !t.header('reference').includes('density min')) return;

  // Nothing may be dropped that is not carried over: every row must publish both ends of all eight envelopes.
  const gaps = [];
  for (const r of t.rows('reference')) {
    for (const key of REFERENCE_KEYS) {
      if (!FINITE(r[`${key} min`]) || !FINITE(r[`${key} max`])) gaps.push(`${r.Name} ${key}`);
    }
  }
  if (gaps.length) throw new Error(`m42: ${gaps.length} envelope(s) are not a numeric pair (${gaps.slice(0, 5).join(', ')}); nothing moved`);

  const rows = t.rows('reference').flatMap((r) => REFERENCE_KEYS.map((key) => ({
    Name: r.Name, Property: key, Min: r[`${key} min`], Max: r[`${key} max`],
  })));
  if (!t.tables().includes('reference_envelopes')) t.createTable('reference_envelopes', ['Name', 'Property', 'Min', 'Max'], rows);
  for (const key of REFERENCE_KEYS) {
    t.dropColumn('reference', `${key} min`);
    t.dropColumn('reference', `${key} max`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(projectRoot, { allowMissing: true });
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
