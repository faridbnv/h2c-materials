#!/usr/bin/env node
// Migration m06: the property registry, so a property is data instead of code.
//
// Before: each property's meaning was hardcoded, differently, in about a dozen places: its unit,
// which measurements may back a headline, which count as related evidence, its direction and load,
// whether it is mechanical or thermal, and in the app its labels, filter, axis, table column and
// export header.
//
// After:
//  - data/tables/properties.csv: one row per measured property (the names measurements use), with its
//    domain, the canonical units a usable measurement may carry, and optionally which materials it
//    applies to.
//  - data/tables/headline_definitions.csv: one row per headline the selector compares on, with
//    everything the build and the app need to compile, check, label, filter, plot and export it.
// Both are copied from the constants they replace (test/fixtures/legacy-constants.json).

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const MECHANICAL = ['Tensile modulus', 'Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength',
  'Elongation at break', 'Elongation at yield', 'Tensile strain at strength', 'Flexural modulus', 'Flexural strength',
  'Flexural elongation at break', 'Flexural stress at conventional deflection', 'Charpy strength', 'Izod strength',
  'Izod impact strength', 'Impact strength', 'Hardness', 'Compression strength', 'Interlayer adhesion strength', 'Fatigue life'];
const THERMAL = ['HDT', 'Glass transition temperature', 'Vicat softening temperature', 'Melting temperature',
  'Crystallization temperature', 'Continuous service temperature', 'Thermal conductivity', 'Coefficient of thermal expansion'];

const UNITS = {
  'Density': 'kg/m³', 'Tensile modulus': 'GPa', 'Tensile strength (endpoint unspecified)': 'MPa', 'Tensile yield strength': 'MPa',
  'Tensile break strength': 'MPa', 'Elongation at break': '%', 'Elongation at yield': '%', 'Tensile strain at strength': '%',
  'Flexural modulus': 'GPa', 'Flexural strength': 'MPa', 'Flexural elongation at break': '%', 'Flexural stress at conventional deflection': 'MPa',
  'Charpy strength': 'kJ/m²', 'Izod strength': 'kJ/m²; J/m', 'Izod impact strength': 'kJ/m²; J/m', 'Impact strength': 'kJ/m²',
  'Hardness': 'Shore A; Shore D; Rockwell M; Rockwell R; Shore (scale not specified by source)', 'Compression strength': 'MPa',
  'Interlayer adhesion strength': 'MPa', 'Fatigue life': 'cycles', 'HDT': '°C', 'Glass transition temperature': '°C',
  'Vicat softening temperature': '°C', 'Melting temperature': '°C', 'Crystallization temperature': '°C', 'Continuous service temperature': '°C',
  'Thermal conductivity': 'W/(m·K)', 'Coefficient of thermal expansion': 'µm/m/K', 'Water absorption': '%', 'Moisture content': '%',
  'Melt mass-flow rate': 'g/10 min', 'Melt volume-flow rate': 'cm³/10 min',
};

