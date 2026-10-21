// What a page did wrong while a test drove it (WP-22). A browser check must never pass on a page that failed to load, so every page a
// test opens is watched: a script error, a console error, a request that failed, an HTTP error from the server. The test ends in a
// failure when any of them happened, whatever its own assertions said. Nothing is dropped silently:
//   - a favicon that is missing is the only exemption by default (the old harness made the same one);
//   - a request cut off by a navigation is not a fault of the page that was left, but one cut off while the page stayed put is;
//   - a test that expects an error (a blocked data part, a missing page) says so with allow(), by a pattern, and the pattern is reported.

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ label?: string }} [options]
 */
export function watchPage(page, { label = 'page' } = {}) {
  const problems = [];
  const dialogs = [];
  const allowed = [];
  const allowedDialogs = [];
  let generation = 0;
  let document = '';   // the page's address without its fragment: a change of fragment (the selector rewrites it) is the same document
  const generationOf = new WeakMap();
  const faults = [];   // everything seen, whether allowed or not
  const record = (text, url = '') => {
    if (/\/favicon\.ico(\?|$)/.test(url)) return;
    const hit = allowed.find((a) => a.pattern.test(text) || a.pattern.test(url));
    faults.push({ text, allowed: hit?.reason ?? null });
    if (hit) { hit.hits++; return; }
    problems.push(`${label}: ${text}`);
  };
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const here = frame.url().split('#')[0];
    if (here !== document) { document = here; generation++; }
  });
  page.on('request', (request) => generationOf.set(request, generation));
  page.on('pageerror', (error) => record(`script error: ${error.stack ?? error.message}`));
  page.on('crash', () => record('the page crashed'));
  page.on('console', (message) => {
    if (message.type() === 'error') record(`console error: ${message.text()}`, message.location().url ?? '');
  });
  page.on('response', (response) => {
    if (response.status() >= 400) record(`HTTP ${response.status()}: ${response.url()}`, response.url());
  });
  page.on('requestfailed', (request) => {
    const why = request.failure()?.errorText ?? 'unknown';
    // Cut off by the navigation that left the page: not this page's fault. Cut off while the document stayed: it is.
    if (why === 'net::ERR_ABORTED' && generationOf.get(request) !== generation) return;
    record(`request failed (${why}): ${request.url()}`, request.url());
  });
  // The old selector reports a link or file problem only through alert(); a page that raises one nobody expected has said something went wrong.
  page.on('dialog', (dialog) => {
    const said = dialog.message();
    dialogs.push(said);
    const hit = allowedDialogs.find((a) => a.pattern.test(said));
    if (hit) hit.hits++; else problems.push(`${label}: unexpected dialog: ${said.slice(0, 200)}`);
    dialog.accept().catch(() => {});
  });
  return {
    problems, dialogs, faults,
    /** Expect an error whose text or address matches: it is recorded and does not fail the test; a pattern that never matched does. */
    allow(pattern, reason) { allowed.push({ pattern, reason, hits: 0 }); },
    /** Expect a dialog (alert) whose message matches: any other dialog fails the test, and so does an expected one that never came. */
    allowDialog(pattern, reason) { allowedDialogs.push({ pattern, reason, hits: 0 }); },
    /** Throws, naming every fault, unless there were none; and throws for an allowance that matched nothing (the error it expected never came). */
    assertClean() {
      const unused = allowed.filter((a) => a.hits === 0).map((a) => `expected a fault matching ${a.pattern} (${a.reason}) and none came`);
      const noDialog = allowedDialogs.filter((a) => a.hits === 0).map((a) => `expected a dialog matching ${a.pattern} (${a.reason}) and none came`);
      const all = [...problems, ...unused, ...noDialog];
      if (all.length) throw new Error(`the page was not clean:\n  ${all.join('\n  ')}`);
    },
  };
}
