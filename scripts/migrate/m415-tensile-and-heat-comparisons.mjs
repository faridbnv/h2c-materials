#!/usr/bin/env node
// Migration m415 (2026-10-16): the drawer compares tensile results across XY and Z, and heat deflection beside the
// glass transition, as it compares the two impact tests (D133, D139).
//
// The owner chose (2026-10-16) two more headings drawn the way Impact tests is: a dot per product at the value the build
// chooses for it, the middle half and the median of the compared ones, a table of what each median is of, then every
// result with its document.
//
//   Tensile tests, XY and Z   Mechanical: tensile modulus, tensile strength and elongation at break, each a scale with
//                             an XY row and a Z row. Strength had both; modulus and elongation get a Z row here.
//   Heat deflection and glass transition   Thermal, one °C scale: HDT at 0.45 MPa, a new row at 1.8 MPa, and Tg.
//
// The three new rows (tensileModulusZ, elongationZ, hdt18) are drawn in the drawer alone (Drawer only TRUE): each
// product's value and each material's spread are computed as for every headline, and shown in the heading, on product
// cards and in the Products tab's spread table, but none is a filter, an axis, a table or export column, or a decision
// state, so no answer reads them. Each excludes a value whose sheet states no orientation or load, so none is ever "as
// published"; a value whose sheet states no HDT load stays on the 0.45 MPa row, as before, and is drawn once.
// Their filter, axis and export cells are filled as for any headline, so making one selectable is one cell.
//
// Vicat and flexural results stay property lists: Vicat's method (A50 or B50) is typed on none of its rows.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m415-tensile-and-heat-comparisons.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm415';
const NA = 'Not applicable';
const TABLE = 'headline_definitions';
const TENSILE = 'Tensile tests, XY and Z';
const HEAT = 'Heat deflection and glass transition';

const COMPARISONS = [
  { Comparison: TENSILE, About: 'How XY and Z differ, and what is compared', 'Pair label': 'Both orientations' },
  { Comparison: HEAT, About: 'How the two HDT loads and Tg differ, and what is compared', 'Pair label': NA },
];
const CAPTIONS = {
  [TENSILE]: 'A tensile bar printed flat (XY) is pulled along its printed lines; a bar printed upright (Z) is pulled across '
    + 'its layers, so its result is how well the layers hold together, and is usually lower. Both are one test (ISO 527 or '
    + 'ASTM D638) on bars built differently: an XY value is not a Z value, and neither is converted. Modulus, strength and '
    + 'elongation at break each have their own scale, which the XY and Z rows share only so that a product can be found on '
    + 'both. A Z row compares only a bar the sheet says was pulled along Z. A value whose sheet states no orientation can '
    + 'stand only on the XY row, drawn hollow and not compared, and bars labelled XZ or ZX are listed below, not drawn. Z '
    + 'as a share of XY is given only for a product whose two values are compared, from one document and in one state.',
  [HEAT]: 'Heat deflection temperature (ISO 75, ASTM D648) is the temperature at which a loaded bar, heated steadily, bends '
    + 'by a set amount, under 0.45 MPa or under 1.8 MPa. The heavier load gives the lower temperature, so the two rows are '
    + 'two tests and neither is converted. The glass transition (Tg), usually measured by DSC on a few milligrams with no '
    + 'load, is where the polymer turns from glassy to rubbery: an amorphous plastic loses its stiffness above it, while a '
    + 'semicrystalline one can carry load well above it. All three are in °C and share a scale only so that a product can '
    + 'be found on each; none is a service temperature. A value whose sheet states no load can stand only on the 0.45 MPa '
    + 'row, drawn hollow and not compared.',
};
// The rows already held that the two headings draw.
const JOINS = { tensileModulusXY: TENSILE, tensileStrengthXY: TENSILE, tensileStrengthZ: TENSILE, elongationXY: TENSILE, hdt045: HEAT, glassTransition: HEAT };

