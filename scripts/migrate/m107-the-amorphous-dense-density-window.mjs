#!/usr/bin/env node
// Migration m107 (2026-09-21): the density window D80 described and did not write.
//
// D80 gave a grade that declares a dense load a fill class of its own, and drew twenty-six windows for it. The
// semicrystalline density window says it is drawn "as the amorphous dense window, on a matrix that starts
// lighter" (W0083), and the lint's own test judges a bronze-filled PLA against an amorphous dense window of 900 to
// 8000 kg/m³ — but the row itself was never written. So every amorphous grade that declares a metal load is still
// judged by W0002, which is drawn for 35 wt% glass and stops at 2000, and six densities that are exactly what the
// grades declare stand as accepted findings whose reason says "no plausibility window carries a fill class for a
// metal or mineral load". It carries one now.
//
// The numbers are the semicrystalline window's on the amorphous matrix's floor, which is the reasoning W0083
// gives in reverse: an amorphous matrix starts at about 1.0 to 1.2, and a light mineral load barely lifts it; a
// metal powder at 60 to 80 wt% is what the upper end is for. Observation, over the amorphous grades that declare
// the load: Protopasta's steel- and metal-filled PLA at 2300, colorFabb's steelFill at 3130 and BronzeFill at
// 3900, FormFutura's MetalFil at 2780 to 3500 and colorFabb's copperFill at 4000 (batch b28, R095).
//
//   node scripts/migrate/m107-the-amorphous-dense-density-window.mjs

import { openTables } from '../data/table-io.mjs';

const WINDOW = {
  WindowID: 'W0108', Property: 'Density', 'Normalized unit': 'kg/m³', 'Matrix class': 'amorphous', 'Fill class': 'dense', Condition: 'any',
  'Hard low': '900', 'Soft low': '1100', 'Soft high': '4000', 'Hard high': '8000', 'Always flag': 'FALSE',
  Basis: 'Physics: a metal or mineral powder at 60 to 80 wt% makes an amorphous filament weigh what the powder makes it weigh — a bronze-filled PLA is about 3.9 g/cm³ and a tungsten-filled one about 4 — while a light mineral load barely lifts the matrix above its own 1.0 to 1.2. The window D80 described and W0083 is drawn from. Observation: 2300 to 4000 over the amorphous grades that declare the load (Protopasta, colorFabb steelFill, BronzeFill and copperFill, FormFutura MetalFil).',
};

const t = openTables();
if (t.find('plausibility_windows', WINDOW.WindowID)) {
  console.log(`m107: ${WINDOW.WindowID} is already there; nothing to do`);
} else {
  t.append('plausibility_windows', WINDOW);
  t.save();
  console.log(`m107: ${WINDOW.WindowID} written — Density, amorphous, dense`);
}
