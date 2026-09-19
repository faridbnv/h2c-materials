#!/usr/bin/env node
// Migration m62 (2026-09-19): 84 rows of batches b01 to b06 re-read against their own pages.
//
// The reader learned to see things it could not see when those batches were proposed, and re-deriving every
// committed proposal against its cached page showed 84 rows whose cells the sheet itself contradicts or
// completes. Each one below was checked on the page, by its footnote marker or by its own printed line; nothing
// here comes from a report, a summary or the re-derivation alone (D35).
//
// Three kinds of thing are wrong, and one kind is merely missing.
//
// 1. A value recorded against the wrong property. Two Polymaker PLA sheets print a Vicat row whose value cell is
//    blank or reads "N/A", and the heat-deflection rows under it:
//
//        Vicat softening temp. N/A                          (PolyLite PLA-CF V6.0)
//        Heat deflection temp. ISO 75 0.45MPa 54°C
//        Heat deflection temp. ISO 75 1.8MPa 50°C
//
//        Vicat softening temp. ISO 306, GB/T 1633           (PolyTerra PLA V6.0)
//        Heat deflection temp. ISO 75 1.8MPa
//        Heat deflection temp. ISO 75 0.45MPa 58 °C
//
//    The Vicat label held and claimed the row under it, so 54, 50 and 58 °C were recorded as Vicat softening
//    temperatures. They are heat deflection temperatures, at the load their own line prints. Neither sheet
//    publishes a Vicat softening temperature at all, so no Vicat row remains and none is retired: the number and
//    its unit do not move, only the property, the load and the locator. On the PLA-CF pair the two now sit the
//    way ISO 75 requires, 54 °C at 0.45 MPa above 50 °C at 1.8 MPa. The tell, if this class is ever looked for
//    again, is a Vicat row whose Standards cell says ISO 75.
//
// 2. A condition that was never a condition. Three rows carry a Test temperature taken from a number that is not
//    one: the heating rate of a Vicat test ("VICAT, 50N, 50°C/h"), the scan rate of a DSC ("Melting temperature
//    (DSC), 10°C/min") and the designation of the standard itself ("ISO 75 °C 305", where 75 is ISO 75). None of
//    the three sheets states the temperature its test was run at.
//
// 3. A published bound recorded as a point. Spectrum's two Ultrafoam sheets print "Melting temperature from
//    160 °C" and "Heat deflection temperature of printed parts up to 55 °C" (200 and 80 on the ASA sheet). A
//    bound limits an estimate where a point moves it, so an "=" here was asserting a melting point the sheet
//    does not publish.
//
// 4. What the sheet always said and the row never carried: the specimen its bars were made as, the temperature
//    it states beside the value, whether it was annealed, whether it was dry. Sixty-nine rows of Spectrum sheets
//    whose own footnote says "injection moulding" or whose own label says "(3D printing)" or "of printed parts";
//    twelve rows of the two PA6 Low Warp sheets whose every line reads "(23 ºC, 50 mm/min)"; three whose footnote
//    says "annealed"; two whose footnote says "(dry, @ 50 mm/min)".
//
// Where the line is drawn on Data status. A row whose claim about what the sheet printed changes is a
// transcription correction and says so: the three property corrections, the three test temperatures that were
// rates or a standard's number, and the four bounds - ten rows in all. A row that only gains a cell the sheet
// always stated, and whose value, unit and claim are untouched, is not a correction of the transcription but a
// completion of it: its Data status stays "Published value" and the note says what was added and where the sheet
// says it. That is the distinction the owner drew, and it matters downstream: the 59 specimen-form rows change
// what the build may do with the number (D55) without changing what the number is.
//
// What was found and deliberately left alone is listed at the bottom of this file.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../build/src/csv.js';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm62';
const DATE = '2026-09-19';
const NA = 'Not applicable';
const NP = 'Not published';
const CORRECTED = 'Published value (transcription corrected)';

// A value read off the row below a label whose own value cell the sheet leaves empty. The number and unit stay;
// the property, the load and the locator become the row the sheet actually prints.
const WRONG_PROPERTY = [
  { id: 'V003418', source: 'S-POLYCN-TDS-Polymaker-Polylite-PLA-CF-V6-0-2026-06-09-EN', load: '0.45',
    was: '0.45MPa 75 ISO 75', now: '0.45MPa ISO 75', locator: 'p. 1: Heat deflection temp. ISO 75 0.45MPa',
    line: 'Heat deflection temp. ISO 75 0.45MPa 54°C' },
  { id: 'V003419', source: 'S-POLYCN-TDS-Polymaker-Polylite-PLA-CF-V6-0-2026-06-09-EN', load: '1.8',
    was: '1.8MPa 75 ISO 75', now: '1.8MPa ISO 75', locator: 'p. 1: Heat deflection temp. ISO 75 1.8MPa',
    line: 'Heat deflection temp. ISO 75 1.8MPa 50°C' },
  { id: 'V003858', source: 'S-POLYCN-TDS-PolyTerra-PLA-V6-0-2026-06-08-EN', load: '0.45',
    was: '0.45MPa 306 Heat deflection temp. ISO 75', now: '0.45MPa ISO 75', locator: 'p. 1: Heat deflection temp. ISO 75 0.45MPa',
    line: 'Heat deflection temp. ISO 75 0.45MPa 58 °C' },
];

