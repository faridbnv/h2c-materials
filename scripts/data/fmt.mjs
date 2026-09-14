#!/usr/bin/env node
// Rewrite every data table and vocabulary in canonical CSV form and refresh data/manifest.json.
//
//   npm run data:fmt              rewrite in place
//   npm run data:fmt -- --check   change nothing; exit 1 if any file or the manifest is not canonical
//
// Canonical: RFC 4180 quoting only where needed, UTF-8 without BOM, LF, trailing newline, trimmed
// values, no blank rows. Row order is kept: it is the order the compiler and the app present.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { buildManifest } from '../../build/src/schema.js';
import { projectRoot } from './table-io.mjs';

const check = process.argv.includes('--check');
const dirs = [join(projectRoot, 'data/tables'), join(projectRoot, 'schema/vocab')];
const bad = [];

for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.csv')).sort()) {
    const path = join(dir, f);
    let parsed;
    try { parsed = readCsv(path); } catch (e) { bad.push(`${path.slice(projectRoot.length + 1)}: ${e.message}`); continue; }
    const canonical = csvText(parsed.header, parsed.records.map((r) => r.values));
    if (canonical === parsed.text) continue;
    if (check) bad.push(`${path.slice(projectRoot.length + 1)} is not canonical`);
    else { writeFileSync(path, canonical); console.log(`formatted ${path.slice(projectRoot.length + 1)}`); }
  }
}

const dataDir = join(projectRoot, 'data');
const tables = Object.fromEntries(readdirSync(join(dataDir, 'tables')).filter((f) => f.endsWith('.csv')).map((f) => [f.slice(0, -4), readCsv(join(dataDir, 'tables', f))]));
const manifest = JSON.stringify(buildManifest(dataDir, tables), null, 2) + '\n';
const manifestPath = join(dataDir, 'manifest.json');
if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== manifest) {
  if (check) bad.push('data/manifest.json is stale');
  else { writeFileSync(manifestPath, manifest); console.log('refreshed data/manifest.json'); }
}

if (bad.length) {
  for (const b of bad) console.error(`  ${b}`);
  console.error('\nRun `npm run data:fmt` and commit the result.');
  process.exit(1);
}
if (check) console.log('data format: canonical');
