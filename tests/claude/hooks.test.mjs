// Tests for the Claude Code hooks of the remake (pack 14 §B2, §E): every guard rule refused once and allowed once,
// and the review reminder firing once, then quiet after its marker, and quiet on sync/* branches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const guard = join(root, '.claude', 'hooks', 'guard-git.mjs');
const reminder = join(root, '.claude', 'hooks', 'review-reminder.mjs');

function runGuard(command, env = {}) {
  const r = spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    env: { ...process.env, H2C_GUARD_CURRENT_BRANCH: 'wp-07-contracts', H2C_GUARD_UPSTREAM: 'wp-07-contracts', H2C_GUARD_PR_BASE: 'remake/v3', ...env },
    encoding: 'utf8',
  });
  return { code: r.status, err: r.stderr };
}
const refused = (cmd, env) => { const r = runGuard(cmd, env); assert.equal(r.code, 2, `expected refusal: ${cmd}`); assert.match(r.err, /guard-git: refused/); };
const allowed = (cmd, env) => { const r = runGuard(cmd, env); assert.equal(r.code, 0, `expected allowed: ${cmd} (${r.err})`); assert.equal(r.err, ''); };

test('rule 1: a push whose destination is main', () => {
  refused('git push origin main');
  refused('git push origin HEAD:main');
  refused('git push origin wp-07:refs/heads/main');
  refused('git push origin :main');
  refused('git push', { H2C_GUARD_UPSTREAM: 'main', H2C_GUARD_CURRENT_BRANCH: 'main' });
  refused('git push origin HEAD', { H2C_GUARD_CURRENT_BRANCH: 'main' });
  refused('git push --all origin');
  allowed('git push -u origin wp-07-contracts');
});

test('rule 2: a direct push to the integration branch', () => {
  refused('git push origin remake/v3');
  refused('git push origin HEAD:remake/v3');
  refused('cd x && git push origin wp-1:refs/heads/remake/v3');
  allowed('git push origin sync/main-2026-10-21');
});

test('rule 3: pushes and gh api writes to the preview repository', () => {
  refused('git push git@github.com:faridbnv/h2c-material-temp-page.git HEAD:main');
  refused('gh api -X PUT repos/faridbnv/h2c-material-temp-page/contents/index.html -f message=x');
  allowed('git ls-remote https://github.com/faridbnv/h2c-material-temp-page');
});

test('rule 4: force pushes', () => {
  refused('git push --force origin wp-07-contracts');
  refused('git push -f origin wp-07-contracts');
  refused('git push origin +wp-07-contracts');
  refused('git push --force-with-lease origin feature-x');
  allowed('git push --force-with-lease origin wp-07-contracts');
});

test('rule 5: wp:attest in an agent shell', () => {
  refused('npm run wp:attest -- approve 12');
  refused('echo y | npm run wp:attest -- test');
  allowed('npm run wp:status');
});

test('rule 6: dispatching the live deploy', () => {
  refused('gh workflow run pages.yml');
  refused('gh workflow run .github/workflows/pages.yml --ref main');
  allowed('gh run list --workflow next-verify.yml');
});

test('rule 7: releases and tags', () => {
  refused('git tag -d h2c-7c6da496722d');
  refused('git push origin refs/tags/h2c-1');
  refused('git push --tags origin');
  refused('gh release create h2c-1');
  refused('gh release upload h2c-1 x.zip');
  allowed('gh release view h2c-7c6da496722d');
  allowed('gh release list');
});

test('rule 8: repository settings and secrets', () => {
  refused('gh api -X PATCH repos/faridbnv/h2c-materials -f allow_auto_merge=true');
  refused('gh api --method PUT repos/faridbnv/h2c-materials/branches/remake/v3/protection --input p.json');
  refused('gh repo edit faridbnv/h2c-materials --enable-auto-merge');
  refused('gh secret set PREVIEW_DEPLOY_KEY');
  allowed('gh api repos/faridbnv/h2c-materials/pulls');
});