const MOULDED = [
  ['S-SPECTRUM-en-tds-petg-frv0',
    ['V002677', 'V002678', 'V002679', 'V002680', 'V002681', 'V002682', 'V002683']],
  ['S-SPECTRUM-en-tds-spectrum-asa-conductive',
    ['V002743', 'V002744', 'V002745', 'V002746', 'V002747', 'V002748', 'V002749', 'V002751']],
  ['S-SPECTRUM-en-tds-spectrum-abs-kevlar',
    ['V002753', 'V002754', 'V002760']],
  ['S-SPECTRUM-en-tds-spectrum-asax-cf10',
    ['V002824', 'V002825', 'V002826', 'V002827', 'V002828', 'V002829']],
  ['S-SPECTRUM-en-tds-spectrum-petg-ptfe',
    ['V002922', 'V002923', 'V002924', 'V002925']],
  ['S-SPECTRUM-en-tds-petg-matt',
    ['V002958', 'V002959', 'V002960', 'V002961', 'V002962']],
  ['S-SPECTRUM-en-tds-spectrum-pla-conductive',
    ['V003053', 'V003054', 'V003055', 'V003056', 'V003057', 'V003058']],
  ['S-SPECTRUM-en-tds-spectrum-pc-ptfe',
    ['V003066']],
  ['S-SPECTRUM-en-tds-spectrum-asa-kevlar',
    ['V003117', 'V003118', 'V003119', 'V003120', 'V003121', 'V003122', 'V003123', 'V003124', 'V003125', 'V003126']],
];

const PRINTED_BARS = [
  ['S-SPECTRUM-en-tds-spectrum-petg-carbon',
    ['V002695', 'V002696', 'V002697']],
  ['S-SPECTRUM-en-tds-spectrum-pla-matt',
    ['V002776', 'V002777']],
  ['S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam',
    ['V002983']],
  ['S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam',
    ['V003049']],
  ['S-SPECTRUM-en-tds-spectrum-pla-carbon',
    ['V003095', 'V003096']],
];

const AT_23 = [
  ['S-SPECTRUM-en-tds-spectrum-pa6-low-warp-gf30',
    ['V002712', 'V002713', 'V002714', 'V002715', 'V002716', 'V002717']],
  ['S-SPECTRUM-en-tds-spectrum-pa6-low-warp-cf15s',
    ['V002723', 'V002724', 'V002725', 'V002726', 'V002727', 'V002728']],
];

const ANNEALED = [
  ['S-SPECTRUM-en-tds-spectrum-pla-matt',
    ['V002779']],
  ['S-SPECTRUM-en-tds-spectrum-pla-huracan',
    ['V002789']],
  ['S-SPECTRUM-en-tds-petg-matt',
    ['V002963']],
];

const DRY = [
  ['S-SPECTRUM-EN-TDS-Spectrum-ecoPET-9021',
    ['V002917', 'V002918']],
];

const LOWER_BOUND = [
  ['S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam',
    ['V002982']],
  ['S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam',
    ['V003048']],
];

const UPPER_BOUND = [
  ['S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam',
    ['V002983']],
  ['S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam',
    ['V003049']],
];

const RATE = [
  ['S-SPECTRUM-en-tds-spectrum-asa-275',
    ['V002809'], '50°C', 'the sheet prints "VICAT, 50N, 50°C/h": 50 °C/h is the heating rate of the test, not a temperature it was run at'],
  ['S-SPECTRUM-en-tds-spectrum-pa6-low-warp',
    ['V002993'], '10°C', 'the sheet prints "Melting temperature (DSC), 10°C/min": 10 °C/min is the scan rate, not a temperature the test was run at'],
  ['X-ECOMAX-CarbonX-CF20-PEEK-TDS-v1',
    ['V003352'], '75°C', 'the sheet prints "ISO 75 °C 305": the 75 is the standard\'s own designation, not a temperature'],
];

