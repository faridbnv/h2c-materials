// The checks that may be SKIPPED without failing a run, named one by one (pack 07 section 7.2: SKIPPED fails unless it is named).
// A skip that matches nothing here fails the run. Every entry says why and which work package ends it.
export const ALLOWED_SKIPS = Object.freeze([
  {
    match: /^new selector: /,
    reason: 'the selector of the remake is built in WP-26; its page adapter has only the results and material views (WP-14) to read until then',
  },
]);

/** The allowance for a skipped test's title, or null. */
export const allowanceFor = (title) => ALLOWED_SKIPS.find((a) => a.match.test(title)) ?? null;
