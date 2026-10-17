#!/usr/bin/env node
// Migration m417 (2026-10-16): the drawer compares flexural results across XY and Z as it does tensile ones, says how
// flexural and tensile results relate, and lists tensile strain at strength under the tensile tests (D140).
//
// The owner asked, of what the Mechanical tab already holds, for "the same thing for the flexural", an expandable and
// subtle explanation of how flexural and tensile results relate in theory, and tensile strain at strength under the
// tensile heading. Nothing is read or entered here: the flexural modulus and strength records are the ones the tab lists
// today.
//
//   Listed properties   drawer_comparisons.csv: properties a heading lists under it without drawing them. Tensile
//                       strain at strength, the strain at the highest stress, under the tensile tests: 79 values, 45 of
//                       them with no orientation, from products of 8 materials with two or more, and another endpoint
//                       than elongation at break, so it is listed beside the elongation results rather than drawn on
//                       their scale.
//   Note topic          drawer_comparisons.csv: a method.csv rule shown as a second closed line under a heading.
//   Flexural tests, XY and Z   flexural modulus and flexural strength, each a scale with an XY row and a Z row, four rows
//                       drawn in the drawer alone; a value with no stated orientation is hollow on the XY row, as a
//                       tensile one is. It lists flexural elongation at break and the stress at conventional deflection.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m417-flexural-comparison.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm417';
const NA = 'Not applicable';
const TABLE = 'headline_definitions';
const FLEXURAL = 'Flexural tests, XY and Z';
const NOTE = 'How flexural and tensile results relate';

const CAPTIONS = {
  [FLEXURAL]: 'A flexural bar (ISO 178, ASTM D790) rests on two supports and is pressed in the middle, so its lower face is '
    + 'stretched and its upper face compressed. Printed flat (XY), its outer faces are printed lines along the bar; printed '
    + 'upright (Z), bending pulls the layer bonds apart at the outer face, and its result is usually lower. An XY value is '
    + 'not a Z value, and neither is converted. Modulus and strength each have their own scale, which the XY and Z rows '
    + 'share only so that a product can be found on both. A Z row compares only a bar the sheet says was printed upright. A '
    + 'value whose sheet states no orientation can stand only on the XY row, drawn hollow and not compared, and bars '
    + 'labelled XZ or ZX are listed below, not drawn. Z as a share of XY is given only for a product whose two values are '
    + 'compared, from one document and in one state.',
  [NOTE]: 'In a bending test the stress at the outer face is worked out from elastic beam theory. For a solid, uniform '
    + 'material that behaves alike in tension and compression, the flexural modulus is its tensile modulus. A printed bar '
    + 'departs from that: bending loads its outer perimeters most and its infill and layer bonds least, and a short span '
    + 'adds shear, so its two moduli can differ by tens of per cent either way. Flexural strength is usually above tensile '
    + 'strength, for unfilled plastics often by a third to three quarters: only the outer face reaches the peak stress, so '
    + 'less material is at risk of a flaw, and once the plastic yields the elastic formula overstates the stress it reports. '
    + 'Where the bar does not break, sheets report the stress at 3.5 % or 5 % strain, listed as the stress at conventional '
    + 'deflection. Neither value converts into the other.',
};
const FLEX_ROW = { Comparison: FLEXURAL, About: 'How XY and Z differ, and what is compared', 'Pair label': 'Both orientations',
  'Listed properties': 'Flexural elongation at break; Flexural stress at conventional deflection', 'Note topic': NOTE };

const t = openTables();
let changed = 0;
const DC = 'drawer_comparisons';
if (!t.header(DC).includes('Listed properties')) { t.addColumn(DC, 'Listed properties', { fill: () => NA }); changed++; }
if (!t.header(DC).includes('Note topic')) { t.addColumn(DC, 'Note topic', { fill: () => NA }); changed++; }
const tensile = t.get(DC, 'Tensile tests, XY and Z');
if (tensile['Listed properties'] !== 'Tensile strain at strength') { t.set(DC, 'Tensile tests, XY and Z', 'Listed properties', 'Tensile strain at strength', { expect: NA, migration: MIGRATION }); changed++; }
const held = t.find(DC, FLEXURAL);
if (!held) { t.append(DC, FLEX_ROW); changed++; } else if (Object.entries(FLEX_ROW).some(([k, v]) => held[k] !== v)) throw new Error(`${MIGRATION}: ${DC} ${FLEXURAL} is not what this migration wrote; the data moved`);
for (const [topic, rule] of Object.entries(CAPTIONS)) {
  const row = t.find('method', topic);
  if (!row) { t.append('method', { Section: 'Comparison', Topic: topic, 'Definition / rule': rule }); changed++; } else if (row.Section !== 'Comparison' || row['Definition / rule'] !== rule) throw new Error(`${MIGRATION}: method ${topic} is not what this migration wrote; the data moved`);
}

