// Screenshots of the selector for the selector-refinement round (2026-10-18), from the pages round's helper.
//
// One view:  node shots.mjs <url> <outPrefix> [--width 1280] [--height 800] [--max 1] [--eval "js"] [--dark]
//                           [--scroll <selector>] [--css <file>]
//   Slices the page (or the element named by --scroll, which is where the selector scrolls: #lens, .drawer-body) into
//   viewport-tall pieces, at most --max. --eval runs first (open a drawer, set a template); --css injects a stylesheet,
//   which is how a proposal shows a change without touching the code.
// The set:   node shots.mjs --set <outDir> [--html <selector.html>] [--css <file>] [--eval-after "js"]
//   The fixed set the round compares before and after: the cold page, a template, each lens, the drawers of PLA,
//   PETG, ABS-CF, PEEK, PCTG-GF and PEI-CF, at 1280×800 light, with dark and 390 px for the landing screens.
import { findChrome, launchChrome } from '../../../scripts/lib/cdp.mjs';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

async function browser() {
  const profile = mkdtempSync(join(tmpdir(), 'shots-'));
  const { proc, port } = await launchChrome(findChrome(), profile);
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return r.result?.result?.value ?? (r.result?.exceptionDetails ? `error: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}` : undefined);
  };
  return { send, evaluate, close: () => { ws.close(); proc.kill(); } };
}

/** Load url at a size and theme, run js, and write slices of the page or of the scrolling element. */
async function shoot(b, { url, out, width = 1280, height = 800, max = 1, js = null, dark = false, scroll = null, css = null }) {
  const { send, evaluate } = b;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(100);
  await send('Page.navigate', { url });
  await sleep(1800);
  if (css) await evaluate(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.append(s); })()`);
  if (js) { const v = await evaluate(js); if (v !== undefined) console.log(`  eval: ${JSON.stringify(v).slice(0, 200)}`); await sleep(700); }
  const sel = JSON.stringify(scroll);
  const total = await evaluate(scroll ? `document.querySelector(${sel})?.scrollHeight ?? 0` : 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
  const view = scroll ? await evaluate(`document.querySelector(${sel})?.clientHeight ?? ${height}`) : height;
  const n = Math.max(1, Math.min(max, Math.ceil(total / view)));
  for (let k = 0; k < n; k++) {
    await evaluate(scroll ? `document.querySelector(${sel}).scrollTop = ${k * view}` : `window.scrollTo(0, ${k * height})`);
    await sleep(250);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}-${String(k + 1).padStart(2, '0')}.png`, Buffer.from(shot.result.data, 'base64'));
  }
  return { total, slices: n };
}

