#!/usr/bin/env node
// Migration m398 (2026-10-07): what the quality round's readers found wrong in cells, read on the page images (quality
// round 2026-10-07, items 2, 4 and 6; D134; docs/audits/2026-10-07-quality-round/decisions/, judged by Claude Opus).
//
// No digit was misread: of 483 numbers a text layer may have misprinted, and 126 more values on garbled pages, every
// one the readers checked on its image matches. What they found is words and conditions:
// - Drying asked for on a condition, read as required. QIDI's sheets say "If the filament has been opened for a long
//   time and problems such as air bubbles and stringing appear … please dry" or "After the material is damp … Please
//   dry … to restore the printing quality", and DuPont's guide "If excessive moisture absorption has occurred, then the
//   resin must be dried"; the cells held the schedule alone. Each cell now holds the sentence, and the drying parser reads
//   the condition (process.js): drying is optional for those products, as for every sheet that asks only when wet.
// - A nozzle window cut to its footnote: Spectrum's PET-G HT100 page prints 230-255 °C, and its footnote 245-270 °C
//   "for high speed"; the cell held the footnote alone.
// - A nozzle row missed: SUNLU's PCL sheet prints "Nozzle Temp. 75-85 ℃".
// - Conditions a row prints and the record dropped: a test temperature ("at 23°C" beside two densities, T = 210 °C for a
//   melt flow), an annealed HDT row ("wyżarzone"), a stray footnote digit in a standard cell ("2 ISO 180", "1 ISO 1133"),
//   a "≥" dropped from two decomposition temperatures, a notch an "Impact strength" row never names, a density whose page
//   names no specimen, and an elongation from the same ASTM D882 film table as its row's siblings.
// - What the page prints but cannot be (Data status "Published value (physically implausible)", reason in Notes): a
//   PEEK melt flow at 210 °C, two "melting temperatures" of amorphous ABS printed by ISO 294 (the moulding standard), and
//   Recreus PET-G's notched Charpy of 58 kJ/m² beside a notched Izod of 4.4 on the same sheet.
// - What cannot be read (Data status "Unresolved unit / layout"): two hardness values printed for one condition with no
//   label, and a TPU "tensile modulus" by ASTM D412, which is a stress at a stated elongation.
// - Values held back already, read again: each keeps its status and its note says what the page shows.
// Spectrum's 2024 portfolio profiles stay as read: each product's own sheet answers for it (OPEN-PROBLEMS §32). Rows a
// page statement already gives a state in the build (page_context.csv) are not touched.
//
// Each new cell's words are checked on the cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m398-what-the-readers-found-in-cells.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm398';
const DATE = '2026-10-07';
const IMPLAUSIBLE = 'Published value (physically implausible)';
const HELD = 'Unresolved unit / layout';
const t = openTables();
let cells = 0;
const set = (table, id, column, value, expect) => {
  const row = t.get(table, id);
  if (row[column] === value) return;
  if (row[column] !== expect) throw new Error(`${MIGRATION}: ${table} ${id} ${column} is "${row[column]}", not "${expect}"; the data moved`);
  t.set(table, id, column, value, { expect, migration: MIGRATION });
  cells++;
};
const note = (id, text) => {
  const m = t.get('measurements', id);
  if (m.Notes.includes(`(${MIGRATION})`)) return;
  t.set('measurements', id, 'Notes', `${m.Notes} ${text} (${MIGRATION})`.trim(), { expect: m.Notes, migration: MIGRATION });
  cells++;
};

