#!/usr/bin/env node
// Migration m296 (2026-10-02): a fibre-filled filament wears a brass nozzle, and that is the database's rule, not a sheet's
// statement (D121; OPEN-PROBLEMS §28, "The import's fibre sentence").
//
// The register wrote "Use abrasion-resistant nozzle; verify minimum orifice. Fibre concentration and length are
// grade-specific." into the Abrasion / clogging cell of every fibre-filled row, and the import (scripts/ingest/propose.mjs,
// ABRASIVE) copied the habit onto every fibre profile whose sheet says nothing about the nozzle: 174 live profiles. The
// parser read the sentence as the profile's own requirement, and the selector told a reader "A source states it needs an
// abrasion-resistant nozzle" where no source does. Two of them are not even fibre-filled (P0860 Hyper-PLA+, P0975 Flex TPU
// 95A), and wherever a sheet does speak (26 profiles since m282, m285, m290 and m295) its own words already replaced it.
//
// Here the cell says what the sheet says, nothing, and the rule is stated once, in method.csv (H2C / Abrasive fillers):
// the selector treats a fibre-filled product its own sheet, its twin's (D89) and the printer maker's guide (D88) leave
// silent as abrasive, unresolved under "No hardened nozzle" and never passed. The Hardened nozzle typed cell follows its
// raw cell. Retired duplicate profiles keep what they held; they never reach the database.
//
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m296-fibre-rule-is-a-rule.mjs
import { openTables } from '../data/table-io.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm296';
const SENTENCE = 'Use abrasion-resistant nozzle; verify minimum orifice. Fibre concentration and length are grade-specific.';
const RULE = {
  Section: 'H2C',
  Topic: 'Abrasive fillers',
  'Definition / rule': 'A fibre-filled filament (carbon, glass, aramid or plant fibre) wears a brass nozzle whatever its sheet says. Where neither the product\'s own sheet, its twin\'s (D89) nor the printer maker\'s guide (D88) says what nozzle it needs, the selector treats it as abrasive: under "No hardened nozzle" it is unresolved, never passed. A source\'s own statement always wins, stricter or looser. This is the database\'s rule, not a source\'s statement; until m296 the import wrote it into each fibre profile\'s Abrasion / clogging cell (D121).',
};

const t = openTables();
let cells = 0;
for (const p of t.rows('profiles')) {
  if (p['Abrasion / clogging'] !== SENTENCE || p.Profile === 'Retired duplicate record') continue;
  t.set('profiles', p.ProfileID, 'Abrasion / clogging', 'Not published', { expect: SENTENCE, migration: MIGRATION });
  retype(t, p.ProfileID, ['Abrasion / clogging'], MIGRATION);
  cells++;
}
const held = t.find('method', RULE.Topic);
if (!held) t.append('method', RULE);
else if (held['Definition / rule'] !== RULE['Definition / rule']) throw new Error(`${MIGRATION}: method "${RULE.Topic}" says something else; the data moved since this migration was written`);
if (cells || !held) t.save();
console.log(`${MIGRATION}: ${cells} profile(s) no longer hold the fibre rule as their sheet's words${held ? '' : '; the rule is in method.csv'}`);
