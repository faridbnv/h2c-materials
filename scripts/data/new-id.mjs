#!/usr/bin/env node
// Print the next free ID for a table. IDs are never reused; retired rows keep theirs.
//
//   npm run data:new-id -- measurements
//   npm run data:new-id -- grades M020            next procurement grade of M020
//   npm run data:new-id -- grades M020 --study    next -R# study / resin-reference grade

import { openTables } from './table-io.mjs';

const [name, materialId] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!name) {
  console.error('usage: npm run data:new-id -- <table> [MaterialID] [--study]');
  process.exit(2);
}
try {
  console.log(openTables().nextId(name, { materialId, study: process.argv.includes('--study') }));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
