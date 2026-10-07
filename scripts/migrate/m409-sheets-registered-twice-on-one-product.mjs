#!/usr/bin/env node
// Migration m409 (2026-10-07): the copies of a product's own sheet registered beside it, whose rows repeat its rows on
// the same product (completeness round, item 2; D136).
//
// m182 retired the repeated rows of ten such copies when MEAS-CROSS-SOURCE-TWIN found them, and OPEN-PROBLEMS said
// more were waiting under its threshold: the lint ignores a value more than ten sources share, so a copy whose values
// are common is never paired. scripts/audit/duplicates.mjs pairs sources without that cap; 37 of its pairs are two
// documents of one product on its own grade. Claude Opus read each pair's addresses, revisions and text
// (docs/audits/2026-10-07-completeness-round/decisions/same-grade-pairs.csv) and sorted them by the rule m182 used:
//
//   - one table registered twice is one document: 3DJake's copies (3d.nice-cdn.com) of the maker's own sheet, the
//     maker's own sheet under a second address (Extrudr's PETG bundle), and its German or Italian edition. The maker's
//     own English sheet stays, each copy's row that repeats a row of it is retired naming its twin, and a row the copy
//     prints and the maker's sheet does not stays where it is. A copy none of whose rows stands is kept as
//     corroboration.
//   - two revisions of a sheet (iSANMATE ABS-GF of 2024 and 2025, 3DXTECH CF-HTN v1 and v2, 3DXSTAT ESD-Ultem 3.0 and
//     3.1, PolyFlex TPU90 V4.2 and V5.1, Polymaker ABS V5.6 and V6.0, ASA V6.0 and an older copy, Fiberon PETG-ESD and
//     PolyMax PETG-ESD, Extrudr PLA NX2 and NX2 MATT, SUNLU's ISO PLA+ and PLA+2.0 sheets, and 3DJake's copy of
//     Fiberlogy R-PLA, which names ISO 527 where Fiberlogy's sheet now names ASTM D882) stay, as §30 and m174 hold:
//     a maker republishing a value is not a value measured twice, and each sheet is what it printed.
//
// Each twin is checked before anything is written: the same grade, property, value, upper bound, unit, operator,
// direction, load, notch, moisture, post-processing, specimen and standards, and the same Data status. A re-run is a no-op, and a run after the data moved
// stops.
//
//   node scripts/migrate/m409-sheets-registered-twice-on-one-product.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm409';
const DATE = '2026-10-07';
const t = openTables();

const JAKE = "3DJake's copy (3d.nice-cdn.com) of the maker's sheet";
// [the copy, the maker's own sheet that stays, what the copy is]
const PAIRS = [
  ['R-FIBERLOGY-FIBERLOGY-ABS-TDS-4', 'R-3DJAKE-FIBERLOGY-ABS-TDS', "a second 3DJake copy (FIBERLOGY_ABS_TDS[4].pdf) of the Fiberlogy sheet that"],
  ['R-3DJAKE-FIBERLOGY-PCABS-TDS', 'R-FIBERLOGY-FIBERLOGY-PCABS-TDS', JAKE],
  ['R-EXTRUDR-petg-bundle-TDS-en', 'R-EXTRUDR-petg-TDS-en', "Extrudr's own sheet for its PETG bundle, the same table as"],
  ['R-EXTRUDR-pla-hs-TDS-en-8f08c1', 'R-EXTRUDR-pla-hs-TDS-en', JAKE],
  ['R-EXTRUDR-pla-nx2-matt-TDS-it', 'R-EXTRUDR-pla-nx2-matt-TDS-en', "the Italian edition of Extrudr's sheet"],
  ['R-FABRU-PUREFIL-17-Materialdatenblatt-ASA-purefil', 'R-FABRU-16-material-datat-sheet-ASA-purefil', "the German edition of Fabru's sheet"],
  ['R-FABRU-PUREFIL-3493-Materialdatenblatt-HDPE-GF20-purefil', 'R-FABRU-3492-Material-data-sheet-HDPE-GF20-purefil', "the German edition of Fabru's sheet"],
  ['R-FABRU-PUREFIL-749-Materialdatenblatt-PLA-purefil', 'R-FABRU-4691-material-data-sheet-PLA-purefil', "the German edition of Fabru's sheet"],
  ['R-FIBERLOGY-FIBERLOGY-EASY-PET-G-TDS', 'R-FIBERLOGY-FIBERLOGY-EASYPETG-TDS', JAKE],
  ['R-FIBERLOGY-FIBERLOGY-EASY-PET-G-TDS-5', 'R-FIBERLOGY-FIBERLOGY-EASYPETG-TDS', JAKE],
  ['R-FIBERLOGY-FIBERLOGY-MATTFLEX-40D-TDS-1', 'R-FIBERLOGY-FIBERLOGY-MATTFLEX-40D-TDS', "a second 3DJake copy (FIBERLOGY_MATTFLEX_40D_TDS[1].pdf) of the Fiberlogy sheet that"],
  ['R-FIBERLOGY-FIBERLOGY-PCTG-TDS-0', 'R-FIBERLOGY-FIBERLOGY-PCTG-TDS', JAKE],
  ['S-SPECTRUM-EN-TDS-Spectrum-PETG-Premium-High-Speed', 'S-SPECTRUM-en-tds-spectrum-petg-premium-high-speed', JAKE],
  ['S-SPECTRUM-EN-TDS-Spectrum-PLA-ESD', 'S-SPECTRUM-en-tds-spectrum-pla-esd', JAKE],
  ['S-SPECTRUM-EN-TDS-The-Filament-PLA', 'S-SPECTRUM-eng-tds-the-filament-pla', JAKE],
  ['S-SPECTRUM-EN-TDS-The-Filament-PLA-HS', 'S-SPECTRUM-eng-tds-the-filament-pla-hs', JAKE],
  ['S-SPECTRUM-EN-TDS-Spectrum-PLA-Pro-2', 'S-SPECTRUM-en-tds-spectrum-pla-pro', JAKE],
  ['R-FIBERLOGY-FIBERLOGY-R-PET-G-TDS-0', 'R-FIBERLOGY-FIBERLOGY-RPETG-TDS', JAKE],
  ['R-FIBERLOGY-FIBERLOGY-FIBERFLEX-CF-TDS', 'R-FIBERLOGY-FIBERLOGY-FIBERFLEXCF-TDS', JAKE],
  ['R-COLORFABB-Files-colorFabb', 'R-COLORFABB-TDS-colorFabb-PLA-High-Speed-PRO', JAKE],
  ['R-EXTRUDR-durapro-pa12-cf-TDS-it', 'R-EXTRUDR-durapro-pa12-cf-TDS-en', "the Italian edition of Extrudr's sheet"],
  ['R-EXTRUDR-flex-semisoft-TDS-en-f4e958', 'R-EXTRUDR-flex-semisoft-TDS-en', JAKE],
  ['R-3DJAKE-FIBERLOGY-PCTGCF-TDS', 'R-FIBERLOGY-FIBERLOGY-PCTGCF-TDS', JAKE],
  ['R-FIBERLOGY-FIBERLOGY-PCTGGF-TDS-1', 'R-FIBERLOGY-FIBERLOGY-PCTGGF-TDS', JAKE],
  ['R-EXTRUDR-pctg-TDS-de', 'R-EXTRUDR-pctg-TDS-en', "the German edition of Extrudr's sheet"],
];
const RETIRED = 'Retired duplicate record';
// Stricter than m182: the specimen and the standards too. A copy whose row names another standard or specimen than the
// maker's (Fiberlogy's R-PLA copy prints ISO 527 where the maker's sheet now prints ASTM D882) is another revision of
// the sheet, or another reading of it, and stays; only a row the maker's own sheet holds identically is retired, so no
// product's value changes, only the record it is read from.
const FIELDS = ['GradeID', 'Property', 'Normalized value', 'Normalized unit', 'Normalized upper bound', 'Operator', 'Direction', 'Test load MPa', 'Notch', 'Moisture state', 'Post-processing state', 'Specimen type', 'Standards', 'Data status'];
const key = (m) => FIELDS.map((f) => m[f]).join('\u0000');

