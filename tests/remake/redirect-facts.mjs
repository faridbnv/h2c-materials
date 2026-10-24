// A module resolution hook, loaded with `node --import`: every import of a facts-and-words module of the drawer
// (app/js/ui/<name>.js, the 18 names below), from any file, resolves to the same module of packages/pages (src/facts/<name>.ts).
// It lets the old unit tests (drawer-comparisons, material-facts, material-stats, format, print-spread, ...) run unedited against
// the TypeScript facts layer (tests/remake/pages.test.mjs). Modules outside the list (the drawer itself, the old engine) stay as
// they are, so a test file still reads the layer through the code that uses it.
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.ATLAS_ROOT;
if (!root) throw new Error('redirect-facts: ATLAS_ROOT must be set');
const NAMES = ['axes', 'dates', 'display-numbers', 'evidence-line', 'format', 'labels', 'material-facts', 'material-highlights', 'material-stats',
  'material-words', 'page-rule', 'print-brief', 'print-spread', 'product-order', 'registry', 'say', 'scales', 'text'];
const ui = pathToFileURL(join(root, 'app/js/ui') + '/').href;
// ATLAS_FACTS_DIR names another folder to read the layer from: the test plants a fault in a copy and requires the old tests to fail.
const facts = process.env.ATLAS_FACTS_DIR ?? join(root, 'packages/pages/src/facts');

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (resolved.url.startsWith(ui) && resolved.url.endsWith('.js')) {
      const name = resolved.url.slice(ui.length, -3);
      if (NAMES.includes(name)) return { ...resolved, format: 'module-typescript', url: pathToFileURL(join(facts, `${name}.ts`)).href };
    }
    return resolved;
  },
});
