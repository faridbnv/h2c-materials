#!/usr/bin/env node
// Migration m28: polymer identities and variant classes are data, so they leave the estimate model's configuration
// (build/mappings/estimate-model.json identities and variants) for tables (DECISIONS D60).
//
// - data/tables/polymers.csv: one row per identity, the same facts the configuration held (group, morphology, melting
//   point, how it solidifies in a print, water uptake, neat density range), with where they come from.
// - materials.csv Estimate identity: the polymer row a material is estimated as, which the code derived from Base polymer,
//   or for a blend its name. A foreign key now, so a renamed polymer fails at the schema gate by file and line.
// - materials.csv Variant class: silk or particle-filled, which the configuration listed by material name.
//
// The values are copied unchanged; the estimates must not move (npm run build:diff).
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';

const NA = 'Not applicable';
const BASIS = {
  default: 'Classification and typical values from polymer handbooks and resin data sheets, as compiled for the estimate model (docs/audits/2026-09-15-filtering-estimates-data/physics/); no single source recorded.',
  PET: 'Handbook values; prints amorphous: PET-GF15 81.6 °C as printed and 133.7 °C annealed (DECISIONS D56).',
  PPA: 'Handbook values; prints amorphous unless fibre-filled: IPCON PPA 103 °C as printed and 131 °C annealed, Bambu PPA-CF 227 °C unannealed (D56).',
  PPS: 'Handbook values; printed hot PPS crystallises (IPCON PPS GF 241 °C, Bambu PPS-CF 264 °C unannealed), but its heat deflection is not modelled on its melting point (D56).',
  PVA: 'Handbook values; prints amorphous (D56).',
  BVOH: 'Handbook values; prints amorphous (D56).',
  Support: 'A support product is not characterised as a structural material; it carries only a classification.',
};

export function asPrinted(info) {
  if (info.morphology !== 'semicrystalline') return NA;
  if (info.fastCrystallising) return 'crystallises while printing';
  if (info.printsAmorphous === true) return 'prints amorphous';
  if (info.printsAmorphous === 'unfilled') return 'prints amorphous unless fibre-filled';
  return 'crystallises, not driven by its melting point';
}

export function migrate(t, model) {
  if (!t.tables().includes('polymers')) {
    const header = ['PolymerID', 'Group', 'Morphology', 'Melting point °C', 'As printed', 'Water uptake', 'Neat density min kg/m³', 'Neat density max kg/m³', 'SourceID', 'Basis'];
    const rows = Object.entries(model.identities).filter(([id]) => !id.startsWith('_')).map(([id, info]) => ({
      PolymerID: id, Group: info.group, Morphology: info.morphology,
      'Melting point °C': info.tm ?? NA, 'As printed': asPrinted(info), 'Water uptake': info.waterUptake ?? NA,
      'Neat density min kg/m³': info.density?.[0] ?? 'Not recorded', 'Neat density max kg/m³': info.density?.[1] ?? 'Not recorded',
      SourceID: 'Not recorded', Basis: BASIS[id] ?? BASIS.default,
    }));
    t.createTable('polymers', header, rows);
  }
  const identity = (m) => (m.Family === 'Polymer Blends' ? m['Normalized name'] : m['Base polymer']);
  if (!t.header('materials').includes('Estimate identity')) {
    t.addColumn('materials', 'Estimate identity', { after: 'Base polymer', fill: (m) => (model.identities[identity(m)] ? identity(m) : NA) });
  }
  if (!t.header('materials').includes('Variant class')) {
    const classOf = new Map(Object.entries(model.variants).filter(([k]) => !k.startsWith('_')).flatMap(([cls, names]) => names.map((n) => [n, cls])));
    t.addColumn('materials', 'Variant class', { after: 'Modifier / filler', fill: (m) => classOf.get(m['Original name']) ?? NA });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const model = JSON.parse(readFileSync(join(projectRoot, 'build/mappings/estimate-model.json'), 'utf8'));
  const t = openTables(projectRoot, { allowMissing: true });
  migrate(t, model);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
