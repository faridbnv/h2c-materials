// Data delivery and the stale-shell guard, in a real browser, under both base paths (WP-25; pack 02 sections 6.2, 6.3 and 9.6).
// The serving side is the suite's Pages-like server (max-age 600, the site's own 404.html for a missing path). Each failure the guard
// is for is made to happen, because a guard that has never seen its failure cannot be trusted when it sees a pass:
//   - a stale index.html whose chunks the server no longer has: reload once, then say a newer version was published
//   - a data part that is gone, or names another release: the same
//   - 404.html at depths 1, 2 and 3: a working link to the site root, with nothing fetched from anywhere else
//   - the details API with a detail shard blocked: it gives nothing
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rolldown } from 'rolldown';
import { test, expect, root } from './fixtures.mjs';

const dataOf = (site, path) => JSON.parse(readFileSync(join(site.site, 'v3', 'data', site.v3Release, path), 'utf8'));
const notice = (page) => page.locator('[data-testid="load-notice"][data-state="stale"]');

/** The page's document requests for one address: how many times the browser asked for the page itself. */
function countDocuments(page, pattern) {
  const seen = [];
  page.on('request', (request) => { if (request.isNavigationRequest() && pattern.test(request.url())) seen.push(request.url()); });
  return seen;
}

test('stale shell: an index whose chunks the server no longer has reloads once and then says so, keeping the address hash', async ({ page, appUrl, watch }) => {
  watch.allow(/assets\/|status of 404/, 'the chunks of the page in this tab are gone, as after a deploy');
  await page.route('**/v3/assets/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' }));
  const documents = countDocuments(page, /\/v3\/(?:#.*)?$/);
  const hash = '#x=2&c=%5B%5D';
  await page.goto(`${appUrl}v3/${hash}`, { waitUntil: 'load' });
  await expect(notice(page)).toBeVisible();
  await expect(notice(page).getByRole('button')).toBeVisible();
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
  expect(documents, 'the page asked for twice: once, and the one reload').toHaveLength(2);
  expect(new URL(page.url()).hash, 'the scenario lives in the hash, which a reload keeps').toBe(hash);
  // It does not go on: a long wait later, still two.
  await page.waitForTimeout(1500);
  expect(documents).toHaveLength(2);
});

test('stale shell: a material page whose chunks are gone does the same', async ({ page, appUrl, watch }) => {
  watch.allow(/assets\/|status of 404/, 'the chunks of the page in this tab are gone');
  await page.route('**/v3/assets/**', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' }));
  const documents = countDocuments(page, /material\.html/);
  await page.goto(`${appUrl}v3/material.html?m=M001`, { waitUntil: 'load' });
  await expect(notice(page)).toBeVisible();
  expect(documents).toHaveLength(2);
});

test('stale shell: a data part that is gone, or is of another release, reloads once; the second time it says so and shows no answer', async ({ page, appUrl, site, watch }) => {
  watch.allow(/core\.json|status of 404/, 'the data part is withheld on purpose');
  const core = dataOf(site, 'core.json');
  for (const [what, fulfil] of [
    ['gone', (route) => route.fulfill({ status: 404, body: 'gone' })],
    ['another release', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...core, release: 'ffffffffffff' }) })],
  ]) {
    await page.route('**/core.json', fulfil);
    const documents = countDocuments(page, /\/v3\/$/);
    await page.goto(`${appUrl}v3/`, { waitUntil: 'load' });
    await expect(notice(page).getByRole('button'), what).toBeVisible();
    await expect(notice(page).locator('h1'), `${what}: the second time it says it, it does not say it is reloading`).toBeVisible();
    await expect(page.locator('[data-testid="result-row"]'), what).toHaveCount(0);
    expect(documents, `${what}: one reload`).toHaveLength(2);
    await page.unroute('**/core.json');
    await page.evaluate(() => sessionStorage.clear());
  }
});

test('stale shell: a page whose data is right neither reloads nor leaves a mark behind', async ({ page, appUrl, newPage }) => {
  const documents = countDocuments(page, /\/v3\/$/);
  expect(await newPage.open(`${appUrl}v3/`)).toBe('ready');
  expect(documents).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.endsWith('h2c-reloaded')))).toEqual([]);
});

