#!/usr/bin/env node
// Migration m466 (2026-10-20): a printed part's heat resistance is floored by printed bars only, and an HDT whose sheet
// states no load bounds it from below (the owner's ruling of 2026-10-20 on a test bar the sheet does not describe, D172).
//
// - headline_definitions.csv: hdt045's Lower bound specimens, `printed or not stated` since D126, becomes `printed`, as
//   elongation's did in D161. A bar its document does not describe vouches for a printed part's heat resistance only
//   where something on the document indicates it was printed (m463 types those bars printed); otherwise no, in the
//   estimate stage's floors as in what decides. The validation report's floor back-test reads the two rules side by
//   side (hdt045 `formulation`, the rule now, against `formulationUnstated`, D126's).
// - conversions.csv: CV01, the floor an HDT at 1.8 MPa sets under the HDT at 0.45 MPa, reads the specimens hdt045's lower
//   bound reads (LEDGER-LB-DRIFT): Source specimen `printed`.
// - conversions.csv: CV63, new and `reported`: a heat deflection whose sheet states no load is at most the heat
//   deflection at 0.45 MPa, whichever load it was measured at (ISO 75 and ASTM D648 run at 0.45 or 1.8 MPa, and the
//   heavier load deflects the bar at the lower temperature, PR08), so it floors the 0.45 MPa value with factor 1. It is
//   switched to `deciding` in a commit of its own (m467). A ceiling for HDT at 1.8 MPa, its other safe direction, is not
//   a row: HDT at 1.8 MPa is drawn in the drawer alone and a ledger row bounds only what a requirement can ask.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m466-heat-resistance-from-printed-bars.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm466';
const NA = 'Not applicable';
const t = openTables();
let n = 0;
if (t.get('headline_definitions', 'hdt045')['Lower bound specimens'] !== 'printed') {
  t.set('headline_definitions', 'hdt045', 'Lower bound specimens', 'printed', { expect: 'printed or not stated', migration: MIGRATION });
  n++;
}
if (t.get('conversions', 'CV01')['Source specimen'] !== 'printed') {
  t.set('conversions', 'CV01', 'Source specimen', 'printed', { expect: 'as target', migration: MIGRATION });
  n++;
}
if (!t.find('conversions', 'CV63')) {
  t.append('conversions', {
    ConversionID: 'CV63', 'Target headline': 'hdt045', 'Source properties': 'HDT', 'Source load MPa': 'Not published',
    'Source direction': 'same', 'Source state': 'same', 'Source specimen': 'as target', Kind: 'floor', 'Factor low': '1',
    'Factor high': NA, 'Absolute offset': '0', 'Applies to': '', 'Physical relation': NA, Status: 'reported',
    'Estimate kind': NA, 'Estimate offset': NA, 'Estimate sd': NA, 'Estimate learns': NA, 'Estimate note': NA,
    'Reason words': 'its heat deflection published with no test load, which at either load is at most its heat deflection at 0.45 MPa',
    SourceID: NA,
    Basis: 'ISO 75 and ASTM D648 test a bar at 0.45 MPa (method B) or 1.8 MPa (method A), and a bar deflects at a lower temperature under the heavier load (PR08), so a value whose sheet states no load is at most the HDT at 0.45 MPa whichever load it was: a floor with factor 1, the safe direction the owner\'s ruling of 2026-10-20 names for it (D172). Its other safe direction, a ceiling for the HDT at 1.8 MPa, is no row, since HDT at 1.8 MPa is drawn in the drawer alone. It reads a bar as the target does: a bar no document describes as printed is set apart (D172) and bounds nothing.',
  });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} change(s)`);
