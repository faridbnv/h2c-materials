#!/usr/bin/env node
// Migration m423 (2026-10-17): the tests only a rubbery or tough, stretching plastic is put through say so (data review
// fixes, item 2; AGENTS.md, "Add a property").
//
// Tear strength, compression set and the tensile stresses at 100, 200, 300 and 400 % elongation carried no Applies to,
// so the material pages listed each of them as "not published" on every rigid material, PLA and PEEK alike. Who
// publishes them, counted from measurements.csv on 2026-10-17 (every row, retired copies included):
//
// - Compression set: TPU ≤87A, TPU 95A class, TPU >95A and TPS, all Flexible Elastomers.
// - Tensile stress at 200, 300 and 400 % elongation: PEBA, TPC / TPEE, TPU-CF, TPU-GF and the four TPU hardness
//   classes, and TPS: Flexible Elastomers only.
// - Tear strength and tensile stress at 100 % elongation: the elastomers above, and Spectrum PP (M082, Polyolefins), whose
//   sheet prints "Tear Strength (Die C)" 127 kN/m and "Tensile Stress at 100%" 11 MPa: a polypropylene yields and draws
//   far past 100 %. A rule may test the material's Family, so these two apply to Flexible Elastomers and Polyolefins
//   (PP, PE, OBC and their filled grades), and no material that publishes one loses it (MEAS-NOT-APPLICABLE would stop the
//   build if one did).
// The stresses at 5 % and 10 % elongation are left as they are: a ductile rigid plastic reaches 10 % (D122), and the
// reviewers named neither. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m423-elastomer-tests-apply-to-elastomers.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm423';
const ELASTOMERS = 'Family: Flexible Elastomers';
const STRETCHING = 'Family: Flexible Elastomers | Polyolefins';
const RULES = [
  ['Tear strength', STRETCHING, 'A tear test (ISO 34, ASTM D624) is run on elastomers and on tough, drawing plastics such as the polyolefins; a rigid filament is not tear-tested, and its sheet never prints one.'],
  ['Compression set', ELASTOMERS, 'Compression set is how much of a squeeze a rubbery material keeps; a rigid plastic is not tested for it.'],
  ['Tensile stress at 100 % elongation', STRETCHING, 'Only a material that stretches past 100 % has a stress at 100 % elongation: an elastomer, or a polyolefin that yields and draws; a rigid filament breaks long before.'],
  ['Tensile stress at 200 % elongation', ELASTOMERS, 'Only an elastomer stretches to 200 % and is tested there; a rigid filament breaks long before.'],
  ['Tensile stress at 300 % elongation', ELASTOMERS, 'Only an elastomer stretches to 300 % and is tested there; a rigid filament breaks long before.'],
  ['Tensile stress at 400 % elongation', ELASTOMERS, 'Only an elastomer stretches to 400 % and is tested there; a rigid filament breaks long before.'],
];

const t = openTables();
const family = new Map(t.rows('materials').map((m) => [m.MaterialID, m.Family]));
let n = 0;
for (const [property, rule, reason] of RULES) {
  const allowed = new Set(rule.replace(/^Family:\s*/, '').split('|').map((s) => s.trim()));
  const outside = t.rows('measurements').filter((m) => m.Property === property && !allowed.has(family.get(m.MaterialID)));
  if (outside.length) throw new Error(`${MIGRATION}: ${property} is published by ${outside.map((m) => `${m.MeasurementID} (${family.get(m.MaterialID)})`).join(', ')}, outside "${rule}"`);
  const p = t.get('properties', property);
  // A blank cell (every material) reads as null; anything else means the data moved.
  if (p['Applies to'] !== rule) { t.set('properties', property, 'Applies to', rule, { expect: null, migration: MIGRATION }); n++; }
  if (p['Not applicable reason'] !== reason) { t.set('properties', property, 'Not applicable reason', reason, { expect: null, migration: MIGRATION }); n++; }
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} cell(s); ${RULES.length} properties limited to the materials that are tested for them`);
