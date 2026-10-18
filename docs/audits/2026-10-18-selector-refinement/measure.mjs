#!/usr/bin/env node
// The round's measures M2 to M6 (PLAN.md, "How it is measured and tracked"), from the built page in dist/. Run after
// `npm run build` (and `npm run pages` for M5); each part can run alone:
//
//   node docs/audits/2026-10-18-selector-refinement/measure.mjs [words] [agree] [screen] [--json out.json]
//
//   words   M4: bookkeeping, coinages and slips in every material's drawer, all tabs, as Confirmed only and under the
//           Indoor prototype template (Node; maintainers' Record and Review notes folds left out)
//   agree   M5: the drawer's key properties against the material page's key figures, for every material with a page
//   screen  M2, M3, M6 in headless Chrome: the cold main page above the fold (1280×800, 1180×760), the drawer's first
//           screen for PLA, ABS-CF, PEEK and PCTG-GF with and without a template, and small text under 4.5:1 contrast
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const args = process.argv.slice(2);
const parts = args.filter((a) => ['words', 'agree', 'screen'].includes(a));
const want = (p) => !parts.length || parts.includes(p);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const result = {};

// ---------------------------------------------------------------- M4 words
// Each pattern is one defect the exploration found (or a coinage INTERFACE "Words" rules out); counted as the number
// of drawers (material × tab × situation) whose reader text carries it, and the occurrences.
const WORDS = [
  ['tally "Of the N results…drawn"', /Of the \d[\d,]* results? below/g],
  ['"n counts …"', /\bn counts\b/g],
  ['"Also drawn, not in the median"', /Also drawn, not in the median/g],
  ['"Not used as/by a filter" variants', /Not used as a filter|Not used by any filter|No filter uses it/g],
  ['grammar "1 … say/give"', /\b1 (?:data sheets?|products?|makers?|profiles?) (?:say|give|have|ask|are|were)\b/g],
  ['"special formulation"', /special formulations?/g],
  ['"comparable basis"', /comparable basis/g],
  ['"reference grade"', /reference grades?/g],
  ['"SCREENED chip"', /SCREENED chip/g],
  ['"not a test result" (toughened caveat)', /not a test result/g],
  ['"not one product\'s scatter"', /not one product's scatter/g],
  ['pointer to Products ("Products shows/gives…")', /Products shows which|Products gives each one|Each product's own settings are in Products/g],
  ['"On file:" bookkeeping line', /On file: \d/g],
  ['"(n of M profiles)" counts', /\(\d+ of \d+ profiles?\)/g],
  ['project decision, ruling or migration in reader text', /\b(?:scripts|build|app)\/[\w/.-]+|\bm\d{3}\b|(?<=under |\(|, )D(?:[1-9]\d|1[0-4]\d)\b|\bR\d{3}\b/g],
  ['"User-supplied reference"', /User-supplied reference/g],
  ['"Filamant" (source title typo)', /Filamant/g],
];
// A paragraph or list item with two semicolons or more: a chain the Words rules ask to break.
const CHAIN = 'paragraph or item with 2+ semicolons';

async function words() {
  const { db, TABS, situation, drawerHtml, readerText } = await import('./lib.mjs');
  const sits = [['strict', situation()], ['indoor', situation({ template: 1, policy: 'exploration' })]];
  const counts = WORDS.map(([name]) => ({ name, drawers: 0, hits: 0, example: null }));
  const chain = { name: CHAIN, drawers: 0, hits: 0, example: null };
  let drawers = 0;
  for (const [, sit] of sits) for (const m of db.materials) for (const tab of TABS.filter((t) => t !== 'Coverage')) {
    const html = drawerHtml(sit, m.id, tab); const text = readerText(html); drawers++;
    const chains = [...html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((x) => readerText(x[2]).replace(/“[^”]*”/g, "")).filter((t) => (t.match(/;/g) ?? []).length >= 2);
    if (chains.length) { chain.drawers++; chain.hits += chains.length; chain.example ??= `${m.id} ${tab}: …${chains[0].slice(0, 110)}…`; }
    WORDS.forEach(([, re], i) => {
      const hits = text.match(re);
      if (hits?.length) { counts[i].drawers++; counts[i].hits += hits.length; counts[i].example ??= `${m.id} ${tab}: …${hits[0].slice(0, 110)}…`; }
    });
  }
  counts.push(chain);
  result.words = { drawers, counts };
  console.log(`\nM4 words: ${drawers} drawers read (material × tab × situation)`);
  for (const c of counts) console.log(`  ${String(c.drawers).padStart(5)} drawers ${String(c.hits).padStart(6)} hits  ${c.name}${c.example ? `\n        e.g. ${c.example}` : ''}`);
}

// ---------------------------------------------------------------- M5 agree
const num = (s) => { const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? +m[0] : null; };
const sign = (s) => (String(s).match(/^\s*([<>≥≤~]|&gt;|&lt;)/)?.[1] ?? '').replace('&gt;', '>').replace('&lt;', '<');
const close = (a, b) => a === b || (a != null && b != null && Math.abs(a - b) <= Math.max(Math.abs(b) * 0.006, 0.051));

async function agree() {
  const { db, situation, drawerHtml, readerText } = await import('./lib.mjs');
  const pagesDir = join(root, 'dist/materials');
  if (!existsSync(pagesDir)) { console.log('M5: no dist/materials; run npm run pages -- --all'); return; }
  const sit = situation();
  const rows = []; let compared = 0;
  for (const f of readdirSync(pagesDir).filter((x) => /^M\d+\.html$/.test(x))) {
    const id = f.replace('.html', ''); const page = readFileSync(join(pagesDir, f), 'utf8');
    const html = drawerHtml(sit, id, 'Overview');
    const dl = html.match(/<dl class="key-props[^"]*">([\s\S]*?)<\/dl>/)?.[1] ?? '';
    const drawer = new Map();
    const HEADKEYS = db.registry.properties.filter((p) => p.headline !== false).map((p) => [p.label ?? p.name, p.key]);
    for (const [, dt, dd] of dl.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) drawer.set(readerText(dt), readerText(dd));
    for (const cell of page.matchAll(/<div class="kf-cell[^"]*" data-key="([^"]+)"([^>]*)><dt[^>]*>([^<]*)<\/dt>([\s\S]*?)<\/div>/g)) {
      const [, key, attrs, label, rest] = cell;
      const d = drawer.get(label.trim()); if (d === undefined) { rows.push({ id, key, kind: 'label not in the drawer', page: label, drawer: [...drawer.keys()].join('/') }); continue; }
      compared++;
      const v = attrs.match(/data-v="([^"]+)"/)?.[1]; const n = attrs.match(/data-n="([^"]+)"/)?.[1]; const state = attrs.match(/data-state="([^"]+)"/)?.[1];
      const shown = readerText(rest.match(/<dd class="kf-v">([\s\S]*?)<\/dd>/)?.[1] ?? rest).trim();
      // The spread the page prints beside its median: the middle half from four products, else lowest to highest (its
      // foot, kf-f); the drawer prints the same since 2026-10-18 (before, it printed lowest to highest: the aria label).
      const foot = readerText(rest.match(/<dd class="kf-f">([\s\S]*?)<\/dd>/)?.[1] ?? '');
      const aria = (foot.match(/([\d.,]+)\s*[–-]\s*([\d.,]+)/) ? [null, ...foot.match(/([\d.,]+)\s*[–-]\s*([\d.,]+)/).slice(1)] : null)
        ?? rest.match(/lowest to highest ([\d.,]+)\D+?([\d.,]+)/);
      const dv = num(d), dn = d.match(/·\s*(\d+)/)?.[1], dr = d.match(/([\d.,]+)\s*[–-]\s*([\d.,]+)/);
      const issues = [];
      if (state === 'missing' || state === 'na') { if (dv != null && !/Not published|No price|not applicable/i.test(d)) issues.push('page: not published; drawer gives a value'); }
      else if (state === 'as-published') { if (dn) issues.push('page: as published (not compared); drawer gives a median'); }
      else {
        if (!close(dv, +v) && dv !== num(shown)) issues.push(`value ${d.split(' ')[0]} vs ${v}`);
        if (sign(d) !== sign(shown)) issues.push(`bound sign "${sign(d)}" vs "${sign(shown)}"`);
        if (n && dn && n !== dn) issues.push(`count ${dn} vs ${n}`);
        if (aria && dr && (!close(num(dr[1]), num(aria[1])) || !close(num(dr[2]), num(aria[2])))) issues.push(`range ${dr[1]}–${dr[2]} vs ${aria[1]}–${aria[2]}`);
        if (dv != null && num(shown) != null && String(num(shown)) !== String(dv) && close(dv, +v)) issues.push(`printed two ways: ${dv} / ${num(shown)}`);
      }
      if (issues.length) rows.push({ id, name: db.materials.find((m) => m.id === id)?.name, key, drawer: d, page: shown, issues });
    }
  }
  const byKind = {};
  for (const r of rows) for (const i of r.issues ?? [r.kind]) { const k = i.replace(/[\d.,]+/g, '#').replace(/"[^"]*"/g, '"…"'); byKind[k] = (byKind[k] ?? 0) + 1; }
  result.agree = { compared, rows, byKind };
  console.log(`\nM5 drawer ↔ page key figures: ${compared} cells compared on ${readdirSync(pagesDir).filter((x) => /^M\d+\.html$/.test(x)).length} pages, ${rows.length} with a difference`);
  for (const [k, c] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(4)}  ${k}`);
  for (const r of rows.filter((x) => x.issues?.some((i) => !i.startsWith('printed two ways'))).slice(0, 12)) console.log(`  e.g. ${r.id} ${r.name} ${r.key}: drawer "${r.drawer}" page "${r.page}" (${r.issues.join('; ')})`);
}

// ---------------------------------------------------------------- M2, M3, M6 screen
async function screen() {
  const { findChrome, launchChrome } = await import('../../../scripts/lib/cdp.mjs');
  const html = join(root, 'dist', readdirSync(join(root, 'dist')).find((f) => /^H2C_Material_Selector_.*\.html$/.test(f)));
  const url = pathToFileURL(html).href;
  const { proc, port } = await launchChrome(findChrome(), mkdtempSync(join(tmpdir(), 'measure-')));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value; };
  await send('Page.enable');
  const load = async (width, height, dark = false) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
    await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
    await send('Page.navigate', { url }); await sleep(1800);
  };
  // Visible text inside an element (or the page), clipped to the viewport: one entry per text node.
  const VISIBLE = `(root) => { const out = []; const H = innerHeight, W = innerWidth;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (!t) continue;
      const el = n.parentElement; if (!el || el.closest('[hidden], details:not([open]) > :not(summary)')) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
      if (!b.width || !b.height || b.bottom <= 0 || b.top >= H || b.right <= 0 || b.left >= W) continue;
      let clip = el.parentElement, cut = false; while (clip && clip !== document.body) { const s = getComputedStyle(clip); if (/(auto|scroll|hidden)/.test(s.overflowY)) { const cr = clip.getBoundingClientRect(); if (b.top >= cr.bottom || b.bottom <= cr.top) { cut = true; break; } } clip = clip.parentElement; }
      if (!cut) out.push({ t, tag: el.tagName, cls: el.className && String(el.className).slice(0, 40) }); }
    return out; }`;
  const NUMS = (texts) => texts.map((x) => x.t).join(' ').match(/(?<![\w])[<>≥≤~]?\d[\d,]*(?:\.\d+)?/g)?.length ?? 0;

  // M2: the cold main page.
  result.cold = {};
  for (const [w, h] of [[1280, 800], [1180, 760]]) {
    await load(w, h);
    const r = await ev(`(() => { const vis = (${VISIBLE})(document.body);
      const lens = document.getElementById('lens').getBoundingClientRect();
      const bar = document.querySelector('.table-bar'); const barTop = bar ? bar.getBoundingClientRect().top : null;
      const rows = [...document.querySelectorAll('tr[data-material]')].filter((tr) => { const b = tr.getBoundingClientRect(); return b.height && b.bottom <= Math.min(lens.bottom, innerHeight) && b.top >= lens.top; }).length;
      const controls = [...document.querySelectorAll('button, a[href], input, select, summary')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && b.bottom > 0 && b.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; }).length;
      const main = vis.filter((x) => true); const text = main.map((x) => x.t).join(' ');
      const blocks = new Set(); for (const x of vis) blocks.add(x.t);
      const count = (re) => (text.match(re) ?? []).length;
      return { tableBarVisible: barTop !== null && barTop < Math.min(lens.bottom, innerHeight), tableBarTop: Math.round(barTop), rowsVisible: rows, controls, textNodes: vis.length,
        numbers: (text.match(/(?<![\\w])[<>≥≤~]?\\d[\\d,]*(?:\\.\\d+)?/g) ?? []).length,
        withinH2C: count(/within H2C temperature limits/g), notTested: count(/not tested/gi), filtersWord: count(/\\bFilters\\b/g), words: text.split(' ').length }; })()`);
    result.cold[`${w}x${h}`] = r;
  }
  console.log('\nM2 cold main page:'); for (const [k, r] of Object.entries(result.cold)) console.log(`  ${k}: table bar ${r.tableBarVisible ? 'visible' : `below the fold (top ${r.tableBarTop} px)`}, ${r.rowsVisible} rows visible, ${r.controls} controls, ${r.textNodes} text pieces, ${r.words} words, ${r.numbers} numbers; "within H2C temperature limits" ×${r.withinH2C}, "not tested" ×${r.notTested}, "Filters" ×${r.filtersWord}`);

  // M3: the drawer's first screen at 1280×800 (the drawer is 620 px wide).
  result.drawer = [];
  for (const [mid, name] of [['M001', 'PLA'], ['M029', 'ABS-CF'], ['M097', 'PEEK'], ['M110', 'PCTG-GF']]) {
    for (const tpl of [null, 1]) {
      await load(1280, 800);
      if (tpl !== null) { await ev(`document.querySelector('[data-template="${tpl}"]').click()`); await sleep(700); }
      await ev(`(async () => { const s = (() => { const h = location.hash.slice(1); return h ? JSON.parse(decodeURIComponent(h)) : { x: 2 }; })(); s.m = '${mid}'; location.hash = encodeURIComponent(JSON.stringify(s)); })()`);
      await sleep(1300);
      const r = await ev(`(() => { const d = document.querySelector('.drawer'); if (!d) return null; const vis = (${VISIBLE})(d);
        const text = vis.map((x) => x.t).join(' ');
        const sentences = (text.match(/[A-Z][^.!?]{12,}[.!?]/g) ?? []).length;
        return { numbers: (text.match(/(?<![\\w])[<>≥≤~]?\\d[\\d,]*(?:\\.\\d+)?/g) ?? []).length, textPieces: vis.length, sentences, words: text.split(' ').length,
          productsPointers: (text.match(/\\bProducts (?:shows|gives)|in Products\\b/g) ?? []).length, text: text.slice(0, 4000) }; })()`);
      result.drawer.push({ material: name, template: tpl === null ? 'none' : 'Indoor prototype', ...r });
    }
  }
  console.log('\nM3 drawer first screen (1280×800):'); for (const r of result.drawer) console.log(`  ${r.material.padEnd(8)} ${r.template.padEnd(17)} ${String(r.numbers).padStart(3)} numbers, ${String(r.sentences).padStart(2)} sentences, ${r.words} words, ${r.productsPointers} pointers to Products`);

  // M6: small text below 4.5:1, in both themes, on the cold page, a template's table and PLA's drawer (three tabs).
  const CONTRAST = `(() => { const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
    const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
      let bg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]; for (const c of stack.reverse()) bg = blend(c, bg); return bg; };
    const bad = new Map(); let small = 0;
    for (const el of document.querySelectorAll('body *')) { if (!el.childNodes.length) continue; const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; if (size >= 18 || (bold && size >= 14)) continue; small++;
      let fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); fg = blend(fg, bg); const op = +cs.opacity; if (op < 1) fg = blend([...fg.slice(0, 3), op], bg);
      const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (ratio < 4.5) { const key = (el.className && String(el.className).split(' ')[0]) || el.tagName.toLowerCase(); const e = bad.get(key) ?? { n: 0, min: 99, sample: '' }; e.n++; e.min = Math.min(e.min, ratio); e.sample ||= el.textContent.trim().slice(0, 40); bad.set(key, e); } }
    return { small, failing: [...bad.values()].reduce((s, e) => s + e.n, 0), byClass: [...bad.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([k, e]) => \`\${k} ×\${e.n} (\${e.min.toFixed(2)}:1) "\${e.sample}"\`) }; })()`;
  result.contrast = {};
  for (const dark of [false, true]) {
    const views = [['cold', null], ['indoor table', 'tpl'], ['PLA drawer Overview', 'Overview'], ['PLA drawer Mechanical', 'Mechanical'], ['PLA drawer Printing', 'Printing']];
    for (const [name, step] of views) {
      await load(1280, 800, dark);
      if (step) { await ev(`document.querySelector('[data-template="1"]').click()`); await sleep(700); }
      if (step && step !== 'tpl') {
        await ev(`document.querySelector('tr[data-material="M001"]').click()`); await sleep(700);
        if (step !== 'Overview') { await ev(`document.querySelector('.drawer [data-tab="${step}"]').click()`); await sleep(500); await ev(`document.querySelectorAll('.drawer details').forEach((d) => { if (!/Record notes|Review notes/.test(d.querySelector('summary')?.textContent ?? '')) d.open = true; })`); await sleep(400); }
      }
      result.contrast[`${dark ? 'dark' : 'light'} ${name}`] = await ev(CONTRAST);
    }
  }
  console.log('\nM6 small text below 4.5:1:'); for (const [k, r] of Object.entries(result.contrast)) console.log(`  ${k.padEnd(28)} ${String(r.failing).padStart(5)} of ${r.small} small-text elements${r.byClass.length ? `\n      ${r.byClass.slice(0, 6).join('\n      ')}` : ''}`);
  ws.close(); proc.kill();
}

if (want('words')) await words();
if (want('agree')) await agree();
if (want('screen')) await screen();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