// ---- drying asked for on a condition: [profile, the cell it held, the page's sentence, the lines that print it]
const DRYING = [
  ["P0760", "please dry the filament at 60-70°C for 4-6 hours", "If the filament has been opened for a long time and problems such as air bubbles and stringing appear during the printing process, please dry the filament at 60-70°C for 4-6 hours.", ["2. If the filament has been opened for a long time and problems such as air bubbles and stringing", "appear during the printing process, please dry the filament at 60-70°C for 4-6 hours."]],
  ["P0762", "Please dry the filament in an oven at 70-75°C for 4-6h", "After the material is damp, there will be more printing oozing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 70-75°C for 4-6h to restore the printing quality of QIDI PEBA 95A.", ["2. After the material is damp, there will be more printing oozing, bubbles extruded and", "rough printing surface. Please dry the filament in an oven at 70-75°C for 4-6h to restore", "the printing quality of QIDI PEBA 95A."]],
  ["P0922", "Please dry the filament in an oven at 80-100℃ for 4-6h", "After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 80-100℃ for 4-6h to restore the printing quality of QIDI PA612-CF.", ["After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing", "surface. Please dry the filament in an oven at 80-100℃ for 4-6h to restore the printing quality of QIDI", "PA612-CF."]],
  ["P1113", "Please dry the filament in an oven at 50°C for 4-6h", "After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 50°C for 4-6h to restore the printing quality of QIDI PLA-CF.", ["After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing", "surface. Please dry the filament in an oven at 50°C for 4-6h to restore the printing quality of QIDI", "PLA-CF."]],
  ["P1126", "please dry the filament at 70°C for 4-6 hours", "If the filament has been opened for a long time and problems such as air bubbles and stringing appear during the printing process, please dry the filament at 70°C for 4-6 hours.", ["2. If the filament has been opened for a long time and problems such as air bubbles and stringing appear", "during the printing process, please dry the filament at 70°C for 4-6 hours."]],
  ["P1138", "Please dry the filament in an oven at 70-80℃ for 4-6h", "After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 70-80℃ for 4-6h to restore the printing quality of QIDI TPU95A-HF.", ["After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing", "surface. Please dry the filament in an oven at 70-80℃ for 4-6h to restore the printing quality of QIDI", "TPU95A-HF."]],
  ["P1145", "Please dry the filament in an oven at 100-120℃ for 4-6h", "After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 100-120℃ for 4-6h to restore the printing quality of QIDI PET-GF.", ["2. After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing", "surface. Please dry the filament in an oven at 100-120℃ for 4-6h to restore the printing quality of", "QIDI PET-GF."]],
  ["P1246", "70-80°C for 4-6h", "If you find the printing quality decreases after ASA has been exposed in the air for a long time, please dry the filament at 70-80°C for 4-6h.", ["2. If you find the printing quality decreases after ASA has been exposed in the air for a long time, please dry the", "filament at 70-80°C for 4-6h."]],
  ["P1886", "80-100℃ for 4-6h", "After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing surface. Please dry the filament in an oven at 80-100℃ for 4-6h to restore the printing quality of QIDI S-White.", ["After the material is damp, there will be more printing ozzing, bubbles extruded and rough printing", "surface. Please dry the filament in an oven at 80-100℃ for 4-6h to restore the printing quality of QIDI", "S-White."]],
  ["P1436", "the resin must be dried at 80° C to less than 0,2% moisture content before processing", "If excessive moisture absorption has occurred, then the resin must be dried at 80° C to less than 0,2% moisture content before processing", ["If excessive moisture absorption has occurred, then the", "resin must be dried at 80° C to less than 0,2% moisture"]]
];
for (const [id, was, sentence, lines] of DRYING) {
  const p = t.get('profiles', id);
  if (p.Drying === sentence) continue;
  for (const l of lines) onCachedSheet(t, p.SourceID, l, MIGRATION);
  set('profiles', id, 'Drying', sentence, was);
  retype(t, id, ['Drying'], MIGRATION);
}

