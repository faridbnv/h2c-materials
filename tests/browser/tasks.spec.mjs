// The representative user tasks of the new site (WP-30; GPT M3): the tasks an engineer does, done in a real browser against the site under both base paths.
//   choose a material for each template, open its drawer, compare two materials, share a link and reopen it, open an old release's link (it warns),
//   refresh every material page directly (the pages beside the selector, and the view's own page for a material).
// And the timings of the first results, with the CPU as it is and slowed four times: measured and written to remake/measure/perf-new.json, reported and not gated.
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, FULL, root } from './fixtures.mjs';
import { machine, measureBoot } from './lib/perf.mjs';
import { scenarioTools } from './lib/scenarios.mjs';

const TEMPLATES = 6;
const RESULTS = '[data-testid="result-row"]';
const READY = `document.querySelector('[data-testid="lens"]')?.dataset.state === 'ready' && !!document.querySelector('[data-testid="count"]')?.textContent.trim()`;

test.describe('tasks on the new site', () => {
  for (let i = 0; i < TEMPLATES; i++) {
    if (!FULL && i > 1) continue;
    test(`choose a material for template ${i + 1}: its results, a material's drawer, a product chosen for the team`, async ({ newPage, page, appUrl }) => {
      expect(await newPage.open(appUrl)).toBe('ready');
      await page.locator(`[data-template="${i}"]`).click();
      await expect(page.locator('[data-testid="count"]')).toContainText('shown');
      const rows = page.locator(RESULTS);
      await expect(rows.first(), 'the template shows at least one material').toBeVisible();
      // The best-ranked row opens its drawer, which names the material the row names.
      const name = (await rows.first().locator('td').first().innerText()).split('\n')[0]?.trim() ?? '';
      await rows.first().locator('td').first().click();
      const drawer = page.locator('[data-testid="drawer"]');
      await expect(drawer).toBeVisible();
      await expect(drawer.locator('.drawer-head h2').first()).toContainText(name.slice(0, 12));
      // Its products, and one chosen: the shortlist tray and the Save / share panel then hold it.
      await drawer.locator('[data-tab="Grades"]').click();
      const choose = drawer.locator('[data-choose]').first();
      if (await choose.count()) {
        await choose.click();
        await expect(page.locator('[data-testid="chosen"]')).toContainText('Chosen products: 1');
      }
      await page.keyboard.press('Escape');
      await expect(drawer).toHaveCount(0);
    });
  }

  test('compare two materials: shortlist two from the results and read them side by side', async ({ newPage, page, appUrl }) => {
    expect(await newPage.open(appUrl)).toBe('ready');
    await page.locator('[data-template="0"]').click();
    const pins = page.locator(`${RESULTS} [data-pin]`);
    await expect(pins.first()).toBeVisible();
    const ids = await pins.evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute('data-pin')));
    await pins.nth(0).click();
    await pins.nth(1).click();
    await expect(page.locator('[data-testid="tray-label"]')).toContainText('Shortlist 2 of 6');
    await page.locator('[data-testid="lens-compare"]').click();
    await expect(page.locator('#lens .cmp-prop').first()).toBeVisible({ timeout: 20_000 });
    const text = await page.locator('#lens').innerText();
    for (const id of ids) {
      const name = await page.locator(`[data-testid="pin"]`).evaluateAll((els, k) => els[k]?.textContent?.replace('✕', '').trim() ?? '', ids.indexOf(id));
      expect(text, `${id}'s name is in the comparison`).toContain(name.slice(0, 10));
    }
  });

  test('share a link and reopen it: a copied link opens in a fresh page to the same question and the same answer', async ({ newPage, page, appUrl, site }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: site.origin });
    expect(await newPage.open(appUrl)).toBe('ready');
    await page.locator('[data-template="1"]').click();
    await page.locator('[data-testid="mode-explore"]').click();
    await expect(page.locator('[data-testid="count"]')).toContainText('shown');
    const shown = async () => [await page.locator('[data-testid="count"]').innerText(), await page.locator('[data-testid="status-PASS"]').innerText(), await page.locator('[data-testid="status-UNKNOWN"]').innerText()].join(' | ');
    const before = await shown();
    await page.locator('[data-testid="save-share"]').click();
    await page.locator('[data-testid="copy-link"]').click();
    await expect(page.locator('[data-testid="copy-link"]')).toContainText('Copied');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain('#');
    const fresh = await page.context().newPage();
    await fresh.goto(link);
    await fresh.waitForFunction(READY);
    await expect(fresh.locator('[data-testid="count"]')).toContainText('shown');
    expect([await fresh.locator('[data-testid="count"]').innerText(), await fresh.locator('[data-testid="status-PASS"]').innerText(), await fresh.locator('[data-testid="status-UNKNOWN"]').innerText()].join(' | ')).toBe(before);
    await fresh.close();
  });

  test('open an old release\'s link: it opens, and it says it was saved on another release', async ({ newPage, page, appUrl }) => {
    const { toHash, newScenario, meta, templates } = await scenarioTools(root);
    const saved = { ...newScenario(meta), release: 'ffffffffffff', constraints: templates[0].constraints.map((c) => ({ ...c })), template: templates[0].name };
    expect(await newPage.open(`${appUrl}#${toHash(saved)}`)).toBe('ready');
    const notice = page.locator('[data-testid="notice-text"]').first();
    await expect(notice).toContainText('saved on release ffffffffffff');
    await expect(page.locator(RESULTS).first(), 'the question is asked again of this release, and answered').toBeVisible();
  });

  test('refresh every material page directly: each opens on its own address and again after a reload', async ({ request, appUrl, site, page, watch }) => {
    test.setTimeout((FULL ? 20 : 6) * 60_000);
    void watch;
    const index = await (await request.get(`${appUrl}materials/index.html`)).text();
    const ids = [...new Set([...index.matchAll(/href="(M\d+)\.html"/g)].map((m) => m[1]))];
    expect(ids.length).toBeGreaterThan(50);
    const sample = FULL ? ids : ids.filter((_, i) => i % 8 === 0);
    for (const id of sample) {
      for (const file of [`materials/${id}.html`, `materials/${id}-products.html`]) {
        const response = await page.goto(`${appUrl}${file}`, { waitUntil: 'load' });
        expect(response?.status(), file).toBe(200);
        await expect(page.locator('main[data-page]'), file).toBeVisible();
        const title = await page.title();
        await page.reload({ waitUntil: 'load' });
        await expect(page.locator('main[data-page]'), `${file} after a reload`).toBeVisible();
        expect(await page.title(), `${file} after a reload`).toBe(title);
      }
    }
    // The view's own page for a material (material.html?m=), refreshed too.
    const result = await (await request.get(`${appUrl}data/${site.v3Release}/result.json`)).json();
    const own = FULL ? result.materials : result.materials.filter((_, i) => i % 20 === 0);
    for (const m of own) {
      await page.goto(`${appUrl}material.html?m=${m.materialId}`, { waitUntil: 'load' });
      await expect(page.locator('[data-testid="material-name"]'), m.materialId).toBeVisible();
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('[data-testid="material-name"]'), `${m.materialId} after a reload`).toBeVisible();
    }
  });

  test('timings: first results with the CPU as it is and slowed four times, measured on the new root and written down (reported, not gated)', async ({ browser, appUrl, site, base }, testInfo) => {
    test.setTimeout(10 * 60_000);
    const target = { url: appUrl, ready: READY };
    const plain = await measureBoot(browser, { ...target, throttle: 1, runs: FULL ? 5 : 3 });
    const slow = await measureBoot(browser, { ...target, throttle: 4, runs: FULL ? 5 : 3 });
    expect(plain.firstResultsMs.median, 'the first results were not measured').toBeGreaterThan(0);
    expect(slow.firstResultsMs.median, 'the 4x throttle did not slow the page').toBeGreaterThan(plain.firstResultsMs.median);
    testInfo.annotations.push({ type: 'first-results', description: `${plain.firstResultsMs.median} ms, ${slow.firstResultsMs.median} ms at 4x CPU, ${plain.transferBytes} bytes` });
    if (FULL) {
      const out = join(root, 'remake', 'measure', 'perf-new.json');
      mkdirSync(join(root, 'remake', 'measure'), { recursive: true });
      let earlier = {};
      try { earlier = JSON.parse((await import('node:fs')).readFileSync(out, 'utf8')); } catch { /* the first project writes it */ }
      const byBasePath = earlier.runId === (process.env['H2C_BROWSER_RUN_ID'] ?? 'local') ? earlier.byBasePath : {};
      byBasePath[base] = { project: testInfo.project.name, url: target.url, unthrottled: plain, cpu4x: slow };
      writeFileSync(out, `${JSON.stringify({
        schema: 1, runId: process.env['H2C_BROWSER_RUN_ID'] ?? 'local', status: 'measured', measuredAt: new Date().toISOString(), machine: machine(), browser: `chromium ${browser.version()}`,
        what: "the NEW site's boot as a reader meets it: a cold browser context, the selector fetched over HTTP from the test server (gzip level 6, Cache-Control max-age=600, like Pages), bytes counted on the wire, time from the start of the navigation until the count has text and the lens is ready; each number is the median of the runs listed",
        site: { release: site.v3Release, pageRawBytes: statSync(join(site.site, 'index.html')).size },
        targets: { firstResultsMs: 1500, firstResultsMsAt4xCpu: 3500, note: 'pack 02 section 11; reported here, not gated: the reference machine is the owner\'s, and shared runners are a trend' },
        byBasePath,
      }, null, 2)}\n`);
    }
  });
});
