#!/usr/bin/env node
// Migration m367 (2026-10-05): Polymaker's product pages say how to dry in three places, and the product now shows all of
// them (D130; the owner's answer of 2026-10-05: "make some sense out of their info, or mention both").
//
// Each page prints a print-settings block ("Drying Settings: 100˚C for 10h (Only if the material has absorbed
// moisture)"), a specifications table ("Drying 100°C for 10h", sometimes another schedule or "-"), and tips or FAQ
// ("dry at 100°C for 10 hours before use"). The profiles held one of the three, whichever the import met first, so two
// products with one page template read one as optional and the other as required. Read whole:
//   - where the page tells the reader to dry before use or before printing, with no condition (the Fiberon nylons,
//     PolyMide CoPA's "Filament dryer required", ABS Pro's and ABS Max's FAQ), drying is required, and the cell holds
//     that statement or the specifications schedule beside it;
//   - where every statement the page makes is conditional ("Only if the material has absorbed moisture", "if
//     moisture-related defects appear": PolyLite PC, PETG ESD, PolyMax PETG, the TPUs, ASA), drying is optional, and the
//     cell holds the print-settings block with its condition;
//   - every other drying statement on the page, another schedule or the condition the cell does not carry, is a note on
//     the profile (Topic "Drying"), so the product shows both.
// Each quote is checked on the cached page. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m367-a-page-read-whole-for-drying.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm367';
const t = openTables();
const SETTINGS_NYLON = 'Drying Settings: Regular Oven: 100˚C for 10h PolyDryer: Level 3 for 18h ( PolyDryer™ ) (Only if the material has absorbed moisture)';
const BEFORE_USE = 'Store and print under dry conditions (relative humidity below 20%); dry at 100°C for 10 hours before use.';

// [profile, the new Drying cell or null to keep it, the cell it replaces, [[where on the page, the page's words], ...]]
const PAGES = [
  ['P1366', 'We recommend drying ABS Pro at 70°C for 6 hours before printing, or whenever it has absorbed moisture.', '70˚C for 6h (Only if the material has absorbed moisture)',
    [['Print settings', 'Drying Settings: 70˚C for 6h (Only if the material has absorbed moisture)']]],
  ['P1751', 'We recommend drying ABS Max at 70°C for 6 hours before printing, or whenever it has absorbed moisture.', '70˚C for 6h (Only if the material has absorbed moisture)',
    [['Print settings', 'Drying Settings: 70˚C for 6h (Only if the material has absorbed moisture)']]],
  ['P1747', null, null, [['Specifications', 'Drying 65°C for 4h'], ['Tips', 'Keep the filament sealed and dry; use the listed 65°C / 6h drying cycle if moisture-related defects appear.']]],
  ['P1749', null, null, [['Specifications', 'Drying 50°C for 6h']]],
  ['P1750', null, null, [['Specifications', 'Drying 50°C for 6h']]],
  ['P1862', null, null, [['Specifications', 'Drying 70°C for 7h'],
    ['FAQ', 'If the filament has only been exposed briefly under normal conditions, drying at 70°C for 4 hours is typically sufficient.']]],
  ['P1854', null, null, [['Print settings', SETTINGS_NYLON], ['Tips', BEFORE_USE]]],
  ['P1868', null, null, [['Print settings', SETTINGS_NYLON], ['Tips', BEFORE_USE]]],
  ['P1869', null, null, [['Print settings', SETTINGS_NYLON], ['Tips', BEFORE_USE]]],
  ['P1870', null, null, [['Print settings', SETTINGS_NYLON], ['Tips', BEFORE_USE]]],
  ['P1855', null, null, [['Print settings', 'Drying Settings: 100˚C for 10h (Only if the material has absorbed moisture)'],
    ['Tips', 'Store and print under dry conditions (relative humidity below 20%); dry at 100°C for 10 hours before use and feed from a dry box or heated filament dryer during printing.']]],
  ['P1863', null, null, [['Print settings', 'Drying Settings: 80˚C for 10h (Only if the material has absorbed moisture)'],
    ['Tips', 'Keep the filament sealed and dry; use the listed 100°C / 8h drying cycle if moisture-related defects appear.'],
    ['Printing requirements', 'Filament dryer required - the material is very hygroscopic.']]],
  ['P1865', '75˚C for 12h (Only if the material has absorbed moisture)', '100°C for 8h',
    [['Specifications', 'Drying 100°C for 8h'], ['Tips', 'Keep the filament sealed and dry; use the listed 75°C / 6h drying cycle if moisture-related defects appear.']]],
  ['P1867', '65˚C for 3h PolyDryer™ : Level 3 for 6h (Only if the material has absorbed moisture)', '65°C for 3h',
    [['Specifications', 'Drying 65°C for 3h']]],
];

let cells = 0, notes = 0;
for (const [id, cell, expect, said] of PAGES) {
  const p = t.get('profiles', id);
  if (cell && p.Drying !== cell) {
    onCachedSheet(t, p.SourceID, cell, MIGRATION);
    t.set('profiles', id, 'Drying', cell, { expect, migration: MIGRATION });
    retype(t, id, ['Drying'], MIGRATION);
    const after = t.get('profiles', id);
    t.set('profiles', id, 'Locator', `${after.Locator}; Drying read with the page whole (${MIGRATION}, D130)`, { expect: after.Locator, migration: MIGRATION });
    cells++;
  }
  // One note per profile and topic (the table's key): the page's other statements, each named by where it stands.
  const text = said.map(([where, words]) => `${where}: "${words}"`).join(' ');
  if (t.rows('profile_notes').some((n) => n.ProfileID === id && n.Topic === 'Drying')) continue;
  for (const [, words] of said) onCachedSheet(t, p.SourceID, words, MIGRATION);
  t.append('profile_notes', { ProfileID: id, Topic: 'Drying', Text: text }, { migration: MIGRATION });
  notes++;
}
if (cells || notes) t.save();
console.log(`${MIGRATION}: ${cells} drying cell(s) read with the page whole; ${notes} profile(s) given a note of the page's other drying statements`);
