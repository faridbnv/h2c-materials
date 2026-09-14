#!/usr/bin/env node
// The one-time conversion as a replayable chain: dump the workbooks, then apply every
// scripts/migrate/mNN-*.mjs in order. Running it into an empty directory must reproduce the
// committed data/tables exactly (test/migration.test.js), so the conversion can be re-run against
// a newer workbook before cutover and every step is reviewable code, not a hand edit.
//
//   node scripts/migrate/chain.mjs <output-root>     writes <output-root>/data/tables and data/manifest.json

import { mkdirSync, readdirSync, cpSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dumpWorkbook } from './dump-workbook.mjs';
import { openTables, projectRoot } from '../data/table-io.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export async function runChain(outRoot, { log = () => {}, xlsx, refXlsx } = {}) {
  mkdirSync(join(outRoot, 'data'), { recursive: true });
  // Migrations read the schema only to find column types; the committed schema serves every step.
  cpSync(join(projectRoot, 'schema'), join(outRoot, 'schema'), { recursive: true });
  dumpWorkbook({ dataDir: join(outRoot, 'data'), ...(xlsx ? { xlsx } : {}), ...(refXlsx ? { refXlsx } : {}) });
  const steps = readdirSync(here).filter((f) => /^m\d{2}-.*\.mjs$/.test(f)).sort();
  for (const step of steps) {
    const { migrate } = await import(pathToFileURL(join(here, step)).href);
    const t = openTables(outRoot, { allowMissing: true });
    migrate(t);
    const changes = t.save();
    log(`${step}: ${changes.length} change(s)`);
  }
  return steps;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? '');
  if (!process.argv[2]) { console.error('usage: node scripts/migrate/chain.mjs <output-root>'); process.exit(2); }
  await runChain(out, { log: console.log });
}
