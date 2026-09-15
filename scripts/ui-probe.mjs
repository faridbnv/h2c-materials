#!/usr/bin/env node
// Interface regression check: drive the built self-contained page in headless Chrome and record what a reader sees
// at each step, as text under build/snapshot/ui/. A change to the engine, the labels or the data shows up there as
// a reviewable diff; an exception or an empty view fails.
//
// Steps: the default view; every application template in Strict and in Explore with estimates; the Explore link
// reopened in a fresh page (a shared link must reproduce the view); three pins in Compare.
//
//   npm run ui:check              compare with build/snapshot/ui (exit 1 on a difference or a page error)
//   npm run ui:check -- --write   rewrite build/snapshot/ui
// Needs `npm run build` first and Chrome (CHROME=/path, or the usual install paths); without Chrome it reports
// "skipped" and exits 0, unless --require is given (CI).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'build/snapshot/ui');
const write = process.argv.includes('--write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROMES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) {
  console.log('ui:check skipped: no Chrome found (set CHROME=/path)');
  process.exit(process.argv.includes('--require') ? 1 : 0);
}
const html = readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f));
if (!html) { console.error('No built page in dist/; run npm run build'); process.exit(1); }
const pageUrl = pathToFileURL(join(root, 'dist', html)).href;

const profile = mkdtempSync(join(tmpdir(), 'h2c-ui-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });

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
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    const file = join(profile, 'DevToolsActivePort');
    if (existsSync(file)) port = readFileSync(file, 'utf8').split('\n')[0];
    else await sleep(100);
  }
  if (!port) throw new Error('Chrome did not open a debugging port');
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
    process.exit(1);
  }
  console.log(`ui:check: ${Object.keys(results).length} views match build/snapshot/ui`);
}
