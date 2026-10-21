// Every `npm run X` the remake tells a person or an agent to run must exist in package.json. A merge once dropped seven
// scripts (wp:deps, wp:check, wp:attest, wp:note, wp:digest, wp:worktree, baseline) and nothing noticed, because the
// messages that name them are only text. This test reads that text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const scripts = JSON.parse(read('package.json')).scripts;

// `npm run X`, `npm run -s X`, `npm run --silent X`; X is a script name (letters, digits, : _ -).
const NPM_RUN = /\bnpm run(?:\s+(?:-s|--silent))?\s+([A-Za-z][\w:-]*)/g;
const named = (text) => [...text.matchAll(NPM_RUN)].map((m) => m[1]);

// Where the scripts are named. gen-wp-index.mjs holds the exit-command table of every package, built or not; those
// commands are judged below through the index and the package's status, not as messages.
const sources = () => [
  ...readdirSync(join(root, 'remake/tools')).filter((f) => /\.mjs$/.test(f) && f !== 'gen-wp-index.mjs').map((f) => `remake/tools/${f}`),
  ...readdirSync(join(root, '.claude/hooks')).map((f) => `.claude/hooks/${f}`),
  '.claude/settings.json',
  'CLAUDE.md',
].filter((rel) => existsSync(join(root, rel)));

test('every npm run named in the remake tools, the Claude hooks, settings and CLAUDE.md is a script in package.json', () => {
  const missing = [];
  const seen = new Set();
  for (const rel of sources()) for (const name of named(read(rel))) { seen.add(name); if (!(name in scripts)) missing.push(`${rel}: npm run ${name}`); }
  assert.deepEqual(missing, [], 'scripts named in text but absent from package.json');
  // not vacuous: the scripts a merge once dropped are named somewhere, so the scan really looked
  for (const name of ['wp:attest', 'wp:check', 'wp:note', 'parity', 'rulings:check', 'types:check']) assert.ok(seen.has(name), `the scan found no mention of npm run ${name}`);
});

test('the exit commands of every package that is done (and so must run now) name scripts that exist', () => {
  const index = JSON.parse(read('remake/plan/wp-index.json'));
  const status = (id) => JSON.parse(read(`remake/status/${id}.json`));
  const missing = [];
  let checked = 0;
  for (const p of index.packages.filter((x) => !x.dropped && status(x.id).status === 'done')) {
    for (const cmd of p.exit.commands) for (const name of named(cmd)) { checked++; if (!(name in scripts)) missing.push(`${p.id}: ${cmd}`); }
  }
  assert.deepEqual(missing, []);
  assert.ok(checked >= 3, 'WP-02 and WP-05 name npm scripts in their exit commands');
});

test('the work-package scripts that were dropped in a merge are back and point at tools that exist', () => {
  const want = {
    'wp:deps': 'node remake/tools/wp-status.mjs --deps', 'wp:check': 'node remake/tools/wp-check.mjs', 'wp:attest': 'node remake/tools/wp-attest.mjs',
    'wp:note': 'node remake/tools/wp-note.mjs', 'wp:digest': 'node remake/tools/wp-digest.mjs', 'wp:worktree': 'node remake/tools/worktree-setup.mjs',
    baseline: 'node remake/tools/baseline.mjs', 'wp:status': 'node remake/tools/wp-status.mjs',
  };
  for (const [name, command] of Object.entries(want)) {
    assert.equal(scripts[name], command, name);
    assert.ok(existsSync(join(root, command.split(' ')[1])), `${command.split(' ')[1]} exists`);
  }
});

test('the scan itself: it reads -s and --silent forms, ignores placeholders, and stops at the script name', () => {
  assert.deepEqual(named('npm run -s wp:deps; npm run --silent parity -- --noop; npm run <script>; npm run  baseline.'), ['wp:deps', 'parity', 'baseline']);
  assert.deepEqual(named('run npm install, then yarn run x'), []);
});
