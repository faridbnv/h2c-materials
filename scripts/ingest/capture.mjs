#!/usr/bin/env node
// Capturing a page whose numbers are not in the bytes it serves.
//
//   npm run ingest:capture -- --provider "BASF Forward AM / Ultrafuse"
//   npm run ingest:capture -- --doc <doc_key>
//   npm run ingest:capture -- --provider X --limit 3     the first few, to see what a library draws
//   npm run ingest:capture -- --provider X --wait 60     longer, for a library that renders slowly
//   npm run ingest:capture -- --provider X --no-expand   leave the page as it draws itself (--expand is the default)
//
// Twenty-three documents in the ledger read as `unreadable`: the server sends a page with no table of values and
// the browser draws the table afterwards from data it fetches. `ingest:fetch` hashes what the server sent, which
// for these is a shell, and the extract stage then finds nothing in it.
//
// So this opens the page in a headless browser, waits for it to stop fetching and for a value to appear in the
// text, and hashes **the document the browser ended up with**. That is a different document from the one the
// server sent, and it is recorded as one: its own digest, its own cached file, and a note saying it was captured
// rather than fetched, so nobody mistakes it for the bytes at the URL. A page that draws no value in the time
// allowed stays unreadable and says what it was waiting for.
//
// A maker's specification often sits behind a tab, an accordion or a <details> that the page draws closed, and the
// text of a panel that was never opened may not be in the document at all (lazy panels fetch it on the first click).
// So, before the document is taken, the page's own toggles are opened one by one (`EXPAND_SCRIPT`), waiting for the
// page to settle after each. It clicks nothing that leaves the page (a link, a submit button, a menu in the header,
// a dialog), so what it opens is only more of the same document. `--no-expand` captures the page as drawn.
//
// Nothing here interprets the page. The artefact is the rendered HTML, and the reader reads it exactly as it
// reads any other HTML document (D35).

import { existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { csvText, readCsv } from '../../build/src/csv.js';
import { sha256, cacheDir } from '../lib/pdf-text.mjs';
import { findChrome, launchChrome } from '../lib/cdp.mjs';
import { HEADER } from './inventory.mjs';
import { LEDGER } from './context.mjs';

const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A page has drawn its table when its text carries a number beside a unit a data sheet uses. Waiting for the
// network to fall quiet is not enough on its own: these pages finish their requests and then render.
const A_VALUE = String.raw`/\d\s*(MPa|GPa|g\/cm|kg\/m|kJ\/m|J\/m|°C|Shore)/`;

/**
 * Evaluated inside the page: open every <details>, select every tab and expand every accordion that is closed, one at a
 * time, waiting for the DOM to stop changing after each. Returns { opened, clicks, rounds }. A toggle is something the
 * page marks as one (`aria-expanded="false"`, `role="tab"`, a framework's collapse attribute or a common accordion
 * class); one inside the site header, a navigation, a form or a dialog, one that is a link to another page and one that
 * submits anything is left alone. It stops after 60 clicks or 25 s, whichever comes first.
 */
export const EXPAND_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const started = Date.now();
  // Resolves once the DOM has been quiet for 300 ms, or after 2 s of continuous change.
  const settle = () => new Promise((resolve) => {
    let quiet, cap;
    const done = () => { observer.disconnect(); clearTimeout(quiet); clearTimeout(cap); resolve(); };
    const observer = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(done, 300); });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    quiet = setTimeout(done, 300);
    cap = setTimeout(done, 2000);
  });
  const TOGGLES = [
    'summary',
    '[role="tab"]:not([aria-selected="true"])',
    '[aria-expanded="false"]',
    '[data-toggle="collapse"]', '[data-bs-toggle="collapse"]', '[data-bs-toggle="tab"]', '[data-toggle="tab"]',
    '.accordion-button.collapsed', '.accordion__button', '.accordion-header', '.accordion-title', '.accordion__title',
    '.elementor-tab-title:not(.elementor-active)', '.et_pb_toggle_closed .et_pb_toggle_title', '.wc-tabs > li:not(.active) > a',
    '.tabs > li:not(.active) > a', '.tab-title', '.tab-link', '.collapsible-trigger', '.collapsible__trigger', '.faq-question',
  ].join(',');
  const LEAVES_THE_PAGE = 'header, nav, footer, form, dialog, [role="dialog"], [role="navigation"], [role="menubar"], [role="menu"], [role="alert"], [aria-modal="true"], [id*="cookie" i], [class*="cookie" i], [class*="consent" i]';
  const allowed = (el) => {
    if (el.closest(LEAVES_THE_PAGE) || el.matches('[type="submit"], [aria-haspopup]:not([aria-haspopup="false"]), [disabled]')) return false;
    const a = el.closest('a[href]');
    if (a) { const href = a.getAttribute('href') ?? ''; if (href && !href.startsWith('#') && !/^javascript:/i.test(href)) return false; }
    return true;
  };
  let opened = 0, clicks = 0, rounds = 0;
  const done = new WeakSet();
  for (const d of document.querySelectorAll('details:not([open])')) if (!d.closest(LEAVES_THE_PAGE)) { d.open = true; opened++; }
  if (opened) await settle();
  // Opening one panel can reveal toggles of its own, so go round again until a round opens nothing new.
  while (rounds < 4 && clicks < 60 && Date.now() - started < 25000) {
    rounds++;
    const todo = [...document.querySelectorAll(TOGGLES)].filter((el) => !done.has(el) && el.tagName !== 'SUMMARY' && allowed(el));
    if (!todo.length) break;
    for (const el of todo) {
      if (clicks >= 60 || Date.now() - started >= 25000) break;
      done.add(el);
      try { el.click(); } catch { continue; }
      clicks++;
      await settle();
    }
    for (const d of document.querySelectorAll('details:not([open])')) if (!d.closest(LEAVES_THE_PAGE)) { d.open = true; opened++; }
  }
  return { opened, clicks, rounds };
})()`;

/**
 * One page, in a browser: navigate, wait for it to draw, and give back the document the browser holds.
 *
 * A page that draws a value is what this is for. A page that draws and never shows one is not a failure: it is
 * a page with no values on it, and MakerBot's support articles are exactly that — a thousand words about PLA and
 * no table. Both are captured, because what the ledger needs is the document; whether it is a data sheet is a
 * question the rest of the pipeline already asks of every document's text. Only a page that draws nothing at all
 * has failed.
 */
export async function capture(send, evaluate, url, { settleMs = 1500, waitMs = 25000, expand = true } = {}) {
  await send('Page.navigate', { url });
  const t0 = Date.now();
  let value = false, text = 0;
  while (Date.now() - t0 < waitMs) {
    await sleep(250);
    const state = await evaluate(`(() => { const t = document.body?.innerText ?? ''; return { ready: document.readyState, has: ${A_VALUE}.test(t), n: t.length }; })()`).catch(() => null);
    if (state?.ready !== 'complete') continue;
    text = state.n;
    if (state.has) { value = true; break; }
    // Drawn, with words and no values: give it a moment more in case a table is still coming, then take it.
    if (text > 400 && Date.now() - t0 > 8000) break;
  }
  if (!text) return { error: `the page drew nothing in ${Math.round((Date.now() - t0) / 1000)} s` };
  await sleep(settleMs);
  // The toggles are opened before the document is taken. A page whose script fails here is still captured as drawn.
  const expanded = expand ? await evaluate(EXPAND_SCRIPT).catch(() => null) : null;
  const html = await evaluate('document.documentElement.outerHTML');
  return { html, value, characters: text, waited: Math.round((Date.now() - t0) / 1000), expanded };
}

if (process.argv[1]?.endsWith('capture.mjs')) {
  const provider = arg('provider'), doc = arg('doc'), limit = Number(arg('limit', '0'));
  if (!provider && !doc) { console.error('name what to capture: --provider or --doc'); process.exit(2); }
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const wanted = rows.filter((r) => (doc ? r.doc_key === doc : r.provider === provider || r.manufacturer === provider)
    && (doc ? true : ['unreadable', 'inventoried'].includes(r.status)));
  const todo = limit ? wanted.slice(0, limit) : wanted;
  if (!todo.length) { console.log('nothing to capture'); process.exit(0); }

  const chrome = findChrome();
  if (!chrome) { console.error('no Chrome found (set CHROME=/path); a captured page needs a browser'); process.exit(1); }
  const profile = mkdtempSync(join(tmpdir(), 'h2c-capture-'));
  const { proc, port } = await launchChrome(chrome, profile);
  let ws, nextId = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  const digests = new Map(rows.filter((r) => r.sha256).map((r) => [r.sha256, r.doc_key]));
  const date = new Date().toISOString().slice(0, 10);
  let captured = 0, failed = 0;
  try {
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); }
    };
    await send('Runtime.enable'); await send('Page.enable');

    for (const row of todo) {
      const got = await capture(send, evaluate, row.url, { waitMs: Number(arg('wait', '25')) * 1000, expand: !process.argv.includes('--no-expand') });
      if (got.error) {
        row.status = 'unreadable';
        row.status_note = `${got.error} (captured with a browser on ${date})`;
        row.updated = date;
        failed++;
        console.log(`  ?  ${row.product_raw}: ${got.error}`);
        continue;
      }
      const bytes = Buffer.from(got.html, 'utf8');
      const sha = sha256(bytes);
      const path = cacheDir('sources/by-sha', `${sha}.html`);
      if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); }
      const twin = digests.get(sha);
      if (twin && twin !== row.doc_key) {
        Object.assign(row, { sha256: sha, status: 'duplicate-of', duplicate_of: twin, duplicate_kind: 'identical-sha', access_status: 'captured in a browser', status_note: `captured with a browser on ${date}; the same bytes as ${twin}`, updated: date });
      } else {
        digests.set(sha, row.doc_key);
        // `access_status` is how the document was reached, and it outlives a status note: the extract stage
        // rewrites the note and needs to know afterwards that a browser drew this page, because "its numbers
        // are drawn by script" stops being one of the answers once one has.
        const opened = got.expanded && (got.expanded.opened || got.expanded.clicks)
          ? `; ${got.expanded.opened} sections and ${got.expanded.clicks} tabs or toggles were opened first` : '';
        Object.assign(row, { sha256: sha, status: 'fetched-page', access_status: 'captured in a browser', updated: date,
          status_note: got.value
            ? `captured with a browser on ${date} after the page drew its table (${got.waited} s)${opened}; the artefact is the rendered document, not the bytes the server sent`
            : `captured with a browser on ${date}: the page drew ${got.characters} characters of text and no value beside a unit${opened}; the artefact is the rendered document, not the bytes the server sent` });
      }
      captured++;
      console.log(`  ${sha.slice(0, 12)}  ${String(row.product_raw).slice(0, 34).padEnd(35)} ${got.waited} s, ${(bytes.length / 1024).toFixed(0)} kB${got.value ? '' : ', no value on the page'}${got.expanded ? `, opened ${got.expanded.opened} sections, ${got.expanded.clicks} toggles` : ''}`);
      await sleep(800);
    }
  } finally {
    try { ws?.close(); } catch { /* the socket may already be gone */ }
    proc.kill();
    // Chrome writes its profile as it shuts down, so the directory is removed once it has stopped. A profile
    // left behind in the system's temporary directory is not worth failing a capture over.
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* the operating system will sweep it */ }
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  console.log(`${captured} captured, ${failed} drew nothing at all`);
  if (captured) console.log('next: npm run ingest:extract -- --provider <maker>');
}
