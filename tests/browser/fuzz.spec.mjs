// The ui-fuzz, ported (WP-22): seeded random scenarios, the page read through a fuzz tab of its adapter and compared with the engine
// (invariants I1 to I10 of scripts/ui-fuzz.mjs). 300 scenarios in the full run, a seeded slice in the fast one. The run fails on any
// violation, on a scenario that was not read, and on an invariant family that never ran a check (a family with no checks has checked
// nothing). FZ_MUTATE=rows|value|pair is the harness self-test of the old script: the oracle is deliberately wrong and the run must fail.
import { mkdirSync, readFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, FULL, root, adapterFor, skipUnsupported } from './fixtures.mjs';
import { createFuzz } from './lib/fuzz.mjs';

const SEED = Number(process.env['H2C_FUZZ_SEED'] ?? 1);
const N = Number(process.env['H2C_FUZZ_N'] ?? (FULL ? 300 : 24));
const TABS = Number(process.env['H2C_FUZZ_TABS'] ?? 8);
// A small slice would leave the link round trip (I7) to chance; its share is raised so the slice always reopens some links.
const ROUNDTRIP = FULL ? 0.05 : 0.25;
const FAMILIES = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8', 'I9', 'I10'];
const FUZZ_OUT = process.env['H2C_BROWSER_FUZZ_OUT'] ?? null;

for (const kind of ['old', 'new']) {
  test(`${kind} selector: ${N} scenarios read against the engine (seed ${SEED})`, async ({ browser, site, base, meta, scratch }, testInfo) => {
    test.setTimeout((FULL ? 30 : 10) * 60_000);
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    try {
      const first = await context.newPage();
      const adapter = adapterFor(kind, { page: first, origin: site.origin, base, meta });
      if (skipUnsupported(adapter.fuzzTab)) return;
      const out = join(scratch, 'fuzz');
      const fuzz = await createFuzz({ root, pageUrl: adapter.pageUrl, html: site.stamped, n: N, seed: SEED, tabs: TABS, roundtripShare: ROUNDTRIP, out });
      const tabs = [adapter.fuzzTab(first, 0, scratch)];
      for (let k = 1; k < TABS; k++) tabs.push(adapter.fuzzTab(await context.newPage(), k, scratch));
      const results = await fuzz.run(tabs);

      if (FUZZ_OUT) {
        const dir = join(FUZZ_OUT, testInfo.project.name);
        mkdirSync(dir, { recursive: true });
        copyFileSync(join(out, 'results.json'), join(dir, 'results.json'));
        if (existsSync(fuzz.vfile)) copyFileSync(fuzz.vfile, join(dir, 'violations.jsonl'));
      }
      testInfo.annotations.push({ type: 'scenarios-read', description: String(results.scenariosRun) });
      const checks = (family) => Object.entries(results.invariants).filter(([name]) => name === family || name.startsWith(`${family}-`)).reduce((n, [, v]) => n + v.checks, 0);
      const violated = Object.entries(results.invariants).filter(([, v]) => v.violations > 0).map(([name, v]) => `${name}: ${v.violations} of ${v.checks}`);
      const examples = existsSync(fuzz.vfile) ? readFileSync(fuzz.vfile, 'utf8').split('\n').filter(Boolean).slice(0, 5).map((l) => { const x = JSON.parse(l); return `${x.invariant} scenario ${x.scenario} ${x.signature}`; }) : [];

      expect(results.scenariosRun, 'every scenario of this run must have been read').toBe(fuzz.expected());
      expect(fuzz.expected(), 'scenarios in this run').toBe(N);
      // A scenario delivered by a page load because the in-app import failed is a scenario whose import was not checked. The old script has
      // the same fallback for a quirk (Chrome drops the detached file input before it answers, a few percent of the time); a broken
      // import would fall back every time, so it is the share that is held: most scenarios must have gone in through the app.
      if (N >= 10) {
        const tried = results.inAppImports + results.importFallbacks;
        expect(results.inAppImports, 'no scenario was imported in the app').toBeGreaterThan(0);
        expect(results.importFallbacks / tried, `in-app imports fell back to a page load ${results.importFallbacks} of ${tried} times (first: ${results.firstImportError})`).toBeLessThanOrEqual(0.25);
      }
      expect(violated, `violations (examples in ${fuzz.vfile}):\n  ${examples.join('\n  ')}`).toEqual([]);
      const never = FAMILIES.filter((family) => checks(family) === 0);
      expect(never, `invariant families that ran no check: ${never.join(', ')}`).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
