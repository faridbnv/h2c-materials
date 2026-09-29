#!/usr/bin/env node
// Screenshots and layout measurements of the Ashby lens, for the before/after record of the Ashby makeover
// (docs/audits/2026-09-29-ashby-makeover/README.md). It opens a built page from file:// in headless Chrome with a
// scenario in its hash, at a screen size, waits for the chart, and records what a reader sees: a PNG of the screen, the
// plotting area's size and where it starts, and the chart's reading text.
//
//   node docs/audits/2026-09-29-ashby-makeover/tools/capture.mjs <page.html> <out-dir> <label> [--only name,name]
//
// The scenarios are the engineering tasks of the review package (01-REVIEW.md, UI-01 to UI-07), written as the page's
// own link form. A page before the makeover reads them as they were written; the page after it reads them as version 1
// links (migrated) or, for the "-v2" scenarios, as the decision workspace's own form. Nothing here writes to the page.

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChrome, launchChrome } from '../../../../scripts/lib/cdp.mjs';

const [pagePath, outDir, label] = process.argv.slice(2);
if (!pagePath || !outDir || !label) {
  console.error('usage: capture.mjs <page.html> <out-dir> <label> [--only a,b]');
  process.exit(2);
}
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? new Set(process.argv[i + 1].split(',')) : null; })();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const scope = { kind: 'gate', gate: 'scope' };
const gates = ['nozzle', 'bed', 'chamber'].map((gate) => ({ kind: 'gate', gate }));
const num = (property, operator, value) => ({ kind: 'numeric', property, operator, value, mandatory: true });
const beam = [scope, ...gates, num('tensileModulusXY', '>=', 3), num('density', '<=', 1250)];
const warm = [scope, ...gates, num('tensileModulusXY', '>=', 4), num('hdt045', '>=', 80)];
const loglog = { x: 'density', y: 'tensileModulusXY', xLog: true, yLog: true };

// Version 1 links, as the review wrote them. `x: 2` marks a link in the decision workspace's own form.
export const SCENARIOS = {
  'beam-material': { c: beam, u: 'strict', s: [], p: { ...loglog, index: 'beam-stiffness', detail: 'material' }, l: 'ashby', e: false },
  'beam-products': { c: beam, u: 'strict', s: [], p: { ...loglog, index: 'beam-stiffness', detail: 'products' }, l: 'ashby', e: false },
  'beam-conditioned': { c: beam, u: 'exploration', s: [], p: { ...loglog, index: 'beam-stiffness', detail: 'products' }, l: 'ashby', e: true, w: 'conditioned' },
  'scope-estimates': { c: [scope], u: 'exploration', s: [], p: { ...loglog, index: null, detail: 'material', showEstimates: true }, l: 'ashby', e: true },
  'cost-beam': { c: [scope], u: 'strict', s: [], p: { ...loglog, index: 'beam-stiffness-cost', detail: 'material' }, l: 'ashby', e: false },
  'warm-annealed': { c: warm, u: 'exploration', s: [], p: { x: 'density', y: 'hdt045', xLog: true, yLog: false, index: null, detail: 'products' }, l: 'ashby', e: false, n: 120 },
  'beam-v2': { x: 2, c: beam, u: 'strict', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'decision' }, l: 'ashby', e: false },
  'beam-v2-overview': { x: 2, c: beam, u: 'strict', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'overview' }, l: 'ashby', e: false },
  'beam-v2-conditioned': { x: 2, c: beam, u: 'exploration', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'decision', layers: { unresolved: true } }, l: 'ashby', e: true, w: 'conditioned' },
  'scope-v2-estimates': { x: 2, c: [scope], u: 'exploration', s: [], p: { ...loglog, view: 'overview', showEstimates: true }, l: 'ashby', e: true },
  'cost-v2': { x: 2, c: [scope], u: 'strict', s: [], r: 'beam-stiffness-cost', p: { x: 'materialCostPerVolume', y: 'tensileModulusXY', xLog: true, yLog: true, view: 'decision' }, l: 'ashby', e: false },
  'warm-v2-annealed': { x: 2, c: warm, u: 'exploration', s: [], p: { x: 'density', y: 'hdt045', xLog: true, yLog: false, view: 'decision', layers: { unresolved: true } }, l: 'ashby', e: false, n: 120 },
  'beam-v2-stage': { x: 2, c: beam, u: 'strict', s: [], r: 'beam-stiffness', g: [['beam-stiffness', 0.0017]], p: { ...loglog, view: 'decision' }, l: 'ashby', e: false },
  'start-v2': { x: 2, c: [], u: 'strict', s: [], p: { x: 'density', y: 'tensileModulusXY', xLog: false, yLog: false, view: 'decision' }, l: 'ashby', e: false },
  // The same beam exercise with the filter rail hidden, as a reader widening the chart would (the rail's Hide).
  'beam-v2-wide': { x: 2, c: beam, u: 'strict', s: [], r: 'beam-stiffness', p: { ...loglog, view: 'decision' }, l: 'ashby', e: false, _rail: 'hidden' },
};