// The drawer of a material, on a tab, optionally under a template (by its index on the start panel).
const openDrawer = (id, tab = null, template = null) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${template !== null ? `document.querySelector('[data-template="${template}"]')?.click(); await wait(600);` : ''}
  const row = document.querySelector('tr[data-material="${id}"]');
  if (row) { row.scrollIntoView({ block: 'center' }); row.click(); await wait(600); }
  else {
    // Not among the rows shown (excluded under Confirmed only): open it the way a link does, through the hash.
    await wait(400);
    const h = location.hash.slice(1); const s = h ? JSON.parse(decodeURIComponent(h)) : { x: 2 };
    s.m = '${id}'; location.hash = encodeURIComponent(JSON.stringify(s)); await wait(1200);
  }
  ${tab ? `document.querySelector('.drawer [data-tab="${tab}"]')?.click(); await wait(500);` : ''}
  return document.querySelector('.drawer h2, .drawer-head h2')?.textContent ?? 'drawer?';
})()`;
const lens = (name, template = 1) => `(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('[data-template="${template}"]')?.click(); await wait(600);
  document.querySelector('[data-lens="${name}"]')?.click(); await wait(900); return '${name}'; })()`;
const template = (i) => `(async () => { document.querySelector('[data-template="${i}"]')?.click(); await new Promise((r) => setTimeout(r, 700)); return document.getElementById('count')?.textContent; })()`;

// Template 1 is Indoor prototype: most materials pass, so a drawer opens on the answer as a reader meets it.
const DRAWERS = [['M001', 'pla'], ['M020', 'petg'], ['M029', 'abscf'], ['M097', 'peek'], ['M110', 'pctggf'], ['M118', 'peicf']];
const TABS = ['Overview', 'Grades', 'Mechanical', 'Thermal', 'Printing', 'Environment', 'Price', 'Evidence'];

function setViews() {
  const v = [];
  // The landing screens.
  v.push({ name: 'main-cold', max: 1 });
  v.push({ name: 'main-cold-dark', max: 1, dark: true });
  v.push({ name: 'main-cold-phone', width: 390, height: 844, max: 2 });
  v.push({ name: 'main-cold-1180', width: 1180, height: 760, max: 1 });
  v.push({ name: 'main-indoor', js: template(1), max: 1 });
  v.push({ name: 'main-indoor-table', js: template(1), scroll: '#lens', max: 3 });
  for (const l of ['ashby', 'parallel', 'coverage', 'explain']) v.push({ name: `lens-${l}`, js: lens(l), max: 1 });
  // PLA's drawer, every tab, under Indoor prototype; its Overview without a template too.
  for (const t of TABS) v.push({ name: `drawer-pla-${t.toLowerCase()}`, js: openDrawer('M001', t, 1), scroll: '.drawer-body', max: t === 'Overview' ? 3 : 2 });
  v.push({ name: 'drawer-pla-overview-cold', js: openDrawer('M001', null, null), scroll: '.drawer-body', max: 2 });
  v.push({ name: 'drawer-pla-overview-dark', js: openDrawer('M001', null, 1), scroll: '.drawer-body', max: 1, dark: true });
  v.push({ name: 'drawer-pla-overview-phone', js: openDrawer('M001', null, 1), width: 390, height: 844, scroll: '.drawer-body', max: 2 });
  v.push({ name: 'drawer-pla-mechanical-dark', js: openDrawer('M001', 'Mechanical', 1) + `.then(async (h) => { document.querySelector('.drawer details.imp-block, .drawer .imp-compare')?.setAttribute('open', ''); await new Promise((r) => setTimeout(r, 300)); return h; })`, scroll: '.drawer-body', max: 2, dark: true });
  // Four more materials: Overview and Products.
  for (const [id, n] of DRAWERS.slice(1)) {
    v.push({ name: `drawer-${n}-overview`, js: openDrawer(id, null, 1), scroll: '.drawer-body', max: 2 });
    v.push({ name: `drawer-${n}-products`, js: openDrawer(id, 'Grades', 1), scroll: '.drawer-body', max: 1 });
  }
  return v;
}

const selectorHtml = (p) => p ?? join(root, 'dist', readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f)));

if (args[0] === '--set') {
  const outDir = resolve(args[1]); mkdirSync(outDir, { recursive: true });
  const url = pathToFileURL(selectorHtml(opt('--html', null))).href;
  const css = opt('--css', null) ? readFileSync(opt('--css', null), 'utf8') : null;
  const only = opt('--only', null);
  const b = await browser();
  try {
    for (const v of setViews().filter((x) => !only || x.name.includes(only))) {
      const r = await shoot(b, { url, out: join(outDir, v.name), css, ...v });
      console.log(`${v.name}: ${r.slices} slice(s), ${r.total} px`);
    }
  } finally { b.close(); }
} else {
  const [url, out] = args;
  const b = await browser();
  try {
    const r = await shoot(b, { url, out, width: +opt('--width', 1280), height: +opt('--height', 800), max: +opt('--max', 1),
      js: opt('--eval', null), dark: args.includes('--dark'), scroll: opt('--scroll', null),
      css: opt('--css', null) ? readFileSync(opt('--css', null), 'utf8') : null });
    console.log(`${r.slices} slice(s) of ${r.total} px`);
  } finally { b.close(); }
}
