#!/usr/bin/env node
// Migration m278 (2026-10-01): what a value's own line states and its row did not record (the data audit's RC3, RC4).
//
// `npm run audit:context` listed every value whose own line on its cached sheet names a direction, notch, standard,
// test temperature, moisture state or bound sign its row does not carry, or contradicts. An agent read each line from
// the sheet (m278-row-context.csv); a guard kept a correction only when its quote is on the sheet, its value in the
// vocabulary, the row unchanged since, and the edited row passes the typed-value checks. Raw columns get the sheet's
// own words and the typed columns their reading, together.
//
//   node scripts/migrate/m278-row-context.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { READ, rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm278';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const byRow = new Map();
for (const e of rowsOf(join(here, `${MIGRATION}-row-context.csv`))) { if (!byRow.has(e.id)) byRow.set(e.id, []); byRow.get(e.id).push(e); }
let cells = 0, rows = 0;
for (const [id, list] of byRow) {
  const r = t.get('measurements', id);
  let changed = false;
  for (const e of list) {
    if (r[e.column] === e.value) continue;
    onSheet(t, e.source, e.quote, MIGRATION);
    t.set('measurements', id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
    cells++; changed = true;
  }
  if (changed) {
    const note = `${READ} (${MIGRATION}): ${[...new Set(list.map((e) => e.column))].join(', ')} from the sheet's own line.`;
    if (!String(r.Notes ?? '').includes(`(${MIGRATION})`)) t.set('measurements', id, 'Notes', r.Notes && r.Notes !== 'Not applicable' ? `${r.Notes} ${note}` : note, { expect: r.Notes, migration: MIGRATION });
    rows++;
  }
}
t.save();
console.log(`${MIGRATION}: ${cells} cells on ${rows} measurements read from their own lines`);
