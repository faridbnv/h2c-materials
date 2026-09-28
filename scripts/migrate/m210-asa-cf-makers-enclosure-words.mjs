#!/usr/bin/env node
// Migration m210 (2026-09-27): D93 for ASA-CF, now that the guide the build reads asks an enclosure for it (D90
// extended; m209).
//
// D93 reads a maker's own "enclosure needed" or "recommended", with no temperature, as the guide's tick does: for the
// types Bambu Lab's Filament Guide asks an enclosure for, the H2C's heated chamber is that enclosure. m190 wrote it
// for the nine types of the copy the build read then. m209 moved the build to the guide Bambu Lab's page links, which
// asks an enclosure for ASA-CF and PC FR too, and the owner's answer of 2026-09-27 reads that guide's ask as D90 does.
// A product of those types whose own sheet asks for an enclosure and prints no temperature would otherwise stay unknown
// while a silent sheet of the same type passes, the inversion D93 was made to end (test/products.test.js holds it).
// Five ASA-CF profiles are such; no PC FR sheet is (PolyMax PC-FR states its chamber, which decides).
//
// The ruling is data, as in m190: each profile declares Chamber state "enclosed" and says why in Parse review; its raw
// Chamber °C stays "Not published", and its Enclosure keeps the sheet's words. Each statement is re-read on its cached,
// hash-checked page. The reviewer is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op,
// and a run after the data moved stops.
//
//   node scripts/migrate/m210-asa-cf-makers-enclosure-words.mjs

import { openTables } from '../data/table-io.mjs';
import { parseEnclosure } from '../../build/src/normalize/process.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm210-asa-cf-makers-enclosure-words';
const NA = 'Not applicable';
const NP = 'Not published';
// Profile, grade, source, page, the statement as the page prints it, the profile's Enclosure cell, and how strongly it asks.
const ASKS = [
  ['P0174', 'G033-03', 'S-SPECTRUM-en-tds-the-filament-asa-cf', 1, 'Closed chamber for printing recommended for larger prints', 'for printing recommended for larger prints', 'recommended'],
  ['P0371', 'G033-05', 'R-EXTRUDR-durapro-asa-cf-TDS-en', 1, 'Enclosed Space yes', 'yes', 'required'],
  ['P0775', 'G033-05', 'R-EXTRUDR-durapro-asa-cf-TDS-en-533984', 1, 'Enclosed Space yes', 'yes', 'required'],
  ['P0434', 'G033-06', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--41b571', 1, 'Sealed printing Box Sealing Print', 'Box Sealing Print', 'required'],
  ['P1249', 'G033-18', 'R-3DJAKE-EN-TDS-The-Filament-ASA-CF', 1, 'Closed chamber for printing recommended for larger prints', 'recommended for larger prints', 'recommended'],
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
for (const [id, gradeId, sourceId, page, statement, enclosure, requirement] of ASKS) {
  const p = t.get('profiles', id);
  if (p.GradeID !== gradeId || p.SourceID !== sourceId) throw new Error(`${migration}: ${id} is ${p.GradeID} citing ${p.SourceID}`);
  if (t.get('grades', gradeId).Status !== 'active') throw new Error(`${migration}: ${gradeId} is not active`);
  const type = guideType.get(p.MaterialID);
  if (type !== 'ASA-CF') throw new Error(`${migration}: ${id}'s material ${p.MaterialID} reads ${type ?? 'no guide row that asks for an enclosure'}`);
  if (!printed(sourceId, page, statement)) throw new Error(`${migration}: "${statement}" is not printed on p. ${page} of ${sourceId}`);
  if (p.Enclosure !== enclosure || p['Enclosure state'] !== 'recommended' || parseEnclosure(enclosure).state !== 'recommended') throw new Error(`${migration}: ${id} Enclosure is "${p.Enclosure}" (${p['Enclosure state']}), not the maker's "${enclosure}"`);
  if (p['Chamber °C'] !== NP) throw new Error(`${migration}: ${id} now prints a chamber ("${p['Chamber °C']}"); a stated chamber decides, not this ruling`);
  if (t.rows('profiles').some((q) => q.GradeID === gradeId && q.ProfileID !== id && q['Chamber °C'] !== NP)) throw new Error(`${migration}: another profile of ${gradeId} states the chamber`);
  const review = `Chamber state enclosed (requirement ${requirement}) is the owner's ruling of 2026-09-26 (D93, m190), read for ASA-CF since `
    + `the owner's answer of 2026-09-27 (m209, m210), not a reading of a chamber row, which this sheet does not print: its maker asks for an `
    + `enclosure ("${statement}", p. ${page}) and states no chamber temperature, and for ${type}, a type Bambu Lab's Filament Guide asks to `
    + `print with an enclosure, the H2C's heated chamber (to 65 °C) is that enclosure. The other typed columns are the parsers' reading.`;
  if (p['Chamber state'] === 'enclosed' && p['Chamber requirement'] === requirement && p['Parse review'].includes(review)) continue;
  t.set('profiles', id, 'Chamber state', 'enclosed', { expect: 'unknown' });
  t.set('profiles', id, 'Chamber requirement', requirement, { expect: 'unknown' });
  t.set('profiles', id, 'Parse review', addReview(p['Parse review'], review), { expect: p['Parse review'] });
  n++;
}
if (n) t.save();
console.log(`${migration}: ${n} profile(s) written`);
