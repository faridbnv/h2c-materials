#!/usr/bin/env node
// Migration m372 (2026-10-05): records filed on another product than the one their sheet is for, and four heat-deflection
// values filed as Vicat (check round 3, D131; build/reports/duplicates/split-sources.csv, build/reports/table-detectors,
// mislabel; read on their page images by a Claude Sonnet reader, docs/audits/2026-10-05-check-round-3/leftovers/
// page-verdicts.csv, and decided by Claude Opus).
//
// Rows on the wrong product: a sheet's every record moves to the grade of the product the sheet names, with its ID, as a
// merge moves them (m302, D123), and the source names that grade.
// - SUNLU's "TECHNICAL DATA SHEET ISO PLA+" (SL-TE-WI-080, "Product Name: PLA+") was filed on SUNLU PLA (G001-37), whose
//   own sheet is SL-TE-WI-077. Its 13 values, its profile and its two statements move to G001-143, the grade whose
//   formulation key is this sheet (PLA+2.0, whose own sheet prints the same table). Plain PLA's spread no longer holds a
//   PLA+ sheet.
// - iSANMATE's "ABS玻纤原料物性表" (the glass-fibre ABS's property table) was filed on iSANMATE ABS (G027-50); its English
//   edition is on iSANMATE ABS Glass Fiber (G028-12), where its 8 values move (material ABS-GF).
// - Recreus's 2024 "Product: Filaflex 95A Foamy" sheet and its "Filaflex 95 Foamy" page were filed on FILAFLEX FOAMY
//   (82A to 60A, G150-01); they are the 95A product's (G150-03): 9 values, 2 profiles, 2 statements.
// - FormFutura ApolloX and ReForm rApollo values m342 filed on Spectrum FlameGuard ASA 275 (G031-15) go to ApolloX
//   (G031-36) and rApollo (G031-42), and two values of "Product name: 3DJAKE ABS" on Extrudr DURAPRO ABS (G027-11) go to
//   3DJake ABS (G027-34), where the other rows of each sheet are.
// Heat deflection filed as Vicat: two Filament2Print sheets head a row "Vicat Softening Temperature" and print "68°C @
// 1.8MPa ISO 75" and "70°C @ 0,45MPa ISO 75"; two FormFutura sheets head theirs "Viscat softening temp." and print ASTM
// D648 with "6.4mm, 18.6Kg (Unannealed)" and "@ 0.455 Mpa (66psi)". A load and the heat-deflection standard make each an
// HDT (a Vicat test has a needle load in newtons, not a bending stress): Property HDT with its load. The two Filament2Print
// values were flagged implausible as Vicat values; as HDT they are ordinary and the flag goes. (Two FormFutura rows
// headed "HDT" with "ISO 306", the Vicat standard, and no load are left as headed: nothing on the page decides between
// them, OPEN-PROBLEMS §32.)
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m372-rows-on-the-sheets-product.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm372';
const DATE = '2026-10-05';
const t = openTables();
let moved = 0, refiled = 0;

// [source, from grade, to grade, a quote naming the sheet's product, the product it names]
const SHEETS = [
  ['R-SUNLU-65301701781747847057', 'G001-37', 'G001-143', 'Product Name: PLA+', 'SUNLU PLA+ (SL-TE-WI-080), the table PLA+2.0 prints'],
  ['I-PLA-ABS-GF-TDS', 'G027-50', 'G028-12', 'ABS玻纤原料物性表', 'iSANMATE ABS Glass Fiber (its property table in Chinese)'],
  ['R-RECREUS-FILAFLEX-95A-FOAMY-TECHNICAL-DATA-SHEET-TDS-2024', 'G150-01', 'G150-03', 'Product: Filaflex 95A Foamy', 'FILAFLEX 95 FOAMY'],
  ['D-RECREUS-FILAFLEX-95-FOAMY-PAGE', 'G150-01', 'G150-03', '95 Foamy', 'FILAFLEX 95 FOAMY'],
  ['S-PET-TDS-ApolloX', 'G031-15', 'G031-36', 'ApolloX', 'FormFutura ApolloX'],
  ['S-PET-formfutura-tds-apollox2024', 'G031-15', 'G031-36', 'ApolloX', 'FormFutura ApolloX'],
  ['S-PET-formfutura-tds-reformrapollo', 'G031-15', 'G031-42', 'ReForm - rApollo', 'FormFutura ReForm - rApollo'],
  ['R-3DJAKE-3DJAKE-3DJake-ABS', 'G027-11', 'G027-34', 'Product name: 3DJAKE ABS', '3DJake ABS'],
];
const TABLES = { measurements: 'MeasurementID', profiles: 'ProfileID', evidence: 'EvidenceID' };
const gradeToken = (g) => new RegExp(`(?<![\\w-])${g}(?![\\w-])`);

