// The generic reference envelopes' properties: key and unit, read from schema/vocab/reference-properties.csv, which
// is what declares them (m42). A ninth property is a row there and its envelope rows in reference_envelopes.csv; it
// was two columns of reference.csv and a schema change. The retired reference workbook's column offsets, which
// nothing read, left the compiled file and its contract on 2026-09-25 (D67).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.js';

const here = dirname(fileURLToPath(import.meta.url));

export const REFERENCE_PROPERTIES = readCsv(join(here, '../../schema/vocab/reference-properties.csv')).records.map(({ values }) => {
  if (!values.Unit) throw new Error(`schema/vocab/reference-properties.csv: "${values.Value}" declares no Unit`);
  return { key: values.Value, unit: values.Unit };
});
