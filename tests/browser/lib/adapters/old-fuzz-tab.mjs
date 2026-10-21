// The OLD page's fuzz tab (WP-22): one Playwright page that the fuzz (../fuzz.mjs) loads scenarios into and reads. Everything that
// knows the old selector's IDs and classes is here: when a page has rendered, how a saved scenario is imported (the Save / share
// panel's file input), and the page-side reader that turns what the page shows into the reading the invariants compare with the
// engine: the count text, the status chips, every row of the table with its verdict, group and cells, the Ashby points, envelopes,
// front, legend and decision marks. A new page supplies a tab of the same shape.
//
// A tab collects what a reader would call a fault: a script error, a console error, a failed request, an HTTP error. The fuzz turns any of them
// into an I6-exception violation, so a page that half-loaded cannot pass.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CALL_MS = 60_000;

/**
 * Wait until a page expression holds; a throw inside it counts as "not yet". The error names what was waited for. The old selector
 * adapter (old-selector.mjs) waits the same way, at its own polling interval.
 */
export async function waitUntil(page, expression, what, { ms = 20000, polling = 100 } = {}) {
  const guarded = `(() => { try { return !!(${expression}); } catch { return false; } })()`;
  try { await page.waitForFunction(guarded, undefined, { timeout: ms, polling }); }
  catch (e) { throw new Error(`timed out waiting for ${what} (${e.message.split('\n')[0]})`); }
}

const PAGE_HELPER = String.raw`window.__fz = (() => {
  const txt = (el) => (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const BAD = /\bNaN\b|\bundefined\b|\bnull\b|\[object Object\]/g;
  const chips = () => ['s-pass', 's-unknown', 's-fail', 's-screened'].map((id) => { const e = document.getElementById(id); return [e.hidden, e.textContent.trim(), e.disabled]; });
  function read(keys) {
    const lens = document.getElementById('lens');
    const lensText = lens.innerText;
    const count = txt(document.getElementById('count'));
    const ch = chips();
    const out = { count, chips: ch, h: hash(count + '|' + JSON.stringify(ch) + '|' + lensText.replace(/\s+/g, ' ')), estEls: lens.querySelectorAll('.est').length, dagger: lensText.includes('†') };
    const plot = document.getElementById('plot');
    out.head = txt(lens.querySelector('.active-head'));
    out.rail = {};
    for (const k of keys) { const v = document.querySelector('[data-value-for="' + k + '"]'); if (v) out.rail[k] = [document.querySelector('[data-op-for="' + k + '"]').value, v.value, document.querySelector('[data-soft="' + k + '"]')?.checked ?? null]; }
    let badSrc = lensText + ' ' + count;
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
      out.legend = (lens.querySelector('.legend-note')?.textContent ?? '').replace(/\s+/g, ' ').trim();
      out.pairs ??= [];
      out.wsReading = txt(lens.querySelector('.ws-summary')) + ' ' + txt(lens.querySelector('.ws-reading'));
      out.layerOn = Object.fromEntries(['unresolved', 'failed'].map((k) => [k, lens.querySelector('button[data-layer="' + k + '"]')?.getAttribute('aria-pressed') === 'true']));
      out.axisX = document.querySelector('#ashby-x option:checked')?.textContent.trim();
      out.axisY = document.querySelector('#ashby-y option:checked')?.textContent.trim();
      out.estLabel = lens.querySelector('[data-show-estimates]')?.closest('label')?.textContent.replace(/\s+/g, ' ').trim() ?? null;
      out.estDisabled = !!lens.querySelector('[data-show-estimates]')?.disabled;
      out.estState = txt(lens.querySelector('.plot-data-state'));
    } else {
      const grids = [...lens.querySelectorAll('table.grid')].filter((t) => !t.closest('.excluded-group'));
      out.noResults = !grids.length && !lens.querySelector('.excluded-group') && !lens.querySelector('.table-bar');
      out.rows = [];
      // D137, D155: every group belongs to the result set. Open every fold that holds a group's table ("Unlikely to
      // meet", and any other) while reading the rendered cell text, then restore the presentation unchanged.
      const folds = [...lens.querySelectorAll('details')].filter((d) => d.querySelector('table.grid'));
      const wasOpen = folds.map((d) => d.open);
      for (const d of folds) d.open = true;
      badSrc += ' ' + lens.innerText;
      out.dagger ||= lens.innerText.includes('†');
      for (const grid of grids) {
        const cols = [...grid.querySelectorAll('thead th')].map((th) => th.dataset.sort ?? 'pin');
        // Before any requirement the table has no Result column (D174): a row then has no verdict cell, and says nothing.
        const vi = cols.indexOf('verdict');
        out.resultColumn = (out.resultColumn ?? true) && vi >= 0;
        for (const tr of grid.querySelectorAll('tbody tr[data-material]:not(.baseline-row)')) {
          const tds = tr.children;
          const vc = vi >= 0 ? tds[vi] : null;
          const scr = vc?.querySelector('.chip-screened');
          const cells = {};
          for (const k of keys) { const j = cols.indexOf(k); if (j >= 0) cells[k] = { t: tds[j].innerText.trim(), est: !!tds[j].querySelector('.est') }; }
          out.rows.push([tr.dataset.material, vc ? vc.querySelector('.chip')?.textContent.trim() : null, !!scr, scr?.title ?? '', cells, grid.dataset.group ?? null, vc?.querySelector('.group-reason')?.textContent ?? '',
            vc?.querySelector('.hidden-why')?.textContent ?? '', vc?.querySelector('.fail-why')?.textContent ?? '']);
        }
      }
      folds.forEach((d, i) => { d.open = wasOpen[i]; });
      out.excluded = [...lens.querySelectorAll('.excluded-group tbody tr[data-material]')].map((tr) => [tr.dataset.material, tr.querySelector('.chip')?.textContent.trim(), txt(tr.querySelector('.why-cell'))]);
    }
    const m = badSrc.match(BAD);
    out.bad = m ? [...new Set(m)] : [];
    if (m) { const at = badSrc.search(BAD); out.badContext = badSrc.slice(Math.max(0, at - 80), at + 40); }
    return out;
  }
  const click = (sel) => { const e = document.querySelector(sel); if (!e) throw new Error('no ' + sel); e.click(); };
  const setEst = (on) => { const c = document.getElementById('use-estimates'); c.checked = on; c.dispatchEvent(new Event('change')); };
  const cur = () => ({ u: document.getElementById('mode-explore').getAttribute('aria-pressed') === 'true' ? 'X' : 'S', e: document.getElementById('use-estimates').checked });
  function go(target) {
    const want = { u: target[0], e: target[1] === '1' };
    let c = cur();
    if (c.e !== want.e) setEst(want.e);
    c = cur();
    if (c.u !== want.u) click(want.u === 'X' ? '#mode-explore' : '#mode-strict');
    if (document.getElementById('use-estimates').checked !== want.e) setEst(want.e);
  }
  // plan: { search, order: ['S1','S0',...], lens0, keys, sample }
  function run(plan) {
    const s = document.getElementById('search');
    s.value = plan.search; s.dispatchEvent(new Event('input'));
    const other = plan.lens0 === 'table' ? 'ashby' : 'table';
    const res = {};
    const both = (name) => {
      res[name + '|' + plan.lens0] = read(plan.keys);
      click('[data-lens="' + other + '"]');
      res[name + '|' + other] = read(plan.keys);
      click('[data-lens="' + plan.lens0 + '"]');
    };
    for (const st of plan.order) {
      go(st);
      both(st);
      // HIDDEN shows under Include with estimates off too, where a property that does not apply hides (D148).
      if (plan.sample && (st === 'X1' || st === 'X0') && !document.getElementById('s-screened').hidden) {
        click('#s-screened'); both(st + 'scr'); click('#s-screened');
      }
      if (plan.sample && st === 'S0' && !document.getElementById('s-fail').disabled && !document.getElementById('s-fail').hidden) {
        click('#s-fail'); both('S0fail'); click('#s-fail');
      }
    }
    return res;
  }
  return { run, read };
})(); true`;

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} k       the tab's number
 * @param {string} tmpDir  where its scenario file is written
 */
