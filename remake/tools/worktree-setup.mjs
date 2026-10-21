#!/usr/bin/env node
// Creates a work-package worktree: node remake/tools/worktree-setup.mjs <wp> <slug> [base] [--from-main]
//   <wp>    WP-02, wp-02 or 02       -> directory .claude/worktrees/wp-02, branch wp-02-<slug>
//   [base]  defaults to origin/remake/v3
//   --install    also runs npm ci in the root and in build/, so `npm run doctor` passes in the new worktree
//   --from-main  bases the worktree on origin/main (for the rare job that must read the frozen old tool) and copies
//                .claude/settings.json, .claude/hooks/ and .claude/agents/ in untracked, listing them in the repository's
//                info/exclude so they cannot be committed there. (Git keeps one info/exclude for all linked worktrees.)
// Always copies CLAUDE.local.md and .claude/settings.local.json when they exist. Refuses to overwrite anything.
import { execFileSync } from 'node:child_process';
import { existsSync, cpSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function parse(argv) {
  const fromMain = argv.includes('--from-main');
  const [wp, slug, base] = argv.filter((a) => !a.startsWith('--'));
  const m = /^(?:wp-)?(s0|\d{2})$/i.exec(wp ?? '');
  if (!m || !/^[a-z0-9][a-z0-9-]*$/.test(slug ?? '')) throw new Error('usage: worktree-setup.mjs <wp> <slug> [base] [--from-main]   (slug: lowercase letters, digits, hyphens)');
  const num = /^s0$/i.test(m[1]) ? 'S0' : m[1];
  return { name: `wp-${num}`, slug, base: base ?? (fromMain ? 'origin/main' : 'origin/remake/v3'), fromMain };
}

export function setup(argv, cwd = process.cwd()) {
  const { name, slug, base, fromMain } = parse(argv);
  const here = git(cwd, 'rev-parse', '--show-toplevel');
  // The main checkout holds the personal files; a linked worktree's common git dir sits inside it.
  const mainCheckout = dirname(resolve(here, git(here, 'rev-parse', '--git-common-dir')));
  try { git(here, 'fetch', '-q', 'origin'); } catch (e) { console.error(`warning: git fetch origin failed (${String(e.stderr).trim()}); using the refs already here`); }
  git(here, 'rev-parse', '--verify', '--quiet', `${base}^{commit}`);
  const dir = join(mainCheckout, '.claude', 'worktrees', name);
  const branch = `${name}-${slug}`;
  if (existsSync(dir)) throw new Error(`${dir} already exists`);
  git(here, 'worktree', 'add', '-b', branch, dir, base);

  const sources = [mainCheckout, here];
  const copied = [];
  const copy = (rel, { optional = true } = {}) => {
    const from = sources.map((s) => join(s, rel)).find(existsSync);
    if (!from) { if (!optional) console.error(`warning: ${rel} not found, not copied`); return false; }
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    cpSync(from, join(dir, rel), { recursive: true });
    copied.push(rel);
    return true;
  };
  copy('CLAUDE.local.md');
  copy('.claude/settings.local.json');
  const untracked = ['CLAUDE.local.md', '.claude/settings.local.json'];
  if (fromMain) {
    for (const rel of ['.claude/settings.json', '.claude/hooks', '.claude/agents']) { if (copy(rel, { optional: false })) untracked.push(rel); }
    const exclude = git(dir, 'rev-parse', '--path-format=absolute', '--git-path', 'info/exclude');
    mkdirSync(dirname(exclude), { recursive: true });
    const have = existsSync(exclude) ? readFileSync(exclude, 'utf8').split('\n') : [];
    const add = untracked.map((p) => (p.endsWith('.md') || p.endsWith('.json') ? `/${p}` : `/${p}/`)).filter((l) => !have.includes(l));
    if (add.length) appendFileSync(exclude, `${have.at(-1) === '' || !have.length ? '' : '\n'}# worktree-setup --from-main: untracked copies\n${add.join('\n')}\n`);
  }
  if (argv.includes('--install')) {
    execFileSync('npm', ['ci', '--silent'], { cwd: dir, stdio: 'inherit' });
    execFileSync('npm', ['ci', '--silent', '--prefix', 'build'], { cwd: dir, stdio: 'inherit' });
    copied.push('node_modules (npm ci, root and build/)');
  }
  return { dir, branch, base, copied };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const r = setup(process.argv.slice(2));
    console.log(`worktree ${r.dir}\nbranch   ${r.branch} (from ${r.base})\ncopied   ${r.copied.join(', ') || 'nothing'}`);
    console.log('next: cd there, then run the session check (pack 14 section D); a fresh worktree needs npm ci first unless you passed --install');
  } catch (e) { console.error(`worktree-setup failed: ${String(e.stderr || e.message).trim()}`); process.exitCode = 1; }
}
