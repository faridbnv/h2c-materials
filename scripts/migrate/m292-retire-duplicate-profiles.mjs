#!/usr/bin/env node
// Migration m292 (2026-10-02): one product's setup read twice from one sheet is one profile (D120).
//
// The import writes a profile per nozzle row a sheet prints, so a print speed's row becomes its own setup
// (propose.mjs, profilesFor). On 74 sheets the second "nozzle row" was not a setup: Polymaker's "How to make specimens"
// block ("Printing temperature 230°C … Infill 100%"), 3D4Makers' "Nozzletemp:140°C" under its test conditions, eSUN's
// "Print test condition". Later migrations corrected the second profile's numbers to the guidance instead of retiring it,
// so 45 pairs became identical and the rest a partial copy, a copy still holding the test bar's temperature, or a copy
// with a label run into a cell. Every one was a record the control draws could land on, and a doubled count wherever
// profiles are counted.
//
// The profile that stays is the one holding more of the sheet's settings, else the first; anything only the copy holds
// moves to it first (none does today, which the script checks), and where both hold a setting the one that stays is
// the sheet's guidance (the reader verdicts of the profile root-cause sweep: the copy holds the test bar's temperature or
// a label). The copy keeps its cells as an audit trail, with Profile "Retired duplicate record" and its Locator naming
// the profile that stays; the build leaves it out (compile.js) and counts it. Two profiles that are rows of the sheet
// (a speed, a nozzle size) both stay, and a statement the sheet prints once for every row is copied to the row that
// lacks it (PROFILE-SIBLING-SILENT).
//
//   node scripts/migrate/m292-retire-duplicate-profiles.mjs
import { openTables } from '../data/table-io.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm292';
const t = openTables();
const RECIPE = ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Plate', 'Drying', 'Nozzle material', 'Nozzle diameter', 'Abrasion / clogging'];
const SHEET_WIDE = ['Chamber °C', 'Enclosure', 'Drying', 'Abrasion / clogging'];
const ROW = /\b(standard|high)[- ]speed\b|\(high speed\)|\bclassic\b|zonal temperature|\bnozzle\s+(diameter\s+)?\d\.\d|\bnozzle \d\.\dmm row\b|\bfoamed column\b|\d+-\s*\d+mm\/s/i;
const stated = (v) => v != null && v !== '' && !/^Not (published|applicable)/.test(v);
const groups = new Map();
for (const r of t.rows('profiles')) {
  if (r.Profile === 'Retired duplicate record' || /not printing guidance/.test(r.Locator)) continue;
  const k = `${r.GradeID}\u0000${r.SourceID}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r.ProfileID);
}
let retired = 0, copied = 0;
for (const ids of groups.values()) {
  if (ids.length < 2) continue;
  const ps = ids.map((id) => t.get('profiles', id));
  if (ps.some((p) => ROW.test(p.Locator))) {
    for (const col of SHEET_WIDE) {
      const holder = ps.find((p) => stated(p[col])); if (!holder) continue;
      for (const p of ps) if (!stated(p[col])) { t.set('profiles', p.ProfileID, col, holder[col], { expect: p[col], migration: MIGRATION }); retype(t, p.ProfileID, [col], MIGRATION); copied++; }
    }
    continue;
  }
  const held = (p) => RECIPE.filter((c) => stated(p[c])).length;
  const [keep, ...copies] = [...ps].sort((a, b) => held(b) - held(a) || a.ProfileID.localeCompare(b.ProfileID));
  for (const copy of copies) {
    const only = RECIPE.filter((c) => stated(copy[c]) && !stated(keep[c]));
    if (only.length) throw new Error(`${MIGRATION}: ${copy.ProfileID} holds ${only.join(', ')} that ${keep.ProfileID} does not; move it first`);
    t.set('profiles', copy.ProfileID, 'Profile', 'Retired duplicate record', { expect: copy.Profile, migration: MIGRATION });
    t.set('profiles', copy.ProfileID, 'Locator', `Retired duplicate of ${keep.ProfileID} (D120): ${copy.Locator}`, { expect: copy.Locator, migration: MIGRATION });
    retired++;
  }
}
t.save();
console.log(`${MIGRATION}: ${retired} profiles retired as duplicates, ${copied} sheet-wide statements copied to a row that lacked them`);