test('rule 9: merges', () => {
  refused('gh pr merge 42 --squash');
  refused('gh pr merge 42 --auto --squash', { H2C_GUARD_PR_BASE: 'main' });
  refused('gh pr merge 42 --auto --squash', { H2C_GUARD_PR_BASE: '' });
  refused('gh pr create --base main --title x --body y');
  allowed('gh pr merge 42 --auto --squash');
  allowed('gh pr create --base remake/v3 --title x --body y');
});

test('rule 10: leading assignments and wrappers do not hide a command', () => {
  refused('FOO=1 git push origin main');
  refused('GIT_SSH_COMMAND=ssh BAR=2 git push origin remake/v3');
  refused('env git push origin main');
  refused('env -i PATH=/usr/bin git push origin main');
  refused('command git push --force origin wp-07-contracts');
  refused('time git push origin HEAD:main');
  refused('nice -n 5 git push origin main');
  refused('sudo -u root git push origin main');
  refused('FOO=1 env -u HOME sudo -E git push origin main');
  refused('/usr/bin/git push origin main');
  refused('env -S "git push origin main"');
  refused('FOO=1 gh pr merge 42 --squash');
  allowed('FOO=1 git push -u origin wp-07-contracts');
  allowed('env -i PATH=/usr/bin git push origin wp-07-contracts');
  allowed('nice -n 5 npm run types:check');
});

test('rule 11: subshells, command substitution, backticks and redirections split commands', () => {
  refused('(git push origin main)');
  refused('echo $(git push origin main)');
  refused('echo "$(git push origin main)"');
  refused('echo `git push origin main`');
  refused('echo "`git push origin main`"');
  refused('git push origin main>/dev/null');
  refused('git push origin main 2>&1');
  refused('git push > /dev/null origin main');
  refused('git push 2>/dev/null origin remake/v3');
  refused('bash -c "git push origin main"');
  refused("sh -lc 'git push origin HEAD:main'");
  refused('eval "git push origin main"');
  allowed('(cd packages && git push -u origin wp-07-contracts)');
  allowed('echo $(git rev-parse HEAD)');
  allowed('git push -u origin wp-07-contracts > push.log 2>&1');
  allowed('bash -c "npm run types:check"');
});

test('rule 12: gh api writes to merge, contents, dispatch and refs endpoints, and GraphQL mutations', () => {
  refused('gh api -X PUT repos/faridbnv/h2c-materials/pulls/12/merge');
  refused('gh api repos/faridbnv/h2c-materials/pulls/12/merge -X PUT -f merge_method=merge');
  refused('gh api -X POST repos/faridbnv/h2c-materials/merges -f base=remake/v3 -f head=x');
  refused('gh api repos/faridbnv/h2c-materials/merges -f base=remake/v3 -f head=x');
  refused('gh api -X PUT repos/faridbnv/h2c-materials/contents/README.md -f message=x -f content=eA==');
  refused('gh api repos/faridbnv/h2c-materials/contents/x.txt -F content=@x');
  refused('gh api -X POST repos/faridbnv/h2c-materials/dispatches -f event_type=go');
  refused('gh api -X POST repos/faridbnv/h2c-materials/actions/workflows/pages.yml/dispatches -f ref=main');
  refused('gh api -X POST repos/faridbnv/h2c-materials/git/refs -f ref=refs/heads/x -f sha=abc');
  refused('gh api -X DELETE repos/faridbnv/h2c-materials/git/refs/heads/x');
  refused("gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\"x\"}) { clientMutationId } }'");
  refused("gh api graphql -f query='mutation{addComment(input:{}){clientMutationId}}'");
  allowed('gh api repos/faridbnv/h2c-materials/contents/README.md');
  allowed('gh api repos/faridbnv/h2c-materials/pulls/12/files');
  allowed("gh api graphql -f query='query { viewer { login } }'");
  allowed('gh api -X GET search/issues -f q=repo:faridbnv/h2c-materials');
});

function tmpFile(name, text) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-guard-'));
  const f = join(dir, name);
  writeFileSync(f, text);
  return f;
}

