#!/usr/bin/env node
// Migration m190 (2026-09-27): a maker's own "enclosure needed", with no temperature, reads as the guide's tick (D93;
// the owner's decision 5 of 2026-09-26, docs/GOALS.md).
//
// D90 read Bambu Lab's Filament Guide's "print with an enclosure", for the nine types it asks it for (ABS, ABS-GF, ASA,
// PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF, PPS-CF), as within the H2C's heated chamber, for a product whose own sheet is
// silent. A product whose own sheet asks for an enclosure and prints no temperature had spoken, so it never read the
// guide and stayed unknown: Polymaker ABS and ASA's "Closure chamber | Needed" left them unknown where a silent sheet
// passed. The owner ruled that a maker's own "needed" or "recommended", with no temperature, reads as the guide's tick
// does, for the same nine types, labelled as the maker's words; a maker's stated temperature above 65 °C still reads as
// partial or beyond.
//
// The ruling is data, as D90's is: each profile below declares Chamber state "enclosed" and says why in Parse review;
// its raw Chamber °C stays "Not published", because the sheet prints no chamber row, and its Enclosure keeps the
// sheet's words. The build allows it only where the row asks for an enclosure and prints no chamber temperature, where
// its material's guide row declares "enclosed", and where no other profile of its product states a chamber
// (PROCESS-ENCLOSED); the gate's reason quotes the maker's words.
//
// Every profile of the nine types whose own sheet asks for an enclosure and prints no temperature was found by query
// (Enclosure state recommended, chamber row Not published) and each statement re-read on its cached, hash-checked page,
// which this migration checks before it writes. Two products are left, because their sheets state a chamber: Polymaker
// PolyMax PC ("Closure chamber | Not needed (70°C-100°C)", P0276) and PolyLite PC (P0352, "Needed (70°C-100°C)").
//
// The same read found two sheets that say the opposite of what their products read: FormFutura's STYX PA6-CF15 and
// PA6-GF30 print "No enclosure, or heated chamber needed." (p. 1), and their profiles, silent on it, read the
// "Closed chamber recommended" of the Spectrum sheet they share a table with (D89). A product's own statement wins, so
// their profiles now hold it.
//
// The reviewer is an agent, claude-opus-5.5 (agent reviewer); no person has reviewed it. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m190-a-makers-enclosure-words.mjs

import { openTables } from '../data/table-io.mjs';
import { parseEnclosure } from '../../build/src/normalize/process.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm190-a-makers-enclosure-words';
const NA = 'Not applicable';
const NP = 'Not published';

