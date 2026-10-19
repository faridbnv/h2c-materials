#!/usr/bin/env node
// Migration m451 (2026-10-18): the estimate model's annealed conversions learn only from several makers, and a glassy
// matrix's annealed heat deflection has a conversion of its own (the screening build's stage 4b, the stage-4 review's S01,
// S05 and S11, D167).
//
// S11. The annealed heat deflection's learned offset, −77 °C, rested on three pairs of one maker (Siraya Tech's PPA-CF,
// PPA-CF Core and PPA-GF, +101 to +108 °C), and it converted the annealed values of every crystalline matrix: a nylon or a
// PPS printed hot is already crystalline and gains far less. The four annealed rows (CV03 heat deflection, CV04
// stiffness, CV33 strength, CV39 elongation) now learn "pairs, several makers": their documented offset and spread stand
// until at least 5 pairs from at least 2 makers publish both (estimate-model.json fitting.severalMakers).
//
// S05. The estimate read a treatment at or below each material's own glass transition as no anneal, where the core reads
// polymers.csv's Annealing threshold °C (D158) alone. With the one rule, an amorphous polymer's annealed value is
// annealed, and a glassy bar's heat deflection rises by a few degrees on annealing, not by the tens a crystallising one
// gains. This database's own same-sheet pairs of an amorphous polymer: at 0.45 MPa Spectrum's four print one number
// twice (+0 °C); at 1.8 MPa Fiberlogy ABS 85 → 100 °C, Yousu PC 121 → 141 °C, Spectrum 75 → 75 °C. The row documents
// −5 °C (the headline is about 5 °C under the annealed value) with a spread of 8 °C, which holds 0 to +20 °C; it learns
// from several makers too.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m451-annealed-conversions-from-several-makers.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm451';
const NA = 'Not applicable';
const t = openTables();
let changed = 0;

for (const id of ['CV03', 'CV04', 'CV33', 'CV39']) {
  const row = t.rows('conversions').find((r) => r.ConversionID === id);
  if (row['Estimate learns'] === 'pairs, several makers') continue;
  t.set('conversions', id, 'Estimate learns', 'pairs, several makers', { expect: 'pairs', migration: MIGRATION });
  changed++;
}

const KIND = 'HDT 0.45 annealed glassy';
const glassy = {
  'Target headline': 'hdt045', 'Source properties': 'HDT', 'Source load MPa': NA, 'Source direction': NA, 'Source state': NA,
  'Source specimen': NA, Kind: 'estimate', 'Factor low': NA, 'Factor high': NA, 'Absolute offset': '0', 'Applies to': '',
  'Physical relation': NA, Status: NA, 'Estimate kind': KIND, 'Estimate offset': '-5', 'Estimate sd': '8',
  'Estimate learns': 'pairs, several makers',
  'Estimate note': 'Annealed after printing, a glassy matrix: stress relieved, a few degrees higher (this database\'s same-sheet pairs: +0 °C on Spectrum\'s four at 0.45 MPa; at 1.8 MPa Fiberlogy ABS +15, Yousu PC +20, Spectrum +0; D167)',
  'Reason words': NA, SourceID: NA,
  Basis: 'The estimate model\'s documented conversion of an amorphous polymer\'s heat deflection measured after annealing (HDT 0.45 annealed glassy) to hdt045. An anneal of a glassy bar relieves its printing stresses and ages it a little; it crystallises nothing, so the heat deflection rises by a few degrees, where a crystallising matrix gains tens (CV03). Refined at every build by the grades that publish both, once 5 pairs from 2 makers do (D43, D157, D167).',
};
const held = t.rows('conversions').find((r) => r['Estimate kind'] === KIND);
if (held) {
  for (const [k, v] of Object.entries(glassy)) if ((held[k] ?? '') !== v) throw new Error(`${MIGRATION}: ${held.ConversionID} ${k} is ${held[k]}; the data moved`);
} else {
  t.append('conversions', { ConversionID: t.nextId('conversions'), ...glassy });
  changed++;
}
t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
