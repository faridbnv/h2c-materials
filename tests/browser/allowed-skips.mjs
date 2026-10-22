// The checks that may be SKIPPED without failing a run, named one by one (pack 07 section 7.2: SKIPPED fails unless it is named).
// A skip that matches nothing here fails the run. Every entry says why and which work package ends it.
export const ALLOWED_SKIPS = Object.freeze([
  {
    match: /^new selector: Ashby decision workspace$/,
    reason: 'the Ashby decision workspace is rebuilt in WP-27; the selector of WP-26 draws the table and the why-excluded lenses, and says so as a named unsupported step',
  },
  {
    match: /^new selector: material pages(, (laptop|tablet|phone)|: the return trip)$/,
    reason: 'the material pages are the old pages until their own package, and the selector rebuild does not change them; the new selector\'s own way there and back is the behaviour "Back to your results"',
  },
]);

/** The allowance for a skipped test's title, or null. */
export const allowanceFor = (title) => ALLOWED_SKIPS.find((a) => a.match.test(title)) ?? null;
