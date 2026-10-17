#!/usr/bin/env node
// Migration m436 (2026-10-17): what the material pages' blind read traced to the held sheets and found the records
// missing or misreading (D142 round, step 5; D123: a value a registered sheet prints and nobody transcribed is recorded).
// Every value and quote is checked here on its cached sheet (onSheet); read by Claude Opus on each page.
//
// Added, never transcribed:
//   QIDI PET-GF (R-QIDI-PET-GF p. 3): "拉伸模量（X-Y） 4130.13 ± 107.0 Mpa ... Young's modulus(X-Y)", beside the Z modulus
//     already held (V008161); the page's annealing statement (PC00085) reaches it as it reaches the others.
//   Fillamentum Nylon FX256 (its data sheet p. 1): "Heat distortion temperature ... 110 °C ISO 75 0,45 MPa", beside the
//     50 °C at 1,8 MPa already held (V011114).
//   BASF Ultrafuse TPS 90A (its data sheet p. 3): the ZX column, which the sheet heads "Upright", gives Stress at Break
//     2 MPa and Strain at Break 9 %; its Young's modulus in that column is held as Z (V011878, D92), these were not.
// Flagged physically implausible, the number kept (AGENTS "Flag a value physics rules out"):
//   Fiberlogy CPE ANTIBAC and CPE HT's notched Izod of 93 kJ/m² on their product pages and data sheet (V005511, V014804,
//     V013131), as their sibling V015362 (92) already was: a copolyester's notched bar breaks near 5 to 10 kJ/m², and
//     93 is the size of the resin's notched Izod in J/m.
//   Stratasys FDM PA6/66-GF30-FR's HDT at 264 psi in XY, 35 °C (V009370), beside 153 °C in XZ and 161 °C at 66 psi in
//     XY on the same table: a heavier load cannot take a glass-filled nylon's bar from 161 to 35 °C.
// A test held under the wrong name (its guess of the test, m391's "Another test", leaves through the ledger): 3D4Makers PPSU's "Tensile Impact Strength 3.18 mm ASTM D1822 399 kJ/m²" (V006953)
//   was "Impact strength", the test-unclear class, so pages showed it as the nearest Charpy and Izod; ASTM D1822 is a
//   tensile-impact test, now a property of its own (Tensile impact strength), compared with neither.
// Statements cut at a line break, completed with the line the sheet continues on:
//   Bambu Lab PPA-CF (B-ppa-cf-TDS p. 3) acid, alkali and organic solvent rows (Q00227 to Q00229), which lost "not
//   resistant to strong acids" and the like; Spectrum's 2024 portfolio (p. 3) ABS Medical row (Q06367), "... USP Class
//   VI or" + "ISO 10993-1 certifications".
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m436-what-the-blind-read-traced-to-the-sheets.mjs
import { openTables } from '../data/table-io.mjs';
import { addValue, withNote } from '../lib/source-edits.mjs';
import { onSheet } from '../lib/sweep-shared.mjs';

const MIGRATION = 'm436';
const DATE = '2026-10-17';
const WHY = 'published in the source, never transcribed; found by the material pages\' blind read (D142 round, step 5) and read on the cached sheet.';
const t = openTables();
let n = 0;

// ---- values added
const add = (like, quote, set) => {
  onSheet(t, set.SourceID ?? t.get('measurements', like).SourceID, quote, MIGRATION);
  const id = addValue(t, { like, set, migration: MIGRATION, date: DATE, why: WHY });
  if (id) n++;
};
add('V008161', '4130.13 ± 107.0 Mpa | Young’s modulus(X-Y)', {
  'Raw value': '4130.13 ± 107.0 Mpa', 'Raw unit': 'MPa', 'Raw numeric': '4130.13', 'Raw uncertainty ±': '107', 'Conversion factor': '0.001',
  'Normalized value': '4.13013', 'Normalized uncertainty ±': '0.107', 'Normalized unit': 'GPa', Direction: 'XY', Notch: 'Not applicable',
  'Specimen type': 'Printed specimen', 'Standard / load': 'ISO 527', Standards: 'ISO 527', Locator: 'p. 3: 拉伸模量（X-Y） Young’s modulus(X-Y)',
});
add('V011114', '110 °C ISO 75 0,45 MPa', {
  'Raw value': '110 °C', 'Raw numeric': '110', 'Normalized value': '110', 'Standard / load': '0,45 MPa ISO 75', 'Test load MPa': '0.45', Direction: 'Not applicable',
  Notch: 'Not applicable', 'Specimen type': 'Not published (do not assume printed)', Locator: 'p. 1: Heat distortion temperature 110 °C ISO 75 0,45 MPa',
});
const upright = 'Print direction Standard XY XZ ZX | Flat On its edge Upright';
add('V011878', `${upright} | Stress at Break, TPE ISO 527 7 MPa / 1.0 ksi - 2 MPa / 0.3 ksi`, {
  Property: 'Tensile break strength', 'Raw value': '2 MPa / 0.3 ksi', 'Raw unit': 'MPa', 'Raw numeric': '2', 'Conversion factor': '1', 'Normalized value': '2',
  'Normalized unit': 'MPa', Direction: 'Z', Notch: 'Not applicable', 'Specimen / print parameters': 'Print direction ZX, Upright', Locator: 'p. 3: Stress at Break, TPE ISO 527 (ZX, Upright)',
});
add('V011341', `${upright} | Strain at Break, TPE ISO 527 280 % - 9 %`, {
  'Raw value': '9 %', 'Raw numeric': '9', 'Normalized value': '9', Direction: 'Z', Notch: 'Not applicable',
  'Specimen / print parameters': 'Print direction ZX, Upright', Locator: 'p. 3: Strain at Break, TPE ISO 527 (ZX, Upright)',
});