export function createOldFuzzTab(page, k, tmpDir) {
  const t = { k, errors: [], dialogs: [], loaded: false, sinceLoad: 0, file: join(tmpDir, `tab${k}.json`) };
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
  page.on('dialog', (dialog) => { t.dialogs.push(dialog.message()); dialog.accept().catch(() => {}); });

  const ev = (expression) => page.evaluate(expression);
  const until = (expression, what, ms) => waitUntil(page, expression, what, { ms, polling: 20 });
  t.load = async (url) => {
    const response = await page.goto(url, { waitUntil: 'load', timeout: CALL_MS });
    if (response === null || !response.ok()) throw new Error(`${url} answered ${response === null ? 'nothing' : `HTTP ${response.status()}`}`);
    await until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim() && !!document.getElementById('lens')?.children.length`, 'page render');
    await ev(PAGE_HELPER);
    t.loaded = true; t.sinceLoad = 0;
  };
  t.importScenario = async (s, setting, lens) => {
    writeFileSync(t.file, JSON.stringify({ version: 2, constraints: s.constraints, unknownPolicy: setting.u, useEstimates: setting.e, assumptions: s.assumptions, plot: s.plot, lens, template: s.template ?? null, shortlist: [], columnSet: s.columnSet, anneal: !!s.anneal, annealMaxC: s.annealMaxC ?? null, moisture: s.moisture ?? 'dry' }));
    const chooser = page.waitForEvent('filechooser', { timeout: 5000 });
    chooser.catch(() => {});   // a failed click must not leave an unhandled rejection behind (it killed a 3000-scenario run)
    // A mark in the lens goes when the import re-renders it: that is how the import is known to have finished. The click runs with a
    // user gesture (Playwright's evaluate has one), which the browser requires before it opens a file chooser.
    await ev(`(() => { const m = document.createElement('i'); m.id = 'fz-mark'; document.getElementById('lens').appendChild(m); document.getElementById('btn-scenario').click(); document.getElementById('sc-import').click(); return true; })()`);
    await (await chooser).setFiles(t.file);
    await until(`!document.getElementById('fz-mark')`, 'import render', 5000);
  };
  /** Run a plan on the loaded page (see __fz.run in the page-side reader) and give back one reading per setting and lens. */
  t.runPlan = (plan) => ev(`__fz.run(${JSON.stringify(plan)})`);
  /** Type a search and read the page as it stands. */
  t.readWithSearch = (search, keys) => ev(`(() => { const q = document.getElementById('search'); q.value = ${JSON.stringify(search)}; q.dispatchEvent(new Event('input')); return __fz.read(${JSON.stringify(keys)}); })()`);
  t.close = () => page.close();
  return t;
}