// Four rows drawn in the drawer alone, each as the tensile row of its orientation with the flexural property.
const flexRow = (like, own) => ({
  ...t.get(TABLE, like),
  'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound basis': NA,
  'Endpoint note': 'FALSE', 'Comparison note': NA, 'Drawer comparison': FLEXURAL, 'Drawer only': 'TRUE', 'Sold as toughened': NA,
  'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA, 'Applies to': null, 'Not applicable reason': null,
  ...own,
});
const NEW = [
  ['elongationZ', flexRow('tensileModulusXY', {
    HeadlineKey: 'flexuralModulusXY', 'Value properties': 'Flexural modulus', 'Related properties': 'Flexural modulus',
    Short: 'Flex modulus XY', Plain: 'Flexural modulus (XY)', Technical: 'Flexural modulus, XY orientation',
    Hint: 'Bars printed flat and bent between two supports.', 'Axis label': 'Flexural modulus XY', 'Export header': 'Flexural modulus XY GPa',
    'Filter example': 'e.g. 2.5; unfilled PLA is about 2.5',
  })],
  ['flexuralModulusXY', flexRow('tensileModulusZ', {
    HeadlineKey: 'flexuralModulusZ', 'Value properties': 'Flexural modulus', 'Related properties': 'Flexural modulus',
    Short: 'Flex modulus Z', Plain: 'Flexural modulus (Z)', Technical: 'Flexural modulus, Z orientation (across the layers)',
    Hint: 'Bars printed upright, so bending pulls the layer bonds at the outer face.', 'Axis label': 'Flexural modulus Z', 'Export header': 'Flexural modulus Z GPa',
    'Filter example': 'e.g. 2 for a part bent across its layers',
  })],
  ['flexuralModulusZ', flexRow('tensileStrengthXY', {
    HeadlineKey: 'flexuralStrengthXY', 'Value properties': 'Flexural strength', 'Related properties': 'Flexural strength',
    Short: 'Flex strength XY', Plain: 'Flexural strength (XY)', Technical: 'Flexural strength, XY orientation',
    Hint: 'Bars printed flat and bent between two supports: the highest stress at the outer face the sheet reports.', 'Axis label': 'Flexural strength XY',
    'Export header': 'Flexural strength XY MPa', 'Filter example': 'e.g. 70 for a bracket loaded in bending',
  })],
  ['flexuralStrengthXY', flexRow('tensileStrengthZ', {
    HeadlineKey: 'flexuralStrengthZ', 'Value properties': 'Flexural strength', 'Related properties': 'Flexural strength',
    Short: 'Flex strength Z', Plain: 'Flexural strength (Z)', Technical: 'Flexural strength, Z orientation (across the layers)',
    Hint: 'Bars printed upright and bent, so the layer bonds at the outer face carry the stress.', 'Axis label': 'Flexural strength Z',
    'Export header': 'Flexural strength Z MPa', 'Filter example': 'e.g. 30 for a part bent across its layers',
  })],
];
for (const [after, row] of NEW) {
  const was = t.find(TABLE, row.HeadlineKey);
  if (!was) { t.append(TABLE, row, { after }); changed++; continue; }
  const moved = Object.keys(row).filter((k) => (was[k] ?? null) !== (row[k] == null || row[k] === '' ? null : String(row[k])));
  if (moved.length) throw new Error(`${MIGRATION}: ${TABLE} ${row.HeadlineKey} differs from what this migration writes (${moved.join(', ')}); the data moved`);
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): Flexural tests, XY and Z with four drawer-only rows, its caption and note, and tensile strain at strength listed under the tensile tests`);
