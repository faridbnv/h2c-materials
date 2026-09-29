#!/usr/bin/env node
// Repeated Ashby renders, timed, with what they leave behind (05-ACCEPTANCE: "repeated goal/state/axis changes do not
// accumulate event handlers or Plotly instances"). A page is opened on a scenario, and a scale button is pressed back and
// forth; each press redraws the lens. For each run: the median and 95th percentile of a redraw (the click to the second
// animation frame after it), the window's resize listeners and the plots in the document before and after, and the JS
// heap after a forced collection at the start and the end. The same method runs on the page before the makeover, so the
// two are compared on one machine rather than against a guessed latency.
//
//   node perf.mjs <page.html> <label> [--n 40]  > perf-<label>.json

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome, launchChrome } from '../../../../scripts/lib/cdp.mjs';

const [pagePath, label] = process.argv.slice(2);
const N = Number(process.argv.includes('--n') ? process.argv[process.argv.indexOf('--n') + 1] : 40);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scope = { kind: 'gate', gate: 'scope' };
const gates = ['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate }));
const num = (property, operator, value) => ({ kind: 'numeric', property, operator, value, mandatory: true });
const beam = [scope, ...gates, num('tensileModulusXY', '>=', 3), num('density', '<=', 1250)];
const loglog = { x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true };
const RUNS = label === 'before' ? {
  'beam, one product per point': { c: beam, u: 'strict', s: [], p: { ...loglog, index: 'beam-stiffness', detail: 'products' }, l: 'ashby', e: false },
  'scope only, materials with estimates': { c: [scope], u: 'exploration', s: [], p: { ...loglog, detail: 'material', showEstimates: true }, l: 'ashby', e: true },
  'scope only, mixed test pairs (largest)': { c: [scope], u: 'exploration', s: [], p: { x: 'tensileModulusXY', y: 'tensileStrengthXY', xLog: true, yLog: true, detail: 'measured-mixed' }, l: 'ashby', e: true },
} : {
  'beam, decision products': { x: 2, c: beam, u: 'strict', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'decision' }, l: 'ashby', e: false },
  'scope only, decision products, every layer and estimates': { x: 2, c: [scope], u: 'exploration', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'decision', showEstimates: true, layers: { failed: true, unresolved: true, front: true } }, l: 'ashby', e: true },
  'scope only, material overview with estimates': { x: 2, c: [scope], u: 'exploration', s: [], p: { ...loglog, view: 'overview', showEstimates: true }, l: 'ashby', e: true },
  'scope only, mixed test pairs (largest)': { x: 2, c: [scope], u: 'exploration', s: [], p: { x: 'tensileModulusXY', y: 'tensileStrengthXY', xLog: true, yLog: true, view: 'measured-mixed' }, l: 'ashby', e: true },
};

const { proc, port } = await launchChrome(findChrome(), mkdtempSync(join(tmpdir(), 'h2c-perf-')), ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--js-flags=--expose-gc']);
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => { const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description); return m.result?.result?.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const resizeListeners = async () => {
  const { result } = await send('Runtime.evaluate', { expression: 'window' });
  const { result: r } = await send('DOMDebugger.getEventListeners', { objectId: result.result.objectId });
  return (r.listeners ?? []).filter((l) => l.type === 'resize').length;
};
const heap = async () => { await send('HeapProfiler.collectGarbage'); const { result } = await send('Performance.getMetrics'); return Math.round(result.metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1024 / 1024 * 10) / 10; };

const page = pathToFileURL(resolve(pagePath)).href;
const out = { label, page: pagePath, renders: N, measured: new Date().toISOString(), runs: {} };
for (const [name, compact] of Object.entries(RUNS)) {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
  await send('Page.navigate', { url: `${page}?perf=1#${encodeURIComponent(JSON.stringify(compact))}` });
  for (let i = 0; i < 200 && !(await ev(`!!document.querySelector('#plot .main-svg')`).catch(() => false)); i++) await sleep(100);
  await sleep(800);
  const start = { resize: await resizeListeners(), plots: await ev(`document.querySelectorAll('.js-plotly-plot').length`), heapMB: await heap(), marks: await ev(`(document.getElementById('plot').data ?? []).reduce((n, t) => n + (Array.isArray(t.x) ? t.x.length : 0), 0)`) };
  const times = await ev(`(async () => {
    const out = [];
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let i = 0; i < ${N}; i++) {
      const b = document.querySelector(i % 2 ? '[data-log="x"]:not([data-on])' : '[data-log="x"][data-on="1"]');
      const t0 = performance.now();
      b.click();
      await frame();
      out.push(performance.now() - t0);
    }
    return out;
  })()`);
  await sleep(500);
  const end = { resize: await resizeListeners(), plots: await ev(`document.querySelectorAll('.js-plotly-plot').length`), heapMB: await heap() };
  const sorted = [...times].sort((a, b) => a - b);
  const q = (p) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] * 10) / 10;
  out.runs[name] = { marks: start.marks, medianMs: q(0.5), p95Ms: q(0.95), maxMs: q(1), resizeListeners: [start.resize, end.resize], plots: [start.plots, end.plots], heapMB: [start.heapMB, end.heapMB] };
  console.error(`${name}: median ${q(0.5)} ms, p95 ${q(0.95)} ms; resize listeners ${start.resize} -> ${end.resize}; plots ${start.plots} -> ${end.plots}; heap ${start.heapMB} -> ${end.heapMB} MB`);
}
console.log(JSON.stringify(out, null, 2));
ws.close(); proc.kill();
