// Tests for the Claude Code hooks of the remake (pack 14 §B2, §E): every guard rule refused once and allowed once,
// and the review reminder firing once, then quiet after its marker, and quiet on sync/* branches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
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
