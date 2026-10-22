// An axe report per lens and per page (WP-22; pack 07 section 7.1): REPORTED, NOT BLOCKING (owner ruling OQ-15 B). Violations never fail a
// run. What can fail it is the scan not happening: a page that did not reach its state, or an axe run that applied no rules, or a report
// that could not be written, so "no violations" is never what a broken scan looks like. Reports go to remake/measure/axe/<project>/<page>.json
// and a table of counts to remake/measure/axe/<project>/index.json.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import axeCore from 'axe-core';
import { test, expect, FULL, root, adapterFor } from './fixtures.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const OUT = join(root, 'remake', 'measure', 'axe');
const NODES_PER_RULE = 5;
// The pages of the fast subset; the full run scans every page of both adapters.
const FAST_PAGES = ['selector-start', 'selector-lens-table', 'selector-lens-explain', 'selector-lens-ashby', 'selector-drawer', 'page-m001-pla', 'public-material'];

/** One violation, small: the rule, how bad, how many places, and the first few (selector and a clipped piece of the markup). */
const summarise = (v) => ({
  rule: v.id, impact: v.impact ?? 'none', help: v.help, helpUrl: v.helpUrl, tags: v.tags.filter((t) => t.startsWith('wcag') || t === 'best-practice'), nodes: v.nodes.length,
  examples: v.nodes.slice(0, NODES_PER_RULE).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160) })),
});

const RUN = process.env['H2C_BROWSER_RUN_ID'] ?? `local-${Date.now()}`;
const rows = new Map();   // project -> index rows, written when the project's last report is in

for (const kind of ['old', 'new']) {
  // The targets are known only with an adapter, which needs a page; the list is the same for every page, so it is read from a throwaway.
  const targets = adapterFor(kind, { page: null, origin: 'http://x', base: '/b/', meta: {} }).axeTargets();
  for (const target of targets) {
    if (!FULL && !FAST_PAGES.includes(target.slug)) continue;
    test(`${kind} page: axe report for ${target.title}`, async ({ page, watch, site, base, meta }, testInfo) => {
      test.setTimeout(240_000);
      void watch;
      const adapter = adapterFor(kind, { page, origin: site.origin, base, meta });
      const here = adapter.axeTargets().find((t) => t.slug === target.slug);
      expect(here, `no axe target ${target.slug}`).toBeTruthy();
      await here.prepare();
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      // The scan must have happened: rules applied to this page, and no rule left unable to run on the whole of it.
      expect(results.passes.length + results.violations.length, 'axe applied no rule to this page').toBeGreaterThan(5);
      const byImpact = {};
      for (const v of results.violations) {
        const impact = v.impact ?? 'none';
        byImpact[impact] = (byImpact[impact] ?? 0) + v.nodes.length;
      }
      const url = new URL(page.url());
      // The new page's reports are named apart: its start screen and lenses carry the old page's slugs, and one report must not replace the other.
      const name = kind === 'old' ? target.slug : `new-${target.slug}`;
      const report = {
        schema: 1, page: name, title: target.title, adapter: kind, project: testInfo.project.name, path: url.pathname + url.search,
        axe: axeCore.version, tags: TAGS, blocking: false,
        counts: { violatedRules: results.violations.length, violatingNodes: results.violations.reduce((n, v) => n + v.nodes.length, 0), byImpact, passedRules: results.passes.length, incompleteRules: results.incomplete.length, inapplicableRules: results.inapplicable.length },
        violations: results.violations.map(summarise),
        incomplete: results.incomplete.map((v) => ({ rule: v.id, nodes: v.nodes.length })),
      };
      const dir = join(OUT, testInfo.project.name);
      mkdirSync(dir, { recursive: true });
      // The first report of a run starts the folder afresh: a page this run did not scan must not keep an old report.
      const index = join(dir, 'index.json');
      const earlierRun = existsSync(index) ? JSON.parse(readFileSync(index, 'utf8')) : null;
      if (earlierRun?.runId === RUN) { if (!rows.has(testInfo.project.name)) rows.set(testInfo.project.name, earlierRun.pages); }
      else for (const old of readdirSync(dir).filter((x) => x.endsWith('.json'))) rmSync(join(dir, old));
      writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(report, null, 2)}\n`);
      const list = rows.get(testInfo.project.name) ?? [];
      list.push({ page: name, ...report.counts });
      rows.set(testInfo.project.name, list);
      writeFileSync(join(dir, 'index.json'), `${JSON.stringify({ schema: 1, runId: RUN, mode: FULL ? 'full' : 'fast', axe: axeCore.version, blocking: false, note: 'Reported, not blocking (owner ruling OQ-15 B). A count here is a finding to read, not a failed check.', pages: list.sort((a, b) => (a.page < b.page ? -1 : 1)) }, null, 2)}\n`);
      testInfo.annotations.push({ type: 'axe-pages', description: '1' });
      testInfo.annotations.push({ type: 'axe-violations', description: `${report.counts.violatedRules} rules, ${report.counts.violatingNodes} places` });
    });
  }
}
