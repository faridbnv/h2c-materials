#!/usr/bin/env node
// Migration m275 (2026-10-01): the headline names say what is measured (the owner's PM trial of 2026-10-01, PM-07, PM-08).
//
// "Heat resistance" read as a service temperature to every engineer in the trial; the value is a heat deflection under a
// light 0.45 MPa load, which a designer treats as a soft limit. "Stiffness" and "Strength" never said they are tensile
// values in the print plane, and strength pools the yield and break endpoints. The plain names now carry what the
// technical names always said; the hints say what the number is not.
//
//   node scripts/migrate/m275-names-that-say-what-is-measured.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm275';
const t = openTables();
const NAMES = {
  hdt045: { Short: ['Heat', 'HDT 0.45'], Plain: ['Heat resistance', 'Heat deflection (HDT, 0.45 MPa)'],
    Hint: ['temperature where it starts to soften under load', 'temperature at which a bar bends under a light 0.45 MPa load; a screening number, not a service temperature'],
    'Export header': ['Heat resistance C', 'HDT 0.45 MPa C'] },
  tensileModulusXY: { Short: ['Stiffness', 'Stiffness XY'], Plain: ['Stiffness', 'Stiffness (tensile modulus, XY)'] },
  tensileStrengthXY: { Short: ['Strength', 'Strength XY'], Plain: ['Strength', 'Strength (tensile, XY; yield or break)'] },
  tensileStrengthZ: { Short: ['Layer strength', 'Strength Z'], Plain: ['Strength across layers', 'Strength across layers (tensile, Z)'] },
  elongationXY: { Plain: ['Stretch before breaking', 'Stretch before breaking (elongation, XY)'] },
};
let n = 0;
for (const [key, fields] of Object.entries(NAMES)) {
  for (const [field, [was, now]] of Object.entries(fields)) {
    if (t.get('headline_definitions', key)[field] === now) continue;
    t.set('headline_definitions', key, field, now, { expect: was, migration: MIGRATION });
    n++;
  }
}
t.save();
console.log(`${MIGRATION}: ${n} headline names changed`);