// A drawer-only row: as the row it stands beside, with what makes it its own.
const drawerRow = (t, like, own) => ({
  ...t.get(TABLE, like),
  'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound basis': NA,
  'Comparison note': NA, 'Drawer only': 'TRUE', 'Sold as toughened': NA, 'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA,
  ...own,
});

const t = openTables();
let changed = 0;
for (const row of COMPARISONS) {
  const held = t.find('drawer_comparisons', row.Comparison);
  if (!held) { t.append('drawer_comparisons', row); changed++; } else if (held.About !== row.About || held['Pair label'] !== row['Pair label']) throw new Error(`${MIGRATION}: drawer_comparisons ${row.Comparison} is not what this migration wrote; the data moved`);
}
for (const [topic, rule] of Object.entries(CAPTIONS)) {
  const held = t.find('method', topic);
  if (!held) { t.append('method', { Section: 'Comparison', Topic: topic, 'Definition / rule': rule }); changed++; } else if (held.Section !== 'Comparison' || held['Definition / rule'] !== rule) throw new Error(`${MIGRATION}: method ${topic} is not what this migration wrote; the data moved`);
}
for (const [key, topic] of Object.entries(JOINS)) if (t.set(TABLE, key, 'Drawer comparison', topic, { expect: t.get(TABLE, key)['Drawer comparison'] === topic ? topic : NA, migration: MIGRATION })) changed++;

const NEW = [
  ['tensileModulusXY', drawerRow(t, 'tensileModulusXY', {
    HeadlineKey: 'tensileModulusZ', Direction: 'Z', 'Unstated direction': 'excluded', 'Drawer comparison': TENSILE,
    Short: 'Modulus Z', Plain: 'Tensile modulus (Z)', Technical: 'Tensile modulus, Z orientation (across the layers)',
    Hint: 'Bars printed upright and pulled across the layers.', 'Axis label': 'Tensile modulus Z', 'Export header': 'Tensile modulus Z GPa',
    'Filter example': 'e.g. 2 for a part loaded across its layers',
  })],
  ['elongationXY', drawerRow(t, 'elongationXY', {
    HeadlineKey: 'elongationZ', Direction: 'Z', 'Unstated direction': 'excluded', 'Related properties': 'Elongation at break', 'Drawer comparison': TENSILE,
    Short: 'Elongation Z', Plain: 'Elongation at break (Z)', Technical: 'Elongation at break, Z orientation (across the layers)',
    Hint: 'Bars printed upright and pulled across the layers: a print usually breaks there after little stretch.', 'Axis label': 'Elongation at break Z',
    'Export header': 'Elongation at break Z %', 'Filter example': 'e.g. 2 for a part bent across its layers',
  })],
  ['hdt045', drawerRow(t, 'hdt045', {
    HeadlineKey: 'hdt18', 'Load MPa': '1.8', 'Unstated load': 'excluded', 'Drawer comparison': HEAT,
    'Comparison note': 'Only a value its sheet says was measured under 1.8 MPa (ISO 75 method A, ASTM D648 at 264 psi).',
    Short: 'HDT 1.8', Plain: 'HDT at 1.8 MPa', Technical: 'Heat deflection temperature at 1.8 MPa',
    Hint: 'The heavier standard load: a screening value, not a service temperature.', 'Axis label': 'HDT at 1.8 MPa', 'Export header': 'HDT 1.8 MPa C',
    'Filter example': 'e.g. 80 for a loaded part near heat',
  })],
];
for (const [after, row] of NEW) {
  const held = t.find(TABLE, row.HeadlineKey);
  if (!held) { t.append(TABLE, row, { after }); changed++; continue; }
  const moved = Object.keys(row).filter((k) => (held[k] ?? null) !== (row[k] == null || row[k] === '' ? null : String(row[k])));
  if (moved.length) throw new Error(`${MIGRATION}: ${TABLE} ${row.HeadlineKey} differs from what this migration writes (${moved.join(', ')}); the data moved`);
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): the tensile and heat comparisons, their captions, and tensileModulusZ, elongationZ and hdt18 drawn in the drawer alone`);
