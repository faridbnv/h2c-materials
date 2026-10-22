// Fixtures shared by the specs: where the site is, which base path this project runs under, the adapters, and a page on any of the probe's
// screens. Every page a fixture opens is watched (lib/watch.mjs) and the test fails at teardown if the page did anything wrong,
// whatever the test's own assertions found. Two helpers for specs that run old and new alike: adapterFor and skipUnsupported.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { repoRoot } from '../../remake/tools/wp-lib.mjs';
import { assertAdapter, isUnsupported } from './lib/adapters/contract.mjs';
import { createNewPublic } from './lib/adapters/new-public.mjs';
import { createOldSelector } from './lib/adapters/old-selector.mjs';
import { screenOptions } from './lib/screens.mjs';
import { watchPage } from './lib/watch.mjs';

export { expect };
export const FULL = process.env['H2C_BROWSER_MODE'] === 'full';
export const root = repoRoot();

const siteInfo = () => {
  const raw = process.env['H2C_BROWSER_SITE_INFO'];
  if (!raw) throw new Error('H2C_BROWSER_SITE_INFO is not set: the global setup did not run, so there is no site to test');
  return JSON.parse(raw);
};

let oldMeta;
/** dist/db.json's meta: the release and snapshot the old page was built from. */
const metaOfOldBuild = () => (oldMeta ??= JSON.parse(readFileSync(join(root, 'dist', 'db.json'), 'utf8')).meta);

export const test = base.extend({
  site: async ({}, use) => { await use(siteInfo()); },
  base: async ({}, use, testInfo) => {
    const value = testInfo.project.metadata['base'];
    if (typeof value !== 'string' || !value.startsWith('/') || !value.endsWith('/')) throw new Error(`project ${testInfo.project.name} names no base path`);
    await use(value);
  },
  appUrl: async ({ site, base }, use) => { await use(`${site.origin}${base}`); },
  meta: async ({}, use) => { await use(metaOfOldBuild()); },

  /** The page the test was given, watched: the test fails if the page threw, logged an error, failed a request or got an HTTP error. */
  watch: async ({ page }, use) => {
    const w = watchPage(page);
    await use(w);
    w.assertClean();
  },

  /** The old page's adapter on the default page. */
  oldPage: async ({ page, watch, site, base, meta }, use) => {
    void watch;
    await use(assertAdapter(adapterFor('old', { page, origin: site.origin, base, meta })));
  },
  /** The new page's adapter on the default page. */
  newPage: async ({ page, watch, site, base, meta }, use) => {
    void watch;
    await use(assertAdapter(adapterFor('new', { page, origin: site.origin, base, meta })));
  },

  /** A function giving a watched page, in its own context, on one of the probe's screens; all are closed (and checked) at teardown. */
  onScreen: async ({ browser }, use) => {
    const opened = [];
    await use(async (screen) => {
      const context = await browser.newContext(screenOptions(screen));
      const page = await context.newPage();
      const w = watchPage(page, { label: screen.name });
      opened.push({ context, w });
      return { page, watch: w };
    });
    const failures = [];
    for (const { context, w } of opened) {
      try { w.assertClean(); } catch (e) { failures.push(e.message); }
      await context.close();
    }
    if (failures.length) throw new Error(failures.join('\n'));
  },

  /** A scratch folder, removed after the test. */
  scratch: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'h2c-browser-'));
    await use(dir);
    rmSync(dir, { recursive: true, force: true });
  },
});

/** The adapter of one kind of page, 'old' or 'new', on a page. Only the old adapter's behaviours use `watch` and `scratch`. */
export function adapterFor(kind, { page, origin, base, meta, watch = null, scratch = null }) {
  return kind === 'old'
    ? createOldSelector({ page, origin, base: `${base}legacy/`, meta, root, watch, scratch })
    : createNewPublic({ page, origin, base, meta, root, watch, scratch });
}

/** Skips the running test, naming why, when the page cannot answer the step yet. True when it skipped, so the caller returns. */
export function skipUnsupported(step) {
  if (!isUnsupported(step)) return false;
  test.skip(true, `not run: ${step.unsupported}`);
  return true;
}
