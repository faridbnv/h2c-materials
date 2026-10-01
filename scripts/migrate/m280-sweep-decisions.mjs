#!/usr/bin/env node
// Migration m280 (2026-10-01): what the error-class sweep left for a decision, decided by Claude Opus from the cached
// sheet of each record (D35). The readers' proposals (m277–m279) were mechanical; these are the records where the
// sheet itself is inconsistent, or where a statement belongs to one table of a page and not to the page.
//
//   - 3D-Fuel Pro PCTG prints its heat distortion as "74/64" over "@0.455 MPa/@ 1.82 MPa" (p. 2, ASTM; p. 3, ISO 76/64).
//     The rows held the first number without its load, and the second was never recorded.
//   - MatterHackers PRO Series PLA's flexural modulus, 350 MPa beside a 73 MPa flexural strength (a 21 % outer-fibre
//     strain) and a 2,865 MPa tensile modulus, cannot be. (Its "HDT/A" over the method cell "D3418" needed no edit: the
//     load reader learned the slash spelling in this sweep, and the standard is the sheet's, kept as printed.)
//   - Extrudr DuraPro ABS CF prints "250°C" and "110°C" in the value cells of its two impact rows, where the sibling
//     DuraPro sheets print "220 / 23°C" and "90 / -30°C": a value or its test temperature is lost, and which is not
//     known.
//   - colorFabb LW-PLA-HT's "Injection Molded*" and "Thermal Properties*" tables are, by its footnote, "printed samples
//     of UNFOAMED PLA-HP": bars printed off the product's foaming recipe (D95), not raw material values.
//   - 3DJake's ecoPLA sheets head every table "(Printed, non-injection molded)"; the import filed the rows as raw
//     material values. A melt flow rate is measured on the melt, so it keeps its own words (page-context.js).
//   - colorFabb PA Blue Metal Detectable is "infused with metal detectable particles" (p. 1) and publishes 1.25 g/cm³:
//     a declared dense filler, filed under an unfilled nylon with no Variant (FILING-FILLER-WORD).
//
//   node scripts/migrate/m280-sweep-decisions.mjs
import { openTables } from '../data/table-io.mjs';
import { correct, addValue, withNote } from './source-edits.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm280';
const DATE = '2026-10-01';
const t = openTables();
const edit = (source, ids, set, note, quote) => { onSheet(t, source, quote, MIGRATION); return correct(t, { source, ids, set, note, migration: MIGRATION, date: DATE }); };
let n = 0;

// 3D-Fuel Pro PCTG: the load each heat distortion row is the first of, and the second value of each pair.
const FUEL = 'R-3D-FUEL-3D-Fuel-Pro-PCTG-TDS-9-2-25';
n += edit(FUEL, ['V007403', 'V007413'], { 'Test load MPa': ['Not published', '0.45'] },
  'the sheet prints the heat distortion pair over "@0.455 MPa/@ 1.82 MPa"; this row is the first, at 0.455 MPa.', 'ASTM D648 °C 74/64 | ISO 75 °C 76/64 | @0.455 MPa/@ 1.82 MPa');
for (const [like, page, standard] of [['V007403', 2, 'ASTM D648'], ['V007413', 3, 'ISO 75']]) {
  const id = addValue(t, {
    like, migration: MIGRATION, date: DATE, why: 'published in the source, never transcribed: the second of the sheet\'s "74/64" pair (the error-class sweep, data audit 2026-10-01 RC4).',
    set: { 'Raw value': '64 °C', 'Raw numeric': '64', 'Normalized value': '64', 'Standard / load': `${standard} @ 1.82 MPa`, Standards: standard, 'Test load MPa': '1.8',
      Locator: `p. ${page}: Heat Distortion Temperature ${standard} °C, second value (@ 1.82 MPa)` },
  });
  if (id) n++;
}

// MatterHackers PRO Series PLA: the HDT/A load explained, the flexural modulus flagged.
const MH = 'R-MATTERHACKERS-PRO-SERIES-8AWUF9';
onSheet(t, MH, 'Heat deflection temp. HDT/A 75-80°C | D3418 | Flexural Strength 73 MPa | Flexural Modulus 350 MPa | Tensile Modulus 2,865 MPa', MIGRATION);
n += correct(t, { source: MH, ids: ['V008748'], migration: MIGRATION, date: DATE,
  set: { 'Data status': ['Published value', 'Published value (physically implausible)'] },
  note: 'a 73 MPa flexural strength over a 350 MPa flexural modulus is a 21 % outer-fibre strain, which a rigid PLA (2,865 MPa tensile modulus on the same sheet) does not reach before it breaks; one of the two is misprinted.' });

