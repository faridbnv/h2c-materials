#!/usr/bin/env node
// PreToolUse guard for Bash (pack 14 §B2). Refuses, with exit code 2 and one line on stderr, the git and gh commands an
// agent must never run on the remake: pushes to main or straight to the integration branch, pushes or writes to the
// preview repository, force pushes (except --force-with-lease on the agent's own wp-*/sync/* branch), wp:attest,
// dispatching the live deploy, touching releases or tags, changing repository settings or secrets, and merges that are
// not auto-merges into the integration branch. Anything else exits 0 and prints nothing.
// It matches command text, so it is a convenience, not a security boundary: branch protection and CI are binding.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, 'guard-config.json'), 'utf8'));

function run(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

// Test seams: the tests set these so no real git or gh call is needed.
const currentBranch = () => process.env.H2C_GUARD_CURRENT_BRANCH ?? run('git', ['branch', '--show-current']);
const upstreamBranch = () => {
  if ('H2C_GUARD_UPSTREAM' in process.env) return process.env.H2C_GUARD_UPSTREAM || null;
  const u = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  return u ? u.replace(/^[^/]+\//, '') : null;
};
const prBase = (pr) => {
  if ('H2C_GUARD_PR_BASE' in process.env) return process.env.H2C_GUARD_PR_BASE || null;
  const args = ['pr', 'view', ...(pr ? [pr] : []), '--json', 'baseRefName', '-q', '.baseRefName'];
  return run('gh', args);
};

// Split a shell line into simple commands on ; && || | and newlines, and each into words (quotes respected).
export function splitCommands(line) {
  const commands = [];
  let words = [], word = '', quote = null, has = false;
  const endWord = () => { if (has) words.push(word); word = ''; has = false; };
  const endCommand = () => { endWord(); if (words.length) commands.push(words); words = []; };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < line.length) { word += line[++i]; }
      else word += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (c === '\\' && i + 1 < line.length) { word += line[++i]; has = true; continue; }
    if (c === ' ' || c === '\t') { endWord(); continue; }
    if (c === '\n' || c === ';') { endCommand(); continue; }
    if ((c === '&' || c === '|') ) { if (line[i + 1] === c) i++; endCommand(); continue; }
    word += c; has = true;
  }
  endCommand();
  return commands;
}

