// The boundary: the old engine's answers, checked and typed. Nothing the engine said is dropped or reworded; what is added
// sits beside it (`constraintId`, `reasonCode`), and the words that became IDs or word-list members were checked on the way.
import { GROUP_ORDER, PRODUCT_SHARES, REASON_CODES, STATUSES, parseStateId } from '@atlas/domain';
import type { ConstraintId, Evaluation, Group, MeasurementId, ProductView, ReasonCode, RequirementResult, StateRef, Status, Verdict } from '@atlas/domain';
import type { ConstraintIndex } from './constraint-ids.ts';
import { BoundaryError, gradeIdOf, materialIdOf, measurementIdOf, moistureOf, oneOf, stateIdOf } from './guards.ts';
import type { RawEvaluation, RawProduct, RawResult, RawState } from './old-engine.ts';

const VERDICTS = STATUSES.filter((word): word is Verdict => word !== 'INDETERMINATE');
const statusOf = (value: string): Status => oneOf(STATUSES, value, 'requirement status');
const verdictOf = (value: string): Verdict => oneOf(VERDICTS, value, 'verdict');
const groupOf = (value: string): Group => oneOf(GROUP_ORDER, value, 'group');
const reasonCodeOf = (value: string): ReasonCode => oneOf(REASON_CODES, value, 'reason code');

/** A state: its identifier and the parts the identifier encodes. The two must agree (engine.ts StateRef), so a disagreement is an error. */
export function toStateRef(raw: RawState): StateRef {
  const id = stateIdOf(raw.id);
  const moisture = moistureOf(raw.moisture);
  const parts = parseStateId(id);
  const agrees = parts !== null && parts.moisture === moisture && (parts.treatment?.tempC ?? null) === (raw.treatment?.tempC ?? null)
    && (parts.treatment?.hours ?? null) === (raw.treatment?.hours ?? null) && (parts.treatment === null) === (raw.treatment === null);
  if (!agrees) throw new BoundaryError(`state ${id}: its moisture and treatment (${JSON.stringify([raw.moisture, raw.treatment])}) are not what the identifier says`);
  return { ...raw, id, moisture };
}

/** The result's `measurementId` as the engine gave it: absent stays absent, null stays null. */
function checkedMeasurement(measurementId: string | null | undefined): { measurementId?: MeasurementId | null } {
  if (measurementId === undefined) return {};
  return { measurementId: measurementId === null ? null : measurementIdOf(measurementId) };
}

/** The result a numeric answer carries a record ID in: the only kind that names a measurement. */
const isNumericRaw = (r: RawResult): r is Extract<RawResult, { readonly constraint: { readonly kind: 'numeric' } }> => r.constraint.kind === 'numeric';

/** One result, its words and IDs checked, with the ID of the requirement it answers beside it. */
function checkedResult(raw: RawResult, id: ConstraintId): RequirementResult {
  const status = statusOf(raw.status);
  // The engine says which code its sentence has; a word that is not one of the listed codes is refused here.
  const code: { reasonCode?: ReasonCode } = raw.reasonCode === undefined ? {} : { reasonCode: reasonCodeOf(raw.reasonCode) };
  if (isNumericRaw(raw)) {
    const { measurementId, ...rest } = raw;
    return { ...rest, status, constraintId: id, ...code, ...checkedMeasurement(measurementId) };
  }
  return { ...raw, status, constraintId: id, ...code };
}

/**
 * One evaluation's results, converted once each: a result the engine lists in `results` and again in `failed` or
 * `unresolved` is one object there, and stays one object here.
 */
function resultConverter(index: ConstraintIndex): (raw: RawResult) => RequirementResult {
  const done = new Map<RawResult, RequirementResult>();
  return (raw) => {
    const known = done.get(raw);
    if (known) return known;
    const result = checkedResult(raw, index.lookup(raw.constraint).id);
    done.set(raw, result);
    return result;
  };
}

function toProductView(raw: RawProduct, convert: (raw: RawResult) => RequirementResult): ProductView {
  const { states, ...rest } = raw;
  return {
    ...rest,
    gradeId: gradeIdOf(raw.gradeId),
    verdict: verdictOf(raw.verdict),
    group: groupOf(raw.group),
    state: toStateRef(raw.state),
    results: raw.results.map(convert),
    ...(states === undefined ? {} : { states: states.map((s) => ({ ...toStateRef(s), verdict: verdictOf(s.verdict) })) }),
  };
}

export function toEvaluation(raw: RawEvaluation, index: ConstraintIndex): Evaluation {
  const { products, state, gradeId, share, ...rest } = raw;
  const convert = resultConverter(index);
  return {
    ...rest,
    materialId: materialIdOf(raw.materialId),
    verdict: verdictOf(raw.verdict),
    group: groupOf(raw.group),
    results: raw.results.map(convert),
    failed: raw.failed.map(convert),
    unresolved: raw.unresolved.map(convert),
    ...(share === undefined ? {} : { share: share === null ? null : oneOf(PRODUCT_SHARES, share, 'share') }),
    ...(products === undefined ? {} : { products: products.map((p) => toProductView(p, convert)) }),
    ...(gradeId === undefined ? {} : { gradeId: gradeIdOf(gradeId) }),
    ...(state === undefined ? {} : { state: toStateRef(state) }),
  };
}
