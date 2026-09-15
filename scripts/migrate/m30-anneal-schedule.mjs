#!/usr/bin/env node
// Migration m30: the annealing schedule a Post-processing wording states becomes two typed columns, Anneal °C and Anneal
// h, beside the wording (the pattern of D49). The estimate model kept repeats under different post-processing apart by
// their wording, so "annealed and dried at 55 °C for 8 h", "for 8 hours" and "for 8 h ours" (an extraction artefact)
// were three states of one schedule. It now reads the state and the schedule. The parser
// (build/src/normalize/specimen.js parseAnnealSchedule) fills the columns once and checks them on every build.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseAnnealSchedule } from '../../build/src/normalize/specimen.js';

const cell = (row, k) => {
  const s = parseAnnealSchedule(row['Post-processing']);
  if (!s) return 'Not applicable';
  return s[k] == null ? 'Not published' : String(s[k]);
};

export function migrate(t) {
  if (!t.header('measurements').includes('Anneal °C')) t.addColumn('measurements', 'Anneal °C', { after: 'Post-processing', fill: (r) => cell(r, 'tempC') });
  if (!t.header('measurements').includes('Anneal h')) t.addColumn('measurements', 'Anneal h', { after: 'Anneal °C', fill: (r) => cell(r, 'hours') });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
