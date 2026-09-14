#!/usr/bin/env node
// Write the read-only review workbook: dist/review/H2C_Data_Review.xlsx (not committed; regenerate any
// time). Nothing imports it back: data changes are made in data/tables, see AGENTS.md.
//
//   npm run data:export-xlsx [-- output.xlsx]

import { mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { writeReviewWorkbook } from '../../build/src/review-workbook.js';
import { projectRoot } from './table-io.mjs';

const out = resolve(process.argv[2] ?? join(projectRoot, 'dist/review/H2C_Data_Review.xlsx'));
mkdirSync(dirname(out), { recursive: true });
let commit = null;
try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
const wb = writeReviewWorkbook(projectRoot, out, {
  commit,
  dataManifestSha256: createHash('sha256').update(readFileSync(join(projectRoot, 'data/manifest.json'))).digest('hex'),
  generated: new Date().toISOString().slice(0, 10),
});
console.log(`${wb.SheetNames.length} sheets -> ${out}`);
