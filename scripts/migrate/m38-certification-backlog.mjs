#!/usr/bin/env node
// Migration m38: the second-formulation evidence the screening back-test is short of.
//
// Two evidence classes cannot screen because the back-test has too few honest cases. At maxWrongRate 0.1 and
// confidence 0.9 a screening limit needs 22 (build/src/estimate/screening.js minimumCases); build/snapshot/screening.csv
// holds hdt045 this-material at 18 and tensileStrengthXY this-material at 12. A case there needs a second formulation
// of a material whose headline is already measured (D48, D59).
//
// The 2026-09-15 workstream fetched and read eight data sheets that would supply them and imported none of them
// (docs/audits/2026-09-15-filtering-estimates-data/sources/open-items.md, section 3). This migration is that import.
// Seven are a second manufacturer for a Bambu material; the eighth is Flashforge PET-GF, which is already grade
// G068-01, so its rows need no new grade or source.
//
// NOTHING IN THIS FILE IS DATA YET. Every value reads <REREAD> and every digest reads <FILL>. Under D35 a value
// enters only from the fetched file, re-read page by page, with its SHA-256 recorded; the audit's readings are
// quoted beside each row as what a re-read should find, never as the value itself. The guard below refuses to run
// until each source is cached and its digest matches, so this cannot be run half-filled.
//
// To fill it:
//   1. npm run audit:sources                 (rebuilds .cache/sources and hash-checks what is already recorded)
//      or fetch each URL below into .cache/sources/<SourceID>.pdf by hand.
//   2. node docs/audits/2026-09-15-filtering-estimates-data/sources/extract-text.mjs <outDir> <SourceID>
//      and check the digest against the prefix in docs/audits/2026-09-17-data-gaps/ledgers/import-backlog.csv.
//   3. Put the digest in SHA256 and the sheet's own text in each Raw value, with the conditions the sheet states.
//   4. node scripts/migrate/m38-certification-backlog.mjs && npm run data:fmt && npm run verify
//      then npm run snapshot and read build/snapshot/screening.csv: hdt045 this-material should reach 26 and
//      certify; tensileStrengthXY should reach 20 and still need two more (see ledgers/strength-targets.csv).
//
// Deliberately not here:
//   - Polymaker PolyMax PC V5.3. An alternative second PC grade, not a second one beside PolyLite PC. Its 14.8 C
//     gap between the two loads would be a miss against the amorphous bracket limit of about 12.3 C. Owner's call.
//   - Stratasys FDM Nylon-CF10. Its base is "a blended nylon"; whether it is M053 PA12-CF or M050 PA6-CF is an
//     identity ruling (D57) and must be made before it can be filed.
//   - iSANMATE PLA Glass Fiber. M019 is already a strength case and the sheet has no thermal row, so it adds no
//     case. Its value is the composition conflict C00003, which is the safety-data-sheet sweep's job, not this one.

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm38';
const DATE = '<FILL: the date the sources were re-read>';
const NA = 'Not applicable';
const NP = 'Not published';
const FILL = '<FILL>';
const REREAD = '<REREAD>';
const ADDED = `Added ${DATE} (${MIGRATION}): re-read from the source document (SHA-256 recorded in sources.csv).`;

const PRINTED = 'Printed specimen';
const UNSTATED = 'Not published (do not assume printed)';
const THERMAL = { Direction: NA };

