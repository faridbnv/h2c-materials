#!/usr/bin/env node
// Migration m02: a headline is a selected measurement, not a copied number.
//
// Before: Materials carried each headline twice, once as a number (Density kg/m³, Tensile modulus XY
// GPa, Tensile strength XY MPa, Elongation at break XY %, HDT 0.45 MPa °C) and once as a citation
// list (Mechanical evidence, Thermal evidence), and the build checked that the number equalled one
// of the cited measurements.
//
// After: data/tables/headlines.csv holds one row per citation: MaterialID, HeadlineKey,
// MeasurementID, Use. Use "value" selects the measurement whose value the headline shows; "context"
// keeps a measurement the material cited for that headline without it being the value (four
// materials cite a Vicat, melting or 0.455 MPa HDT result as thermal evidence). A material with no
// "value" row for a key has no headline value: Not published. The number now exists only in its
// measurement.
//
// Each value row is found exactly as the build matched it (same value, unit, material, representative
// grade, property and direction); anything ambiguous or unmatched stops the migration.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { parseValue, DATA_STATUS } from '../../build/src/normalize/values.js';
import { normalizeDirection } from '../../build/src/normalize/direction.js';

const HEADLINES = [
  ['density', 'Density kg/m³', 'kg/m³', 'Mechanical evidence', ['Density'], null],
  ['tensileModulusXY', 'Tensile modulus XY GPa', 'GPa', 'Mechanical evidence', ['Tensile modulus'], 'XY'],
  ['tensileStrengthXY', 'Tensile strength XY MPa', 'MPa', 'Mechanical evidence', ['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength'], 'XY'],
  ['elongationXY', 'Elongation at break XY %', '%', 'Mechanical evidence', ['Elongation at break'], 'XY'],
  ['hdt045', 'HDT 0.45 MPa °C', '°C', 'Thermal evidence', ['HDT'], null],
];
const VALUE_COLUMNS = HEADLINES.map((h) => h[1]);
const ids = (cell) => (cell == null ? [] : String(cell).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !/^(not published|not applicable)$/i.test(s)));

export function migrate(t) {
  if (!t.header('materials').includes('Mechanical evidence')) return; // already applied
  const measurements = new Map(t.rows('measurements').map((r) => [r.MeasurementID, r]));
  const rows = [];

  for (const mat of t.rows('materials')) {
    const claimed = new Set();
    for (const [key, column, unit, evidenceColumn, properties, direction] of HEADLINES) {
      const parsed = parseValue(mat[column]);
      const cited = ids(mat[evidenceColumn]);
      if (!parsed.known) {
        if (parsed.text !== 'Not published') throw new Error(`${mat.MaterialID} ${key}: missing state "${parsed.text}" has no home in headlines.csv yet`);
        continue;
      }
      const matches = cited.filter((id) => {
        const m = measurements.get(id);
        if (!m) return false;
        const status = DATA_STATUS[m['Data status']];
        return status?.numeric && !status.quarantined
          && Number(m['Normalized value']) === parsed.value && m['Normalized unit'] === unit
          && m.MaterialID === mat.MaterialID && m.GradeID === mat['Representative grade']
          && properties.includes(m.Property)
          && (!direction || normalizeDirection(m.Direction).canonical === direction);
      });
      if (matches.length !== 1) throw new Error(`${mat.MaterialID} ${key} = ${parsed.value}: ${matches.length} cited measurements match (${cited.join(', ')})`);
      rows.push({ MaterialID: mat.MaterialID, HeadlineKey: key, MeasurementID: matches[0], Use: 'value' });
      claimed.add(matches[0]);
    }
    // Citations that are not a headline value stay, as context for the headline their column serves.
    for (const [evidenceColumn, key] of [['Mechanical evidence', null], ['Thermal evidence', 'hdt045']]) {
      for (const id of ids(mat[evidenceColumn]).filter((x) => !claimed.has(x))) {
        if (!key) throw new Error(`${mat.MaterialID}: mechanical citation ${id} is not a headline value; decide its headline before migrating`);
        rows.push({ MaterialID: mat.MaterialID, HeadlineKey: key, MeasurementID: id, Use: 'context' });
      }
    }
  }

  t.createTable('headlines', ['MaterialID', 'HeadlineKey', 'MeasurementID', 'Use'], rows);
  for (const c of [...VALUE_COLUMNS, 'Mechanical evidence', 'Thermal evidence']) t.dropColumn('materials', c);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  const changes = t.save();
  console.log(`${changes.length} change(s); headlines.csv has ${t.rows('headlines').length} rows`);
}
