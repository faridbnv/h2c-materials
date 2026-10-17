#!/usr/bin/env node
// Interface regression check: drive the built self-contained page in headless Chrome and record what a reader sees
// at each step, as text under build/snapshot/ui/. A change to the engine, the labels or the data shows up there as
// a reviewable diff; an exception or an empty view fails.
//
// Steps: the default view; every application template in Strict and in Explore with estimates; the Explore link
// reopened in a fresh page (a shared link must reproduce the view); three pins in Compare. The default, template,
// ranked and family views record each results table as a summary (tableView, below); the rest record their full text.
//
// Then the same page on three screens: a laptop (1180 x 760), a tablet (820 x 1100) and a phone (390 x 844), the last
// two as touch devices. On each: the default view; a template in Explore with estimates, every status chip on and
// three pins, through every lens and both column sets; the drawer of the first row, on its Overview, Mechanical,
// Printing, Price and Sources tabs; and the drawer of ABS-CF in Confirmed only. These files (30-<screen>-<step>.txt)
// do not hold the text, which the steps above already record, but
// what breaks on a narrow screen: a page wider than the screen, elements past its right edge that no scroll container
// holds, table cells too narrow for what they hold, controls left off screen, estimates in the drawer, a full-screen
// drawer that is not a modal dialog. They name and count elements rather than give their positions, so two runs write
// the same file and a difference is a layout change. A drawer step measures the drawer's own tables: the table behind
// it is the table step's, and counting it again charged the drawer with the table's failures.
//
// Last, the material pages the build writes beside the selector (dist/materials/, opened from disk with file://): eight
// of them, on the same three screens: a material's page for PLA, PETG, ASA-CF, PCTG-GF and PEEK, the index of materials,
// and the records pages of PLA and PCTG-GF. Each is opened (openPage: the page's own main[data-page] and its fonts) and
// recorded as 50-page-<screen>-<slug>.txt. Like the layout files above, a page file names and counts and gives no
// positions: the layout lines (a page wider than the screen, elements past its right edge outside a scroll container,
// clipped table cells), the sections present and which are empty, the figures with an svg and a caption, the state of
// the contents (a sticky rail at 1,080 px and wider, a strip below it, and on a records page a strip at every width),
// the fonts loaded, and whether lighting a product across the figures and sorting the Products table work. On the
// laptop and the phone two checks that drive the page as a reader does run too, and record only their counts: every
// contents link and every figure anchor (and on a records page every group) must land its heading within 4 px of the
// line under whatever covers the top of the screen (the sticky bar, the strip, a records page's finder) plus the
// stylesheet's gap, with the contents marking the clicked section current (checkAnchors, below), and the Products table's
// sorts, searches, toggles and paging (scripts/lib/page-products-check.js, evaluated in the page, on PETG's and
// PCTG-GF's tables: PRODUCTS_CHECKED). A records page has no contents: its finder replaces them, as a column from
// 1,100 px and as a bar below.
// A figure without a caption, a rail on a phone, a strip where the rail should be, a font that is not loaded, a missing
// page and any failure of those checks fail the check like a selector layout failure.
//
//   npm run ui:check                     compare with build/snapshot/ui; exit 1 on a difference, a page error or any
//                                        layout failure those files record, listed by step
//   npm run ui:check -- --write          rewrite build/snapshot/ui (still exit 1 on a layout failure)
//   npm run ui:check -- --only pages     the page steps alone, compared with, or with --write written to, the 50-page-*
//                                        files only; the default run is everything
//   npm run ui:check -- --verbose        also print, per screen step, what follows the machine's fonts and is therefore
//                                        not recorded: boxes that scroll sideways, rows each bar wraps to, the legend
// --strict-layout, which once turned the layout failures into a failed check, is accepted and changes nothing: the
// failures it listed (the status bar widening the phone page, table cells clipped below 1000 px, estimates in the
// Confirmed-only drawer) are fixed, and a new one fails the check like any other.
// Needs `npm run build` first and Chrome (CHROME=/path, or the usual install paths); without Chrome it reports
// "skipped" and exits 0, unless --require is given (CI).

import { findChrome, launchChrome, skipWithoutChrome } from './lib/cdp.mjs';
import { pageName } from '../build/src/release.js';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'build/snapshot/ui');
const write = process.argv.includes('--write');
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex < 0 ? null : process.argv[onlyIndex + 1];
if (only !== null && only !== 'pages') { console.error(`ui:check: --only takes "pages", not "${only}"`); process.exit(1); }
const onlyPages = only === 'pages';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = findChrome();
if (!chrome) skipWithoutChrome('ui:check');
// The page of the current snapshot, as audit-data.mjs names it. "The first H2C_Material_Selector_*.html" picked an older
// page left in dist/ after the snapshot moved (2026-09-10 sorts before 2026-09-16), so the checks tested a stale build.
const builtMeta = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8')).meta;
const html = readdirSync(join(root, 'dist')).find((f) => f === pageName(builtMeta));
if (!html) { console.error(`No built page for release ${builtMeta.release?.id} (data ${builtMeta.snapshot}) in dist/; run npm run build`); process.exit(1); }
const pageUrl = pathToFileURL(join(root, 'dist', html)).href;

const profile = mkdtempSync(join(tmpdir(), 'h2c-ui-'));
// As the fuzz does: a machine left idle (display asleep) throttles a background renderer's timers, and a probe that took
// 36 s took 16 minutes on 2026-09-27 before its first view.
const { proc, port } = await launchChrome(chrome, profile, ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']);

let ws, nextId = 0;
const pending = new Map(), errors = [];
// A call Chrome never answers fails the check. Without a limit, a browser that stalled left verify waiting with no
// output and no CPU for an hour and a half (2026-09-25); every call here answers in well under a second.
const CALL_MS = 60000;
const send = (method, params = {}, limit = CALL_MS) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome did not answer ${method} within ${limit / 1000} s`)); }, limit);
  pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression, limit) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, limit);
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 60)}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
};
const until = async (expression, what, ms = 20000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await evaluate(expression).catch(() => false)) return;
  throw new Error(`timed out waiting for ${what}`);
};
const open = async (url) => {
  await send('Page.navigate', { url });
  await until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim()`, 'the page to render');
  await sleep(200);
};
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('no ${selector.replace(/'/g, '')}'); el.click(); return true; })()`);
// What a reader sees: the count, the status chips, and the active view, whitespace normalised. The build date chip
// is left out so a rebuild on another day is not a difference.
const view = () => evaluate(`(() => {
  const text = (el) => (el?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim();
  const chips = ['s-pass', 's-unknown', 's-fail', 's-screened'].map((id) => document.getElementById(id)).filter((e) => e && !e.hidden).map(text).join(' | ');
  return ['COUNT ' + text(document.getElementById('count')), 'STATUS ' + chips, text(document.getElementById('lens'))].join('\\n');
})()`);

// The same view with each results table summarised (maintainability round, 2026-10-15): its column headers, one line per
// row with the material and its verdict, and the full text of its first eight rows. A whole table's text made every data
// change rewrite the template views, and the line that mattered was hard to find in the diff; the fuzz still compares
// every cell with the engine. Everything around the tables (the count, the heading sentence, the pills) is kept whole.
const tableView = () => evaluate(`(() => {
  const text = (el) => (el?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim();
  const flat = (el) => text(el).replace(/\\n/g, ' / ');
  const chips = ['s-pass', 's-unknown', 's-fail', 's-screened'].map((id) => document.getElementById(id)).filter((e) => e && !e.hidden).map(text).join(' | ');
  const lens = document.getElementById('lens');
  const shown = [...lens.querySelectorAll('table')].filter((t) => t.getClientRects().length);
  const summaries = shown.map((t) => {
    const rows = [...t.querySelectorAll('tbody tr')].filter((r) => r.getClientRects().length);
    const head = [...t.querySelectorAll('thead th')].map(flat).join(' | ');
    const line = (r) => { const c = [...r.cells]; return (c[0] ? text(c[0]).split('\\n')[0] : '') + (c[1] ? ' · ' + text(c[1]).split('\\n').slice(0, 2).join(' ') : ''); };
    return ['TABLE ' + rows.length + ' rows: ' + head, ...rows.map((r, i) => (i < 8 ? 'ROW ' + [...r.cells].map(flat).join(' | ') : 'ROW ' + line(r)))].join('\\n');
  });
  const markers = shown.map((t, i) => { const m = document.createElement('div'); m.textContent = '@@TABLE' + i + '@@'; t.before(m); t.style.display = 'none'; return m; });
  let body = text(lens);
  shown.forEach((t, i) => { t.style.display = ''; markers[i].remove(); body = body.replace('@@TABLE' + i + '@@', summaries[i]); });
  return ['COUNT ' + text(document.getElementById('count')), 'STATUS ' + chips, body].join('\\n');
})()`);

