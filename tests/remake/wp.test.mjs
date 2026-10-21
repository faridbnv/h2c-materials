// Tests for the work-package scaffolding (WP-02): index and dependency check, wp:check tri-state, wp:attest refusal,
// the worktree setup script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDeps, dispatchable } from '../../remake/tools/wp-lib.mjs';
import { parseTable, buildIndex } from '../../remake/tools/gen-wp-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tool = (name) => join(root, 'remake', 'tools', name);
const index = JSON.parse(readFileSync(join(root, 'remake/plan/wp-index.json'), 'utf8'));

// Section 3 of the pack's 08, IDs only; the table itself lives outside this repository.
const SECTION_3_IDS = ['WP-S0', ...Array.from({ length: 39 }, (_, i) => `WP-${String(i + 1).padStart(2, '0')}`)];

test('every section 3 ID is in the index, once, with a status file', () => {
  assert.deepEqual(index.packages.map((p) => p.id), SECTION_3_IDS);
  for (const id of SECTION_3_IDS) assert.ok(existsSync(join(root, 'remake/status', `${id}.json`)), `status file for ${id}`);
});

test('the shipped index passes the dependency check; WP-04 and WP-12 are dropped and nothing depends on them', () => {
  assert.deepEqual(checkDeps(index.packages), []);
  const dropped = index.packages.filter((p) => p.dropped).map((p) => p.id);
  assert.deepEqual(dropped, ['WP-04', 'WP-12']);
  assert.match(index.packages.find((p) => p.id === 'WP-04').droppedReason, /main frozen, Q2-04 B/);
  assert.match(index.packages.find((p) => p.id === 'WP-12').droppedReason, /Q2-06 C/);
  for (const p of index.packages) for (const d of p.dependsOn) assert.ok(!dropped.includes(d), `${p.id} depends on dropped ${d}`);
  assert.ok(index.packages.find((p) => p.id === 'WP-13').dependsOn.includes('WP-11'));
});

test('dependency check fails on a seeded cycle, an unknown dependency and a dropped dependency', () => {
  const pkg = (id, dependsOn, extra = {}) => ({ id, dependsOn, ...extra });
  assert.match(checkDeps([pkg('A', ['B']), pkg('B', ['C']), pkg('C', ['A'])]).join('\n'), /cycle: .*A.*B.*C.*A/);
  assert.match(checkDeps([pkg('A', ['Z'])]).join('\n'), /A depends on unknown Z/);
  assert.match(checkDeps([pkg('A', ['B']), pkg('B', [], { dropped: true })]).join('\n'), /A depends on dropped B/);
  assert.deepEqual(checkDeps([pkg('A', ['B']), pkg('B', [])]), []);
});