let n = 0;
const tally = [];
for (const [copy, own, what] of PAIRS) {
  if (!t.find('sources', copy) || !t.find('sources', own)) throw new Error(`${MIGRATION}: ${copy} or ${own} is not a source`);
  const ownRows = new Map();
  for (const m of t.rows('measurements').filter((x) => x.SourceID === own && x['Data status'] !== RETIRED)) if (!ownRows.has(key(m))) ownRows.set(key(m), m);
  const copyRows = t.rows('measurements').filter((m) => m.SourceID === copy);
  let retired = 0;
  for (const m of copyRows) {
    if (m['Data status'] === RETIRED) continue;
    const twin = ownRows.get(key(m));
    if (!twin) continue;
    t.set('measurements', m.MeasurementID, 'Data status', RETIRED, { expect: m['Data status'], migration: MIGRATION });
    t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Retired ${DATE} (${MIGRATION}): ${copy} is ${what} ${own}, which prints the same table; ${twin.MeasurementID} is the record that stays.`, { expect: m.Notes, migration: MIGRATION });
    retired++;
    n++;
  }
  const s = t.get('sources', copy);
  const standing = copyRows.filter((m) => t.get('measurements', m.MeasurementID)['Data status'] !== RETIRED).length;
  const profiles = t.rows('profiles').filter((p) => p.SourceID === copy && !/^Retired/.test(p.Profile)).length;
  if (!standing && !profiles && s['Citation role'] === 'cited') {
    t.set('sources', copy, 'Citation role', 'corroboration', { expect: 'cited', migration: MIGRATION });
    t.set('sources', copy, 'Source note', `${s['Source note']} ${what[0].toUpperCase()}${what.slice(1)} ${own}: the same table, so its rows are retired as duplicates (${MIGRATION}).`.trim(), { expect: s['Source note'], migration: MIGRATION });
    n++;
  }
  tally.push(`  ${String(retired).padStart(3)} retired, ${standing} standing, ${profiles} profile(s)  ${copy}`);
}
// A product filed on the copy is filed on the maker's own sheet instead: the rule reads a product's own data sheet
// before another source (build/src/products.js, preference), and the copy's rows are now the maker's.
for (const [grade, copy, own] of [['G020-17', 'R-EXTRUDR-petg-bundle-TDS-en', 'R-EXTRUDR-petg-TDS-en'], ['G144-03', 'R-3DJAKE-FIBERLOGY-PCTGCF-TDS', 'R-FIBERLOGY-FIBERLOGY-PCTGCF-TDS']]) {
  if (t.get('grades', grade).SourceID === own) continue;
  t.set('grades', grade, 'SourceID', own, { expect: copy, migration: MIGRATION });
  n++;
}
console.log(tally.join('\n'));
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${n} change(s) (dry run)`); process.exit(0); }
if (n) t.save();
console.log(`${MIGRATION}: ${n} record(s) written`);
