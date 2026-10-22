// The interface probe, ported (WP-22): 114 views and the layout and behaviour checks of scripts/ui-probe.mjs, run over HTTP under both base
// paths through a page adapter. The same list of checks runs against the OLD page (compared with the old harness's committed snapshot,
// build/snapshot/ui, so the old adapter run equals the old CDP harness's output) and the NEW page (named SKIPPED until WP-26 gives it a
// selector). A check that produced fewer views than the baseline owes fails; so does one that produced more.
import { join } from 'node:path';
import { test, expect, FULL, adapterFor, skipUnsupported } from './fixtures.mjs';
import { SCREENS } from './lib/screens.mjs';
import { VIEW_GROUPS, compareViews, writeViews } from './lib/views.mjs';

// The probe's own window: Chrome headless was started with --window-size=1400,1000 and no emulation on the steps that name no screen.
const WINDOW = Object.freeze({ name: 'window', width: 1400, height: 1000, mobile: false });
const laptop = SCREENS[0], tablet = SCREENS[1], phone = SCREENS[2];
const VIEWS_OUT = process.env['H2C_BROWSER_VIEWS_OUT'] ?? null;

/** [title, step, arguments, pattern of the views it owes (null: none), screen, in the fast subset, seconds it may take] */
const GROUPS = [
  ['start screen, templates, Compare', 'selectorTemplates', [], VIEW_GROUPS['selector: start screen, templates, Compare'], WINDOW, true, 240],
  ['drawers and drawer comparisons', 'selectorDrawers', [], VIEW_GROUPS['selector: drawers and drawer comparisons'], WINDOW, false, 240],
  ['ranked by products, what makers say, a product chosen', 'selectorRanked', [], VIEW_GROUPS['selector: ranked by products, what makers say, a product chosen'], WINDOW, true, 240],
  ['family rail', 'selectorFamily', [], VIEW_GROUPS['selector: family rail'], WINDOW, true, 240],
  ['layout, laptop', 'selectorLayout', [laptop], VIEW_GROUPS['selector layout, laptop'], laptop, false, 400],
  ['layout, tablet', 'selectorLayout', [tablet], VIEW_GROUPS['selector layout, tablet'], tablet, false, 400],
  ['layout, phone', 'selectorLayout', [phone], VIEW_GROUPS['selector layout, phone'], phone, false, 400],
  ['answer before the exposition at 1024 x 768', 'selectorWarm', [], null, WINDOW, true, 240],
  ['Ashby decision workspace', 'selectorAshby', [], VIEW_GROUPS['selector: Ashby decision workspace'], WINDOW, false, 400],
  ['material pages, laptop', 'materialPages', [laptop], VIEW_GROUPS['material pages, laptop'], laptop, true, 600],
  ['material pages, tablet', 'materialPages', [tablet], VIEW_GROUPS['material pages, tablet'], tablet, false, 600],
  ['material pages, phone', 'materialPages', [phone], VIEW_GROUPS['material pages, phone'], phone, false, 600],
  ['material pages: the return trip', 'returnTrip', [], VIEW_GROUPS['material pages: the return trip'], laptop, true, 240],
];

for (const kind of ['old', 'new']) {
  for (const [title, stepName, args, pattern, screen, fast, seconds] of GROUPS) {
    if (!FULL && !fast) continue;
    test(`${kind} selector: ${title}`, async ({ onScreen, site, base, meta }, testInfo) => {
      test.setTimeout(seconds * 1000);
      const { page } = await onScreen(screen);
      const adapter = adapterFor(kind, { page, origin: site.origin, base, meta });
      const step = adapter.steps[stepName];
      if (skipUnsupported(step)) return;
      const result = await step(...args);
      const compared = pattern === null
        ? { problems: Object.keys(result.views).length ? [`this check owes no views and produced ${Object.keys(result.views).join(', ')}`] : [], checked: 0, owed: 0 }
        : compareViews(result.views, pattern, undefined, adapter.notOwed?.[stepName] ?? null);
      if (VIEWS_OUT && kind === 'old') writeViews(result.views, join(VIEWS_OUT, testInfo.project.name));
      testInfo.annotations.push({ type: 'views-checked', description: String(compared.checked) });
      const left = adapter.notOwed?.[stepName];
      if (left) testInfo.annotations.push({ type: 'views-not-owed', description: `${left.pattern ?? Object.keys(left.lines ?? {}).join(', ')}: ${left.reason}` });
      const problems = [...result.problems, ...compared.problems];
      expect(problems, `${problems.length} problem(s):\n  ${problems.join('\n  ')}`).toEqual([]);
      expect(compared.checked, 'views compared').toBe(compared.owed);
    });
  }
}
