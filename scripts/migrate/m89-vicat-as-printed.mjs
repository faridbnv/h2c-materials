#!/usr/bin/env node
// Migration m89 (2026-09-20): a Vicat point whose state the sheet prints on the line under it.
//
// Polymaker's HT-PLA GF sheet, revision 1.2, prints
//
//   Vicat softening temp. ISO 306, GB/T 1633 148.9°C
//   (as printed)
//   ...
//   Vicat softening temp. ISO 306, GB/T 1633 148.3°C (annealed)
//
// The annealed row says so on its own line and the as-printed one says so on the next, and the reader was
// reading only the row's own line. So the 148.9 entered with no state at all, and the estimate model averaged it
// with the 148.9 the same product's revision 1.1 publishes as printed (V000348) into one observation of two
// states. test/database.test.js has guarded that since the 2026-09-15 audit and it failed.
//
// The reader now takes a line that is nothing but a bracketed phrase as belonging to the row above it, which is
// the only thing such a line can belong to. Re-read against every registered document, that rule changes the
// state of exactly one recorded row, and this is it.
//
//   node scripts/migrate/m89-vicat-as-printed.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const t = openTables();
const changed = correct(t, {
  source: 'S-POLYCN-TDS-Polymaker-HT-PLA-GF-V1-2-2025-12-09-EN',
  migration: 'm89-vicat-as-printed',
  date: '2026-09-20',
  ids: ['V003544'],
  set: { 'Post-processing': ['Not published', 'As printed'], 'Post-processing state': ['not-stated', 'as-printed'] },
  note: 'the sheet prints "(as printed)" on the line under this row, as it prints "(annealed)" on the same line as the 148.3 °C beside it',
});
t.save();
console.log(`${changed} row(s) corrected`);
