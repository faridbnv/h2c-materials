// Checks at the boundary: a plain string or word from the old engine becomes a branded ID or a word-list member only by
// passing one of these, and a value that fails is an error naming it, never a quiet default.
import { MOISTURE_STATES } from '@atlas/data/rows';
import type { ConstraintId, GradeId, MaterialId, MeasurementId, ReleaseId, ServiceMoisture, StateId } from '@atlas/domain';
import { isGradeId, isMaterialId, isMeasurementId, parseStateId, stateId } from '@atlas/domain';

export class BoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoundaryError';
  }
}

/** The member of `list` equal to `value`, or an error. The list's own element is returned, so no cast is needed. */
export function oneOf<const T extends readonly string[]>(list: T, value: unknown, what: string): T[number] {
  const found = list.find((word) => word === value);
  if (found === undefined) throw new BoundaryError(`${what}: ${JSON.stringify(value)} is not one of ${list.join(', ')}`);
  return found;
}

/** `value` itself when `isValid` accepts it, else an error naming `what` and the value. */
function checked<T extends string>(value: string, isValid: (value: string) => value is T, what: string, problem: string): T {
  if (!isValid(value)) throw new BoundaryError(`${what}: ${JSON.stringify(value)} ${problem}`);
  return value;
}

const SCHEMA_PATTERN = 'does not match the schema pattern';

export const materialIdOf = (value: string): MaterialId => checked(value, isMaterialId, 'material ID', SCHEMA_PATTERN);
export const gradeIdOf = (value: string): GradeId => checked(value, isGradeId, 'grade ID', SCHEMA_PATTERN);
export const measurementIdOf = (value: string): MeasurementId => checked(value, isMeasurementId, 'measurement ID', SCHEMA_PATTERN);

/** A state identifier is valid when it parses and writing the parts back gives the same text (so "annealed:120:016" is refused). */
const isStateId = (value: string): value is StateId => {
  const parts = parseStateId(value);
  return parts !== null && stateId(parts.treatment, parts.moisture) === value;
};
export const stateIdOf = (value: string): StateId => checked(value, isStateId, 'state ID', 'is not one stateId could write');

export const moistureOf = (value: string): ServiceMoisture => {
  const found = MOISTURE_STATES.find((word): word is ServiceMoisture => word === value && word !== 'not-stated');
  if (found === undefined) throw new BoundaryError(`moisture: ${JSON.stringify(value)} is not a service moisture state`);
  return found;
};

/**
 * Interim constraint IDs (WP-11): a requirement's own `id` if the scenario gives one, else `c<position>`; the engine's
 * own annealing requirement is `treatment`. How a stable ID is derived is decided with WP-19 (owner question TS-3).
 */
const CONSTRAINT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
// A scenario read from JSON may hold anything in `id`, whatever its type says, so the type is checked too.
const isConstraintId = (value: string): value is ConstraintId => typeof value === 'string' && CONSTRAINT_ID.test(value);
export const constraintIdOf = (value: string): ConstraintId => checked(value, isConstraintId, 'constraint ID', 'is not a usable ID');

/** A release is the first 12 hex characters of a content digest (02 section 6.4). */
const isReleaseId = (value: string): value is ReleaseId => /^[0-9a-f]{12}$/.test(value);
export const releaseIdOf = (value: string): ReleaseId => checked(value, isReleaseId, 'release ID', 'is not 12 lowercase hex characters');

/** A plain object (not null, not an array): the shape JSON gives a record. */
export const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