// Two more flexural pairs no rigid polymer reaches (MEAS-PHYSICS-FLEX-STRAIN): the value that is out of family is
// flagged. iSANMATE's 171 MPa is flagged already on the 3D4Makers reprint of the same table (V007147).
n += edit('I-PETG-TDS', ['V000417'], { 'Data status': ['Published value', 'Published value (physically implausible)'] },
  'a 171 MPa flexural strength over a 2,040 MPa flexural modulus is an 8 % outer-fibre strain, past where ISO 178 stops, and more than twice what an unfilled PETG reaches in bending (its tensile strength is 53 MPa); the 3D4Makers reprint of this table is flagged the same (V007147).',
  'Flexural Modulus 2040 MPa | Flexural Stress');
n += edit('S-PCGF-ASA-TDS', ['V010673'], { 'Data status': ['Published value', 'Published value (physically implausible)'] },
  'an 850~900 MPa flexural modulus under an 80~82.5 MPa flexural strength is a 9 % outer-fibre strain, past where ISO 178 stops, for a carbon-fibre ASA; the row names ISO 527, a tensile method, so the modulus is the suspect value.',
  'Flexural Modulus ISO 527 Mpa 850~900 | Flexural Strength ISO178 Mpa 80~82.5');

// Extrudr DuraPro ABS CF: the impact cells print a temperature, not a value.
n += edit('R-EXTRUDR-durapro-abs-cf-TDS-en', ['V004210', 'V004211'],
  { 'Data status': [/^Published value/, 'Unresolved unit / layout'] },
  'the value cell prints "250°C" (notched) and "110°C" (unnotched) where the sibling DuraPro sheets print "value / test temperature"; a value or its temperature is lost, so the number is not a result.',
  'Notched impact strength ASTM D256 kj/m² 250°C | Unnotched impact strength ASTM D256 kj/m² 110°C');

// colorFabb LW-PLA-HT: the starred tables are printed bars of the unfoamed material.
n += edit('R-COLORFABB-TDS-E-ColorFabb-LW-PLA-HT', ['V005969', 'V005970', 'V005971', 'V005972', 'V005973', 'V005974'],
  { 'Specimen type': ['Raw material value', "Printed off the product's recipe"] },
  'the "Injection Molded*" and "Thermal Properties*" tables are, by the sheet\'s footnote, "obtained from printed samples of UNFOAMED PLA-HP": a bar printed off the foaming recipe the product is meant for (D95).',
  'Mechanical Properties – Injection Molded* | *These results are obtained from printed samples of UNFOAMED PLA-HP');

// 3DJake ecoPLA: every table on the page is printed.
const JAKE = {
  'R-3DJAKE-3DJAKE-TDS-ecoPLA-Wood-v1-1': ['V008785', 'V008787', 'V008788', 'V008789'],
  'R-3DJAKE-3DJAKE-TDS-ecoPLA-Sparkling-0': ['V008799'],
  'R-3DJAKE-3DJAKE-TDS-magicPLA': ['V008826', 'V008828', 'V008829', 'V008830'],
  'R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-v1-1': ['V008975', 'V008976', 'V008977'],
  'R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-Rainbow-v1-1': ['V009127'],
};
for (const [source, ids] of Object.entries(JAKE)) {
  n += edit(source, ids, { 'Specimen type': ['Raw material value', 'Printed specimen'] },
    'the sheet heads its tables "(Printed, non-injection molded)"; the import filed the row as a raw material value.', '(Printed, non-injection molded)');
}

// colorFabb PA Blue Metal Detectable: a declared dense filler.
{
  const g = t.get('grades', 'G164-02');
  onSheet(t, g.SourceID, 'infused with metal detectable particles', MIGRATION);
  if (g.Variant !== 'declared dense filler') { t.set('grades', 'G164-02', 'Variant', 'declared dense filler', { expect: 'Not applicable', migration: MIGRATION }); n++; }
}

t.save();
console.log(`${MIGRATION}: ${n} records decided`);