test('stale shell: a shell that reloaded and then loaded its data keeps its mark, so a later failed chunk says so instead of reloading in a loop', async ({ page, appUrl, newPage }) => {
  expect(await newPage.open(`${appUrl}v3/`)).toBe('ready');
  const release = await page.locator('meta[name="h2c-release"]').getAttribute('content');
  // The state a stale shell is in after its one reload: the mark names this shell's release, and its data (the core part) still loads.
  await page.evaluate((r) => sessionStorage.setItem('h2c-reloaded', r), release);
  const documents = countDocuments(page, /\/v3\/(?:#.*)?$/);
  expect(await newPage.open(`${appUrl}v3/`)).toBe('ready');
  expect(await page.evaluate(() => sessionStorage.getItem('h2c-reloaded')), 'loading its data does not forget the mark').toBe(release);
  await page.evaluate(() => dispatchEvent(new Event('vite:preloadError', { cancelable: true })));
  await expect(notice(page)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(documents, 'the page asked for itself once: the navigation above, no reload after it').toHaveLength(1);
});

for (const depth of [1, 2, 3]) {
  test(`404.html at depth ${depth}: served with status 404, fetches nothing else, and its link reaches the site root`, async ({ page, appUrl, base, site }) => {
    const path = `${'nested/'.repeat(depth - 1)}nothing.html`;
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));
    const response = await page.goto(`${appUrl}${path}`, { waitUntil: 'load' });
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found');
    const home = page.locator('#home');
    await expect(home).toHaveAttribute('href', base);
    expect(requests.filter((u) => !/favicon\.ico/.test(u)), 'a self-contained page asks for itself and nothing else').toEqual([`${appUrl}${path}`]);
    await home.click();
    await page.waitForURL(`${site.origin}${base}`);
    expect(await page.title()).toMatch(/Filament Atlas/);
    expect((await page.request.get(`${site.origin}${base}`)).status()).toBe(200);
  });
}

test('404.html sends an old release-stamped selector address to the selector, keeping the hash; a missing records page to its Products page', async ({ page, appUrl, base, site }) => {
  const hash = '#x=2';
  await page.goto(`${appUrl}H2C_Material_Selector_2000-01-01_aaaaaaaaaaaa.html${hash}`, { waitUntil: 'load' });
  await page.waitForURL(/#x=2/);
  expect(page.url().split('#')[0]).toBe(`${site.origin}${base}`);
  expect(new URL(page.url()).hash).toBe(hash);
  // M999 is a material nobody has: its records page redirects, and its Products page is then the 404 page again, at the new address.
  await page.goto(`${appUrl}materials/M999-records.html#V000001`, { waitUntil: 'load' });
  await page.waitForURL(/M999-products\.html#V000001$/);
  await expect(page.locator('h1')).toHaveText('Page not found');
});

// ---- the details API, in the browser, against the served shards -----------------------------------------------------------------
let partsBundle;
/** apps/public/src/parts.ts bundled into one script that sets a global, so the real code runs in the page against the real shards. */
async function bundledParts() {
  partsBundle ??= (async () => {
    const bundle = await rolldown({ input: join(root, 'apps/public/src/parts.ts'), cwd: root, logLevel: 'silent' });
    const { output } = await bundle.generate({ format: 'iife', name: 'h2cParts' });
    return output[0].code;
  })();
  return partsBundle;
}

test('details: the cited shards load whole; with one blocked the API gives nothing, and says the page is stale', async ({ page, appUrl, site, watch }) => {
  watch.allow(/detail\/M008\.json|status of 404/, 'one detail shard is withheld on purpose');
  await page.goto(`${appUrl}v3/`, { waitUntil: 'load' });
  await page.addScriptTag({ content: await bundledParts() });
  const release = site.v3Release;
  const load = (ids) => page.evaluate(async ([r, wanted]) => {
    const emitted = [];
    try {
      const details = await window.h2cParts.loadDetails(r, wanted, (url) => fetch(url));
      for (const [id, shard] of details) emitted.push([id, shard.release, shard.records.material.id]);
      return { emitted };
    } catch (error) {
      return { threw: error.name, emitted };
    }
  }, [release, ids]);

  expect(await load(['M001', 'M008'])).toEqual({ emitted: [['M001', release, 'M001'], ['M008', release, 'M008']] });
  await page.route('**/detail/M008.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  expect(await load(['M001', 'M008']), 'one shard blocked: nothing is emitted, not even the one that arrived').toEqual({ threw: 'StaleShellError', emitted: [] });
  await page.unroute('**/detail/M008.json');
  await page.route('**/detail/M001.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ kind: 'detail', release: 'ffffffffffff', materialId: 'M001', records: {} }) }));
  expect(await load(['M001', 'M008']), 'a shard of another release').toEqual({ threw: 'StaleShellError', emitted: [] });
});

test('parts: the core and the estimates load and join in the page, of the release the page names, and a missing part gives no model', async ({ page, appUrl, site, watch }) => {
  watch.allow(/estimates\.json|status of 404/, 'the estimates part is withheld on purpose');
  await page.goto(`${appUrl}v3/`, { waitUntil: 'load' });
  await page.addScriptTag({ content: await bundledParts() });
  const release = site.v3Release;
  const core = dataOf(site, 'core.json');
  const run = (mode) => page.evaluate(async ([r, m]) => {
    try {
      const loaded = await window.h2cParts.loadParts(r, m, (url) => fetch(url));
      return { release: loaded.release, materials: loaded.model.materials.length, estimated: loaded.model.grades.some((g) => g.estimate && Object.keys(g.estimate).length > 0 && 'hi' in Object.values(g.estimate)[0]) };
    } catch (error) {
      return { threw: error.name };
    }
  }, [release, mode]);
  expect(await run('strict')).toEqual({ release, materials: core.model.materials.length, estimated: false });
  expect(await run('exploreEstimates')).toEqual({ release, materials: core.model.materials.length, estimated: true });
  await page.route('**/estimates.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  expect(await run('exploreEstimates')).toEqual({ threw: 'StaleShellError' });
  expect((await run('strict')).materials, 'a mode that does not need the estimates does not wait for them').toBe(core.model.materials.length);
});