// ------------------------------------------------------------------------------------ sources
// Applicable grades names the GradeID this migration creates; the assertion after the grade loop proves it right.
const SOURCES = [
  { SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite ABS Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ABS_TDS_V5.3.pdf',
    Locator: '<REREAD: the page and section layout of the fetched sheet>',
    'Applicable grades': 'G027-02 (Polymaker PolyLite ABS, the second ABS formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite ASA Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ASA_TDS_V5.3.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G031-02 (Polymaker PolyLite ASA, the second ASA formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3', Publisher: 'Polymaker', Title: 'PolyLite PC Technical Data Sheet',
    Revision: 'V5.3', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_PC_TDS_V5.3.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G035-02 (Polymaker PolyLite PC, the second PC formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', Publisher: 'Polymaker', Title: 'PolyMax PC-FR Technical Data Sheet',
    Revision: 'V5.1', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_FR_TDS_V5.1.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G036-02 (Polymaker PolyMax PC-FR, the second PC FR formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'R-FIBERON-PETCF17-TDS', Publisher: 'Polymaker (Fiberon)', Title: 'Fiberon PET-CF17 Technical Data Sheet',
    Revision: 'V1.0', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PET-CF17_V1.0_EN.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G067-02 (Fiberon PET-CF17, the second PET-CF formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'R-FIBERON-PETGRCF08-TDS', Publisher: 'Polymaker (Fiberon)', Title: 'Fiberon PETG-rCF08 Technical Data Sheet',
    Revision: 'V1.0', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PETG-rCF08_V1.0_EN.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G024-02 (Fiberon PETG-rCF08, the second PETG-CF formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
  { SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v3-5', Publisher: 'BASF Forward AM', Title: 'Ultrafuse PAHT CF15 Technical Data Sheet',
    Revision: 'v3.5', 'Publication date': NP, 'Source class': 'Manufacturer TDS', 'Citation role': 'cited',
    URL: 'https://forward-am.com/wp-content/uploads/2024/10/Ultrafuse_PAHT_CF15_TDS_EN_v3.5-1.pdf',
    Locator: '<REREAD>', 'Applicable grades': 'G048-02 (BASF Ultrafuse PAHT CF15, the second PAHT-CF formulation)',
    'Access status': 'Retrieved', SHA256: FILL },
];

// ------------------------------------------------------------------------------------ grades
const GRADE_DEFAULTS = {
  Role: 'procurement', Status: 'active', Variant: NA, 'Certification claims': NP,
  'Colour caveat': 'Properties may vary by colour; use TDS scope',
  'Diameter compatibility': '<REREAD: the diameters the sheet lists; select 1.75 mm>',
};
const rationale = (material) => `Second ${material} manufacturer, added ${DATE} (${MIGRATION}): its published heat-deflection and strength values give the screening back-test a second-formulation case for this material (D48, D59).`;

const GRADES = [
  { key: 'polylite-abs', MaterialID: 'M027', Manufacturer: 'Polymaker', 'Product name': 'PolyLite ABS',
    'Shared formulation key': 'S-POLYCN-PolyLite-ABS-TDS-V5-3', 'Composition / filler': REREAD,
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3',
    'Source locator': 'V5.3, <REREAD: pages>', 'Selected-grade rationale': rationale('ABS') },
  { key: 'polylite-asa', MaterialID: 'M031', Manufacturer: 'Polymaker', 'Product name': 'PolyLite ASA',
    'Shared formulation key': 'S-POLYCN-PolyLite-ASA-TDS-V5-3', 'Composition / filler': REREAD,
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3',
    'Source locator': 'V5.3, <REREAD: pages>', 'Selected-grade rationale': rationale('ASA') },
  { key: 'polylite-pc', MaterialID: 'M035', Manufacturer: 'Polymaker', 'Product name': 'PolyLite PC',
    'Shared formulation key': 'S-POLYCN-PolyLite-PC-TDS-V5-3', 'Composition / filler': REREAD,
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3',
    'Source locator': 'V5.3, <REREAD: pages>', 'Selected-grade rationale': rationale('PC') },
  { key: 'polymax-pc-fr', MaterialID: 'M036', Manufacturer: 'Polymaker', 'Product name': 'PolyMax PC-FR',
    'Shared formulation key': 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', 'Composition / filler': REREAD,
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1',
    'Source locator': 'V5.1, <REREAD: pages>', 'Selected-grade rationale': rationale('PC FR') },
  { key: 'fiberon-pet-cf17', MaterialID: 'M067', Manufacturer: 'Polymaker (Fiberon)', 'Product name': 'Fiberon PET-CF17',
    'Shared formulation key': 'R-FIBERON-PETCF17-TDS', 'Composition / filler': '<REREAD: the sheet\'s own words; the product designation states 17 % carbon fibre>',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FIBERON-PETCF17-TDS',
    'Source locator': 'V1.0, <REREAD: pages>', 'Selected-grade rationale': rationale('PET-CF') },
  // Recycled carbon fibre. schema/vocab/grade-variants.csv has no value for it: unless one is added deliberately,
  // Variant stays Not applicable and the recycled fibre is said in Composition / filler (AGENTS.md, "Add a grade").
  { key: 'fiberon-petg-rcf08', MaterialID: 'M024', Manufacturer: 'Polymaker (Fiberon)', 'Product name': 'Fiberon PETG-rCF08',
    'Shared formulation key': 'R-FIBERON-PETGRCF08-TDS', 'Composition / filler': '<REREAD: the sheet\'s own words; the product designation states 8 % recycled carbon fibre>',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FIBERON-PETGRCF08-TDS',
    'Source locator': 'V1.0, <REREAD: pages>', 'Selected-grade rationale': rationale('PETG-CF') },
  { key: 'ultrafuse-paht-cf15', MaterialID: 'M048', Manufacturer: 'BASF Forward AM', 'Product name': 'Ultrafuse PAHT CF15',
    'Shared formulation key': 'R-FORWARDAM-PAHT-CF15-TDS-v3-5', 'Composition / filler': '<REREAD: the sheet\'s own words; the product designation states 15 % carbon fibre>',
    Availability: `Current official product listing retrieved ${DATE}`, SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v3-5',
    'Source locator': 'v3.5, <REREAD: pages>', 'Selected-grade rationale': rationale('PAHT-CF') },
];

const EXPECTED_GRADE_IDS = {
  'polylite-abs': 'G027-02', 'polylite-asa': 'G031-02', 'polylite-pc': 'G035-02', 'polymax-pc-fr': 'G036-02',
  'fiberon-pet-cf17': 'G067-02', 'fiberon-petg-rcf08': 'G024-02', 'ultrafuse-paht-cf15': 'G048-02',
};

// ------------------------------------------------------------------------------------ measurements
const M_DEFAULTS = {
  'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1',
  'Normalized uncertainty ±': NA, 'Normalized upper bound': NA,
  'Data status': 'Published value', 'Specimen type': UNSTATED,
  Direction: NP, 'Moisture condition': NP, 'Post-processing': NP, 'Anneal °C': NA, 'Anneal h': NA,
  'Test temperature': NP, 'Test load MPa': NA, Notch: NA,
  'Specimen / print parameters': NP, Notes: NA, 'Parse review': NA,
};

/**
 * One value to re-read. `expected` is the 2026-09-15 audit's reading of the sheet, kept only so a re-read can be
 * checked against it; it is never written to the tables. Raw value, Raw numeric and Normalized value stay <REREAD>
 * until the page is read, and the parser reconciles raw x factor with the normalized value (MEAS-RAW-RECONCILE).
 */
const row = (Property, unit, over, expected) => ({
  ...M_DEFAULTS, Property,
  'Raw value': REREAD, 'Raw unit': REREAD, 'Raw numeric': REREAD,
  'Normalized value': REREAD, 'Normalized unit': unit,
  'Standard / load': REREAD, Locator: REREAD, ...over, expected,
});

// Minimum per grade: the two heat-deflection loads (0.45 gives the hdt045 case and, with 1.8, a load-bracket pair),
// the glass transition or melting point its matrix class uses, and the XY strength value. kindOf accepts a flexural
// strength for tensileStrengthXY, which is what the Polymaker sheets publish as "Bending strength (X-Y)".
const MEASUREMENTS = {
  'polylite-abs': { MaterialID: 'M027', SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p3 "Heat deflection temperature ISO 75 1.8MPa 98.2 °C"'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p3 "0.45MPa 99.6 °C"'),
    row('Glass transition temperature', '°C', THERMAL, 'p3 "Glass transition temperature DSC 101.1 °C"'),
    row('Flexural strength', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p4 "Bending strength (X-Y) 56.2 ± 0.3 MPa"'),
  ] },
  'polylite-asa': { MaterialID: 'M031', SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p3 HDT 1.8 MPa 100.2 °C'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p3 HDT 0.45 MPa 102.6 °C'),
    row('Glass transition temperature', '°C', THERMAL, 'p3 Tg 97.8 °C'),
    row('Flexural strength', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p4 "Bending strength (X-Y) 60.9 ± 0.9 MPa"'),
  ] },
  'polylite-pc': { MaterialID: 'M035', SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p3 HDT 1.8 MPa 106.6 °C'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p3 HDT 0.45 MPa 111.2 °C'),
    row('Glass transition temperature', '°C', THERMAL, 'p3 Tg 113.4 °C'),
    row('Flexural strength', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p4 "Bending strength (X-Y) 106.1 ± 1.6 MPa"'),
  ] },
  'polymax-pc-fr': { MaterialID: 'M036', SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p3 HDT 1.8 MPa 107 °C'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p3 HDT 0.45 MPa 110 °C'),
    row('Glass transition temperature', '°C', THERMAL, 'p3 Tg 115 °C'),
    row('Flexural strength', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p4 "Bending strength (X-Y) 96.6 ± 1.3 MPa"'),
  ] },
  'fiberon-pet-cf17': { MaterialID: 'M067', SourceID: 'R-FIBERON-PETCF17-TDS', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p1 "Heat deflection temp. ISO 75 1.8MPa 105 °C"'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p1 "0.45MPa 147.5 °C". The 42.5 °C gap is above the semi-filled bracket limit of about 39 °C, so expect a bracket miss; that is evidence, not a reason to leave it out'),
    row('Melting temperature', '°C', THERMAL, 'p1 Tm 241.3 °C'),
    row('Tensile strength (endpoint unspecified)', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p1 "Tensile strength (X-Y) 65.9 ± 1.0 MPa"'),
  ] },
  'fiberon-petg-rcf08': { MaterialID: 'M024', SourceID: 'R-FIBERON-PETGRCF08-TDS', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8' }, 'p1 HDT 1.8 MPa 65.7 °C'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45' }, 'p1 HDT 0.45 MPa 68.6 °C'),
    row('Glass transition temperature', '°C', THERMAL, 'p1 Tg 69.7 °C'),
    row('Tensile strength (endpoint unspecified)', 'MPa', { Direction: 'XY', 'Specimen type': PRINTED }, 'p1 "Tensile strength (X-Y) 59.8 ± 0.3 MPa"'),
  ] },
  // The sheet prints a dry and a conditioned column. Each row must say which it came from, or MEAS-CONDITIONS-INDISTINCT
  // fires: one Locator per value, and the Moisture condition wording the sheet uses (its State is declared in
  // schema/vocab/moisture-conditions.csv). A conditioned value is not a headline and bounds no elongation (D55).
  'ultrafuse-paht-cf15': { MaterialID: 'M048', SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v3-5', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8', 'Moisture condition': '<REREAD: the sheet\'s word for its dry column>' }, 'p3 "HDT at 1.8 MPa (dry) 92 °C"'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45', 'Moisture condition': '<REREAD: dry column>' }, 'p3 "HDT at 0.45 MPa (dry) 145 °C". Dry gap 53 °C: expect a semi-filled bracket miss'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '1.8', 'Moisture condition': '<REREAD: the sheet\'s word for its conditioned column>' }, 'p3 conditioned 91 °C'),
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '0.45', 'Moisture condition': '<REREAD: conditioned column>' }, 'p3 conditioned 128 °C'),
    // Open question the audit flagged: whether the p3/p4 bars are printed. Until the sheet says so the specimen
    // stays unstated, and an unstated specimen bounds nothing (D55) though it still gives the back-test its case.
    row('Tensile strength (endpoint unspecified)', 'MPa', { Direction: '<REREAD>' }, 'p4 "Tensile strength ISO 527 103.2 MPa ... 18.2 MPa" - two directions; read which is which'),
  ] },
};

