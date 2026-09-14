#!/usr/bin/env node
// Record-level changelog between two versions of the data tables.
//
//   npm run data:diff                         working tree against HEAD
//   npm run data:diff -- <rev>                working tree against <rev>
//   npm run data:diff -- <from> <to>          two commits
//   npm run data:diff -- <rev> --out changelog.csv
//   npm run data:diff -- HEAD --fail-on-removed   exit 1 if any record was deleted (retire it instead)
//
// Output columns: table, record, action (Added | Removed | Edited), field, before, after.
// Records are matched by the table's primary key from its schema, so reordering is not an edit.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { csvText } from '../../build/src/csv.js';
import { loadSchemas } from '../../build/src/schema.js';
import { projectRoot } from './table-io.mjs';
import { diffTables } from './diff-lib.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--fail-on-removed');
const failOnRemoved = process.argv.includes('--fail-on-removed');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
const [from = 'HEAD', to = null] = args;

const read = (rev, name) => {
  const rel = `data/tables/${name}.csv`;
  if (rev == null) return existsSync(join(projectRoot, rel)) ? readFileSync(join(projectRoot, rel), 'utf8') : null;
  try { return execFileSync('git', ['show', `${rev}:${rel}`], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }); } catch { return null; }
};

const { tables: schemas } = loadSchemas(join(projectRoot, 'schema'));
const log = diffTables(schemas, (side, name) => (side === 'from' ? read(from, name) : read(to, name)));
const text = csvText(['table', 'record', 'action', 'field', 'before', 'after'], log);
if (out) {
  writeFileSync(out, text);
  console.log(`${log.length} change(s) -> ${out}`);
} else if (!failOnRemoved) {
  process.stdout.write(text);
}
const removed = log.filter((c) => c.action === 'Removed' && c.record !== '(column)');
if (failOnRemoved && removed.length) {
  console.error(`${removed.length} record(s) deleted: ${removed.slice(0, 20).map((c) => `${c.table} ${c.record}`).join(', ')}. Records are retired, never deleted.`);
  process.exit(1);
}
