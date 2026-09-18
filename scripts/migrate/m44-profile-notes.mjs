#!/usr/bin/env node
// Migration m44: profiles.csv was 56 columns wide, and most of them were empty on most rows. Eleven qualitative
// columns held 363 notes between them across 172 profiles: Stringing, Volumetric limit and Difficulty held none at
// all, on any row, ever. Adding a twelfth topic meant a column on every profile and a schema change.
//
// The notes become rows of data/tables/profile_notes.csv, one per profile and topic, the shape a relationship takes
// everywhere else here (headlines, material_links, fatigue_tests). profiles.csv keeps what the build decides on: the
// typed temperature axes, drying, enclosure, abrasion, routing and the fields the drawer already rendered.
//
// Also dropped: the three columns that were never once filled, and Temperature-group conflict, one sentence repeated
// on all 172 rows, which is a rule of the database and belongs in method.csv. Its one clause the Method row did not
// already carry (the 45 °C low-temperature chamber guide limit) is added there.
//
// npm run build:diff: profiles[].storageHumidity removed and profiles[].notes added on every profile, and the one
// Method rule edited. The notes reach the reader for the first time: 363 lines that were in the table and nowhere else.
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';

// The qualitative columns that become rows, in the order profiles.csv held them, which is the order a profile's
// notes are written in. The column name is the topic.
export const NOTE_COLUMNS = ['Adhesion / release', 'Cooling', 'Speed', 'Storage humidity', 'Warping / shrinkage',
  'Bridging', 'Overhang', 'Detail / tolerance', 'Surface finish', 'Layer adhesion', 'Odour / emissions'];

// Columns that carried nothing: three never filled, one a constant that is a rule, not a per-profile fact.
export const EMPTY_COLUMNS = ['Stringing', 'Volumetric limit', 'Difficulty'];
export const CONSTANT_COLUMN = 'Temperature-group conflict';
const CONSTANT_TEXT = 'Do not combine high- and low-temperature materials; low-temperature chamber guide limit 45°C. Grade-specific verification required.';

const PAIRING_WAS = 'Do not mix high- and low-temperature groups. Low-temperature materials can soften in a hot chamber. PVA support pairing requires H2C-specific routing verification; generic soluble support guidance is insufficient.';
const PAIRING_NOW = `${PAIRING_WAS} The low-temperature chamber guide limit is 45 °C, and pairing is verified per grade, not per family.`;

const stated = (v) => v != null && v !== 'Not published' && v !== 'Not applicable' && v !== 'unknown' && String(v).trim() !== '';

export function migrate(t) {
  if (t.tables().includes('profile_notes') && !t.header('profiles').includes('Cooling')) return;

  // Nothing is dropped that carried anything: the three empty columns must still be empty, and the constant must
  // still be the one sentence, or this migration is out of date and stops.
  const filled = EMPTY_COLUMNS.filter((c) => t.rows('profiles').some((r) => stated(r[c])));
  if (filled.length) throw new Error(`m44: ${filled.join(', ')} now carry values; nothing moved`);
  const others = [...new Set(t.rows('profiles').map((r) => r[CONSTANT_COLUMN]))].filter((v) => v !== CONSTANT_TEXT);
  if (others.length) throw new Error(`m44: ${CONSTANT_COLUMN} is not one constant sentence (${others.length} other value(s)); nothing moved`);

  const rows = t.rows('profiles').flatMap((r) => NOTE_COLUMNS.filter((c) => stated(r[c]))
    .map((c) => ({ ProfileID: r.ProfileID, Topic: c, Text: r[c] })));
  if (!t.tables().includes('profile_notes')) t.createTable('profile_notes', ['ProfileID', 'Topic', 'Text'], rows);
  for (const c of [...NOTE_COLUMNS, ...EMPTY_COLUMNS, CONSTANT_COLUMN]) t.dropColumn('profiles', c);

  t.set('method', 'Temperature pairing', 'Definition / rule', PAIRING_NOW, { expect: PAIRING_WAS });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(projectRoot, { allowMissing: true });
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
