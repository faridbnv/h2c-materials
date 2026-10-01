#!/usr/bin/env node
// Migration m282 (2026-10-01): what `npm run audit:context` still found after the readers' corrections (m277–m279),
// decided by Claude Opus from each cached sheet.
//
//   - 3D4Makers' LUVOCOM PPS-CF 9938 sheet prints "dry" in the test condition of each mechanical row; no card covered it.
//   - Raise3D Industrial PET-CF's description says the annealed part reaches "over 6 GPa" tensile modulus: a bound, not
//     a point (its table values were never recorded; OPEN-PROBLEMS §28).
//   - Spectrum ASA Kevlar ("Ruby or hardened nozzle not necessary") and Extrudr Flax ("Hardened Nozzle no") held the
//     import's fibre sentence, "Use abrasion-resistant nozzle", in place of their own words.
//   - IPCON PPA-CF/GF and Extrudr DuraPro PC/PBT CF print a bed window two readers read differently ("100 – 120°" and
//     "100 – 120°C"; "100–110°" and "110 °C"); the sheets print "100 – 120°C" and "100–110°C". DuraPro PC/PBT CF's page
//     also says a hardened nozzle is required.
//   - The regression cases of the data audit that no reader's card reached (R10, R11, R14, R25, R28, R29, R31, R43,
//     R50–R52): read here from their lines.
//   - Three reviews that explained Polymaker's trailing "(recommended)", which the parser now reads (PARSE-REVIEW-STALE).
//   - SUNLU ABS-GF's bed window was typed with its ends and an unknown state, under a review that explains something
//     else (the one scoped review left that silences an unexplained difference).
//
//   node scripts/migrate/m282-context-leftovers.mjs
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseDrying, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { correct } from './source-edits.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm282';
const DATE = '2026-10-01';
const t = openTables();
let n = 0;

// LUVOCOM PPS-CF 9938: "dry" in each mechanical row's test condition.
const PPS = 'R-3D4MAKERS-TDS-pps-cf-9938-bk-filament-en-iso';
onSheet(t, PPS, 'Tensile strength dry, @50 mm/min | Flexural modulus dry, @2 mm/min | Charpy impact strength dry ISO 179', MIGRATION);
n += correct(t, { source: PPS, ids: ['V007158', 'V007159', 'V007160', 'V007161', 'V007162', 'V007163'], migration: MIGRATION, date: DATE,
  set: { 'Moisture condition': ['Not published', 'Dry'], 'Moisture state': ['not-stated', 'dry'] },
  note: 'the row\'s own test condition prints "dry" (re-read by Claude Opus, error-class sweep).' });

// Raise3D Industrial PET-CF: "over 6 GPa" is a lower bound.
const R3D = 'D-RAISE3D-Raise3D-Industrial-PET-CF-TDS-V4-0';
onSheet(t, R3D, 'tensile modulus and strength of over 6 GPa and 80 MPa respectively', MIGRATION);
n += correct(t, { source: R3D, ids: ['V007190'], migration: MIGRATION, date: DATE, set: { Operator: ['=', '>'] },
  note: 'the description says "over 6 GPa", a bound the annealed part exceeds, not a measured point (re-read by Claude Opus, error-class sweep).' });

// Print settings: the sheet's own words in the raw cell, the parser's reading in the typed ones (as m279).
const TYPED = { 'Bed °C': ['Bed state', 'Bed min °C', 'Bed max °C', 'Bed requirement'], 'Chamber °C': ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement'],
  Enclosure: ['Enclosure state'], Drying: ['Drying state', 'Drying °C', 'Drying hours'], 'Abrasion / clogging': ['Hardened nozzle'] };
