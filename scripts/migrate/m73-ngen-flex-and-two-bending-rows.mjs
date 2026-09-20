#!/usr/bin/env node
// Migration m73 (2026-09-19): what b09 left for a person to decide.
//
// 1. colorFabb's nGen_FLEX created a material called "nGen", because the rigid nGen this database already holds
//    is filed as "nGen / Amphora" and the name did not match. It is the flexible grade of that copolyester: its
//    own sheet publishes a glass transition of -40 °C, and as an "nGen" it pulled the rigid material's heat
//    deflection estimate down to a plausible range beginning at 20.5 °C. It is named for what it is. The leak
//    itself is closed where it belongs, in the estimate model: a bound on what a material's part can do comes
//    from that material's own sheets, never from a sibling of the same identity.
//
// 2. Flashforge's PA6-GF20 sheet prints "Bending Strength (X-Y) ISO 178 Mpa 5545~5879" and 1582~1653 in Z. No
//    bending strength of any polymer reaches 5545 MPa; those are a bending modulus, under a label that says
//    strength. The numbers stay as printed, marked physically implausible with the reason, so they back no
//    headline, estimate or bound (the m24 pattern).
//
//   node scripts/migrate/m73-ngen-flex-and-two-bending-rows.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
let n = 0;

const material = t.rows('materials').find((m) => m.MaterialID === 'M143');
if (material && material['Original name'] === 'nGen') {
  t.set('materials', 'M143', 'Original name', 'nGen FLEX', { expect: 'nGen' });
  t.set('materials', 'M143', 'Abbreviation', 'nGen FLEX', { expect: material.Abbreviation });
  t.set('materials', 'M143', 'Full name', 'Amphora-Based Copolyester, flexible grade (nGen FLEX)', { expect: material['Full name'] });
  t.set('materials', 'M143', 'Identity notes', "colorFabb's nGen_FLEX is the flexible grade of the copolyester this database holds as M092 nGen / Amphora, not a second nGen: its own sheet publishes a glass transition of -40 °C and a flexural modulus of 150 MPa, where the rigid grade's are 70 °C and 1500. It is not estimated, because one flexible product of a polymer whose other products are rigid says nothing the model can carry across; its values are its own.", { expect: material['Identity notes'] });
  n += 4;
}

const NOTE = 'The sheet prints this under "Bending Strength" in MPa, and no polymer bends at 5545 MPa: the pair of numbers on this sheet is a bending modulus under a label that says strength. Recorded as printed.';
for (const id of ['V005397', 'V005398']) {
  const row = t.rows('measurements').find((m) => m.MeasurementID === id);
  if (!row || row['Data status'] !== 'Published value') continue;
  t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: 'Published value' });
  t.set('measurements', id, 'Notes', row.Notes === 'Not applicable' ? NOTE : `${row.Notes}; ${NOTE}`, { expect: row.Notes });
  n += 2;
}

if (n) t.save();
console.log(`${n} cell(s) written`);