// The sheets whose footnote or label carries the statement, so the note can name it per source.
const SAYS = {
  'S-SPECTRUM-en-tds-petg-frv0': 'its footnotes read "* injection moulding", "** (speed 5mm/min), injection moulding", "*** (speed 1 mm/min), injection moulding" and "**** 50 N (heating rate 50°C/h), injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-asa-conductive': 'its footnote reads "* at 23°C, injection moulding", and the HDT row says "injection moulding" in its own line',
  'S-SPECTRUM-en-tds-spectrum-abs-kevlar': 'the impact rows say "injection moulding" in their own line and the Vicat footnote reads "** 50 N (heating rate 50°C/h), injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-asax-cf10': 'its footnote reads "* injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-petg-ptfe': 'its footnote reads "* injection moulding"',
  'S-SPECTRUM-en-tds-petg-matt': 'its footnotes read "* (speed 5mm/min), injection moulding" and "** (speed 1 mm/min), injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-pla-conductive': 'its footnote reads "* at 23°C, injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-pc-ptfe': 'its footnote reads "*** 50 N (heating rate 50°C/h), injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-asa-kevlar': 'its footnote reads "* injection moulding"',
  'S-SPECTRUM-en-tds-spectrum-petg-carbon': 'each row says "(3D printing)" in its own label',
  'S-SPECTRUM-en-tds-spectrum-pla-matt': 'each row says "(3D printing)" in its own label',
  'S-SPECTRUM-en-tds-spectrum-pla-carbon': 'each row says "(3D printing)" in its own label',
  'S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam': 'the row says "heat deflection temperature of printed parts" in its own label',
  'S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam': 'the row says "heat deflection temperature of printed parts" in its own label',
};

const ANNEAL_SAYS = {
  'S-SPECTRUM-en-tds-spectrum-pla-matt': 'the row is "VICAT softening point **" and its footnote reads "** 50 N (heating rate 50°C/h). annealed"',
  'S-SPECTRUM-en-tds-spectrum-pla-huracan': 'the row is "Heat Distortion Temperature*" and its footnote reads "* annealed"',
  'S-SPECTRUM-en-tds-petg-matt': 'the row is "VICAT Softening point***" and its footnote reads "*** 50 N (heating rate 50°C/h), annealed"',
};

const BOUND_SAYS = {
  'S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam': ['"Melting temperature from 160 °C"', '"Heat deflection temperature of printed parts up to 55 °C"'],
  'S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam': ['"Melting temperature from 200 °C"', '"Heat deflection temperature of printed parts up to 80 °C"'],
};

/**
 * The acceptance the first of these corrections retires. A reviewer accepted MEAS-PHYSICS-ORDER on V003417 with
 * the reason "the sheet prints a glass transition of 62 C and a Vicat softening point below it" - and the Vicat
 * softening point below it was V003418, which is not a Vicat softening point but a heat deflection temperature.
 * Corrected, the sheet publishes no Vicat at all and the finding no longer occurs. An acceptance that no longer
 * occurs is as misleading as a stale one, so it goes with the correction that ended it.
 */
const RETIRED_ACCEPTANCE = { Code: 'MEAS-PHYSICS-ORDER', Table: 'measurements', Record: 'V003417', Field: 'Normalized value' };

export function retireAcceptance(root = projectRoot) {
  const path = join(root, 'data/review/accepted-findings.csv');
  const { header, records } = readCsv(path);
  const rows = records.map((r) => r.values);
  const keep = rows.filter((r) => !Object.entries(RETIRED_ACCEPTANCE).every(([k, v]) => r[k] === v));
  if (keep.length === rows.length) return 0;
  writeFileSync(path, csvText(header, keep));
  return rows.length - keep.length;
}

/** Mark a row as a transcription correction. The note `correct` already wrote says what was wrong. */
function markCorrected(t, id) {
  const row = t.get('measurements', id);
  if (row['Data status'] === CORRECTED) return;
  if (row['Data status'] !== 'Published value') throw new Error(`${MIGRATION}: ${id} Data status is "${row['Data status']}"; the data moved since this correction was written`);
  t.set('measurements', id, 'Data status', CORRECTED, { expect: row['Data status'] });
}

