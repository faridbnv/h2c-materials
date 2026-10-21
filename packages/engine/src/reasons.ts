// Reason codes beside the reason text (02 section 9.5; 15-TYPESCRIPT-PLAN section 2, addition 5).
//
// The old engine writes no codes, so the wrapper sets one only where the result's own structure settles it: its kind, its
// gate or facet, its status and the flags the engine itself set. It never reads the sentence back, which is the very
// habit reason codes exist to end (constraints.js:948-949). Where one status can come from several sentences (the
// numeric checks, the print gates, the environment checks) no code is set; WP-19 gives the engine a code at the place
// that writes each sentence, and the rest follow. The text is never touched: `reason` stays word for word.
import type { ReasonCode, ReasonEntry, RequirementResult, Status } from '@atlas/domain';

type Branch = { readonly status: Status; readonly constraint: RequirementResult['constraint']; readonly treatment?: unknown };

/** A result that says nothing yet either way: UNKNOWN or INDETERMINATE. */
export const isOpen = (status: Status): boolean => status === 'UNKNOWN' || status === 'INDETERMINATE';

/** The code for a print-independent gate whose sentence the status settles. */
function gateCode(gate: string | undefined, hardenedAvailable: unknown, status: Status): ReasonCode | undefined {
  if (gate === 'scope') {
    if (status === 'PASS') return 'scope.within-h2c';
    return status === 'FAIL' ? 'scope.beyond-h2c' : undefined;
  }
  if (gate === 'abrasive') return hardenedAvailable ? 'nozzle.hardened-available' : undefined;
  if (gate === 'buyable') {
    if (status === 'PASS') return 'price.listed';
    if (status === 'FAIL') return 'price.out-of-stock';
    return isOpen(status) ? 'price.not-listed' : undefined;
  }
  if (gate === 'dryingKnown') {
    if (status === 'PASS') return 'drying.stated';
    return isOpen(status) ? 'drying.no-statement' : undefined;
  }
  return undefined;
}

/** The code for this result, or undefined when its structure does not settle one. */
export function reasonCodeOf({ status, constraint, treatment }: Branch): ReasonCode | undefined {
  switch (constraint.kind) {
    case 'treatment':
      if (treatment === undefined) return 'treatment.as-printed';
      if (status === 'PASS') return 'treatment.annealing-allowed';
      return isOpen(status) ? 'treatment.schedule-incomplete' : undefined;
    case 'gate':
      return gateCode(constraint.gate, constraint.hardenedAvailable, status);
    case 'facet':
      if (isOpen(status)) return 'facet.not-recorded';
      if (constraint.facet === 'filler') return 'facet.filler-recorded';
      return constraint.facet === 'supportMaterial' ? 'facet.role' : 'facet.recorded';
    case 'evidence':
      return constraint.exactGrade || constraint.noConflicts ? 'evidence.checks' : 'evidence.no-criterion';
    case 'numeric':
    case 'environment':
      return undefined;
  }
}

/** The reason of a requirement result: the engine's exact text, its code if the structure settles one, and no parameters yet. */
export const reasonEntriesOf = (result: RequirementResult): ReasonEntry =>
  (result.reasonCode === undefined ? { params: {}, text: result.reason } : { code: result.reasonCode, params: {}, text: result.reason });