// ---- nozzle cells
onCachedSheet(t, t.get('profiles', 'P1578').SourceID, '245-270', MIGRATION);
set('profiles', 'P1578', 'Nozzle °C', '230-255°C; 245-270°C for high speed', '245-270°C for high speed');
retype(t, 'P1578', ['Nozzle °C'], MIGRATION);
onCachedSheet(t, t.get('profiles', 'P1612').SourceID, '75-85', MIGRATION);
set('profiles', 'P1612', 'Nozzle °C', '75-85℃', 'Not published');
retype(t, 'P1612', ['Nozzle °C'], MIGRATION);
const loc = t.get('profiles', 'P1612').Locator;
if (!loc.startsWith('p. 2: Nozzle Temp.')) set('profiles', 'P1612', 'Locator', `p. 2: Nozzle Temp.; ${loc}`, loc);

// ---- conditions a row prints
for (const id of ['V006454', 'V006536']) {
  set('measurements', id, 'Test temperature', '23°C', 'Not published');
  set('measurements', id, 'Test temperature °C', '23', 'Not published');
  note(id, `The page prints the density "at 23°C"; the row had dropped it (read ${DATE}, quality round).`);
}
set('measurements', 'V007101', 'Test temperature', '210 °C', 'Not published');
set('measurements', 'V007101', 'Test temperature °C', '210', 'Not published');
set('measurements', 'V007101', 'Standard / load', 'ISO 1133', '1 ISO 1133');
note('V007101', `The table's footnote 1 states the melt flow conditions T = 210 °C, m = 5.0 kg; the "1" in the standard cell was that footnote's mark (read ${DATE}).`);
set('measurements', 'V007891', 'Standard / load', 'ISO 180', '2 ISO 180');
note('V007891', `The "2" in the standard cell was the superscript of kJ/m2 (read on the page image ${DATE}).`);
set('measurements', 'V006278', 'Post-processing', 'wyżarzone', 'Not published');
set('measurements', 'V006278', 'Post-processing state', 'annealed', 'not-stated');
set('measurements', 'V006278', 'Anneal °C', 'Not published', 'Not applicable');
set('measurements', 'V006278', 'Anneal h', 'Not published', 'Not applicable');
note('V006278', `The row is labelled "HDT 1,81 MN/m2, wyżarzone" (annealed), with no schedule (read on the page image ${DATE}).`);
for (const [id, raw] of [['V008238', '≥330 ℃'], ['V008449', '≥423 ℃']]) {
  const m = t.get('measurements', id);
  set('measurements', id, 'Raw value', raw, m['Raw value']);
}
set('measurements', 'V008840', 'Notch', 'Not published', 'Notched');
note('V008840', `The row is headed only "Impact strength" (ASTM D256) and names no notch (read on the page image ${DATE}).`);
set('measurements', 'V001683', 'Specimen type', 'Not published (density specimen form not explicitly established)', 'Printed specimen');
note('V001683', `The page names no specimen for its density (read on the page image ${DATE}).`);
set('measurements', 'V009855', 'Specimen type', 'Film specimen (ASTM D882); not a printed or moulded bar', 'Not published (do not assume printed)');
note('V009855', `The value is the MD column of the sheet's ASTM D882 film table (TD 100 %), as its tensile rows V009853 and V009854 are (read ${DATE}).`);

