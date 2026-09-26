#!/usr/bin/env node
// Migration m146 (2026-09-25): exclusion is recorded once, in Scope (re-center phase 5, "stored copies").
//
// Seventeen materials carried Scope "Excluded" and H2C status "Excluded", and the check EXCLUSION kept the two in step.
// H2C status says how a material relates to the printer; Scope says whether it is a candidate. "Excluded" in H2C status
// was Scope again, so it leaves the vocabulary and each of the seventeen takes the status that describes it:
//
// - The three sintering filaments (M171 316L, M172 silicon carbide, M173 alumina) are Theoretical. Bambu does not list
//   them, and their own sheets put the print well within the H2C's reach: Nanovia 316L 170-190 C nozzle and 40-60 C bed
//   (P1176), BASF Ultrafuse 316L 230-250 C and 90-120 C (P1178), Nanovia SiC 200-220 C and 40-60 C (P1195), and Fabru's
//   Kerfil alumina 170-200 C and a 50 C bed, "processable with all usual FDM 3D printers" (its sheet, p. 1-2). They are
//   out because the printed part is a green part sintered elsewhere (D87), which Scope and their Limitations say.
// - The fourteen industrial high-temperature materials (PEEK, PEKK, PEI, PSU, PESU, PPSU and their filled and ESD
//   variants) fit no existing value: each of the four asserts that the H2C can print the material (Bambu sells it, lists
//   its family, it is usable with conditions, or its typical processing is within reach), and their own profiles ask
//   340-480 C nozzles, 120-180 C beds and 70-150 C chambers against the H2C's 350/120/65. They take a new value,
//   "Exceeds H2C limits", which says that about the printer and nothing about the candidate set.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m146-exclusion-is-scope.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm146-exclusion-is-scope';
const t = openTables();

const SINTERING = ['M171', 'M172', 'M173'];
const HIGH_TEMPERATURE = ['M097', 'M098', 'M099', 'M100', 'M101', 'M102', 'M115', 'M117', 'M118', 'M121', 'M122', 'M123', 'M125', 'M127'];
const STATUS = { ...Object.fromEntries(SINTERING.map((id) => [id, 'Theoretical'])), ...Object.fromEntries(HIGH_TEMPERATURE.map((id) => [id, 'Exceeds H2C limits'])) };

// Every excluded material is named above, and nothing else is: a new exclusion since this was written is a decision
// this migration did not make.
const excluded = t.rows('materials').filter((m) => m.Scope === 'Excluded').map((m) => m.MaterialID).sort();
if (excluded.join() !== Object.keys(STATUS).sort().join()) throw new Error(`${migration}: the excluded materials are ${excluded.join(', ')}, not the seventeen this was written for; the data moved`);
if (!t.get('materials', 'M171').Family.startsWith('Metal and Ceramic Sintering')) throw new Error(`${migration}: M171 is not a sintering filament`);

let n = 0;
for (const [id, status] of Object.entries(STATUS)) {
  const m = t.get('materials', id);
  if (m['H2C status'] === status) continue;
  if (m['H2C status'] !== 'Excluded') throw new Error(`${migration}: ${id} H2C status is "${m['H2C status']}", expected "Excluded"; the data moved`);
  t.set('materials', id, 'H2C status', status, { expect: 'Excluded' });
  n++;
}
if (t.rows('materials').some((m) => m['H2C status'] === 'Excluded')) throw new Error(`${migration}: a material still reads H2C status Excluded`);

if (n) t.save();
console.log(`${migration}: ${n} H2C status(es) written`);
