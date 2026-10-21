// Boot performance of a page, measured the way a reader meets it (WP-22; the orchestrator's addition from the plan audit): a cold browser
// context, the page fetched over HTTP from the test server (gzip, like Pages), bytes counted on the wire, and the time until the page has
// shown its first results. The same again with the CPU slowed to a quarter (CDP Emulation.setCPUThrottlingRate 4), which is what a weak
// phone is. The old site's numbers are the baseline: the remake's budget is no worse than these, and the strict boot at most 900 KB gzip
// without the chart library (pack 02 section 11). Timings are a trend (median of several runs on one machine), the byte count is exact.
import { cpus, platform, release } from 'node:os';

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * One cold run. `ready` is a page expression that becomes true when the first results are on screen.
 * Returns { firstResultsMs, domContentLoadedMs, loadMs, transferBytes, requests } or throws when the page never got there.
 */
async function bootOnce(browser, { url, ready, throttle }) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    let bytes = 0, requests = 0, failed = 0;
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; requests++; });
    cdp.on('Network.loadingFailed', () => { failed++; });
    // The moment the expression first holds, on the page's own clock (zero is the start of the navigation).
    await page.addInitScript((expression) => {
      const check = () => {
        let ok = false;
        try { ok = !!(0, eval)(expression); } catch { /* not yet */ }
        if (ok && window.__firstResults === undefined) { window.__firstResults = performance.now(); observer.disconnect(); }
      };
      const observer = new MutationObserver(check);
      observer.observe(document, { childList: true, subtree: true, characterData: true });
    }, ready);
    const response = await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
    if (response === null || !response.ok()) throw new Error(`${url} answered ${response === null ? 'nothing' : `HTTP ${response.status()}`}`);
    await page.waitForFunction(() => window.__firstResults !== undefined, undefined, { timeout: 120_000 });
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { firstResultsMs: window.__firstResults, domContentLoadedMs: nav.domContentLoadedEventEnd, loadMs: nav.loadEventEnd };
    });
    if (failed) throw new Error(`${failed} request(s) failed while ${url} booted`);
    return { ...timing, transferBytes: bytes, requests };
  } finally {
    await context.close();
  }
}

/** Several cold runs at one throttle: every run, and the median of each number. */
export async function measureBoot(browser, { url, ready, throttle = 1, runs = 5 }) {
  const all = [];
  for (let i = 0; i < runs; i++) all.push(await bootOnce(browser, { url, ready, throttle }));
  const of = (key) => all.map((r) => Math.round(r[key]));
  return {
    cpuThrottle: throttle, runs: all.length,
    firstResultsMs: { median: Math.round(median(of('firstResultsMs'))), min: Math.min(...of('firstResultsMs')), max: Math.max(...of('firstResultsMs')), all: of('firstResultsMs') },
    domContentLoadedMs: Math.round(median(of('domContentLoadedMs'))), loadMs: Math.round(median(of('loadMs'))),
    transferBytes: all[0].transferBytes, transferBytesAllRuns: [...new Set(all.map((r) => r.transferBytes))], requests: all[0].requests,
  };
}

export const machine = () => ({ os: `${platform()} ${release()}`, cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length });
