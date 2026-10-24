// The browser suite (WP-22): Playwright 1.64 over HTTP, Chromium only (owner ruling OQ-15 B), the built site served under TWO base paths,
// /h2c-materials/ (like the live site) and /h2c-material-temp-page/ (like the preview). One project per base path, so every spec runs under
// both. retries is 0 on purpose: a flake must stay visible (pack 07 section 7.3). One worker, because the interface checks are
// load-sensitive and a second browser on the same machine is how the old CDP harness failed (pack 07 section 2).
//
//   npm run test:browser         the fast subset, for CI on every pull request
//   npm run test:browser:full    everything: 114 views, 300 scenarios, axe on every lens and page
//
// When Playwright's own Chromium has not been downloaded, the Chrome installed on this computer is used instead (as tests/e2e does;
// E2E_CHANNEL chooses another channel).
import { existsSync } from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';
import { BASE_PATHS } from './lib/server.mjs';

const bundled = (() => { try { return existsSync(chromium.executablePath()); } catch { return false; } })();
const channel = process.env['E2E_CHANNEL'] ?? (bundled ? undefined : 'chrome');
const FULL = process.env['H2C_BROWSER_MODE'] === 'full';
const NAMES = ['live-path', 'preview-path'];

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  globalSetup: './global-setup.mjs',
  outputDir: '../../.cache/browser-test-results',
  timeout: FULL ? 20 * 60_000 : 8 * 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['./lib/reporter.mjs']],
  use: {
    headless: true, viewport: { width: 1440, height: 900 }, actionTimeout: 15_000, navigationTimeout: 60_000,
    // As the old harness: a machine left idle throttles a background renderer's timers.
    launchOptions: { args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] },
    ...(channel === undefined ? {} : { channel }),
  },
  projects: BASE_PATHS.map((base, i) => ({ name: NAMES[i], metadata: { base }, use: { browserName: 'chromium' } })),
});
