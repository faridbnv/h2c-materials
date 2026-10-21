// The end-to-end entry point (WP-13; WP-22 adds the site suites): Playwright 1.64 with Chromium only (owner ruling OQ-15 B).
// `npm run test:e2e -- editor` runs the editor's journey. When Playwright's own Chromium has not been downloaded, the Chrome installed
// on this computer is used instead (set E2E_CHANNEL to choose, for example E2E_CHANNEL=chrome).
import { existsSync } from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';

const bundled = (() => { try { return existsSync(chromium.executablePath()); } catch { return false; } })();
const channel = process.env.E2E_CHANNEL ?? (bundled ? undefined : 'chrome');

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  globalSetup: './global-setup.mjs',
  timeout: 120_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { headless: true, viewport: { width: 1440, height: 900 }, ...(channel === undefined ? {} : { channel }) },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
