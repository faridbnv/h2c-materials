#!/usr/bin/env node
// Migration m467 (2026-10-20): CV63 decides (the owner's ruling of 2026-10-20 on values published without their load,
// D172; AGENTS.md, "Add a conversion or a physics limit": a row lands reported and is switched in a commit of its own).
//
// CV63 (m466) says a heat deflection whose sheet states no load is at most the HDT at 0.45 MPa, whichever load it was
// measured at, so it floors the 0.45 MPa value with factor 1: an HDT at 1.8 MPa is at most the one at 0.45 MPa (PR08),
// and at 0.45 MPa it is that value. It reads only bars a document describes or implies were printed (D172). The
// decision diff of the switch is docs/audits/2026-10-20-owner-rulings/evidence/DECISION-DIFF-CV63.md. A re-run is a
// no-op; a run after the data moved stops.
//
//   node scripts/migrate/m467-an-unstated-load-floors-heat-deflection.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm467';
const t = openTables();
let n = 0;
if (t.get('conversions', 'CV63').Status !== 'deciding') {
  t.set('conversions', 'CV63', 'Status', 'deciding', { expect: 'reported', migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} row(s) switched to deciding`);
