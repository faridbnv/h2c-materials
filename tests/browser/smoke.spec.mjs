// The site under this base path, before any interface check (WP-22; pack 07 section 7.1): the server answers like GitHub Pages, every page
// of the old site and the public view loads from HTTP under the base path, and a page that is not there is an error, never a quiet empty
// view. These run in the fast subset under both base paths.
import { request as rawRequest } from 'node:http';
import { test, expect, FULL } from './fixtures.mjs';
import { CACHE_CONTROL } from './lib/server.mjs';

/** A GET with the path exactly as written: Playwright's client, like a browser, resolves dot segments and so can never send one. */
const rawStatus = (origin, path) => new Promise((resolve, reject) => {
  const { hostname, port } = new URL(origin);
  const req = rawRequest({ hostname, port, path, method: 'GET' }, (res) => { res.resume(); resolve(res.statusCode); });
  req.on('error', reject);
  req.end();
});
const get = (request, url, headers = {}) => request.get(url, { headers, maxRedirects: 0, failOnStatusCode: false });

test('site: every piece of the site answers 200 under this base path, compressed and cacheable', async ({ request, appUrl, site }) => {
  const pieces = ['', 'index.html', site.stamped, 'manifest.json', 'materials/M001.html', 'materials/M001-products.html', 'materials/index.html', 'materials/method.html',
    'v3/', 'v3/material.html?m=M001', 'v3/release.json', `v3/data/${site.v3Release}/result.json`];
  for (const piece of pieces) {
    const response = await get(request, `${appUrl}${piece}`, { 'accept-encoding': 'gzip' });
    expect(response.status(), `${piece || '(the root)'} answered HTTP ${response.status()}`).toBe(200);
    expect(response.headers()['cache-control'], `${piece} cache-control`).toBe(CACHE_CONTROL);
    if (/html|json/.test(response.headers()['content-type'] ?? '')) expect(response.headers()['content-encoding'], `${piece} is gzipped`).toBe('gzip');
    expect((await response.body()).length, `${piece} is empty`).toBeGreaterThan(100);
  }
  const root = await get(request, appUrl);
  expect(await root.text()).toContain('id="count"');   // the root is the selector
});

test('site: nothing answers outside the base path, a folder without its slash redirects, a path out of the site is refused', async ({ request, site, base }) => {
  expect((await get(request, `${site.origin}/`)).status(), 'the bare origin must not answer').toBe(404);
  expect((await get(request, `${site.origin}/h2c-materials-next/`)).status(), 'a third base path must not answer').toBe(404);
  const bare = await get(request, `${site.origin}${base.slice(0, -1)}`);
  expect(bare.status()).toBe(301);
  expect(bare.headers()['location']).toBe(base);
  // Refused (400) or resolved to an address outside every base (404): either way nothing outside the site is served.
  for (const path of [`${base}../../package.json`, `${base}%2e%2e/%2e%2e/package.json`, `${base}..%2f..%2fpackage.json`]) expect([400, 404], `${path} must not be served`).toContain(await rawStatus(site.origin, path));
});

test('site: a page that is not there is a 404 the suite can see, not an empty page', async ({ request, appUrl, page, watch, oldPage }) => {
  const missing = await get(request, `${appUrl}materials/M999.html`);
  expect(missing.status()).toBe(404);
  watch.allow(/materials\/M999\.html|status of 404/, 'the page asked for does not exist');
  // The adapter must say so: a step that opened a missing page and read "nothing" would pass a comparison with nothing.
  await expect(oldPage.go(`${appUrl}materials/M999.html`)).rejects.toThrow(/HTTP 404/);
  expect(page.url()).toContain('materials/M999.html');
});

test('site: every material page of the old site is served under this base path', async ({ request, appUrl, site }) => {
  const ids = await request.get(`${appUrl}materials/index.html`).then((r) => r.text()).then((html) => [...new Set([...html.matchAll(/href="(M\d+)\.html"/g)].map((m) => m[1]))]);
  expect(ids.length, 'the index lists no material: the page list is empty').toBeGreaterThan(50);
  const sample = FULL ? ids : ids.filter((_, i) => i % 9 === 0);
  const bad = [];
  for (const id of sample) {
    for (const file of [`${id}.html`, `${id}-products.html`]) {
      const response = await get(request, `${appUrl}materials/${file}`);
      if (response.status() !== 200 || !(await response.text()).includes('data-page=')) bad.push(`${file} (HTTP ${response.status()})`);
    }
  }
  expect(bad, `pages that did not load whole: ${bad.join(', ')}`).toEqual([]);
  expect(site.release).toMatch(/^[0-9a-f]{12}$/);
});

test('site: the old selector loads from HTTP under this base path and renders', async ({ page, oldPage, site, base }) => {
  await oldPage.open(oldPage.pageUrl);
  expect(new URL(page.url()).pathname).toBe(base);
  expect(await oldPage.evaluate(`document.getElementById('count').textContent.trim()`)).toMatch(/\d/);
  expect(await oldPage.evaluate(`document.querySelectorAll('[data-template]').length`)).toBeGreaterThan(0);
  expect(site.stamped).toContain(site.release);
});