// Flashforge PET-GF is already G068-01 on source D-FLASH-PETGF. If the page publishes a heat deflection or a
// strength, those rows are a case for M068 in both classes with no new grade and no new source. The audit did not
// re-read it, so what it publishes is unknown: fill these in or delete them.
const EXISTING_GRADE_ROWS = [
  { MaterialID: 'M068', GradeID: 'G068-01', SourceID: 'D-FLASH-PETGF', rows: [
    row('HDT', '°C', { ...THERMAL, 'Test load MPa': '<REREAD: the load the page states, if it states one>' }, 'not re-read in 2026-09-15; G068-01 holds no HDT row'),
    row('Tensile strength (endpoint unspecified)', 'MPa', {}, 'not re-read in 2026-09-15; G068-01 holds no strength row'),
  ] },
];

// ------------------------------------------------------------------------------------ coverage
// Adding a grade changes a material's manufacturer count, and a Grades row whose count or whose own words disagree
// with the records is a build error (COVERAGE-UNTRUE, D39). The finding is a function of the live count, so the
// prose and the column cannot drift apart. A row is never edited in place: it is superseded and replaced.
const COVERAGE_GRADES = ['M024', 'M027', 'M031', 'M035', 'M036', 'M048', 'M067'];

// ------------------------------------------------------------------------------------ the guard
/** Refuse to run until every source is fetched, cached and hash-matched (D35). */
function assertReadable(t) {
  const unfilled = [];
  const text = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  if (text.includes(FILL) || text.includes(REREAD) || DATE.startsWith('<')) unfilled.push('the file still holds <FILL> or <REREAD> placeholders');
  for (const s of SOURCES) {
    const path = join(projectRoot, '.cache/sources', `${s.SourceID}.pdf`);
    if (!existsSync(path)) { unfilled.push(`${s.SourceID}: not cached at .cache/sources/${s.SourceID}.pdf`); continue; }
    if (!/^[a-f0-9]{64}$/.test(s.SHA256)) { unfilled.push(`${s.SourceID}: no SHA-256 recorded`); continue; }
    const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (sha !== s.SHA256) unfilled.push(`${s.SourceID}: the cached file is ${sha.slice(0, 12)}, the migration expects ${s.SHA256.slice(0, 12)}`);
  }
  if (unfilled.length) {
    throw new Error(`${MIGRATION}: nothing entered. Under D35 a value enters only from a fetched, hashed source, re-read page by page.\n  - ${unfilled.join('\n  - ')}\nSee the header of this file for how to fill it.`);
  }
}