// ---- flagged physically implausible
const IZOD = 'Flagged physically implausible (m436, 2026-10-17): a notched Izod bar of a copolyester breaks near 5 to 10 kJ/m², and 93 is the size of the resin\'s notched Izod in J/m, as its sibling V015362 was flagged. The number is kept as printed and backs nothing.';
const flag = (id, value, quote, why) => {
  const r = t.get('measurements', id);
  if (r['Normalized value'] !== value) throw new Error(`${MIGRATION}: ${id} holds ${r['Normalized value']}, not ${value}`);
  onSheet(t, r.SourceID, quote, MIGRATION);
  if (r['Data status'] === 'Published value (physically implausible)') return;
  t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, why), { expect: r.Notes, migration: MIGRATION });
  n++;
};
flag('V005511', '93', 'Izod Impact Strength (Notched)', IZOD);
flag('V014804', '93', '93', IZOD);
flag('V013131', '93', '93', IZOD);
flag('V009370', '35', 'HDT @ 264 psi 35 °C (95 °F) 153 °C (307.4 °F)',
  'Flagged physically implausible (m436, 2026-10-17): the same table gives 153 °C in XZ at 264 psi and 161 °C in XY at 66 psi; a heavier load cannot take a glass-filled nylon\'s bar from 161 to 35 °C. The number is kept as printed and backs nothing.');

// ---- a tensile-impact test under its own name
if (!t.rows('properties').some((r) => r.Property === 'Tensile impact strength')) {
  t.append('properties', { Property: 'Tensile impact strength', Domain: 'mechanical', Units: 'kJ/m²', 'Applies to': '', 'Not applicable reason': '',
    Description: 'A tensile-impact test (ASTM D1822, ISO 8256): a bar pulled to break by a pendulum. Neither a Charpy nor an Izod result, and compared with neither.', 'Replaced by': '' });
  n++;
}
{
  const r = t.get('measurements', 'V006953');
  onSheet(t, r.SourceID, 'Tensile Impact Strength', MIGRATION);
  if (r.Property === 'Impact strength') {
    t.set('measurements', 'V006953', 'Property', 'Tensile impact strength', { expect: 'Impact strength', migration: MIGRATION });
    t.set('measurements', 'V006953', 'Notes', withNote(r.Notes, 'Property Tensile impact strength since m436 (2026-10-17): the row names ASTM D1822, a tensile-impact test, not a test unclear between Charpy and Izod.'), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
  // Its guess of the test (impact_test_guesses, m391: "Another test", "a tensile impact strength (ASTM D1822 ...)") is
  // for a result whose test is unclear; the build now refuses it (IMPACT-GUESS-PROPERTY), the property saying what the
  // guess said. It leaves through the ledger (D72, D123).
  if (t.rows('impact_test_guesses').some((g) => g.MeasurementID === 'V006953')) {
    if (t.get('impact_test_guesses', 'V006953')['Likely test'] !== 'Another test') throw new Error(`${MIGRATION}: V006953's guess is not "Another test"`);
    t.remove('impact_test_guesses', 'V006953', { migration: MIGRATION, where: 'measurements.csv V006953 Property "Tensile impact strength" (m436): the property now says what the guess said, a tensile-impact test, and the build refuses a guess for a result whose test is named' });
    n++;
  }
}

// ---- statements completed with the line their sheet continues on
const complete = (id, before, after, quote) => {
  const r = t.get('evidence', id);
  onSheet(t, r.SourceID, quote, MIGRATION);
  if (r.Finding === after) return;
  t.set('evidence', id, 'Finding', after, { expect: before, migration: MIGRATION });
  n++;
};
complete('Q00227', 'Better than general Nylon; resistant to weak acids, but', 'Better than general Nylon; resistant to weak acids, but not resistant to strong acids', 'not resistant to strong acids');
complete('Q00228', 'Better than general Nylon; resistant to weak alkalis, but', 'Better than general Nylon; resistant to weak alkalis, but not resistant to strong alkalis', 'not resistant to strong alkalis');
complete('Q00229', 'Better than general Nylon; resistant to most kinds of', 'Better than general Nylon; resistant to most kinds of organic solvents', 'Resistance to Organic Solvent | organic solvents');
complete('Q06367', 'Manufactured using ABS pellets that meet the biocompatibility requirements of USP Class VI or', 'Manufactured using ABS pellets that meet the biocompatibility requirements of USP Class VI or ISO 10993-1 certifications', 'USP Class VI or | ISO 10993-1 certifications');

if (n) t.save();
console.log(`${MIGRATION}: ${n} record(s): values added, flagged, a test named, statements completed`);
