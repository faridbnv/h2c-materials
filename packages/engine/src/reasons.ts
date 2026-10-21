// Reason codes beside the reason text (02 section 9.5; 15-TYPESCRIPT-PLAN section 2, addition 5).
//
// The engine sets a code at the place that writes each sentence (port/constraints.ts), and the boundary checks it is one of the
// listed words and passes it on (boundary.ts). Nothing here, or anywhere past the engine, reads a sentence for its meaning. The text
// is never touched: `reason` stays word for word.
import type { ReasonEntry, RequirementResult, Status } from '@atlas/domain';

/** A result that says nothing yet either way: UNKNOWN or INDETERMINATE. */
export const isOpen = (status: Status): boolean => status === 'UNKNOWN' || status === 'INDETERMINATE';

/** The reason of a requirement result: the engine's exact text, its code if it set one, and no parameters yet. */
export const reasonEntriesOf = (result: RequirementResult): ReasonEntry =>
  (result.reasonCode === undefined ? { params: {}, text: result.reason } : { code: result.reasonCode, params: {}, text: result.reason });
