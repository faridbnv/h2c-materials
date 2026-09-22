#!/usr/bin/env node
// Migration m131 (2026-09-21): the grades the sweep found (PLAN-REMAINING 2.3).
//
// The sweep's reading found four PLA densities of 1.35 to 1.39 g/cm³ the sheets really print (FormFutura's Matt PLA,
// SUNLU's PLA Classic, AzureFilm's PLA Matte, Fabru's GreenTEC Pro) and a PET whose modulus is a fifth of a PET's.
// Neither is a transcription error. Counted across the table, six active grades of plain PLA (M001) print a density
// above what neat PLA reaches (1330 kg/m³, polymers.csv) and declare no variant; each is recorded as Eryone's PLA-Lite
// was (R078, D57): an undisclosed dense filler, so its values stay its own and the estimate model keeps them from
// pulling the family. A matte finish is usually a mineral load, which the density shows and the sheets do not name.
// eSUN's PLA-Matte, at 1.329, is within neat PLA and is not one.
//
// colorFabb's PET Flex Max names itself a flexible PET and prints a tensile modulus of 442 MPa and 418 % elongation at
// break: a declared softer grade (R098). NinjaTek's Armadillo (75D, 396 MPa), the other elastomer outlier, is a
// semi-rigid polyurethane among softer ones, as its name says, and stays as it is.
//
//   node scripts/migrate/m131-grades-the-sweep-found.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm131-grades-the-sweep-found';
const t = openTables();
let changed = 0;

const dense = (kg, name) => `Its density of ${kg} kg/m³ is above what neat PLA reaches (1330), so the product carries a filler its name does not declare${/matt/i.test(name) ? ' (a matte finish is usually a mineral load)' : ''}. Not declared on the sheet; recorded as a Variant under D57 (R078, ${migration}).`;
const GRADES = [
  ['G001-36', 1360, 'undisclosed dense filler'],
  ['G001-66', 1390, 'undisclosed dense filler'],
  ['G001-102', 1380, 'undisclosed dense filler'],
  ['G001-111', 1365, 'undisclosed dense filler'],
  ['G001-118', 1350, 'undisclosed dense filler'],
  ['G001-178', 1340, 'undisclosed dense filler'],
  ['G066-05', null, 'declared softer grade'],
];
for (const [id, kg, variant] of GRADES) {
  const g = t.get('grades', id);
  if (g.Variant === variant) continue;
  const composition = kg == null
    ? `The sheet names it "PET Flex Max" and prints a tensile modulus of 442 MPa and 418 % elongation at break, a fifth of a rigid PET's stiffness: a flexible grade of PET, declared by its name (R098, ${migration}).`
    : dense(kg, g['Product name']);
  if (kg != null) {
    const d = t.rows('measurements').filter((m) => m.GradeID === id && m.Property === 'Density' && /^Published value/.test(m['Data status']));
    if (!d.some((m) => Number(m['Normalized value']) === kg)) throw new Error(`${migration}: ${id} publishes no density of ${kg}`);
  }
  t.set('grades', id, 'Variant', variant, { expect: 'Not applicable' });
  t.set('grades', id, 'Composition / filler', composition, { expect: 'Not published' });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} grade(s) given the variant their values show`);
