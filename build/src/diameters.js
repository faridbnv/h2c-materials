// Whether the H2C takes a product's filament diameter (grades.csv Diameter, D175): the vocabulary says, per diameter
// (schema/vocab/diameters.csv, Fits the H2C). The H2C feeds 1.75 mm; a product found only in 2.85 mm is kept and counted,
// as its values describe its polymer as printed, and its detail and card say that only that diameter was found.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.js';

const here = dirname(fileURLToPath(import.meta.url));
export const DIAMETER_FITS = new Map(readCsv(join(here, '../../schema/vocab/diameters.csv')).records
  .map((r) => [r.values.Value, r.values['Fits the H2C'] === 'TRUE']));
