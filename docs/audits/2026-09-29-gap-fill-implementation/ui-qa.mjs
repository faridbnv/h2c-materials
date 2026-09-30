// Look at what the tranche changed on the built page, the way a reader meets it: the default table's rows for the
// materials it touched, and each one's drawer on the tabs that show the new values and recipes, on a laptop, a tablet
// and a phone. Writes a screenshot per step to <out> and the drawer text beside it, for a person (or an agent, who says
// so) to read. It asserts nothing; `npm run ui:check` is the regression check.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/ui-qa.mjs <out dir>
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChrome, launchChrome } from '../../../scripts/lib/cdp.mjs';
import { pageName } from '../../../build/src/release.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const out = process.argv[2];
if (!out) { console.error('usage: ui-qa.mjs <out dir>'); process.exit(2); }
mkdirSync(out, { recursive: true });
const meta = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8')).meta;
const html = readdirSync(join(root, 'dist')).find((f) => f === pageName(meta));
const url = pathToFileURL(join(root, 'dist', html)).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'h2c-qa-'));
const { proc, port } = await launchChrome(findChrome(), profile, ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
const until = async (expression, ms = 20000) => { for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if (await evaluate(expression).catch(() => false)) return; throw new Error(`timed out: ${expression}`); };
await send('Page.enable'); await send('Runtime.enable');

const shots = [];
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const bytes = Buffer.from(data, 'base64');
  writeFileSync(join(out, `${name}.png`), bytes);
  const text = await evaluate(`(document.querySelector('.drawer-body')?.innerText ?? document.getElementById('lens')?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim()`);
  writeFileSync(join(out, `${name}.txt`), `${text}\n`);
  shots.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
};
const openPage = async (screen) => {
  await send('Emulation.setDeviceMetricsOverride', { width: screen.width, height: screen.height, deviceScaleFactor: 1, mobile: screen.mobile });
  await send('Page.navigate', { url });
  await until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim()`);
  await sleep(300);
};
const openDrawer = async (name) => {
  const ok = await evaluate(`(() => { const tr = [...document.querySelectorAll('#lens tr[data-material]')].find((row) => row.cells[0]?.innerText.trim().startsWith(${JSON.stringify(name)})); if (!tr) return false; tr.scrollIntoView(); tr.click(); return true; })()`);
  if (!ok) throw new Error(`no row for ${name}`);
  await until(`!!document.querySelector('.drawer')`);
  await sleep(300);
};
const tab = async (name) => { await evaluate(`document.querySelector('.drawer [data-tab="${name}"]').click()`); await until(`!!document.querySelector('.drawer [data-tab="${name}"][aria-selected="true"]')`); await sleep(250); };
const closeDrawer = async () => { await evaluate(`(document.querySelector('.drawer [data-close], .drawer .close, .drawer button[aria-label*="Close"]') ?? {click(){}}).click()`); await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))`); await sleep(250); };
const rowText = (name) => evaluate(`(() => { const tr = [...document.querySelectorAll('#lens tr[data-material]')].find((row) => row.cells[0]?.innerText.trim().startsWith(${JSON.stringify(name)})); return tr ? tr.innerText.replace(/\\s+/g, ' ') : 'no row'; })()`);

const laptop = { name: 'laptop', width: 1180, height: 760, mobile: false };
const tablet = { name: 'tablet', width: 820, height: 1100, mobile: true };
const phone = { name: 'phone', width: 390, height: 844, mobile: true };
const rows = {};
await openPage(laptop);
for (const m of ['PA6/66-CF', 'PCTG-CF', 'TPU-EC', 'TPE, maker-undisclosed elastomer', 'PA6', 'PET']) rows[m] = await rowText(m);
await shot('laptop-00-default');
for (const [m, slug, tabs] of [['PA6/66-CF', 'pa66cf', ['Grades', 'Mechanical', 'Printing']], ['PCTG-CF', 'pctgcf', ['Grades', 'Mechanical']], ['TPU-EC', 'tpuec', ['Grades', 'Printing']], ['TPE, maker-undisclosed elastomer', 'tpe', ['Mechanical']]]) {
  await openPage(laptop);
  await openDrawer(m);
  await shot(`laptop-${slug}-overview`);
  for (const t of tabs) { await tab(t); await shot(`laptop-${slug}-${t.toLowerCase()}`); }
}
for (const screen of [tablet, phone]) {
  await openPage(screen);
  await shot(`${screen.name}-00-default`);
  await openDrawer('PA6/66-CF');
  await tab('Grades');
  await shot(`${screen.name}-pa66cf-grades`);
  await tab('Printing');
  await shot(`${screen.name}-pa66cf-printing`);
}
writeFileSync(join(out, 'rows.json'), `${JSON.stringify({ release: meta.release.id, rows, shots }, null, 1)}\n`);
console.log(JSON.stringify({ release: meta.release.id, rows, shots: shots.length }, null, 1));
ws.close(); proc.kill(); await sleep(1000); rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
