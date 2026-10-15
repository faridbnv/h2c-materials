#!/usr/bin/env node
// Closing a round of work: what it leaves in the working tree that belongs in the record, and whether the generated
// documents are current (maintainability round, 2026-10-15; D138).
//
// A round writes migrations, reads packets and readings, and changes documents. The migrations run once and are then
// history; they move to archive/migrations/, where they are kept as the record of each correction but no longer sit
// among the living tools. This script makes that move the one way it is done, checks that every archived migration's
// imports still resolve, and says what else is still open.
//
//   npm run round:close                    report what is open and run the document checks; exit 1 while anything is
//   npm run round:close -- --archive       move this round's migrations to archive/migrations/ first
//   npm run round:close -- --ref <ref>     the base the freeze check compares with (default main)
//
// The freeze check prints what changed in the estimate stage and the import's text reader since the base. Neither is
// forbidden, but each grows with the data, so a change there needs a decision and a back-test row (D58, D138).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runSteps, formatTable } from './lib/run-steps.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MIGRATE = join(root, 'scripts/migrate');
export const ARCHIVE = join(root, 'archive/migrations');

// A migration is written in scripts/migrate/ and imports the living tools as its siblings' parents; from
// archive/migrations/, the same depth under the root, they are two levels up and into scripts/. Imports of build/,
// of the migration's own data files and of the other archived helpers need no change.
const ARCHIVE_SPECIFIERS = /(['"`])\.\.\/(data|lib|ingest)\//g;
export const rewriteForArchive = (text) => text.replace(ARCHIVE_SPECIFIERS, (_, q, dir) => `${q}../../scripts/${dir}/`);

/** Every file in scripts/migrate/ but its README: the migrations a round wrote, with their data files and helpers. */
export const pendingMigrations = (dir = MIGRATE) => (existsSync(dir) ? readdirSync(dir).filter((f) => f !== 'README.md').sort() : []);

/**
 * Move every pending migration to archive/migrations/ with `git mv`, rewrite the moved modules' imports, and return
 * what moved. Stops before moving anything if a name is already taken in the archive.
 */
export function archiveMigrations({ from = MIGRATE, to = ARCHIVE } = {}) {
  const files = pendingMigrations(from);
  const taken = files.filter((f) => existsSync(join(to, f)));
  if (taken.length) throw new Error(`archive/migrations already holds ${taken.join(', ')}; rename before archiving`);
  for (let i = 0; i < files.length; i += 200) {
    execFileSync('git', ['mv', ...files.slice(i, i + 200).map((f) => join(from, f)), to], { cwd: root });
  }
  let rewritten = 0;
  for (const f of files.filter((name) => name.endsWith('.mjs'))) {
    const path = join(to, f);
    const text = readFileSync(path, 'utf8');
    const next = rewriteForArchive(text);
    if (next !== text) { writeFileSync(path, next); rewritten++; }
  }
  return { moved: files.length, rewritten };
}

// ------------------------------------------------------------------ import check

const QUOTED = `(['"])([^'"]+)\\1`;
const SPECIFIER = [new RegExp(`\\bfrom\\s*${QUOTED}`, 'g'), new RegExp(`\\bimport\\s*${QUOTED}`, 'g'), new RegExp(`\\bimport\\(\\s*${QUOTED}\\s*\\)`, 'g')];
// Its own groups: QUOTED's back-reference counts from 1, and here the names come first.
const NAMED = /\bimport\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/g;
const exportCache = new Map();

/** The names a module exports, or null where it re-exports a whole module and the list cannot be known statically. */
function exportsOf(path) {
  if (exportCache.has(path)) return exportCache.get(path);
  const text = readFileSync(path, 'utf8');
  let names = new Set();
  if (/\bexport\s*\*\s*from\b/.test(text)) names = null;
  else {
    for (const m of text.matchAll(/\bexport\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
      for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) names.add(part.split(/\s+as\s+/).at(-1));
    }
    if (/\bexport\s+default\b/.test(text)) names.add('default');
  }
  exportCache.set(path, names);
  return names;
}

/**
 * Every relative import of every module in `dir`, static and dynamic, resolved against the module's own location:
 * the file must exist, and each name imported in braces must be one the file exports. Neither `node --check` (syntax
 * only) nor `import.meta.resolve` (which does not look at the disk) says this, and a migration cannot be imported to
 * find out, because it runs when loaded. Returns one line per problem.
 */
export function checkImports(dir = ARCHIVE) {
  const problems = [];
  if (!existsSync(dir)) return problems;
  for (const f of readdirSync(dir).filter((name) => name.endsWith('.mjs')).sort()) {
    const path = join(dir, f);
    const text = readFileSync(path, 'utf8');
    const base = pathToFileURL(path);
    const target = (spec) => fileURLToPath(new URL(spec, base));
    for (const re of SPECIFIER) {
      for (const m of text.matchAll(re)) {
        const spec = m[2];
        if (spec.startsWith('.') && !existsSync(target(spec))) problems.push(`${relative(root, path)}: ${spec} does not exist`);
      }
    }
    for (const m of text.matchAll(NAMED)) {
      const spec = m[3];
      if (!spec.startsWith('.') || !existsSync(target(spec))) continue;
      const exported = exportsOf(target(spec));
      if (!exported) continue;
      for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        const name = part.split(/\s+as\s+/)[0];
        if (!exported.has(name)) problems.push(`${relative(root, path)}: ${spec} exports no ${name}`);
      }
    }
  }
  return problems;
}

// ------------------------------------------------------------------ the report

const node = (...args) => [process.execPath, args];
// The generated documents and the record's own checks, each of which fails while its document is stale.
export const CHECKS = [
  ['history marks', ...node('scripts/docs-history.mjs', '--check')],
  ['decisions index', ...node('scripts/docs-decisions.mjs', '--check')],
  ['README status', ...node('scripts/docs-status.mjs', '--check')],
];

function freezeReport(ref) {
  try {
    return execFileSync('git', ['diff', '--stat', `${ref}..HEAD`, '--', 'build/src/estimate', 'scripts/ingest/propose.mjs'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return `(no ref ${ref} to compare with)`;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--ref');
  const ref = at >= 0 ? args[at + 1] : 'main';
  const open = [];

  if (args.includes('--archive')) {
    const { moved, rewritten } = archiveMigrations();
    console.log(`round:close: ${moved} file(s) moved to archive/migrations/, ${rewritten} module(s) re-pointed`);
  }
  const pending = pendingMigrations();
  if (pending.length) open.push(`${pending.length} file(s) still in scripts/migrate/ (npm run round:close -- --archive): ${pending.slice(0, 5).join(', ')}${pending.length > 5 ? ', …' : ''}`);
  const problems = checkImports();
  for (const p of problems) open.push(`import: ${p}`);

  const result = runSteps(CHECKS);
  console.log(formatTable('round:close checks', result));
  for (const s of result.failed) open.push(`check "${s.name}" failed`);

  const frozen = freezeReport(ref);
  console.log(`\nFrozen components changed since ${ref} (a change needs a decision and a back-test row, D58, D138):`);
  console.log(frozen ? frozen.split('\n').map((l) => `  ${l}`).join('\n') : '  none');

  if (open.length) {
    console.error(`\nround:close: ${open.length} item(s) open:`);
    for (const o of open) console.error(`  ${o}`);
    process.exit(1);
  }
  console.log('\nround:close: nothing open.');
}
