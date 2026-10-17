#!/usr/bin/env node
// Migration m420 (2026-10-17): five print windows the temperature parser had silently narrowed, typed again from their
// cells' own words (D141), and two Parse reviews brought up to date with the parser.
//
// The parser filtered the numbers of a cell by a plausibility window (nozzle 100–500 °C, bed and chamber 0–250 °C) and
// read the window from what was left, so a stated endpoint outside it vanished without a trace: LEHVOSS's LUVOCOM 3F
// PEEK CF 9676 BK prints "450 - 520 °C" and was typed as the single point 450 (P0940; the PEEK-CF drawer showed the
// cell's 450–520 beside a material window of 380–460); SUNLU's PCL prints "75-85℃" and was typed as no nozzle at all
// (P1612); iSANMATE's TPU prints "30 -500 ºC" for the bed and was typed as the point 30 (P0050). It also read a number
// inside a word as a temperature: "50-60℃(When using 3M adhesive to bond PP sheets)" gave a bed minimum of 3 °C
// (P0418), the same misread D115 records for "3D printers". And "Minimum 70˚C chamber temp highly recommended." was
// typed as the point 70–70 where it states an open bound (P1752). The typed columns were written from the parser
// (m08), so PARSE-MISMATCH, which compares the two, saw nothing. Found by the owner on 2026-10-17 in the PEEK-CF drawer;
// the sweep is docs/DECISIONS.md D141.
//
// The parser now reads every number a cell states (a nozzle size, a speed, a share, hours and a word with a number in
// it set aside first), reports one outside the window (PROCESS-WINDOW-IMPLAUSIBLE) instead of dropping it, and reads
// "Minimum 70 °C" as an open bound. Four windows are typed again from the parser's reading of their own cells: the
// typed endpoint is a number its cell states, which is what D115 asks, and the cells are the sheets' words as
// transcribed; the three sheets' hosts are denied to this session's network, so no page was read again. P0050's
// 500 °C bed is held: no printer's bed reaches 500 °C, the cell most likely slipped from a "30-50" the page prints, and
// the page cannot be read here, so its typed window keeps the 30 the cell states, under a review that says so, and
// the row is in docs/OPEN-PROBLEMS.md until the page is read. P1303's review explained the chamber endpoints the "3D"
// had produced, which the parser no longer reads, and P1906's explained the 95 the floor had dropped: each review is
// set to "Fields: none.", which PARSE-REVIEW-STALE would otherwise refuse; the parser reads P1303's sentence as the
// recommendation it is.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m420-a-plausibility-window-is-a-check-not-a-filter.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { retype } from '../../scripts/lib/profile-settings.mjs';

const MIGRATION = 'm420';
const t = openTables();
let cells = 0;

const note = (id, text, { expect }) => {
  const row = t.get('profiles', id);
  if (row['Parse review'] === text) return;
  t.set('profiles', id, 'Parse review', text, { expect, migration: MIGRATION });
  cells++;
};

// Typed again from the cell's own words, with a note on the row saying why the typed value moved.
const RETYPED = [
  ['P0940', 'Nozzle °C', { 'Nozzle max °C': '450' }, 'Fields: none. Nozzle max typed 520 as the cell states; the parser\'s 500 °C ceiling had dropped it and typed the point 450 (m420, D141).'],
  ['P1612', 'Nozzle °C', { 'Nozzle state': 'unknown' }, 'Fields: none. Nozzle typed 75–85 as the cell states; the parser\'s 100 °C floor had dropped both ends and typed no window (m420, D141).'],
  ['P0418', 'Bed °C', { 'Bed min °C': '3' }, 'Fields: none. Bed minimum typed 50 as the cell states; the 3 in "3M adhesive" names a maker, not a temperature (m420, D141).'],
  ['P1752', 'Chamber °C', { 'Chamber max °C': '70' }, 'Fields: none. "Minimum 70˚C" is an open bound: the typed maximum is Not published, where it was the point 70 (m420, D141).'],
];
for (const [id, column, expect, review] of RETYPED) {
  const row = t.get('profiles', id);
  for (const [c, v] of Object.entries(expect)) if (row[c] !== v && row['Parse review'] !== review) throw new Error(`${MIGRATION}: ${id} ${c} is ${row[c]}, not ${v}; the data moved`);
  cells += retype(t, id, [column], MIGRATION);
  note(id, review, { expect: 'Not applicable' });
}

