#!/usr/bin/env node
// Write a complete new record: the next ID, every column filled (from a template row, from --set, else the
// column's declared missing state), then the schema gate for the new row.
//
//   npm run data:new -- measurements --like V000384 --set Property="Tensile modulus" --set "Raw value=2.1 GPa"
//   npm run data:new -- grades --material M020 --set Manufacturer=Polymaker --set "Product name=PolyLite PLA"
//   npm run data:new -- grades --material M020 --study          next -R# study or resin-reference grade
//   add --dry-run to print the row without writing it

import { join } from 'node:path';
import { openTables, projectRoot } from './table-io.mjs';
import { newRecord } from './records.mjs';
import { checkData } from '../../build/src/schema.js';

const args = process.argv.slice(2);
const table = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.match(/^--(like|material|set)$/));
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const set = {};
args.forEach((a, i) => { if (a === '--set') { const [k, ...v] = args[i + 1].split('='); set[k] = v.join('='); } });
if (!table) { console.error('usage: npm run data:new -- <table> [--like ID] [--material M###] [--study] [--set Column=Value ...] [--dry-run]'); process.exit(2); }

try {
  const t = openTables();
  const { row, unset } = newRecord(t, table, { like: opt('like'), material: opt('material'), study: args.includes('--study'), set });
  const pk = t.schemas[table].primaryKey;
  console.log(JSON.stringify(row, null, 2));
  if (unset.length) { console.error(`Required with no value or missing state: ${unset.join(', ')}. Pass --set Column=Value.`); process.exit(1); }
  if (args.includes('--dry-run')) process.exit(0);
  t.append(table, row);
  t.save();
  const issues = checkData(join(projectRoot, 'data'), join(projectRoot, 'schema')).issues.filter((i) => !pk || i.message.includes(row[pk]) || i.where.includes(row[pk]));
  for (const i of issues) console.log(`${i.where}  ${i.message}`);
  console.log(`${pk ? row[pk] : 'row'} added to ${table}${issues.length ? `, with ${issues.length} gate issue(s) to fix` : '; the schema gate passes for it'}. Run npm run verify.`);
  if (issues.length) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
