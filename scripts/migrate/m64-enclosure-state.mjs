#!/usr/bin/env node
// Migration m64 (2026-09-19): "no" in a column headed Enclosed Space.
//
// Extrudr's sheets answer the enclosure question in one word. The build's reader knew "not required" and "no
// enclosure needed" but not a bare "no", so eleven profiles carried the raw word with an Enclosure state of
// unknown. The reader has learned the wording (build/src/normalize/process.js); this brings the typed column
// beside it into agreement, which is what PARSE-MISMATCH asks for.
//
// Two more answer "for larger components", which is the statement the reader already knew as "recommended for
// larger prints": a condition on when an enclosure helps, not a refusal. The raw column keeps the condition.
//
//   node scripts/migrate/m64-enclosure-state.mjs

import { openTables } from '../data/table-io.mjs';
import { parseEnclosure } from '../../build/src/normalize/process.js';

const t = openTables();
let changed = 0;
for (const row of t.rows('profiles')) {
  const read = parseEnclosure(row.Enclosure);
  if (read.unparsed || read.state === 'unknown' || read.state === row['Enclosure state']) continue;
  if (row['Enclosure state'] !== 'unknown') continue;
  t.set('profiles', row.ProfileID, 'Enclosure state', read.state, { expect: row['Enclosure state'] });
  changed++;
}
if (changed) t.save();
console.log(`${changed} profile(s) now state what their own word says`);
