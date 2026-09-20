#!/usr/bin/env node
// Migration m84 (2026-09-20): the state BASF's Extended TDS prints beside each row, read back into it.
//
// b14 registered BASF's Extended TDS for Ultrafuse PAHT CF15 (R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5).
// That sheet publishes every property twice, conditioned and dry, and it says which by printing the word "dry"
// in the second row of each pair and nothing in the first. Read row by row, nine of its rows lost that: the
// conditioned ones recorded no moisture state at all, and two rows whose own label says "dry" lost it to the
// footnote mark glued to the word ("Flexural Strength dry7)").
//
// It was the build that found it. A nylon's heat deflection at 0.45 MPa was then two rows of one product — this
// sheet's 128 °C and the v4.0 sheet's dry 145 °C — with nothing to distinguish them, and the estimate model
// averaged a conditioned value with a dry one into a single observation of 136.5 °C. test/database.test.js has
// guarded that since the 2026-09-15 audit, and it failed.
//
// Which of a pair is which is not guessed: the sheet labels the second of each pair "dry", its own comparison
// charts are titled "conditioned, dry and annealed" with the legend in that order, and the physics agrees on
// every pair — a conditioned polyamide deflects lower than a dry one (91/92, 128/145, 192/205, 217/221).
//
// Four rows are left as they are and say so in Parse review: the sheet prints three values on each of its
// flexural and Charpy rows, and which column the recorded number came from is not something this sheet's text
// settles. Its dry flexural strength is one of them — 50.8 MPa against a conditioned row that reads
// "125.1 121.9 56.0 MPa" — and the physics rule that a bar bends harder than it pulls is what says so.
//
//   node scripts/migrate/m84-basf-extended-tds-conditioning.mjs

import { openTables } from '../data/table-io.mjs';
import { correct, withNote } from './source-edits.mjs';

const SOURCE = 'R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5';
const MIGRATION = 'm84-basf-extended-tds-conditioning';
const DATE = '2026-09-20';

const t = openTables();
let changed = 0;

// The first of each pair: the sheet prints the second one "dry" and this one plain, which is its conditioned row.
changed += correct(t, {
  source: SOURCE, migration: MIGRATION, date: DATE,
  ids: ['V007623', 'V007625', 'V007628', 'V007633', 'V007634', 'V007635', 'V007636'],
  set: { 'Moisture condition': ['Not published', 'Conditioned'], 'Moisture state': ['not-stated', 'conditioned'] },
  note: 'the sheet publishes every property twice and labels the second of each pair "dry"; this is the first, which is the conditioned one, and its own comparison charts read "conditioned, dry and annealed" in that order',
});

// And the two whose own label says dry, where the footnote mark stuck to the word hid it.
changed += correct(t, {
  source: SOURCE, migration: MIGRATION, date: DATE,
  ids: ['V007627', 'V007629'],
  set: { 'Moisture condition': ['Not published', 'Dry'], 'Moisture state': ['not-stated', 'dry'] },
  note: 'the row’s own label says dry ("Flexural Strength dry7) ISO 178"); the footnote mark against the word is what hid it',
});

// What the sheet does not settle, said in the column that exists for saying it.
for (const id of ['V007627', 'V007630', 'V007631', 'V007632']) {
  const row = t.get('measurements', id);
  const say = 'The sheet prints three values on this row and names no column; the recorded number is the one its line kept. Which specimen and which build direction it belongs to is not settled by this sheet.';
  if (row['Parse review'] === say) continue;
  t.set('measurements', id, 'Parse review', say, { expect: row['Parse review'] });
  t.set('measurements', id, 'Notes', withNote(row.Notes, `Reviewed ${DATE} (${MIGRATION}): ${say}`), { expect: row.Notes });
  changed++;
}

t.save();
console.log(`${changed} row(s) corrected against ${SOURCE}`);
