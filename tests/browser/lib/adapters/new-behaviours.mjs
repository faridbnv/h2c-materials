// The behaviours that are cheap to lose (pack 05 section 12), scripted against the NEW selector (WP-26) through the same names as the old
// page's (old-behaviours.mjs), on data-testid hooks and the data attributes of the markup (data-template, data-pin, data-tab, data-choose).
// Where the old page raised a dialog, the new one says the same sentence in a notice or in the Save / share panel, so a behaviour that
// read dialogs reads those; the sentences are the old page's.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const tid = (id) => `[data-testid="${id}"]`;

/** @param {object} a  { page, root, meta, pageUrl, scratch } and the settled helpers of new-selector.mjs (evaluate, until, open, click, sleep, view) */
export function createNewBehaviours(a) {
  const { page, root, meta, pageUrl, evaluate, until, open, click, sleep, view } = a;
  const scratch = () => { if (!a.scratch) throw new Error('this behaviour writes a scenario file: create the adapter with a scratch folder'); return a.scratch; };
  const modules = async () => ({
    scenario: await import(pathToFileURL(join(root, 'app/js/engine/scenario.js')).href),
    templates: await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href),
  });
  const text = (selector) => evaluate(`(document.querySelector(${JSON.stringify(selector)})?.textContent ?? '').replace(/\\s+/g, ' ').trim()`);
  const present = (selector) => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
  const visible = (selector) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); return !!e && !e.hidden && e.getClientRects().length > 0; })()`);
  const exploreWithEstimates = async () => {
    await click(tid('mode-explore'));
    await evaluate(`(() => { const c = document.querySelector('${tid('use-estimates')}'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await sleep(200);
  };
  const clickUnpressed = (selector, attribute, taken) => evaluate(`(() => {
    const taken = new Set(${JSON.stringify(taken)});
    const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => !taken.has(x.getAttribute(${JSON.stringify(attribute)})) && x.getAttribute('aria-pressed') !== 'true');
    if (!b) return null; const id = b.getAttribute(${JSON.stringify(attribute)}); b.click(); return id; })()`);
  const sameState = async () => [await view(), await evaluate('location.hash')].join('\n--\n');
  /** Open the Save / share panel and give its file input a file. */
  const importFile = async (file) => {
    await click(tid('save-share'));
    await page.locator(tid('file-input')).setInputFiles(file);
    await sleep(300);
  };
  const lensRow = `${tid('lens')} ${tid('result-row')}`;

  return {
    /** Pinning a seventh material is refused in line with the reason, and says nothing more until the next change. */
    async shortlistCap() {
      const problems = [];
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      const pinned = [];
      for (let i = 0; i < 6; i++) {
        const id = await clickUnpressed(`${tid('lens')} [data-pin]`, 'data-pin', pinned);
        if (!id) throw new Error(`only ${i} rows to pin`);
        pinned.push(id); await sleep(150);
      }
      if (await text(tid('tray-label')) !== 'Shortlist 6 of 6') problems.push(`after six pins the tray reads "${await text(tid('tray-label'))}", not "Shortlist 6 of 6"`);
      if (await visible(tid('tray-notice'))) problems.push('the refusal notice shows before a seventh pin is tried');
      const seventh = await clickUnpressed(`${tid('lens')} [data-pin]`, 'data-pin', pinned);
      if (!seventh) throw new Error('no seventh row to pin');
      await sleep(200);
      const notice = await text(tid('tray-notice'));
      if (!(await visible(tid('tray-notice'))) || !/^The shortlist holds 6, so .+ was not added\. Remove one first\.$/.test(notice)) problems.push(`the seventh pin was not refused in line: "${notice}"`);
      if (await text(tid('tray-label')) !== 'Shortlist 6 of 6') problems.push('the shortlist changed when the seventh pin was refused');
      if (await evaluate(`document.querySelectorAll('${tid('pin')}').length`) !== 6) problems.push('the tray does not hold exactly six pins after the refusal');
      await evaluate(`document.querySelector('${tid('pin')} [data-unpin]').click()`);
      await sleep(200);
      if (await visible(tid('tray-notice'))) problems.push('the refusal notice stayed after the next change');
      if (await text(tid('tray-label')) !== 'Shortlist 5 of 6') problems.push('removing a pin did not leave five');
      return { problems };
    },

    /** Choosing a thirteenth product is refused in line. The twelve are put in by a link, the thirteenth is chosen by hand in a drawer. */
    async chosenCap() {
      const problems = [];
      const { scenario, templates } = await modules();
      const template = templates.TEMPLATES[4];
      const base = { ...scenario.newScenario(meta), constraints: template.constraints.map((c) => ({ ...c })), template: template.name, unknownPolicy: 'strict', useEstimates: false };
      await open(`${pageUrl}#${scenario.toHash(base)}`);
      const row = await evaluate(`document.querySelector('${lensRow}')?.dataset.material ?? null`);
      if (!row) throw new Error('the template shows no row');
      await click(`${tid('lens')} tr[data-material="${row}"]`);
      await until(`!!document.querySelector('${tid('drawer')} [data-tab="Grades"]')`, 'the drawer');
      await click(`${tid('drawer')} [data-tab="Grades"]`);
      await sleep(200);
      const offered = await evaluate(`[...document.querySelectorAll('${tid('drawer')} [data-choose]')].map((b) => b.dataset.choose)`);
      if (!offered.length) throw new Error(`the first row's drawer offers no product to choose (${row})`);
      const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
      const others = db.grades.filter((g) => !g.retired && g.materialId !== row && !offered.includes(g.id)).slice(0, 24);
      if (others.length < 24) throw new Error('fewer than twelve other products exist');
      const twelve = { ...base, decisions: others.map((g) => ({ gradeId: g.id, stateId: null, release: meta.release?.id ?? null, chosenOn: '2026-01-01', note: null, tests: [] })) };
      await open(`${pageUrl}?cap=1#${scenario.toHash(twelve)}`);
      if (await text(tid('chosen')) !== 'Chosen products: 12') throw new Error(`the link did not give twelve chosen products: "${await text(tid('chosen'))}"`);
      await click(`${tid('lens')} tr[data-material="${row}"]`);
      await until(`!!document.querySelector('${tid('drawer')} [data-tab="Grades"]')`, 'the drawer');
      await click(`${tid('drawer')} [data-tab="Grades"]`);
      await sleep(200);
      const thirteenth = await clickUnpressed(`${tid('drawer')} [data-choose]`, 'data-choose', []);
      if (!thirteenth) throw new Error('no thirteenth product to choose');
      await sleep(250);
      const notice = await text(tid('tray-notice'));
      if (!(await visible(tid('tray-notice'))) || notice !== 'At most 12 products can be chosen. Remove one first.') problems.push(`the thirteenth choice was not refused in line: "${notice}"`);
      if (await text(tid('chosen')) !== 'Chosen products: 12') problems.push(`the chosen count moved when the thirteenth was refused: "${await text(tid('chosen'))}"`);
      return { problems };
    },

    /** Escape closes the layer on top and only that: an explanation, then the drawer; the filter rail on a narrow screen last. */
    async escapeLayers() {
      const problems = [];
      await page.setViewportSize({ width: 1180, height: 760 });
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      await click(lensRow);
      await until(`!!document.querySelector('${tid('drawer')} [data-explain]')`, 'an explanation mark in the drawer');
      await evaluate(`document.querySelector('${tid('drawer')} [data-explain]').click()`);
      await sleep(150);
      if (!(await visible(tid('popover')))) throw new Error('the explanation did not open');
      await page.keyboard.press('Escape');
      await sleep(150);
      if (await visible(tid('popover'))) problems.push('Escape did not close the explanation');
      if (!(await present(tid('drawer')))) problems.push('Escape closed the drawer together with the explanation');
      await page.keyboard.press('Escape');
      await sleep(200);
      if (await present(tid('drawer'))) problems.push('a second Escape did not close the drawer');
      // The rail, on a screen where it is a dialog over the results.
      await page.setViewportSize({ width: 390, height: 844 });
      await sleep(200);
      await click(tid('filters-button'));
      await until(`document.querySelector('${tid('rail')}').closest('[data-rail-open]').dataset.railOpen === 'true'`, 'the filter rail');
      await page.keyboard.press('Escape');
      await sleep(200);
      if (await evaluate(`document.querySelector('${tid('rail')}').closest('[data-rail-open]').dataset.railOpen`) !== 'false') problems.push('Escape did not close the filter rail');
      if (await evaluate(`document.activeElement?.dataset.testid`) !== 'filters-button') problems.push('Escape did not return focus to the Filters button');
      return { problems };
    },

    /** "/" moves to the search box, unless the reader is already typing. */
    async slashFocusesSearch() {
      const problems = [];
      await open(pageUrl);
      await evaluate(`document.activeElement?.blur(); true`);
      await page.keyboard.press('/');
      if (await evaluate(`document.activeElement?.dataset.testid`) !== 'search') problems.push('"/" did not focus the search box');
      if (await evaluate(`document.querySelector('${tid('search')}').value`) !== '') problems.push('"/" was typed into the search box instead of focusing it');
      await page.keyboard.press('/');
      if (await evaluate(`document.querySelector('${tid('search')}').value`) !== '/') problems.push('"/" typed in the search box did not go into it');
      return { problems };
    },

    /** "Skip to results" is the first stop of a keyboard, and takes it to the results without writing anything into the link. */
    async skipLink() {
      const problems = [];
      await open(pageUrl);
      await evaluate(`document.activeElement?.blur(); true`);
      await page.keyboard.press('Tab');
      if (await evaluate(`document.activeElement?.dataset.testid`) !== 'skip-link') problems.push(`the first Tab stop is ${await evaluate(`document.activeElement?.dataset.testid || document.activeElement?.tagName`)}, not the skip link`);
      const before = await evaluate('location.hash');
      await page.keyboard.press('Enter');
      await sleep(150);
      if (await evaluate(`document.activeElement?.dataset.testid`) !== 'lens') problems.push('the skip link did not move focus to the results');
      if (await evaluate('location.hash') !== before) problems.push('the skip link changed the address');
      return { problems };
    },

    /** A damaged file is validated completely before anything changes: a message in the panel, and the selection exactly as it was. */
    async damagedScenarioFile() {
      const problems = [];
      await open(pageUrl);
      await click('[data-template="1"]');
      await exploreWithEstimates();
      await until(`location.hash.length > 1`, 'the link');
      await sleep(400);
      const before = await sameState();
      const files = [['not-json.json', 'this is { not json', /not valid JSON/], ['no-version.json', JSON.stringify({ constraints: [] }), /no scenario version/]];
      for (const [name, body, expected] of files) {
        const file = join(scratch(), name);
        writeFileSync(file, body);
        await importFile(file);
        const said = await text(tid('import-problem'));
        if (!/^Could not load that scenario, and nothing was changed\./.test(said) || !expected.test(said)) problems.push(`${name}: the page did not refuse it with a message (it said "${said.slice(0, 120)}")`);
        if (await sameState() !== before) problems.push(`${name}: the selection changed although the file was refused`);
        await page.keyboard.press('Escape');
        await sleep(150);
      }
      return { problems };
    },

    /**
     * From a drawer to the material's page and back: the selection, the drawer's tab and the scroll come back as they were left. The page's way
     * back names the old selector until the cutover (the pages are the old pages), so the trip is made as far as the page, and the way back is
     * followed by its selection: the page's link is read and its address is rewritten to this selector's.
     */
    async backToResults() {
      const problems = [];
      await page.setViewportSize({ width: 1180, height: 760 });
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      const scrolled = await evaluate(`(async () => { const l = document.querySelector('${tid('lens')}'); l.scrollTop = 300; window.scrollTo(0, 120); await new Promise((r) => setTimeout(r, 100)); return { lens: l.scrollTop, page: window.scrollY }; })()`);
      if (scrolled.lens === 0 && scrolled.page === 0) throw new Error('the results could not be scrolled, so restoring the scroll would prove nothing');
      await click(`${tid('lens')} tr[data-material="M001"]`);
      await until(`!!document.querySelector('${tid('drawer')} [data-tab="Mechanical"]')`, 'the drawer of M001');
      await click(`${tid('drawer')} [data-tab="Mechanical"]`);
      await until(`document.querySelector('${tid('drawer')} [data-tab][aria-selected="true"]')?.dataset.tab === 'Mechanical'`, 'the Mechanical tab');
      await until(`location.hash.includes('M001')`, 'the link naming the open material', 5000);
      const leftHash = await evaluate('location.hash');
      await Promise.all([page.waitForURL(/\/materials\/M001\.html/, { timeout: 30000 }), page.locator(tid('page-link')).first().click()]);
      await until(`!!document.querySelector('main[data-page]')`, 'the material page');
      const back = await evaluate(`document.querySelector('.atlas-bar [data-return]')?.getAttribute('href') ?? null`);
      if (!back || !back.includes('#')) throw new Error('the material page has no way back that carries the selection');
      await page.goto(`${pageUrl}#${back.split('#')[1]}`, { waitUntil: 'load' });
      await until(`document.readyState === 'complete' && !!document.querySelector('${tid('count')}')?.textContent.trim()`, 'the selector');
      await until(`!!document.querySelector('${tid('drawer')} [data-tab]')`, 'the drawer on return');
      await sleep(400);
      const strip = (h) => { try { const x = JSON.parse(decodeURIComponent(h.slice(1))); delete x.m; return JSON.stringify(x); } catch { return h; } };
      const now = await evaluate('location.hash');
      if (strip(now) !== strip(leftHash)) problems.push('the selection on return is not the one that was left');
      if (!/"m":"M001"/.test(decodeURIComponent(now))) problems.push('the drawer on return is not the material that was left');
      const tab = await evaluate(`document.querySelector('${tid('drawer')} [data-tab][aria-selected="true"]')?.dataset.tab`);
      if (tab !== 'Mechanical') problems.push(`the drawer came back on the ${tab} tab, not Mechanical`);
      const at = await evaluate(`({ lens: document.querySelector('${tid('lens')}').scrollTop, page: window.scrollY })`);
      if (Math.abs(at.lens - scrolled.lens) > 2 || Math.abs(at.page - scrolled.page) > 2) problems.push(`the scroll did not come back: it was ${JSON.stringify(scrolled)} and is ${JSON.stringify(at)}`);
      return { problems };
    },

    /** A link pasted into an open tab applies at once and shows what a fresh load of the same link shows; an unreadable one changes nothing. */
    async pastedLink() {
      const problems = [];
      const { scenario, templates } = await modules();
      const template = templates.TEMPLATES[2];
      const wanted = { ...scenario.newScenario(meta), constraints: template.constraints.map((c) => ({ ...c })), template: template.name, unknownPolicy: 'strict', useEstimates: false };
      const hash = scenario.toHash(wanted);
      await open(pageUrl);
      const first = await view();
      await evaluate(`(() => { location.hash = ${JSON.stringify(hash)}; return true; })()`);
      await until(`document.querySelector('${tid('count')}').textContent.includes('shown')`, 'the pasted link to apply', 5000);
      await sleep(400);
      const applied = await view();
      if (applied === first) problems.push('the pasted link changed nothing');
      await page.goto('about:blank');
      await open(`${pageUrl}#${hash}`);
      if (await view() !== applied) problems.push('the pasted link shows something other than a fresh load of the same link');
      await evaluate(`(() => { location.hash = 'not-a-scenario'; return true; })()`);
      await sleep(400);
      const said = await text(tid('notices'));
      if (!/This link could not be read, and nothing was changed\./.test(said)) problems.push(`an unreadable link was not refused with a message ("${said.slice(0, 120)}")`);
      if (await view() !== applied) problems.push('an unreadable link changed the selection');
      return { problems };
    },
  };
}
