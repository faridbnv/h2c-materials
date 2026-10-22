// The lenses of part 2 (WP-27), in the NEW selector against the OLD one on the same data:
//   - the chart's traces: what the page hands the chart library, for every template, mode and Ashby view, equal to the old page's, and Plotly absent from
//     the first load (the basic bundle is fetched when a chart is first opened)
//   - the exports and the decision brief on the twelve scripted scenarios: the file the new page writes equals the one the old page writes
//   - with the detail parts blocked, the brief and the exports write nothing, and say so
import { readFileSync } from 'node:fs';
import { test, expect, FULL, root } from './fixtures.mjs';
import { createNewSelector } from './lib/adapters/new-selector.mjs';
import { createOldSelector } from './lib/adapters/old-selector.mjs';
import { twelveScenarios } from './lib/scenarios.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The old page's address is in legacy/; the new page's (with the old page's data) in olddb/.
const pair = ({ page, newPage, site, base, meta, scratch }) => ({
  old: createOldSelector({ page, origin: site.origin, base: `${base}legacy/`, meta, root, scratch }),
  next: createNewSelector({ page: newPage, origin: site.origin, base, meta, root, scratch }),
});

const SCENARIOS = FULL ? null : [0, 3];   // the fast subset reads two of the twelve
const pick = (all) => (SCENARIOS ? SCENARIOS.map((i) => all[i]) : all);

/** What the page handed the chart library, as the page now holds it: the traces (without the library's own ids) and the layout. */
const READ_PLOT = `(() => {
  const gd = document.getElementById('plot');
  if (!gd || !gd.data) return null;
  const clean = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'uid' || k === '_' || typeof v === 'function' ? undefined : v)));
  return { data: clean(gd.data), layout: clean(gd.layout) };
})()`;

test('chart traces: every Ashby view of every scripted scenario hands the chart library what the old page hands it', async ({ browser, site, base, meta, scratch }) => {
  test.setTimeout((FULL ? 25 : 6) * 60_000);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const [pageOld, pageNew] = [await context.newPage(), await context.newPage()];
  const { old, next } = pair({ page: pageOld, newPage: pageNew, site, base, meta, scratch });
  const differences = [];
  let compared = 0;
  try {
    for (const s of pick(await twelveScenarios(root))) {
      for (const view of FULL ? ['decision', 'overview', 'catalogue'] : ['decision']) {
        // The link carries the lens and the view; both pages open it and draw the same question.
        const link = JSON.parse(decodeURIComponent(s.plainHash));
        link.l = 'ashby'; link.p = { ...link.p, view, x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true, showEstimates: s.mode === 'exploration' };
        const hash = encodeURIComponent(JSON.stringify(link));
        await old.open(`${old.pageUrl}#${hash}`);
        await old.until(`!!document.querySelector('#plot .main-svg')`, 'the old chart');
        await sleep(500);
        const a = await old.evaluate(READ_PLOT);
        await next.open(`${next.pageUrl}#${hash}`);
        await next.settle();
        await next.until(`!!document.querySelector('#plot .main-svg')`, 'the new chart');
        await sleep(500);
        await next.settle();
        const b = await next.evaluate(READ_PLOT);
        compared++;
        if (!a || !b) { differences.push(`${s.name} / ${view}: no chart on ${!a ? 'the old' : 'the new'} page`); continue; }
        const same = JSON.stringify(a.data) === JSON.stringify(b.data);
        if (!same) {
          const at = a.data.findIndex((t, i) => JSON.stringify(t) !== JSON.stringify(b.data[i]));
          differences.push(`${s.name} / ${view}: the traces differ (${a.data.length} against ${b.data.length}; first at ${at}: ${JSON.stringify(a.data[at])?.slice(0, 200)} against ${JSON.stringify(b.data[at])?.slice(0, 200)})`);
        }
        const keys = ['xaxis', 'yaxis', 'shapes', 'annotations', 'showlegend', 'legend'];
        for (const k of keys) if (JSON.stringify(a.layout[k]) !== JSON.stringify(b.layout[k])) differences.push(`${s.name} / ${view}: layout.${k} differs (${JSON.stringify(a.layout[k])?.slice(0, 160)} against ${JSON.stringify(b.layout[k])?.slice(0, 160)})`);
      }
    }
  } finally {
    await context.close();
  }
  expect(compared).toBeGreaterThan(0);
  expect(differences, `${differences.length} difference(s):\n  ${differences.join('\n  ')}`).toEqual([]);
  test.info().annotations.push({ type: 'traces-compared', description: String(compared) });
});

