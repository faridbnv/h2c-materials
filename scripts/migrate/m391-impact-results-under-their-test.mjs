#!/usr/bin/env node
// Migration m391 (2026-10-06): impact results filed under their test where their own words name it, and a reading of the
// rest (D133).
//
// The owner noticed that a material's Mechanical tab lists three impact headings (Charpy strength, Izod impact strength,
// Impact strength) and that rows under the third cite ISO 179 or ISO 180, which name the test. Of the 80 records filed as
// Impact strength:
//
//   moved, 25    the row's standard names one test (ISO 179 or GB/T 1043: Charpy; ISO 180, ASTM D256 or GB/T 1843:
//                Izod) and its label says nothing else, or its label names the test and no standard says otherwise
//                ("Impact Strength - Charpy method", "Impact strength (Charpy)", MatterHackers' "179 / 2-1eU"). Each now
//                is a Charpy or an Izod record, its value, notch, unit and conditions unchanged.
//   read, 55     the row names no test, or names both (a "Charpy" label beside an Izod standard, an "Izod" label beside
//                ISO 179). They stay where they are, never compared, and impact_test_guesses.csv writes beside each which
//                test the rest of the sheet points to and why: the same value printed under a named test on the
//                product's own data sheet, a unit only one test reports, a pendulum energy only one test's series has,
//                the maker's template naming the test elsewhere. Where nothing settles it, it says so.
//
// Impact strength's Description now says what the heading holds, which the drawer shows above its values. Judged by
// Claude Opus on the cached sheets. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m391-impact-results-under-their-test.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm391';
const DATE = '2026-10-06';
const GENERIC = 'Impact strength';
const CHARPY = 'Charpy strength';
const IZOD = 'Izod impact strength';
const t = openTables();
let cells = 0;

