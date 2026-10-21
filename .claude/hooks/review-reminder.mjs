#!/usr/bin/env node
// Stop hook (pack 14 §B2, §C3). When the branch changed new code since its base and the review chain has not run for
// this commit, it prints the chain and exits 2 so the session runs it before stopping. The chain ends by writing
// .claude/state/reviewed-<HEAD-sha>, so the hook fires at most once per commit. Quiet (exit 0) otherwise, on sync/*
// branches, and when the stop is already a continuation of this hook.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WATCHED = ['packages/', 'apps/', 'db/', 'tests/', 'parity/', 'remake/', '.github/'];
export const STEPS = [
  '1. code-simplifier:code-simplifier agent on the changed files, then /simplify',
  '2. /code-review high, scoped to git diff <base>...HEAD',
  '3. pr-review-toolkit: silent-failure-hunter (error paths), type-design-analyzer (types, contracts), pr-test-analyzer (tests)',
  '4. npm run wp:check -- WP-NN (before WP-02: the package exit command), plus parity where the package needs it',
  '5. write .claude/state/reviewed-<HEAD-sha>',
];

const git = (args) => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };

export function decide({ branch, changed, head, markerExists }) {
  if (!branch || branch.startsWith('sync/')) return null;
  if (!head) return null;
  const touched = changed.filter((f) => WATCHED.some((p) => f.startsWith(p)));
  if (!touched.length || markerExists) return null;
  return `review-reminder: ${touched.length} changed file(s) under new-code paths and no review marker for ${head.slice(0, 12)}. Run the review chain before stopping:\n${STEPS.join('\n')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input: treat as a normal stop */ }
  if (input.stop_hook_active) process.exit(0);
  const top = git(['rev-parse', '--show-toplevel']);
  if (!top) process.exit(0);
  const base = process.env.H2C_REVIEW_BASE || 'origin/remake/v3';
  const head = git(['rev-parse', 'HEAD']);
  const committed = (git(['diff', '--name-only', `${base}...HEAD`]) ?? '').split('\n').filter(Boolean);
  const pending = (git(['status', '--porcelain']) ?? '').split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^.* -> /, ''));
  const message = decide({
    branch: git(['branch', '--show-current']),
    changed: [...new Set([...committed, ...pending])],
    head,
    markerExists: head ? existsSync(join(top, '.claude', 'state', `reviewed-${head}`)) : false,
  });
  if (message) { process.stderr.write(message + '\n'); process.exit(2); }
  process.exit(0);
}