const SCREENS = [
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '1024x768', width: 1024, height: 768, mobile: false },
  { name: '390x844', width: 390, height: 844, mobile: true },
];

const chrome = findChrome();
if (!chrome) { console.error('No Chrome found (set CHROME=/path)'); process.exit(1); }
const profile = mkdtempSync(join(tmpdir(), 'h2c-capture-'));
const { proc, port } = await launchChrome(chrome, profile, ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']);
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
});
const send = (method, params = {}) => new Promise((resolveCall, reject) => { const id = ++nextId; pending.set(id, { resolve: resolveCall, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const until = async (expression, ms = 20000) => {
  for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await evaluate(expression).catch(() => false)) return true;
  return false;
};

await send('Page.enable');
await send('Runtime.enable');
// A migrated link says what changed in an alert; it is recorded and accepted, so the page carries on.
const dialogs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Page.javascriptDialogOpening') { dialogs.push(msg.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
});
const pageErrors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') pageErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
});
// No network for the page: the standalone file must open from file:// without it (05-ACCEPTANCE, offline gate).
await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
const requests = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Network.requestWillBeSent' && !/^(file|data|blob):/.test(msg.params.request.url)) requests.push(msg.params.request.url);
});

mkdirSync(outDir, { recursive: true });
const page = pathToFileURL(resolve(pagePath)).href;
const report = { label, page: pagePath, captured: new Date().toISOString(), views: [] };
for (const screen of SCREENS) {
  await send('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: 1, mobile: screen.mobile });
  for (const [name, compact] of Object.entries(SCENARIOS)) {
    if (only && !only.has(name)) continue;
    if (label === 'before' && compact.x === 2) continue;
    const { _rail, ...link } = compact;
    const url = `${page}#${encodeURIComponent(JSON.stringify(link))}`;
    // The rail's hidden state is this browser's own (localStorage), set on the page's origin before it opens.
    await send('Page.navigate', { url: page });
    await until(`document.readyState === 'complete'`);
    await evaluate(`(() => { try { ${_rail ? `localStorage.setItem('h2c-rail', '${_rail}')` : "localStorage.removeItem('h2c-rail')"}; } catch {} return true; })()`);
    // A fresh document each time, so no state of the previous scenario survives.
    await send('Page.navigate', { url: 'about:blank' });
    await sleep(100);
    await send('Page.navigate', { url });
    await until(`document.readyState === 'complete' && !!document.querySelector('#plot .main-svg')`);
    await sleep(900);
    const m = await evaluate(`(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
      const text = (el) => (el?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim();
      const area = document.querySelector('#plot .nsewdrag');
      return {
        plotArea: r(area), plot: r(document.getElementById('plot')), lens: r(document.getElementById('lens')),
        lineControl: r(document.querySelector('.ws-line, .index-move')),
        results: r(document.querySelector('.ws-results, .index-rank')),
        plots: document.querySelectorAll('.js-plotly-plot').length,
        reading: text(document.querySelector('.legend-note')).slice(0, 1600),
        readout: text(document.querySelector('.ws-line, .index-card')).slice(0, 800),
        question: text(document.querySelector('.ws-question')).slice(0, 800),
        results_text: text(document.querySelector('.ws-results')).slice(0, 1600),
        scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth,
      };
    })()`);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = `${label}-${name}-${screen.name}.png`;
    writeFileSync(join(outDir, file), Buffer.from(shot.data, 'base64'));
    report.views.push({ scenario: name, screen: screen.name, file, dialogs: dialogs.splice(0), ...m });
    console.log(`${file}: plot area ${m.plotArea ? `${m.plotArea.w}x${m.plotArea.h} at y=${m.plotArea.y}` : 'none'}`);
  }
}
report.networkRequests = requests;
report.pageErrors = pageErrors;
if (pageErrors.length) console.log(`page errors: ${pageErrors.length}\n${[...new Set(pageErrors)].slice(0, 5).join('\n')}`);
writeFileSync(join(outDir, `${label}-layout.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`network requests other than file/data/blob: ${requests.length}`);
ws.close();
proc.kill();
