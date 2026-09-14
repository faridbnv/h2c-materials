#!/usr/bin/env node
//
// Build entry point. Runs the five stages in order and fails the whole build on any validation
// error, so a broken snapshot can never reach a distributable file.
//
//   check      every table against its declared schema             schema.js
//   load       read the CSV tables into raw rows                  load.js
//   normalize  free text -> canonical values, each tagged         normalize/
//   compile    assemble the relational runtime database           compile.js
//   validate   schema, references, citations, consistency         validate.js
//   bundle     gzip the data, inline the libraries, emit HTML     bundle.js
//
// `npm run validate` stops after the report; `npm run build` continues to the bundle.
// See docs/PIPELINE.md.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotDate } from './load.js';
import { readSource, sourceArg } from './source.js';
import { checkData } from './schema.js';
import { compile } from './compile.js';
import { compileReference } from './reference.js';
import { validate, formatReport } from './validate.js';
import { bundle } from './bundle.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');
const buildRoot = resolve(here, '..');

const BUILD = new Date().toISOString().slice(0, 10);

const validateOnly = process.argv.includes('--validate-only');

async function main() {
  const issues = [];

  const source = sourceArg();
  // The schema gate comes first: a table that breaks its contract is reported precisely, by file,
  // line and field, before the compiler can misread it. The manifest makes any row-count or content
  // change visible in the commit that makes it.
  if (source === 'csv') issues.push(...checkData(join(projectRoot, 'data'), join(projectRoot, 'schema')).issues);
  if (issues.some((i) => i.level === 'error')) {
    for (const e of issues.slice(0, 50)) console.error(`  ERROR  ${e.where}: ${e.message}`);
    console.error('\nBuild failed: the data tables do not match their schema (npm run data:check).');
    process.exit(1);
  }

  const { wb, referenceRows, referenceWhere } = await readSource(projectRoot, source);
  const SNAPSHOT = snapshotDate(wb.Method.rows);

  const { db, issues: compileIssues } = compile(wb, { snapshot: SNAPSHOT, build: BUILD });
  issues.push(...compileIssues);

  const reference = compileReference(referenceRows, issues, referenceWhere, db.registry);
  issues.push(...validate(db, wb));

  const report = formatReport(db, reference, issues, { snapshot: SNAPSHOT, build: BUILD });
  mkdirSync(join(buildRoot, 'reports'), { recursive: true });
  writeFileSync(join(buildRoot, 'reports/validation-report.md'), report);

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');

  console.log(`\nmaterials ${db.meta.counts.materials}  measurements ${db.meta.counts.measurements}  profiles ${db.meta.counts.profiles}  reference ${reference.meta.count}`);
  console.log(`errors ${errors.length}   warnings ${warnings.length}`);
  for (const e of errors.slice(0, 20)) console.log(`  ERROR  ${e.where}: ${e.message}`);
  for (const w of warnings.slice(0, 10)) console.log(`  warn   ${w.where}: ${w.message}`);
  console.log(`\nreport -> build/reports/validation-report.md`);

  if (errors.length) {
    console.error('\nBuild failed: the frozen database did not validate.');
    process.exit(1);
  }
  if (validateOnly) return;

  mkdirSync(join(projectRoot, 'dist'), { recursive: true });
  writeFileSync(join(projectRoot, 'dist/db.json'), JSON.stringify(db));
  writeFileSync(join(projectRoot, 'dist/reference.json'), JSON.stringify(reference));
  console.log(`db.json -> ${(JSON.stringify(db).length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`reference.json -> ${(JSON.stringify(reference).length / 1024).toFixed(0)} KB`);

  const out = await bundle({ projectRoot, buildRoot, db, reference, meta: { snapshot: SNAPSHOT, build: BUILD } });
  console.log(`\n${out.path.split('/').pop()} -> ${(out.bytes / 1024 / 1024).toFixed(2)} MB self-contained`);
}

main().catch((e) => { console.error(e); process.exit(1); });
