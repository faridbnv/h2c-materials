// The 114 views of the interface probe, as a baseline and a comparison (WP-22). The baseline is the old harness's own committed
// snapshot (build/snapshot/ui, read only here): the Playwright run of the old adapter must write exactly those files, which is
// what "the old-adapter run equals the old CDP harness's output" means for the views. A view is what a reader sees: the engine's
// counts, rows and sentences as the page prints them, with the date of the build and the release ID masked as the old harness masks them.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../../remake/tools/wp-lib.mjs';

export const BASELINE_DIR = join(repoRoot(), 'build', 'snapshot', 'ui');

/** Which step writes which views: a regular expression over the view names, per group of tests. Every baseline view is in exactly one group. */
export const VIEW_GROUPS = Object.freeze({
  'selector: start screen, templates, Compare': /^(01|10|11|20)-/,
  'selector: drawers and drawer comparisons': /^13-/,
  'selector: ranked by products, what makers say, a product chosen': /^(14|15|16)-/,
  'selector: family rail': /^12-/,
  'selector layout, laptop': /^30-laptop-/,
  'selector layout, tablet': /^30-tablet-/,
  'selector layout, phone': /^30-phone-/,
  'selector: Ashby decision workspace': /^(40|41)-/,
  'material pages, laptop': /^50-page-laptop-/,
  'material pages, tablet': /^50-page-tablet-/,
  'material pages, phone': /^50-page-phone-/,
  'material pages: the return trip': /^50-page-return-trip$/,
});

export const baselineNames = (dir = BASELINE_DIR) => {
  if (!existsSync(dir)) throw new Error(`${dir} does not exist: there is no baseline to compare the views with`);
  return readdirSync(dir).filter((f) => f.endsWith('.txt')).map((f) => f.slice(0, -4)).sort();
};

/** The date the page was built and its release ID are not a reader's view: masked as scripts/ui-probe.mjs masks them. */
export const mask = (text) => text.replace(/\bbuild \d{4}-\d{2}-\d{2}\b/g, 'build <date>').replace(/\b([Rr]elease) [0-9a-f]{12}\b/g, '$1 <id>');

/**
 * Compare the views a step produced with the baseline. `pattern` selects the baseline views this step owes. Returns the sentences of
 * what is wrong (a view missing, one nobody owes, an empty one, one that differs, with the lines that moved); none means every
 * owed view was produced and equals its baseline. `checked` counts the views that were compared. `notOwed` names what the page does not draw yet
 * (the new selector before WP-27): `pattern` the views of this step that are not owed (a page that produced one is still told), and `lines` the
 * baseline lines of an owed view the page does not have (a view name to the lines), each with the reason the adapter gives for it.
 */
export function compareViews(views, pattern, dir = BASELINE_DIR, notOwed = null) {
  const owed = baselineNames(dir).filter((k) => pattern.test(k) && !notOwed?.pattern?.test(k));
  const produced = Object.keys(views).sort();
  const problems = [];
  if (!owed.length) problems.push(`no baseline view matches ${pattern}: this step would check nothing`);
  const missing = owed.filter((k) => !(k in views));
  const extra = produced.filter((k) => !owed.includes(k));
  if (missing.length) problems.push(`views the baseline has and this run did not produce: ${missing.join(', ')}`);
  if (extra.length) problems.push(`views this run produced that the baseline does not have: ${extra.join(', ')}`);
  let checked = 0;
  for (const k of owed.filter((name) => name in views)) {
    const text = mask(views[k]);
    if (text.split('\n').length < 3) { problems.push(`${k} is empty (fewer than 3 lines)`); continue; }
    const left = notOwed?.lines?.[k] ?? [];
    const was = readFileSync(join(dir, `${k}.txt`), 'utf8').split('\n').filter((l) => !left.includes(l)).join('\n');
    checked++;
    if (was === `${text}\n`) continue;
    const before = was.trimEnd().split('\n'), now = text.split('\n');
    const lost = before.filter((l) => !now.includes(l)).slice(0, 6), added = now.filter((l) => !before.includes(l)).slice(0, 6);
    problems.push(`${k} differs from the baseline:${lost.map((l) => `\n      - ${l}`).join('')}${added.map((l) => `\n      + ${l}`).join('')}`);
  }
  return { problems, checked, owed: owed.length };
}

/** Write the views a run produced, masked, one file each, so a script can compare two runs file by file. */
export function writeViews(views, dir) {
  mkdirSync(dir, { recursive: true });
  for (const [k, text] of Object.entries(views)) writeFileSync(join(dir, `${k}.txt`), `${mask(text)}\n`);
}
