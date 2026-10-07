#!/usr/bin/env node
// Migration m393 (2026-10-07): impact values held twice, once with the sheet's word that the bar was moulded and once
// from a copy that says nothing of the bar, are held once (D133).
//
// Checking every material's impact heading for the owner (ASA-AF's graph held three dots and no median) found that all
// three ASA-AF dots were one number, 7.5 kJ/m², whose own data sheet (Spectrum ASA Kevlar) says it was measured on
// injection-moulded bars. A moulded bar's value is never a printed product's (it is a resin value, D57), but two copies
// that say nothing of the bar were drawn in its place: Fiberlogy's ASA+AF sheet, filed on Spectrum's grade as its twin's
// (one formulation key, R053), and FormFutura's ApolloX Kevlar sheet, the same table on a third twin.
//
// The rule, applied to every impact record: where a product, or a twin that prints its table, holds a record of the same
// property, notch, unit and value whose specimen is a moulded bar ("Raw material value"), a record of it whose specimen
// is not stated is the same value again, held twice. It is retired as a duplicate, as m387 retired MagicFil Thermo's copy
// of EasyFil's table, and names the record that stays. Twenty records meet it: a maker's product page repeating its data
// sheet (Extrudr, eSUN), a second sheet of the same product (colorFabb, eSUN), and a twin's sheet (Fiberlogy, FormFutura).
// Ten were a product's drawn value; those products now have none, unless they publish another.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m393-impact-copies-of-moulded-values.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm393';
const DATE = '2026-10-07';
const RETIRED = 'Retired duplicate record';
const MOULDED = 'Raw material value';
const t = openTables();
let cells = 0;

// [the copy that says nothing of the bar, the record that says it was moulded and stays]
const COPIES = [
  ['V005832', 'V005935'], ['V005925', 'V001963'], ['V006008', 'V005865'], ['V007523', 'V003117'], ['V007524', 'V003118'],
  ['V009453', 'V009462'], ['V010489', 'V002677'], ['V011931', 'V007109'], ['V012095', 'V011212'], ['V012097', 'V011213'],
  ['V012128', 'V004191'], ['V012129', 'V004192'], ['V012187', 'V003117'], ['V012188', 'V003118'], ['V012947', 'V004225'],
  ['V013170', 'V002677'], ['V014769', 'V011223'], ['V014771', 'V011224'], ['V014803', 'V006802'], ['V014807', 'V004118'],
];
const key = (g) => t.get('grades', g)['Shared formulation key'];
const twins = (a, b) => a === b || (!/^Not /.test(key(a) ?? 'Not applicable') && key(a) === key(b));
for (const [copyId, stayId] of COPIES) {
  const copy = t.get('measurements', copyId);
  const stay = t.get('measurements', stayId);
  if (copy['Data status'] === RETIRED) continue;
  const same = ['Property', 'Notch', 'Normalized value', 'Normalized unit'].every((c) => copy[c] === stay[c]);
  if (!same || stay['Specimen type'] !== MOULDED || !/^Not published/.test(copy['Specimen type']) || !twins(copy.GradeID, stay.GradeID)
    || /^Retired/.test(stay['Data status'])) {
    throw new Error(`${MIGRATION}: ${copyId} is not a copy of ${stayId}'s moulded value; the data moved`);
  }
  const where = copy.GradeID === stay.GradeID ? 'the same product' : `its twin ${stay.GradeID}, which prints the same table (one formulation key, R053)`;
  t.set('measurements', copyId, 'Data status', RETIRED, { expect: copy['Data status'], migration: MIGRATION });
  t.set('measurements', copyId, 'Notes', `${copy.Notes} Retired duplicate record ${DATE}: ${stayId} (${stay.SourceID}) holds the same ${copy.Property.toLowerCase()} of ${where} and says the bar was injection-moulded; this copy says nothing of the bar, and the value is held once, as ${stayId} (${MIGRATION}).`.trim(),
    { expect: copy.Notes, migration: MIGRATION });
  cells += 2;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells / 2} impact cop${cells / 2 === 1 ? 'y' : 'ies'} of a moulded value retired as duplicates`);
