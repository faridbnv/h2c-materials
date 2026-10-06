#!/usr/bin/env node
// Migration m377 (2026-10-05): what check round 3's readers found on the pages the code could not confirm, and the
// families each finding named (D131; docs/audits/2026-10-05-check-round-3/read/: 540 records read on their page images
// by Claude Sonnet readers, each fix decided by Claude Opus).
//
// The readers kept 511 of 540 records. None of the 29 they changed held a wrong number: each was a cell holding words
// that are not its own, a statement read for rows it does not speak for, or a condition dropped.
// - Words of the row label inside the cell: Spectrum's sheets print "Closed chamber for printing | not necessary", and 30
//   profiles held "for printing not necessary"; Polymaker's and Raise3D's older sheets print "Recommended environmental
//   temperature | Room temperature - 45 (˚C)", and 14 held the label with the answer. Each now holds the answer.
// - 3DXTECH's sheets print "Deflection Temperature at 0.45 MPa (66psi) | ISO 75 | °C"; the import joined the load with
//   the unit and held "0.45 °C ISO 75" as the standard and load on 27 values. Each now holds "ISO 75, 0.45 MPa (66psi)".
// - One cell each: a word a wrapped line dropped (purefil PA6 GF10's "closed pressure room"), a neighbouring column's
//   bullet (Spectrum PC FR's enclosure), an editor's tag (Spectrum PPS's chamber), a paraphrase (Eryone PETG-GF's
//   "closed printing"), a stray ", 4 h" (3DXTECH 3DXMAX PC's drying); Polymaker HT-PLA-GF's chamber, which was the test
//   bars' "Ambient temperature" (its recommendation prints none); Nanovia Insublend's drying, which dropped "when the
//   spools has been exposed to moisture for an extended period" and so read as required; Flashforge PA6-CF's heat
//   deflection, whose note says "the printed model has not been annealed"; an HDT that took the next row's X-Y; a
//   Stratasys PC heat deflection in a "Physical Properties - Printed" table; a Chinese sheet's standard held as "annealed".
// The families that need each row read on its page (annealing footnotes read for thermal rows on Polymaker's sheets,
// SUNLU's density specimen, Stratasys's printed thermal columns) are m378. Each quote is checked on the cached sheet. A
// re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m377-what-the-readers-found.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype, TYPED } from './m290-profile-settings.mjs';
import { withNote } from './source-edits.mjs';
import { cachedText } from '../lib/pdf-text.mjs';

const MIGRATION = 'm377';
const DATE = '2026-10-05';
const t = openTables();
let cells = 0;
const skipped = [];

/** Set a cell after checking its quotes on the cached sheet; a profile's typed cells follow its raw one. */
function fix(table, id, column, value, quotes, why) {
  const r = t.get(table, id);
  if (r[column] === value) return;
  // A sheet whose bytes the store does not hold cannot bear a quote out: its cell stays, and the round lists it.
  if (!cachedText(t.get('sources', r.SourceID)?.SHA256)) { skipped.push(`${id} ${column} (${r.SourceID})`); return; }
  for (const q of quotes) onCachedSheet(t, r.SourceID, q, MIGRATION);
  t.set(table, id, column, value, { expect: r[column], migration: MIGRATION });
  if (table === 'profiles' && TYPED[column]) retype(t, id, [column], MIGRATION);
  if (table === 'measurements') {
    const after = t.get(table, id);
    t.set(table, id, 'Notes', withNote(after.Notes, `Corrected ${DATE} (${MIGRATION}) on the page image: ${why}`), { expect: after.Notes, migration: MIGRATION });
  }
  cells++;
}

// Words of the row label inside the cell.
for (const p of t.rows('profiles').filter((x) => /^for printing (?:not necessary|recommended)/i.test(x.Enclosure))) {
  fix('profiles', p.ProfileID, 'Enclosure', p.Enclosure.replace(/^for printing /i, ''), ['Closed chamber for printing'], 'the row label is "Closed chamber for printing"');
}
for (const p of t.rows('profiles').filter((x) => /^Recommended environmental temperature /i.test(x['Chamber °C']))) {
  fix('profiles', p.ProfileID, 'Chamber °C', p['Chamber °C'].replace(/^Recommended environmental temperature /i, ''), ['Recommended environmental temperature'], 'the row label is "Recommended environmental temperature"');
}
// The load read as a unit.
for (const m of t.rows('measurements').filter((x) => x['Standard / load'] === '0.45 °C ISO 75' && !x['Data status'].startsWith('Retired'))) {
  fix('measurements', m.MeasurementID, 'Standard / load', 'ISO 75, 0.45 MPa (66psi)', ['Deflection Temperature at 0.45', 'MPa (66psi)'], 'the sheet prints "Deflection Temperature at 0.45 MPa (66psi)" with ISO 75 and °C in their own columns; the load had been read as the unit ("0.45 °C ISO 75").');
}

// One cell each.
fix('profiles', 'P1257', 'Enclosure', 'Needs a warm room, or closed pressure room', ['Needs a warm room, or closed pressure'], '');
fix('profiles', 'P0120', 'Enclosure', 'recommended for larger prints', ['Closed chamber recommended for larger prints'], '');
fix('profiles', 'P0092', 'Chamber °C', 'active heated (60-80°C)', ['Closed chamber active heated (60-80°C)'], '');
fix('profiles', 'P0168', 'Enclosure', 'closed printing', ['Sealed printing closed printing'], '');
fix('profiles', 'P1634', 'Drying', '120C for 4+ hours', ['120C for 4+ hours'], '');
fix('profiles', 'P0019', 'Chamber °C', 'Not published', ['Environmental temperature Ambient temperature'], '');
fix('profiles', 'P1495', 'Drying', 'dehydrate Nanovia Insublend at 60°c for 4 hours or longer, when the spools has been exposed to moisture for an extended period', ['Nanovia Insublend at 60°c for 4 hours or longer, when the', 'spools has been exposed to moisture for an extended pe'], '');
cells += retype(t, 'P1495', ['Drying'], MIGRATION); // the condition makes the drying optional (the parser reads it since m377)
fix('measurements', 'V005171', 'Post-processing', 'Note: The above test parameter data are obtained from actual printing, and the printed model has not been annealed.', ['Note: The above test parameter data are obtained from actual printing, and the printed', 'model has not been annealed.'], 'the note under the table says the printed model was not annealed.');
fix('measurements', 'V005171', 'Post-processing state', 'as-printed', [], 'the note under the table says the printed model was not annealed.');
fix('measurements', 'V008078', 'Direction', 'Not applicable', ['ISO 75: Method B 101.1 °C (0.45MPa)'], 'the HDT row prints no direction; X-Y was the next row\'s label.');
fix('measurements', 'V009430', 'Specimen type', 'Printed specimen', ['Physical Properties - Printed'], 'the value sits in the "Physical Properties - Printed" table.');
fix('measurements', 'V009353', 'Standard / load', 'ISO 527', ['拉伸强度（X-Y）', '退火后'], 'the cell held "annealed", the column heading of the value (退火后), where the sheet names ISO 527 for the test.');
fix('measurements', 'V009353', 'Standards', 'ISO 527', [], 'the sheet names ISO 527 for the test.');

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) corrected on the page images${skipped.length ? `; ${skipped.length} left, their sheet not in the store: ${skipped.join('; ')}` : ''}`);
