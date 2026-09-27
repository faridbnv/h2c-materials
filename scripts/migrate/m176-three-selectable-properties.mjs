#!/usr/bin/env node
// Migration m176 (2026-09-26): three new selectable properties, where enough comparable data exists: the layer
// strength (tensile strength along Z), the notched Charpy impact strength, and the glass transition (phase 6, lane 4;
// re-center scorecard C1; D92).
//
// Each is a row of headline_definitions.csv, and each product's value is chosen by rule from its own measurements
// (build/src/products.js), as for every headline since D83. None is estimated. Two of them need a condition the table
// could not state, so it gains four columns, each Not applicable on the six rows it had:
//
//   Unstated direction    what a value whose source states no direction is to a headline with a direction:
//                         as-published (D84; XY, where a flat bar is how makers test unless they say otherwise) or
//                         excluded (the layer strength: a maker who pulls a bar across its layers says so, and a value
//                         with no direction is almost always a flat or a moulded bar)
//   Notch                 the notch an impact value must state: an unnotched bar absorbs several times the energy of a
//                         notched one, and one whose notch the sheet does not state could be either
//   Test temperature °C   the temperature the headline is defined at: a bar struck at -30 °C is another number (m175
//                         types the measurement's own)
//   Comparison note       what the headline compares and why its related values that are not its own are left out,
//                         which the drawer shows beside them
//
// Charpy, not Izod: of the notched impact values in kJ/m², Charpy (ISO 179) is published comparably (printed or
// unstated specimen, XY, room temperature) by about twice as many products as Izod (ISO 180). Izod values, and every
// value in J/m (ASTM D256, energy per metre of notch, which becomes kJ/m² only with the bar's thickness), stay recorded
// and shown, and the drawer says why they are not compared.
//
// None is a default table column. The Properties table fits a 1440 px screen with the filters open (docs/INTERFACE.md,
// D62) with the columns it has; with the layer strength and the impact strength beside them it needed 1,226 px in a
// 1,068 px box and scrolled, and with the layer strength alone 1,127 px. Each is a filter, a chart axis, a key number
// and product value in the drawer, a Compare row and an export column.
//
// The new rows sit beside the headlines they are nearest (the layer strength after the in-plane strength, the impact
// strength after the stretch, the glass transition after the heat deflection), which is the order of the filter rail,
// the charts' axis lists and the export. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m176-three-selectable-properties.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm176-three-selectable-properties';
const NA = 'Not applicable';
const t = openTables();
const TABLE = 'headline_definitions';

// The new columns, each after the column it qualifies, and what the six existing rows hold in it.
const COLUMNS = [
  ['Unstated direction', 'Direction', (r) => (r.Direction === 'XY' ? 'as-published' : NA)],
  ['Notch', 'Load MPa', () => NA],
  ['Test temperature °C', 'Notch', () => NA],
  ['Comparison note', 'Endpoint note', () => NA],
];
const EXISTING = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045', 'priceCADkg'];