// [measurement, test, what names it]
const MOVES = [
  ['V000676', IZOD, 'standard ISO 180'], ['V014040', IZOD, 'standard ISO 180'], ['V014042', IZOD, 'standard ISO 180'],
  ['V007265', IZOD, 'label "IZOD" and standard ASTM D256'], ['V007473', IZOD, 'label "IZOD notched" and standard ASTM D256'],
  ['V000748', CHARPY, 'standard GB/T 1043'], ['V000749', CHARPY, 'standard GB/T 1043'],
  ['V001417', CHARPY, 'standards ISO 179, GB/T 1043'], ['V001438', CHARPY, 'standards ISO 179, GB/T 1043'], ['V001469', CHARPY, 'standards ISO 179, GB/T 1043'],
  ['V004047', CHARPY, 'label "Impact Strength - Charpy method"'], ['V004051', CHARPY, 'label "Impact Strength - Charpy method"'],
  ['V004061', CHARPY, 'label "Impact Strength - Charpy method"'], ['V004065', CHARPY, 'label "Impact Strength - Charpy method"'],
  ['V004069', CHARPY, 'label "Impact Strength - Charpy method"'], ['V004073', CHARPY, 'label "Impact Strength - Charpy method"'],
  ['V007442', CHARPY, 'standard ISO 179'], ['V009198', CHARPY, 'label "Impact strength (Charpy)"'], ['V011896', CHARPY, 'standard ISO 179'],
  ['V012232', CHARPY, 'standard ISO 179'], ['V012233', CHARPY, 'standard ISO 179'], ['V012640', CHARPY, 'standard ISO 179'],
  ['V012670', CHARPY, 'standard ISO 179'], ['V013350', CHARPY, 'standard ISO 179'], ['V013409', CHARPY, 'method "179 / 2-1eU", ISO 179-2 1eU'],
];
for (const [id, test, why] of MOVES) {
  const m = t.get('measurements', id);
  if (m.Property === test) continue;
  if (m.Property !== GENERIC) throw new Error(`${MIGRATION}: ${id} is ${m.Property}, not ${GENERIC}; the data moved`);
  t.set('measurements', id, 'Property', test, { expect: GENERIC, migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${m.Notes} Filed ${DATE} as ${test} (was ${GENERIC}): its ${why} names the test (${MIGRATION}).`.trim(), { expect: m.Notes, migration: MIGRATION });
  cells += 2;
}

const POLYMAKER = 'The row is labelled Charpy and reported in kJ/m², the unit of ISO 179 (ASTM D256 reports J/m), and Polymaker\'s later sheets print the same rows as Charpy to ISO 179 and GB/T 1043; the ASTM D256 in front is a slip of the sheet\'s template.';
const ERYONE = 'Labelled Charpy, but the standard is GB/T 1843 (Izod) and the pendulum is 2.75 J, an energy of the Izod series (ISO 180 and GB/T 1843: 1, 2.75, 5.5, 11, 22 J) that the Charpy series (ISO 179: 0.5 to 50 J) does not have.';
const SPECTRUM = 'The row is labelled Izod, and Spectrum\'s PCTG sheet prints the same rows as Izod to ISO 180; the ISO 179-1eU beside it is printed on both the notched and the unnotched row, which reads as a slip of the template. Low confidence.';
const FORMFUTURA = (v) => `FormFutura's PLA sheets print "Impact strength" with no method or notch; ${v} kJ/m² fits a notched bar of either test.`;
const GUESSES = [
  ...['V003468', 'V003471', 'V003608', 'V003618', 'V003643', 'V003759', 'V003760', 'V010353'].map((id) => [id, 'Charpy', POLYMAKER]),
  ...['V003679', 'V003772'].map((id) => [id, 'Charpy', 'The row is labelled Charpy and reported in kJ/m², the unit of ISO 179 (ASTM D256 reports J/m); the bracket names tensile standards (ISO 527, GB/T 1040), so the standards are a slip of the template, and Polymaker\'s other sheets print this row as Charpy to ISO 179.']),
  ['V008784', 'Charpy', 'Polymaker\'s template as Creality prints it: labelled Charpy, in kJ/m² (the unit of ISO 179; ASTM D256 reports J/m), with ISO 179 and GB/T 1043, both Charpy standards, beside ASTM D256.'],
  ['V014012', 'Charpy', 'In kJ/m² (the unit of ISO 179; ASTM D256 reports J/m), with ISO 179 and GB/T 1043, both Charpy standards, beside ASTM D256; Raise3D\'s other sheets print their impact results as Charpy.'],
  ...['V004839', 'V004849', 'V004877', 'V004902', 'V004916', 'V004930', 'V004944', 'V004957', 'V004970', 'V004977', 'V005002', 'V005028', 'V005042', 'V005068', 'V005082', 'V005094', 'V005109', 'V005122', 'V009310'].map((id) => [id, 'Izod', ERYONE]),
  ...['V002092', 'V002093', 'V002931'].map((id) => [id, 'Izod', SPECTRUM]),
  ['V002328', 'Cannot tell', 'Labelled "Notched Izod Impact" but the method is ISO 179/1eA, the full code of a notched Charpy bar; both are specific, and 7 kJ/m² fits a notched bar of either test.'],
  ['V006016', 'Cannot tell', 'Labelled Charpy with the standard ISO 180 (Izod); 5 kJ/m² fits a notched bar of either test, and Fillamentum\'s sheets print both tests.'],
  ['V010834', 'Cannot tell', 'Labelled Charpy with the standard ISO 180 (Izod); Fiberlogy\'s page for the same product prints a notched Charpy and a notched Izod of 10 kJ/m² each, so 11 matches neither better.'],
  ['V010919', 'Charpy', 'Labelled Charpy with the standard ISO 180; the same table on its sibling Fiberlogy ABS\'s sheet prints 18 kJ/m² as the notched Charpy and 30 as the notched Izod, so 18 is the Charpy value.'],
  ['V013201', 'Charpy', 'The product\'s data sheet prints the same 86.2 kJ/m² unnotched as Charpy to ISO 179; this is the maker\'s page repeating it.'],
  ['V013204', 'Charpy', 'The product\'s data sheet prints the same 53.2 kJ/m² unnotched as Charpy to ISO 179; this is the maker\'s page repeating it.'],
  ['V013207', 'Charpy', 'The product\'s data sheet prints the same 7 kJ/m² as a notched Charpy (ISO 179-1eA); this is the maker\'s page repeating it.'],
  ['V012675', 'Charpy', 'Bambu Lab\'s ASA Aero data sheet prints the same 32 kJ/m² as the unnotched X-Y Charpy (ISO 179, GB/T 1043); this is the product page repeating it.'],
  ['V012676', 'Charpy', 'Bambu Lab\'s ASA Aero data sheet prints the same 3.4 kJ/m² as the Z Charpy (ISO 179, GB/T 1043); this is the product page repeating it.'],
  ['V014799', 'Charpy', 'Siraya Tech\'s data sheet prints a Charpy (ISO 179) of 10.1 kJ/m² for the same product; this retailer listing prints it as 10. Probable, not certain.'],
  ['V014800', 'Charpy', 'The saturated value beside the dry 10 kJ/m² that Siraya Tech\'s data sheet prints as Charpy (ISO 179); the sheet prints no Izod. Probable, not certain.'],
  ['V014802', 'Charpy', 'The product\'s data sheet prints the same 9.74 kJ/m² as Charpy (ISO 179, GB/T 1043).'],
  ['V013529', 'Charpy', 'Polymaker\'s official ABS Max page prints the same 29.37 kJ/m² as "Charpy, unnotched … ISO 179".'],
  ['V014808', 'Charpy', 'A sentence of Extrudr\'s PCTG page (94 against standard PETG\'s 4.7 kJ/m²); the same page\'s table prints its notched impact as Charpy to ISO 179-1eA. Probable, not certain.'],
  ['V007719', 'Izod', 'SIDDAMENT\'s sheets in the same layout print this row as "Impact Strength | ISO180" (its ASA CF and PA12-CF). Probable, not certain.'],
  ['V009581', 'Cannot tell', FORMFUTURA('7.5')], ['V009623', 'Cannot tell', FORMFUTURA('6.0')], ['V009813', 'Cannot tell', FORMFUTURA('7.1')], ['V007669', 'Cannot tell', FORMFUTURA('3.0')],
  ['V012256', 'Cannot tell', 'The method printed, ASTM D-955, is the mould-shrinkage standard, a slip of the sheet; iSANMATE\'s sheets print Izod on some products and Charpy on others, and 4.2 kJ/m² fits either.'],
  ['V006953', 'Another test', 'It is a tensile impact strength (ASTM D1822, 3.18 mm bar), a test that is neither Charpy nor Izod.'],
];
const held = new Set(t.rows('impact_test_guesses').map((r) => r.MeasurementID));
for (const [id, test, basis] of GUESSES) {
  if (held.has(id)) continue;
  if (t.get('measurements', id).Property !== GENERIC) throw new Error(`${MIGRATION}: ${id} is not ${GENERIC}; the data moved`);
  t.append('impact_test_guesses', { MeasurementID: id, 'Likely test': test, Basis: basis, 'Reviewed by': `Claude Opus 5.5, ${DATE}, on the cached sheets (${MIGRATION})` });
  cells++;
}
const left = t.rows('measurements').filter((m) => m.Property === GENERIC && !m['Data status'].startsWith('Retired') && !GUESSES.some(([id]) => id === m.MeasurementID));

const DESCRIPTION = 'An impact result whose test is unclear: the sheet names no test, or names both (a "Charpy" label beside an Izod standard, an "Izod" label beside ISO 179). Kept apart from Charpy and Izod and never compared; where the rest of the sheet points to one test, a reviewer\'s reading is written beside the value (impact_test_guesses.csv). A result whose own label or standard names the test is filed under that test.';
const p = t.get('properties', GENERIC);
if (p.Description !== DESCRIPTION) { t.set('properties', GENERIC, 'Description', DESCRIPTION, { expect: p.Description, migration: MIGRATION }); cells++; }

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s); ${MOVES.length} moved, ${GUESSES.length} read; ${left.length} Impact strength record(s) with no reading: ${left.map((m) => m.MeasurementID).join(', ')}`);