const NA = 'Not applicable';
const HEADLINES = [
  { HeadlineKey: 'density', Kind: 'measurement', Unit: 'kg/m³', 'Value properties': 'Density', 'Related properties': 'Density', Direction: NA, 'Load MPa': NA, 'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
    Short: 'Density', Plain: 'Density', Technical: 'Density', Hint: 'how heavy a printed part will be', 'Axis label': 'Density', 'Export header': 'Density kg/m3',
    Better: 'min', 'Filter group': 'Mechanical', 'Filter operator': '<=', 'Filter example': 'e.g. 1400 for something light', 'Non-negative': 'TRUE', 'Table column': 'TRUE', Estimated: 'TRUE', 'Reference property': 'density' },
  { HeadlineKey: 'tensileModulusXY', Kind: 'measurement', Unit: 'GPa', 'Value properties': 'Tensile modulus', 'Related properties': 'Tensile modulus', Direction: 'XY', 'Load MPa': NA, 'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
    Short: 'Stiffness', Plain: 'Stiffness', Technical: 'Tensile modulus, XY direction', Hint: 'resistance to bending and stretching', 'Axis label': 'Tensile modulus XY', 'Export header': 'Stiffness GPa',
    Better: 'max', 'Filter group': 'Mechanical', 'Filter operator': '>=', 'Filter example': 'e.g. 3, about as stiff as unfilled PLA', 'Non-negative': 'TRUE', 'Table column': 'TRUE', Estimated: 'TRUE', 'Reference property': 'tensileModulus' },
  { HeadlineKey: 'tensileStrengthXY', Kind: 'measurement', Unit: 'MPa', 'Value properties': 'Tensile strength (endpoint unspecified); Tensile yield strength; Tensile break strength', 'Related properties': 'Tensile strength (endpoint unspecified); Tensile yield strength; Tensile break strength', Direction: 'XY', 'Load MPa': NA, 'Evidence group': 'mechanical', 'Endpoint note': 'TRUE',
    Short: 'Strength', Plain: 'Strength', Technical: 'Tensile strength, XY direction', Hint: 'load it takes before failing', 'Axis label': 'Tensile strength XY', 'Export header': 'Strength MPa',
    Better: 'max', 'Filter group': 'Mechanical', 'Filter operator': '>=', 'Filter example': 'e.g. 50 for a load-bearing part', 'Non-negative': 'TRUE', 'Table column': 'TRUE', Estimated: 'TRUE', 'Reference property': 'tensileStrength' },
  { HeadlineKey: 'elongationXY', Kind: 'measurement', Unit: '%', 'Value properties': 'Elongation at break', 'Related properties': 'Elongation at break; Elongation at yield', Direction: 'XY', 'Load MPa': NA, 'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
    Short: 'Stretch', Plain: 'Stretch before breaking', Technical: 'Elongation at break, XY direction', Hint: 'how far it stretches before it snaps; not the same as springing back or toughness', 'Axis label': 'Elongation at break XY', 'Export header': 'Stretch %',
    Better: 'max', 'Filter group': 'Mechanical', 'Filter operator': '>=', 'Filter example': 'e.g. 100 or more for anything rubbery', 'Non-negative': 'TRUE', 'Table column': 'TRUE', Estimated: 'TRUE', 'Reference property': 'elongation' },
  { HeadlineKey: 'hdt045', Kind: 'measurement', Unit: '°C', 'Value properties': 'HDT', 'Related properties': 'HDT', Direction: NA, 'Load MPa': '0.45', 'Evidence group': 'thermal', 'Endpoint note': 'FALSE',
    Short: 'Heat', Plain: 'Heat resistance', Technical: 'HDT at 0.45 MPa', Hint: 'temperature where it starts to soften under load', 'Axis label': 'HDT at 0.45 MPa', 'Export header': 'Heat resistance C',
    Better: 'max', 'Filter group': 'Thermal', 'Filter operator': '>=', 'Filter example': 'e.g. 100 to survive a hot car', 'Non-negative': 'FALSE', 'Table column': 'TRUE', Estimated: 'TRUE', 'Reference property': NA },
  { HeadlineKey: 'priceCADkg', Kind: 'price', Unit: 'CAD/kg', 'Value properties': NA, 'Related properties': NA, Direction: NA, 'Load MPa': NA, 'Evidence group': NA, 'Endpoint note': 'FALSE',
    Short: 'Price', Plain: 'Price', Technical: 'Median Canadian retail price', Hint: 'sampled Canadian retail, not live', 'Axis label': 'Price', 'Export header': 'Price CAD/kg',
    Better: 'min', 'Filter group': 'Cost', 'Filter operator': '<=', 'Filter example': 'e.g. 60 per kilogram', 'Non-negative': 'TRUE', 'Table column': 'TRUE', Estimated: 'FALSE', 'Reference property': NA },
];
export const HEADLINE_HEADER = ['HeadlineKey', 'Kind', 'Unit', 'Value properties', 'Related properties', 'Direction', 'Load MPa', 'Evidence group', 'Endpoint note',
  'Short', 'Plain', 'Technical', 'Hint', 'Axis label', 'Export header', 'Better', 'Filter group', 'Filter operator', 'Filter example', 'Non-negative',
  'Table column', 'Estimated', 'Reference property', 'Applies to', 'Not applicable reason'];

export function migrate(t) {
  if (t.tables().includes('properties')) return; // already applied
  const names = [...new Set(t.rows('measurements').map((r) => r.Property))];
  const known = new Set(Object.keys(UNITS));
  const missing = names.filter((n) => !known.has(n));
  if (missing.length) throw new Error(`Properties with no registry entry: ${missing.join(', ')}`);
  const order = Object.keys(UNITS);
  t.createTable('properties', ['Property', 'Domain', 'Units', 'Applies to', 'Not applicable reason', 'Description'], order.map((name) => ({
    Property: name,
    Domain: MECHANICAL.includes(name) ? 'mechanical' : THERMAL.includes(name) ? 'thermal' : 'physical',
    Units: UNITS[name],
  })));
  t.createTable('headline_definitions', HEADLINE_HEADER, HEADLINES);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
