#!/usr/bin/env node
// Migration m470 (2026-10-20): a product whose filler is only for looks reads its type's printer guide in full (D175).
//
// The owner's ruling of 2026-10-20 (GOALS-LOG, item 7; OPEN-PROBLEMS §32.4): "if the variant for looks is reading one thing
// from the guides it can read other things too." Products whose density sits above their polymer's neat range and whose
// makers name no load are Variant "undisclosed dense filler" (D57, R078, m131, m374), and a Variant reads no guide row
// (D129). Twenty-eight active products hold that Variant. Claude Opus 5.5 read every one's documents in the source cache
// (docs/audits/2026-10-20-owner-rulings/small-rules/COSMETIC-FILLERS.md lists each with what its pages say); eleven sell
// the product for a look a filler gives, a matte finish or a glitter, and for no function, and say nothing of the filler
// changing how it prints. They become the new Variant "cosmetic dense filler" (schema/vocab/grade-variants.csv, Reads its
// type's guide TRUE), which reads its material's guide row in full and its kind of plastic's chamber need; their own
// statements still come first. SUNLU PLA Lite is its twin's (one formulation, one table, R053): its sheet prints SUNLU High
// Speed Matte PLA's table word for word, and that product's name sells the matte finish.
//
// Left where they are: AzureFilm ABS Prime and ASA Prime (a "zero warp engineering" formulation sold for strength and
// adhesion, which may print otherwise than the guide's ABS and ASA), 3D4Makers Facilan C8 (an engineering formulation),
// the metal fills (makers say metal powders wear a brass nozzle, D129), SUNLU ABS-FR, Nanovia PLA XRS, 3DXTECH SimuBone and
// Recreus PLA Purifier (a load sold for a function), and the polyolefins and Spectrum's PA6 and HDPE (no look is sold).
//
// The two guide mappings that now speak for such products say so in their Reason. Every quote is checked on its cached
// sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m470-a-filler-for-looks-prints-as-its-type.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../lib/sweep-shared.mjs';

const MIGRATION = 'm470';
const FROM = 'undisclosed dense filler';
const TO = 'cosmetic dense filler';
const t = openTables();

// [grade, source, quotes (checked on the sheet), what the documents sell, as the Composition / filler sentence adds it]
const PRODUCTS = [
  ['G020-09', 'S-SPECTRUM-en-tds-petg-matt', 'possible to obtain matte surfaces of printed object | improves their aesthetic properties | Ruby or hardened nozzle not necessary',
    'Its sheet sells it for its look: a composition "modified so that it is possible to obtain matte surfaces of printed object", whose matte finish "improves their aesthetic properties" (p. 1); it asks for no hardened nozzle'],
  ['G020-38', 'S-PEBA-PETG-Matte-TDS', 'PETG-Matte filament is an entry-level matte product | matte texture of the printed model',
    'Its sheet sells it for its look: "an entry-level matte product" with the "matte texture of the printed model" (p. 1)'],
  ['G001-102', 'S-PET-TDS-Matt-PLA', 'is modified to have a rough and matt surface finish | reinforced by its matt appearance',
    'Its sheet sells it for its look: Matt PLA "is modified to have a rough and matt surface finish" (p. 1)'],
  ['G001-118', 'R-3DJAKE-3DJAKE-TDS-PLA-MATTE', 'PLA Matte (HS) is our high-speed matte PLA formulation | the matte look hides layer lines',
    'Its sheet sells it for its look: "our high-speed matte PLA formulation", whose "matte look hides layer lines" (p. 1); the speed is the formulation\'s, the matte look the filler\'s'],
  ['G020-56', 'R-EXTRUDR-xpetg-matt-TDS-en', 'Matte surface | a good balance between optical | Hardened Nozzle no',
    'Its sheet sells it for its look: a "Matte surface" first among its features, for "a good balance between optical and mechanical material properties" (p. 1); it asks for no hardened nozzle'],
  ['G001-145', 'R-SUNLU-689d1925-acad-4de8-9079-c8eee9c3081e', 'Product Name: High Speed Matte PLA | Decorative items, toys, accessories, figurines',
    'Its name sells it for its look, a matte finish, and its sheet for "Decorative items, toys, accessories, figurines" (p. 1)'],
  ['G001-36', 'R-SUNLU-bbf6d99b-179f-4eee-a7d6-505d125658cd', 'Product Name: PLA Lite | Decorative items, toys, accessories, figurines',
    'Its sheet prints the table SUNLU High Speed Matte PLA\'s prints, one formulation (R053), and that product\'s name sells the matte finish, so the filler is its matting filler; its own sheet sells it for "Decorative items, toys, accessories, figurines" (p. 1)'],
  ['G001-111', 'R-SUNLU-PLA-Classic-TDS', 'High toughness,with m | atte texture',
    'Its sheet sells it "with matte texture" (p. 1, its features, printed across two columns as "with m" and "atte texture")'],
  ['G001-140', 'R-ERYONE-eryone-pla-lite-tds', 'It is a filament with a matte effect | appearance models',
    'Its sheet sells it for its look: "a filament with a matte effect", for "most appearance models" (p. 1)'],
  ['G001-193', 'S-PEBA-eSUN-eTwinkling-Filament-TDS-V4-0', 'Special glittering color | Easy to print as PLA',
    'Its sheet sells it for its look, a "Special glittering color", and says it is "Easy to print as PLA" (p. 1)'],
  ['G001-188', 'D-RECREUS-PLA-PAGE', 'What sets this PLA apart is its industrial matte finish | Industrial matte surface with excellent detail',
    'Its maker\'s page sells it for its look: "What sets this PLA apart is its industrial matte finish" ("Superior Finish: Industrial matte surface with excellent detail")'],
];

