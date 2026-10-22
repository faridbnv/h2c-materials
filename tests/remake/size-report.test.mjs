// WP-25: the size report (remake/tools/size-report.mjs) on a view built by hand, so that what it counts as boot, what it measures
// of the shards and when it says a budget is missed are all pinned. The real numbers are remake/measure/sizes.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { BUDGETS, measure } from '../../remake/tools/size-report.mjs';

const tool = fileURLToPath(new URL('../../remake/tools/size-report.mjs', import.meta.url));
const R = 'aaaaaaaaaaaa';

/** A view: a page, an entry that imports a chunk statically and another dynamically, a style, and the four parts. `coreBytes` of core.json are incompressible. */
function view({ coreBytes = 1000, detail = [100, 200, 300], listed = detail.length, page = '' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-size-'));
  const put = (path, bytes) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), bytes); };
  put('index.html', page || '<!doctype html><html><head><link rel="stylesheet" href="./assets/s.css"><script type="module" src="./assets/a.js"></script><link rel="modulepreload" href="./assets/b.js"></head><body></body></html>');
  put('assets/a.js', 'import{x}from"./b.js";const lazy=()=>import("./c.js");const chart=()=>import("./plotly-abc.js");export{x,lazy,chart};');
  put('assets/b.js', `export const x=${JSON.stringify('b'.repeat(500))};`);
  put('assets/c.js', `export const y=${JSON.stringify(randomBytes(5000).toString('hex'))};`);
  put('assets/s.css', 'body{margin:0}');
  put('assets/plotly-abc.js', `export const p=${JSON.stringify(randomBytes(3000).toString('hex'))};`);
  put('release.json', JSON.stringify({ release: R, files: { detail: { count: listed } } }));
  put(`data/${R}/core.json`, randomBytes(coreBytes));
  put(`data/${R}/estimates.json`, 'x'.repeat(2000));
  put(`data/${R}/reference.json`, '{}');
  detail.forEach((n, i) => put(`data/${R}/detail/M${i + 1}.json`, randomBytes(n)));
  return dir;
}

test('strict boot is the page, the scripts and styles it names and their static imports, and the core: not a chunk imported on demand', () => {
  const report = measure({ view: view() });
  const files = report.strictBoot.files.map((f) => f.path).sort();
  assert.deepEqual(files, ['assets/a.js', 'assets/b.js', 'assets/s.css', `data/${R}/core.json`, 'index.html']);
  assert.equal(report.strictBoot.gzipBytes, report.strictBoot.files.reduce((n, f) => n + f.gzip, 0));
  assert.equal(report.defaultBoot.gzipBytes, report.strictBoot.gzipBytes + report.defaultBoot.estimatesGzipBytes);
  assert.equal(report.ok, true);
  assert.equal(report.release, R);
});

test('an absolute Vite base is stripped: the same boot is found under /h2c-materials/v3/', () => {
  const page = '<!doctype html><html><head><link rel="stylesheet" href="/h2c-materials/v3/assets/s.css"><script type="module" src="/h2c-materials/v3/assets/a.js"></script></head><body></body></html>';
  const files = measure({ view: view({ page }) }).strictBoot.files.map((f) => f.path).sort();
  assert.deepEqual(files, ['assets/a.js', 'assets/b.js', 'assets/s.css', `data/${R}/core.json`, 'index.html']);
});

test('a report that measured nothing is not a pass: no detail, a count that differs from the build\'s, a named asset that is missing, no script', () => {
  assert.throws(() => measure({ view: view({ detail: [], listed: 0 }) }), /holds 0 detail shards/);
  assert.throws(() => measure({ view: view({ detail: [100, 200], listed: 3 }) }), /holds 2 detail shards.*wrote 3/);
  assert.throws(() => measure({ view: view({ page: '<html><head><script type="module" src="./assets/gone.js"></script></head></html>' }) }), /names \.\/assets\/gone\.js, which is not in/);
  assert.throws(() => measure({ view: view({ page: '<html><head><link rel="stylesheet" href="./assets/s.css"></head></html>' }) }), /names no script/);
  assert.throws(() => measure({ view: view({ page: '<html><head><script type="module" src="/h2c-materials/assets/none.js"></script></head></html>' }) }), /none\.js, which is not in/);
  const noCount = view();
  writeFileSync(join(noCount, 'release.json'), JSON.stringify({ release: R }));
  assert.throws(() => measure({ view: noCount }), /does not say how many detail shards/);
});

test('the detail shards are measured by gzip size, median and largest', () => {
  const report = measure({ view: view({ detail: [1000, 2000, 5000] }) });
  assert.equal(report.detail.count, 3);
  assert.ok(report.detail.medianGzipBytes > 1500 && report.detail.medianGzipBytes < 2500, 'random bytes do not compress');
  assert.equal(report.detail.largest, `data/${R}/detail/M3.json`);
  assert.ok(report.detail.maxGzipBytes > 4900);
});

test('a budget that is missed is reported as missed, with the number: boot, a detail shard, the site', () => {
  const boot = measure({ view: view({ coreBytes: BUDGETS.strictBootGzip + 50_000 }) });
  assert.equal(boot.checks.strictBootGzip.ok, false);
  assert.equal(boot.ok, false);
  const big = measure({ view: view({ detail: [10, BUDGETS.detailMaxGzip + 5_000] }) });
  assert.equal(big.checks.detailMaxGzip.ok, false);
  assert.equal(big.checks.strictBootGzip.ok, true);
  assert.equal(measure({ view: view() }).checks.siteBytes.budget, 100_000_000);
});

test('CLI: writes the JSON and exits 0 when every budget is met, 1 when one is not, 2 when it cannot measure', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'h2c-size-out-')), 'sizes.json');
  const ok = spawnSync(process.execPath, [tool, '--view', view(), '--out', out], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /ok   strictBootGzip/);
  const over = spawnSync(process.execPath, [tool, '--view', view({ coreBytes: BUDGETS.strictBootGzip + 50_000 }), '--out', out], { encoding: 'utf8' });
  assert.equal(over.status, 1);
  assert.match(over.stdout, /OVER strictBootGzip/);
  const none = spawnSync(process.execPath, [tool, '--view', mkdtempSync(join(tmpdir(), 'h2c-size-none-')), '--out', out], { encoding: 'utf8' });
  assert.equal(none.status, 2);
  const empty = spawnSync(process.execPath, [tool, '--view', view({ detail: [], listed: 0 }), '--out', out], { encoding: 'utf8' });
  assert.equal(empty.status, 2, 'a view with no detail shards could not be measured, which is not a pass');
  assert.match(empty.stderr, /holds 0 detail shards/);
});
