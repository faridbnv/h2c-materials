// Whether a product declared a variant of its material (grades.csv Variant) still prints as its material's type. A dense
// or lightweight filler, a softer grade or a glow pigment is not the type a printer maker's guide describes, so it reads
// no guide row (D129) and is not counted among its kind of plastic's makers for the chamber (D151). A grade formulated to
// crystallise in the print is the type all the same: its values stand apart from the material's spread, its print
// answers do not (D154). So is a product whose filler is only for looks, a matte finish or a glitter: it reads its type's
// guide in full, the hardened-nozzle answer with the rest (D175, the owner's ruling of 2026-10-20). The vocabulary says
// which (schema/vocab/grade-variants.csv, Reads its type's guide).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.ts';
import type { Dyn } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const READS_GUIDE = new Map<Dyn, Dyn>(readCsv(join(here, '../../../schema/vocab/grade-variants.csv')).records
  .map((r) => [r.values.Value, r.values["Reads its type's guide"] === 'TRUE']));

/** True for a product that is no variant, or a variant that prints as its material's type. */
export const printsAsItsType = (grade: Dyn) => !grade?.variant || READS_GUIDE.get(grade.variant) === true;
