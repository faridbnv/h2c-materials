// Guards that turn a checked string into a distinct ID (contracts/ids.ts). Each pattern is the schema's own
// (schema/tables/*.schema.json `pattern`); a guard narrows, it never casts.

import type { GradeId, MaterialId, MeasurementId, ProfileId, SourceId } from '../contracts/ids.ts';

/** The schema's patterns, by the column that holds the ID; tests/domain/vocab.test.mjs holds them equal to the schema. */
export const ID_PATTERNS = {
  MaterialID: /^M\d{3}$/,
  GradeID: /^G\d{3}-(\d{2,3}|R\d+)$/,
  MeasurementID: /^V\d{6}$/,
  ProfileID: /^P\d{4}$/,
  SourceID: /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
} as const;

export const isMaterialId = (s: string): s is MaterialId => ID_PATTERNS.MaterialID.test(s);
export const isGradeId = (s: string): s is GradeId => ID_PATTERNS.GradeID.test(s);
export const isMeasurementId = (s: string): s is MeasurementId => ID_PATTERNS.MeasurementID.test(s);
export const isProfileId = (s: string): s is ProfileId => ID_PATTERNS.ProfileID.test(s);
export const isSourceId = (s: string): s is SourceId => ID_PATTERNS.SourceID.test(s);
