#!/usr/bin/env node
// Assembles the site the browser suite serves (tests/browser/lib/site.mjs): today's site as pages.yml makes it, the 404 page, and the
// public view built into v3/. Needs the old build's dist/ (npm run build). Used by the size report, which measures what a deploy publishes.
//   node remake/tools/assemble-test-site.mjs [OUT_DIR]      default .cache/browser-site
import { isMain } from './wp-lib.mjs';

if (isMain(import.meta.url)) {
  try {
    const { assembleSite, SITE_DIR } = await import('../../tests/browser/lib/site.mjs');
    const out = process.argv[2] ?? SITE_DIR;
    const site = assembleSite({ out });
    console.log(`assembled ${site.site}: release ${site.release}, public view ${site.v3Release}`);
  } catch (e) {
    console.error(`assemble-test-site failed: ${e.message}`);
    process.exitCode = 1;
  }
}