// The drying reader, swept the same day: Polymaker brackets the unit ("65 (˚C)", P0030), Fiberlogy spells the hour "hr"
// ("8-12hr", P1914) and Kimya dries "if the material absorbs more than 500ppm moisture" (P1891), a condition the reader
// had not learnt; each typed again from its cell. And the hardened-nozzle reader read Stratasys's "Standard Fortus 450mc
// head or hardened Fortus 450mc head" as a requirement because the word is there (P1793, an unfilled ASA): held FALSE
// under a review, since a rule for "standard or hardened" would be written for one cell.
for (const [id, expect, review] of [
  ['P0030', { 'Drying °C': 'Not published' }, 'Fields: none. Drying °C typed 65 as the cell states; the reader had not read the bracketed unit "(˚C)" (m420, D141).'],
  ['P1914', { 'Drying hours': 'Not published' }, 'Fields: none. Drying hours typed 12 as the cell states ("8-12hr"); the reader had not read "hr" (m420, D141).'],
  ['P1891', { 'Drying need': 'required' }, 'Fields: none. Drying need typed optional: the cell dries "if the material absorbs more than 500ppm moisture", a condition the reader had not read (m420, D141).'],
]) {
  const row = t.get('profiles', id);
  for (const [c, v] of Object.entries(expect)) if (row[c] !== v && row['Parse review'] !== review) throw new Error(`${MIGRATION}: ${id} ${c} is ${row[c]}, not ${v}; the data moved`);
  cells += retype(t, id, ['Drying'], MIGRATION);
  note(id, review, { expect: 'Not applicable' });
}
{
  const row = t.get('profiles', 'P1793');
  if (row['Hardened nozzle'] === 'TRUE') { t.set('profiles', 'P1793', 'Hardened nozzle', 'FALSE', { expect: 'TRUE', migration: MIGRATION }); cells++; }
  note('P1793', 'Fields: Hardened nozzle. The sheet offers "Standard Fortus 450mc head or hardened Fortus 450mc head (requires hardened system upgrade)": the standard head prints it, so no hardened nozzle is needed; the reader takes the word "hardened" for a requirement (m420, D141).', { expect: 'Not applicable' });
}

// Held: the cell states a 500 °C bed, which no printer reaches and whose page cannot be read here.
note('P0050', 'Fields: Bed max °C. The cell prints "30 -500 ºC"; no printer\'s bed reaches 500 °C, and the page (I-TPU-TDS, iSANMATE TPU) could not be read again when the parser stopped dropping the number (its host is denied to the session). The typed window keeps the 30 the cell states until the page is read; OPEN-PROBLEMS lists it (m420, D141).', { expect: 'Not applicable' });

// Reviews narrowed to what still differs from the parser.
{
  const p = t.get('profiles', 'P1303');
  const was = p['Parse review'];
  if (was.startsWith('Fields: Chamber state, Chamber min °C, Chamber max °C, Chamber requirement.')) {
    note('P1303', was.replace('Fields: Chamber state, Chamber min °C, Chamber max °C, Chamber requirement.', 'Fields: none.') + ' The parser reads neither the 3 nor the sentence as anything but a recommendation now (m420).', { expect: was });
  }
  const q = t.get('profiles', 'P1906');
  const wasQ = q['Parse review'];
  if (wasQ.startsWith('Fields: Nozzle min °C.')) {
    note('P1906', wasQ.replace('Fields: Nozzle min °C.', 'Fields: none.').replace('so its parser drops the 95 and reads 130', 'so its parser dropped the 95 and read 130; since m420 (D141) it reads the 95 too'), { expect: wasQ });
  }
}

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) changed`);
