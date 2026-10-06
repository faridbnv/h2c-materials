#!/usr/bin/env node
// Migration m374 (2026-10-05): what four kinds of product are, judged from their own documents (check round 3, D131;
// docs/audits/2026-10-05-check-round-3/scope/verdicts.csv and build/reports/duplicates/judgements.md, researched by
// Claude Sonnet and decided by Claude Opus).
//
// - MakerBot Tough (G027-21) was filed under ABS from its sheet's comparisons with ABS ("2X the impact strength of ABS").
//   The sheet's own numbers are not an ABS's: "Glass Temp 140-149°F 60-65°C" (an ABS's glass transition is about 105 °C)
//   and "Nozzle Temp 419°F 215°C", printed "without the need for heated build plates"; MakerBot's resellers list it as
//   "MakerBot Tough Precision 3D Filament aus PLA". It is filed under PLA as an inferred filing (D106: the grade says
//   so), so it no longer reads ABS's printer-guide row (enclosure required, bed 90-100 °C). PLA's and ABS's maker
//   counts are recounted.
// - FormFutura's EasyFil ABS - Glow in the Dark (G027-58) carries a glow pigment that makers of glow filaments say wears
//   brass nozzles; it read the ABS guide's "All Size/Material" as its hardened-nozzle answer. It is a Variant,
//   "luminescent pigment" (new in schema/vocab/grade-variants.csv), and reads no guide row (D129); its own sheet answers
//   the rest. The glow PLAs are a material of their own (PLA Glow) with no guide row.
// - Two products state what the guide answered for them: Prusament PLA High Speed's page prints "Abrasivity None", and
//   eSUN PLA Clear's sheet says it "does not need to close the cavity" (no enclosure; the parser now reads the phrase).
//   Each goes in the product's own profile, which wins over the guide.
// - Six products print a density above their polymer's neat range and declare no load (OPEN-PROBLEMS §17): SUNLU High
//   Speed Matte PLA (1360, the value of its twin PLA Lite, already this Variant), Spectrum PET-G MATT and eSUN PETG-Matte
//   (1350; a matte finish is usually a mineral load), SUNLU ABS-FR (1150; a flame-retardant package), and AzureFilm ABS
//   Prime and ASA Prime (1130 and 1150, "enhanced formulation"). Each is a Variant, "undisclosed dense filler", as D57
//   and R078 filed the others, so its values stay its own and do not pull its family's estimate.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m374-what-the-product-is.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { moveGrade, recountGrades } from '../data/records.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm374';
const DATE = '2026-10-05';
const NA = 'Not applicable';
const NP = 'Not published';
const t = openTables();
let changed = 0;

// MakerBot Tough is a PLA.
const tough = t.get('grades', 'G027-21');
if (tough.MaterialID === 'M027') {
  for (const q of ['Glass Temp 140-149°F 60-65°C', 'Nozzle Temp 419°F 215°C', 'without the need for heated build plates']) onCachedSheet(t, 'R-ULTIMAKER-MAKERBOT-Tough-One-Sheet', q, MIGRATION);
  changed += moveGrade(t, 'G027-21', 'M001', { migration: MIGRATION });
  t.set('grades', 'G027-21', 'Composition / filler', `Inferred filing (${MIGRATION}, ${DATE}): no document names MakerBot Tough's polymer. Its sheet compares it with ABS ("2X the impact strength of ABS") but prints a PLA's glass transition ("Glass Temp 140-149°F 60-65°C"; an ABS's is about 105 °C), a 215 °C nozzle and no heated bed; MakerBot's resellers list it as "MakerBot Tough Precision 3D Filament aus PLA".`, { expect: tough['Composition / filler'], migration: MIGRATION });
  for (const m of ['M027', 'M001']) recountGrades(t, m, { migration: MIGRATION, date: DATE, because: 'after MakerBot Tough (G027-21) was filed under PLA' });
}

// Glow-in-the-dark ABS is a Variant.
const glow = t.get('grades', 'G027-58');
if (glow.Variant !== 'luminescent pigment') {
  onCachedSheet(t, 'S-PET-formfutura-tds-easyfilabs-glowinthedark', 'glow in the dark', MIGRATION);
  t.set('grades', 'G027-58', 'Variant', 'luminescent pigment', { expect: glow.Variant, migration: MIGRATION });
  t.set('grades', 'G027-58', 'Composition / filler', `A glow-in-the-dark pigment the maker names ("bright green glow in the dark"), loading not published; recorded as a Variant (${MIGRATION}, ${DATE}): makers of glow filaments say the pigment wears brass nozzles, so the ABS printer guide's nozzle answer is not this product's.`, { expect: glow['Composition / filler'], migration: MIGRATION });
  changed++;
}

// The products' own statements, which win over the guide.
for (const [id, column, words, cell] of [['P1760', 'Abrasion / clogging', 'Abrasivity', 'Abrasivity None'], ['P1201', 'Enclosure', 'does not need to close the cavity', 'does not need to close the cavity']]) {
  const p = t.get('profiles', id);
  if (p[column] === cell) continue;
  onCachedSheet(t, p.SourceID, words, MIGRATION);
  t.set('profiles', id, column, cell, { expect: NP, migration: MIGRATION });
  retype(t, id, [column], MIGRATION);
  const after = t.get('profiles', id);
  t.set('profiles', id, 'Locator', `${after.Locator}; ${column} as the page states it (${MIGRATION})`, { expect: after.Locator, migration: MIGRATION });
  changed++;
}

// A density above the neat polymer's range with no load declared (D57, R078).
const NEAT = { M001: ['PLA', 1330], M020: ['PETG', 1300], M027: ['ABS', 1110], M031: ['ASA', 1110] };
for (const [grade, density, why] of [['G001-145', 1360, ' (the value its twin, SUNLU PLA Lite, prints; that grade is this Variant already)'], ['G020-09', 1350, ' (a matte finish is usually a mineral load)'], ['G020-38', 1350, ' (a matte finish is usually a mineral load)'],
  ['G027-14', 1150, ' (a flame-retardant package, "UL94@1.6mm V-0")'], ['G027-39', 1130, ' (the maker\'s "enhanced formulation")'], ['G031-29', 1150, ' (the maker\'s "enhanced formulation")']]) {
  const g = t.get('grades', grade);
  if (g.Variant === 'undisclosed dense filler') continue;
  const [polymer, max] = NEAT[g.MaterialID];
  t.set('grades', grade, 'Variant', 'undisclosed dense filler', { expect: NA, migration: MIGRATION });
  t.set('grades', grade, 'Composition / filler', `Its density of ${density} kg/m³ is above what neat ${polymer} reaches (${max}), so the product carries a filler its name does not declare${why}. Not declared on the sheet; recorded as a Variant under D57 (R078, ${MIGRATION}).`, { expect: g['Composition / filler'], migration: MIGRATION });
  changed++;
}

if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): MakerBot Tough filed under PLA, a glow ABS and six dense products made Variants, two own statements recorded`);
