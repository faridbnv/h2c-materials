#!/usr/bin/env node
// Migration m17: iSANMATE ASA Glass Fiber, re-read 2026-09-14 (SHA-256 matched). Four published values were never
// transcribed; m16's review listed them but did not add them (npm run audit:sources, label pass).
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { addValue } from './source-edits.mjs';

const MIGRATION = 'm17';
const NA = 'Not applicable';
const SOURCE = 'I-ASA-Glass-Fiber-Technical-Data-Sheet';
const row = (property, raw, rawUnit, value, unit, factor, standard, locator, extra = {}) => ({
  Property: property, 'Raw value': raw, 'Raw unit': rawUnit, 'Raw numeric': value, 'Conversion factor': factor,
  'Normalized value': String(Number((Number(value) * Number(factor)).toPrecision(8))), 'Normalized unit': unit,
  'Standard / load': standard, Locator: locator, ...extra,
});

export const ADDITIONS = [
  { like: 'V000675', set: row('Tensile strength (endpoint unspecified)', '55', 'MPa', '55', 'MPa', '1', 'ISO 527-2/50', 'p. 1: Tensile Strength') },
  { like: 'V000675', set: row('Elongation at break', '10', '%', '10', '%', '1', 'ISO 527-2/50 (printed "SO 527-2/50")', 'p. 1: Tensile Strain (Break)') },
  { like: 'V000675', set: row('Flexural modulus', '2765', 'MPa', '2765', 'GPa', '0.001', 'ISO 178', 'p. 1: Flexural modulus') },
  { like: 'V000673', set: row('Melt mass-flow rate', '15', 'g/10 min', '15', 'g/10 min', '1', 'ISO 1133; 220 °C, 10 kg', 'p. 1: Melt Flow Index (220 ℃, 10Kg)', { Direction: NA, 'Specimen type': 'Not published' }) },
];

export function migrate(t) {
  for (const a of ADDITIONS) {
    if (t.get('measurements', a.like).SourceID !== SOURCE) throw new Error(`${MIGRATION}: ${a.like} is not from ${SOURCE}`);
    addValue(t, { ...a, migration: MIGRATION });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
