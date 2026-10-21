#!/usr/bin/env node
// PreToolUse guard for Bash (pack 14 §B2). Refuses, with exit code 2 and one line on stderr, the git and gh commands an
// agent must never run on the remake: pushes to main or straight to the integration branch, pushes or writes to the
// preview repository, force pushes (except --force-with-lease on the agent's own wp-*/sync/* branch), wp:attest,
// dispatching the live deploy, touching releases or tags, changing repository settings or secrets, merges that are not
// auto-merges into the integration branch, gh api writes to merge/contents/dispatch/refs endpoints and any GraphQL
// mutation, and any gh comment that could forge an attest (an owner comment `wp:attest approve ...` is what CI reads).
// Anything else exits 0 and prints nothing.
// It matches command text (after stripping VAR=val prefixes and env/command/time/nice/sudo wrappers, and splitting on
// ; & | newline ( ) $( backticks and redirections), so it is a convenience, not a security boundary: branch protection
// and CI are binding.
import { readFileSync, statSync } from 'node:fs';
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

// Split a shell line into simple commands on ; & && | || newline ( ) $( and backticks, and each into words (quotes
// respected). A redirection (> >> 2> &> >&) ends its word, drops a leading file-descriptor number, and sends its target
// to a command of its own, so the words around it stay one command: `git push > /dev/null origin main` is still a push.
export function splitCommands(line) {
  const commands = [];
  let words = [], word = '', quote = null, has = false, redirect = false;
  const endWord = () => {
    if (has) {
      if (redirect) commands.push([word]); else words.push(word);
      redirect = false;
    }
    word = ''; has = false;
  };
  const endCommand = () => { endWord(); redirect = false; if (words.length) commands.push(words); words = []; };
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
    if (c === '\n' || c === ';' || c === '`') { endCommand(); continue; }
    if (c === '(') { if (word === '$' && has) { word = ''; has = false; } endCommand(); continue; }
    if (c === ')') { endCommand(); continue; }
    if (c === '>' || (c === '&' && line[i + 1] === '>')) {
      if (/^\d+$/.test(word)) { word = ''; has = false; }
      endWord();
      if (c === '&') i++;
      while (line[i + 1] === '>' || line[i + 1] === '|' || line[i + 1] === '&') i++;
      redirect = true;
      continue;
    }
    if (c === '&' || c === '|') { if (line[i + 1] === c) i++; endCommand(); continue; }
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

// Leading VAR=val assignments and the wrappers that run another command (env, command, time, nice, sudo, ...) are
// stripped, so `FOO=1 env -i sudo git push origin main` is judged as the git push it is. The program name loses its
// directory (/usr/bin/git is git).
const WRAPPER_VALUE_FLAGS = {
  env: ['-u', '--unset', '-C', '--chdir'],
  nice: ['-n', '--adjustment'],
  sudo: ['-u', '--user', '-g', '--group', '-C', '-h', '--host', '-p', '--prompt', '-r', '--role', '-t', '--type', '-U', '-D', '--chdir', '-R', '--chroot', '-T'],
  command: [], time: [], nohup: [], exec: [], builtin: [], doas: ['-u', '-C'],
};
const isAssignment = (w) => /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(w);
export function stripWrappers(words) {
  let i = 0;
  for (;;) {
    while (i < words.length && isAssignment(words[i])) i++;
    const wrapper = words[i] && words[i].split('/').pop();
    if (!wrapper || !Object.hasOwn(WRAPPER_VALUE_FLAGS, wrapper)) break;
    i++;
    const valueFlags = WRAPPER_VALUE_FLAGS[wrapper];
    while (i < words.length && (words[i].startsWith('-') || (wrapper === 'env' && isAssignment(words[i])))) {
      i += valueFlags.includes(words[i]) ? 2 : 1;
    }
  }
  const rest = words.slice(i);
  if (rest.length) rest[0] = rest[0].split('/').pop();
  return rest;
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

const readSmall = (path) => { try { return statSync(path).size < 1_000_000 ? readFileSync(path, 'utf8') : ''; } catch { return ''; } };
// The text of files a gh api call sends: --input FILE and -F key=@FILE, so a body hidden in a file is still judged.
function bodyFileTexts(rest) {
  const out = [];
  rest.forEach((w, i) => {
    const input = w === '--input' ? rest[i + 1] : w.startsWith('--input=') ? w.slice(8) : null;
    if (input && input !== '-') out.push(readSmall(input));
    const field = (w === '-F' || w === '--field') ? rest[i + 1] : /^-F./.test(w) ? w.slice(2) : w.startsWith('--field=') ? w.slice(8) : null;
    const at = field && /^[^=]+=@(.+)$/.exec(field);
    if (at) out.push(readSmall(at[1]));
  });
  return out;
}

function checkGh(rest) {
  const [area, action, ...more] = rest;
  const all = rest.join(' ');
  if (area === 'workflow' && action === 'run' && rest.some((w) => /(^|\/)pages\.ya?ml$/.test(w))) return 'dispatching pages.yml deploys the live site';
  if (area === 'release' && ['create', 'edit', 'delete', 'upload', 'delete-asset'].includes(action)) return 'releases are not changed by agents';
  if (area === 'repo' && ['edit', 'delete', 'rename', 'archive'].includes(action)) return 'repository settings are changed by the owner';
  if (area === 'secret' || area === 'variable') { if (['set', 'delete', 'remove'].includes(action)) return 'secrets and variables are set by the owner'; }
  if (area === 'api') {
    const explicit = (() => { const i = rest.findIndex((w) => w === '-X' || w === '--method'); return i >= 0 ? (rest[i + 1] ?? '').toUpperCase() : (rest.find((w) => /^(-X|--method=)/.test(w)) ?? '').replace(/^(-X|--method=)/, '').toUpperCase(); })();
    const hasBody = rest.some((w) => ['-f', '-F', '--field', '--raw-field', '--input'].includes(w) || /^(-f|-F)./.test(w) || /^--(field|raw-field|input)=/.test(w));
    const method = explicit || (hasBody ? 'POST' : 'GET');
    const writes = !['GET', 'HEAD'].includes(method);
    const texts = [all, ...bodyFileTexts(rest)];
    if (rest.includes('graphql') && texts.some((t) => /\bmutation\b/.test(t))) return 'GraphQL mutations through gh api are not authorized for agents';
    if (writes && mentionsPreview(all)) return `writes to the preview repository ${config.previewRepo} are made by CI only`;
    if (['PATCH', 'PUT', 'DELETE'].includes(method) && /(^|\s)\/?repos\//.test(all)) return 'changing repository settings through gh api is the owner\'s step';
    if (writes && /\/(git\/refs|releases|branches\/[^ ]+\/protection)/.test(all)) return 'tags, releases and branch protection are not changed by agents';
    if (writes && /\/(merges|pulls\/[^/\s]+\/merge|dispatches)(\s|\?|$)|\/contents(\/|\s|\?|$)/.test(all)) return 'merging, committing contents or dispatching workflows through gh api bypasses the pull request path';
    if (writes && rest.some((w, i) => w === '--input=-' || (w === '--input' && rest[i + 1] === '-'))) return 'a gh api write whose body comes from stdin cannot be inspected; use --input FILE';
    if (writes && texts.some((t) => t.includes('wp:attest'))) return 'an attest is recorded by the owner only; gh writes naming it are refused';
  }
  if ((area === 'pr' || area === 'issue') && action === 'comment' && more.some((w) => w === '--body-file' || w === '-F' || /^(--body-file=|-F.)/.test(w))) return 'gh pr/issue comment with --body-file cannot be inspected for a forged attest; pass --body text';
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

// Programs that may name remake/tools/wp-attest.mjs without running it: reading, diffing, and git (add, commit, ...);
// node/npm only with --test or --check.
const READ_PROGRAMS = ['git', 'cat', 'head', 'tail', 'less', 'more', 'grep', 'rg', 'wc', 'ls', 'diff', 'stat'];
const SHELLS = ['sh', 'bash', 'zsh', 'dash', 'ksh', 'eval'];
const ATTEST_SCRIPT = /wp-attest/;

export function check(command, depth = 0) {
  if (depth > 4) return 'command nesting is too deep to inspect';
  for (const raw of splitCommands(command)) {
    // wp:attest is the owner's own act, wherever the word sits (sh -c "npm run wp:attest" included).
    if (raw.some((w) => w.includes('wp:attest'))) return 'wp:attest is run by the owner in their own terminal, never by an agent';
    const words = stripWrappers(raw);
    if (!words.length) continue;
    const prog = words[0];
    // The attest script itself may be read, committed and tested, never run.
    if (words.some((w) => ATTEST_SCRIPT.test(w))
      && !READ_PROGRAMS.includes(prog)
      && !(['node', 'npm', 'npx'].includes(prog) && words.some((w) => w === '--test' || w === '--check' || w === 'test'))) {
      return 'wp-attest is run by the owner in their own terminal, never by an agent (reading, git add and node --test on the file are allowed)';
    }
    // Command substitution survives double quotes, and a shell -c / eval string is itself a command line.
    const nested = [
      ...words.filter((w) => w.includes('$(') || w.includes('`')),
      ...(/\s/.test(prog) ? [prog] : []),
      ...(SHELLS.includes(prog) ? words.slice(1).filter((w) => !w.startsWith('-')) : []),
    ];
    for (const n of nested) { const r = check(n, depth + 1); if (r) return r; }
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