const stripRef = (r) => r.replace(/^\+/, '').replace(/^refs\/heads\//, '');
const isProtected = (b) => config.protectedBranches.includes(b);
const isAgentBranch = (b) => config.agentPushPrefixes.some((p) => b.startsWith(p));
const previewName = config.previewRepo.split('/')[1];
const mentionsPreview = (w) => w.includes(config.previewRepo) || w.includes(previewName);

// Words after a leading "git" or "gh", skipping global options such as -C <dir> or -c k=v.
function subcommand(words, tool) {
  if (words[0] !== tool) return null;
  let i = 1;
  while (i < words.length && words[i].startsWith('-')) { i += ['-C', '-c', '--git-dir', '--work-tree', '-R', '--repo'].includes(words[i]) ? 2 : 1; }
  return words.slice(i);
}

function checkGitPush(rest) {
  const flags = rest.filter((w) => w.startsWith('-'));
  const args = rest.filter((w) => !w.startsWith('-'));
  const lease = flags.some((f) => f.startsWith('--force-with-lease'));
  const force = flags.some((f) => f === '--force' || f === '-f' || /^-[a-zA-Z]*f/.test(f) && !f.startsWith('--')) ;
  if (flags.includes('--all') || flags.includes('--mirror')) return 'a push with --all or --mirror can reach main or remake/v3';
  if (flags.includes('--tags') || flags.includes('--follow-tags')) return 'pushing tags is not authorized';
  const remote = args[0];
  if (remote && mentionsPreview(remote)) return `pushes to the preview repository ${config.previewRepo} are made by CI only`;
  let refspecs = args.slice(1);
  if (!refspecs.length) {
    const up = upstreamBranch() ?? currentBranch();
    if (!up) return 'cannot tell where a bare git push would go; name the branch';
    refspecs = [up];
  }
  for (const spec of refspecs) {
    const plus = spec.startsWith('+');
    let [src, dst] = spec.includes(':') ? spec.split(':') : [spec, null];
    src = stripRef(src);
    // "src" alone pushes to the same name; ":dst" deletes dst; HEAD resolves to the current branch.
    if (dst === null) dst = src === 'HEAD' ? currentBranch() : src;
    if (!dst) return 'cannot tell where this push would go; name the branch';
    if (dst.startsWith('refs/tags/') || src.startsWith('refs/tags/')) return 'pushing or deleting tags is not authorized';
    dst = stripRef(dst);
    if (isProtected(dst)) return `pushes to ${dst} are not authorized (main stays untouched until cutover)`;
    if (dst === config.integrationBranch) return `${dst} takes changes only through pull requests`;
    if ((plus || (force && !lease)) ) return 'force pushes are refused; use --force-with-lease on your own wp-* or sync/* branch';
    if (lease && !isAgentBranch(dst)) return `--force-with-lease is allowed only on ${config.agentPushPrefixes.join(' or ')} branches`;
  }
  return null;
}

function checkGit(rest) {
  const [sub, ...more] = rest;
  if (sub === 'push') return checkGitPush(more);
  if (sub === 'tag' && more.some((w) => ['-d', '--delete', '-f', '--force'].includes(w))) return 'deleting or moving tags is not authorized';
  return null;
}

function checkGh(rest) {
  const [area, action, ...more] = rest;
  const all = rest.join(' ');
  if (area === 'workflow' && action === 'run' && rest.some((w) => /(^|\/)pages\.ya?ml$/.test(w))) return 'dispatching pages.yml deploys the live site';
  if (area === 'release' && ['create', 'edit', 'delete', 'upload', 'delete-asset'].includes(action)) return 'releases are not changed by agents';
  if (area === 'repo' && ['edit', 'delete', 'rename', 'archive'].includes(action)) return 'repository settings are changed by the owner';
  if (area === 'secret' || area === 'variable') { if (['set', 'delete', 'remove'].includes(action)) return 'secrets and variables are set by the owner'; }
  if (area === 'api') {
    const method = (() => { const i = rest.findIndex((w) => w === '-X' || w === '--method'); return i >= 0 ? (rest[i + 1] ?? '').toUpperCase() : (rest.find((w) => /^(-X|--method=)/.test(w)) ?? '').replace(/^(-X|--method=)/, '').toUpperCase(); })();
    const writes = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) || rest.some((w) => ['-f', '-F', '--field', '--raw-field', '--input'].includes(w) || /^(-f|-F)./.test(w));
    if (writes && mentionsPreview(all)) return `writes to the preview repository ${config.previewRepo} are made by CI only`;
    if (['PATCH', 'PUT', 'DELETE'].includes(method) && /(^|\s)\/?repos\//.test(all)) return 'changing repository settings through gh api is the owner\'s step';
    if (writes && /\/(git\/refs|releases|branches\/[^ ]+\/protection)/.test(all)) return 'tags, releases and branch protection are not changed by agents';
  }
  if (area === 'pr' && action === 'merge') {
    if (!rest.includes('--auto')) return 'agents merge only with gh pr merge --auto into the integration branch';
    const pr = more.find((w) => !w.startsWith('-'));
    const base = prBase(pr);
    if (!base) return 'cannot look up the pull request base; refusing the merge';
    if (base !== config.integrationBranch) return `agents may merge only into ${config.integrationBranch}; this PR's base is ${base}`;
  }
  if (area === 'pr' && action === 'create') {
    const i = rest.findIndex((w) => w === '--base' || w === '-B');
    const base = i >= 0 ? rest[i + 1] : null;
    if (base && isProtected(base)) return `pull requests into ${base} are not authorized for agents`;
  }
  return null;
}

export function check(command) {
  for (const words of splitCommands(command)) {
    // npm run wp:attest (or npx/node wrappers of it) is the owner's own act.
    if (words.some((w) => /^wp:attest\b/.test(w)) || words.some((w) => /remake\/tools\/wp-attest/.test(w))) return 'wp:attest is run by the owner in their own terminal, never by an agent';
    const git = subcommand(words, 'git');
    if (git) { const r = checkGit(git); if (r) return r; }
    const gh = subcommand(words, 'gh');
    if (gh) { const r = checkGh(gh); if (r) return r; }
  }
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
  if (input.tool_name && input.tool_name !== 'Bash') process.exit(0);
  const command = input.tool_input?.command;
  if (typeof command !== 'string') process.exit(0);
  const reason = check(command);
  if (reason) { process.stderr.write(`guard-git: refused: ${reason}\n`); process.exit(2); }
  process.exit(0);
}
