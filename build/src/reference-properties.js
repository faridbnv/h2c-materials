// The generic reference envelopes' properties: key and unit, read from schema/vocab/reference-properties.csv, which
// is what declares them (m42). A ninth property is a row there and its envelope rows in reference_envelopes.csv; it
// was two columns of reference.csv and a schema change.
//
// `offset` is the column offset the retired reference workbook used. Nothing reads it; it is emitted into
// dist/reference.json's meta.properties, where schema/reference.schema.json still requires it, so it is kept here
// rather than written into the data. It goes when that contract does.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const LEGACY_OFFSETS = { density: 1, tensileModulus: 3, yieldStrength: 5, tensileStrength: 7, compressiveStrength: 9, elongation: 11, fractureToughness: 13, thermalExpansion: 15 };

export const REFERENCE_PROPERTIES = readCsv(join(here, '../../schema/vocab/reference-properties.csv')).records.map(({ values }) => {
  if (!values.Unit) throw new Error(`schema/vocab/reference-properties.csv: "${values.Value}" declares no Unit`);
  return { key: values.Value, unit: values.Unit, offset: LEGACY_OFFSETS[values.Value] ?? null };
});
