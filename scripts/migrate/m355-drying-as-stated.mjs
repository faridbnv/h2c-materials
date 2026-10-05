#!/usr/bin/env node
// Migration m355 (2026-10-05): drying as a sheet states it, not as a schedule that is always required (D127).
//
// parseDrying typed any drying text that was not "Not published" as stated and required. So 51 profiles whose sheets say
// drying is "not necessary", "not required" or "not needed" counted as a published drying schedule; "Optional", "if wet" and
// "only if the material has absorbed moisture" read as required; and an open duration ("6+ hours", "> 5 h", "at least 8
// hours", "Minimum Time 1 hour") lost its open end, or its hours altogether (P0149, P0994, P1376). Bambu Lab's guide prints
// "Dry Out Before Use: Optional" for some of its types.
//
// Two typed columns beside Drying state, °C and hours, on profiles and on print_guide (the guide's rows share the columns):
//   - Drying need: required, optional, not-needed or unknown (schema/vocab/drying-needs.csv);
//   - Drying hours open: TRUE where the stated time has no upper end (Drying hours is then its lower bound), FALSE for a
//     point or a window, Not applicable where no hours are stated.
// Drying state keeps its meaning (the sheet says something about drying), except that a cell holding only "/" says nothing
// and is unknown now. Every profile and every guide row is typed by the parsers, except in a column its Parse review explains
// (D115). P1376's review explained a duration the typed columns could not hold; they hold it now (5 h, open), and the
// review says so. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m355-drying-as-stated.mjs
import { openTables } from '../data/table-io.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm355';
const NP = 'Not published';
const DRYING = TYPED.Drying;
const NEW_COLUMNS = [['Drying need', 'Drying state'], ['Drying hours open', 'Drying hours']];
const P1376 = 'Fields: none. The source publishes a strict open lower bound (>5 h) with its minimum-time column. Retained verbatim in Drying; since m355 Drying hours holds the bound (5) and Drying hours open is TRUE, so no typed value needs explaining.';

// A guide row has no Abrasion / clogging column; the parsers read its drying cell alone.
const dryingOf = (row) => typedOf({ 'Nozzle °C': NP, 'Bed °C': NP, 'Chamber °C': NP, Enclosure: NP, Drying: row.Drying, 'Abrasion / clogging': NP });

const t = openTables();
const counts = { added: 0, retyped: 0, reviews: 0 };
for (const table of ['profiles', 'print_guide']) {
  const key = table === 'profiles' ? 'ProfileID' : 'PrintGuideID';
  const read = table === 'profiles' ? typedOf : dryingOf;
  for (const [column, after] of NEW_COLUMNS) {
    if (t.header(table).includes(column)) continue;
    t.addColumn(table, column, { after, fill: (r) => read(r)[column] });
    counts.added++;
  }
  for (const r of t.rows(table)) {
    const typed = read(r);
    const reviewed = reviewFields(r) ?? new Set();
    for (const c of DRYING) {
      if (r[c] === typed[c] || reviewed.has(c)) continue;
      t.set(table, r[key], c, typed[c], { expect: r[c], migration: MIGRATION });
      counts.retyped++;
    }
  }
}
const p1376 = t.get('profiles', 'P1376');
if (p1376['Parse review'] !== P1376) {
  t.set('profiles', 'P1376', 'Parse review', P1376, { expect: p1376['Parse review'], migration: MIGRATION });
  for (const c of ['Drying hours', 'Drying hours open']) {
    const typed = typedOf(t.get('profiles', 'P1376'))[c];
    if (t.get('profiles', 'P1376')[c] !== typed) t.set('profiles', 'P1376', c, typed, { expect: t.get('profiles', 'P1376')[c], migration: MIGRATION });
  }
  counts.reviews++;
}
t.save();
const need = {};
for (const r of t.rows('profiles')) need[r['Drying need']] = (need[r['Drying need']] ?? 0) + 1;
console.log(`${MIGRATION}: ${counts.added} column(s) added, ${counts.retyped} typed cell(s) read again, ${counts.reviews} review(s) rewritten; profiles by Drying need: ${JSON.stringify(need)}`);
