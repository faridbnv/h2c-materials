#!/usr/bin/env node
// Check every data table against its schema: columns, types, missing states, vocabularies,
// uniqueness, references, canonical format and the manifest. Fast; run it after any edit.
//
//   npm run data:check

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkData } from '../../build/src/schema.js';
import { projectRoot, SAVE_JOURNAL } from './table-io.mjs';

const started = performance.now();
const { issues, tables } = checkData(join(projectRoot, 'data'), join(projectRoot, 'schema'));
// Tables a save left part-renamed are neither the old world nor the new one, whatever the gate finds in them.
const interrupted = existsSync(join(projectRoot, SAVE_JOURNAL));
if (interrupted) console.error(`${SAVE_JOURNAL}  a save stopped part-way; \`npm run data:fmt\` (or any script that opens the tables) finishes it`);
const rows = Object.values(tables).reduce((n, t) => n + t.records.length, 0);
for (const i of issues.slice(0, 200)) console.error(`${i.where}  [${i.code}] ${i.message}`);
if (issues.length > 200) console.error(`… and ${issues.length - 200} more`);
console.log(`${Object.keys(tables).length} tables, ${rows} rows, ${issues.length} issue(s) in ${Math.round(performance.now() - started)} ms`);
if (issues.length || interrupted) process.exit(1);
