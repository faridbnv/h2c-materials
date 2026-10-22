// The NEW selector's fuzz tab (WP-26): one Playwright page that the fuzz (../fuzz.mjs) loads scenarios into and reads, built on the
// data-testid hooks of apps/public/src/selector (the lens, the count, the four status chips, every row's cells, the active head, the
// rail's controls, the search-excluded rows, the notices, the Save / share panel and its file input). The only classes it reads are the
// ones the facts layer's own markup carries inside a cell (an estimate's "est" mark, a chip), which have no other hook.
//
// Reading is not synchronous as it was on the old page: a change of policy or of the estimates switch may fetch the estimates part
// first. A step therefore waits for the lens's data-vrev to change and for its data-state to be "ready" before it reads.
//
// Since WP-27 the page draws the Ashby lens and its decision view, so the tab reads the chart as the old tab does (the data handed to the chart
// library, the legend and the reading sentence) and the families that only the Ashby lens can check (I4 the plotted points, I10 the decision marks) run.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitUntil } from './old-fuzz-tab.mjs';

const CALL_MS = 60_000;

const PAGE_HELPER = String.raw`window.__fz = (() => {
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const tid = (id, root = document) => q('[data-testid="' + id + '"]', root);
  const txt = (el) => (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const BAD = /\bNaN\b|\bundefined\b|\bnull\b|\[object Object\]/g;
  const lens = () => tid('lens');
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const chips = () => ['PASS', 'UNKNOWN', 'FAIL', 'screened'].map((v) => { const e = tid('status-' + v); return [e.hidden, e.textContent.trim(), e.disabled]; });
  function read(keys) {
    const root = lens();
    const lensText = root.innerText;
    const count = txt(tid('count'));
    const ch = chips();
    const out = { count, chips: ch, h: hash(count + '|' + JSON.stringify(ch) + '|' + lensText.replace(/\s+/g, ' ')), estEls: qa('.est', root).length, dagger: lensText.includes('†') };
    out.head = txt(tid('active-head', root));
    out.rail = {};
    for (const k of keys) {
      const v = q('[data-testid="rail-value"][data-value-for="' + k + '"]');
      if (v) out.rail[k] = [q('[data-testid="rail-op"][data-op-for="' + k + '"]').value, v.value, q('[data-testid="rail-soft"][data-soft="' + k + '"]')?.checked ?? null];
    }
    let badSrc = lensText + ' ' + count;
    const plot = document.getElementById('plot');
    if (plot) {
      out.points = []; out.envs = []; out.front = null;
      for (const t of plot.data ?? []) {
        if (t.legendgroup === 'pareto') out.front = t.x.map((x, i) => [x, t.y[i]]);
        else if (typeof t.hovertemplate === 'string' && t.hovertemplate.includes('Estimated material range')) out.envs.push([t.customdata[0][0], t.x, t.y]);
        else if (Array.isArray(t.customdata) && t.customdata[0]?.length === 8) t.customdata.forEach((cd, i) => out.points.push([cd[0], t.x[i], t.y[i], cd[2], cd[7]]));
        else if (Array.isArray(t.customdata) && t.customdata[0]?.length === 9) t.customdata.forEach((cd, i) => (out.pairs ??= []).push([cd[8], t.x[i], t.y[i], cd[2], cd[0]]));
        badSrc += ' ' + (t.name ?? '') + ' ' + (Array.isArray(t.text) ? t.text.join(' ') : '') + ' ' + (t.hovertemplate ?? '');
      }
      // Its text whether or not the reader has opened it (D111 folds it, as the other views do).
      out.legend = (root.querySelector('.legend-note')?.textContent ?? '').replace(/\s+/g, ' ').trim();
      out.pairs ??= [];
      out.wsReading = txt(root.querySelector('.ws-summary')) + ' ' + txt(root.querySelector('.ws-reading'));
      out.layerOn = Object.fromEntries(['unresolved', 'failed'].map((k) => [k, root.querySelector('button[data-layer="' + k + '"]')?.getAttribute('aria-pressed') === 'true']));
      out.axisX = document.querySelector('#ashby-x option:checked')?.textContent.trim();
      out.axisY = document.querySelector('#ashby-y option:checked')?.textContent.trim();
      out.estLabel = root.querySelector('[data-show-estimates]')?.closest('label')?.textContent.replace(/\s+/g, ' ').trim() ?? null;
      out.estDisabled = !!root.querySelector('[data-show-estimates]')?.disabled;
      out.estState = txt(root.querySelector('.plot-data-state'));
    } else {
    const grids = qa('[data-testid="results-table"]', root);
    out.noResults = !grids.length && !tid('excluded', root) && !q('.table-bar', root);
    out.rows = [];
    // D137, D155: every group belongs to the result set. Open every fold that holds a group's table ("Unlikely to meet", and any other)
    // while reading the rendered cell text, then put the presentation back.
    const folds = qa('details', root).filter((d) => q('[data-testid="results-table"]', d));
    const wasOpen = folds.map((d) => d.open);
    for (const d of folds) d.open = true;
    badSrc += ' ' + root.innerText;
    out.dagger ||= root.innerText.includes('†');
    for (const grid of grids) {
      const cols = qa('thead th', grid).map((th) => th.dataset.sort ?? 'pin');
      // Before any requirement the table has no Result column (D174): a row then has no verdict cell, and says nothing.
      const vi = cols.indexOf('verdict');
      out.resultColumn = (out.resultColumn ?? true) && vi >= 0;
      for (const tr of qa('tbody tr[data-testid="result-row"]', grid)) {
        const tds = tr.children;
        const vc = vi >= 0 ? tds[vi] : null;
        const scr = vc ? tid('screened-chip', vc) : null;
        const cells = {};
        for (const k of keys) { const j = cols.indexOf(k); if (j >= 0) cells[k] = { t: tds[j].innerText.trim(), est: !!q('.est', tds[j]) }; }
        out.rows.push([tr.dataset.material, vc ? q('.chip', vc)?.textContent.trim() : null, !!scr, scr?.title ?? '', cells, grid.dataset.group ?? null, vc ? tid('group-reason', vc)?.textContent ?? '' : '',
          vc ? tid('hidden-why', vc)?.textContent ?? '' : '', vc ? tid('fail-why', vc)?.textContent ?? '' : '']);
      }
    }
    folds.forEach((d, i) => { d.open = wasOpen[i]; });
    out.excluded = qa('[data-testid="excluded-row"]', root).map((tr) => [tr.dataset.material, q('.chip', tr)?.textContent.trim(), txt(tid('excluded-why', tr))]);
    }
    const m = badSrc.match(BAD);
    out.bad = m ? [...new Set(m)] : [];
    if (m) { const at = badSrc.search(BAD); out.badContext = badSrc.slice(Math.max(0, at - 80), at + 40); }
    return out;
  }
  // A step waits for the page to have drawn what it changed: the lens's revision moves, its state is ready again, and nothing is being fetched. A hosted
  // lens (the chart) draws a frame after the revision moves, so the page is given that frame before it is asked whether it is busy.
  async function settle(before) {
    for (let i = 0; i < 6000; i++) {
      const l = lens();
      if (l && l.dataset.state === 'ready' && l.dataset.vrev !== before) {
        await frame(); await frame();
        if (!document.querySelector('[data-busy="true"]')) return;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('the page did not settle after a step (state ' + lens()?.dataset.state + ')');
  }
  // Nothing is being drawn or fetched: a hosted lens (the chart) is drawn a frame after the revision it follows.
  async function idle() {
    for (let i = 0; i < 6000; i++) { await frame(); await frame(); if (!document.querySelector('[data-busy="true"]')) return; await new Promise((r) => setTimeout(r, 5)); }
    throw new Error('the page stayed busy');
  }
  async function act(fn) { const before = lens().dataset.vrev; fn(); await settle(before); }
  const click = (id) => { const e = tid(id); if (!e) throw new Error('no ' + id); e.click(); };
  const setEst = (on) => { const c = tid('use-estimates'); c.checked = on; c.dispatchEvent(new Event('change', { bubbles: true })); };
  const cur = () => ({ u: tid('mode-explore').getAttribute('aria-pressed') === 'true' ? 'X' : 'S', e: tid('use-estimates').checked });
  async function go(target) {
    const want = { u: target[0], e: target[1] === '1' };
    if (cur().e !== want.e) await act(() => setEst(want.e));
    if (cur().u !== want.u) await act(() => click(want.u === 'X' ? 'mode-explore' : 'mode-strict'));
    if (tid('use-estimates').checked !== want.e) await act(() => setEst(want.e));
  }
  async function search(text) {
    const s = tid('search');
    if (s.value === text) return;
    await act(() => { s.value = text; s.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  // plan: { search, order: ['S1','S0',...], keys, sample }
  async function run(plan) {
    await idle();
    await search(plan.search);
    const res = {};
    const other = plan.lens0 === 'table' ? 'ashby' : 'table';
    // The reading in the lens the scenario opened on, then in the other, then back (as the old tab does).
    const both = async (name) => {
      res[name + '|' + plan.lens0] = read(plan.keys);
      await act(() => click('lens-' + other));
      res[name + '|' + other] = read(plan.keys);
      await act(() => click('lens-' + plan.lens0));
    };
    for (const st of plan.order) {
      await go(st);
      await idle();
      await both(st);
      // HIDDEN shows under Include with estimates off too, where a property that does not apply hides (D148).
      if (plan.sample && (st === 'X1' || st === 'X0') && !tid('status-screened').hidden) {
        await act(() => click('status-screened')); await both(st + 'scr'); await act(() => click('status-screened'));
      }
      if (plan.sample && st === 'S0' && !tid('status-FAIL').disabled && !tid('status-FAIL').hidden) {
        await act(() => click('status-FAIL')); await both('S0fail'); await act(() => click('status-FAIL'));
      }
    }
    return res;
  }
  const notices = () => qa('[data-testid="notice-text"]').map((e) => e.textContent.trim());
  return { run, read, search, settle, notices, lens, idle };
})(); true`;

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} k       the tab's number
 * @param {string} tmpDir  where its scenario file is written
 */
