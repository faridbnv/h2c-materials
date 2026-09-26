#!/usr/bin/env node
// Migration m144 (2026-09-25): SBC, a styrene-butadiene block copolymer, is a material of its own (the owner's answer
// to OPEN-PROBLEMS §14 after batch b34; R199, D87).
//
// FormFutura's Crystal Flex names its polymer: "an easy to use high-end SBC (Styrene Butadiene Block Copolymer) type of
// 3D printer filament", Shore D 63 with a flexural modulus of 1795 MPa. That is a clear, stiff styrenic, not an
// elastomer, so it is not TPS; no material held SBC, and polymers.csv has no row for it. The owner chose a new in-scope
// material under Styrenics, judged on its own values and not estimated until a resin producer's reference gives it a
// polymers.csv row (R081). None is recorded, so none is written. Heat deflection applies to it: hdt045 names Styrenics
// among the rigid families (m142).
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m144-sbc.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm144-sbc';
const date = '2026-09-25';
const t = openTables();
const NA = 'Not applicable';

if (t.find('materials', 'M174')) {
  if (t.get('materials', 'M174')['Original name'] !== 'SBC') throw new Error(`${migration}: M174 is not SBC; the data moved since this was written`);
  console.log(`${migration}: already applied`);
  process.exit(0);
}
if (t.rows('materials').some((m) => m['Original name'] === 'SBC' || m.Abbreviation === 'SBC')) throw new Error(`${migration}: another material is already called SBC`);
const hdt = t.get('headline_definitions', 'hdt045')['Applies to'];
if (!/Family:[^;]*\bStyrenics\b/.test(hdt)) throw new Error(`${migration}: hdt045 no longer names Styrenics among its families`);

t.append('materials', {
  MaterialID: 'M174', 'Original name': 'SBC', Family: 'Styrenics', 'H2C status': 'Theoretical',
  'Best uses': 'Not published',
  Limitations: 'No polymers.csv row, so nothing is estimated where its products are silent.',
  'Full name': 'Styrene-butadiene block copolymer (SBC)', Scope: 'H2C-relevant', Abbreviation: 'SBC',
  'Base polymer': 'SBC', 'Estimate identity': NA, 'Modifier / filler': 'Unfilled / unspecified', 'Variant class': NA,
  Role: 'Structural / functional / appearance',
  'Identity notes': `A styrene-butadiene block copolymer: FormFutura's Crystal Flex names it ("SBC (Styrene Butadiene Block Copolymer)"), and at Shore D 63 and a flexural modulus of 1795 MPa it is a clear, stiff styrenic, not an elastomer, so not TPS. A material of its own since ${date} (${migration}), the owner's answer to the questions batch b34 left (R199, D87). No polymers.csv row until a resin producer's reference gives it one (R081), so it is not estimated.`,
});
const changes = t.save();
console.log(`${migration}: SBC (M174) under Styrenics; ${changes.length} change(s)`);