// Profile, grade, source, page, the statement as the page prints it (label and words), the profile's Enclosure cell as
// recorded, and how strongly it asks: "recommended" where the maker's words recommend, "required" where they say needed,
// yes, or print it closed.
const ASKS = [
  ['P0191', 'G027-03', 'S-SPECTRUM-en-tds-spectrum-abs-gp450', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0204', 'G027-04', 'S-SPECTRUM-en-tds-spectrum-medical', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0220', 'G027-05', 'S-SPECTRUM-en-tds-spectrum-smart-abs', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0292', 'G027-08', 'S-POLYCN-TDS-Polymaker-ABS-Pro-V1-1-2026-06-01-EN', 1, 'Closure chamber Yes', 'Yes', 'required'],
  ['P0338', 'G027-09', 'S-POLYCN-TDS-Polymaker-ABS-v6-0-2025-12-04', 1, 'Closure chamber Needed', 'Needed', 'required'],
  ['P0356', 'G027-09', 'S-POLYCN-TDS-Polymaker-PolyLite-ABS-V5-6-2025-12-30-EN', 1, 'Closure chamber Needed', 'Needed', 'required'],
  ['P0388', 'G027-11', 'R-EXTRUDR-durapro-abs-TDS-en', 1, 'Enclosed Space yes', 'yes', 'required'],
  ['P0455', 'G027-15', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--fbbd78', 1, 'Sealed printing closed printing', 'closed printing', 'required'],
  ['P0660', 'G027-22', 'S-PEBA-ABS-TDS-EN-docx', 4, 'we strongly recommend printing ABS material inside an enclosed printer', 'we strongly recommend printing ABS material inside an enclosed printer', 'recommended'],
  ['P0668', 'G027-27', 'S-PEBA-eSUN-eABS-Max-Filament-TDS-V4-0', 2, 'it should be printed in a printer with closed chamber', 'printed in a printer with closed chamber', 'required'],
  ['P1123', 'G027-56', 'S-PET-formfutura-tds-titanx', 1, 'Print with Enclosure Yes', 'Yes', 'required'],
  ['P0192', 'G031-03', 'S-SPECTRUM-en-tds-spectrum-asa-275', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0219', 'G031-04', 'S-SPECTRUM-en-tds-the-filament-asa', 1, 'Closed chamber for printing recommended for larger prints', 'for printing recommended for larger prints', 'recommended'],
  ['P0278', 'G031-06', 'S-POLYCN-TDS-Polymaker-ASA-V6-0-2025-12-02-EN', 1, 'Closure chamber Needed', 'Needed', 'required'],
  ['P0378', 'G031-07', 'R-EXTRUDR-durapro-asa-TDS-en', 1, 'Enclosed Space yes', 'yes', 'required'],
  ['P0430', 'G031-09', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--1d9fed', 1, 'Sealed printing enclosed printing', 'enclosed printing', 'required'],
  ['P0445', 'G031-10', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--9a96a3', 1, 'Sealed printing Box Sealing Print', 'Box Sealing Print', 'required'],
  ['P0555', 'G031-15', 'S-SPECTRUM-en-tds-spectrum-flameguard-asa-275', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P1129', 'G031-36', 'S-PET-formfutura-tds-apollox2024', 1, 'Print with Enclosure Yes', 'Yes', 'required'],
  ['P1130', 'G031-42', 'S-PET-formfutura-tds-reformrapollo', 1, 'Print with Enclosure Yes', 'Yes', 'required'],
  ['P1247', 'G031-43', 'R-3DJAKE-EN-TDS-The-Filament-ASA', 1, 'Closed chamber for printing recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0203', 'G035-03', 'S-SPECTRUM-en-tds-spectrum-pc-275', 1, 'Closed chamber recommended for larger prints', 'recommended for larger prints', 'recommended'],
  ['P0389', 'G035-11', 'R-EXTRUDR-durapro-pc-fr-v0-TDS-en', 2, 'Enclosed chamber Yes', 'Yes', 'required'],
  ['P0624', 'G035-17', 'S-PEBA-PC-HT-TDS', 3, 'we highly recommend printing PC-HT material within a closed chamber printer', 'we highly recommend printing PC-HT material within a closed chamber printer', 'recommended'],
  ['P0183', 'G050-03', 'S-SPECTRUM-en-tds-spectrum-pa6-low-warp-cf15s', 1, 'Closed chamber recommended', 'recommended', 'recommended'],
  ['P0394', 'G050-05', 'R-EXTRUDR-durapro-pa6-cf-TDS-en', 1, 'Enclosed Space Yes', 'Yes', 'required'],
  ['P0454', 'G050-07', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--f94f65', 1, 'Sealed printing Closed printing', 'Closed printing', 'required'],
  ['P0182', 'G051-04', 'S-SPECTRUM-en-tds-spectrum-pa6-low-warp-gf30', 1, 'Closed chamber recommended', 'recommended', 'recommended'],
  ['P0391', 'G051-05', 'R-EXTRUDR-durapro-pa6-gf-TDS-en', 1, 'Enclosed Space Yes', 'Yes', 'required'],
];

// The two FormFutura sheets whose own words say no enclosure is needed: profile, grade, source, page, statement.
const NOT_NEEDED = [
  ['P1256', 'G050-13', 'S-PET-formfutura-tds-styxpacf15', 1, 'No enclosure, or heated chamber needed.'],
  ['P1258', 'G051-10', 'S-PET-formfutura-tds-styxpagf30', 1, 'No enclosure, or heated chamber needed.'],
];

const t = openTables();
const printed = pageReader(t, migration);
const guideType = new Map();
for (const m of t.rows('print_guide_materials')) {
  const g = t.get('print_guide', m.PrintGuideID);
  if (g['Chamber state'] === 'enclosed') guideType.set(m.MaterialID, g['Guide type']);
}
const addReview = (before, text) => (before == null || before === NA ? text : before.includes(text) ? before : `${before} ${text}`);

let n = 0;
const tally = {};
for (const [id, gradeId, sourceId, page, statement, enclosure, requirement] of ASKS) {
  const p = t.get('profiles', id);
  if (p.GradeID !== gradeId || p.SourceID !== sourceId) throw new Error(`${migration}: ${id} is ${p.GradeID} citing ${p.SourceID}`);
  if (t.get('grades', gradeId).Status !== 'active') throw new Error(`${migration}: ${gradeId} is not active`);
  const type = guideType.get(p.MaterialID);
  if (!type) throw new Error(`${migration}: ${id}'s material ${p.MaterialID} has no guide row that asks for an enclosure`);
  if (!printed(sourceId, page, statement)) throw new Error(`${migration}: "${statement}" is not printed on p. ${page} of ${sourceId}`);
  if (p.Enclosure !== enclosure || p['Enclosure state'] !== 'recommended' || parseEnclosure(enclosure).state !== 'recommended') throw new Error(`${migration}: ${id} Enclosure is "${p.Enclosure}" (${p['Enclosure state']}), not the maker's "${enclosure}"`);
  if (p['Chamber °C'] !== NP) throw new Error(`${migration}: ${id} now prints a chamber ("${p['Chamber °C']}"); a stated chamber decides, not this ruling`);
  for (const c of ['Chamber min °C', 'Chamber max °C']) if (p[c] !== NA) throw new Error(`${migration}: ${id} ${c} is "${p[c]}"`);
  const review = `Chamber state enclosed (requirement ${requirement}) is the owner's ruling of 2026-09-26 (D93, m190), not a reading `
    + `of a chamber row, which this sheet does not print: its maker asks for an enclosure ("${statement}", p. ${page}) and `
    + `states no chamber temperature, and for ${type}, a type Bambu Lab's Filament Guide asks to print with an enclosure, `
    + `the H2C's heated chamber (to 65 °C) is that enclosure. The other typed columns are the parsers' reading.`;
  if (p['Chamber state'] === 'enclosed' && p['Chamber requirement'] === requirement && p['Parse review'].includes(review)) continue;
  t.set('profiles', id, 'Chamber state', 'enclosed', { expect: 'unknown' });
  t.set('profiles', id, 'Chamber requirement', requirement, { expect: 'unknown' });
  t.set('profiles', id, 'Parse review', addReview(p['Parse review'], review), { expect: p['Parse review'] });
  tally[type] = (tally[type] ?? 0) + 1;
  n++;
}

for (const [id, gradeId, sourceId, page, statement] of NOT_NEEDED) {
  const p = t.get('profiles', id);
  if (p.GradeID !== gradeId || p.SourceID !== sourceId) throw new Error(`${migration}: ${id} is ${p.GradeID} citing ${p.SourceID}`);
  if (!printed(sourceId, page, statement)) throw new Error(`${migration}: "${statement}" is not printed on p. ${page} of ${sourceId}`);
  if (parseEnclosure(statement).state !== 'not-needed') throw new Error(`${migration}: "${statement}" does not read as not needed`);
  if (p.Enclosure === statement && p['Enclosure state'] === 'not-needed') continue;
  t.set('profiles', id, 'Enclosure', statement, { expect: NP });
  t.set('profiles', id, 'Enclosure state', 'not-needed', { expect: 'unknown' });
  const where = `p. ${page}: product specifications (enclosure)`;
  if (!p.Locator.includes(where)) t.set('profiles', id, 'Locator', `${p.Locator}; ${where}`, { expect: p.Locator });
  tally['no enclosure needed, in the product\'s own words'] = (tally['no enclosure needed, in the product\'s own words'] ?? 0) + 1;
  n++;
}

if (n) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${n} profile(s) written (${ASKS.length} ask for an enclosure with no temperature, ${NOT_NEEDED.length} say none is needed)`);