test('rule 13: gh writes that could forge an attest, and body files', () => {
  const forged = tmpFile('body.txt', 'wp:attest approve 12 ' + 'a'.repeat(40));
  const innocent = tmpFile('body.txt', 'tests pass');
  refused('gh pr comment 12 --body "wp:attest approve 12 ' + 'a'.repeat(40) + '"');
  refused('gh issue comment 12 -b "wp:attest approve 12"');
  refused(`gh api repos/faridbnv/h2c-materials/issues/12/comments -F body=@${forged}`);
  refused(`gh api repos/faridbnv/h2c-materials/issues/12/comments --input ${forged}`);
  refused('gh api repos/faridbnv/h2c-materials/issues/12/comments -f body="wp:attest approve 12"');
  refused('cat body.json | gh api repos/faridbnv/h2c-materials/issues/12/comments --input -');
  refused(`gh pr comment 12 --body-file ${innocent}`);
  refused(`gh issue comment 12 -F ${innocent}`);
  allowed('gh pr comment 12 --body "tests pass"');
  allowed(`gh api repos/faridbnv/h2c-materials/issues/12/comments -F body=@${innocent}`);
  allowed('gh api repos/faridbnv/h2c-materials/issues/12/comments');
  allowed(`gh pr create --base remake/v3 --title x --body-file ${forged}`);
});

test('rule 14: wp:attest anywhere in a word; the attest script may be read, committed and tested but not run', () => {
  refused('sh -c "npm run wp:attest -- approve 12"');
  refused("bash -lc 'npm run wp:attest'");
  refused('npx wp:attest');
  refused('echo hi; FOO=1 npm run wp:attest -- test');
  refused('node remake/tools/wp-attest.mjs approve 12');
  refused('FOO=1 node ./remake/tools/wp-attest.mjs');
  refused('cd remake/tools && node wp-attest.mjs');
  refused('node -e "import(\'./remake/tools/wp-attest.mjs\')"');
  refused('sh -c "node remake/tools/wp-attest.mjs"');
  allowed('git add remake/tools/wp-attest.mjs');
  allowed('git commit -m "tidy remake/tools/wp-attest.mjs"');
  allowed('cat remake/tools/wp-attest.mjs');
  allowed('grep -n appendAttest remake/tools/wp-attest.mjs');
  allowed('node --test tests/remake/wp-attest.test.mjs');
  allowed('node --check remake/tools/wp-attest.mjs');
});

test('settings deny agents editing remake/attest.csv', () => {
  const settings = JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'));
  assert.ok(settings.permissions.deny.includes('Edit(remake/attest.csv)'));
  assert.ok(settings.permissions.deny.includes('Write(remake/attest.csv)'));
});

test('non-Bash tools and unrelated commands pass silently', () => {
  allowed('npm test && node --test tests/claude/hooks.test.mjs');
  const r = spawnSync(process.execPath, [guard], { input: JSON.stringify({ tool_name: 'Edit', tool_input: {} }), encoding: 'utf8' });
  assert.equal(r.status, 0);
});

function scratchRepo(branch) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-reminder-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q', '-b', 'base'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  writeFileSync(join(dir, 'README.md'), 'x\n'); g('add', '.'); g('commit', '-qm', 'base');
  g('checkout', '-q', '-b', branch);
  mkdirSync(join(dir, 'packages', 'domain'), { recursive: true });
  writeFileSync(join(dir, 'packages', 'domain', 'a.ts'), 'export const a = 1;\n'); g('add', '.'); g('commit', '-qm', 'code');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
  return { dir, head };
}
const runReminder = (cwd, input = {}) => spawnSync(process.execPath, [reminder], { cwd, input: JSON.stringify(input), env: { ...process.env, H2C_REVIEW_BASE: 'base' }, encoding: 'utf8' });

test('review reminder fires once, then is quiet after the marker', () => {
  const { dir, head } = scratchRepo('wp-02-scaffold');
  const first = runReminder(dir);
  assert.equal(first.status, 2);
  assert.match(first.stderr, /code-simplifier/);
  assert.equal(runReminder(dir, { stop_hook_active: true }).status, 0, 'a continuation of the hook never loops');
  mkdirSync(join(dir, '.claude', 'state'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'state', `reviewed-${head}`), '');
  const after = runReminder(dir);
  assert.equal(after.status, 0);
  assert.equal(after.stderr, '');
});

test('review reminder is quiet on sync/* branches', () => {
  const { dir } = scratchRepo('sync/main-2026-10-21');
  const r = runReminder(dir);
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
});
