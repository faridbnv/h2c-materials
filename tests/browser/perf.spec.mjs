// The performance baseline of the OLD site (WP-22): bytes transferred to boot and the time to first results, with the CPU as it is and
// slowed 4x, under each base path. Written to remake/measure/perf-old.json. A baseline, not a gate: the remake's later budget is "no worse
// than today" on these and a strict boot of at most 900 KB gzip without the chart library. Full run only; it measures, it does not check.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, FULL, root } from './fixtures.mjs';
import { createOldSelector } from './lib/adapters/old-selector.mjs';
import { machine, measureBoot } from './lib/perf.mjs';

const OUT = join(root, 'remake', 'measure', 'perf-old.json');
const RUN = process.env['H2C_BROWSER_RUN_ID'] ?? `local-${Date.now()}`;

if (FULL) {
  test('old selector: boot performance baseline (bytes, time to first results, 4x CPU throttle)', async ({ browser, page, site, base, meta }, testInfo) => {
    test.setTimeout(10 * 60_000);
    const { perfTarget } = createOldSelector({ page, origin: site.origin, base: `${base}legacy/`, meta, root });
    const plain = await measureBoot(browser, { ...perfTarget, throttle: 1 });
    const slow = await measureBoot(browser, { ...perfTarget, throttle: 4 });
    expect(plain.transferBytes, 'no bytes were counted: the measurement saw nothing').toBeGreaterThan(100_000);
    expect(plain.firstResultsMs.median, 'time to first results was not measured').toBeGreaterThan(0);
    expect(slow.firstResultsMs.median, 'the 4x throttle did not slow the page').toBeGreaterThan(plain.firstResultsMs.median);
    // Each project runs in its own worker: the base paths measured earlier in this run are read back from the file.
    const earlier = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
    const byBasePath = earlier?.runId === RUN ? earlier.byBasePath : {};
    byBasePath[base] = { project: testInfo.project.name, url: perfTarget.url, unthrottled: plain, cpu4x: slow };
    mkdirSync(join(root, 'remake', 'measure'), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify({
      schema: 1, runId: RUN, status: 'measured', measuredAt: new Date().toISOString(), machine: machine(), browser: `chromium ${browser.version()}`,
      what: "the OLD site's boot as a reader meets it: a cold browser context, the selector fetched over HTTP from the test server (gzip level 6, Cache-Control max-age=600, like Pages), bytes counted on the wire (CDP Network.loadingFinished encodedDataLength), time from the start of the navigation until #count has text and #lens has content; each number is the median of the runs listed",
      site: { release: site.release, selectorRawBytes: statSync(join(site.site, 'index.html')).size },
      budgetForTheRemake: {
        rule: 'no worse than this on time to first results (same machine, same throttle), and strict boot transfer at most 900 KB gzip without the chart library (pack 02 section 11; you are asked before it is relaxed)',
        strictBootTransferBytesMax: 900 * 1024, oldBootTransferBytes: plain.transferBytes,
      },
      byBasePath,
    }, null, 2)}\n`);
  });
}
