#!/usr/bin/env node
// Migration m299 (2026-10-02): what the measuring draw after the profile root-cause sweep, and the profiles OPEN-PROBLEMS
// §12, §16 and §28 named, settle (D120).
//
// The fresh draw of 40 (v12) found one deciding error in 40: Recreus's "Small parts Room temperature (no heating); Large
// parts 50–55 °C" read as a bed the filament requires, where it is a window for large parts only. The parser reads that
// wording as a recommendation now (process.js), and the 18 profiles that print it are typed again here. Its other findings
// were nozzle sizes the profiles lacked (P1147, P0560, P0748), each now held as its sheet prints it.
//
// Also, each read by a Claude Sonnet reader on the cached sheet, rendered where the text layer fails, and quote-checked
// here:
//   - Recreus PET-G's bed row is garbled in its text layer (b38's broken glyph mapping); the rendered page prints
//     "Hot-bed temperature 40-70°C" (P1239).
//   - 3D-Fuel's Pro PCTG was named "3D" (G088-04): its sheet heads page 1 "3D-Fuel / Pro PCTG" (OPEN-PROBLEMS §16).
//   - 3DXTECH's 3DXSTAT ESD-PLA page prints a "Print Recommendations" block no profile held (215-250C nozzle, 40-70C bed,
//     "Heated Chamber | Not required", "65C for 4 hours", "Nozzle Specs | No special concerns") and "no enclosure
//     required" (OPEN-PROBLEMS §12, the three products whose chamber was only in words): a profile of its own.
// Left: purefil PA6 GF10's two bed rows (P1257). Its sheet prints "Heizbett Temperatur 120-140 °C" and "Heated bed
// temperature 80°C" where every other purefil sheet prints its drying temperature, and no drying row at all; that points
// to a mislabelled drying row, but the sheet's own words call both rows bed, so the maker must say. QIDI ASA-Aero's
// "please place the enclosed printer in a ventilated environment" is about ventilation as much as an enclosure, and SUNLU
// PP's "for optimal enclosed-chamber printing results" asks for nothing; both stay as they are.
//
// Every profile the parsers now read differently (the bed recommendation, "no enclosure required", a drying window whose
// unit stands on its lower end only, "75℃-85, 6h") is typed again,
// except in a column its Parse review explains (D115). A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m299-profiles-read.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { retype, typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm299';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
let cells = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-profiles-read.csv`))) {
  const r = t.get(e.table, e.id);
  if (r[e.column] === e.value) continue;
  const source = e.table === 'profiles' ? r.SourceID : e.source;
  if (source !== e.source) throw new Error(`${MIGRATION}: ${e.id} cites ${source}, not ${e.source}`);
  onSheet(t, e.source, e.quote, MIGRATION);
  t.set(e.table, e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  if (e.table === 'profiles' && TYPED[e.column]) retype(t, e.id, [e.column], MIGRATION);
  cells++;
}
if (t.get('grades', 'G088-04')['Product name'] === 'Pro PCTG' && !/m299/.test(t.get('grades', 'G088-04')['Selected-grade rationale'])) {
  const g = t.get('grades', 'G088-04');
  t.set('grades', 'G088-04', 'Selected-grade rationale', `${g['Selected-grade rationale']} Named "Pro PCTG" since 2026-10-02 (${MIGRATION}): its sheet heads p. 1 "3D-Fuel / Pro PCTG"; it was "3D", a heading read twice.`, { expect: g['Selected-grade rationale'], migration: MIGRATION });
}

// 3DXSTAT ESD-PLA's product page: a profile of its own.
const PAGE = 'XP-3dxstat-esd-pla-1';
const LOCATOR = 'Print Recommendations; Benefits of 3DXSTAT™ ESD-PLA: "no enclosure required"';
if (!t.rows('profiles').some((p) => p.GradeID === 'G107-02' && p.SourceID === PAGE)) {
  onSheet(t, PAGE, 'Print Recommendations | Extruder Temp | 215-250C | Bed Temp | 40-70C | Heated Chamber | Not required | Drying Specs | 65C for 4 hours | Nozzle Specs | No special concerns | no enclosure required', MIGRATION);
  const like = t.get('profiles', 'P0241');
  const id = nextId('profiles', t.rows('profiles').map((p) => p.ProfileID));
  const NP = 'Not published';
  const row = {
    ...like, ProfileID: id, Profile: 'Current manufacturer product guidance', SourceID: PAGE, Locator: LOCATOR, 'Parse review': 'Not applicable',
    'Nozzle °C': '215-250C', 'Bed °C': '40-70C', 'Chamber °C': 'Not required', Enclosure: 'no enclosure required', Plate: NP,
    Drying: '65C for 4 hours', 'Nozzle material': 'No special concerns', 'Nozzle diameter': NP, 'Abrasion / clogging': NP,
  };
  // The page's Benefits say "Ideal for printing without a heated bed": its 40-70C is a window for a printer that has one,
  // not one the filament needs (the independent review of 2026-10-02).
  onSheet(t, PAGE, 'Ideal for printing without a heated bed', MIGRATION);
  const typed = typedOf(row);
  t.append('profiles', { ...row, ...typed, 'Bed requirement': 'recommended',
    'Parse review': 'Fields: Bed requirement. The page\'s Print Recommendations give "Bed Temp | 40-70C" and its Benefits say "Ideal for printing without a heated bed, no enclosure required": a window for a printer that has a heated bed, recommended, not required (m299).' }, { migration: MIGRATION });
  cells++;
}

// What the parsers read now, on every live profile, except a column a review explains.
let retyped = 0;
for (const r of t.rows('profiles')) {
  if (r.Profile === 'Retired duplicate record') continue;
  const reviewed = reviewFields(r) ?? new Set();
  const typed = typedOf(r);
  for (const col of ['Bed °C', 'Enclosure', 'Drying']) {
    for (const c of TYPED[col]) {
      if (reviewed.has(c) || r[c] === typed[c]) continue;
      t.set('profiles', r.ProfileID, c, typed[c], { expect: r[c], migration: MIGRATION });
      retyped++;
    }
  }
}
if (cells || retyped) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) or profile(s) from the sheets; ${retyped} typed cell(s) read again`);
