#!/usr/bin/env node
//
// Build entry point. Runs the five stages in order and fails the whole build on any validation
// error, so a broken snapshot can never reach a distributable file.
//
//   extract    read the frozen workbooks into raw rows            extract.js
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
import { extractWorkbook, EXPECTED_ROWS } from './extract.js';
import { compile } from './compile.js';
import { compileReference } from './reference.js';
import { validate, formatReport } from './validate.js';
import { bundle } from './bundle.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');
const buildRoot = resolve(here, '..');

const SNAPSHOT = '2026-09-10';                 // Method sheet, Scope / Snapshot
const BUILD = new Date().toISOString().slice(0, 10);

const validateOnly = process.argv.includes('--validate-only');

async function main() {
  const issues = [];

  const wb = extractWorkbook(join(projectRoot, 'H2C_FDM_Material_Database.xlsx'));
  for (const [sheet, expected] of Object.entries(EXPECTED_ROWS)) {
    const got = wb[sheet].rows.length;
    if (got !== expected) {
      issues.push({ level: 'error', where: `Sheet "${sheet}"`, message: `Expected ${expected} rows, found ${got}. The frozen source moved.` });
    }
  }

  const { db, issues: compileIssues } = compile(wb, { snapshot: SNAPSHOT, build: BUILD });
  issues.push(...compileIssues);

  const reference = compileReference(join(projectRoot, 'generic_materials.xlsx'), issues);
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
