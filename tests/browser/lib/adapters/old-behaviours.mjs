// The behaviours that are cheap to lose and worth a test (pack 05 section 12), scripted against the OLD page as the oracle (WP-22):
// shortlist cap 6 and chosen cap 12 with an in-line refusal; Escape closing one layer at a time; "/" focusing search; "Skip to results" as
// the first Tab stop; a damaged scenario file refused whole with a message; "Back to your results" restoring selection, drawer tab and scroll;
// a link pasted into an open tab applying at once. Each returns { problems: [sentence] } and throws when it could not do what it set out
// to do (a button that is not there is a failed check, never a quiet pass). The new selector (WP-26) answers the same names.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {object} a  the old adapter's helpers (pageUrl, evaluate, until, open, click, sleep, view) and { page, root, meta, watch, scratch } */
export function createOldBehaviours(a) {
  const { page, root, meta, pageUrl, evaluate, until, open, click, sleep, view } = a;
  const watch = () => { if (!a.watch) throw new Error('this behaviour reads the dialogs the page raised: create the adapter with a watched page'); return a.watch; };
  const scratch = () => { if (!a.scratch) throw new Error('this behaviour writes a scenario file: create the adapter with a scratch folder'); return a.scratch; };
  const modules = async () => ({
    scenario: await import(pathToFileURL(join(root, 'app/js/engine/scenario.js')).href),
    templates: await import(pathToFileURL(join(root, 'app/js/ui/templates.js')).href),
  });
  const text = (selector) => evaluate(`(document.querySelector(${JSON.stringify(selector)})?.textContent ?? '').replace(/\\s+/g, ' ').trim()`);
  const present = (selector) => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
  const visible = (selector) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); return !!e && !e.hidden && e.getClientRects().length > 0; })()`);
  const exploreWithEstimates = async () => {
    await click('#mode-explore');
    await evaluate(`(() => { const c = document.getElementById('use-estimates'); if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change')); } return true; })()`);
    await sleep(200);
  };
  /** Click the first unpressed button matching a selector whose `attribute` is not in `taken`; returns what the attribute named, or null when there is none. */
  const clickUnpressed = (selector, attribute, taken) => evaluate(`(() => {
    const taken = new Set(${JSON.stringify(taken)});
    const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => !taken.has(x.getAttribute(${JSON.stringify(attribute)})) && x.getAttribute('aria-pressed') !== 'true');
    if (!b) return null; const id = b.getAttribute(${JSON.stringify(attribute)}); b.click(); return id; })()`);
  const sameState = async () => [await view(), await evaluate('location.hash')].join('\n--\n');
  /** Open the Save / share panel and hand the file chooser a file; the user-gesture click is the page's own. */
  const importFile = async (file) => {
    await click('#btn-scenario');
    const chooser = page.waitForEvent('filechooser', { timeout: 5000 });
    chooser.catch(() => {});
    await evaluate(`document.getElementById('sc-import').click()`);
    await (await chooser).setFiles(file);
    await sleep(300);
  };

  return {
    /** Pinning a seventh material is refused in line with the reason, and says nothing more until the next change. */
    async shortlistCap() {
      const problems = [];
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      const pinned = [];
      for (let i = 0; i < 6; i++) {
        const id = await clickUnpressed('#lens [data-pin]', 'data-pin', pinned);
        if (!id) throw new Error(`only ${i} rows to pin`);
        pinned.push(id); await sleep(150);
      }
      if (await text('#tray .label') !== 'Shortlist 6 of 6') problems.push(`after six pins the tray reads "${await text('#tray .label')}", not "Shortlist 6 of 6"`);
      if (await visible('#tray-notice')) problems.push('the refusal notice shows before a seventh pin is tried');
      const seventh = await clickUnpressed('#lens [data-pin]', 'data-pin', pinned);
      if (!seventh) throw new Error('no seventh row to pin');
      await sleep(200);
      const notice = await text('#tray-notice');
      if (!(await visible('#tray-notice')) || !/^The shortlist holds 6, so .+ was not added\. Remove one first\.$/.test(notice)) problems.push(`the seventh pin was not refused in line: "${notice}"`);
      if (await text('#tray .label') !== 'Shortlist 6 of 6') problems.push('the shortlist changed when the seventh pin was refused');
      if (await evaluate(`document.querySelectorAll('#pins .pin').length`) !== 6) problems.push('the tray does not hold exactly six pins after the refusal');
      await evaluate(`document.querySelector('#pins [data-unpin]').click()`);
      await sleep(200);
      if (await visible('#tray-notice')) problems.push('the refusal notice stayed after the next change');
      if (await text('#tray .label') !== 'Shortlist 5 of 6') problems.push('removing a pin did not leave five');
      return { problems };
    },

    /** Choosing a thirteenth product is refused in line. The twelve are put in by a link, the thirteenth is chosen by hand in a drawer. */
    async chosenCap() {
      const problems = [];
      const { scenario, templates } = await modules();
      const template = templates.TEMPLATES[4];
      const base = { ...scenario.newScenario(meta), constraints: template.constraints.map((c) => ({ ...c })), template: template.name, unknownPolicy: 'strict', useEstimates: false };
      // Which products can be chosen on the first row, so the twelve already chosen are others.
      await open(`${pageUrl}#${scenario.toHash(base)}`);
      const row = await evaluate(`document.querySelector('#lens tbody tr[data-material]')?.dataset.material ?? null`);
      if (!row) throw new Error('the template shows no row');
      await click(`#lens tr[data-material="${row}"]`);
      await until(`!!document.querySelector('.drawer [data-tab="Grades"]')`, 'the drawer');
      await click('.drawer [data-tab="Grades"]');
      await sleep(200);
      const offered = await evaluate(`[...document.querySelectorAll('.drawer [data-choose]')].map((b) => b.dataset.choose)`);
      if (!offered.length) throw new Error(`the first row's drawer offers no product to choose (${row})`);
      const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
      const others = db.grades.filter((g) => !g.retired && g.materialId !== row && !offered.includes(g.id)).slice(0, 24);   // the page keeps the first twelve it knows
      if (others.length < 24) throw new Error('fewer than twelve other products exist');
      const twelve = { ...base, decisions: others.map((g) => ({ gradeId: g.id, stateId: null, release: meta.release?.id ?? null, chosenOn: '2026-01-01', note: null, tests: [] })) };
      await open(`${pageUrl}?cap=1#${scenario.toHash(twelve)}`);
      if (await text('#btn-chosen') !== 'Chosen products: 12') throw new Error(`the link did not give twelve chosen products: "${await text('#btn-chosen')}"`);
      await click(`#lens tr[data-material="${row}"]`);
      await until(`!!document.querySelector('.drawer [data-tab="Grades"]')`, 'the drawer');
      await click('.drawer [data-tab="Grades"]');
      await sleep(200);
      const thirteenth = await clickUnpressed('.drawer [data-choose]', 'data-choose', []);
      if (!thirteenth) throw new Error('no thirteenth product to choose');
      await sleep(250);
      const notice = await text('#tray-notice');
      if (!(await visible('#tray-notice')) || notice !== 'At most 12 products can be chosen. Remove one first.') problems.push(`the thirteenth choice was not refused in line: "${notice}"`);
      if (await text('#btn-chosen') !== 'Chosen products: 12') problems.push(`the chosen count moved when the thirteenth was refused: "${await text('#btn-chosen')}"`);
      return { problems };
    },

    /** Escape closes the layer on top and only that: an explanation, then the drawer; the filter rail on a narrow screen last. */
    async escapeLayers() {
      const problems = [];
      await page.setViewportSize({ width: 1180, height: 760 });
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      await click('#lens tr[data-material]');
      await until(`!!document.querySelector('.drawer [data-explain]')`, 'an explanation mark in the drawer');
      await evaluate(`document.querySelector('.drawer [data-explain]').click()`);
      await sleep(150);
      if (!(await visible('#explain-popover'))) throw new Error('the explanation did not open');
      await page.keyboard.press('Escape');
      await sleep(150);
      if (await visible('#explain-popover')) problems.push('Escape did not close the explanation');
      if (!(await present('.drawer'))) problems.push('Escape closed the drawer together with the explanation');
      await page.keyboard.press('Escape');
      await sleep(200);
      if (await present('.drawer')) problems.push('a second Escape did not close the drawer');
      // The rail, on a screen where it is a dialog over the results.
      await page.setViewportSize({ width: 390, height: 844 });
      await sleep(200);
      await click('#btn-filters');
      await until(`document.getElementById('main').dataset.railOpen === 'true'`, 'the filter rail');
      await page.keyboard.press('Escape');
      await sleep(200);
      if (await evaluate(`document.getElementById('main').dataset.railOpen`) !== 'false') problems.push('Escape did not close the filter rail');
      if (await evaluate(`document.activeElement?.id`) !== 'btn-filters') problems.push('Escape did not return focus to the Filters button');
      return { problems };
    },

    /** "/" moves to the search box, unless the reader is already typing. */
    async slashFocusesSearch() {
      const problems = [];
      await open(pageUrl);
      await evaluate(`document.activeElement?.blur(); true`);
      await page.keyboard.press('/');
      if (await evaluate(`document.activeElement?.id`) !== 'search') problems.push('"/" did not focus the search box');
      if (await evaluate(`document.getElementById('search').value`) !== '') problems.push('"/" was typed into the search box instead of focusing it');
      await page.keyboard.press('/');
      if (await evaluate(`document.getElementById('search').value`) !== '/') problems.push('"/" typed in the search box did not go into it');
      return { problems };
    },

    /** "Skip to results" is the first stop of a keyboard, and takes it to the results without writing anything into the link. */
    async skipLink() {
      const problems = [];
      await open(pageUrl);
      await evaluate(`document.activeElement?.blur(); true`);
      await page.keyboard.press('Tab');
      if (await evaluate(`document.activeElement?.id`) !== 'skip-link') problems.push(`the first Tab stop is #${await evaluate(`document.activeElement?.id || document.activeElement?.tagName`)}, not the skip link`);
      const before = await evaluate('location.hash');
      await page.keyboard.press('Enter');
      await sleep(150);
      if (await evaluate(`document.activeElement?.id`) !== 'lens') problems.push('the skip link did not move focus to the results');
      if (await evaluate('location.hash') !== before) problems.push('the skip link changed the address');
      return { problems };
    },

    /** A damaged file is validated completely before anything changes: a message, and the selection exactly as it was. */
    async damagedScenarioFile() {
      const problems = [];
      watch().allowDialog(/^Could not load that scenario, and nothing was changed\./, 'the damaged files under test');
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
        const seen = watch().dialogs.length;
        await importFile(file);
        const said = watch().dialogs.slice(seen).join('\n');
        if (!/^Could not load that scenario, and nothing was changed\./.test(said) || !expected.test(said)) problems.push(`${name}: the page did not refuse it with a message (it said "${said.slice(0, 120)}")`);
        if (await sameState() !== before) problems.push(`${name}: the selection changed although the file was refused`);
        await click('#sc-close').catch(() => {});
      }
      return { problems };
    },

    /** From a drawer to the material's page and back: the selection, the drawer's tab and the scroll come back as they were left. */
    async backToResults() {
      const problems = [];
      await page.setViewportSize({ width: 1180, height: 760 });
      await open(pageUrl);
      await click('[data-template="0"]');
      await exploreWithEstimates();
      const scrolled = await evaluate(`(async () => { const l = document.getElementById('lens'); l.scrollTop = 300; window.scrollTo(0, 120); await new Promise((r) => setTimeout(r, 100)); return { lens: l.scrollTop, page: window.scrollY }; })()`);
      if (scrolled.lens === 0 && scrolled.page === 0) throw new Error('the results could not be scrolled, so restoring the scroll would prove nothing');
      await click('#lens tr[data-material="M001"]');
      await until(`!!document.querySelector('.drawer [data-tab="Mechanical"]')`, 'the drawer of M001');
      await click('.drawer [data-tab="Mechanical"]');
      await until(`document.querySelector('.drawer [data-tab][aria-selected="true"]')?.dataset.tab === 'Mechanical'`, 'the Mechanical tab');
      await until(`location.hash.includes('M001')`, 'the link naming the open material', 5000);
      const leftHash = await evaluate('location.hash');
      await Promise.all([page.waitForURL(/\/materials\/M001\.html/, { timeout: 30000 }), page.locator('.drawer .page-link').first().click()]);
      await until(`!!document.querySelector('main[data-page]')`, 'the material page');
      await Promise.all([page.waitForURL((url) => !/\/materials\//.test(url.pathname), { timeout: 30000 }), page.locator('.atlas-bar [data-return]').first().click()]);
      await until(`document.readyState === 'complete' && !!document.getElementById('count')?.textContent.trim()`, 'the selector');
      await until(`!!document.querySelector('.drawer [data-tab]')`, 'the drawer on return');
      await sleep(400);
      const strip = (h) => { try { const x = JSON.parse(decodeURIComponent(h.slice(1))); delete x.m; return JSON.stringify(x); } catch { return h; } };
      const back = await evaluate('location.hash');
      if (strip(back) !== strip(leftHash)) problems.push('the selection on return is not the one that was left');
      if (!/"m":"M001"/.test(decodeURIComponent(back))) problems.push('the drawer on return is not the material that was left');
      const tab = await evaluate(`document.querySelector('.drawer [data-tab][aria-selected="true"]')?.dataset.tab`);
      if (tab !== 'Mechanical') problems.push(`the drawer came back on the ${tab} tab, not Mechanical`);
      const now = await evaluate(`({ lens: document.getElementById('lens').scrollTop, page: window.scrollY })`);
      if (Math.abs(now.lens - scrolled.lens) > 2 || Math.abs(now.page - scrolled.page) > 2) problems.push(`the scroll did not come back: it was ${JSON.stringify(scrolled)} and is ${JSON.stringify(now)}`);
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
      await until(`document.getElementById('count').textContent.includes('shown')`, 'the pasted link to apply', 5000);
      await sleep(400);
      const applied = await view();
      if (applied === first) problems.push('the pasted link changed nothing');
      await page.goto('about:blank');
      await open(`${pageUrl}#${hash}`);
      if (await view() !== applied) problems.push('the pasted link shows something other than a fresh load of the same link');
      watch().allowDialog(/^This link could not be read, and nothing was changed\./, 'the unreadable link under test');
      const seen = watch().dialogs.length;
      await evaluate(`(() => { location.hash = 'not-a-scenario'; return true; })()`);
      await sleep(400);
      const said = watch().dialogs.slice(seen).join('\n');
      if (!/^This link could not be read, and nothing was changed\./.test(said)) problems.push(`an unreadable link was not refused with a message ("${said.slice(0, 120)}")`);
      if (await view() !== applied) problems.push('an unreadable link changed the selection');
      return { problems };
    },
  };
}