const TENSILE = 'Tensile strength (endpoint unspecified); Tensile yield strength; Tensile break strength';
const common = {
  Kind: 'measurement', 'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound basis': NA,
  'Load MPa': NA, Better: 'max', 'Filter operator': '>=', 'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA,
  'Applies to': null, 'Not applicable reason': null,
};
const ROWS = [
  ['tensileStrengthXY', {
    ...common, HeadlineKey: 'tensileStrengthZ', Unit: 'MPa', 'Value properties': TENSILE, 'Related properties': TENSILE,
    Direction: 'Z', 'Unstated direction': 'excluded', Notch: NA, 'Test temperature °C': NA,
    'Evidence group': 'mechanical', 'Endpoint note': 'TRUE',
    'Comparison note': 'Only a bar the source says was printed upright and pulled along Z is compared: that is how well the layers hold together. A value with no stated direction is almost always a flat or a moulded bar, so it is left out, not counted apart; a bar labelled XZ or ZX is shown and not compared, because sheets use those labels for bars printed on edge and upright alike.',
    Short: 'Layer strength', Plain: 'Strength across layers', Technical: 'Tensile strength, Z direction',
    Hint: 'load it takes pulled across its layers before they part; a printed part\'s weak direction',
    'Axis label': 'Tensile strength Z', 'Export header': 'Layer strength MPa',
    'Filter group': 'Mechanical', 'Filter example': 'e.g. 20 for a part pulled across its layers', 'Non-negative': 'TRUE',
  }],
  ['elongationXY', {
    ...common, HeadlineKey: 'charpyNotched', Unit: 'kJ/m²', 'Value properties': 'Charpy strength',
    'Related properties': 'Charpy strength; Izod impact strength; Impact strength',
    Direction: 'XY', 'Unstated direction': 'as-published', Notch: 'Notched', 'Test temperature °C': '23',
    'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
    'Comparison note': 'Only a notched Charpy bar (ISO 179) in kJ/m², struck at room temperature, is compared. Izod is another test on another bar; a value in J/m (ASTM D256) is energy per metre of notch, and becomes kJ/m² only with the bar\'s thickness; an unnotched bar absorbs several times the energy, and one whose notch the sheet does not state could be either; a bar struck cold is another number. All of them stay on record and are shown here.',
    Short: 'Impact', Plain: 'Notched impact strength', Technical: 'Charpy impact strength, notched (ISO 179)',
    Hint: 'energy a notched bar absorbs when struck; higher is tougher and less brittle',
    'Axis label': 'Charpy impact strength, notched', 'Export header': 'Notched Charpy kJ/m2',
    'Filter group': 'Mechanical', 'Filter example': 'e.g. 10 for a part that takes knocks', 'Non-negative': 'TRUE',
  }],
  ['hdt045', {
    ...common, HeadlineKey: 'glassTransition', Unit: '°C', 'Value properties': 'Glass transition temperature',
    'Related properties': 'Glass transition temperature',
    Direction: NA, 'Unstated direction': NA, Notch: NA, 'Test temperature °C': NA,
    'Evidence group': 'thermal', 'Endpoint note': 'FALSE',
    'Comparison note': 'The product\'s own value, as its sheet publishes it, almost always by DSC. It is a property of the plastic, not of a bar, so it has no direction; a resin supplier\'s value is the raw material\'s, not the product\'s, and is shown, not compared.',
    Short: 'Glass transition', Plain: 'Glass transition', Technical: 'Glass transition temperature (Tg)',
    Hint: 'where it turns from glassy to rubbery; an amorphous plastic loses its stiffness above it',
    'Axis label': 'Glass transition temperature', 'Export header': 'Glass transition C',
    'Filter group': 'Thermal', 'Filter example': 'e.g. 100 for a part near boiling water', 'Non-negative': 'FALSE',
  }],
];

let changed = 0;
const keys = () => t.rows(TABLE).map((r) => r.HeadlineKey);
for (const key of EXISTING) if (!keys().includes(key)) throw new Error(`${migration}: headline ${key} is gone; the data moved`);
for (const [column, after, fill] of COLUMNS) {
  if (!t.header(TABLE).includes(column)) { t.addColumn(TABLE, column, { after, fill }); changed++; }
}
for (const key of EXISTING) {
  const r = t.get(TABLE, key);
  for (const [column, , fill] of COLUMNS) if (r[column] !== fill(r)) throw new Error(`${migration}: ${key} ${column} is "${r[column]}", not "${fill(r)}"; the data moved`);
}
for (const [after, row] of ROWS) {
  const found = t.find(TABLE, row.HeadlineKey);
  if (found) {
    for (const [k, v] of Object.entries(row)) if ((found[k] ?? null) !== (v ?? null)) throw new Error(`${migration}: ${row.HeadlineKey} ${k} is "${found[k]}", not "${v}"; the data moved`);
    continue;
  }
  for (const name of row['Value properties'].split('; ')) if (!t.find('properties', name)) throw new Error(`${migration}: property ${name} is not registered`);
  t.append(TABLE, row);
  // Beside the headline it is nearest: the rows array is the table's own, in file order.
  const rows = t.rows(TABLE);
  rows.splice(rows.indexOf(t.get(TABLE, after)) + 1, 0, rows.pop());
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed ? `${changed} change(s): ${keys().join(', ')}` : 'already applied'}`);
