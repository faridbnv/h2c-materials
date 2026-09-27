#!/usr/bin/env node
// Migration m195 (2026-09-27): notched Izod becomes a selectable property beside notched Charpy (the owner's decision 8
// of 2026-09-26, docs/GOALS.md; D94).
//
// D92 made the notched Charpy impact strength selectable and left Izod out: two impact filters invite mixing them. The
// owner chose both, never mixed or converted, each saying so. So:
//
//   izodNotched          a row of headline_definitions.csv beside charpyNotched: Izod impact strength, notched, kJ/m²,
//                        XY with an unstated direction counted apart (D84), at 23 ± 2 °C or none stated (D92), to ISO 180.
//   Standard             a new column: the test standard a value that names one must name. An Izod value to ASTM D256
//                        printed in kJ/m² is that test's energy per metre of notch, converted by its maker with a bar
//                        thickness the sheet does not give, so it is no ISO 180 value, as a value in J/m is none. A
//                        value naming no standard counts. Not applicable on every other row: they are as they were.
//   charpyNotched        its labels, hint and comparison note name the test, and say that Izod is another filter, never
//                        mixed or converted; Izod leaves its related properties, so a Charpy cell never shows an Izod
//                        number as its nearest evidence, and the Izod row lists no Charpy for the same reason.
//
// Neither is estimated, neither is a table column, and no template asks either. A re-run is a no-op; a run after the
// data moved stops.
//
//   node scripts/migrate/m195-notched-izod-beside-charpy.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm195-notched-izod-beside-charpy';
const NA = 'Not applicable';
const t = openTables();
const TABLE = 'headline_definitions';

let changed = 0;
const keys = () => t.rows(TABLE).map((r) => r.HeadlineKey);
if (!keys().includes('charpyNotched')) throw new Error(`${migration}: charpyNotched is gone; the data moved`);

// The column, Not applicable on every row it finds.
if (!t.header(TABLE).includes('Standard')) {
  t.addColumn(TABLE, 'Standard', { after: 'Test temperature °C', fill: () => NA });
  changed++;
}

// Charpy: what it was (m176), and what it says now.
const CHARPY_WAS = {
  'Related properties': 'Charpy strength; Izod impact strength; Impact strength',
  Short: 'Impact', Plain: 'Notched impact strength',
  Hint: 'energy a notched bar absorbs when struck; higher is tougher and less brittle',
  'Comparison note': 'Only a notched Charpy bar (ISO 179) in kJ/m², struck at room temperature, is compared. Izod is another test on another bar; a value in J/m (ASTM D256) is energy per metre of notch, and becomes kJ/m² only with the bar\'s thickness; an unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
};
const CHARPY = {
  'Related properties': 'Charpy strength; Impact strength',
  Short: 'Impact (Charpy)', Plain: 'Notched impact, Charpy',
  Hint: 'energy a notched bar held at both ends absorbs when struck; Izod is another test, never mixed or converted',
  'Comparison note': 'Only a notched Charpy bar (ISO 179) in kJ/m², struck at room temperature, is compared. Izod is another test on another bar, clamped upright: it has its own filter, and the two are never mixed or converted. A value in J/m is energy per metre of notch, and becomes kJ/m² only with the bar\'s thickness; an unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
};
const charpy = t.get(TABLE, 'charpyNotched');
for (const [field, value] of Object.entries(CHARPY)) {
  if (charpy[field] === value) continue;
  if (charpy[field] !== CHARPY_WAS[field]) throw new Error(`${migration}: charpyNotched ${field} is "${charpy[field]}", not what m176 wrote; the data moved`);
  t.set(TABLE, 'charpyNotched', field, value, { expect: charpy[field] });
  changed++;
}

const IZOD = {
  HeadlineKey: 'izodNotched', Kind: 'measurement', Unit: 'kJ/m²', 'Value properties': 'Izod impact strength',
  'Related properties': 'Izod impact strength; Impact strength',
  'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound basis': NA,
  Direction: 'XY', 'Unstated direction': 'as-published', 'Load MPa': NA, Notch: 'Notched', 'Test temperature °C': '23', Standard: 'ISO 180',
  'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
  'Comparison note': 'Only a notched Izod bar (ISO 180) in kJ/m², struck at room temperature, is compared. Charpy is another test on another bar, held at both ends: it has its own filter, and the two are never mixed or converted. A value in J/m (ASTM D256) is energy per metre of notch, and one to ASTM D256 printed in kJ/m² is that value converted by its maker with a bar thickness the sheet does not give: neither is an ISO 180 bar. An unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
  Short: 'Impact (Izod)', Plain: 'Notched impact, Izod', Technical: 'Izod impact strength, notched (ISO 180)',
  Hint: 'energy a notched bar clamped upright absorbs when struck; Charpy is another test, never mixed or converted',
  'Axis label': 'Izod impact strength, notched', 'Export header': 'Notched Izod kJ/m2',
  Better: 'max', 'Filter group': 'Mechanical', 'Filter operator': '>=', 'Filter example': 'e.g. 5 for a part that takes knocks', 'Non-negative': 'TRUE',
  'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA, 'Applies to': null, 'Not applicable reason': null,
};
const found = t.find(TABLE, 'izodNotched');
if (found) {
  for (const [k, v] of Object.entries(IZOD)) if ((found[k] ?? null) !== (v ?? null)) throw new Error(`${migration}: izodNotched ${k} is "${found[k]}", not "${v}"; the data moved`);
} else {
  if (!t.find('properties', 'Izod impact strength')) throw new Error(`${migration}: Izod impact strength is not a registered property`);
  t.append(TABLE, IZOD);
  // Beside the Charpy headline: the order of the filter rail, the axis lists and the export.
  const rows = t.rows(TABLE);
  rows.splice(rows.indexOf(t.get(TABLE, 'charpyNotched')) + 1, 0, rows.pop());
  changed++;
}
for (const r of t.rows(TABLE)) {
  const want = r.HeadlineKey === 'izodNotched' ? 'ISO 180' : NA;
  if (r.Standard !== want) throw new Error(`${migration}: ${r.HeadlineKey} Standard is "${r.Standard}", not "${want}"`);
}

if (changed) t.save();
console.log(`${migration}: ${changed ? `${changed} change(s): ${keys().join(', ')}` : 'already applied'}`);
