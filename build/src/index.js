#!/usr/bin/env node
//
// Build entry point. Runs the five stages in order and fails the whole build on any validation
// error, so a broken snapshot can never reach a distributable file.
//
//   check      every table against its declared schema             schema.js
//   load       read the CSV tables into raw rows                  load.js
//   compile    assemble the relational runtime database           compile.js (normalize/ reads free text)
//   estimate   inference for missing headlines, as an overlay     estimate/
//   validate   references, citations, consistency; estimates      validate.js, estimate/validate.js
//   (pipeline.js runs compile, estimate and validate for the build, the snapshot, the audit and the tests)
//   bundle     gzip the data, inline the libraries, emit HTML     bundle.js
//
// `npm run validate` stops after the report; `npm run build` continues to the bundle; `--no-estimates` builds the core
// database without the estimate stage.
// See docs/PIPELINE.md.

import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotDate } from './load.js';
import { readSource } from './source.js';
import { checkData } from './schema.js';
import { contractIssues } from './contract.js';
import { buildDatabase } from './pipeline.js';
import { compileReference } from './reference.js';
import { formatReport } from './validate.js';
import { estimateReportLines } from './estimate/validate.js';
import { polymerEnvironmentReportLines } from './polymer-environment.js';
import { bundle } from './bundle.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');
const buildRoot = resolve(here, '..');

// The build date is the source's date, not the clock's, so the same commit builds the same bytes on
// any day: SOURCE_DATE_EPOCH when set (the reproducible-builds convention), else the commit date.
function buildDate() {
  if (process.env.SOURCE_DATE_EPOCH) return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString().slice(0, 10);
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
const BUILD = buildDate();

const validateOnly = process.argv.includes('--validate-only');
// The core database alone, without the estimate stage: it must validate, because nothing in the core may rest on inference.
const withEstimates = !process.argv.includes('--no-estimates');

async function main() {
  const issues = [];

  // The schema gate comes first: a table that breaks its contract is reported precisely, by file,
  // line and field, before the compiler can misread it. The manifest makes any row-count or content
  // change visible in the commit that makes it.
  issues.push(...checkData(join(projectRoot, 'data'), join(projectRoot, 'schema')).issues);
  if (issues.some((i) => i.level === 'error')) {
    for (const e of issues.slice(0, 50)) console.error(`  ERROR  [${e.code}] ${e.where}: ${e.message}`);
    console.error('\nBuild failed: the data tables do not match their schema (npm run data:check).');
    process.exit(1);
  }

  const { wb, referenceRows, referenceWhere } = readSource(projectRoot);
  const SNAPSHOT = snapshotDate(wb.Method.rows);

  const { db, issues: buildIssues } = buildDatabase(wb, { snapshot: SNAPSHOT, build: BUILD, estimates: withEstimates });
  issues.push(...buildIssues);

  const reference = compileReference(referenceRows, issues, referenceWhere, db.registry);
  issues.push(...contractIssues({ db, reference }));

  const report = formatReport(db, reference, issues, { snapshot: SNAPSHOT, build: BUILD, sections: { polymerEnvironment: polymerEnvironmentReportLines(db), estimates: withEstimates ? estimateReportLines(db) : [] } });
  mkdirSync(join(buildRoot, 'reports'), { recursive: true });
  writeFileSync(join(buildRoot, 'reports/validation-report.md'), report);

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');

  console.log(`\nmaterials ${db.meta.counts.materials}  measurements ${db.meta.counts.measurements}  profiles ${db.meta.counts.profiles}  reference ${reference.meta.count}`);
  console.log(`errors ${errors.length}   warnings ${warnings.length}`);
  for (const e of errors.slice(0, 20)) console.log(`  ERROR  [${e.code}] ${e.where}: ${e.message}`);
  for (const w of warnings.slice(0, 10)) console.log(`  warn   [${w.code}] ${w.where}: ${w.message}`);
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

  writeFileSync(join(projectRoot, 'dist/manifest.json'), JSON.stringify(releaseManifest(out.path, SNAPSHOT), null, 2) + '\n');
  console.log('manifest -> dist/manifest.json');
}

/**
 * What this release was built from and what it produced, so a published page can be traced to the
 * exact data, schema, rules and code: commit, whether the tree was clean, input hashes and output hashes.
 */
function releaseManifest(htmlPath, snapshot) {
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const git = (...args) => { try { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
  const tree = (dir, filter = () => true) => sha(readdirSync(join(projectRoot, dir), { recursive: true }).filter((f) => filter(f) && !f.endsWith('/')).sort()
    .map((f) => { try { return `${sha(readFileSync(join(projectRoot, dir, f)))}  ${dir}/${f}`; } catch { return ''; } }).join('\n'));
  const file = (p) => sha(readFileSync(join(projectRoot, p)));
  return {
    snapshot, build: BUILD,
    commit: git('rev-parse', 'HEAD'),
    sourceTreeClean: git('status', '--porcelain', '--', 'data', 'schema', 'build/src', 'build/mappings', 'app') === '',
    inputs: {
      dataManifest: file('data/manifest.json'),
      schema: tree('schema'),
      buildRules: tree('build/src'),
      mappings: tree('build/mappings'),
      app: tree('app'),
    },
    outputs: {
      'db.json': file('dist/db.json'),
      'reference.json': file('dist/reference.json'),
      [htmlPath.split('/').pop()]: sha(readFileSync(htmlPath)),
    },
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
