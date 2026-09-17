#!/usr/bin/env node
// Interface regression check: drive the built self-contained page in headless Chrome and record what a reader sees
// at each step, as text under build/snapshot/ui/. A change to the engine, the labels or the data shows up there as
// a reviewable diff; an exception or an empty view fails.
//
// Steps: the default view; every application template in Strict and in Explore with estimates; the Explore link
// reopened in a fresh page (a shared link must reproduce the view); three pins in Compare.
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
//   npm run ui:check                     compare with build/snapshot/ui; exit 1 on a difference, a page error or any
//                                        layout failure those files record, listed by step
//   npm run ui:check -- --write          rewrite build/snapshot/ui (still exit 1 on a layout failure)
//   npm run ui:check -- --verbose        also print, per screen step, what follows the machine's fonts and is therefore
//                                        not recorded: boxes that scroll sideways, rows each bar wraps to, the legend
// --strict-layout, which once turned the layout failures into a failed check, is accepted and changes nothing: the
// failures it listed (the status bar widening the phone page, table cells clipped below 1000 px, estimates in the
// Confirmed-only drawer) are fixed, and a new one fails the check like any other.
// Needs `npm run build` first and Chrome (CHROME=/path, or the usual install paths); without Chrome it reports
// "skipped" and exits 0, unless --require is given (CI).

import { findChrome, launchChrome, skipWithoutChrome } from './lib/cdp.mjs';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'build/snapshot/ui');
const write = process.argv.includes('--write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = findChrome();
if (!chrome) skipWithoutChrome('ui:check');
const html = readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f));
if (!html) { console.error('No built page in dist/; run npm run build'); process.exit(1); }
const pageUrl = pathToFileURL(join(root, 'dist', html)).href;

const profile = mkdtempSync(join(tmpdir(), 'h2c-ui-'));
const { proc, port } = await launchChrome(chrome, profile);

let ws, nextId = 0;
const pending = new Map(), errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
const measureLayout = (screen, drawer) => evaluate(`(() => {
  const width = ${screen.width};
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
    if (!holds.has(p)) holds.set(p, /auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX) || held(p));
    return holds.get(p);
  };
  const spill = new Set(), sideways = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > width + 2 && shown(el, r) && !held(el)) spill.add(path(el));
    if (scrollsSideways(el) && shown(el, r)) sideways.add(path(el));
  }

  const tables = [];
  for (const t of document.querySelectorAll(${drawer ? `'.drawer table.grid'` : `'table.grid'`})) {
    if (!shown(t)) continue;
    const context = t.closest('.excluded-group, .drawer, #lens');
    const label = !context ? 'page' : context.id === 'lens' ? '#lens' : '.' + context.className.trim().split(/\\s+/)[0];
    const cells = [...t.querySelectorAll('td')];
    tables.push({ context: label, clipped: cells.filter((td) => td.scrollWidth > td.clientWidth + 1).length, cells: cells.length });
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
  const m = await measureLayout(screen, drawer);
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

  await open(pageUrl);
  results['01-default'] = await view();

  const templates = await evaluate(`[...document.querySelectorAll('[data-template]')].map((b) => b.innerText.split('\\n')[0].trim())`);
  if (!templates.length) throw new Error('the start screen shows no templates');
  for (const [i, name] of templates.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await open(pageUrl);
    await click(`[data-template="${i}"]`);
    await sleep(200);
    results[`10-${slug}-strict`] = await view();
    await click('#mode-explore');
    await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await sleep(200);
    const explore = await view();
    results[`11-${slug}-explore-estimates`] = explore;
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

  // Layout on each screen. The emulation is cleared afterwards so nothing after this section inherits a screen.
  const when = (selector, ms = 150) => until(`!!document.querySelector(${JSON.stringify(selector)})`, selector).then(() => sleep(ms));
  try {
    for (const screen of SCREENS) {
      await send('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: 1, mobile: screen.mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: screen.mobile });

      await open(pageUrl);
      await recordLayout(screen, 'default');
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
  } finally {
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }
} catch (e) {
  errors.push(e.message);
} finally {
  try { ws?.close(); } catch { /* closed */ }
  proc.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}

if (errors.length) { console.error(`ui:check: ${errors.length} page error(s)\n  ${errors.join('\n  ')}`); process.exit(1); }
const empty = Object.entries(results).filter(([, text]) => text.split('\n').length < 3).map(([k]) => k);
if (empty.length) { console.error(`ui:check: empty view(s): ${empty.join(', ')}`); process.exit(1); }

if (write) {
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.endsWith('.txt')) rmSync(join(outDir, f));
  for (const [k, text] of Object.entries(results)) writeFileSync(join(outDir, `${k}.txt`), `${text}\n`);
  console.log(`ui:check: wrote ${Object.keys(results).length} views to build/snapshot/ui`);
} else {
  const committed = existsSync(outDir) ? readdirSync(outDir).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)) : [];
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
} else console.log('ui:check: no layout failures on the laptop, tablet and phone screens');