export function migrate(t) {
  assertReadable(t);

  for (const s of SOURCES) if (!t.find('sources', s.SourceID)) t.append('sources', { 'Access date': DATE, ...s });

  const gradeIds = {};
  for (const { key, ...g } of GRADES) {
    const existing = t.rows('grades').find((r) => r.SourceID === g.SourceID && r['Product name'] === g['Product name']);
    if (existing) { gradeIds[key] = existing.GradeID; continue; }
    const row = { ...GRADE_DEFAULTS, ...g, GradeID: nextId('grades', t.rows('grades').map((r) => r.GradeID), { materialId: g.MaterialID }) };
    t.append('grades', row);
    gradeIds[key] = row.GradeID;
  }
  for (const [key, id] of Object.entries(EXPECTED_GRADE_IDS)) {
    if (gradeIds[key] !== id) throw new Error(`${MIGRATION}: ${key} became ${gradeIds[key]}, not ${id}; the sources' "Applicable grades" name ${id}`);
  }

  const append = (MaterialID, GradeID, SourceID, rows) => {
    for (const r of rows) {
      if (t.rows('measurements').some((x) => x.SourceID === SourceID && x.Locator === r.Locator)) continue;
      const { expected, ...fields } = r;
      const row = { ...fields, MeasurementID: nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID)), MaterialID, GradeID, SourceID };
      row.Notes = row.Notes === NA ? ADDED : `${ADDED} ${row.Notes}`;
      t.append('measurements', row);
    }
  };
  for (const [key, { MaterialID, SourceID, rows }] of Object.entries(MEASUREMENTS)) append(MaterialID, gradeIds[key], SourceID, rows);
  for (const { MaterialID, GradeID, SourceID, rows } of EXISTING_GRADE_ROWS) append(MaterialID, GradeID, SourceID, rows);

  const manufacturers = (materialId) => new Set(t.rows('grades')
    .filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active')
    .map((g) => g.Manufacturer)).size;
  for (const materialId of COVERAGE_GRADES) {
    const old = t.rows('coverage').find((r) => r.MaterialID === materialId && r.Domain === 'Grades' && r.Status !== 'Superseded');
    if (!old) continue;
    const n = manufacturers(materialId);
    const newId = nextId('coverage', t.rows('coverage').map((r) => r.CoverageID));
    t.append('coverage', {
      CoverageID: newId, MaterialID: materialId, Domain: 'Grades',
      Status: n >= 3 ? 'Resolved' : 'Gap', 'Manufacturer count': String(n),
      Finding: `${n} distinct manufacturer(s) documented against target 3. A second formulation was recorded ${DATE} (${MIGRATION}) so the screening back-test has a case for this material (D48, D59).`,
    });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${newId} (${DATE}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', old.CoverageID, 'Manufacturer count', NA, { expect: old['Manufacturer count'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
