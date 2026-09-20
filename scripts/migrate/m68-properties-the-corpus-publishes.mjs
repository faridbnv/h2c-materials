#!/usr/bin/env node
// Migration m68 (2026-09-19): twelve properties the corpus publishes and the database had no row for.
//
// Every maker's sheets carry rows the reader can see, name and locate and then has to leave, because
// properties.csv has no row for them: the reader says so per row, and those reasons add up. Across the
// proposals written so far, the recurring ones are a mould shrinkage (about 25 rows), a relative permittivity
// (32), a dielectric strength, a comparative tracking index, a volume and a surface resistivity, a tear
// strength, an abrasion loss, a compression set, a Poisson's ratio, a decomposition temperature and an oxygen
// index. All of them are properties of the material, published to a named standard, on sheets already fetched.
//
// This adds the rows and the units they need. It writes no measurement: a property with no measurement shows
// nothing anywhere, and the values arrive when each maker's sheets are read again. That is the order the schema
// asks for ("a new property is a new row here plus its measurements: no code changes").
//
// What is deliberately not here: UL 94 and the other flammability classes, which are a certification claim and
// an evidence row rather than a measured value (plan, Phase 3.1); and the print-setting and packaging rows the
// reader reports beside these (filament weight, cooling fan, diameter), which are not properties of a material.
//
//   node scripts/migrate/m68-properties-the-corpus-publishes.mjs

import { readCsv, csvText } from '../../build/src/csv.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';

const UNITS = [
  ['Dimensionless', 'A ratio with no unit: a Poisson\'s ratio, a relative permittivity.'],
  ['kN/m', 'Tear strength.'],
  ['kV/mm', 'Dielectric strength.'],
  ['mm³', 'Abrasion loss: the volume a standard abrasive removes.'],
  ['V', 'Comparative tracking index: the voltage at which a surface tracks.'],
  ['Ω', 'Surface resistivity.'],
  ['Ω·cm', 'Volume resistivity.'],
];

const PROPERTIES = [
  ['Mould shrinkage', 'physical', '%', '', '', 'How much a moulded or printed part shrinks as it cools, to ISO 294-4 or ASTM D955. A sheet that prints it parallel and normal to the flow publishes two rows.'],
  ['Volume resistivity', 'physical', 'Ω·cm', '', '', 'Resistance through the body of the material, to IEC 60093 or ASTM D257. It is what separates a conductive or ESD grade from an insulating one.'],
  ['Surface resistivity', 'physical', 'Ω', '', '', 'Resistance across the surface, to IEC 60093 or ASTM D257.'],
  ['Dielectric strength', 'physical', 'kV/mm', '', '', 'The field a material holds before it breaks down, to IEC 60243 or ASTM D149.'],
  ['Relative permittivity', 'physical', 'Dimensionless', '', '', 'The dielectric constant, to IEC 60250 or ASTM D150. A sheet states the frequency it was measured at, which the row keeps as its test condition.'],
  ['Comparative tracking index', 'physical', 'V', '', '', 'The voltage at which a wetted, contaminated surface begins to track, to IEC 60112. A sheet may print it as a stage rather than a voltage; only a voltage is a value here.'],
  ['Oxygen index', 'physical', '%', '', '', 'The least oxygen concentration that sustains burning, to ISO 4589 or ASTM D2863. A flammability class (UL 94 V-0, HB) is a certification claim, not this.'],
  ['Tear strength', 'mechanical', 'kN/m', '', '', 'The force per thickness that tears a specimen, to ISO 34 or ASTM D624. Published for elastomers and films.'],
  ['Abrasion loss', 'mechanical', 'mm³', '', '', 'The volume a standard abrasive removes, to ISO 4649 or DIN 53516. A smaller number wears less.'],
  ['Compression set', 'mechanical', '%', '', '', 'How much of a compression an elastomer keeps after the load is taken off, to ISO 815 or ASTM D395. A sheet states the time and temperature, which the row keeps as its test conditions.'],
  ["Poisson's ratio", 'mechanical', 'Dimensionless', '', '', 'How much a specimen narrows as it is stretched.'],
  ['Decomposition temperature', 'thermal', '°C', '', '', 'Where the material begins to break down rather than melt, by thermogravimetry (ISO 11358). A sheet states the mass loss it is quoted at, commonly 5 %, which the row keeps as its test condition.'],
];

const unitsPath = join(projectRoot, 'schema/vocab/units.csv');
const units = readCsv(unitsPath).records.map((r) => r.values);
const unitHead = Object.keys(units[0]);
let added = 0;
for (const [value, meaning] of UNITS) {
  if (units.some((u) => u.Value === value)) continue;
  units.push({ Value: value, Meaning: meaning });
  added++;
}
if (added) {
  units.sort((a, b) => a.Value.localeCompare(b.Value));
  writeFileSync(unitsPath, csvText(unitHead, units));
}

const t = openTables();
let rows = 0;
for (const [Property, Domain, Units, appliesTo, reason, Description] of PROPERTIES) {
  if (t.rows('properties').some((p) => p.Property === Property)) continue;
  t.append('properties', { Property, Domain, Units, 'Applies to': appliesTo, 'Not applicable reason': reason, Description, 'Replaced by': '' });
  rows++;
}
if (rows) t.save();
console.log(`${added} unit(s) and ${rows} propert(ies) written`);
