// The NEW page adapter (WP-22, WP-26): the public view of the remake (apps/public, published at /v3/) read through its data-testid hooks, never
// through its classes. Its root is the selector of the remake (WP-26: new-selector.mjs answers the contract's selector steps, behaviours and
// fuzz tab); beside it stands the material page of the first slice (material.html), read here as it was in WP-14.
//
// The hooks the material page relies on (apps/public/src):
//   material-name[data-material], material-verdict[data-verdict], product[data-grade][data-verdict]
//   load-notice[data-state=loading|stale|failed|no-material]
import { createNewSelector } from './new-selector.mjs';

const WAIT_MS = 30_000;

export function createNewPublic({ page, origin, base, meta = {}, root = null, watch = null, scratch = null }) {
  const viewUrl = `${origin}${base}v3/`;
  const materialUrl = (id) => `${viewUrl}material.html?m=${encodeURIComponent(id)}`;
  const answered = '[data-testid="lens"][data-state="ready"], [data-testid="material-name"], [data-testid="load-notice"]:not([data-state="loading"])';

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

  const selector = createNewSelector({ page, origin, base, meta, root, watch, scratch });
  // The pages axe is run on: the selector's (start screen, lenses, drawer) and one material page, as a reader meets them.
  const axeTargets = () => [
    ...selector.axeTargets(),
    { slug: 'public-material', title: 'public view: a material', prepare: () => openReady(materialUrl('M001'), 'the material page') },
  ];

  return { id: 'new', steps: selector.steps, behaviours: selector.behaviours, axeTargets, perfTarget: selector.perfTarget, fuzzTab: selector.fuzzTab, pageUrl: selector.pageUrl, notOwed: selector.notOwed, viewUrl, materialUrl, open, readMaterial };
}