let changed = 0;
for (const [grade, source, quotes, sells] of PRODUCTS) {
  const g = t.get('grades', grade);
  if (g.Variant === TO) continue;
  onSheet(t, source, quotes, MIGRATION);
  const head = g['Composition / filler'].replace(/ \([^)]*\)\. Not declared on the sheet; recorded as a Variant under D57.*$/, '').replace(/\. Not declared on the sheet; recorded as a Variant under D57.*$/, '');
  if (!/^Its density of \d+ kg\/m³ is above what neat \w+ reaches \(\d+\), so the product carries a filler its name does not declare$/.test(head)) {
    throw new Error(`${MIGRATION}: ${grade}'s Composition / filler is not the sentence it was: ${g['Composition / filler']}`);
  }
  t.set('grades', grade, 'Variant', TO, { expect: FROM, migration: MIGRATION });
  t.set('grades', grade, 'Composition / filler', `${head}. ${sells}. Recorded as a Variant, a cosmetic dense filler, which prints as its type (D175, ${MIGRATION}); an undisclosed dense filler before (D57, R078).`,
    { expect: g['Composition / filler'], migration: MIGRATION });
  changed++;
}

// The guide rows that now answer for such products name them among what they are, and what they are not.
const REASONS = {
  M001: ['The guide\'s PLA is Bambu Lab\'s unfilled PLA, and M001 is unfilled PLA with no variant class. Not PLA Silk, the particle-filled PLAs, PLA Aero, PLA-ESD or the PLA family\'s home, which the guide does not name, nor PLA-CF, which it names apart.',
    'The guide\'s PLA is Bambu Lab\'s unfilled PLA, and M001 is unfilled PLA with no variant class: its products, its crystallising grades (D158) and those whose filler is only for looks, a matte finish or a glitter (D175), print as it. Not its other variants (a metal powder, a lightweight or functional load), PLA Silk, the particle-filled PLAs, PLA Aero, PLA-ESD or the PLA family\'s home, which the guide does not name, nor PLA-CF, which it names apart.'],
};
for (const [material, [before, after]] of Object.entries(REASONS)) {
  const row = t.get('print_guide_materials', material);
  if (row.Reason === after) continue;
  t.set('print_guide_materials', material, 'Reason', after, { expect: before, migration: MIGRATION });
  t.set('print_guide_materials', material, 'Reviewed by', `${row['Reviewed by']}; its variants named by Claude Opus 5.5, 2026-10-20 (${MIGRATION}, D175)`, { expect: row['Reviewed by'], migration: MIGRATION });
  changed++;
}

if (changed) t.save();
console.log(`${MIGRATION}: ${changed} record(s) changed`);