export function createNewFuzzTab(page, k, tmpDir) {
  const t = {
    k, errors: [], dialogs: [], loaded: false, sinceLoad: 0, file: join(tmpDir, `tab${k}.json`),
    lenses: ['table', 'ashby'],
    notRun: {},
  };
  page.on('pageerror', (error) => t.errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon/.test(message.text() + message.location().url)) t.errors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    // A request cut off by the next navigation is not a fault of the page that was left.
    if (!/favicon/.test(request.url()) && request.failure()?.errorText !== 'net::ERR_ABORTED') t.errors.push(`request failed: ${request.url()} (${request.failure()?.errorText})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !/favicon/.test(response.url())) t.errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });

  const ev = (expression) => page.evaluate(expression);
  /** The page says what it validated away in its notices, where the old page used a dialog: the fuzz compares them with the engine's warnings. */
  const takeNotices = async () => { for (const line of await ev('__fz.notices()')) if (!t.dialogs.includes(line)) t.dialogs.push(line); };
  t.load = async (url) => {
    const response = await page.goto(url, { waitUntil: 'load', timeout: CALL_MS });
    if (response === null || !response.ok()) throw new Error(`${url} answered ${response === null ? 'nothing' : `HTTP ${response.status()}`}`);
    await waitUntil(page, `document.querySelector('[data-testid="lens"]')?.dataset.state === 'ready' && !!document.querySelector('[data-testid="count"]')?.textContent.trim()`, 'page render', { ms: 20000, polling: 20 });
    await ev(PAGE_HELPER);
    // A page opened on the chart draws it a moment after the results: it has been read once the page says it is no longer waiting.
    await ev('__fz.idle()');
    t.loaded = true; t.sinceLoad = 0;
    await takeNotices();
  };
  t.importScenario = async (s, setting, lens) => {
    writeFileSync(t.file, JSON.stringify({ version: 2, constraints: s.constraints, unknownPolicy: setting.u, useEstimates: setting.e, assumptions: s.assumptions, plot: s.plot, lens, template: s.template ?? null, shortlist: [], columnSet: s.columnSet, anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' }));
    // What an earlier scenario's import said is not this one's: clear the notices before this file is loaded.
    await ev(`document.querySelectorAll('[data-testid="notice"] button').forEach((b) => b.click())`);
    await page.locator('[data-testid="save-share"]').click();
    await page.locator('[data-testid="file-input"]').setInputFiles(t.file);
    // A scenario that loads closes the panel and draws again: that is how the import is known to have finished.
    await page.locator('[data-testid="save-panel"]').waitFor({ state: 'detached', timeout: 5000 });
    await waitUntil(page, `document.querySelector('[data-testid="lens"]')?.dataset.state === 'ready'`, 'import render', { ms: 20000, polling: 20 });
    await ev('__fz.idle()');
    await takeNotices();
  };
  /** Run a plan on the loaded page (see __fz.run in the page-side reader) and give back one reading per setting and lens. */
  t.runPlan = async (plan) => { const out = await ev(`__fz.run(${JSON.stringify(plan)})`); await takeNotices(); return out; };
  /** Type a search and read the page as it stands. */
  t.readWithSearch = (search, keys) => ev(`(async () => { await __fz.search(${JSON.stringify(search)}); await __fz.idle(); return __fz.read(${JSON.stringify(keys)}); })()`);
  t.close = () => page.close();
  return t;
}