const FIBRE_SENTENCE = 'Use abrasion-resistant nozzle; verify minimum orifice. Fibre concentration and length are grade-specific.';
const SETTINGS = [
  ['P0236', 'Abrasion / clogging', FIBRE_SENTENCE, 'Ruby or hardened nozzle not necessary', 'Ruby or hardened nozzle not necessary'],
  ['P1016', 'Abrasion / clogging', FIBRE_SENTENCE, 'Hardened Nozzle no', 'Hardened Nozzle no'],
  ['P1285', 'Bed °C', 'Not published', '100 – 120°C', 'Bed Temperature 100 – 120°C'],
  ['P1297', 'Bed °C', 'Not published', '100–110°C', 'a heated bed capable of reaching 100–110°C is recommended'],
  ['P1297', 'Abrasion / clogging', 'Not published', 'A hardened nozzle is required for printing', 'A hardened nozzle is required for printing'],
  // The regression cases of the data audit (R50–R52) the readers' cards did not reach.
  ['P0304', 'Chamber °C', 'Not published', '70 – 80 (recommended) (˚C)', 'Recommended environmental temperature 70 – 80 (recommended) (˚C)'],
  ['P0304', 'Enclosure', 'Not published', 'it is recommended to use an enclosure', 'When printing with PolyMax™ PC it is recommended to use an enclosure'],
  ['P0314', 'Enclosure', 'Not published', 'it is recommended to use an enclosure', 'When printing with Polymaker™ PC-PBT it is recommended to use an enclosure'],
  ['P1303', 'Drying', 'Not published', '70°C / 4 hours', 'Drying conditions: 70°C / 4 hours'],
  ['P1303', 'Enclosure', 'Not published', 'Enclosed chamber: required', 'Enclosed chamber: required'],
];
for (const [id, column, expect, value, quote] of SETTINGS) {
  const r = t.get('profiles', id);
  if (r[column] === value) continue;
  onSheet(t, r.SourceID, quote, MIGRATION);
  t.set('profiles', id, column, value, { expect, migration: MIGRATION });
  const row = t.get('profiles', id);
  const typed = profileCellsFromParsed({
    nozzle: parseTemperature(row['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(row['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(row['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(row.Enclosure), drying: parseDrying(row.Drying), abrasion: parseAbrasion(row['Abrasion / clogging']),
  });
  for (const c of TYPED[column]) if (row[c] !== typed[c]) t.set('profiles', id, c, typed[c], { expect: row[c], migration: MIGRATION });
  n++;
}

// Polymaker's "(recommended)" after a chamber window: the parser reads the mark since this sweep, so the three reviews
// that explained it explain nothing now (PARSE-REVIEW-STALE).
for (const id of ['P0303', 'P0315', 'P1250']) {
  const r = t.get('profiles', id);
  const now = r['Parse review'].replace(/^Fields: Chamber requirement\. The sheet marks the window "\(Recommended\)" after the numbers; the parser reads a recommendation only when the cell starts with the word, so the typed requirement is recommended/,
    'Fields: none. The sheet marks the window "(Recommended)" after the numbers, which the parser reads as a recommendation since m282; it typed it required before');
  if (now !== r['Parse review']) { t.set('profiles', id, 'Parse review', now, { expect: r['Parse review'], migration: MIGRATION }); n++; }
}

// The measurement regression cases of the data audit (R10, R11, R14, R25, R28, R29, R31, R43, R46) the readers' cards did not
// reach, each read here from its line.
const rows = [
  ['S-PET-TDS-Galaxy-PLA', ['V009589'], { 'Test temperature': ['Not published', '23° C (73° F)'] }, 'the row\'s line prints "Charpy Notched @23° C (73° F)".', 'Impact strength 3.4 KJ/m² ISO 179 Charpy Notched @23° C (73° F)'],
  ['R-FILAMENT2PRINT-Other-3b8e77', ['V009201'], { 'Standard / load': ['Not published', 'HDT-A ISO-R 75 Method A'], Standards: ['Not published', 'ISO 75'], 'Test load MPa': ['Not published', '1.8'] }, 'the line above the value prints "HDT-A ISO-R 75 Method A": ISO 75 method A, 1.8 MPa.', 'HDT-A ISO-R 75 Method A | Deflection temperature 162 °C'],
  ['R-3DJAKE-3DJAKE-14-TDS-hyper-PLA-CF-EN', ['V009029'], { 'Standard / load': ['Not published', 'ASTM D792 (ISO 1183, GB/T 1033)'], Standards: ['Not published', 'ASTM D792; ISO 1183; GB/T 1033'], 'Test temperature': ['Not published', '21.5˚C'] }, 'the row prints its standards over two lines ("ASTM D792 (ISO 1183, GB/T" and "1033)") and the density "at 21.5˚C".', 'ASTM D792 (ISO 1183, GB/T | 1033) | Density 1.21 ±0.1 (g/cm3 at 21.5˚C)'],
  ['R-QIDI-ODORLESS-ABS', ['V008054'], { 'Standard / load': ['Not published', 'ISO 527'], Standards: ['Not published', 'ISO 527'] }, 'the tensile block prints its method once, "ISO 527", for its rows.', 'ISO 527 | 2384.22±20.0 MPa'],
  ['R-STRATASYS-mds-fdm-pa6-66-gf30-fr-0726a', ['V009369', 'V009370'], { Direction: ['Not applicable', 'XY'] }, 'the HDT rows print an XY column and an XZ column; this is the XY value.', 'XY XZ | HDT @ 66 psi 161 °C (321.8 °F) 185 °C (365 °F) | HDT @ 264 psi 35 °C (95 °F) 153 °C (307.4 °F)'],
  ['I-PLA-TDS', ['V000041'], { Direction: ['Not published', 'Along flow'] }, 'the film row prints "MD", the machine direction, which is along the melt flow.', 'Elongation at Break MD ASTM D882 160%'],
  ['S-POLYCN-PolyLite-PC-TDS-V5-1', ['V003710'], { Direction: ['Not applicable', 'XY'], 'Test temperature': ['Not published', '-30°C'] }, 'the row prints "Low temperature impact strength (X-Y) -30°C".', 'Low temperature impact ISO 179-1/1eA:2010, 9.8 ± 0.5 kJ/m | strength (X-Y) -30°C'],
  ['R-EXTRUDR-biofusion-TDS-en', ['V010036'], { 'Raw value': ['12 kj/m²', '12 J/m'], 'Normalized unit': ['kJ/m²', 'J/m'] }, 'the value cell prints "12 J/m" under a column headed kj/m²; ASTM D256 reports J/m, so the cell\'s own unit stands (m278 took the raw unit, this the value and its normalized unit).', 'Impact resistance ASTM D256 kj/m² 12 J/m'],
  ['S-SPECTRUM-en-tds-spectrum-greenyht', ['V009207'], { 'Data status': ['Published value', 'Published value (physically implausible)'] }, 'a 900 MPa tensile modulus under a 52 MPa tensile strength is a 5.8 % strain at the peak, past the 4.70 % strain at break the same table prints, and under a third of its 3,000 MPa flexural modulus; the modulus is the misprint.', 'Tensile strength 52 MPa EN ISO 527-1 | Tensile modulus 900 MPa EN ISO 527-1 | Tensile Break at Strain 4,70% | Flexural Modulus 3000 MPa'],
];
for (const [source, ids, set, note, quote] of rows) {
  onSheet(t, source, quote, MIGRATION);
  n += correct(t, { source, ids, set, migration: MIGRATION, date: DATE, note: `${note} (re-read by Claude Opus, error-class sweep)` });
}

// SUNLU ABS-GF: m88 restored "90-100 °C" from the joined "90100" and typed its ends, but left the state unknown; the
// review m274 scoped to Bed state explains the joined digits, not the state.
{
  const r = t.get('profiles', 'P0795');
  if (r['Bed state'] !== 'range') {
    t.set('profiles', 'P0795', 'Bed state', 'range', { expect: 'unknown', migration: MIGRATION });
    t.set('profiles', 'P0795', 'Parse review', r['Parse review'].replace(/^Fields: Bed state\. /, 'Fields: none. '), { expect: r['Parse review'], migration: MIGRATION });
    n++;
  }
}

t.save();
console.log(`${MIGRATION}: ${n} records corrected`);
