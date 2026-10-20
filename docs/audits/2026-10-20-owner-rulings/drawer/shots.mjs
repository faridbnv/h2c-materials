// Screenshots of the drawer's first screen for the owner's rulings round (2026-10-20, D173), from the selector-refinement
// round's helper (docs/audits/2026-10-18-selector-refinement/shots.mjs).
//
//   node shots.mjs <outDir> [--html <selector.html>] [--only <name part>] [--max <slices>] [--before]
//
// The fixed set compared before and after: the drawers of PLA, PETG, ABS-CF, PEEK, PCTG-GF and TPU 95A on their
// Overview, under the start panel's templates (Indoor prototype, Outdoor structural part, Flexible component) and with no
// requirement, at 1280×800 light, PLA in dark too, and PLA and PEEK at 390×844. Each view writes the whole window (the
// selector behind the drawer included) and, with --max above 1, the drawer's body scrolled a screen at a time.
import { findChrome, launchChrome } from '../../../../scripts/lib/cdp.mjs';
import { mkdtempSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

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

async function shoot(b, { url, out, width = 1280, height = 800, max = 1, js = null, dark = false }) {
  const { send, evaluate } = b;
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await send('Page.navigate', { url: 'about:blank' });
  await sleep(100);
  await send('Page.navigate', { url });
  await sleep(1800);
  if (js) { const v = await evaluate(js); if (v !== undefined) console.log(`  eval: ${JSON.stringify(v).slice(0, 200)}`); await sleep(700); }
  // The drawer's own measures: how many numbers and words its first screen shows (the body as it opens, before any
  // scroll; a span "190–230" is two numbers), how tall its content is, and whether the page scrolls sideways.
  const measure = await evaluate(`(() => {
    const body = document.querySelector('.drawer-body');
    if (!body) return null;
    const box = body.getBoundingClientRect();
    const seen = (n, re) => { let k = 0; for (let m; (m = re.exec(n.data));) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getBoundingClientRect(); if (b.height && b.top >= box.top - 1 && b.bottom <= box.bottom + 1 && b.left >= box.left - 1 && b.right <= box.right + 1) k++; } return k; };
    let numbers = 0, words = 0;
    // Text inside a closed disclosure is not on screen, whatever its boxes say: only its summary is.
    const folded = (el) => { for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) if (!d.open && !el.closest('summary')?.parentElement?.isSameNode(d)) return true; return false; };
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      const el = n.parentElement;
      if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden' || folded(el)) continue;
      numbers += seen(n, /\\d[\\d,.]*/g); words += seen(n, /\\S+/g);
    }
    return { firstScreen: { numbers, words }, bodyHeight: body.scrollHeight, view: body.clientHeight, sideways: document.documentElement.scrollWidth > window.innerWidth };
  })()`);
  const n = Math.max(1, max);
  for (let k = 0; k < n; k++) {
    if (k) {
      const more = await evaluate(`(() => { const b = document.querySelector('.drawer-body'); if (!b || b.scrollTop + b.clientHeight >= b.scrollHeight - 1) return false; b.scrollTop = ${k} * b.clientHeight; return true; })()`);
      if (!more) break;
      await sleep(250);
    }
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}-${String(k + 1).padStart(2, '0')}.png`, Buffer.from(shot.result.data, 'base64'));
  }
  return measure;
}

// The drawer of a material on its Overview, under a template by its index on the start panel, or with none.
const openDrawer = (id, template = null) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${template !== null ? `document.querySelector('[data-template="${template}"]')?.click(); await wait(700);` : ''}
  const row = document.querySelector('tr[data-material="${id}"]');
  if (row) { row.scrollIntoView({ block: 'center' }); row.click(); await wait(700); }
  else {
    await wait(400);
    const h = location.hash.slice(1); const s = h ? JSON.parse(decodeURIComponent(h)) : { x: 2 };
    s.m = '${id}'; location.hash = encodeURIComponent(JSON.stringify(s)); await wait(1200);
  }
  return document.querySelector('.drawer-head h2')?.textContent ?? 'drawer?';
})()`;

// Templates: 0 Outdoor structural part, 1 Indoor prototype, 5 Flexible component.
const VIEWS = [
  { name: 'pla-indoor', id: 'M001', t: 1, max: 3 },
  { name: 'pla-cold', id: 'M001', t: null, max: 2 },
  { name: 'pla-outdoor', id: 'M001', t: 0, max: 2 },
  { name: 'pla-indoor-dark', id: 'M001', t: 1, dark: true },
  { name: 'pla-indoor-phone', id: 'M001', t: 1, width: 390, height: 844, max: 3 },
  { name: 'petg-outdoor', id: 'M020', t: 0, max: 2 },
  { name: 'abscf-outdoor', id: 'M029', t: 0, max: 2 },
  { name: 'abscf-cold', id: 'M029', t: null },
  { name: 'peek-indoor', id: 'M097', t: 1, max: 2 },
  { name: 'peek-indoor-phone', id: 'M097', t: 1, width: 390, height: 844, max: 2 },
  { name: 'pctggf-indoor', id: 'M110', t: 1 },
  { name: 'tpu-flexible', id: 'M161', t: 5, max: 2 },
  // What is one press away (the after set only: the before drawer has none of these): the spread table opened, a
  // chip's popover, and a requirement's whole reason.
  { name: 'press-pla-spread', id: 'M001', t: 1, only: 'after', then: `document.querySelector('.kf-more')?.setAttribute('open', ''); document.querySelector('.kf-more')?.scrollIntoView({ block: 'start' }); 'opened'` },
  { name: 'press-peek-chamber', id: 'M097', t: 1, only: 'after', then: `(() => { const b = document.querySelector('[data-print="chamber"] .h2c-chip button'); b?.scrollIntoView({ block: 'center' }); b?.click(); return !!b; })()` },
  { name: 'press-petg-more', id: 'M020', t: 0, only: 'after', then: `(() => { const b = document.querySelector('.why-more'); b?.click(); return !!b; })()` },
];

const selectorHtml = (p) => p ?? join(root, 'dist', readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f)));
const outDir = resolve(args[0] ?? '.'); mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(selectorHtml(opt('--html', null))).href;
const only = opt('--only', null);
const maxAll = opt('--max', null);
const b = await browser();
try {
  for (const v of VIEWS.filter((x) => !only || x.name.includes(only))) {
    if (v.only === 'after' && args.includes('--before')) continue;
    const js = v.then ? `${openDrawer(v.id, v.t)}.then(async () => { const r = ${v.then}; await new Promise((ok) => setTimeout(ok, 400)); return r; })` : openDrawer(v.id, v.t);
    const m = await shoot(b, { url, out: join(outDir, v.name), js, width: v.width, height: v.height, dark: v.dark, max: maxAll ? +maxAll : v.max ?? 1 });
    console.log(`${v.name}: ${JSON.stringify(m)}`);
  }
} finally { b.close(); }
