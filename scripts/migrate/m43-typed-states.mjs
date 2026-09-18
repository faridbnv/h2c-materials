#!/usr/bin/env node
// Migration m43: a measurement's moisture and post-processing state was declared by its wording, in
// schema/vocab/moisture-conditions.csv and post-processing.csv (D53, D56). That made every new datasheet sentence a
// schema change: a sheet whose annealing sentence differed by a word stopped the build until someone added the
// sentence to a vocabulary and declared its state again.
//
// The state becomes a typed column on the row, beside the source's words, which is what D49 does everywhere else:
// Moisture state and Post-processing state are what the build reads, the wording stays raw text, and typed-values.js
// checks the two against each other on every build (PARSE-MISMATCH). A new wording is then data, not a schema change.
//
// npm run build:diff: measurements[].moistureState added on every row (the state was computed from the vocabulary
// and is now compiled from the column); nothing else moves.
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables, projectRoot } from '../data/table-io.mjs';

// The two vocabularies this migration reads and then retires, with the column each declared the state in.
const RETIRED = [
  { file: 'moisture-conditions.csv', column: 'State', raw: 'Moisture condition', typed: 'Moisture state' },
  { file: 'post-processing.csv', column: 'State', raw: 'Post-processing', typed: 'Post-processing state' },
];

export function migrate(t, root = projectRoot) {
  if (t.header('measurements').includes('Moisture state')) return;

  for (const { file, column, raw, typed } of RETIRED) {
    const path = join(root, 'schema/vocab', file);
    const declared = new Map(readCsv(path).records.map((r) => [r.values.Value, r.values[column]]));
    // Nothing is dropped that is not carried over: every wording in use must declare a state.
    const undeclared = [...new Set(t.rows('measurements').map((r) => r[raw]))].filter((v) => !declared.get(v));
    if (undeclared.length) throw new Error(`m43: ${file} declares no ${column} for ${undeclared.map((v) => JSON.stringify(v)).join(', ')}; nothing moved`);
    t.addColumn('measurements', typed, { after: raw, fill: (r) => declared.get(r[raw]) });
  }
}

/** The vocabularies the states replace. Removed after the columns are filled, so a re-run short-circuits first. */
export function retireVocabularies(root = projectRoot) {
  for (const { file } of RETIRED) {
    const path = join(root, 'schema/vocab', file);
    if (existsSync(path)) { unlinkSync(path); console.log(`retired schema/vocab/${file}`); }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
  retireVocabularies();
}