// ---- what the page prints but cannot be
for (const [id, why] of [
  ['V004544', 'The sheet prints this PEEK melt flow at 210 °C / 2.16 kg, far below the 343 °C melting point the same sheet prints: no PEEK flows at 210 °C.'],
  ['V009060', 'The sheet prints a "melting temperature" of 235 ± 10 °C by ISO 294, the standard for moulding test specimens: ABS is amorphous and has no melting point, so this is a moulding temperature.'],
  ['V013240', 'The sheet prints a "melting temperature" by ISO 294, the standard for moulding test specimens: a moulding temperature, not a melting point.'],
  ['V014028', 'The sheet prints a notched Charpy of 58 kJ/m² beside a notched Izod of 4.4 kJ/m² for the same PET-G, and its other impact and abrasion rows carry wrong methods: a notched PETG bar does not absorb 58 kJ/m².'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] !== IMPLAUSIBLE) set('measurements', id, 'Data status', IMPLAUSIBLE, m['Data status']);
  note(id, `Flagged ${DATE}: ${why}`);
}
// ---- what cannot be read
for (const [id, why] of [
  ['V012299', 'The 80 % flow block prints two stacked hardness rows, 61 and 65 Shore A, with one density and no label telling which bar each is.'],
  ['V012300', 'The 80 % flow block prints two stacked hardness rows, 61 and 65 Shore A, with one density and no label telling which bar each is.'],
  ['V005648', 'ASTM D412 reports the stress at a stated elongation, not a tensile modulus; the sheet does not say at which elongation.'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] !== HELD) set('measurements', id, 'Data status', HELD, m['Data status']);
  note(id, `Held back ${DATE}: ${why}`);
}
// ---- held back already, read again on the page image
for (const [id, why] of [
  ['V002188', 'the sheet pairs ISO 75 method A with 0.45 MPa and B with 1.80 MPa (the standard has them the other way round), and its 75 °C at 1.80 MPa exceeds its 70 °C at 0.45 MPa'],
  ['V002189', 'the sheet pairs ISO 75 method A with 0.45 MPa and B with 1.80 MPa (the standard has them the other way round), and its 75 °C at 1.80 MPa exceeds its 70 °C at 0.45 MPa'],
  ['V004094', 'the row prints 100 "@ 23°C" under kj/m² with ASTM D256, which reports J/m'],
  ['V004095', 'the row prints 20 "@ -30°C" under kj/m² with ASTM D256 for an unnotched row'],
  ['V004210', 'the value cell of the kj/m² notched row prints "250°C", a temperature'],
  ['V004211', 'the value cell of the kj/m² unnotched row prints "110°C", a temperature'],
  ['V009746', '"Melt temperature °C 280" sits in the pellet-processing block, a processing setting'],
  ['V009496', '"Melt temperature : 160 - 230 °C" sits in the injection-moulding processing block'],
  ['V009620', 'the processing block prints "Melt temperature °C 230 - 60"'],
  ['V009651', 'the Vicat row\'s value cell is empty; 160 °C belongs to the maximum short-term use temperature row below it'],
  ['V007775', 'the Vicat row prints "-"; the 100 °C is another row\'s'],
  ['V006882', 'under the Vicat heading the row is "Ball Pressure Test, 125 °C, IEC 60695-10-2, Pass", a pass at 125 °C, not a softening temperature'],
  ['V006883', 'the row is "RTI Elec, UL 746, 170 °C", a relative thermal index, not a Vicat temperature'],
  ['V006884', 'the row is "RTI Imp, UL 746, 170 °C", a relative thermal index, not a Vicat temperature'],
  ['V006885', 'the row is "RTI Str, UL 746, 170 °C", a relative thermal index, not a Vicat temperature'],
  ['V011920', 'the 1600 MPa is in the Zytel 153HSL "50% RH" column, not this product\'s'],
  ['V012712', 'the 4.0 kJ/m² is the second table\'s, headed "3D Printed PLA Premium Printing"'],
  ['V012515', 'the row prints "800 kg / cm²" with ASTM D790, a flexural method, under "Tensile strength"'],
  ['V012492', 'the 50 °C comes from the description\'s prose about PLA in general, not from a value of this product'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] !== HELD) throw new Error(`${MIGRATION}: ${id} is no longer held back; the data moved`);
  note(id, `Read on the page image ${DATE} (quality round): it stays held back, as ${why}.`);
}
// ---- a standard cell that repeats the tensile rows' standard
for (const id of ['V002945', 'V006179', 'V003101']) note(id, `Read on the page image ${DATE} (quality round): the row's standard cell repeats the tensile rows' standard (${t.get('measurements', id)['Standard / load']}), a slip of the sheet; the value is the notched Charpy the row names.`);

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s)`);