for (const [sid, from, to, quote, product] of SHEETS) {
  const records = Object.entries(TABLES).flatMap(([table, pk]) => t.rows(table).filter((r) => r.SourceID === sid && r.GradeID === from).map((r) => [table, r[pk]]));
  if (!records.length) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  const material = t.get('grades', to).MaterialID;
  const why = `Moved ${DATE} (${MIGRATION}) from ${from} with its ID: the sheet is ${product}'s ("${quote}").`;
  for (const [table, id] of records) {
    const r = t.get(table, id);
    if (r.MaterialID !== material) t.set(table, id, 'MaterialID', material, { expect: r.MaterialID, migration: MIGRATION });
    t.set(table, id, 'GradeID', to, { expect: from, migration: MIGRATION });
    if (table === 'measurements') t.set(table, id, 'Notes', withNote(r.Notes, why), { expect: r.Notes, migration: MIGRATION });
    else t.set(table, id, 'Locator', `${r.Locator}; ${why}`, { expect: r.Locator, migration: MIGRATION });
    moved++;
  }
  // The source names the product it is for; the old grade stays named only while records of it remain on the sheet.
  const s = t.get('sources', sid);
  const remains = Object.keys(TABLES).some((table) => t.rows(table).some((r) => r.SourceID === sid && r.GradeID === from));
  let grades = s['Applicable grades'];
  if (!gradeToken(to).test(grades)) grades = remains ? `${grades}; ${to}` : grades.replace(gradeToken(from), to);
  else if (!remains) grades = grades.replace(new RegExp(`;?\\s*(?:M\\d{3} / )?${from}(?![\\w-])`), '');
  if (grades !== s['Applicable grades']) t.set('sources', sid, 'Applicable grades', grades, { expect: s['Applicable grades'], migration: MIGRATION });
}

// [measurement, the page's words, Test load MPa, Standard / load or null to keep it]
const HDT = [
  ['V009515', '68°C @ 1.8MPa ISO 75', '1.8', 'ISO 75; 1.8 MPa'],
  ['V009698', '70°C @ 0,45MPa ISO 75', '0.45', 'ISO 75; 0.45 MPa'],
  ['V013251', '6.4mm, 18.6Kg (Unannealed)', '1.8', null],
  ['V013266', '@ 0.455 Mpa (66psi)', '0.45', null],
];
for (const [id, words, load, standard] of HDT) {
  const m = t.get('measurements', id);
  if (m.Property === 'HDT') continue;
  onCachedSheet(t, m.SourceID, words, MIGRATION);
  t.set('measurements', id, 'Property', 'HDT', { expect: 'Vicat softening temperature', migration: MIGRATION });
  t.set('measurements', id, 'Test load MPa', load, { expect: m['Test load MPa'], migration: MIGRATION });
  if (standard) t.set('measurements', id, 'Standard / load', standard, { expect: m['Standard / load'], migration: MIGRATION });
  // ASTM D648's high load printed as a mass: 18.6 kgf/cm² is 1.82 MPa (264 psi), which the parser does not read.
  if (/18\.6Kg/.test(words)) t.set('measurements', id, 'Parse review', 'Fields: Test load MPa. The sheet prints ASTM D648\'s load as "18.6Kg" on a 6.4 mm bar: 18.6 kgf/cm² is 1.82 MPa (264 psi), the high load.', { expect: m['Parse review'], migration: MIGRATION });
  if (m['Data status'] === 'Published value (physically implausible)') t.set('measurements', id, 'Data status', 'Published value', { expect: m['Data status'], migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Filed as HDT ${DATE} (${MIGRATION}): the row is headed Vicat, but it prints "${words}", a heat-deflection load and standard; a Vicat test has none.`), { expect: m.Notes, migration: MIGRATION });
  refiled++;
}
if (moved || refiled) t.save();
console.log(`${MIGRATION}: ${moved} record(s) moved to the product their sheet names; ${refiled} Vicat-headed value(s) filed as the HDT they print`);
