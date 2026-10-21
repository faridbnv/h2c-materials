// Reason codes (02 section 9.5; 15-TYPESCRIPT-PLAN section 2, addition 5). Types only: the lists are the values in core/reason-codes.ts.
//
// Today a result says why only in English, and the old engine read its own English back with regexes
// (app/js/engine/constraints.js:948-949 `/^No print profile recorded/`, `/^No temperature published/`; the acceptance
// cases' `reasonMatches`). A reason code travels beside the text: the engine sets one at the place that writes the sentence,
// and nothing reads the sentence for its meaning any more. The text is never touched (WP-19 keeps every sentence word for
// word); a renderer that rebuilds the sentences from a code and its parameters is a later step.
//
// The list was seeded from the code, one code per place that writes a distinct reason sentence, with the file and line it came
// from (core/reason-codes.ts). Several codes share one producer branch (the four "Not published. Estimated ..." sentences);
// the parameters each needs are not designed yet (a reason entry carries none).
import type { ENGINE_REASON_CODES, GATE_REASON_CODES, REASON_CODES } from '../core/reason-codes.ts';

/** Print gate reasons, written by the build into a gate. The engine passes the build's sentence through and names its family. */
export type GateReasonCode = (typeof GATE_REASON_CODES)[number];
/** Reasons the engine writes itself. */
export type EngineReasonCode = (typeof ENGINE_REASON_CODES)[number];
/**
 * Every reason code. A print gate requirement passes the gate's own sentence through, so its code is the GateReasonCode the
 * build's sentence belongs to (packages/engine/src/port/gate-reasons.ts reads it once, until the build writes the code).
 */
export type ReasonCode = (typeof REASON_CODES)[number];