const results = {};

// The screens of the layout section. A touch screen is emulated as a mobile browser, which is what widens its layout
// viewport when the page does not fit.
const SCREENS = [
  { name: 'laptop', width: 1180, height: 760, mobile: false },
  { name: 'tablet', width: 820, height: 1100, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
];
// A list of element names stops after this many, with a count of the rest.
const LISTED = 15;
// What the layout of one step gets wrong, measured against the screen's own width. innerWidth is not that width: a
// mobile browser widens its layout viewport to fit a page that is too wide (innerWidth reads 533 on a 390 px phone),
// which is the failure to catch. An element inside a scroll or clipping container is that container's business, and
// the container itself is measured; the page and body are the screen. A control off screen counts as hidden unless a
// container on screen scrolls sideways to it. Elements are named by tag, id and first class from their nearest
// ancestor with an id, so the names survive a change of data or wording.
//
// Beyond the failures, the record keeps what a width fix alone does not settle: the containers that scroll sideways,
// how many rows the bars wrap to, and where the Ashby legend sits against the plot (the plot's share of the chart
// rounded to 10 %, so a pixel is not a change).
//
// The options say what is measured. By default it is the selector's: its results tables, or with `drawer` the drawer's
// own. A material page passes `tables: 'main table'` and `through: 'main[data-page]'`: the page's main element clips
// sideways (overflow-x: clip, so nothing widens the page), and content it clips is cut off for the reader rather than
// held, so its clip is not counted as holding what is inside it.
const measureLayout = (screen, { drawer = false, tables: tableSelector = drawer ? '.drawer table.grid' : 'table.grid', through = null } = {}) => evaluate(`(() => {
  const width = ${screen.width};
  const through = ${JSON.stringify(through)};
  const shown = (el, r = el.getBoundingClientRect()) => r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
    + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : '');
  const path = (el) => {
    const parts = [name(el)];
    for (let p = el.parentElement; !el.id && p && p !== document.body; p = p.parentElement) { parts.unshift(name(p)); if (p.id) break; }
    return parts.join(' > ');
  };
  const scrollsSideways = (el) => el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(el).overflowX);
  const holds = new Map();
  const held = (el) => {
    const p = el.parentElement;
    if (!p || p === document.body || p === document.documentElement) return false;
    if (!holds.has(p)) holds.set(p, (!(through && p.matches(through)) && /auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)) || held(p));
    return holds.get(p);
  };
  const spill = new Set(), sideways = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > width + 2 && shown(el, r) && !held(el)) spill.add(path(el));
    if (scrollsSideways(el) && shown(el, r)) sideways.add(path(el));
  }

  const tables = [];
  for (const t of document.querySelectorAll(${JSON.stringify(tableSelector)})) {
    if (!shown(t)) continue;
    const context = t.closest('.excluded-group, .drawer, #lens');
    const label = !context ? 'page' : context.id === 'lens' ? '#lens' : '.' + context.className.trim().split(/\\s+/)[0];
    const cells = [...t.querySelectorAll('td')];
    tables.push({ context: label, cls: typeof t.className === 'string' ? t.className.trim() : '', clipped: cells.filter((td) => td.scrollWidth > td.clientWidth + 1).length, cells: cells.length });
  }

  const reachable = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (!scrollsSideways(p)) continue;
      const r = p.getBoundingClientRect();
      if (r.left >= -2 && r.right <= width + 2) return true;
    }
    return false;
  };
  const offScreen = [...document.querySelectorAll('button, a[href], input, select')].filter((el) => {
    const r = el.getBoundingClientRect();
    return shown(el, r) && (r.left >= width || r.right <= 0) && !reachable(el);
  }).length;

  const rows = (selector) => {
    const boxes = [...document.querySelectorAll(selector)].map((el) => [el, el.getBoundingClientRect()]).filter(([el, r]) => shown(el, r)).map(([, r]) => r);
    if (!boxes.length) return null;
    let n = 0, bottom = -Infinity;
    for (const r of boxes.sort((a, b) => a.top - b.top)) {
      if (r.top >= bottom - 1) { n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom);
    }
    return n;
  };
  const wraps = [['top bar', '.topbar > *'], ['lens tabs', '.lens-bar [data-lens]'], ['status bar', '.statusbar > *'],
    ['shortlist', '#tray > .label, #pins > *, #btn-clear-pins'], ['drawer tabs', '.drawer-tabs > button']]
    .map(([what, selector]) => [what, rows(selector)]).filter(([, n]) => n !== null).map(([what, n]) => what + ' ' + n);

  let legend = null;
  const plot = document.querySelector('#plot'), area = document.querySelector('#plot .nsewdrag'), key = document.querySelector('#plot g.legend');
  if (plot && area && key && shown(plot)) {
    const a = area.getBoundingClientRect(), k = key.getBoundingClientRect();
    const over = k.left < a.right - 1 && k.right > a.left + 1 && k.top < a.bottom - 1 && k.bottom > a.top + 1;
    legend = (over ? 'over the plot' : k.left >= a.right - 1 ? 'beside the plot' : k.top >= a.bottom - 1 ? 'below the plot' : 'clear of the plot')
      + ', plot area ' + Math.round(10 * a.width / plot.getBoundingClientRect().width) * 10 + '% of the chart width';
  }

  const panel = document.querySelector('#drawer-host .drawer');
  return { documentWidth: document.documentElement.scrollWidth, spill: [...spill].sort(), tables, offScreen,
    drawerModal: !!panel && panel.getAttribute('aria-modal') === 'true',
    drawerFullScreen: !!panel && panel.getBoundingClientRect().width >= width - 1,
    drawerEstimates: document.querySelectorAll('.drawer .est').length,
    drawerEstimateCards: document.querySelectorAll('.drawer .est-card:not(.na-card)').length,
    sideways: [...sideways].sort(), wraps, legend };
})()`);

// The layout record of a step as text, and the failures in it. A strict step is one in Confirmed only,
// where the drawer must show no estimate.
const layoutProblems = [];
const notes = {};
const verbose = process.argv.includes('--verbose');
const recordLayout = async (screen, step, { drawer = false, strict = false } = {}) => {
  const key = `30-${screen.name}-${step}`;
  const m = await measureLayout(screen, { drawer });
  const overflow = m.documentWidth > screen.width;
  const list = (title, items, none) => items.length
    ? [`${title}:`, ...items.slice(0, LISTED).map((p) => `  ${p}`), ...(items.length > LISTED ? [`  +${items.length - LISTED} more`] : [])]
    : [`${title}: ${none}`];
  const count = {};
  const tables = m.tables.map((t) => {
    count[t.context] = (count[t.context] ?? 0) + 1;
    const several = m.tables.filter((u) => u.context === t.context).length > 1;
    return { ...t, label: several ? `${t.context} table ${count[t.context]}` : t.context };
  });
  const lines = [
    `viewport ${screen.width}x${screen.height}`,
    `document width ${m.documentWidth}${overflow ? ' OVERFLOW' : ''}`,
    ...list('spill', m.spill, 'none'),
    ...list(drawer ? 'clipped cells in the drawer' : 'clipped cells', tables.map((t) => `${t.label}: ${t.clipped} of ${t.cells}`), 'no table'),
    ...(drawer ? [`drawer: ${m.drawerFullScreen ? 'full screen' : 'side panel'}, ${m.drawerModal ? 'modal' : 'not modal'}`,
      `estimate marks in drawer: ${m.drawerEstimates}`, `estimate cards in drawer: ${m.drawerEstimateCards}`] : []),
    `hidden controls: ${m.offScreen}`,
  ];
  results[key] = lines.join('\n');
  // Which boxes scroll sideways, how many rows a bar wraps to and how much of the chart the plot takes follow the
  // fonts of the machine: a nine-tab strip that just overflows 820 px here fits on Linux Chrome, whose fonts differ.
  // Recorded, those lines failed CI on every push from 944dedd while the layout itself held. They are printed with
  // --verbose; what they were there to show is asserted below as a failure, with room for a font's difference.
  notes[key] = [...list('scrolls sideways', m.sideways, 'none'), `rows: ${m.wraps.join(', ')}`, ...(m.legend ? [`chart legend: ${m.legend}`] : [])];
  const wrap = Object.fromEntries(m.wraps.map((w) => { const i = w.lastIndexOf(' '); return [w.slice(0, i), Number(w.slice(i + 1))]; }));
  if (screen.width < 600 && wrap['top bar'] > 2) layoutProblems.push(`${key}: the top bar wraps to ${wrap['top bar']} rows on a phone (at most 2)`);
  if (screen.width < 1100 && wrap['lens tabs'] > 1) layoutProblems.push(`${key}: the lens tabs wrap to ${wrap['lens tabs']} rows; below 1100 px they are one scrolling strip`);
  if (drawer && m.drawerFullScreen && wrap['drawer tabs'] > 1) layoutProblems.push(`${key}: the full-screen drawer's tabs wrap to ${wrap['drawer tabs']} rows; they are one scrolling strip`);
  if (screen.width < 900 && m.legend && !/^below the plot/.test(m.legend)) layoutProblems.push(`${key}: the chart legend is ${m.legend.split(',')[0]}; below 900 px it sits below the plot`);

  if (overflow) layoutProblems.push(`${key}: the page is ${m.documentWidth} px wide on a ${screen.width} px screen`);
  if (m.spill.length) layoutProblems.push(`${key}: ${m.spill.length} element(s) past the right edge of the screen: ${m.spill.slice(0, 5).join('; ')}${m.spill.length > 5 ? '; ...' : ''}`);
  for (const t of tables) if (t.clipped) layoutProblems.push(`${key}: ${t.clipped} of ${t.cells} cells clipped in ${t.label}`);
  // A drawer that covers the screen hides the page behind it, so it must be a modal dialog: focus kept in it, the page
  // behind inert. A side panel beside usable results must not be one.
  if (drawer && m.drawerFullScreen !== m.drawerModal) layoutProblems.push(`${key}: the drawer is ${m.drawerFullScreen ? 'full screen but not modal' : 'a side panel but modal'}`);
  if (strict && m.drawerEstimates) layoutProblems.push(`${key}: ${m.drawerEstimates} estimate mark(s) in the drawer in Confirmed only`);
  if (strict && m.drawerEstimateCards) layoutProblems.push(`${key}: ${m.drawerEstimateCards} estimate card(s) in the drawer in Confirmed only`);
};

// The material pages (dist/materials/, written by the build beside the selector; opened here from disk, as a reader
// opens them). The slug names the page's file under build/snapshot/ui: 50-page-<screen>-<slug>.txt. The kind is the page's
// own main[data-page]. The materials are a large one (PLA), the middle of the field (PETG), two with fillers (ASA-CF,
// PCTG-GF) and the hardest to print (PEEK); the records pages are the largest and a middle one.
const materialsDir = join(root, 'dist/materials');
const PAGES = [['m001-pla', 'M001.html', 'material'], ['m020-petg', 'M020.html', 'material'], ['m033-asa-cf', 'M033.html', 'material'],
  ['m110-pctg-gf', 'M110.html', 'material'], ['m097-peek', 'M097.html', 'material'], ['index', 'index.html', 'index'],
  ['m001-records', 'M001-records.html', 'records'], ['m110-records', 'M110-records.html', 'records']];
// Run in the page by the Products step. A table of a few hundred products takes it well over the usual 60 s of a call.
const productsCheck = readFileSync(join(root, 'scripts/lib/page-products-check.js'), 'utf8');
const PRODUCTS_MS = 10 * 60 * 1000;
// Where the Products check runs, by page and screen. The table and its script are the same on every page, and the check
// takes 20 to 30 s a page (it waits on every search), five pages on two screens were four and a half minutes of the
// views group (CI's views job): it runs on a table that pages (PETG, 66 products, past the first 25) on the laptop and the phone,
// and on a short one (PCTG-GF, 3 products) on the laptop. Every page still has its sorting checked.
const PRODUCTS_CHECKED = { 'm020-petg': ['laptop', 'phone'], 'm110-pctg-gf': ['laptop'] };
// How far from its line a jump may land a heading, in pixels: the line is the bottom of what covers the top of the screen
// (the sticky bar, the strip where the contents are one, and on a records page the finder where it lies across the page)
// plus the gap the stylesheet sets: 16 px (--anchor-gap), and 8 px (.5rem) for a records page's groups, whose scroll margin
// tables.src.css sets on its own.
const ANCHOR_TOLERANCE = 4;
const ANCHOR_GAP = { material: 16, index: 16, records: 8 };

// Open a page and wait for what a reader waits for: the page's own main element, then its fonts (the faces are data: URIs
// and load when the text first uses them, which moves the layout). The address is checked too, so the page left behind by
// the last step is never mistaken for the new one.
const openPage = async (url) => {
  await send('Page.navigate', { url });
  await until(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('main[data-page]')`, 'the page to render');
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(200);
};

// What the page holds, as names and counts: its sections (and which are empty), its figures, the contents and the fonts.
const pageFacts = () => evaluate(`(() => {
  const main = document.querySelector('main[data-page]');
  const sections = [...main.querySelectorAll('[data-section], section.rs[data-type]')].map((s) => ({
    name: s.dataset.section === 'family' ? 'family ' + s.dataset.family : s.dataset.section ?? 'records ' + s.dataset.type, empty: s.dataset.empty === 'true' }));
  const figures = [...main.querySelectorAll('figure')].map((f) => ({ id: f.id, svg: !!f.querySelector('svg'), caption: (f.querySelector('figcaption')?.textContent ?? '').trim().length > 0 }));
  const toc = document.querySelector('.toc');
  let contents = null;
  if (toc) {
    const r = toc.getBoundingClientRect(), bar = document.querySelector('.topbar').getBoundingClientRect(), m = main.getBoundingClientRect();
    const strip = getComputedStyle(toc).getPropertyValue('--is-strip').trim() === '1';
    contents = { shown: r.width > 0, strip, links: toc.querySelectorAll('a[href^="#"]').length, sticky: getComputedStyle(toc).position === 'sticky',
      // A rail stands left of the text; a strip lies under the top bar and spans the page.
      placed: strip ? Math.abs(r.top - bar.bottom) <= 1 && r.width >= innerWidth - 2 : r.right <= m.left + 1 };
  }
  // A records page's finder replaces the contents: a column beside the groups, or below 1,100 px a bar across the page.
  const rfBox = main.querySelector(':scope > .rf')?.getBoundingClientRect();
  const finder = rfBox && rfBox.width > 0 ? { column: rfBox.width < main.clientWidth * 0.6 } : null;
  // The skip link waits off screen until it is focused; it is not a control the reader cannot reach.
  const skipOff = [...document.querySelectorAll('a.skip')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.left >= innerWidth || r.right <= 0); }).length;
  return { kind: main.dataset.page, sections, figures, contents, finder, skipOff, fonts: [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ''), status: f.status })) };
})()`);

// Lighting a product across the figures: the pointer on a mark lights that product's marks and fades the rest, and
// leaving the figure puts it back; so does the pointer on the product's row in Products. Events are dispatched as the
// browser would deliver them (page.js listens for pointermove on the figure and mouseenter on the row).
const lightingWorks = () => evaluate(`(() => {
  const marks = [...document.querySelectorAll('.fig-plot .mk[data-grade]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const m = marks[0];
  if (!m) return 'no figure mark carries a product';
  const r = m.getBoundingClientRect(), plot = m.closest('.fig-plot');
  const lit = () => document.body.classList.contains('lighting') && document.querySelectorAll('.fig-plot .mk.lit, .fig-plot .wb.lit').length > 0;
  const clear = () => !document.body.classList.contains('lighting') && !document.querySelector('.lit');
  m.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse' }));
  if (!lit()) return 'a mark under the pointer lit no product';
  plot.dispatchEvent(new PointerEvent('pointerleave'));
  if (!clear()) return 'leaving the figure left a product lit';
  const row = [...document.querySelectorAll('table[data-products] tbody tr[data-grade]')].find((t) => t.getAttribute('data-grade') === m.getAttribute('data-grade'));
  if (row) {
    row.dispatchEvent(new MouseEvent('mouseenter'));
    if (!lit()) return 'a product row lit none of its marks';
    row.dispatchEvent(new MouseEvent('mouseleave'));
    if (!clear()) return 'leaving the row left a product lit';
  }
  return 'works';
})()`);

// One click on the first sortable heading of Products must set aria-sort on it.
const sortingWorks = () => evaluate(`(() => {
  const th = [...document.querySelectorAll('table[data-products] thead tr:not(.pt-p) th[data-i]')].find((t) => t.querySelector('button'));
  if (!th) return 'no sortable heading';
  const before = th.getAttribute('aria-sort');
  th.querySelector('button').click();
  const after = th.getAttribute('aria-sort');
  return after && after !== before ? 'works' : 'a click on a heading did not change aria-sort (' + before + ' to ' + after + ')';
})()`);

// Every contents link and every figure anchor, clicked (or, for a figure, put in the address) from the top of the page:
// the target must land within ANCHOR_TOLERANCE of the line under the sticky bar (and strip) plus ANCHOR_GAP, or, when the
// page ends before it can get there, no higher than the line; and a contents link must leave its section marked current
// (aria-current), except at the foot of the page, where the last section is current whatever the click. Returns the count
// and, per failure, a sentence with the measurements.
const checkAnchors = async (kind) => {
  const gap = ANCHOR_GAP[kind];
  // The contents' links that are on screen (a records page's are replaced by its finder), the figures, and a records
  // page's groups, which are reached by their address.
  const targets = await evaluate(`[...document.querySelectorAll('.toc a[href^="#"]')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => ({ href: a.getAttribute('href'), toc: true }))
    .concat([...document.querySelectorAll('figure[id], main section.rs[id]')].map((f) => ({ href: '#' + f.id, toc: false })))`);
  const failures = [];
  for (const t of targets) {
    const r = JSON.parse(await evaluate(`(async () => {
      const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      window.scrollTo(0, 0); history.replaceState(null, '', location.pathname);
      await frames();
      const href = ${JSON.stringify(t.href)};
      const link = document.querySelector('.toc a[href=' + JSON.stringify(href) + ']');
      if (link) link.click(); else location.hash = href;
      await new Promise((done) => setTimeout(done, 120));
      await frames();
      const el = document.getElementById(href.slice(1));
      const bar = document.querySelector('.topbar').getBoundingClientRect().bottom;
      const toc = document.querySelector('.toc'), tocBox = toc.getBoundingClientRect();
      const strip = tocBox.width > 0 && getComputedStyle(toc).getPropertyValue('--is-strip').trim() === '1' ? tocBox.bottom : 0;
      const finder = document.querySelector('main > .rf')?.getBoundingClientRect();
      const across = finder && finder.width > document.querySelector('main').clientWidth * 0.6 ? finder.bottom : 0;
      const covered = Math.max(bar, strip, across);
      const current = document.querySelector('.toc a[aria-current="true"]')?.getAttribute('href');
      // The section the contents should mark: the last whose top is within the reading margin under the bar.
      const line = covered + ${gap} + Math.min(160, innerHeight * 0.25);
      const links = [...document.querySelectorAll('.toc a[href^="#"]')].map((a) => a.getAttribute('href'));
      let want = links[0];
      for (const h of links) { const s = document.getElementById(h.slice(1)); if (s && s.getBoundingClientRect().top <= line) want = h; }
      return JSON.stringify({ top: el.getBoundingClientRect().top, covered, atEnd: scrollY >= document.documentElement.scrollHeight - innerHeight - 1, current, want });
    })()`));
    const line = r.covered + gap;
    const placed = r.atEnd ? r.top >= r.covered - 0.5 : Math.abs(r.top - line) <= ANCHOR_TOLERANCE;
    const marked = !t.toc || r.atEnd || r.current === r.want;
    if (!placed) failures.push(`${t.href} lands at ${r.top.toFixed(1)} px, not ${line.toFixed(1)} (the bar and strip cover ${r.covered.toFixed(1)}${r.atEnd ? ', the page ends' : ''})`);
    else if (!marked) failures.push(`${t.href} was clicked and the contents mark ${r.current ?? 'nothing'}, not ${r.want}`);
  }
  return { checked: targets.length, failures };
};

// One page on one screen as text (50-page-<screen>-<slug>), and the failures in it. Like a layout record it names and
// counts, never positions. The anchor and Products checks drive the page and so run only where a reader scrolls and
// taps differently: the laptop and the phone.
const recordPage = async (screen, [slug, file, kind]) => {
  const key = `50-page-${screen.name}-${slug}`;
  const fail = (what) => layoutProblems.push(`${key}: ${what}`);
  const t0 = Date.now();
  await openPage(pathToFileURL(join(materialsDir, file)).href);
  const m = await measureLayout(screen, { tables: 'main table', through: 'main[data-page]' });
  const facts = await pageFacts();
  if (facts.kind !== kind) fail(`main[data-page] is "${facts.kind}", not "${kind}"`);

  const overflow = m.documentWidth > screen.width;
  const byClass = {};
  for (const t of m.tables) { const c = byClass[t.cls || 'table'] ??= { tables: 0, clipped: 0, cells: 0 }; c.tables++; c.clipped += t.clipped; c.cells += t.cells; }
  const clippedClasses = Object.entries(byClass).filter(([, c]) => c.clipped);
  const lines = [
    `viewport ${screen.width}x${screen.height}`,
    `document width ${m.documentWidth}${overflow ? ' OVERFLOW' : ''}`,
    m.spill.length ? `spill:\n${m.spill.slice(0, LISTED).map((p) => `  ${p}`).join('\n')}${m.spill.length > LISTED ? `\n  +${m.spill.length - LISTED} more` : ''}` : 'spill: none',
    clippedClasses.length ? `clipped cells:\n${clippedClasses.map(([c, v]) => `  ${c}: ${v.clipped} of ${v.cells}`).join('\n')}` : `clipped cells: none in ${m.tables.length} tables`,
    `hidden controls: ${m.offScreen - facts.skipOff}`,
  ];
  if (overflow) fail(`the page is ${m.documentWidth} px wide on a ${screen.width} px screen`);
  if (m.spill.length) fail(`${m.spill.length} element(s) past the right edge of the screen: ${m.spill.slice(0, 5).join('; ')}${m.spill.length > 5 ? '; ...' : ''}`);
  for (const [c, v] of clippedClasses) fail(`${v.clipped} of ${v.cells} cells clipped in ${c}`);
  notes[key] = [`scrolls sideways: ${m.sideways.length ? m.sideways.join('; ') : 'none'}`];

  lines.push(`sections (${facts.sections.length}): ${facts.sections.map((s) => s.name + (s.empty ? ' (empty)' : '')).join(', ') || 'none'}`);
  if (!facts.sections.length) fail('the page holds no section');

  const withSvg = facts.figures.filter((f) => f.svg).length, withCaption = facts.figures.filter((f) => f.caption).length;
  lines.push(`figures: ${facts.figures.length}, with an svg ${withSvg}, with a caption ${withCaption}`);
  for (const f of facts.figures) if (!f.caption) fail(`the figure ${f.id || '(no id)'} has no figcaption`);

  // The contents: a sticky rail from 1,080 px, a strip below that. A records page has none: its finder replaces them, as a
  // column from 1,100 px and as a bar across the page below that.
  const c = facts.contents;
  if (kind === 'records') {
    if (!facts.finder) { lines.push('finder: none'); fail('the records finder is not shown'); }
    else {
      lines.push(`finder: ${facts.finder.column ? 'column' : 'bar'}, contents replaced`);
      if (facts.finder.column !== (screen.width >= 1100)) fail(`the finder is a ${facts.finder.column ? 'column' : 'bar'} on a ${screen.width} px screen; it is a ${screen.width >= 1100 ? 'column' : 'bar'} there`);
      if (c?.shown) fail('the contents strip is shown beside the finder, which replaces it');
    }
  } else if (!c) { lines.push('contents: none'); fail('the page has no contents'); }
  else {
    const wantRail = screen.width >= 1080;
    lines.push(`contents: ${c.strip ? 'strip' : 'rail'}, ${c.links} links${c.sticky ? ', sticky' : ''}`);
    if (!c.shown) fail('the contents are not shown');
    if (c.strip === wantRail) fail(`the contents are a ${c.strip ? 'strip' : 'rail'} on a ${screen.width} px ${kind} page; they are a ${wantRail ? 'rail' : 'strip'} there`);
    if (!c.sticky) fail('the contents are not sticky');
    if (!c.placed) fail(`the ${c.strip ? 'strip is not under the top bar across the page' : 'rail is not left of the text'}`);
    if (!c.links) fail('the contents have no link');
  }

  // Both families must have a face that is loaded; a face that is in error, or a family with none loaded, is a page set in
  // a fallback. A face a page never sets (an italic) stays unloaded and is not a failure.
  const family = (name) => {
    const faces = facts.fonts.filter((f) => f.family === name);
    return faces.some((f) => f.status === 'loaded') ? 'loaded' : faces.some((f) => f.status === 'error') ? 'error' : faces.length ? 'not loaded' : 'absent';
  };
  const fonts = ['Inter', 'Newsreader'].map((name) => [name, family(name)]);
  lines.push(`fonts: ${fonts.map(([n, s]) => `${n} ${s}`).join(', ')}`);
  for (const [n, s] of fonts) if (s !== 'loaded') fail(`the font ${n} is ${s}`);
  const broken = facts.fonts.filter((f) => f.status === 'error');
  if (broken.length) fail(`${broken.length} font face(s) failed to load: ${broken.map((f) => f.family).join(', ')}`);

  const hasProducts = await evaluate(`!!document.querySelector('table[data-products]')`);
  if (kind === 'material') {
    const lit = await lightingWorks();
    lines.push(`lighting: ${lit}`);
    if (lit !== 'works') fail(`lighting: ${lit}`);
  }
  if (hasProducts) {
    const sorted = await sortingWorks();
    lines.push(`sorting: ${sorted}`);
    if (sorted !== 'works') fail(`sorting: ${sorted}`);
  } else if (kind === 'material') { lines.push('sorting: no Products table'); fail('a material page without a Products table'); }

  if (screen.name !== 'tablet') {
    const anchors = await checkAnchors(kind);
    lines.push(`anchors: ${anchors.checked} checked`);
    for (const a of anchors.failures) fail(`anchor ${a}`);
    if (!anchors.checked) fail('no contents link or figure to check');
    if (hasProducts && PRODUCTS_CHECKED[slug]?.includes(screen.name)) {
      const t1 = Date.now();
      let r;
      try { r = await evaluate(productsCheck, PRODUCTS_MS); } catch (e) { r = { error: e.message }; }
      if (r.error) { lines.push('products: could not run'); fail(`the Products check could not run: ${r.error}`); }
      else {
        lines.push(`products: ${r.checks} checks`);
        if (r.failures) fail(`${r.failures} of ${r.checks} Products checks failed, the first ${JSON.stringify(r.first)}`);
        if (!r.checks) fail('the Products check ran no check');
      }
      notes[key].push(`Products check ${((Date.now() - t1) / 1000).toFixed(1)} s`);
    }
  }
  notes[key].push(`page ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  results[key] = lines.join('\n');
};

try {
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/favicon/.test(msg.params.entry.text)) errors.push(msg.params.entry.text);
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

  // The selector's own steps; --only pages leaves them out.
  if (!onlyPages) {
    await open(pageUrl);
    results['01-default'] = await tableView();

    const templates = await evaluate(`[...document.querySelectorAll('[data-template]')].map((b) => b.innerText.split('\\n')[0].trim())`);
    if (!templates.length) throw new Error('the start screen shows no templates');
    for (const [i, name] of templates.entries()) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await open(pageUrl);
      await click(`[data-template="${i}"]`);
      await sleep(200);
      results[`10-${slug}-strict`] = await tableView();
      await click('#mode-explore');
      await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
      await sleep(200);
      // D137: expanding insufficient evidence changes presentation only. All rows
      // remain in the result set, and the displayed count must stay unchanged.
      const grouping = await evaluate(`(() => {
        const d = document.querySelector('details.insufficient-evidence');
        if (!d) return [];
        const problems = [], count = document.getElementById('count').textContent;
        const ids = () => [...document.querySelectorAll('#lens tbody tr[data-material]')].map((r) => r.dataset.material).join(',');
        const before = ids();
        if (d.open) problems.push('insufficient evidence starts expanded');
        d.open = true;
        if (ids() !== before || document.getElementById('count').textContent !== count) problems.push('expansion changes rows or counts');
        if (!d.querySelector('tr[data-material]')?.getBoundingClientRect().height) problems.push('expansion does not reveal options');
        d.open = false;
        return problems;
      })()`);
      errors.push(...grouping.map((p) => `${name}: ${p}`));
      // The shared-link check below compares the whole text; the record keeps the summary.
      const explore = await view();
      results[`11-${slug}-explore-estimates`] = await tableView();
      // A shared link must reproduce the view in a fresh page.
      // The app writes the link 250 ms after the last change (pushHash); wait for it rather than guess.
      await until(`location.hash.length > 1`, 'the shareable link');
      await sleep(400);
      const hash = await evaluate('location.hash');
      await send('Page.navigate', { url: 'about:blank' });
      await sleep(300);
      await open(`${pageUrl}${hash}`);
      const reopened = await view();
      if (reopened !== explore) {
        const a = explore.split('\n'), b = reopened.split('\n');
        const at = a.findIndex((line, j) => line !== b[j]);
        errors.push(`${name}: the shared link does not reproduce the Explore view (hash ${hash.slice(0, 120)}; first difference at line ${at + 1}: "${a[at]}" vs "${b[at]}")`);
      }
    }

    await open(pageUrl);
    await click('[data-template="0"]');
    await click('#mode-explore');
    const pins = await evaluate(`[...document.querySelectorAll('#lens [data-pin]')].slice(0, 3).map((b) => (b.click(), b.dataset.pin))`);
    if (pins.length < 3) errors.push(`only ${pins.length} rows to pin`);
    await sleep(200);
    await click('[data-lens="compare"]');
    await sleep(300);
    results['20-compare-three-pins'] = await view();

    // The drawer of the largest material, in Explore with estimates: Grades by maker and Mechanical by property, each
    // group one collapsed line, so the text is the summaries and the open maker's grades with their estimate lines.
    await open(pageUrl);
    await click('#mode-explore');
    await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await click('#lens tr[data-material="M001"]');
    await until(`!!document.querySelector('.drawer')`, 'the PLA drawer');
    const drawerText = () => evaluate(`(document.querySelector('.drawer-body')?.innerText ?? 'NO DRAWER').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim().split('\\n').slice(0, 80).join('\\n')`);
    await click('.drawer [data-tab="Grades"]');
    await sleep(200);
    results['13-drawer-pla-grades'] = await drawerText();
    await click('.drawer [data-tab="Mechanical"]');
    await sleep(200);
    results['13-drawer-pla-mechanical'] = await drawerText();
    // A drawer comparison (D133, D139), opened: its rows of dots and their counts, its table and the lines under it. Notched
    // Charpy beside notched Izod: PLA is the largest; ABS has products that publish both tests; HIPS has a pair on a
    // comparable basis. Tensile XY beside Z, and flexural (D140): PLA, and PETG with the most products that publish a Z strength. Heat
    // deflection beside the glass transition: PLA, and ABS with the most products that publish HDT at 1.8 MPa.
    const comparisonText = (name) => evaluate(`(() => { const s = document.querySelector('.drawer-body .imp-compare[data-comparison="${name}"]'); if (!s) return 'NO COMPARISON';
      for (let d = s.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
      for (const d of s.querySelectorAll('details')) d.open = true;
      return s.innerText.replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim().split('\\n').slice(0, 60).join('\\n'); })()`);
    // A dot selected stays on its tab and opens the record it stands for in its heading's list (D133), not Sources.
    const dotText = (name) => evaluate(`(() => { const s = document.querySelector('.drawer-body .imp-compare[data-comparison="${name}"]');
      const d = s?.querySelector('.imp-dot[data-row].claimed') ?? s?.querySelector('.imp-dot[data-row]'); if (!d) return 'NO DOT'; d.click(); return true; })()`)
      .then(() => sleep(300)).then(() => evaluate(`(() => { const t = document.querySelector('.drawer-body .evidence-row.target');
      return ['Tab: ' + document.querySelector('.drawer [data-tab][aria-selected="true"]')?.dataset.tab, 'List open: ' + !!t?.closest('details')?.open,
        ...(t?.innerText ?? 'NO RECORD MARKED').replace(/[ \\t]+/g, ' ').split('\\n').filter(Boolean).slice(0, 3)].join('\\n'); })()`));
    results['13-drawer-pla-impact'] = await comparisonText('Impact tests');
    results['13-drawer-pla-impact-dot'] = await dotText('Impact tests');
    results['13-drawer-pla-tensile'] = await comparisonText('Tensile tests, XY and Z');
    results['13-drawer-pla-tensile-dot'] = await dotText('Tensile tests, XY and Z');
    results['13-drawer-pla-flexural'] = await comparisonText('Flexural tests, XY and Z');
    await click('.drawer [data-tab="Thermal"]');
    await sleep(200);
    results['13-drawer-pla-heat'] = await comparisonText('Heat deflection and glass transition');
    // Print temperatures across products (D139): PLA, the largest; then a dot selected opens its profile in its maker's
    // list below; PEEK, whose every product is outside the H2C's limits; ABS, with chambers part of whose window is above.
    await click('.drawer [data-tab="Printing"]');
    await sleep(200);
    results['13-drawer-pla-print'] = await comparisonText('Print temperatures across products');
    await evaluate(`(() => { const d = document.querySelector('.drawer-body .print-block .imp-dot[data-profile]'); d.click(); return true; })()`);
    await sleep(300);
    results['13-drawer-pla-print-dot'] = await evaluate(`(() => { const t = document.querySelector('.drawer-body .profile-block.target');
      return ['Tab: ' + document.querySelector('.drawer [data-tab][aria-selected="true"]')?.dataset.tab, 'List open: ' + !!t?.closest('details')?.open,
        ...(t?.innerText ?? 'NO PROFILE MARKED').replace(/[ \\t]+/g, ' ').split('\\n').filter(Boolean).slice(0, 3)].join('\\n'); })()`);
    const TABS = { impact: 'Mechanical', tensile: 'Mechanical', heat: 'Thermal', print: 'Printing' };
    const NAMES = { impact: 'Impact tests', tensile: 'Tensile tests, XY and Z', heat: 'Heat deflection and glass transition', print: 'Print temperatures across products' };
    for (const [id, name, views] of [['M027', 'abs', ['impact', 'heat', 'print']], ['M081', 'hips', ['impact']], ['M020', 'petg', ['tensile']], ['M097', 'peek', ['print']]]) {
      await click(`#lens tr[data-material="${id}"]`);
      await until(`!!document.querySelector('.drawer [data-tab="Mechanical"]')`, `the ${name} drawer`);
      for (const view of views) {
        await click(`.drawer [data-tab="${TABS[view]}"]`);
        await sleep(200);
        results[`13-drawer-${name}-${view}`] = await comparisonText(NAMES[view]);
      }
    }

    // A material answered by its products (D83): the stiff-fixture template ranked by specific stiffness, each row its
    // place and best product; then the first-ranked material's Products tab, where the products that pass come first with
    // how to print them and what their makers say. (It was PA12-CF's until D101 asked every template the print gates, and
    // PA12-CF's passing product has no recipe the H2C can be judged by.)
    await open(pageUrl);
    await click('[data-template="4"]');
    await evaluate(`(() => { const s = document.querySelector('[data-rank-by]'); s.value = 'tie-stiffness'; s.dispatchEvent(new Event('change')); return true; })()`);
    await sleep(200);
    results['14-ranked-stiffness'] = await tableView();
    await click('#lens tbody tr[data-material]:not(.baseline-row)');
    await until(`!!document.querySelector('.drawer')`, 'the first-ranked material\'s drawer');
    await click('.drawer [data-tab="Grades"]');
    await sleep(200);
    results['14-drawer-first-ranked-products'] = await drawerText();
    // What makers say (re-center lane 3): the material's count per topic, then each product's statements in its maker's
    // words with source and page, or the sentence that names the maker whose sheet is silent.
    results['15-drawer-first-ranked-maker-says'] = await evaluate(`[...document.querySelectorAll('.drawer-body .print-counts, .drawer-body .maker-says, .drawer-body .maker-says-gap')].map((e) => e.innerText || e.textContent).join('\\n').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim().split('\\n').slice(0, 60).join('\\n')`);

    // A product chosen (D103): its decision record under Save / share, with its answer, release and brief.
    await click('.drawer .pass-block [data-choose]');
    await sleep(200);
    await click('#btn-scenario');
    await until(`!!document.querySelector('.chosen')`, 'the chosen product in Save / share');
    results['16-chosen-product'] = await evaluate(`[...document.querySelectorAll('.chosen')].map((e) => e.innerText).join('\\n').replace(/[ \\t]+/g, ' ').replace(/release [0-9a-f]{12}/g, 'release <id>').replace(/chosen \\d{4}-\\d{2}-\\d{2}/g, 'chosen <date>').trim()`);
    // The family rail: a family, then one of its polymers. The rail's own text is recorded with the view, because its
    // counts are the only ones in the rail that follow the other requirements.
    const rail = () => evaluate(`(document.querySelector('.family-facet')?.innerText ?? 'NO FAMILY RAIL').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim()`);
    await open(pageUrl);
    await click('[data-family="Nylon / Polyamide"]');
    await sleep(200);
    results['12-family-nylon'] = [await tableView(), 'RAIL', await rail()].join('\n');
    await click('[data-polymer="Nylon / Polyamide › PA6"]');
    await sleep(200);
    results['12-family-nylon-pa6'] = [await tableView(), 'RAIL', await rail()].join('\n');

    // Layout on each screen. The emulation is cleared afterwards so nothing after this section inherits a screen.
    const when = (selector, ms = 150) => until(`!!document.querySelector(${JSON.stringify(selector)})`, selector).then(() => sleep(ms));
    try {
      for (const screen of SCREENS) {
        await send('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: 1, mobile: screen.mobile });
        await send('Emulation.setTouchEmulationEnabled', { enabled: screen.mobile });

        await open(pageUrl);
        await recordLayout(screen, 'default');
        // Below 1100 px the filter rail covers the results when open, so it is a modal dialog (F10): Shift+Tab from its
        // close button stays inside it, and Escape closes it and returns focus to Filters.
        if (screen.width < 1100) {
          await click('#btn-filters');
          const inside = await evaluate(`(() => { const r = document.getElementById('rail'); return r.getAttribute('aria-modal') === 'true' && document.querySelector('.topbar').inert && r.contains(document.activeElement); })()`);
          for (let i = 0; i < 3; i++) {
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
          }
          const kept = await evaluate(`document.getElementById('rail').contains(document.activeElement)`);
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
          const back = await evaluate(`document.activeElement?.id === 'btn-filters' && !document.querySelector('.topbar').inert && document.getElementById('rail').getAttribute('aria-modal') === null`);
          if (!inside) layoutProblems.push(`${screen.name}-filters: the open filter rail is not a modal dialog over an inert page`);
          if (!kept) layoutProblems.push(`${screen.name}-filters: Shift+Tab left the open filter rail`);
          if (!back) layoutProblems.push(`${screen.name}-filters: Escape did not close the rail and return focus to Filters`);
        }
        // Still a fresh page in Confirmed only: the drawer there must hold no estimate.
        const opened = await evaluate(`(() => { const tr = [...document.querySelectorAll('#lens tr[data-material]')].find((row) => row.cells[0]?.innerText.trim().startsWith('ABS-CF')); tr?.click(); return !!tr; })()`);
        if (!opened) throw new Error(`${screen.name}: no ABS-CF row in the default table`);
        await when('.drawer');
        await recordLayout(screen, 'strict-drawer', { drawer: true, strict: true });

        await open(pageUrl);
        await click('[data-template="0"]');
        await click('#mode-explore');
        await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
        for (const id of ['s-fail', 's-screened']) await evaluate(`(() => { const b = document.getElementById('${id}'); if (b && !b.hidden && !b.disabled) b.click(); return true; })()`);
        const pinned = await evaluate(`[...document.querySelectorAll('#lens [data-pin]')].slice(0, 3).map((b) => (b.click(), b.dataset.pin))`);
        if (pinned.length < 3) errors.push(`${screen.name}: only ${pinned.length} rows to pin`);
        await sleep(200);
        await recordLayout(screen, 'explore');


        await click('[data-lens="table"]');
        await click('[data-colset="properties"]');
        await sleep(150);
        await recordLayout(screen, 'table');
        await click('[data-colset="printing"]');
        await sleep(150);
        await recordLayout(screen, 'table-printing');
        await click('[data-colset="properties"]');

        await click('[data-lens="ashby"]');
        await when('#plot .main-svg', 300);
        if (await evaluate(`(() => { const c = document.querySelector('[data-show-estimates]'); if (!c || c.checked) return false; c.click(); return true; })()`)) await when('#plot .main-svg', 300);
        await recordLayout(screen, 'ashby');
        for (const lens of ['parallel', 'coverage', 'compare', 'explain']) {
          await click(`[data-lens="${lens}"]`);
          await sleep(200);
          await recordLayout(screen, lens);
        }

        await click('[data-lens="table"]');
        await sleep(150);
        await click('#lens tr[data-material]');
        await when('.drawer');
        await recordLayout(screen, 'drawer-overview', { drawer: true });
        // The measurement tabs too: their source headings, footers and collapsed paragraphs are the drawer's longest text.
        // The Sources tab keeps its internal key, Evidence.
        for (const [tab, step] of [['Mechanical', 'mechanical'], ['Printing', 'printing'], ['Price', 'price'], ['Evidence', 'sources']]) {
          await click(`.drawer [data-tab="${tab}"]`);
          await when(`.drawer [data-tab="${tab}"][aria-selected="true"]`);
          await recordLayout(screen, `drawer-${step}`, { drawer: true });
        }
      }
      // The answer before the exposition (the review of 2026-09-27, F09), on the plan's own laptop, 1024 x 768: a template's
      // first three candidate rows show without scrolling, and a material's Products tab opens on a product that passes,
      // its verdict, state and recipe in the drawer's first view.
      await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
      await open(pageUrl);
      await click('[data-template="3"]');
      await sleep(200);
      const rowsInView = await evaluate(`[...document.querySelectorAll('#lens tbody tr[data-material]')].filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight).length`);
      if (rowsInView < 3) layoutProblems.push(`1024x768-warm: ${rowsInView} candidate row(s) in view before scrolling; at least 3 should be`);
      await click('#lens tbody tr[data-material]');
      await when('.drawer');
      await click('.drawer [data-tab="Grades"]');
      await sleep(200);
      const firstView = await evaluate(`(() => { const body = document.querySelector('.drawer-body'); const b = body?.querySelector('.pass-block .grade-block'); if (!b) return 'no passing product block'; const bottom = body.getBoundingClientRect().bottom; const card = b.querySelector('.print-card'); return b.getBoundingClientRect().top < bottom && (!card || card.getBoundingClientRect().top < bottom) ? 'ok' : 'below the first view'; })()`);
      if (firstView !== 'ok') layoutProblems.push(`1024x768-warm-products: the first passing product and its recipe are ${firstView}`);

      // The Ashby decision workspace (D107; 02-MAKEOVER-SPEC): the review's H2C beam, its goal chosen. At 1440 x 900, with
      // the filters hidden (a reader's Hide), the plot has at least 700 x 450 px of plotting area; at 1024 x 768, with the
      // results under it, at least 520 x 360. The line and its count sit above the chart, and the whole exercise, from the
      // line to an exact product in the inspector, is done from the keyboard.
      const beam = { x: 2, c: [{ kind: 'gate', gate: 'scope' }, ...['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate })),
        { kind: 'numeric', property: 'tensileModulusXY', operator: '>=', value: 3, mandatory: true }, { kind: 'numeric', property: 'density', operator: '<=', value: 1250, mandatory: true }],
      u: 'strict', s: [], r: 'beam-stiffness', p: { x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true, view: 'decision' }, l: 'ashby', e: false };
      // A query makes it a new document, so the rail's hidden state set just before is read at start, as on a reload.
      const beamUrl = `${pageUrl}?workspace=1#${encodeURIComponent(JSON.stringify(beam))}`;
      const plotArea = () => evaluate(`(() => { const a = document.querySelector('#plot .nsewdrag')?.getBoundingClientRect(), l = document.querySelector('.ws-line')?.getBoundingClientRect();
        return a ? { w: Math.round(a.width), h: Math.round(a.height), top: Math.round(a.top), line: l ? Math.round(l.bottom) : null } : null; })()`);
      for (const [width, height, rail, minW, minH] of [[1440, 900, 'hidden', 700, 450], [1024, 768, null, 520, 360]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        await open(pageUrl);
        await evaluate(`(() => { try { ${rail ? `localStorage.setItem('h2c-rail', '${rail}')` : "localStorage.removeItem('h2c-rail')"}; } catch {} return true; })()`);
        await open(beamUrl);
        await when('#plot .main-svg', 400);
        const a = await plotArea();
        const where = `${width}x${height}-ashby-decision`;
        if (!a) layoutProblems.push(`${where}: no plot`);
        else {
          if (a.w < minW || a.h < minH) layoutProblems.push(`${where}: the plotting area is ${a.w} x ${a.h} px; at least ${minW} x ${minH}`);
          if (a.line === null || a.line > a.top) layoutProblems.push(`${where}: the line's control is not above the chart it moves`);
        }
      }
      await evaluate(`(() => { try { localStorage.removeItem('h2c-rail'); } catch {} return true; })()`);
      // The view as a reader sees it, and then the keyboard: a step of the line, then an exact product from the list.
      await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 760, deviceScaleFactor: 1, mobile: false });
      await open(beamUrl);
      await when('#plot .main-svg', 400);
      results['40-ashby-beam-decision'] = await view();
      // Enter as a keyboard types it, with its character, which is what activates a focused button.
      const key = async () => {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      };
      const before = await evaluate(`document.querySelector('[data-line-m]').value`);
      await evaluate(`document.querySelector('[data-line-step="1"]').focus(), true`);
      await key();
      await sleep(300);
      const stepped = await evaluate(`document.querySelector('.ws-line-readout')?.innerText.replace(/\\s+/g, ' ').trim()`);
      if (await evaluate(`document.querySelector('[data-line-m]').value`) === before) layoutProblems.push('ashby-keyboard: Enter on the line\'s step did not move the line');
      if (!(await evaluate(`document.activeElement?.dataset?.lineStep === '1'`))) layoutProblems.push('ashby-keyboard: focus left the line\'s step after it moved the line');
      // A material's list is written when it is opened.
      await evaluate(`(async () => { const d = document.querySelector('.ws-mat-pairs'); d.open = true; await new Promise((r) => setTimeout(r, 50)); d.querySelector('[data-inspect]').focus(); return true; })()`);
      await key();
      await sleep(300);
      const inspected = await evaluate(`(() => { const i = document.querySelector('.ws-inspector'); return i ? { focused: i.contains(document.activeElement) || i === document.activeElement, text: i.innerText.replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim() } : null; })()`);
      if (!inspected) layoutProblems.push('ashby-keyboard: Enter on a product state in the list opened no inspector');
      else if (!inspected.focused) layoutProblems.push('ashby-keyboard: the inspector opened without taking focus');
      results['41-ashby-keyboard'] = [`LINE STEPPED ${stepped}`, 'INSPECTOR', inspected?.text ?? 'none'].join('\n');
      // Nothing a press does elsewhere moves the reader (D109): the list keeps its search, its scroll and its open folds, and
      // the chart its zoom, through a change of scale, a chip, a star and a step of the line; a pick fades, never zooms.
      await open(beamUrl);
      await when('#plot .main-svg', 400);
      const kept = await evaluate(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const problems = [];
        const list = () => document.querySelector('[data-list]');
        const f = document.querySelector('[data-list-filter]'); f.value = 'CF'; f.dispatchEvent(new Event('input', { bubbles: true }));
        const shown = [...document.querySelectorAll('.ws-mat')].filter((li) => !li.hidden).length;
        document.querySelector('.ws-mat-pairs').open = true; await wait(50);
        Plotly.relayout(document.getElementById('plot'), { 'xaxis.range': [Math.log10(1100), Math.log10(1200)], 'yaxis.range': [Math.log10(3), Math.log10(6)] }); await wait(300);
        document.querySelector('button[data-layer="front"]').click(); await wait(400);
        document.querySelector('[data-line-step="1"]').click(); await wait(400);
        document.querySelector('[data-pin]').click(); await wait(400);
        if (document.querySelector('[data-list-filter]').value !== 'CF') problems.push('the list lost its search');
        if ([...document.querySelectorAll('.ws-mat')].filter((li) => !li.hidden).length !== shown) problems.push('the list showed other materials');
        if (!document.querySelector('.ws-mat-pairs[open]')) problems.push('an open list of products closed');
        const x = document.getElementById('plot').layout.xaxis.range.map((v) => Math.round(10 ** v));
        if (x[0] !== 1100 || x[1] !== 1200) problems.push('the zoom was lost: ' + x.join('-'));
        if (!document.querySelector('[data-zoom-reset]')) problems.push('no Show all on a zoomed chart');
        document.querySelector('[data-select-material][aria-pressed="false"]').click(); await wait(400);
        const x2 = document.getElementById('plot').layout.xaxis.range.map((v) => Math.round(10 ** v));
        if (x2[0] !== 1100 || x2[1] !== 1200) problems.push('picking a material moved the chart');
        if (!document.querySelector('[data-unpick]')) problems.push('a picked material has no way back on the chart');
        document.querySelector('[data-pin][aria-pressed="true"]')?.click(); await wait(300);
        return problems;
      })()`);
      for (const k of kept) layoutProblems.push(`ashby-keeps-place: ${k}`);
      // Mark after mark, pressed on the chart as a mouse does (D110): the details replace the list and are swapped in place,
      // nothing piles up behind them, and "Ranking" brings the list back with its open folds as they were.
      await evaluate(`document.querySelector('[data-zoom-reset]')?.click(), true`);
      await sleep(500);
      await evaluate(`document.getElementById('plot').scrollIntoView({ block: 'center' }), true`);
      await sleep(200);
      const foldsBefore = await evaluate(`({ folds: document.querySelectorAll('.ws-mat-pairs[open]').length })`);
      const keys = await evaluate(`[...new Set([...document.getElementById('plot').data].flatMap((t) => (Array.isArray(t.customdata) && t.customdata[0]?.length === 9 ? t.customdata.map((c) => c[8]) : [])))]`);
      const opened = [];
      for (const key of keys) {
        const at = await evaluate(`(() => { const gd = document.getElementById('plot'), xa = gd._fullLayout.xaxis, ya = gd._fullLayout.yaxis, r = gd.querySelector('.nsewdrag').getBoundingClientRect();
          for (const t of gd.data) if (Array.isArray(t.customdata) && t.customdata[0]?.length === 9) { const i = t.customdata.findIndex((c) => c[8] === ${JSON.stringify(key)}); if (i >= 0) { const p = [r.left + xa.d2p(t.x[i]), r.top + ya.d2p(t.y[i])]; return p[0] > r.left + 4 && p[0] < r.right - 4 && p[1] > r.top + 30 && p[1] < Math.min(r.bottom, innerHeight) - 4 ? p : null; } }
          return null; })()`);
        if (!at) continue;
        if (opened.length >= 4) break;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at[0], y: at[1] });
        await sleep(120);
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at[0], y: at[1], button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at[0], y: at[1], button: 'left', clickCount: 1 });
        await sleep(400);
        opened.push(await evaluate(`({ list: !!document.querySelector('[data-list]'), panels: document.querySelectorAll('.ws-results').length, details: document.querySelectorAll('.ws-inspector').length })`));
      }
      if (!opened.length) layoutProblems.push('ashby-details: no mark could be pressed');
      for (const o of opened) {
        if (o.list) { layoutProblems.push('ashby-details: the list stayed under the details'); break; }
        if (o.panels !== 1 || o.details !== 1) { layoutProblems.push('ashby-details: more than one details panel'); break; }
      }
      await evaluate(`document.querySelector('[data-inspect-close]')?.click(), true`);
      await sleep(400);
      const after = await evaluate(`({ list: !!document.querySelector('[data-list]'), folds: document.querySelectorAll('.ws-mat-pairs[open]').length })`);
      // Material typicals is one dot per material, nothing drawn around it, and each dot says what it stands for and where
      // its passing products are (D112).
      await open(`${pageUrl}?typicals=1#${encodeURIComponent(JSON.stringify({ ...beam, p: { ...beam.p, view: 'catalogue' } }))}`);
      await when('#plot .main-svg', 400);
      const typ = await evaluate(`(() => { const d = document.getElementById('plot').data; const dots = d.filter((t) => Array.isArray(t.customdata) && t.customdata[0]?.length === 8);
        return { dots: dots.reduce((n, t) => n + t.x.length, 0), materials: new Set(dots.flatMap((t) => t.customdata.map((c) => c[0]))).size, around: d.filter((t) => / spread$/.test(t.name ?? '')).length,
          notes: dots.flatMap((t) => t.customdata.map((c) => c[7])), link: !!document.querySelector('.ws-summary [data-view="overview"]') }; })()`);
      if (!typ.dots) layoutProblems.push('ashby-typicals: no dot drawn');
      if (typ.dots !== typ.materials) layoutProblems.push(`ashby-typicals: ${typ.dots} dots for ${typ.materials} materials`);
      if (typ.around) layoutProblems.push(`ashby-typicals: ${typ.around} spreads drawn around the dots`);
      if (typ.notes.some((n) => !/^Whole material, all its products/.test(n) || !/Material ranges/.test(n))) layoutProblems.push('ashby-typicals: a dot does not say it is the whole material, or where its passing products are');
      if (!typ.link) layoutProblems.push('ashby-typicals: no way to Material ranges under the chart');
      if (!after.list) layoutProblems.push('ashby-details: Ranking did not bring the list back');
      else if (after.folds !== foldsBefore.folds) layoutProblems.push(`ashby-details: open folds changed behind the details (${foldsBefore.folds} to ${after.folds})`);
    } finally {
      await send('Emulation.clearDeviceMetricsOverride');
      await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  }

  // The material pages, on the same three screens. A page the build did not write is a failure: the pages are part of what
  // it builds (npm run build, without --no-pages).
  const missing = PAGES.filter(([, file]) => !existsSync(join(materialsDir, file))).map(([, file]) => file);
  if (missing.length) errors.push(`dist/materials lacks ${missing.join(', ')}; run npm run build`);
  else {
    try {
      for (const screen of SCREENS) {
        await send('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: 1, mobile: screen.mobile });
        await send('Emulation.setTouchEmulationEnabled', { enabled: screen.mobile });
        for (const page of PAGES) await recordPage(screen, page);
      }
    } finally {
      await send('Emulation.clearDeviceMetricsOverride');
      await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  }
} catch (e) {
  errors.push(e.message);
} finally {
  try { ws?.close(); } catch { /* closed */ }
  proc.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}

// When the page was built is not something a reader's view should be pinned to: the Compare export preamble prints
// it, so a snapshot written yesterday failed every run today, on this branch and on main alike. build-diff already
// drops meta.build for the same reason. The database snapshot date stays, because that is a fact about the data.
// A release ID changes with every change to what decides (D96), which a view's text is not about: it is masked as the
// build date is, and a change of release shows in the views only where it changes what they say.
for (const k of Object.keys(results)) results[k] = results[k].replace(/\bbuild \d{4}-\d{2}-\d{2}\b/g, 'build <date>').replace(/\b([Rr]elease) [0-9a-f]{12}\b/g, '$1 <id>');

if (errors.length) { console.error(`ui:check: ${errors.length} page error(s)\n  ${errors.join('\n  ')}`); process.exit(1); }
const empty = Object.entries(results).filter(([, text]) => text.split('\n').length < 3).map(([k]) => k);
if (empty.length) { console.error(`ui:check: empty view(s): ${empty.join(', ')}`); process.exit(1); }

if (write) {
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.endsWith('.txt') && (!onlyPages || f.startsWith('50-page-'))) rmSync(join(outDir, f));
  for (const [k, text] of Object.entries(results)) writeFileSync(join(outDir, `${k}.txt`), `${text}\n`);
  console.log(`ui:check: wrote ${Object.keys(results).length} views to build/snapshot/ui`);
} else {
  const committed = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.txt') && (!onlyPages || f.startsWith('50-page-'))).map((f) => f.slice(0, -4)) : [];
  const changed = Object.entries(results).filter(([k, text]) => !existsSync(join(outDir, `${k}.txt`)) || readFileSync(join(outDir, `${k}.txt`), 'utf8') !== `${text}\n`).map(([k]) => k);
  const gone = committed.filter((k) => !(k in results));
  if (changed.length || gone.length) {
    console.error(`ui:check: ${changed.length} view(s) differ from build/snapshot/ui${changed.length ? ` (${changed.join(', ')})` : ''}${gone.length ? `; missing: ${gone.join(', ')}` : ''}. Review, then npm run ui:check -- --write`);
    // The lines that differ, so a failure on another machine (CI) says what moved instead of only naming the view.
    for (const k of changed) {
      const path = join(outDir, `${k}.txt`);
      const was = existsSync(path) ? readFileSync(path, 'utf8').trimEnd().split('\n') : [];
      const now = results[k].split('\n');
      const lost = was.filter((l) => !now.includes(l)), added = now.filter((l) => !was.includes(l));
      console.error(`  ${k}:${lost.slice(0, 8).map((l) => `\n    - ${l}`).join('')}${added.slice(0, 8).map((l) => `\n    + ${l}`).join('')}`);
    }
    process.exitCode = 1;
  } else console.log(`ui:check: ${Object.keys(results).length} views match build/snapshot/ui`);
}
if (verbose) for (const [k, lines] of Object.entries(notes)) console.log(`${k}\n  ${lines.join('\n  ')}`);
if (layoutProblems.length) {
  console.error(`ui:check: ${layoutProblems.length} layout failure(s)\n  ${layoutProblems.join('\n  ')}`);
  process.exitCode = 1;
} else console.log(`ui:check: no layout failures on the laptop, tablet and phone screens${onlyPages ? ' (the pages only)' : ' and in the pages'}`);
