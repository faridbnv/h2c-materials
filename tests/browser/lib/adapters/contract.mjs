// What a page adapter must offer (WP-22; pack 08 section 5.3 step 6: the new page adapter interface for WP-26). The checks never
// name a selector; they call these steps, and the adapter of the page under test answers. A step is either a function returning
//   { views: { <name>: <text> }, problems: [<sentence>], notes }
// or { unsupported: <reason> } when that page cannot answer it yet. An unsupported step is reported as a named SKIPPED, never as a
// pass (tests/browser/allowed-skips.mjs), so a page that cannot answer a check never looks like a page that passed it.
//
// The selector steps (the old interface probe, one per group of views):
//   selectorTemplates()  the start screen, every template in Strict and in Explore with estimates (and its link reopened), three pins in Compare
//   selectorDrawers()    the drawer of a material: tabs, comparisons, dots, and the materials that carry the other comparisons
//   selectorRanked()     a template ranked by a goal; the first-ranked material's products; what makers say; a product chosen
//   selectorFamily()     the family and polymer rail
//   selectorLayout(screen)  the layout on one screen (the page's context already has it): default, drawer, every lens, every drawer tab
//   selectorWarm()       the answer before the exposition at 1024 x 768
//   selectorAshby()      the Ashby decision workspace: size, keyboard, keeping place, marks, Material typicals
//   materialPages(screen)   the material pages on one screen
//   returnTrip()         from a drawer to a material page and back with the selection
// Beside the steps, an adapter offers its behaviours (BEHAVIOURS below), one function each returning { problems }, and the fuzz tab:
// fuzzTab(page, k, tmpDir) gives an object the fuzz drives (load, importScenario, runPlan, readWithSearch).
export const SELECTOR_STEPS = Object.freeze(['selectorTemplates', 'selectorDrawers', 'selectorRanked', 'selectorFamily', 'selectorLayout', 'selectorWarm', 'selectorAshby', 'materialPages', 'returnTrip']);

// The behaviours cheap to lose (pack 05 section 12): each is a function returning { problems: [sentence] }, or an unsupported step.
export const BEHAVIOURS = Object.freeze(['shortlistCap', 'chosenCap', 'escapeLayers', 'slashFocusesSearch', 'skipLink', 'damagedScenarioFile', 'backToResults', 'pastedLink']);

/** A step the page cannot answer yet. */
export const unsupported = (reason) => Object.freeze({ unsupported: reason });
export const isUnsupported = (step) => typeof step === 'object' && step !== null && typeof step.unsupported === 'string';

/** Whether a step is a function, or a named unsupported step that says why. */
const isAnswer = (step) => typeof step === 'function' || (isUnsupported(step) && step.unsupported.length > 0);

/** Throws, naming what is wrong, unless the adapter offers every step as a function or a named unsupported. */
export function assertAdapter(adapter) {
  const problems = [];
  if (typeof adapter?.id !== 'string' || !adapter.id) problems.push('no id');
  for (const name of SELECTOR_STEPS) {
    if (!isAnswer(adapter?.steps?.[name])) problems.push(`step ${name} is neither a function nor an unsupported step with a reason`);
  }
  for (const name of BEHAVIOURS) {
    if (!isAnswer(adapter?.behaviours?.[name])) problems.push(`behaviour ${name} is neither a function nor an unsupported step with a reason`);
  }
  if (!isAnswer(adapter?.fuzzTab)) problems.push('fuzzTab is neither a function nor an unsupported step with a reason');
  const extra = Object.keys(adapter?.steps ?? {}).filter((n) => !SELECTOR_STEPS.includes(n));
  if (extra.length) problems.push(`steps the contract does not name: ${extra.join(', ')}`);
  if (problems.length) throw new Error(`adapter "${adapter?.id}" does not meet the contract:\n  ${problems.join('\n  ')}`);
  return adapter;
}
