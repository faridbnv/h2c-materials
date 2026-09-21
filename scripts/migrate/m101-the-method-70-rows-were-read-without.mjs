#!/usr/bin/env node
// Migration m101 (2026-09-21): the test method 70 measurements were transcribed without.
//
// OPEN-PROBLEMS §1. Seventy rows across nineteen sources held a fragment of the neighbouring column instead of
// the test method: the tail of the Subject ("Transition Temperature"), the head of the Testing Method ("DSC,",
// "ISO 179,", "ASTM"), or the direction that followed it ("(X-Y)"). Bambu Lab's properties table is
// `Subjects | Testing Methods | Data` and the original extraction cut it in the wrong place; Polymaker prints
// the method once between a property's two direction rows, and the second row kept only its first word.
//
// The values were never affected — they come from the Data cell and reconcile against their raw text on every
// build — only the standard they were tested to, which since m49 read as naming none.
//
// Every row here was re-read from its own source: the cached document, hash-checked against sources.csv, the
// row found by its property, its direction and its load, and the method taken from the line the sheet prints it
// on (D35). Nothing was inferred from what a standard usually is for a property.
//
// **Twenty-six rows were read and left exactly as they are**, because the fragment is what the sheet prints:
//
//   - Polymaker prints "N/A" in the Testing Method column for thermal conductivity (ten rows).
//   - Prusament's PVB sheet names "Prusa Polymers" as the method for its density, its two moisture absorptions,
//     its hardness and its interlayer adhesion: Prusa's own measurement, not a standard (five rows).
//   - iSANMATE's PLA-GF and PA6-CF sheets print a bare "ISO" beside four values and nothing more (five rows).
//   - Siraya Tech's sheets print "Method A/B" beside a pair of heat deflection temperatures and name no
//     standard; the load each row was measured at is typed in Test load MPa (six rows).
//
// A sheet being vague is not transcription damage, and writing ISO 75 over "Method A/B" would be writing a
// standard nobody read off a sheet. OPEN-PROBLEMS records them as what they are.
//
//   node scripts/migrate/m101-the-method-70-rows-were-read-without.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm101';

