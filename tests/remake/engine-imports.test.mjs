// Untested-rules question 2 (S11-10): the engine never imports the interface, so it can be tested without the page.
//   old:  every file of app/js/engine imports only its own siblings (nothing from app/js/ui, app/js/main.js or apps/)
//   new:  no package imports from apps/ (the new interface), and the engine's neighbours packages/engine, packages/domain
//         and packages/data import nothing from the old interface (app/js/ui, app/js/main.js) either
// Static: it reads import statements (import ... from, export ... from, import 'x', import(), require()) at the start of a
// line, so a commented-out import is not one. The old files are read, never edited. A dynamic import whose target is not a
// literal is reported by name and must be on the reviewed list below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const posix = (p) => p.split(sep).join('/');

/** The import specifiers of a source text: literal ones, and a count of dynamic imports whose target is not a literal. */
function importsOf(src) {
  const specifiers = [];
  // import x from 'a'; import {a,\n b} from 'a'; export * from 'a'; export {a} from 'a'; import 'a'. Start of line only.
  for (const m of src.matchAll(/^[ \t]*(?:import|export)\b(?:[^;'"`]*?\bfrom\s*|\s*)(['"`])([^'"`\n]+)\1/gm)) specifiers.push(m[2]);
  let dynamic = 0;
  for (const line of src.split('\n')) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const m of line.matchAll(/(?<![\w$.])(?:import|require)\s*\(\s*(['"`])?([^'"`)]*)/g)) {
      if (m[1] && !m[2].includes('${')) specifiers.push(m[2]); else dynamic++;
    }
  }
  return { specifiers, dynamic };
}

function files(dir, ext = /\.(m?js|ts|vue)$/) {
  const out = [];
  for (const name of readdirSync(join(root, dir)).sort()) {
    if (name === 'node_modules') continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...files(rel, ext)); else if (ext.test(name)) out.push(rel);
  }
  return out;
}

/** Where a relative specifier lands, from the repository root; a bare specifier is returned as it is. */
const landing = (file, spec) => (spec.startsWith('.') ? posix(relative(root, resolve(root, dirname(file), spec))) : spec);
const inside = (path, dir) => path === dir || path.startsWith(`${dir}/`);

const OLD_INTERFACE = ['app/js/ui', 'app/js/main.js', 'app/css', 'app/index.html'];
const NEW_INTERFACE = ['apps'];
const appNames = readdirSync(join(root, 'apps')).map((d) => JSON.parse(readFileSync(join(root, 'apps', d, 'package.json'), 'utf8')).name);

/** Every import of every file under `dir` that lands in one of `forbidden`, as 'file -> specifier'. */
function importsInto(dir, forbidden) {
  const found = [];
  for (const file of files(dir)) {
    for (const spec of importsOf(readFileSync(join(root, file), 'utf8')).specifiers) {
      const to = landing(file, spec);
      if (forbidden.some((f) => inside(to, f)) || appNames.includes(to) || appNames.some((n) => to.startsWith(`${n}/`))) found.push(`${file} -> ${spec}`);
    }
  }
  return found;
}

// ---- the scanner itself ---------------------------------------------------------------------------------------------
test('the scanner sees every way to import, ignores comments, and can fail', () => {
  const src = [
    "import a from './a.js';", "import { b,", "  c } from '../ui/x.js';", "export * from './d.js';", "export { e } from '../../apps/y.ts';", "import './side.js';",
    "// import z from '../ui/commented.js';", ' * import z from "../ui/doc.js"', "const m = await import('./lazy.js');", 'const n = require("./req.cjs");', 'const k = await import(variable);',
    "const t = `import x from '../ui/in-a-template.js'`;",
  ].join('\n');
  const { specifiers, dynamic } = importsOf(src);
  assert.deepEqual(specifiers.sort(), ['../../apps/y.ts', '../ui/x.js', './a.js', './d.js', './lazy.js', './req.cjs', './side.js'].sort());
  assert.equal(dynamic, 1);
  assert.equal(landing('app/js/engine/f.js', '../ui/x.js'), 'app/js/ui/x.js');
  assert.ok(inside(landing('app/js/engine/f.js', '../ui/x.js'), 'app/js/ui'));
  assert.ok(!inside('app/js/uix/a.js', 'app/js/ui'));
  assert.equal(landing('packages/engine/src/a.ts', '@atlas/domain'), '@atlas/domain');
});

// ---- the old engine --------------------------------------------------------------------------------------------------
test('the old engine (app/js/engine) imports only its own siblings: nothing from app/js/ui, app/js/main.js or apps/', () => {
  const engineFiles = files('app/js/engine');
  assert.ok(engineFiles.length >= 10, `${engineFiles.length} engine files`);
  const stray = [];
  for (const file of engineFiles) {
    const { specifiers, dynamic } = importsOf(readFileSync(join(root, file), 'utf8'));
    assert.equal(dynamic, 0, `${file} has a dynamic import with no literal target`);
    for (const spec of specifiers) {
      const to = landing(file, spec);
      const sibling = to.startsWith('app/js/engine/') && !to.slice('app/js/engine/'.length).includes('/') && existsSync(join(root, to));
      if (!sibling) stray.push(`${file} -> ${spec}`);
    }
  }
  assert.deepEqual(stray, [], 'an engine file imports something that is not an engine sibling');
  assert.deepEqual(importsInto('app/js/engine', [...OLD_INTERFACE, ...NEW_INTERFACE]), []);
});

// ---- the new packages ------------------------------------------------------------------------------------------------
test('no package imports from apps/ (the new interface), by path or by workspace name', () => {
  const found = importsInto('packages', NEW_INTERFACE);
  assert.deepEqual(found, []);
  assert.ok(appNames.length >= 2 && appNames.every((n) => n.startsWith('@atlas/')), appNames.join());
});

test('the new engine and its neighbours (packages/engine, packages/domain, packages/data) import nothing from the old interface', () => {
  for (const pkg of ['packages/engine', 'packages/domain', 'packages/data']) {
    assert.ok(files(pkg).length > 5, pkg);
    assert.deepEqual(importsInto(pkg, OLD_INTERFACE), [], pkg);
  }
});

test('the one import of the old interface from a package is reviewed and named: packages/build/src/written.ts reads material-highlights.js', () => {
  // The build writes the summaries a page shows, and shares the page's wording module for them. It is the build, not the engine,
  // and the exception is held here so that a second one is a failure and the removal of this one is noticed.
  assert.deepEqual(importsInto('packages', OLD_INTERFACE), ['packages/build/src/written.ts -> ../../../app/js/ui/material-highlights.js']);
});

test('dynamic imports in the packages without a literal target are the reviewed engine loaders and nothing else', () => {
  const reviewed = new Map([
    ['packages/engine/src/old-engine.ts', 1], // loads app/js/engine/<module>.js from the engine directory
    ['packages/engine/src/port/stage.ts', 1], // loads the staged copy of the engine's modules
    ['packages/engine/src/impact/old-build.ts', 1], // loads the old build (build/src), not the interface
  ]);
  const seen = new Map();
  for (const dir of ['packages/engine', 'packages/domain', 'packages/data']) {
    for (const file of files(dir)) {
      const { dynamic } = importsOf(readFileSync(join(root, file), 'utf8'));
      if (dynamic) seen.set(file, dynamic);
    }
  }
  // packages/data/src/cli.ts routes sub-commands; it is not an engine file and loads other package modules.
  seen.delete('packages/data/src/cli.ts');
  assert.deepEqual([...seen].sort(), [...reviewed].sort());
  for (const file of reviewed.keys()) {
    const text = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(text, /app\/js\/ui|app\/js\/main/, `${file} names the interface`);
  }
});
