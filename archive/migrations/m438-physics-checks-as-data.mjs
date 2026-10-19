#!/usr/bin/env node
// Migration m438 (2026-10-18): the physics checks of the screening build's stage 2a, as data (D149; the screening review's
// changes C11 and C15). Written by Claude Opus 5.5.
//
// - PR08 (HDT at 1.8 MPa below HDT at 0.45 MPa) compared two values of one source only, so one number printed at 1.8 MPa
//   on a product's data sheet and at 0.45 MPa on its product page, or a twin's sheet beside the product's own, was never
//   put side by side (finding F27). Its Same test now names the formulation (one grade, or grades sharing a Shared
//   formulation key, R053) in place of the grade and the source.
// - PR12 is new: a glassy bar's HDT at 0.45 MPa is at most 15 °C above its own sheet's glass transition, unless it was
//   annealed. A glassy polymer loses its stiffness at its glass transition, so as printed it cannot hold the load much
//   above it. The margin is set from the 98 pairs of an HDT at 0.45 MPa and a glass transition one PLA sheet prints for
//   a bar it does not say was annealed: their median is 4 °C below the glass transition, 89 sit at most 5 °C above it, and
//   above those come Polymaker's HT-PLA grades, which crystallise as they print (10 and 16 °C), then six values at 25 to
//   34 °C that no page says were annealed (finding F24). Fifteen degrees clears every glassy pair by ten.
// - W0056's Basis said an amorphous bar deflects at its glass transition plus 20 °C at 0.45 MPa; the data put PLA's a
//   median of 4 °C below it. Only the Basis words change; the window's bounds do not.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m438-physics-checks-as-data.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm438';
const t = openTables();
let n = 0;
// A cell already holding its new value is this migration, run before: nothing to do.
const change = (table, id, field, to, from) => (t.get(table, id)[field] === to ? false : t.set(table, id, field, to, { expect: from, migration: MIGRATION }));

if (change('physical_relations', 'PR08', 'Same test', 'formulation;moisture condition;post-processing', 'grade;source;moisture condition;post-processing')) n++;
const PR08_BASIS = 'A bar deflects at a lower temperature under a heavier load, so one product\'s documents and its twins\' sheets cannot put its HDT at 1.8 MPa above its HDT at 0.45 MPa.';
if (change('physical_relations', 'PR08', 'Basis', PR08_BASIS, 'A bar deflects at a lower temperature under a heavier load.')) n++;

if (!t.find('physical_relations', 'PR12')) {
  t.append('physical_relations', {
    RelationID: 'PR12', 'Lower property': 'HDT', 'Higher property': 'Glass transition temperature',
    'Lower load MPa': '0.45', 'Higher load MPa': 'Not applicable', 'Same test': 'grade;source;unit',
    'Relative margin': '0', 'Absolute margin': '15', 'Applies to': 'Morphology: amorphous', 'Exempt rows': 'Annealed',
    'Finding code': 'MEAS-PHYSICS-HDT-TG', 'Finding on': 'lower', Scope: 'measurement',
    Basis: 'A glassy bar loses its stiffness at its glass transition, so a bar that was not annealed cannot hold the 0.45 MPa load much above it; the margin is the scatter of the 98 PLA pairs in this database, whose glassy bars sit at most 5 °C above (D149).',
  });
  n++;
}

const W0056_BEFORE = 'Physics: an amorphous bar deflects at its glass transition plus 10 °C at 1.8 MPa and plus 20 °C at 0.45 MPa. Observation: 48 to 140. The soft low is the estimate model\'s own hdtFloor.';
const W0056_AFTER = 'Physics: an amorphous bar deflects at or just below its glass transition, a few degrees lower at 1.8 MPa than at 0.45 MPa; PLA\'s HDT at 0.45 MPa sits a median of 4 °C below its own sheet\'s glass transition over 98 pairs not annealed, and PR12 holds it within 15 °C above (D149). Observation: 48 to 140. The soft low is the estimate model\'s own hdtFloor.';
if (change('plausibility_windows', 'W0056', 'Basis', W0056_AFTER, W0056_BEFORE)) n++;

if (n) t.save();
console.log(`${MIGRATION}: ${n} change(s) to the physics checks`);
