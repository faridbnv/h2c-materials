#!/usr/bin/env node
// Retire a grade (Status and Availability together) and list every record that still depends on it, with what
// must happen to each. Records are retired, never deleted (AGENTS.md).
//
//   npm run data:retire -- grade G020-03            write the retirement and print the to-do list
//   npm run data:retire -- grade G020-03 --dry-run  print the to-do list only

import { openTables } from './table-io.mjs';
import { retireGrade } from './records.mjs';

const [kind, id] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (kind !== 'grade' || !id) { console.error('usage: npm run data:retire -- grade <GradeID> [--dry-run]'); process.exit(2); }
try {
  const t = openTables();
  const todo = retireGrade(t, id);
  if (!process.argv.includes('--dry-run')) t.save();
  for (const x of todo) console.log(`${x.table.padEnd(12)} ${x.record.padEnd(14)} ${x.action}`);
  console.log(`${id} ${process.argv.includes('--dry-run') ? 'would be' : 'is'} retired; ${todo.length} dependent record(s) to resolve. npm run verify names any left.`);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
