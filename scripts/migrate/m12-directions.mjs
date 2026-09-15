#!/usr/bin/env node
// Migration m12: directions the data sheets state, re-read 2026-09-14 (D35; SHA-256 matched). Lint
// MEAS-PRINTED-NO-DIRECTION listed nine printed mechanical rows with no direction; two sheets print it:
//  - PolyMax PETG-ESD p. 3: "Notched charpy impact strength (X-Y)"; the label wraps over two lines.
//  - PolyMide CoPA p. 4: "Charpy impact strength (X-Y)" in the conditioned table.
// The other seven stay unstated: Panchroma's table and charts give no impact direction, Eryone PETG-GF's bending
// rows give none, and its "X-Z" tensile rows were deliberately left unstated (their Notes say why).
// Same shape as m10's corrections; re-runnable, and stops if the data moved.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const DATE = '2026-09-14';
export const CORRECTIONS = [
  { source: 'S-POLYCN-PolyMax-PETG-ESD-TDS-V5-3', ids: ['V000534'],
    set: { Direction: ['Not published', 'XY'], Locator: ['p. 3: Notched charpy impact', 'p. 3: Notched charpy impact strength (X-Y)'] },
    note: 'p. 3 prints "Notched charpy impact strength (X-Y)" across two lines.' },
  { source: 'S-POLYCN-PolyMide-CoPA-TDS-V5-2', ids: ['V001043'], set: { Direction: ['Not published', 'XY'] },
    note: 'p. 4 prints "Charpy impact strength (X-Y)".' },
];

const NA = 'Not applicable';
export function migrate(t) {
  for (const c of CORRECTIONS) {
    for (const id of c.ids) {
      const row = t.get('measurements', id);
      if (row.SourceID !== c.source) throw new Error(`m12: ${id} cites ${row.SourceID}, not ${c.source}`);
      const text = `Direction recorded ${DATE} (m12) from the data sheet: ${c.note}`;
      let changed = false;
      for (const [field, [from, to]] of Object.entries(c.set)) {
        if (row[field] === to) continue;
        t.set('measurements', id, field, to, { expect: from });
        changed = true;
      }
      if (changed) t.set('measurements', id, 'Notes', row.Notes === NA ? text : `${row.Notes} ${text}`, { expect: row.Notes });
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.table} ${c.record} ${c.field}: ${c.before} -> ${c.after}`);
}
