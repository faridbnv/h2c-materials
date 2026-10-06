#!/usr/bin/env node
// Migration m385 (2026-10-06): the drawer draws notched Charpy and notched Izod side by side (D133).
//
// The owner asked for a better way, in the drawer, to compare the two impact tests. They stay two filters, never mixed
// or converted (D92, D94); what changes is how a material's products are shown against them. Which headlines are drawn
// together is data, not a branch in the drawer:
//
//   Drawer comparison    a new column of headline_definitions.csv: the comparison a headline is drawn in, naming a
//                        Topic of method.csv. "Impact tests" on charpyNotched and izodNotched; Not applicable on every
//                        other row, which are drawn as they were.
//   Impact tests         a method.csv row: the caption the drawer prints above the two rows of dots, saying how the
//                        tests differ and that nothing is converted.
//
// Nothing a filter, a verdict or an estimate reads changes. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m385-impact-tests-side-by-side.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm385';
const NA = 'Not applicable';
const TABLE = 'headline_definitions';
const COLUMN = 'Drawer comparison';
const TOPIC = 'Impact tests';
const CAPTION = 'Notched Charpy (ISO 179) and notched Izod (ISO 180) are two tests. Charpy supports the bar at both ends '
  + 'and strikes it in the middle; Izod clamps the bar upright at one end and strikes its free end. Both report the energy '
  + 'absorbed per area of the notched section, in kJ/m², but the bars, notches and supports differ, so a Charpy value is '
  + 'not an Izod value. Each dot is one product\'s published value, and the two rows share a scale only so that a product '
  + 'can be found on both; no value is converted. Izod in J/m (ASTM D256) is energy per metre of notch width: it is listed '
  + 'in the table, not drawn.';
const t = openTables();

let changed = 0;
if (!t.header(TABLE).includes(COLUMN)) {
  t.addColumn(TABLE, COLUMN, { after: 'Comparison note', fill: () => NA });
  changed++;
}
for (const key of ['charpyNotched', 'izodNotched']) {
  const row = t.get(TABLE, key);
  if (row[COLUMN] === TOPIC) continue;
  t.set(TABLE, key, COLUMN, TOPIC, { expect: NA, migration: MIGRATION });
  changed++;
}
const held = t.find('method', TOPIC);
if (held) {
  if (held.Section !== 'Comparison' || held['Definition / rule'] !== CAPTION) throw new Error(`${MIGRATION}: method ${TOPIC} is not what this migration wrote; the data moved`);
} else {
  t.append('method', { Section: 'Comparison', Topic: TOPIC, 'Definition / rule': CAPTION });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): ${COLUMN} on the two impact headlines, and its caption in method.csv`);
