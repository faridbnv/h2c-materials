#!/usr/bin/env node
// Historical check of the 2026-09-14 conversion from the Excel workbooks to data/tables.
//
// The workbooks left the tree at cutover, so both inputs are read from git history:
//  1. Replay: the workbooks as of the branch base (60f7392), dumped and taken through
//     scripts/migrate/m01..m06, must reproduce data/tables exactly as of the last migration commit.
//  2. Oracle: those tables, compiled by the current build code, must equal the workbook build's output
//     (.migration/baseline/*.json.gz) except for scripts/migrate/explained-differences.json.
//
// Needs full git history (git fetch --unshallow in a shallow clone). Check 2 holds only while the build
// code still compiles those tables the same way; it is evidence for the migration, not a standing test.
//
//   node scripts/migrate/verify-migration.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runChain } from './chain.mjs';
import { projectRoot } from '../data/table-io.mjs';
import { diffAgainstBaseline, unexplained } from './oracle.mjs';
import { loadTables, loadReference, snapshotDate } from '../../build/src/load.js';
import { compile } from '../../build/src/compile.js';
import { validate } from '../../build/src/validate.js';
import { compileReference } from '../../build/src/reference.js';

export const BASE_COMMIT = '60f7392e2ae3e3c6dce67424a3d05052a1361731';
export const MIGRATED_COMMIT = '35ba8d2';

const git = (args, encoding = 'utf8') => execFileSync('git', args, { cwd: projectRoot, encoding, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const work = mkdtempSync(join(tmpdir(), 'h2c-verify-migration-'));
let failed = false;
try {
  // 1. Replay.
  const xlsx = join(work, 'H2C_FDM_Material_Database.xlsx');
  const refXlsx = join(work, 'Generic_Materials_Reference.xlsx');
  writeFileSync(xlsx, git(['show', `${BASE_COMMIT}:data/H2C_FDM_Material_Database.xlsx`], 'buffer'));
  writeFileSync(refXlsx, git(['show', `${BASE_COMMIT}:data/Generic_Materials_Reference.xlsx`], 'buffer'));
  const replay = join(work, 'replay');
  await runChain(replay, { xlsx, refXlsx });
  const committed = git(['ls-tree', '--name-only', `${MIGRATED_COMMIT}:data/tables`]).trim().split('\n').filter((f) => f.endsWith('.csv'));
  const replayed = readdirSync(join(replay, 'data/tables')).filter((f) => f.endsWith('.csv')).sort();
  const mismatches = [];
  if (JSON.stringify(committed.sort()) !== JSON.stringify(replayed)) mismatches.push(`table set: ${replayed.join(', ')} vs ${committed.join(', ')}`);
  for (const f of committed) if (git(['show', `${MIGRATED_COMMIT}:data/tables/${f}`]) !== readFileSync(join(replay, 'data/tables', f), 'utf8')) mismatches.push(f);
  if (git(['show', `${MIGRATED_COMMIT}:data/manifest.json`]) !== readFileSync(join(replay, 'data/manifest.json'), 'utf8')) mismatches.push('manifest.json');
  console.log(mismatches.length ? `REPLAY DIFFERS: ${mismatches.join(', ')}` : `replay: workbooks at ${BASE_COMMIT.slice(0, 7)} -> m01..m06 reproduce data/tables at ${MIGRATED_COMMIT} byte for byte (${committed.length} tables)`);
  failed ||= mismatches.length > 0;

  // 2. Oracle.
  const migrated = join(work, 'migrated');
  mkdirSync(join(migrated, 'data/tables'), { recursive: true });
  for (const f of committed) writeFileSync(join(migrated, 'data/tables', f), git(['show', `${MIGRATED_COMMIT}:data/tables/${f}`]));
  const wb = loadTables(join(migrated, 'data'));
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'oracle' });
  validate(db, wb);
  const reference = compileReference(loadReference(join(migrated, 'data')), [], undefined, db.registry);
  const diffs = diffAgainstBaseline({ db, reference });
  const { extra, stale } = unexplained(diffs);
  for (const d of extra.slice(0, 20)) console.log(`  unexplained: ${d.path}  ${JSON.stringify(d.before)?.slice(0, 80)} -> ${JSON.stringify(d.after)?.slice(0, 80)}`);
  for (const d of stale) console.log(`  explained but absent: ${d.path}`);
  console.log(`oracle: ${diffs.length} difference(s) from the workbook build, ${extra.length} unexplained, ${stale.length} stale`);
  failed ||= extra.length > 0 || stale.length > 0;
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
