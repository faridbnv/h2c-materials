// The selector steps of the NEW page adapter (WP-26): the selector of the remake (apps/public, published at /v3/) answering the contract of
// contract.mjs, so that the same probe, fuzz and behaviours that judge the old page judge it.
//
// How the views are read. The new selector keeps the old page's markup where the facts layer writes it (the drawer, the cells, the rail's
// groups), and the old page's ids and data attributes with it, so the interface probe's page-side readers run on it unchanged: the steps
// below are the old adapter's own (old-selector.mjs), pointed at the view's address, and a view is the text a reader sees, compared with the
// same baseline (build/snapshot/ui). That is the point of the comparison: one reader, two pages, one text. What differs is the plumbing. The new
// page draws with Vue, so a press changes the page a moment later and a part (the estimates, a material's detail) may arrive first; the page
// the steps are given waits until the page says it is no longer waiting (data-busy) before it reads. The fuzz tab (new-fuzz-tab.mjs) and the
// behaviours (new-behaviours.mjs) are the new page's own and read it through data-testid hooks.
//
// What the page does not draw yet, and so what no step of it owes: the Ashby lens, the parallel lines, the coverage view and Compare arrive
// with WP-27 (their views are named in NOT_OWED, with the reason), and the material pages are the old pages until their own package.
import { createOldSelector } from './old-selector.mjs';
import { createNewBehaviours } from './new-behaviours.mjs';
import { createNewFuzzTab } from './new-fuzz-tab.mjs';
import { unsupported } from './contract.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WP27 = 'the Ashby lens, the parallel lines, the coverage view and Compare are rebuilt in WP-27';
const PAGES = 'the material pages stay the old pages until their own package; the selector rebuild does not change them';

/** The lenses the new selector draws, and the baseline views no step of it owes, with why. A step reports a view it does not owe as named, never as passed. */
export const NEW_LENSES = Object.freeze(['table', 'explain']);
export const NOT_OWED = Object.freeze({
  selectorTemplates: { pattern: /^20-/, reason: WP27 },
  selectorLayout: { pattern: /^30-[a-z]+-(ashby|compare|coverage|parallel)$/, reason: WP27 },
  selectorRanked: { lines: { '16-chosen-product': ['Download the decision brief'] }, reason: 'the decision brief and the export are rebuilt in their own package; the chosen product, its record and its notes are drawn' },
});

/** A page whose reads wait for the selector to have finished what it was doing: its estimates part or a drawer's parts arriving. */
export function settled(page) {
  if (page === null) return null;
  const wait = `(async () => { for (let i = 0; i < 6000; i++) { if (!document.querySelector('[data-busy="true"]')) return true; await new Promise((r) => setTimeout(r, 5)); } return false; })()`;
  return new Proxy(page, {
    get(target, prop) {
      if (prop === 'evaluate') {
        return async (...args) => {
          if (typeof args[0] === 'string' && !page.url().startsWith('about:')) {
            if (await target.evaluate(wait).catch(() => true) === false) throw new Error('the page was still waiting for its data after 30 s');
          }
          return target.evaluate(...args);
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export function createNewSelector({ page, origin, base, meta, root, watch = null, scratch = null }) {
  // The page under the checks that compare it with the old page and the old engine is the public view built from the OLD database (lib/site.mjs,
  // SAME_DATABASE_DIR): the same code on the data the old page drew, so the registered reprint transition, which moves the new build's medians,
  // is not read as a fault of the page. The view of the release itself (v3/) is the delivery and release checks' (new-page.spec, delivery.spec).
  const view = `${base}v3-olddb/`;
  const pageUrl = `${origin}${view}`;
  const waiting = settled(page);
  const old = createOldSelector({ page: waiting, origin, base: view, meta, root, watch, scratch, lenses: NEW_LENSES });
  const tid = (id) => `[data-testid="${id}"]`;
  const evaluate = (expression) => waiting.evaluate(expression);
  const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('no ' + ${JSON.stringify(selector)}); el.click(); return true; })()`);
  // What a reader sees: the count, the status chips that are shown, and the lens.
  const read = () => evaluate(`(() => {
    const text = (el) => (el?.innerText ?? '').replace(/[ \\t]+/g, ' ').replace(/\\n\\s*\\n+/g, '\\n').trim();
    const chips = ['PASS', 'UNKNOWN', 'FAIL', 'screened'].map((v) => document.querySelector('[data-testid="status-' + v + '"]')).filter((e) => e && !e.hidden).map(text).join(' | ');
    return ['COUNT ' + text(document.querySelector('[data-testid="count"]')), 'STATUS ' + chips, text(document.querySelector('[data-testid="lens"]'))].join('\\n');
  })()`);
  /** Go to an address of the view and wait until it has drawn its first answer. */
  const open = async (url) => {
    await old.go(url);
    await old.until(`document.readyState === 'complete' && document.querySelector('${tid('lens')}')?.dataset.state === 'ready' && !!document.querySelector('${tid('count')}')?.textContent.trim()`, 'the page to render');
    await sleep(200);
  };
  const behaviours = createNewBehaviours({ page: waiting, root, meta, pageUrl, scratch, evaluate, until: old.until, open, click, sleep, view: read });

  const steps = {
    ...old.steps,
    selectorAshby: unsupported(WP27),
    materialPages: unsupported(PAGES),
    returnTrip: unsupported(PAGES),
  };
  // The pages axe is run on: the start screen, the two lenses the page draws, and the drawer.
  const explored = async () => {
    await old.open(pageUrl);
    await click('[data-template="0"]');
    await click(tid('mode-explore'));
    await evaluate(`(() => { const c = document.querySelector('${tid('use-estimates')}'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await sleep(300);
  };
  const axeTargets = () => [
    { slug: 'selector-start', title: 'selector: start screen', prepare: () => old.open(pageUrl) },
    ...NEW_LENSES.map((lens) => ({ slug: `selector-lens-${lens}`, title: `selector: ${lens} lens`, prepare: async () => { await explored(); await click(tid(`lens-${lens}`)); await sleep(400); } })),
    { slug: 'selector-drawer', title: 'selector: material drawer', prepare: async () => { await explored(); await click(`${tid('lens')} ${tid('result-row')}`); await old.until(`!!document.querySelector('${tid('drawer')} [data-tab]')`, 'the drawer'); await sleep(300); } },
  ];
  const perfTarget = { url: `${origin}${base}v3/`, ready: `document.querySelector('${tid('lens')}')?.dataset.state === 'ready' && !!document.querySelector('${tid('count')}')?.textContent.trim()` };
  return { steps, behaviours, axeTargets, perfTarget, fuzzTab: createNewFuzzTab, pageUrl, notOwed: NOT_OWED, open, readView: read, settle: () => evaluate('true') };
}
