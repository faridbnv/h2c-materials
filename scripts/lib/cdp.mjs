// Headless Chrome, shared by the interface probe (scripts/ui-probe.mjs) and the fuzz (scripts/ui-fuzz.mjs): where Chrome
// is, how it is launched, and the debugging port it opens. Each script drives it over CDP in its own way, one page for
// the probe and many targets for the fuzz.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const CHROMES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

/** The Chrome to drive, or null. CHROME=/path overrides the usual install paths. */
export const findChrome = () => CHROMES.filter(Boolean).find((p) => existsSync(p)) ?? null;

/**
 * Report that there is no Chrome and leave: a check that cannot run is not a check that passed, so it exits 1 with
 * --require (CI), and 0 otherwise, where a contributor may simply not have Chrome.
 */
export function skipWithoutChrome(what) {
  console.log(`${what} skipped: no Chrome found (set CHROME=/path)`);
  process.exit(process.argv.includes('--require') ? 1 : 0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Launch headless Chrome with its own profile and return the process and the debugging port it wrote. */
export async function launchChrome(chrome, profile, extraArgs = []) {
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1400,1000', ...extraArgs, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    const f = `${profile}/DevToolsActivePort`;
    if (existsSync(f)) {
      const port = readFileSync(f, 'utf8').split('\n')[0];
      if (port) return { proc, port };
    }
    await sleep(100);
  }
  proc.kill();
  throw new Error('Chrome did not open a debugging port');
}