test('wp:status --deps exits non-zero on a seeded cycle in the index', () => {
  const dir = scratch({ packages: [{ id: 'WP-A', dependsOn: ['WP-B'] }, { id: 'WP-B', dependsOn: ['WP-A'] }] });
  const r = spawnSync(process.execPath, [tool('wp-status.mjs'), '--deps'], { env: { ...process.env, H2C_WP_ROOT: dir }, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /cycle/);
});

test('the generator parses a section 3 table, expands ranges and substitutes dropped dependencies', () => {
  const md = `## 3. Work-package index\n| ID | Title | Milestone | Depends on | Can start | Size | Exit evidence |\n|---|---|---|---|---|---|---|\n` +
    `| WP-11 | Eleven | M1 | none | M1 | S (1) | x |\n| WP-12 | Twelve | M1 | WP-11 | M1 | S (1) | x |\n` +
    `| WP-24 | Range | M3 | WP-11 to WP-12; Q2-20 | M3 | S (1) | x |\n| WP-13 | Edit | M1 | WP-12 (Q2-13); Q2-07 | M1 | S (1) | x |\n\n**Standing loops**`;
  const pk = Object.fromEntries(buildIndex(parseTable(md)).packages.map((p) => [p.id, p]));
  assert.deepEqual(pk['WP-24'].dependsOn, ['WP-11']);   // WP-12 dropped, replaced by WP-11, deduplicated
  assert.deepEqual(pk['WP-24'].gates, ['Q2-20']);
  assert.deepEqual(pk['WP-13'].dependsOn, ['WP-11']);
  assert.deepEqual(pk['WP-13'].gates, ['Q2-07']);      // Q2-13 is moot once WP-12 is dropped
});

test('dispatchable: needs every dependency done; in-review dependencies only allow preparing', () => {
  const idx = { packages: [{ id: 'A', dependsOn: [] }, { id: 'B', dependsOn: ['A'] }, { id: 'C', dependsOn: ['A'] }] };
  assert.deepEqual(dispatchable(idx, { A: { status: 'done' }, B: { status: 'todo' }, C: { status: 'in-progress' } }), { next: ['B'], soon: [] });
  assert.deepEqual(dispatchable(idx, { A: { status: 'in-review' } }), { next: [], soon: ['B', 'C'] });
});

// A scratch root: wp-index.json, a package.json with chosen scripts, one status file per package.
function scratch(indexDoc, scripts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wp-test-'));
  mkdirSync(join(dir, 'remake/plan'), { recursive: true });
  mkdirSync(join(dir, 'remake/status'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts }));
  writeFileSync(join(dir, 'remake/plan/wp-index.json'), JSON.stringify(indexDoc));
  for (const p of indexDoc.packages) writeFileSync(join(dir, 'remake/status', `${p.id}.json`), JSON.stringify({ id: p.id, status: 'in-progress', exitCheck: 'not-run', lastPass: null }));
  return dir;
}
const check = (dir, id) => {
  const r = spawnSync(process.execPath, [tool('wp-check.mjs'), id], { env: { ...process.env, H2C_WP_ROOT: dir }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, status: JSON.parse(readFileSync(join(dir, 'remake/status', `${id}.json`), 'utf8')) };
};
const pkgWith = (commands, extra = {}) => ({ packages: [{ id: 'WP-99', dependsOn: [], exit: { commands, attest: [], manual: [], ...extra } }] });

test('wp:check records not-run, never pass, for a command that does not exist', () => {
  const r = check(scratch(pkgWith(['npm run does-not-exist'])), 'WP-99');
  assert.equal(r.status.exitCheck, 'not-run');
  assert.equal(r.status.lastPass, null);
  assert.notEqual(r.code, 0);
  assert.match(r.status.evidence[0].note, /no npm script/);
});

test('wp:check: an unavailable tool, a missing file and a package with no exit command are all not-run', () => {
  for (const cmds of [['npx tsc --noEmit'], ['node nothing-here.mjs'], []]) {
    const r = check(scratch(pkgWith(cmds)), 'WP-99');
    assert.equal(r.status.exitCheck, 'not-run', JSON.stringify(cmds));
    assert.equal(r.status.lastPass, null);
  }
});

test('wp:check: output that says it skipped is not-run even with exit 0', () => {
  const dir = scratch(pkgWith(['npm run skippy']), { skippy: 'node -e "console.log(\'audit SKIPPED: no cache\')"' });
  const r = check(dir, 'WP-99');
  assert.equal(r.status.exitCheck, 'not-run');
  assert.equal(r.status.lastPass, null);
});

test('wp:check: a zero skip count in a node:test summary passes, a non-zero one is not-run', () => {
  const dir = scratch(pkgWith(['npm run zero']), { zero: 'node -e "console.log(\'ℹ skipped 0\')"', two: 'node -e "console.log(\'ℹ skipped 2\')"' });
  assert.equal(check(dir, 'WP-99').status.exitCheck, 'pass');
  writeFileSync(join(dir, 'remake/plan/wp-index.json'), JSON.stringify(pkgWith(['npm run two'])));
  assert.equal(check(dir, 'WP-99').status.exitCheck, 'not-run');
});

test('wp:check: pass needs every command to pass; a failure is fail and keeps the old lastPass', () => {
  const dir = scratch(pkgWith(['npm run ok']), { ok: 'node -e "0"', bad: 'node -e "process.exit(1)"' });
  const pass = check(dir, 'WP-99');
  assert.equal(pass.status.exitCheck, 'pass');
  assert.equal(pass.code, 0);
  assert.ok(pass.status.lastPass);
  writeFileSync(join(dir, 'remake/plan/wp-index.json'), JSON.stringify(pkgWith(['npm run ok', 'npm run bad'])));
  const fail = check(dir, 'WP-99');
  assert.equal(fail.status.exitCheck, 'fail');
  assert.equal(fail.code, 1);
  assert.equal(fail.status.lastPass, pass.status.lastPass);
});

test('wp:check: a manual line or an attest key without a row keeps a passing command at not-run', () => {
  const dir = scratch(pkgWith(['npm run ok'], { attest: ['safari-check'] }), { ok: 'node -e "0"' });
  assert.equal(check(dir, 'WP-99').status.exitCheck, 'not-run');
  writeFileSync(join(dir, 'remake/attest.csv'), 'date,key,detail,source\n2026-10-21,safari-check,,wp:attest\n');
  assert.equal(check(dir, 'WP-99').status.exitCheck, 'pass');
});

test('echo y | wp:attest exits non-zero and records nothing', () => {
  const dir = scratch(pkgWith([]));
  const r = spawnSync(process.execPath, [tool('wp-attest.mjs'), 'test'], { input: 'y\n', env: { ...process.env, H2C_WP_ROOT: dir }, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /interactive terminals/);
  assert.ok(!existsSync(join(dir, 'remake/attest.csv')));
});

test('wp:attest also refuses when only stdin is piped or stdout is redirected, for approve too', () => {
  const r = spawnSync(process.execPath, [tool('wp-attest.mjs'), 'approve', '6'], { input: 'yes\n', encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /refused/);
});

// worktree-setup against a throwaway repository with a bare origin that has main and remake/v3.
function fixtureRepo() {
  const base = mkdtempSync(join(tmpdir(), 'wt-test-'));
  const g = (cwd, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd, encoding: 'utf8' }).trim();
  const origin = join(base, 'origin.git'), repo = join(base, 'repo');
  g(base, 'init', '-q', '--bare', '-b', 'main', origin);
  g(base, 'clone', '-q', origin, repo);
  writeFileSync(join(repo, 'a.txt'), 'main\n');
  g(repo, 'add', '.'); g(repo, 'commit', '-q', '-m', 'main'); g(repo, 'push', '-q', 'origin', 'HEAD:main');
  g(repo, 'checkout', '-q', '-b', 'remake/v3');
  mkdirSync(join(repo, '.claude', 'hooks'), { recursive: true }); mkdirSync(join(repo, '.claude', 'agents'));
  writeFileSync(join(repo, '.claude/hooks/guard.mjs'), 'x'); writeFileSync(join(repo, '.claude/agents/a.md'), 'x'); writeFileSync(join(repo, '.claude/settings.json'), '{}');
  g(repo, 'add', '-f', '.'); g(repo, 'commit', '-q', '-m', 'remake'); g(repo, 'push', '-q', 'origin', 'remake/v3');
  g(repo, 'checkout', '-q', 'main');
  writeFileSync(join(repo, 'CLAUDE.local.md'), 'local'); mkdirSync(join(repo, '.claude'), { recursive: true });
  writeFileSync(join(repo, '.claude/settings.local.json'), '{}');
  return { repo, g };
}
const setupScript = tool('worktree-setup.mjs');

test('worktree-setup: wp-NN-slug branch from origin/remake/v3, copies the local files', () => {
  const { repo, g } = fixtureRepo();
  const r = spawnSync(process.execPath, [setupScript, 'WP-07', 'contracts'], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const wt = join(repo, '.claude/worktrees/wp-07');
  assert.equal(g(wt, 'rev-parse', '--abbrev-ref', 'HEAD'), 'wp-07-contracts');
  assert.equal(g(wt, 'rev-parse', 'HEAD'), g(repo, 'rev-parse', 'origin/remake/v3'));
  assert.equal(readFileSync(join(wt, 'CLAUDE.local.md'), 'utf8'), 'local');
  assert.ok(existsSync(join(wt, '.claude/settings.local.json')));
  assert.notEqual(spawnSync(process.execPath, [setupScript, 'WP-07', 'again'], { cwd: repo }).status, 0, 'refuses an existing worktree');
});

test('worktree-setup --from-main: bases on origin/main, copies the Claude files untracked and excludes them', () => {
  const { repo, g } = fixtureRepo();
  // Run from a remake worktree, which is where the tracked .claude files live.
  assert.equal(spawnSync(process.execPath, [setupScript, 'wp-07', 'contracts'], { cwd: repo }).status, 0);
  const r = spawnSync(process.execPath, [setupScript, 'wp-30', 'old-read', '--from-main'], { cwd: join(repo, '.claude/worktrees/wp-07'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const wt = join(repo, '.claude/worktrees/wp-30');
  assert.equal(g(wt, 'rev-parse', 'HEAD'), g(repo, 'rev-parse', 'origin/main'));
  for (const f of ['.claude/settings.json', '.claude/hooks/guard.mjs', '.claude/agents/a.md', 'CLAUDE.local.md']) assert.ok(existsSync(join(wt, f)), f);
  assert.equal(g(wt, 'status', '--porcelain'), '', 'copied files are invisible to git status');
  assert.match(readFileSync(join(repo, '.git/info/exclude'), 'utf8'), /\/\.claude\/hooks\//);
});
