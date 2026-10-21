// The boundary: the old engine's answers, checked and typed. Nothing the engine said is dropped or reworded; what is added
// sits beside it (`constraintId`, `reasonCode`), and the words that became IDs or word-list members were checked on the way.
import { GROUP_ORDER, STATUSES } from '@atlas/domain';
import type { Evaluation, ProductView, RequirementResult, StateRef, Status, Verdict } from '@atlas/domain';
import type { ConstraintIndex } from './constraint-ids.ts';
import { gradeIdOf, materialIdOf, measurementIdOf, moistureOf, oneOf, stateIdOf } from './guards.ts';
import type { RawEvaluation, RawProduct, RawResult, RawState } from './old-engine.ts';
import { reasonCodeOf } from './reasons.ts';

const VERDICTS = STATUSES.filter((word): word is Verdict => word !== 'INDETERMINATE');
const statusOf = (value: string): Status => oneOf(STATUSES, value, 'requirement status');
const verdictOf = (value: string): Verdict => oneOf(VERDICTS, value, 'verdict');
const groupOf = (value: string) => oneOf(GROUP_ORDER, value, 'group');

export function toStateRef(raw: RawState): StateRef {
  return { ...raw, id: stateIdOf(raw.id), moisture: moistureOf(raw.moisture) };
}

export function toRequirementResult(raw: RawResult, index: ConstraintIndex): RequirementResult {
  const { id, body } = index.lookup(raw.constraint);
  const { measurementId, ...rest } = raw;
  const status = statusOf(raw.status);
  const checked = { ...rest, status, constraint: body, constraintId: id, ...(measurementId === undefined ? {} : { measurementId: measurementId === null ? null : measurementIdOf(measurementId) }) };
  const reasonCode = reasonCodeOf(checked);
  return reasonCode === undefined ? checked : { ...checked, reasonCode };
}

export function toProductView(raw: RawProduct, index: ConstraintIndex): ProductView {
  const { states, ...rest } = raw;
  return {
    ...rest,
    gradeId: gradeIdOf(raw.gradeId),
    verdict: verdictOf(raw.verdict),
    group: groupOf(raw.group),
    state: toStateRef(raw.state),
    results: raw.results.map((result) => toRequirementResult(result, index)),
    ...(states === undefined ? {} : { states: states.map((s) => ({ ...toStateRef(s), verdict: verdictOf(s.verdict) })) }),
  };
}

export function toEvaluation(raw: RawEvaluation, index: ConstraintIndex): Evaluation {
  const { products, state, gradeId, ...rest } = raw;
  const results = (list: readonly RawResult[]) => list.map((result) => toRequirementResult(result, index));
  return {
    ...rest,
    materialId: materialIdOf(raw.materialId),
    verdict: verdictOf(raw.verdict),
    group: groupOf(raw.group),
    results: results(raw.results),
    failed: results(raw.failed),
    unresolved: results(raw.unresolved),
    ...(products === undefined ? {} : { products: products.map((p) => toProductView(p, index)) }),
    ...(gradeId === undefined ? {} : { gradeId: gradeIdOf(gradeId) }),
    ...(state === undefined ? {} : { state: toStateRef(state) }),
  };
}
