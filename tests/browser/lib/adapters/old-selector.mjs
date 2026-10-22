// The OLD page adapter (WP-22): everything that knows today's selector and material pages by their existing IDs and classes
// (#count, #lens, [data-template], .drawer, main[data-page], ...). The branch never edits the old code, so the old page cannot
// get new hooks; this file is where its markup is read.
//
// The steps below are the interface probe of scripts/ui-probe.mjs (114 views on the selector and the material pages, three
// screens) re-pointed from a hand-driven Chrome over CDP to Playwright over HTTP. The page-side scripts are the probe's own,
// unchanged; what moved is the plumbing (navigation, keys, the pointer, the screen). Each step returns
//   { views: { <name>: <text> }, problems: [<sentence>], notes }
// where a view is what a reader sees (the engine's counts, rows and sentences as the page prints them) and a problem is a
// layout or behaviour failure the probe would have raised. A step that throws has not run, and the caller reports it as failed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGES } from '../screens.mjs';
import { createOldBehaviours } from './old-behaviours.mjs';
import { createOldFuzzTab, waitUntil } from './old-fuzz-tab.mjs';

const CALL_MS = 60_000;
// The lenses of the old selector. The new page's adapter (new-selector.mjs) runs these same steps on the remake's selector, which draws fewer of them
// until WP-27: a step then leaves out the part that needs a lens the page does not have, and the views of that part are named as not owed.
const ALL_LENSES = Object.freeze(['table', 'ashby', 'parallel', 'coverage', 'compare', 'explain']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} o
 * @param {import('@playwright/test').Page} o.page   a page whose context already has the screen the step is to run on
 * @param {string} o.origin   http://127.0.0.1:<port>
 * @param {string} o.base     the base path the site is mounted at, with both slashes
 * @param {object} o.meta     dist/db.json's meta (release, snapshot)
 * @param {string} o.root     the repository root
 * @param {object|null} [o.watch]    the page's watcher (lib/watch.mjs), which the behaviours that read dialogs need
 * @param {string|null} [o.scratch]  a folder to write files in, which the behaviours that import a file need
 * @param {readonly string[]} [o.lenses]  the lenses the page draws; the steps skip what needs another
 */
