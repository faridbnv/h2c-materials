// The NEW page adapter (WP-22): the public view of the remake (apps/public, published at /v3/) read through its data-testid hooks, never
// through its classes. Today the view is the WP-14 first slice: one results page and one page per material. The selector of the remake is
// WP-26; until it exists the selector steps are unsupported, each with the reason, and the tests that would run them are reported
// as named SKIPPED. WP-26 fills them in against the same contract (contract.mjs).
//
// The hooks it relies on (apps/public/src):
//   release-strip > release-id, data-date          headline, count-PASS|UNKNOWN|FAIL (data-count)
//   results-table > group[data-group] > result-row[data-material][data-verdict][data-group]
//   requirement[data-mandatory]                    load-notice[data-state=loading|stale|failed|no-material]
//   material-name[data-material], material-verdict[data-verdict], product[data-grade][data-verdict]
import { BEHAVIOURS, SELECTOR_STEPS, unsupported } from './contract.mjs';

const WAIT_MS = 30_000;
const WP26 = 'the selector of the remake is built in WP-26';

export function createNewPublic({ page, origin, base }) {
  const viewUrl = `${origin}${base}v3/`;
  const materialUrl = (id) => `${viewUrl}material.html?m=${encodeURIComponent(id)}`;
  const answered = '[data-testid="headline"], [data-testid="material-name"], [data-testid="load-notice"]:not([data-state="loading"])';

  /**
   * Go to an address of the view and wait until it has said something: its content, or a notice that is not "loading". Returns what it
   * said: 'ready', or the notice's state ('stale', 'failed', 'no-material'). A page that never answers throws; a bad HTTP status throws.
   */
  async function open(url) {
    const response = await page.goto(url, { waitUntil: 'load', timeout: WAIT_MS });
    if (response === null || !response.ok()) throw new Error(`${url} answered ${response === null ? 'nothing' : `HTTP ${response.status()}`}`);
    await page.locator(answered).first().waitFor({ state: 'visible', timeout: WAIT_MS });
    const notice = page.locator('[data-testid="load-notice"]');
    return (await notice.count()) === 0 ? 'ready' : await notice.first().getAttribute('data-state');
  }

  /** What the results page says: the release it names, the counts it shows, every row with its verdict and group. */
  const readResults = () => page.evaluate(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const q = (sel, root = document) => [...root.querySelectorAll(sel)];
    const count = (v) => { const el = document.querySelector(`[data-testid="count-${v}"]`); return el ? Number(el.getAttribute('data-count')) : null; };
    return {
      title: document.title, metaRelease: document.querySelector('meta[name="h2c-release"]')?.getAttribute('content') ?? null,
      release: text(document.querySelector('[data-testid="release-id"]')), dataDate: text(document.querySelector('[data-testid="data-date"]')) || null,
      headline: text(document.querySelector('[data-testid="headline"]')), counts: { pass: count('PASS'), unknown: count('UNKNOWN'), fail: count('FAIL') },
      requirements: q('[data-testid="requirement"]').map((el) => ({ text: text(el), mandatory: el.getAttribute('data-mandatory') === 'true' })),
      groups: q('[data-testid="group"]').map((g) => ({ group: g.getAttribute('data-group'), rows: q('[data-testid="result-row"]', g).length })),
      rows: q('[data-testid="result-row"]').map((r) => ({ id: r.getAttribute('data-material'), verdict: r.getAttribute('data-verdict'), group: r.getAttribute('data-group'), name: text(r.querySelector('th a')), href: r.querySelector('th a')?.getAttribute('href') ?? null })),
    };
  });

  /** What a material page says. */
  const readMaterial = () => page.evaluate(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      release: text(document.querySelector('[data-testid="release-id"]')),
      id: document.querySelector('[data-testid="material-name"]')?.getAttribute('data-material') ?? null,
      name: text(document.querySelector('[data-testid="material-name"]')),
      verdict: document.querySelector('[data-testid="material-verdict"]')?.getAttribute('data-verdict') ?? null,
      products: [...document.querySelectorAll('[data-testid="product"]')].map((p) => ({ grade: p.getAttribute('data-grade'), verdict: p.getAttribute('data-verdict') })),
      back: document.querySelector('.back a')?.getAttribute('href') ?? null,
    };
  });

  /** Open an address and require its content: any notice it shows instead is an error naming `what`. */
  const openReady = async (url, what) => {
    const state = await open(url);
    if (state !== 'ready') throw new Error(`${what} said "${state}", not its content`);
  };

  // The pages axe is run on: the results page and one material page, as a reader meets them.
  const axeTargets = () => [
    { slug: 'public-results', title: 'public view: results', prepare: () => openReady(viewUrl, 'the results page') },
    { slug: 'public-material', title: 'public view: a material', prepare: () => openReady(materialUrl('M001'), 'the material page') },
  ];

  const steps = Object.fromEntries(SELECTOR_STEPS.map((name) => [name, unsupported(WP26)]));
  const behaviours = Object.fromEntries(BEHAVIOURS.map((name) => [name, unsupported(WP26)]));
  return { id: 'new', steps, behaviours, axeTargets, fuzzTab: unsupported(WP26), viewUrl, materialUrl, open, readResults, readMaterial };
}
