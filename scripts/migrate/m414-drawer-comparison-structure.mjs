#!/usr/bin/env node
// Migration m414 (2026-10-16): the structure the drawer needs to draw comparisons beyond impact (D139). Nothing it
// writes changes what the build reads today.
//
// The owner asked for the impact heading's way of reading a material (a dot per product, the median table, every record
// with its document) to reach tensile strength, stiffness and elongation across XY and Z, and heat deflection beside
// the glass transition. Those need two columns and one table:
//
//   Unstated load            headline_definitions.csv, after Load MPa: what a value whose sheet states no test load is
//                            to a headline defined at one. as-published on hdt045, as the build has read it since D84;
//                            Not applicable on every headline with no load. (m415's HDT at 1.8 MPa is excluded.)
//   Drawer only              headline_definitions.csv, after Drawer comparison: FALSE on every row, so every headline
//                            stays a filter, an axis and a column; m415 adds the rows drawn in the drawer alone.
//   drawer_comparisons.csv   the comparisons the drawer draws, with the words that belong to a whole comparison: the
//                            heading, the title of its closed line on how the tests differ, and the label of the line
//                            naming the products that publish both of a pair. Its first row is Impact tests, in the
//                            words its heading has printed since m392; the caption stays the method.csv rule.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m414-drawer-comparison-structure.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm414';
const NA = 'Not applicable';
const TABLE = 'headline_definitions';
const IMPACT = { Comparison: 'Impact tests', About: 'How Charpy and Izod differ, and what is compared', 'Pair label': 'Both tests' };

const t = openTables(undefined, { allowMissing: true });
let changed = 0;
if (!t.header(TABLE).includes('Unstated load')) {
  t.addColumn(TABLE, 'Unstated load', { after: 'Load MPa', fill: (r) => (r['Load MPa'] === NA ? NA : 'as-published') });
  changed++;
}
if (!t.header(TABLE).includes('Drawer only')) {
  t.addColumn(TABLE, 'Drawer only', { after: 'Drawer comparison', fill: () => 'FALSE' });
  changed++;
}
for (const r of t.rows(TABLE)) {
  const want = r['Load MPa'] === NA ? NA : 'as-published';
  if (r.HeadlineKey === 'hdt045' && r['Unstated load'] !== want) throw new Error(`${MIGRATION}: hdt045's Unstated load is "${r['Unstated load']}"; the data moved`);
}
if (!t.tables().includes('drawer_comparisons')) {
  t.createTable('drawer_comparisons', Object.keys(IMPACT), [IMPACT]);
  changed++;
} else {
  const held = t.find('drawer_comparisons', IMPACT.Comparison);
  if (!held || held.About !== IMPACT.About || held['Pair label'] !== IMPACT['Pair label']) throw new Error(`${MIGRATION}: drawer_comparisons ${IMPACT.Comparison} is not what this migration wrote; the data moved`);
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): Unstated load and Drawer only in ${TABLE}, and drawer_comparisons.csv with Impact tests`);
