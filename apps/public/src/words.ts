// The words this view uses for the engine's answers. They are the selector's own words (app/js/ui/decision.js VERDICT_WORD and
// explain.js, labels.js GROUP_WORDS), kept in one place so a screen never words a verdict its own way (tests/parity/public-view
// holds them equal to the selector's). Numbers and reasons are never worded here: they come from the engine, as it wrote them.
import type { Group, Status } from '@atlas/domain';
import type { Verdict } from './model.ts';

export const VERDICT_WORD: Readonly<Record<Verdict, string>> = { PASS: 'meets every requirement', UNKNOWN: 'could not be settled', FAIL: 'fails a requirement' };

/** The label of a verdict as it stands alone in a table cell. */
export const VERDICT_LABEL: Readonly<Record<Verdict, string>> = { PASS: 'Meets every requirement', UNKNOWN: 'Could not be settled', FAIL: 'Fails a requirement' };

/** A requirement's status: within, beyond, no data (explain.js); INDETERMINATE is the threshold cutting through the evidence. */
export const STATUS_WORD: Readonly<Record<Status, string>> = { PASS: 'within', FAIL: 'beyond', UNKNOWN: 'no data', INDETERMINATE: 'on the line' };

/** The groups the table lists, in the listing's order (constraints.js GROUP_ORDER). */
export const GROUP_WORD: Readonly<Record<Group, string>> = {
  meets: 'Meets every requirement', 'one-check-away': 'One check away', 'not-enough-data': 'Not enough data',
  'unlikely-to-meet': 'Unlikely to meet', hidden: 'Hidden', fail: 'Fails a requirement',
};
