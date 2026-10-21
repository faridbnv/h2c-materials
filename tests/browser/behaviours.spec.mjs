// The behaviours that are cheap to lose (pack 05 section 12), run against the OLD page as the oracle and, once WP-26 gives the remake a
// selector, against the NEW one through the same names (WP-22). Each is its own test so a loss is named.
import { test, expect, adapterFor, skipUnsupported } from './fixtures.mjs';
import { BEHAVIOURS } from './lib/adapters/contract.mjs';

const WORDS = {
  shortlistCap: 'the shortlist holds 6 and refuses a seventh in line',
  chosenCap: 'at most 12 products can be chosen, the thirteenth is refused in line',
  escapeLayers: 'Escape closes one layer at a time: explanation, drawer, filter rail',
  slashFocusesSearch: '"/" focuses search',
  skipLink: '"Skip to results" is the first Tab stop and works',
  damagedScenarioFile: 'a damaged scenario file is refused whole with a message',
  backToResults: '"Back to your results" restores selection, drawer tab and scroll',
  pastedLink: 'a link pasted into an open tab applies at once',
};

for (const kind of ['old', 'new']) {
  for (const name of BEHAVIOURS) {
    test(`${kind} selector: behaviour: ${WORDS[name]}`, async ({ page, watch, site, base, meta, scratch }) => {
      test.setTimeout(180_000);
      const adapter = adapterFor(kind, { page, origin: site.origin, base, meta, watch, scratch });
      const behaviour = adapter.behaviours[name];
      if (skipUnsupported(behaviour)) return;
      const { problems } = await behaviour();
      expect(problems, `${problems.length} problem(s):\n  ${problems.join('\n  ')}`).toEqual([]);
    });
  }
}
