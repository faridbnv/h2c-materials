// The public view of the remake (apps/public at /v3/), through the NEW page adapter and its data-testid hooks (WP-22). Each check reads what
// the engine decided, from the release's own data file, and compares it with what the page shows; and each load failure the page can
// have is made to happen, because a check that has never seen the page fail cannot be trusted when it sees it pass.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, FULL } from './fixtures.mjs';

const dataOf = (site, path) => JSON.parse(readFileSync(join(site.site, 'v3', 'data', site.v3Release, path), 'utf8'));

test('public view: the results page names its release and shows exactly the counts and rows the engine decided', async ({ newPage, site }) => {
  const result = dataOf(site, 'result.json');
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  const shown = await newPage.readResults();
  expect(shown.release).toBe(site.v3Release);
  expect(shown.metaRelease).toBe(site.v3Release);
  expect(shown.counts).toEqual({ pass: result.counts.pass, unknown: result.counts.unknown, fail: result.counts.fail });
  expect(shown.rows.length).toBe(result.counts.total);
  expect(shown.rows.map((r) => [r.id, r.verdict, r.group]).sort()).toEqual(result.materials.map((m) => [m.materialId, m.verdict, m.group]).sort());
  expect(shown.rows.every((r) => r.name.length > 0 && /^material\.html\?m=M\d+$/.test(r.href ?? ''))).toBe(true);
  expect(shown.groups.reduce((n, g) => n + g.rows, 0), 'rows in the group tables').toBe(result.counts.total);
  expect(shown.requirements.length, 'requirements listed').toBe(result.requirements.length);
  expect(shown.headline).toContain(String(result.counts.pass));
});

test('public view: the material pages open from the results, refresh on their own address, and agree with the engine', async ({ newPage, page, site }) => {
  const result = dataOf(site, 'result.json');
  const sample = FULL ? result.materials : result.materials.filter((_, i) => i % 9 === 0);
  expect(sample.length).toBeGreaterThan(0);
  for (const m of sample) {
    expect(await newPage.open(newPage.materialUrl(m.materialId)), `${m.materialId} said something other than its content`).toBe('ready');
    const first = await newPage.readMaterial();
    expect(first).toMatchObject({ id: m.materialId, verdict: m.verdict, release: site.v3Release });
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-testid="material-name"]').waitFor({ state: 'visible' });
    expect(await newPage.readMaterial(), `${m.materialId} changed on refresh`).toEqual(first);
  }
  // The link on the results page reaches the same page.
  await newPage.open(newPage.viewUrl);
  const linked = sample[0];
  await Promise.all([page.waitForURL(/material\.html\?m=M\d+$/), page.locator(`[data-testid="result-row"][data-material="${linked.materialId}"] a`).click()]);
  await page.locator('[data-testid="material-name"]').waitFor({ state: 'visible' });
  expect((await newPage.readMaterial()).id).toBe(linked.materialId);
});

test('public view: a results file that cannot be fetched is said, never shown as an empty or partial answer', async ({ newPage, page, watch }) => {
  watch.allow(/result\.json|status of 404/, 'the data part is withheld on purpose');
  await page.route('**/result.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  expect(await newPage.open(newPage.viewUrl)).toBe('stale');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="headline"]')).toHaveCount(0);
});

test('public view: a results file of another release is refused, never shown', async ({ newPage, page, site }) => {
  const result = dataOf(site, 'result.json');
  await page.route('**/result.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...result, release: 'ffffffffffff' }) }));
  expect(await newPage.open(newPage.viewUrl)).toBe('stale');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
});

test('public view: a results file that is not JSON, or does not add up, is said as a failure', async ({ newPage, page, site }) => {
  const result = dataOf(site, 'result.json');
  await page.route('**/result.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '<html>not json' }));
  expect(await newPage.open(newPage.viewUrl)).toBe('failed');
  await page.unroute('**/result.json');
  await page.route('**/result.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...result, counts: { ...result.counts, pass: result.counts.pass + 1 } }) }));
  expect(await newPage.open(newPage.viewUrl)).toBe('failed');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
});

test('public view: an address that names no material says so', async ({ newPage, page }) => {
  expect(await newPage.open(`${newPage.viewUrl}material.html?m=not-a-material`)).toBe('no-material');
  await expect(page.locator('[data-testid="material-name"]')).toHaveCount(0);
});

test('public view: its release is the one the build wrote, and the old site beside it is the old release', async ({ request, appUrl, site }) => {
  const view = await (await request.get(`${appUrl}v3/release.json`)).json();
  const old = await (await request.get(`${appUrl}manifest.json`)).json();
  expect(view.release).toBe(site.v3Release);
  expect(old.release).toBe(site.release);
  expect(old.release).toMatch(/^[0-9a-f]{12}$/);
  expect(view.counts.total).toBeGreaterThan(0);
});