test('chart library: absent from the first load of the page, fetched when a chart is first opened, and the table still works while it loads', async ({ page, appUrl, newPage, watch }) => {
  void watch;
  const asked = [];
  page.on('request', (r) => { if (/plotly/i.test(r.url())) asked.push(r.url()); });
  expect(await newPage.open(appUrl)).toBe('ready');
  await page.locator('[data-template="0"]').click();
  await expect(page.locator('[data-testid="status-PASS"]')).toBeVisible();
  expect(asked, 'the chart library was fetched before any chart was opened').toEqual([]);
  // Slow the library down: the table answers meanwhile and the chart says it is loading.
  await page.route(/plotly/i, async (route) => { await sleep(700); await route.continue(); });
  await page.locator('[data-testid="lens-ashby"]').click();
  await expect(page.locator('[data-testid="chart-loading"]')).toBeVisible();
  await page.locator('[data-testid="lens-table"]').click();
  await expect(page.locator('[data-testid="result-row"]').first()).toBeVisible();
  await page.locator('[data-testid="lens-ashby"]').click();
  await page.locator('#plot .main-svg').first().waitFor({ timeout: 20_000 });
  expect(asked.length, 'the chart library was fetched once, for the chart').toBeGreaterThan(0);
});

const READ_FILE = (download) => download.path().then((p) => readFileSync(p, 'utf8'));
/**
 * The file a download is, with what differs by design made equal: the old pages are served from legacy/, and the new page's release is the identity of release v2
 * (the digest of its own inputs) where the old page's is the old build's. Nothing else is touched.
 */
const normal = (text, ids) => ids.reduce((s, id) => s.replaceAll(id, '<release>'), text.replaceAll('/legacy/', '/').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://origin'));

test('exports and decision brief: the files the new page writes equal the old page\'s on the scripted scenarios', async ({ browser, site, base, meta, scratch }) => {
  test.setTimeout((FULL ? 30 : 8) * 60_000);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const [pageOld, pageNew] = [await context.newPage(), await context.newPage()];
  const { old, next } = pair({ page: pageOld, newPage: pageNew, site, base, meta, scratch });
  const differences = [];
  let files = 0;
  const download = async (page, press, what) => {
    try { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), press()]); return normal(await READ_FILE(d), [site.release, site.sameDatabaseRelease]); }
    catch (error) { throw new Error(`${what}: ${error.message.split('\n')[0]}`); }
  };
  try {
    for (const s of pick(await twelveScenarios(root))) {
      await old.open(`${old.pageUrl}#${s.hash}`);
      await next.open(`${next.pageUrl}#${s.hash.replaceAll(site.release, site.sameDatabaseRelease)}`);
      await old.evaluate(`document.getElementById('btn-scenario').click(); true`);
      await old.until(`!!document.getElementById('sc-csv')`, 'the old Save / share panel');
      await pageNew.locator('[data-testid="save-share"]').click();
      await pageNew.locator('[data-testid="export-rows"]').waitFor();
      const pairs = [
        ['the rows on screen', () => pageOld.click('#sc-csv'), () => pageNew.click('[data-testid="export-rows"]')],
        ['their products', () => pageOld.click('#sc-products'), () => pageNew.click('[data-testid="export-products"]')],
      ];
      if (s.chosen) pairs.push([`the decision brief of ${s.chosen.gradeId}`, () => pageOld.click(`[data-brief="${s.chosen.gradeId}"]`), () => pageNew.click(`[data-brief="${s.chosen.gradeId}"]`)]);
      for (const [what, pressOld, pressNew] of pairs) {
        const a = await download(pageOld, pressOld, `${s.name}, ${what}, old page`);
        const b = await download(pageNew, pressNew, `${s.name}, ${what}, new page`);
        files++;
        if (a !== b) {
          const x = a.split('\n'), y = b.split('\n');
          const at = x.findIndex((line, i) => line !== y[i]);
          const l = x[at] ?? '', r = y[at] ?? '';
          let c = 0;
          while (c < l.length && l[c] === r[c]) c++;
          differences.push(`${s.name}: ${what} differs (line ${at + 1}, character ${c}: "${l.slice(Math.max(0, c - 50), c + 70)}" against "${r.slice(Math.max(0, c - 50), c + 70)}")`);
        }
        if (a.length < 200) differences.push(`${s.name}: ${what} is nearly empty on the old page (${a.length} characters)`);
      }
    }
  } finally {
    await context.close();
  }
  expect(files).toBeGreaterThan(0);
  expect(differences, `${differences.length} difference(s):\n  ${differences.join('\n  ')}`).toEqual([]);
  test.info().annotations.push({ type: 'files-compared', description: String(files) });
});

test('exports and decision brief: with the detail of a material they cite blocked they write nothing, and say so', async ({ page, newPage, watch, base, site, meta }) => {
  watch.allow(/detail\/M\d+\.json|status of 404/, 'the detail parts are withheld on purpose');
  const scenarios = await twelveScenarios(root);
  const s = scenarios.find((x) => x.chosen) ?? scenarios[0];
  const next = createNewSelector({ page, origin: site.origin, base, meta, root });
  await next.open(`${next.pageUrl}#${s.hash}`);
  await page.route('**/detail/*.json', (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' }));
  await page.locator('[data-testid="save-share"]').click();
  const downloads = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));
  for (const id of ['export-rows', 'export-products', ...(s.chosen ? ['download-brief'] : [])]) {
    await page.locator(`[data-testid="${id}"]`).click();
    await expect(page.locator('[data-testid="export-problem"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-problem"]')).toContainText('Nothing was written');
  }
  await sleep(500);
  expect(downloads, 'a file was written although the records it cites could not be loaded').toEqual([]);
  void newPage;
});