export function migrate(t) {
  const counts = {};
  const bump = (k, n) => { counts[k] = (counts[k] ?? 0) + n; };

  // 1. The three values recorded against the wrong property.
  for (const { id, source, load, was, now, locator, line } of WRONG_PROPERTY) {
    const row = t.get('measurements', id);
    if (row.SourceID !== source) throw new Error(`${MIGRATION}: ${id} cites ${row.SourceID}, not ${source}`);
    bump('wrong property', correct(t, {
      source, ids: [id], migration: MIGRATION, date: DATE,
      set: {
        Property: ['Vicat softening temperature', 'HDT'],
        'Test load MPa': [NA, load],
        'Standard / load': [was, now],
        Locator: [row.Locator, locator],
      },
      note: `the sheet leaves the Vicat row's own value cell empty, and this number is the row below it, "${line}". Recorded as the heat deflection temperature it is, at the load that line prints; the sheet publishes no Vicat softening temperature.`,
    }));
    markCorrected(t, id);
  }

  // 2. A rate, or a standard's own number, read as the temperature the test was run at.
  for (const [source, ids, from, why] of RATE) {
    bump('rate read as a temperature', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { 'Test temperature': [from, NP] },
      note: `${why}. The sheet states no test temperature for this row.`,
    }));
    for (const id of ids) markCorrected(t, id);
  }

  // 3. A bound the sheet prints in words, recorded as a point.
  for (const [source, ids] of LOWER_BOUND) {
    bump('bound recorded as a point', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { Operator: ['=', '>'] },
      note: `the sheet prints ${BOUND_SAYS[source][0]}, which is a lower bound and not a point value.`,
    }));
    for (const id of ids) markCorrected(t, id);
  }
  for (const [source, ids] of UPPER_BOUND) {
    bump('bound recorded as a point', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { Operator: ['=', '<'] },
      note: `the sheet prints ${BOUND_SAYS[source][1]}, which is an upper bound and not a point value.`,
    }));
    for (const id of ids) markCorrected(t, id);
  }

  // 4. What the sheet always said, which the row never carried. These keep Data status "Published value": the
  //    number, its unit and what the row claims the sheet printed are untouched.
  for (const [source, ids] of MOULDED) {
    bump('specimen form completed', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { 'Specimen type': ['Not published (do not assume printed)', 'Raw material value'] },
      note: `the sheet says these bars were injection moulded and the row did not carry it: ${SAYS[source]}. A moulded bar is not a printed part (D55).`,
    }));
  }
  for (const [source, ids] of PRINTED_BARS) {
    bump('specimen form completed', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { 'Specimen type': ['Not published (do not assume printed)', 'Printed specimen'] },
      note: `the sheet says these bars were printed and the row did not carry it: ${SAYS[source]}.`,
    }));
  }
  for (const [source, ids] of AT_23) {
    bump('test temperature completed', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { 'Test temperature': [NP, '23°C'] },
      note: 'every row of this table prints its test temperature in its own label, "(23 ºC, 50 mm/min)", "(23 ºC, 2 mm/min)" or "(23 ºC / saturation in water)", and the row did not carry it.',
    }));
  }
  for (const [source, ids] of ANNEALED) {
    bump('post-processing completed', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: {
        'Post-processing': [NP, 'annealed'],
        'Post-processing state': ['not-stated', 'annealed'],
        // A row that states an annealing without a schedule publishes no schedule; the columns say so rather
        // than staying not applicable, which is what they mean on a row that was never annealed.
        'Anneal °C': [NA, NP],
        'Anneal h': [NA, NP],
      },
      note: `the sheet says this bar was annealed and the row did not carry it: ${ANNEAL_SAYS[source]}. The sheet states no annealing schedule for it.`,
    }));
  }
  for (const [source, ids] of DRY) {
    bump('moisture completed', correct(t, {
      source, ids, migration: MIGRATION, date: DATE,
      set: { 'Moisture condition': [NP, 'Dry'], 'Moisture state': ['not-stated', 'dry'] },
      note: 'the sheet says these bars were dry and the row did not carry it: its footnotes read "* (dry, @ 50 mm/min)" and "** (dry, @ 10 mm/min)".',
    }));
  }
  return counts;
}

// Found in the same pass and deliberately not written:
//
//   V002790  Spectrum Huracan PLA, glass transition 55-60 °C. The reader now reads this row as annealed, from a
//            line that says "after annealing" alone. That line is not a block heading over the property table:
//            it is the tail of the marketing bullet "• Better mechanical and thermal strength / after annealing"
//            in the description column beside it, which extraction interleaves by row. The sheet marks its
//            annealed value with an asterisk ("Heat Distortion Temperature*", "* annealed") and this row carries
//            none, so the sheet does not say its glass transition was measured on an annealed bar.
//
//   V003532, V003533, V003538, V003576, V003577, V003582, V003817, V003818, V003823
//            The three Polymaker HT-PLA sheets print their moduli twice, once under "(as printed)" and once under
//            "(after annealing)", and the Z values are the same number in both blocks (2596.43 and 2411.22 MPa,
//            and 42.86 MPa for the X-Y tensile strength). The recorded row is the as-printed one and is right.
//            What is missing there is the annealed block's own X-Y rows, which no row of the table holds; that is
//            a gap in the transcription, not a value to correct, and it needs the sheets re-read rather than a
//            cell changed.

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  const counts = migrate(t);
  const changes = t.save();
  const retired = retireAcceptance();
  for (const [kind, n] of Object.entries(counts)) console.log(`${String(n).padStart(3)}  ${kind}`);
  console.log(`${changes.length} record(s) changed; ${retired} acceptance(s) retired`);
}
