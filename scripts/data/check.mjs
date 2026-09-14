#!/usr/bin/env node
// Check every data table against its schema: columns, types, missing states, vocabularies,
// uniqueness, references, canonical format and the manifest. Fast; run it after any edit.
//
//   npm run data:check

import { join } from 'node:path';
import { checkData } from '../../build/src/schema.js';
import { projectRoot } from './table-io.mjs';

const started = performance.now();
const { issues, tables } = checkData(join(projectRoot, 'data'), join(projectRoot, 'schema'));
const rows = Object.values(tables).reduce((n, t) => n + t.records.length, 0);
for (const i of issues.slice(0, 200)) console.error(`${i.where}  [${i.code}] ${i.message}`);
if (issues.length > 200) console.error(`… and ${issues.length - 200} more`);
console.log(`${Object.keys(tables).length} tables, ${rows} rows, ${issues.length} issue(s) in ${Math.round(performance.now() - started)} ms`);
if (issues.length) process.exit(1);