// Each group: the rows of one source that print one method, the fragment they held, and the method the sheet
// prints on their line. The expected values are named so a re-run is a no-op and a run after the data moved stops.
const CORRECTIONS = [
  { source: "B-pla-basic-filament-TDS", ids: ["V000045"],
    was: "Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pla-matte-TDS", ids: ["V000066"],
    was: "Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pla-silk-dual-color-TDS", ids: ["V000167"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pla-sparkle-TDS", ids: ["V000227"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "I-PLA-Glass-Fiber-Technical-Data-Sheet", ids: ["V000377"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-792", standards: "ASTM D792" },
  { source: "I-PLA-Glass-Fiber-Technical-Data-Sheet", ids: ["V000381"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-570", standards: "ASTM D570" },
  { source: "S-POLYCN-PolyLite-PETG-TDS-V5-3", ids: ["V000409"],
    was: "ISO 179,", wasStandards: "ISO 179", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },
  { source: "B-petg-hf-TDS", ids: ["V000446"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "I-PETG-Glass-Fiber-Technical-Data-Sheet", ids: ["V000505"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-792", standards: "ASTM D792" },
  { source: "I-PETG-Glass-Fiber-Technical-Data-Sheet", ids: ["V000508"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-638", standards: "ASTM D638" },
  { source: "I-PETG-Glass-Fiber-Technical-Data-Sheet", ids: ["V000509"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-570", standards: "ASTM D570" },
  { source: "B-abs-gf-TDS", ids: ["V000569"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-abs-gf-TDS", ids: ["V000570"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pc-fr-TDS", ids: ["V000701"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "I-PC-CF-TDS", ids: ["V000733"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-792", standards: "ASTM D792" },
  { source: "I-PC-CF-TDS", ids: ["V000736","V000737"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-638", standards: "ASTM D638" },
  { source: "I-PC-CF-TDS", ids: ["V000738"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-790", standards: "ASTM D790" },
  { source: "I-PC-CF-TDS", ids: ["V000739"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-570", standards: "ASTM D570" },
  { source: "B-tpu-for-ams-TDS", ids: ["V000770"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-tpu-for-ams-TDS", ids: ["V000772"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-tpu-for-ams-TDS", ids: ["V000773"],
    was: "Deflection", wasStandards: "Not published", method: "ISO 75", standards: "ISO 75" },
  { source: "B-tpu-for-ams-TDS", ids: ["V000781"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "B-TPU-SOFT-TDS-4", ids: ["V000805"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-TPU-SOFT-TDS-4", ids: ["V000806"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-TPU-SOFT-TDS-4", ids: ["V000807"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-TPU-SOFT-TDS-4", ids: ["V000808"],
    was: "Deflection", wasStandards: "Not published", method: "ISO 75", standards: "ISO 75" },
  { source: "B-TPU-SOFT-TDS-4", ids: ["V000816"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "B-TPU-SOFT-TDS-5", ids: ["V000821"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-TPU-SOFT-TDS-5", ids: ["V000823"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-TPU-SOFT-TDS-5", ids: ["V000824"],
    was: "Deflection", wasStandards: "Not published", method: "ISO 75", standards: "ISO 75" },
  { source: "B-TPU-SOFT-TDS-5", ids: ["V000832"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "S-POLYCN-PolyMide-CoPA-TDS-V5-2", ids: ["V000873","V000882","V001034","V001043","V001100","V001109"],
    was: "ISO 179,", wasStandards: "ISO 179", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },
  { source: "S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1", ids: ["V000976"],
    was: "ISO", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "I-PA6-CF-TDS", ids: ["V001155"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-792", standards: "ASTM D792" },
  { source: "I-PA6-CF-TDS", ids: ["V001158","V001159"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-638", standards: "ASTM D638" },
  { source: "I-PA6-CF-TDS", ids: ["V001162"],
    was: "ASTM", wasStandards: "Not published", method: "ASTM D-570", standards: "ASTM D570" },
  { source: "S-POLYCN-PolyMide-PA6-GF-TDS-V5-1", ids: ["V001175"],
    was: "ISO", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-pva-TDS", ids: ["V001408"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pva-TDS", ids: ["V001409"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-pva-TDS", ids: ["V001410"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-pva-TDS", ids: ["V001411"],
    was: "Deflection", wasStandards: "Not published", method: "ISO 75", standards: "ISO 75" },
  { source: "B-pva-TDS", ids: ["V001413"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-pva-TDS", ids: ["V001414"],
    was: "(X-Y)", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-pva-TDS", ids: ["V001415"],
    was: "Elongation", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-pva-TDS", ids: ["V001416"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "B-pva-TDS", ids: ["V001417"],
    was: "Strength", wasStandards: "Not published", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001429"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001431"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001432"],
    was: "Deflection", wasStandards: "Not published", method: "ISO 75", standards: "ISO 75" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001434"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001435"],
    was: "(X-Y)", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001436"],
    was: "Elongation", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001437"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "B-support-for-pla-petg-TDS", ids: ["V001438"],
    was: "Strength", wasStandards: "Not published", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001460"],
    was: "Transition Temperature", wasStandards: "Not published", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001461"],
    was: "DSC,", wasStandards: "DSC", method: "DSC, 10 °C/min", standards: "DSC" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001462"],
    was: "Temperature", wasStandards: "Not published", method: "ISO 306, GB/T 1633", standards: "ISO 306; GB/T 1633" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001465"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001466"],
    was: "(X-Y)", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001467"],
    was: "Elongation", wasStandards: "Not published", method: "ISO 527, GB/T 1040", standards: "ISO 527; GB/T 1040" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001468"],
    was: "Modulus", wasStandards: "Not published", method: "ISO 178, GB/T 9341", standards: "ISO 178; GB/T 9341" },
  { source: "B-support-for-pa-pet-TDS", ids: ["V001469"],
    was: "Strength", wasStandards: "Not published", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },
  { source: "S-POLYCN-Polymaker-PC-ABS-TDS-V5-1", ids: ["V001574"],
    was: "ISO 179,", wasStandards: "ISO 179", method: "ISO 179, GB/T 1043", standards: "ISO 179; GB/T 1043" },];

const t = openTables();
let changed = 0;
for (const c of CORRECTIONS) {
  changed += correct(t, {
    source: c.source, ids: c.ids, migration: MIGRATION, date: DATE,
    set: {
      'Standard / load': [c.was, c.method],
      Standards: [c.wasStandards, c.standards],
    },
    note: `the sheet prints "${c.method}" as the method for this row; the cell held "${c.was}", a fragment of the column beside it.`,
  });
}
if (changed) t.save();
console.log(`${changed} measurement(s) now name the method their sheet prints`);
