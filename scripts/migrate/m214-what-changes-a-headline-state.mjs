#!/usr/bin/env node
// Migration m214 (2026-09-28): a headline says whether annealing or absorbed water changes its value (D99; version
// 2.1, F02).
//
// A product is judged in one state it can be made in (D99): as printed or annealed at a stated schedule, dry or
// conditioned. Whether a property is the part's in a state is physics, not a branch in products.js, so each headline
// says it in two columns. Annealing crystallises a semicrystalline or filled part and moves its stiffness, strength,
// elongation, impact and heat deflection (PET-GF15: 81.6 °C as printed, 133.7 °C annealed); absorbed water plasticises a
// nylon and moves the same, and its glass transition (Polymaker's moisture-conditioning page). A density is the
// resin's, and read the same in every state; a glass transition is the polymer's, not the bar's treatment. Price is no
// measurement.
//
// The reviewer is an AI agent (claude-opus-5.5). A re-run is a no-op.
//
//   node scripts/migrate/m214-what-changes-a-headline-state.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm214-what-changes-a-headline-state';
// Key: [changes with annealing, changes with moisture].
const STATE = {
  density: [false, false],
  tensileModulusXY: [true, true],
  tensileStrengthXY: [true, true],
  tensileStrengthZ: [true, true],
  elongationXY: [true, true],
  charpyNotched: [true, true],
  izodNotched: [true, true],
  hdt045: [true, true],
  glassTransition: [false, true],
  priceCADkg: [false, false],
};

const t = openTables();
const rows = t.rows('headline_definitions');
const missing = rows.filter((r) => !(r.HeadlineKey in STATE)).map((r) => r.HeadlineKey);
if (missing.length) throw new Error(`${migration}: no state written for ${missing.join(', ')}`);
const cell = (b) => (b ? 'TRUE' : 'FALSE');
if (!t.header('headline_definitions').includes('Changes with annealing')) {
  t.addColumn('headline_definitions', 'Changes with annealing', { after: 'Standard', fill: (r) => cell(STATE[r.HeadlineKey][0]) });
  t.addColumn('headline_definitions', 'Changes with moisture', { after: 'Changes with annealing', fill: (r) => cell(STATE[r.HeadlineKey][1]) });
  t.save();
  console.log(`${migration}: two columns written for ${rows.length} headlines`);
} else console.log(`${migration}: already written`);