export function createOldSelector({ page, origin, base, meta, root, watch = null, scratch = null, lenses = ALL_LENSES }) {
  const has = (lens) => lenses.includes(lens);
  const pageUrl = `${origin}${base}`;
  const materialUrl = (file) => `${origin}${base}materials/${file}`;
  const productsCheck = readFileSync(join(root, 'scripts/lib/page-products-check.js'), 'utf8');
  let results = {}, layoutProblems = [], notes = {}, errors = [];

  const evaluate = (expression) => page.evaluate(expression);
  const until = (expression, what, ms) => waitUntil(page, expression, what, { ms });
  /** Go to an address and say whether it answered 200: a page that did not load is an error, never a quiet empty view. */
  const go = async (url) => {
    const response = await page.goto(url, { waitUntil: 'load', timeout: CALL_MS });
    if (response !== null && !response.ok()) throw new Error(`${url} answered HTTP ${response.status()}`);
    if (response === null && page.url().split('#')[0] !== url.split('#')[0]) throw new Error(`${url} did not load (the page is at ${page.url()})`);
  };
  const open = async (url) => {
    await go(url);
    await until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim()`, 'the page to render');
    await sleep(200);
  };
  // Open a page and wait for what a reader waits for: the page's own main element, then its fonts. The address is checked too,
  // so the page left behind by the last step is never mistaken for the new one; `landed` is the address the page settles on
  // where it rewrites its own.
  const openPage = async (url, landed = url) => {
    await go(url);
    await until(`location.href === ${JSON.stringify(landed)} && document.readyState === 'complete' && !!document.querySelector('main[data-page]')`, 'the page to render');
    await evaluate('document.fonts.ready.then(() => true)');
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

  // How far from its line a jump may land its target, in pixels: the line is the bottom of what covers the top of the
  // screen (the sticky bar; on a Products page its controls, and over the list its head) plus the gap the stylesheet sets
  // (frame.src.css --anchor-top: 16 px).
  const ANCHOR_TOLERANCE = 4;
  const ANCHOR_GAP = 16;

  // The layout record of a step as text, and the failures in it. A strict step is one in Confirmed only,
  // where the drawer must show no estimate.
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
    // Recorded, those lines failed CI on every push from 944dedd while the layout itself held. They are kept in `notes`, not
    // in the view; what they were there to show is asserted below as a failure, with room for a font's difference.
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

  // What the page holds, as names and counts: its sections, its figures, the bar and the fonts.
  const pageFacts = () => evaluate(`(() => {
    const main = document.querySelector('main[data-page]');
    // The footer is set after main (a band across the width, coherence round C31) and is counted with the sections.
    const sections = [...document.querySelectorAll('[data-section]')].map((s) => (s.dataset.section === 'family' ? 'family ' + s.dataset.family : s.dataset.section));
    const figures = [...main.querySelectorAll('figure')].map((f) => ({ id: f.id, svg: !!f.querySelector('svg'), caption: (f.querySelector('figcaption')?.textContent ?? '').trim().length > 0 }));
    const bar = document.querySelector('.atlas-bar');
    const back = document.querySelector('.atlas-bar [data-return]');
    const box = back?.getBoundingClientRect();
    const facts = bar ? { sticky: getComputedStyle(bar).position === 'sticky', top: bar.getBoundingClientRect().top <= 0.5,
      sections: document.querySelectorAll('.atlas-bar .here-list a[href^="#"]').length, back: !!box && box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1 } : null;
    // The skip link waits off screen until it is focused; it is not a control the reader cannot reach.
    const skipOff = [...document.querySelectorAll('a.skip')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.left >= innerWidth || r.right <= 0); }).length;
    return { kind: main.dataset.page, sections, figures, bar: facts, skipOff, fonts: [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ''), status: f.status })) };
  })()`);

  // Lighting a product across the figures: the pointer on a mark lights that product's marks and fades the rest, and
  // leaving the figure puts it back; so does the pointer on the product's name outside the figures. Events are dispatched
  // as the browser would deliver them (page.js listens for pointermove and pointerleave on a figure's svg, pointerover and
  // pointerout on the page).
  const lightingWorks = () => evaluate(`(() => {
    const seen = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const m = [...document.querySelectorAll('figure .mk[data-grade]')].find(seen);
    if (!m) return 'no figure mark carries a product';
    const r = m.getBoundingClientRect(), svg = m.closest('svg');
    const lit = () => document.body.classList.contains('lighting') && document.querySelectorAll('figure .mk.lit').length > 0;
    const clear = () => !document.body.classList.contains('lighting') && !document.querySelector('.lit');
    m.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse' }));
    if (!lit()) return 'a mark under the pointer lit no product';
    svg.dispatchEvent(new PointerEvent('pointerleave'));
    if (!clear()) return 'leaving the figure left a product lit';
    const name = [...document.querySelectorAll('main [data-grade]')].find((el) => !el.closest('svg') && seen(el) && document.querySelector('figure .mk[data-grade="' + CSS.escape(el.dataset.grade) + '"]'));
    if (name) {
      name.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
      if (!lit()) return 'a product\\'s name lit none of its marks';
      name.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
      if (!clear()) return 'leaving a product\\'s name left it lit';
    }
    return 'works';
  })()`);

  // Every section the bar lists, every figure, and on a Products page its first, middle and last product's card, reached
  // from the top of the page (a section by its link in the bar, the rest by the address): the target must land within
  // ANCHOR_TOLERANCE of the line under what covers the top of the screen plus ANCHOR_GAP, or, where the page starts or ends
  // before it can get there, no higher than that cover; and a section reached by the bar must leave the bar naming it
  // (its link aria-current), except at the foot of the page, where the last section is current whatever the click.
  // Returns the count and, per failure, a sentence with the measurements.
  const checkAnchors = async () => {
    const targets = await evaluate(`(() => {
      const bar = [...document.querySelectorAll('.atlas-bar .here-list a[href^="#"]')].map((a) => ({ href: a.getAttribute('href'), bar: true }));
      const figs = [...document.querySelectorAll('main figure[id]')].map((f) => ({ href: '#' + f.id, bar: false }));
      const cards = [...document.querySelectorAll('[data-products] details[data-grade]')];
      const some = [...new Set([cards[0], cards[Math.floor(cards.length / 2)], cards.at(-1)].filter(Boolean))];
      return [...bar, ...figs, ...some.map((d) => ({ href: '#' + d.id, bar: false }))];
    })()`);
    const failures = [];
    for (const t of targets) {
      const r = JSON.parse(await evaluate(`(async () => {
        const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        window.scrollTo(0, 0); history.replaceState(null, '', location.pathname);
        await frames();
        const href = ${JSON.stringify(t.href)};
        const link = ${t.bar} ? document.querySelector('.atlas-bar .here-list a[href=' + JSON.stringify(href) + ']') : null;
        if (link) link.click(); else location.hash = href;
        await new Promise((done) => setTimeout(done, 150));
        await frames();
        const el = document.getElementById(href.slice(1));
        // What covers the top of the screen: the bar and a Products page's controls, each where it is stuck at its sticky
        // offset (above that it is still in the page's flow and covers nothing); and in a list with a sticky head, the head,
        // which a card lands under whether it is stuck there or sits in the flow just above the card.
        const stuck = (e) => { if (!e || e.hidden) return 0; const s = getComputedStyle(e); if (s.position !== 'sticky' && s.position !== 'fixed') return 0; const b = e.getBoundingClientRect(); return b.height > 0 && Math.abs(b.top - (parseFloat(s.top) || 0)) <= 1 ? b.bottom : 0; };
        const head = el?.closest('.pl')?.querySelector('.pl-h');
        const ctl = Math.max(stuck(document.querySelector('.atlas-bar')), stuck(document.querySelector('.pl-ctl')));
        const covered = ctl + (head && getComputedStyle(head).position === 'sticky' ? head.getBoundingClientRect().height : 0);
        // The section the bar should name (page.js): the last whose top is within the reading margin under the bar.
        const line = ctl + ${ANCHOR_GAP} + Math.min(160, innerHeight * 0.25);
        const links = [...document.querySelectorAll('.atlas-bar .here-list a[href^="#"]')].map((a) => a.getAttribute('href'));
        let want = links[0];
        for (const h of links) { const s = document.getElementById(h.slice(1)); if (s && s.getBoundingClientRect().top <= line) want = h; }
        const current = document.querySelector('.atlas-bar .here-list a[aria-current="true"]')?.getAttribute('href');
        return JSON.stringify({ found: !!el, top: el ? el.getBoundingClientRect().top : 0, covered, atEnd: scrollY >= document.documentElement.scrollHeight - innerHeight - 1, atStart: scrollY <= 0, current, want });
      })()`));
      const line = r.covered + ANCHOR_GAP;
      if (!r.found) { failures.push(`${t.href} is not on the page`); continue; }
      const placed = r.atEnd || r.atStart ? r.top >= r.covered - 0.5 : Math.abs(r.top - line) <= ANCHOR_TOLERANCE;
      const marked = !t.bar || r.atEnd || r.current === r.want;
      if (!placed) failures.push(`${t.href} lands at ${r.top.toFixed(1)} px, not ${line.toFixed(1)} (what is sticky covers ${r.covered.toFixed(1)}${r.atEnd ? ', the page ends' : ''})`);
      else if (!marked) failures.push(`${t.href} was chosen in the bar and it names ${r.current ?? 'nothing'}, not ${r.want}`);
    }
    await evaluate('(window.scrollTo(0, 0), history.replaceState(null, "", location.pathname), true)');
    return { checked: targets.length, failures };
  };

  // A figure's words that a reader cannot read: an SVG text cut by what clips it (its svg where the svg clips, any element
  // around it that clips sideways, and the screen), or set over another text of the same svg by more than 4 px each way.
  // The 2026-10-17 blind read found peak and limit labels cut at 390 px on 17 of 40 pages, which the spill check could not
  // see inside a clipping svg. A figure that scrolls sideways on a narrow screen (the alternatives) holds its words within
  // reach: the screen's edge does not cut what such a box scrolls to.
  const figureText = () => evaluate(`(() => {
    const W = innerWidth, out = [];
    const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden'; };
    for (const svg of document.querySelectorAll('figure svg')) {
      if (!vis(svg) || !svg.getBoundingClientRect().width) continue;
      let left = -Infinity, right = Infinity, scrolls = false;
      for (let el = svg; el && el !== document.body && !scrolls; el = el.parentElement) {
        const s = getComputedStyle(el);
        if (el !== svg && el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(s.overflowX)) { scrolls = true; break; }
        if (el instanceof SVGSVGElement ? s.overflow !== 'visible' : /hidden|clip|auto|scroll/.test(s.overflowX)) { const b = el.getBoundingClientRect(); left = Math.max(left, b.left); right = Math.min(right, b.right); }
      }
      if (!scrolls) { left = Math.max(left, 0); right = Math.min(right, W); }
      const boxes = [...svg.querySelectorAll(':scope > text, :scope > g > text, :scope > a > text')].filter((t) => vis(t) && t.textContent.trim()).map((t) => [t, t.getBoundingClientRect()]).filter(([, r]) => r.width > 0);
      const fig = svg.closest('figure')?.id ?? 'a figure';
      for (const [t, r] of boxes) if (r.left < left - 1 || r.right > right + 1) out.push(fig + ': "' + t.textContent.trim().slice(0, 30) + '" cut');
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const [a, A] = boxes[i], [c, C] = boxes[j];
        if (Math.min(A.right, C.right) - Math.max(A.left, C.left) > 4 && Math.min(A.bottom, C.bottom) - Math.max(A.top, C.top) > 4) out.push(fig + ': "' + a.textContent.trim().slice(0, 20) + '" over "' + c.textContent.trim().slice(0, 20) + '"');
      }
    }
    return out;
  })()`);

  // One page on one screen as text (50-page-<screen>-<slug>), and the failures in it. Like a layout record it names and
  // counts, never positions. The anchor and Products checks drive the page and so run only where a reader scrolls and
  // taps differently: the laptop and the phone.
  const recordPage = async (screen, [slug, file, kind]) => {
    const key = `50-page-${screen.name}-${slug}`;
    const fail = (what) => layoutProblems.push(`${key}: ${what}`);
    const t0 = Date.now();
    await openPage(materialUrl(file));
    const m = await measureLayout(screen, { tables: 'main table', through: 'main[data-page]' });
    const facts = await pageFacts();
    if (facts.kind !== kind) fail(`main[data-page] is "${facts.kind}", not "${kind}"`);

    // A material page scrolls its document, so a classic scrollbar (Linux's Chrome on CI) takes 15 px of the screen that
    // an overlay one (macOS) does not: the page is held to the room it has, the document element's client width, and the
    // view says whether it fits rather than a width that depends on the machine (2026-10-17, CI read 1165 where macOS 1180).
    const room = await evaluate('document.documentElement.clientWidth');
    const overflow = m.documentWidth > room;
    const byClass = {};
    for (const t of m.tables) { const c = byClass[t.cls || 'table'] ??= { tables: 0, clipped: 0, cells: 0 }; c.tables++; c.clipped += t.clipped; c.cells += t.cells; }
    const clippedClasses = Object.entries(byClass).filter(([, c]) => c.clipped);
    const lines = [
      `viewport ${screen.width}x${screen.height}`,
      overflow ? `document width ${m.documentWidth} OVERFLOW (room ${room})` : 'document width: fits the screen',
      m.spill.length ? `spill:\n${m.spill.slice(0, LISTED).map((p) => `  ${p}`).join('\n')}${m.spill.length > LISTED ? `\n  +${m.spill.length - LISTED} more` : ''}` : 'spill: none',
      clippedClasses.length ? `clipped cells:\n${clippedClasses.map(([c, v]) => `  ${c}: ${v.clipped} of ${v.cells}`).join('\n')}` : `clipped cells: none in ${m.tables.length} tables`,
      `hidden controls: ${m.offScreen - facts.skipOff}`,
    ];
    if (overflow) fail(`the page is ${m.documentWidth} px wide where it has ${room} px of a ${screen.width} px screen`);
    if (m.spill.length) fail(`${m.spill.length} element(s) past the right edge of the screen: ${m.spill.slice(0, 5).join('; ')}${m.spill.length > 5 ? '; ...' : ''}`);
    for (const [c, v] of clippedClasses) fail(`${v.clipped} of ${v.cells} cells clipped in ${c}`);
    const unreadable = await figureText();
    lines.push(unreadable.length ? `figure text cut or overlapping:\n${unreadable.slice(0, LISTED).map((x) => `  ${x}`).join('\n')}` : 'figure text: all of it readable');
    if (unreadable.length) fail(`${unreadable.length} figure text(s) cut or overlapping: ${unreadable.slice(0, 4).join('; ')}`);
    notes[key] = [`scrolls sideways: ${m.sideways.length ? m.sideways.join('; ') : 'none'}`];

    lines.push(`sections (${facts.sections.length}): ${facts.sections.join(', ') || 'none'}`);
    if (!facts.sections.length) fail('the page holds no section');
    const withSvg = facts.figures.filter((f) => f.svg).length, withCaption = facts.figures.filter((f) => f.caption).length;
    lines.push(`figures: ${facts.figures.length}, with an svg ${withSvg}, with a caption ${withCaption}`);
    for (const f of facts.figures) if (!f.caption) fail(`the figure ${f.id || '(no id)'} has no figcaption`);

    // The bar: sticky at the top on every screen, its list of the page's sections, the way back to the selector on screen.
    const b = facts.bar;
    if (!b) { lines.push('bar: none'); fail('the page has no bar'); }
    else {
      lines.push(`bar: ${b.sticky ? 'sticky' : 'not sticky'}, ${b.sections} section${b.sections === 1 ? '' : 's'} listed, the way back ${b.back ? 'on screen' : 'off screen'}`);
      if (!b.sticky || !b.top) fail('the bar is not sticky at the top of the screen');
      if (!b.back) fail('the way back to the selector is not on screen');
      if (kind !== 'hub' && !b.sections) fail('the bar lists no section');
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

    if (kind === 'overview') {
      const lit = await lightingWorks();
      lines.push(`lighting: ${lit}`);
      if (lit !== 'works') fail(`lighting: ${lit}`);
    }

    if (screen.name !== 'tablet') {
      const anchors = await checkAnchors();
      lines.push(`anchors: ${anchors.checked} checked`);
      for (const a of anchors.failures) fail(`anchor ${a}`);
      if (!anchors.checked && kind !== 'hub') fail('no section, figure or card to reach');
      if (kind === 'products') {
        const t1 = Date.now();
        let r;
        try { r = await evaluate(productsCheck); } catch (e) { r = { error: e.message }; }
        if (r.error) { lines.push('products: could not run'); fail(`the Products check could not run: ${r.error}`); }
        else {
          lines.push(`products: ${r.products} products, ${r.sorts} sorts, ${r.queries.length} searches, ${r.checks} checks`);
          if (r.failures) fail(`${r.failures} of ${r.checks} Products checks failed, the first ${JSON.stringify(r.first)}`);
          if (!r.checks) fail('the Products check ran no check');
        }
        notes[key].push(`Products check ${((Date.now() - t1) / 1000).toFixed(1)} s`);
      }
    }
    notes[key].push(`page ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    results[key] = lines.join('\n');
  };

  // The return trip (D145): the selector's drawer opens an Overview with ?from=<its own hash>. The page keeps the selection
  // for the tab and takes it out of its address; every way back (a[data-return], and the mark in the bar) then reopens the
  // selector with that selection and the drawer on the page's material; the Products page opened next in the same tab
  // does too. A selection with one requirement, on the laptop; the tab's stored selection is cleared after, so no other
  // view sees it.
  const returnTrip = async () => {
    const key = '50-page-return-trip';
    const scenarioModule = await import(pathToFileURL(join(root, 'app/js/engine/scenario.js')).href);
    const fail = (what) => layoutProblems.push(`${key}: ${what}`);
    const { newScenario, toHash, fromHash } = scenarioModule;
    const asked = { ...newScenario(meta), constraints: [{ kind: 'numeric', property: 'hdt045', operator: '>=', value: 60, mandatory: true }] };
    // A selection compared as its link writes it (toHash): reading one stamps it with the time it was read.
    const want = toHash(fromHash(toHash({ ...asked, openMaterial: 'M001' }), meta).scenario);
    const lines = [];
    const backs = () => evaluate(`[...document.querySelectorAll('[data-return], [data-return-brand]')].map((a) => a.getAttribute('href'))`);
    const holds = (hrefs, where) => {
      const read = hrefs.map((h) => { try { return fromHash(h.split('#')[1] ?? '', meta)?.scenario ?? null; } catch { return null; } });
      const ok = read.filter((s) => s && toHash(s) === want).length;
      lines.push(`${where}: ${ok} of ${hrefs.length} ways back reopen the selection with M001's drawer`);
      if (!hrefs.length) fail(`${where}: no way back`);
      else if (ok !== hrefs.length) fail(`${where}: a way back reopens ${decodeURIComponent(read.map((s) => (s ? toHash(s) : 'nothing')).find((h) => h !== want) ?? '').slice(0, 200)}, not the selection with M001's drawer`);
    };
    await page.setViewportSize({ width: 1180, height: 760 });
    try {
      const overview = materialUrl('M001.html');
      await openPage(`${overview}?from=${toHash(asked)}`, overview);
      lines.push('the address: the selection taken out of it');
      holds(await backs(), 'the Overview');
      lines.push(`the way back reads: ${await evaluate(`document.querySelector('.atlas-bar [data-return] .ret-long')?.textContent ?? 'nothing'`)}`);
      const products = materialUrl('M001-products.html');
      await openPage(products);
      holds(await backs(), 'the Products page, next in the tab');
    } catch (e) {
      fail(`the return trip did not finish: ${e.message}`);
    } finally {
      await evaluate(`(() => { try { sessionStorage.removeItem('atlas-return'); } catch {} return true; })()`).catch(() => true);
    }
    results[key] = lines.join('\n');
  };

  /** Wait for an element to exist, then give the page `ms` to settle. */
  const when = (selector, ms = 150) => until(`!!document.querySelector(${JSON.stringify(selector)})`, selector).then(() => sleep(ms));

  const drawerText = () => evaluate(`(document.querySelector('.drawer-body')?.innerText ?? 'NO DRAWER').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim().split('\\n').slice(0, 80).join('\\n')`);

  /** Run one step: clear what steps collect, let `body` fill it, and hand back the step's views, problems and notes. */
  const run = async (body) => {
    results = {}; layoutProblems = []; notes = {}; errors = [];
    await body();
    return { views: results, problems: [...errors, ...layoutProblems], notes };
  };

  const steps = {
    /** The start screen, every template in both modes (and its link reopened), and three pins in Compare. */
    selectorTemplates: () => run(async () => {
      await open(pageUrl);
      results['01-default'] = await tableView();
      const templates = await evaluate(`[...document.querySelectorAll('[data-template]')].map((b) => b.innerText.split('\\n')[0].trim())`);
      if (!templates.length) throw new Error('the start screen shows no templates');
      for (const [i, name] of templates.entries()) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await open(pageUrl);
        await click(`[data-template="${i}"]`);
        // A template keeps the reader's mode (C08, D148): Leave out is set here, not assumed from the template.
        await click('#mode-strict');
        await sleep(200);
        results[`10-${slug}-strict`] = await tableView();
        await click('#mode-explore');
        await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
        await sleep(200);
        // D137, D155: opening "Unlikely to meet" changes presentation only. It starts closed, every row stays in the result
        // set, the displayed count does not move, and the groups' tables come in their one order.
        const grouping = await evaluate(`(() => {
          const problems = [], count = document.getElementById('count').textContent;
          const order = ['meets', 'one-check-away', 'not-enough-data', 'unlikely-to-meet', 'hidden', 'fail'];
          const seen = [...document.querySelectorAll('#lens table.grid[data-group]')].map((t) => t.dataset.group);
          if (seen.some((g, i) => i && order.indexOf(g) <= order.indexOf(seen[i - 1]))) problems.push('the groups are out of order: ' + seen.join(', '));
          if (/Supported candidates|Estimated candidate|Insufficient evidence|Excluded \\/ screened|Hidden as unlikely|SCREENED|screened out/.test(document.getElementById('lens').textContent + ' ' + document.querySelector('.statusbar').textContent)) problems.push('an old group name is on screen');
          // One word for one idea (stage 3d): a hidden row says why, a failing row what it failed, and no decision code shows.
          for (const tr of document.querySelectorAll('#lens table.grid[data-group="hidden"] tr[data-material]')) if (!tr.querySelector('.hidden-why')?.textContent.trim()) problems.push('a hidden row gives no reason: ' + tr.dataset.material);
          for (const tr of document.querySelectorAll('#lens table.grid[data-group="fail"] tr[data-material]')) if (!/^fails: /.test(tr.querySelector('.fail-why')?.textContent ?? '')) problems.push('a failing row does not say what failed: ' + tr.dataset.material);
          if (/\\(D\\d{2,3}\\)/.test(document.getElementById('lens').textContent)) problems.push('a decision code is on screen');
          const d = document.querySelector('details.unlikely-to-meet');
          if (!d) return problems;
          const ids = () => [...document.querySelectorAll('#lens tbody tr[data-material]')].map((r) => r.dataset.material).join(',');
          const before = ids();
          if (d.open) problems.push('unlikely to meet starts open');
          if (!/^Unlikely to meet \\(\\d+\\): folded, still counted and in the download$/.test(d.querySelector('summary').textContent.trim())) problems.push('the fold does not say it is still counted and in the download');
          d.open = true;
          if (ids() !== before || document.getElementById('count').textContent !== count) problems.push('opening it changes rows or counts');
          if (!d.querySelector('tr[data-material]')?.getBoundingClientRect().height) problems.push('opening it does not reveal its rows');
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
        await page.goto('about:blank');
        await sleep(300);
        await open(`${pageUrl}${hash}`);
        const reopened = await view();
        if (reopened !== explore) {
          const a = explore.split('\n'), b = reopened.split('\n');
          const at = a.findIndex((line, j) => line !== b[j]);
          errors.push(`${name}: the shared link does not reproduce the Explore view (hash ${hash.slice(0, 120)}; first difference at line ${at + 1}: "${a[at]}" vs "${b[at]}")`);
        }
      }
      if (has('compare')) {
        await open(pageUrl);
        await click('[data-template="0"]');
        await click('#mode-explore');
        const pins = await evaluate(`[...document.querySelectorAll('#lens [data-pin]')].slice(0, 3).map((b) => (b.click(), b.dataset.pin))`);
        if (pins.length < 3) errors.push(`only ${pins.length} rows to pin`);
        await sleep(200);
        await click('[data-lens="compare"]');
        await sleep(300);
        results['20-compare-three-pins'] = await view();
      }
    }),
    /** The drawer of PLA (its tabs and comparisons) and of the materials that carry the other comparisons. */
    selectorDrawers: () => run(async () => {
      await open(pageUrl);
      await click('#mode-explore');
      await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
      await click('#lens tr[data-material="M001"]');
      await until(`!!document.querySelector('.drawer')`, 'the PLA drawer');
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
    }),
    /** A template ranked, the first-ranked material's Products tab, what makers say, a product chosen. */
    selectorRanked: () => run(async () => {
      await open(pageUrl);
      await click('[data-template="4"]');
      await click('#mode-strict');
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
      results['16-chosen-product'] = await evaluate(`[...document.querySelectorAll('.chosen')].map((e) => e.innerText).join('\\n').replace(/[ \\t]+/g, ' ').replace(/release [0-9a-f]{12}/g, 'release <id>').replace(/chosen \\d{4}-\\d{2}-\\d{2}/g, 'chosen <date>').replace(/chosen \\d{1,2} [A-Z][a-z]{2} \\d{4}/g, 'chosen <date>').trim()`);
    }),
    /** The family rail: a family, then one of its polymers. */
    selectorFamily: () => run(async () => {
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
    }),
    /** The layout of the selector on one screen: the page's context has the screen. */
    selectorLayout: (screen) => run(async () => {
      await open(pageUrl);
      await recordLayout(screen, 'default');
      // The cold page on a laptop shows where the results start (2026-10-18, the selector-refinement round): the table's
      // bar (Properties or Printing, Rank by, Compare against) above the fold, under the templates; it had started 130 px
      // below it.
      if (screen.name === 'laptop') {
        const fold = await evaluate(`(() => { const lens = document.getElementById('lens').getBoundingClientRect(); const bar = document.querySelector('#lens .table-bar'); const b = bar?.getBoundingClientRect(); return b ? Math.round(b.bottom - Math.min(lens.bottom, innerHeight)) : null; })()`);
        if (fold === null || fold > 0) layoutProblems.push(`laptop default: the table's bar is ${fold === null ? 'not on the page' : `${fold} px below the fold`}; the cold page shows where the results start`);
      }
      // Below 1100 px the filter rail covers the results when open, so it is a modal dialog (F10): Shift+Tab from its
      // close button stays inside it, and Escape closes it and returns focus to Filters.
      if (screen.width < 1100) {
        await click('#btn-filters');
        const inside = await evaluate(`(() => { const r = document.getElementById('rail'); return r.getAttribute('aria-modal') === 'true' && document.querySelector('.topbar').inert && r.contains(document.activeElement); })()`);
        for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+Tab');
        const kept = await evaluate(`document.getElementById('rail').contains(document.activeElement)`);
        await page.keyboard.press('Escape');
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

      if (has('ashby')) {
        await click('[data-lens="ashby"]');
        await when('#plot .main-svg', 300);
        if (await evaluate(`(() => { const c = document.querySelector('[data-show-estimates]'); if (!c || c.checked) return false; c.click(); return true; })()`)) await when('#plot .main-svg', 300);
        await recordLayout(screen, 'ashby');
      }
      for (const lens of ['parallel', 'coverage', 'compare', 'explain'].filter(has)) {
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
    }),
    /** The answer before the exposition at 1024 x 768. */
    selectorWarm: () => run(async () => {
      // The answer before the exposition (the review of 2026-09-27, F09), on the plan's own laptop, 1024 x 768: a template's
      // first three candidate rows show without scrolling, and a material's Products tab opens on a product that passes,
      // its verdict, state and recipe in the drawer's first view.
      await page.setViewportSize({ width: 1024, height: 768 });
      await open(pageUrl);
      await click('[data-template="3"]');
      await click('#mode-strict');
      await sleep(200);
      const rowsInView = await evaluate(`[...document.querySelectorAll('#lens tbody tr[data-material]')].filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight).length`);
      if (rowsInView < 3) layoutProblems.push(`1024x768-warm: ${rowsInView} candidate row(s) in view before scrolling; at least 3 should be`);
      await click('#lens tbody tr[data-material]');
      await when('.drawer');
      await click('.drawer [data-tab="Grades"]');
      await sleep(200);
      const firstView = await evaluate(`(() => { const body = document.querySelector('.drawer-body'); const b = body?.querySelector('.pass-block .grade-block'); if (!b) return 'no passing product block'; const bottom = body.getBoundingClientRect().bottom; const card = b.querySelector('.print-card'); return b.getBoundingClientRect().top < bottom && (!card || card.getBoundingClientRect().top < bottom) ? 'ok' : 'below the first view'; })()`);
      if (firstView !== 'ok') layoutProblems.push(`1024x768-warm-products: the first passing product and its recipe are ${firstView}`);
    }),
    /** The Ashby decision workspace: its size at two screens, the keyboard, keeping place, marks, Material typicals. */
    selectorAshby: () => run(async () => {
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
        await page.setViewportSize({ width, height });
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
      await page.setViewportSize({ width: 1180, height: 760 });
      await open(beamUrl);
      await when('#plot .main-svg', 400);
      results['40-ashby-beam-decision'] = await view();
      // Enter as a keyboard types it, with its character, which is what activates a focused button.
      const key = () => page.keyboard.press('Enter');
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
        await page.mouse.move(at[0], at[1]);
        await sleep(120);
        await page.mouse.down();
        await page.mouse.up();
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
    }),
    /** The material pages on the page's screen. */
    materialPages: (screen) => run(async () => {
      for (const entry of PAGES) await recordPage(screen, entry);
    }),
    returnTrip: () => run(returnTrip),
  };

  // The pages axe is run on, one per lens of the selector, the drawer, and each material page of the probe. `prepare` brings the page to the
  // state the report is about; the caller scans it.
  const LENSES = ['table', 'ashby', 'parallel', 'coverage', 'compare', 'explain'];
  const explored = async () => {
    await open(pageUrl);
    await click('[data-template="0"]');
    await click('#mode-explore');
    await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await sleep(200);
  };
  const axeTargets = () => [
    { slug: 'selector-start', title: 'selector: start screen', prepare: () => open(pageUrl) },
    ...LENSES.map((lens) => ({
      slug: `selector-lens-${lens}`, title: `selector: ${lens} lens`,
      prepare: async () => {
        await explored();
        if (lens === 'compare') { await evaluate(`[...document.querySelectorAll('#lens [data-pin]')].slice(0, 3).map((b) => (b.click(), b.dataset.pin))`); await sleep(200); }
        await click(`[data-lens="${lens}"]`);
        if (lens === 'ashby') await until(`!!document.querySelector('#plot .main-svg')`, 'the Ashby plot');
        await sleep(400);
      },
    })),
    { slug: 'selector-drawer', title: 'selector: material drawer', prepare: async () => { await explored(); await click('#lens tr[data-material]'); await until(`!!document.querySelector('.drawer')`, 'the drawer'); await sleep(300); } },
    ...PAGES.map(([slug, file]) => ({ slug: `page-${slug}`, title: `material page: ${slug}`, prepare: () => openPage(materialUrl(file)) })),
  ];

  // Where the page is read for a boot measurement: its address, and the expression that is true when it has shown its first results.
  const perfTarget = { url: pageUrl, ready: `!!document.getElementById('count')?.textContent.trim() && document.getElementById('lens')?.children.length > 0` };
  const behaviours = createOldBehaviours({ page, root, meta, watch, scratch, pageUrl, evaluate, until, open, click, sleep, view });
  return { id: 'old', steps, behaviours, axeTargets, perfTarget, fuzzTab: createOldFuzzTab, pageUrl, materialUrl, evaluate, until, open, go };
}
