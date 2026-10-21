#!/usr/bin/env node
// Release identity v2 (WP-14; pack 02 section 6.4, ADR-16). A release is its content: the first 12 hex characters of a
// SHA-256 over everything that can change an answer. The old ID (build/src/release.js, D96) hashed every file's path
// beside its bytes, so moving a file minted a new release. This one hashes CONTENTS only:
//
//   - a part lists its files by content digest, sorted, so the order of the files on disk, the folder they sit in and the
//     path of the checkout never enter;
//   - the two parts whose file NAME is part of the fact (a table's name, a schema's name) also list the file's base name,
//     never its folder, so renaming a table is a new release and moving its file is not;
//   - the runtime is recorded with the inputs: the Node pin (.nvmrc) and the exact Node and ICU versions that ran, because
//     collation and number formatting differ between runtimes (gap-1: builds differ across machines in 6 estimate leaves).
//
// What only draws the page (apps/public/src, CSS) or runs the write service (the workspace code, the editor) is not an
// input: two pages that differ only there give the same answers and share the ID (D96, D142). What decides the answers of
// /v3/ is: the engine, the question it asks and how its snapshot is compiled (apps/public/tools), the words layer it
// imports (app/js/ui/labels.js, registry.js, templates.js, table.js), the compile, case and staging files of the impact module, and
// the corpus the question comes from. Node built-ins only, so a deploy job can run it without an install.
//
//   npm run release:id            prints the 12-character ID
//   npm run release:id -- --json  prints the ID, the part digests and the runtime
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';

/**
 * What decides an answer, by part. `paths` are the repository root's; `named` parts also list each file's base name;
 * `exclude` drops files that cannot decide an answer (the impact preview, a command line). Source files only: no
 * `node_modules`, no generated output.
 */
export const RELEASE_INPUTS = {
  data: { paths: ['data/tables'], named: true },
  schema: { paths: ['schema'], named: true },
  rules: { paths: ['build/src', 'build/mappings', 'packages/domain/src'] },
  engine: {
    paths: [
      'app/js/engine', 'app/js/ui/templates.js', 'app/js/ui/labels.js', 'app/js/ui/registry.js',
      'app/js/ui/table.js', // sortRows: the order /v3/ lists materials in (packages/engine/src/old-table.ts)
      'packages/engine/src',
      // the write service's code decides no answer; only the contract that checks the database the engine reads does
      'packages/data/src/db-contract.ts', 'packages/data/src/shape.ts', 'packages/data/src/generated/db-shape.ts',
    ],
    // the impact preview and the command line decide no answer, except the three files the /v3/ data is compiled through
    exclude: [/^packages\/engine\/src\/impact\/(?!(compile|cases|stage)\.ts$)/, /^packages\/engine\/src\/cli\.ts$/],
  },
  // the question /v3/ asks (CASE_ID) and how its snapshot is compiled are in the tool that makes the data
  view: { paths: ['apps/public/tools'] },
  // the questions themselves, read only
  questions: { paths: ['parity/corpus'] },
  dependencies: { paths: ['build/package-lock.json'] },
};

/** The Node pin, a committed input: the version the repository says it builds with. */
export const NODE_PIN_FILE = '.nvmrc';

export const RELEASE_ID_PATTERN = /^[0-9a-f]{12}$/;

// Operating-system litter never decides anything, and a copy made on a Mac would otherwise differ from its clone.
const IGNORED = /(^|\/)(\.DS_Store|Thumbs\.db|node_modules)(\/|$)/;

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function* filesUnder(abs) {
  if (!statSync(abs).isDirectory()) { yield abs; return; }
  for (const name of readdirSync(abs).sort()) yield* filesUnder(join(abs, name));
}

/** The part's entries: one line per file, `<digest>` or `<base name> <digest>`, sorted. Folders and the checkout's path never enter. */
function partEntries(root, { paths, named = false, exclude = [] }) {
  const entries = [];
  for (const p of paths) {
    const abs = join(root, p);
    if (!existsSync(abs)) continue;
    for (const file of filesUnder(abs)) {
      const logical = relative(root, file).split('\\').join('/');
      if (IGNORED.test(logical) || exclude.some((re) => re.test(logical))) continue;
      const digest = sha256(readFileSync(file));
      entries.push(named ? `${basename(file)} ${digest}` : digest);
    }
  }
  return entries.sort();
}

/**
 * @typedef {{ nodePin: string | null, node: string, icu: string | null }} Runtime
 * @typedef {{ id: string, digest: string, inputs: Record<string, string>, runtime: Runtime, files: Record<string, number> }} ReleaseIdentity
 */

/**
 * The runtime the digest records.
 * @param {string} root
 * @returns {Runtime}
 */
export function currentRuntime(root) {
  const pin = join(root, NODE_PIN_FILE);
  return {
    nodePin: existsSync(pin) ? readFileSync(pin, 'utf8').trim() : null,
    node: process.versions.node,
    icu: process.versions.icu ?? null,
  };
}

/**
 * The release the project at `root` makes: `{ id, digest, inputs, runtime, files }`. `runtime` is replaceable so a test can
 * hold the runtime fixed or change one part of it.
 * @param {string} [root]
 * @param {{ runtime?: Runtime }} [options]
 * @returns {ReleaseIdentity}
 */
export function releaseIdentity(root = repoRoot(), { runtime = currentRuntime(root) } = {}) {
  /** @type {Record<string, string>} */
  const inputs = {};
  /** @type {Record<string, number>} */
  const files = {};
  for (const [name, spec] of Object.entries(RELEASE_INPUTS)) {
    const entries = partEntries(root, spec);
    files[name] = entries.length;
    inputs[name] = sha256(entries.join('\n'));
  }
  inputs.runtime = sha256(`nodePin ${runtime.nodePin}\nnode ${runtime.node}\nicu ${runtime.icu}`);
  const digest = sha256(Object.keys(inputs).sort().map((k) => `${k} ${inputs[k]}`).join('\n'));
  return { id: digest.slice(0, 12), digest, inputs, runtime, files };
}

if (isMain(import.meta.url)) {
  try {
    const release = releaseIdentity();
    const empty = Object.keys(release.files).find((name) => release.files[name] === 0);
    if (empty) throw new Error(`no input found for the "${empty}" part: is this the repository root?`);
    console.log(process.argv.includes('--json') ? JSON.stringify(release, null, 2) : release.id);
  } catch (e) { console.error(`release:id failed: ${e.message}`); process.exitCode = 1; }
}
