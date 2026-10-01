#!/usr/bin/env node
// Migration m274 (2026-10-01): a Parse review explains the typed columns it names, and only those (D115).
//
// A review used to silence every typed check of its row. The data audit of 2026-10-01 (PM-TRIAL-2026-10-01,
// data-audit RC1) found what that hid: migration m08 typed each process window as the smallest and largest number in
// its cell, and eleven Spectrum and Fiberon cells had swallowed the storage paragraph beside them, so a bed minimum
// was read as 3 °C ("for 3D printers"), 24 °C ("a shelf life of 24 months") and a nozzle minimum as 250 °C ("up to
// 250 mm/s"). m102 corrected the cells' words and added a review about them; the review then silenced the typed
// windows, which kept the old numbers. Open bounds were typed as points the same way: "> 80 °C" as 80–80.
//
// Two things, in order:
//
//   1. The windows the audit re-read against their cached sheets get the reading of their own words (each edit names
//      the value it replaces, so a re-run is a no-op and a run after the data moved stops). Open bounds stay open.
//
//   2. Every existing Parse review opens with "Fields: …." naming the typed columns it explains: exactly the columns
//      whose stored value still differs from the parser's reading once the review is set aside. A review that explains
//      none says "Fields: none.". The words of each review are kept after the prefix.
//
//   node scripts/migrate/m274-parse-reviews-name-their-columns.mjs

import { openTables } from '../data/table-io.mjs';
import { readRecipe } from '../../build/src/recipe.js';
import { applyAnnealTyped, applyStateTyped, applyStandardsTyped, applyLoadTyped, applyTestTemperatureTyped } from '../../build/src/typed-values.js';
import { parseAnnealSchedule } from '../../build/src/normalize/specimen.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';

const MIGRATION = 'm274';
const NA = 'Not applicable';
const NP = 'Not published';
const t = openTables();

// ---- 1. windows read again from their own words (sheet text re-read in the data audit, data-audit/REGRESSION-CASES.csv)
const WINDOWS = [
  { id: 'P0046', set: { 'Bed min °C': ['24', '80'], 'Bed max °C': ['80', NP] } },   // ">80°C"
  { id: 'P0058', set: { 'Bed max °C': ['77', '50'] } },                            // "0-50°C"
  { id: 'P0070', set: { 'Bed max °C': ['80', NP] } },                              // ">80°C"
  { id: 'P0095', set: { 'Nozzle min °C': ['250', '310'] } },                       // "310-350 °C"
  { id: 'P0097', set: { 'Bed max °C': ['60', NP] } },                              // ">60 °C"
  { id: 'P0102', set: { 'Bed min °C': ['24', '80'] } },                            // "80-100°C"
  { id: 'P0114', set: { 'Bed max °C': ['50', NP] } },                              // "> 50°C"
  { id: 'P0120', set: { 'Bed min °C': ['3', '90'] } },                             // "90 - 110°C"
  { id: 'P0184', set: { 'Bed max °C': ['80', NP] } },                              // "> 80°C"
];
let windows = 0;
for (const w of WINDOWS) {
  for (const [field, [was, now]] of Object.entries(w.set)) {
    const row = t.get('profiles', w.id);
    if (row[field] === now) continue;
    t.set('profiles', w.id, field, now, { expect: was, migration: MIGRATION });
    windows++;
  }
}

// ---- 2. every review names the columns it explains
const columnOf = (message) => message.match(/^(.+?) is /)?.[1];
const strip = (r) => ({ ...r, 'Parse review': NA });
function profileMismatches(r, guide) {
  const issues = [];
  readRecipe(strip(r), issues, { where: 'x', unreadWhere: 'x', abrasionColumn: guide ? 'Nozzle size / material' : 'Abrasion / clogging', guide });
  return issues.filter((i) => i.code === 'PARSE-MISMATCH').map((i) => columnOf(i.message));
}
function measurementMismatches(r) {
  const s = strip(r); const issues = [];
  applyStateTyped(s, issues);
  applyAnnealTyped(s, parseAnnealSchedule(s['Post-processing'], s['Post-processing state']), issues);
  applyStandardsTyped(s, issues);
  applyTestTemperatureTyped(s, issues);
  if (s.Property === 'HDT') applyLoadTyped(s, parseHdtStandard(s['Standard / load']), issues);
  return issues.filter((i) => i.code === 'PARSE-MISMATCH').map((i) => columnOf(i.message));
}
let scoped = 0, none = 0;
for (const [table, key, read] of [['profiles', 'ProfileID', (r) => profileMismatches(r, false)], ['print_guide', 'PrintGuideID', (r) => profileMismatches(r, true)], ['measurements', 'MeasurementID', measurementMismatches]]) {
  for (const r of t.rows(table)) {
    const review = r['Parse review'];
    if (review == null || review === NA || /^Fields:/.test(review)) continue;
    const columns = [...new Set(read(r))];
    if (!columns.length) none++; else scoped++;
    t.set(table, r[key], 'Parse review', `Fields: ${columns.length ? columns.join(', ') : 'none'}. ${review}`, { expect: review, migration: MIGRATION });
  }
}
t.save();
console.log(`${MIGRATION}: ${windows} window cells read again from their words; ${scoped} reviews scoped to their columns, ${none} explain none`);
