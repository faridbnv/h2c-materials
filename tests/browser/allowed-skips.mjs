// The checks that may be SKIPPED without failing a run, named one by one (pack 07 section 7.2: SKIPPED fails unless it is named).
// A skip that matches nothing here fails the run. Every entry says why and which work package ends it.
export const ALLOWED_SKIPS = Object.freeze([
  // None: every check of the new selector runs since WP-27, and the material pages are the new pages. The next allowance goes here with its reason and the package that ends it.
]);

/** The allowance for a skipped test's title, or null. */
export const allowanceFor = (title) => ALLOWED_SKIPS.find((a) => a.match.test(title)) ?? null;
