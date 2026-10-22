// The public view of the remake (apps/public at /v3/), through the NEW page adapter and its data-testid hooks (WP-22). Each check reads what
// the engine decided, from the release's own data file, and compares it with what the page shows; and each load failure the page can
// have is made to happen, because a check that has never seen the page fail cannot be trusted when it sees it pass.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, FULL } from './fixtures.mjs';

const dataOf = (site, path) => JSON.parse(readFileSync(join(site.site, 'data', site.v3Release, path), 'utf8'));

test('public view: the selector names its release and shows exactly the materials and verdicts the engine decided', async ({ newPage, page, site }) => {
  const result = dataOf(site, 'result.json');
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  expect(await page.locator('meta[name="h2c-release"]').getAttribute('content')).toBe(site.v3Release);
  expect(await page.locator('[data-testid="release-strip"]').getAttribute('data-release')).toBe(site.v3Release);
  // No requirement yet: every candidate is a row, none has a verdict.
  const ids = async () => (await page.locator('[data-testid="result-row"]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-material')))).sort();
  expect(await ids()).toEqual(result.materials.map((m) => m.materialId).sort());
  // The first template is the first slice's: its verdicts are the engine's, in Strict (the passing) and the counts in the chips.
  await page.locator('[data-template="0"]').click();
  await page.locator('[data-testid="status-PASS"]').waitFor({ state: 'visible' });
  const chip = async (verdict) => Number(/(\d+)/.exec(await page.locator(`[data-testid="status-${verdict}"]`).innerText())?.[1] ?? NaN);
  expect([await chip('PASS'), await chip('UNKNOWN'), await chip('FAIL')]).toEqual([result.counts.pass, result.counts.unknown, result.counts.fail]);
  expect(await ids()).toEqual(result.materials.filter((m) => m.verdict === 'PASS').map((m) => m.materialId).sort());
  expect(await page.locator('[data-testid="count"]').innerText()).toContain(`${result.counts.pass} shown`);
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
  // The drawer's link on the selector reaches the material's page, which the first slice builds at material.html.
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  const linked = sample[0];
  await page.locator(`[data-testid="result-row"][data-material="${linked.materialId}"] td`).first().click();
  await page.locator('[data-testid="page-link"]').waitFor({ state: 'visible' });
  expect(await page.locator('[data-testid="page-link"]').getAttribute('href')).toMatch(new RegExp(`materials/${linked.materialId}\\.html$`));
});

test('public view: a core part that cannot be fetched is said, never shown as an empty or partial answer', async ({ newPage, page, watch }) => {
  watch.allow(/core\.json|status of 404/, 'the data part is withheld on purpose');
  await page.route('**/core.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  expect(await newPage.open(newPage.viewUrl)).toBe('stale');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="count"]')).toHaveCount(0);
});

test('public view: a core part of another release is refused, never shown', async ({ newPage, page, site }) => {
  const core = dataOf(site, 'core.json');
  await page.route('**/core.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...core, release: 'ffffffffffff' }) }));
  expect(await newPage.open(newPage.viewUrl)).toBe('stale');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
});

test('public view: a core part that is not JSON, or lacks what the engine needs, is said as a failure', async ({ newPage, page, site }) => {
  const core = dataOf(site, 'core.json');
  await page.route('**/core.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '<html>not json' }));
  expect(await newPage.open(newPage.viewUrl)).toBe('failed');
  await page.unroute('**/core.json');
  const { grades: _grades, ...without } = core.model;
  await page.route('**/core.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...core, model: without }) }));
  expect(await newPage.open(newPage.viewUrl)).toBe('failed');
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
});

test('public view: the estimates part is fetched only when Explore with the estimates switch is asked, and a part that cannot be had is said', async ({ newPage, page, watch }) => {
  const asked = [];
  page.on('request', (r) => { if (/estimates\.json/.test(r.url())) asked.push(r.url()); });
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  await page.locator('[data-template="0"]').click();
  expect(asked, 'the estimates part was fetched in Strict').toEqual([]);
  watch.allow(/estimates\.json|status of 404/, 'the estimates part is withheld on purpose');
  await page.route('**/estimates.json', (route) => route.fulfill({ status: 404, body: 'gone' }));
  await page.locator('[data-testid="mode-explore"]').click();
  await expect(page.locator('[data-testid="load-notice"]')).toHaveAttribute('data-state', 'stale');
  expect(asked.length, 'Explore with estimates on fetched the estimates part once').toBe(1);
  await expect(page.locator('[data-testid="result-row"]')).toHaveCount(0);
});

test('public view: an address that names no material says so', async ({ newPage, page }) => {
  expect(await newPage.open(`${newPage.viewUrl}material.html?m=not-a-material`)).toBe('no-material');
  await expect(page.locator('[data-testid="material-name"]')).toHaveCount(0);
});

test('public view: its release is the one the build wrote, and the old site at legacy/ is the old release', async ({ request, appUrl, site }) => {
  const view = await (await request.get(`${appUrl}release.json`)).json();
  const old = await (await request.get(`${appUrl}legacy/manifest.json`)).json();
  expect(view.release).toBe(site.v3Release);
  expect(old.release).toBe(site.release);
  expect(old.release).toMatch(/^[0-9a-f]{12}$/);
  expect(view.counts.total).toBeGreaterThan(0);
});

test('selector: Save / share writes a scenario file that opens again to the same answer, and a copied link reopens it too', async ({ newPage, page, site }) => {
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: site.origin });
  await page.locator('[data-template="0"]').click();
  await page.locator('[data-testid="mode-explore"]').click();
  await expect(page.locator('[data-testid="lens"]')).toHaveAttribute('data-state', 'ready');
  const shown = async () => [await page.locator('[data-testid="count"]').innerText(), await page.locator('[data-testid="status-PASS"]').innerText(), await page.locator('[data-testid="status-UNKNOWN"]').innerText()].join(' | ');
  await expect(page.locator('[data-testid="count"]')).toContainText('shown');
  const before = await shown();

  // The file: a download, a version 2 scenario naming the template's requirements and the mode.
  await page.locator('[data-testid="save-share"]').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid="save-file"]').click()]);
  const path = await download.path();
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  expect(saved.version).toBe(2);
  expect(saved.unknownPolicy).toBe('exploration');
  expect(saved.constraints.length).toBeGreaterThan(3);

  // A fresh page, the file loaded: the same answer, and the panel closed.
  expect(await newPage.open(newPage.viewUrl)).toBe('ready');
  expect(await page.locator('[data-testid="count"]').innerText()).toContain('no requirements set');
  await page.locator('[data-testid="save-share"]').click();
  await page.locator('[data-testid="file-input"]').setInputFiles(path);
  await expect(page.locator('[data-testid="save-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="count"]')).toContainText('shown');
  expect(await shown()).toBe(before);

  // The link: copied, and opened in a fresh page it shows the same.
  await page.locator('[data-testid="save-share"]').click();
  await page.locator('[data-testid="copy-link"]').click();
  await expect(page.locator('[data-testid="copy-link"]')).toContainText('Copied');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#');
  await page.goto('about:blank');
  await page.goto(link);
  await page.locator('[data-testid="lens"][data-state="ready"]').waitFor();
  await expect(page.locator('[data-testid="count"]')).toContainText('shown');
  expect(await shown()).toBe(before);
});
