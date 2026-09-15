#!/usr/bin/env node
// Migration m19: post-processing states (audit 2026-09-15, finding C-01). Post-processing is now a vocabulary whose
// wordings declare a State (as-printed, annealed, not-stated), and an annealed value of a grade that publishes the
// same property as printed is no longer averaged with it in the estimate model.
//
// Polymaker HT-PLA-GF (G019-01) prints every thermal and mechanical result twice. The first block is as printed and
// the second annealed; m10 labelled the second block and left the first "Not published", so the estimate model could
// not tell the two states apart. Re-read 2026-09-15 (SHA-256 matched): p. 3 marks each Vicat and HDT row "(as printed)"
// or "(annealed)"; p. 4 prints the as-printed block first and the annealed block after it, as m10's re-read and the
// Polymaker Wiki copy of the sheet (R-POLYMAKER-WIKI-HTPLAGF) confirm.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm19';
const SOURCE = 'S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1';

export const AS_PRINTED = {
  'p. 3 marks the result "(as printed)"': ['V000348', 'V000349', 'V000350'],
  'p. 4 prints this result in the as-printed block, before the annealed block': ['V000354', 'V000355', 'V000356', 'V000357', 'V000358', 'V000359', 'V000360', 'V000361', 'V000362', 'V000363', 'V000364', 'V002050'],
};

export function migrate(t) {
  let changed = 0;
  for (const [note, ids] of Object.entries(AS_PRINTED)) {
    changed += correct(t, { source: SOURCE, ids, set: { 'Post-processing': ['Not published', 'As printed'] }, note: `Post-processing "As printed": ${note}.`, migration: MIGRATION, date: '2026-09-15' });
  }
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
