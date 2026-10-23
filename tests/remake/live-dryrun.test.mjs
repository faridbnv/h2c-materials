// The live dry-run kit (docs/next/live-dryrun.md): remake/tools/live-dryrun.sh makes a throwaway mirror of the live path, and
// remake/tools/live-dryrun-check.mjs judges what the mirror's runs proved. Nothing here reaches GitHub: the script runs against a stand-in `gh`
// and local bare repositories, the check against fake API answers. Also here: the places where the live path names the real repository or
// address, held as they are today (the dry run overrides them with repository variables, never by editing the workflow).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES, assertMirror, collect, ghReader, judgeDryrun, reportName } from '../../remake/tools/live-dryrun-check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(root, 'remake/tools/live-dryrun.sh');
const FAKE_GH = join(root, 'tests/remake/fixtures/live-dryrun/fake-gh.sh');
const tmp = (name) => mkdtempSync(join(tmpdir(), `${name}-`));
const wf = (name) => readFileSync(join(root, '.github/workflows', name), 'utf8');
const code = (name) => wf(name).split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

// ---- the places where the live path names the real repository or address ---------------------------------------------------------
test('the live path names the real address only as the default of LIVE_BASE_URL, which a repository variable overrides', () => {
  const main = code('next-main.yml');
  const live = (id) => main.slice(main.indexOf(`\n  ${id}:\n`)).split(/\n  [a-z-]+:\n/)[1];
  const liveJobs = ['deploy-live', 'smoke-live', 'release', 'restore-live', 'smoke-restore-live'];
  for (const id of liveJobs) {
    const body = live(id);
    assert.ok(body, id);
    const named = body.split('\n').filter((l) => /faridbnv|pdynamics\.ca|h2c-materials|h2c-material-temp-page/.test(l));
    for (const l of named) assert.match(l, /vars\.LIVE_BASE_URL \|\| 'https:\/\/pdynamics\.ca\/h2c-materials\/'/, `${id}: ${l.trim()}`);
  }
  assert.equal([...main.matchAll(/vars\.LIVE_BASE_URL \|\| 'https:\/\/pdynamics\.ca\/h2c-materials\/'/g)].length, 2, 'the live smoke and the legacy smoke on the live address');
  // The repository itself is always read from the run, so a mirror releases and restores from its own releases.
  assert.match(main, /--repo "\$GITHUB_REPOSITORY"/);
  assert.equal(main.match(/gh release (list|download|create|view)[^\n]*faridbnv/g), null);
});

test('the preview parts of the workflow keep their real defaults, and a mirror redirects them with PREVIEW_REPO and PREVIEW_BASE_URL', () => {
  const main = code('next-main.yml');
  assert.equal([...main.matchAll(/vars\.PREVIEW_REPO \|\| 'faridbnv\/h2c-material-temp-page'/g)].length, 4);
  assert.equal([...main.matchAll(/vars\.PREVIEW_BASE_URL \|\| 'https:\/\/pdynamics\.ca\/h2c-material-temp-page\/'/g)].length, 2);
  assert.match(main, /MAIN_COMMIT: 5eabafad4e19e3cc2f4e71d55848474ff22bd444/);
  const envs = [...main.matchAll(/environment:\n\s+name: ([\w-]+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(envs, ['github-pages', 'github-pages', 'preview', 'preview'], 'the live jobs use the environment github-pages, which Pages creates in any repository');
  const sh = readFileSync(SCRIPT, 'utf8');
  for (const v of ['LIVE_BASE_URL', 'PREVIEW_REPO', 'PREVIEW_BASE_URL', 'DEPLOY_HOLD']) assert.match(sh, new RegExp(`variable set ${v}`));
});

test('nothing in the cutover plan, the restore, the artifact or wp:attest is tied to a repository name', () => {
  for (const f of ['cutover.mjs', 'restore.mjs', 'artifact.mjs', 'wp-attest.mjs', 'legacy-smoke.mjs', 'preview-smoke.mjs']) {
    const text = readFileSync(join(root, 'remake/tools', f), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    assert.doesNotMatch(text, /faridbnv|pdynamics\.ca\/h2c-materials/, f);
  }
  const attest = readFileSync(join(root, 'remake/tools/wp-attest.mjs'), 'utf8');
  assert.match(attest, /process\.stdin\.isTTY \|\| !process\.stdout\.isTTY/, 'the only place check of wp:attest is the terminal, which the dry run keeps');
});

test('the saved-site record the dry run copies is the one the restore request will name', () => {
  const legacy = JSON.parse(readFileSync(join(root, 'remake/legacy/legacy-final.json'), 'utf8'));
  assert.equal(legacy.release, 'h2c-legacy-final');
  assert.match(legacy.asset, /^legacy-site-[0-9a-f]{12}\.zip$/);
  assert.match(legacy.digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(legacy.mainCommit, /^[0-9a-f]{40}$/);
});

// ---- the script's guards -----------------------------------------------------------------------------------------------------------
const bash = (script, env = {}, args = []) => spawnSync('bash', ['-c', script, SCRIPT, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env, H2C_DRYRUN_LIB: '1' } });

function fakeWorld() {
  const dir = tmp('dryrun-world');
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  copyFileSync(FAKE_GH, join(bin, 'gh'));
  chmodSync(join(bin, 'gh'), 0o755);
  return { dir, bin, env: { PATH: `${bin}:${process.env.PATH}`, HOME: dir, GH_LOG: join(dir, 'gh.log'), FAKE: join(dir, 'fake'), MIRRORS: join(dir, 'mirrors'), H2C_DRYRUN_WORK: join(dir, 'work') } };
}
const ghCalls = (w) => (existsSync(w.env.GH_LOG) ? readFileSync(w.env.GH_LOG, 'utf8').split('\n').filter(Boolean) : []);
const run = (w, args, extra = {}) => spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8', env: { ...w.env, ...extra } });

test('the script refuses the real repositories, in any case and by bare name, before it calls gh to write anything', () => {
  const w = fakeWorld();
  const sha = 'a'.repeat(40);
  for (const repo of ['faridbnv/h2c-materials', 'FaridBNV/H2C-Materials', 'faridbnv/h2c-material-temp-page', 'h2c-materials', 'h2c-material-temp-page']) {
    for (const args of [[repo, sha], [repo, '--restore'], [repo, '--revert'], [repo, '--cleanup'], [repo, sha, '--resume']]) {
      const r = run(w, args);
      assert.notEqual(r.status, 0, args.join(' '));
      assert.match(r.stderr, /real repository|dry-run|dryrun/, `${args.join(' ')}: ${r.stderr}`);
    }
  }
  // only reads of the account name (the bare name needs it) reached gh; nothing wrote
  assert.deepEqual(ghCalls(w).filter((c) => !/^api user/.test(c)), []);
});

test('the dry-run repository must say so in its name, and phase 1 needs a full 40-character candidate', () => {
  const w = fakeWorld();
  assert.match(run(w, ['tester/h2c-staging', 'a'.repeat(40)]).stderr, /must contain 'dryrun' or 'dry-run'/);
  assert.match(run(w, ['tester/h2c-dryrun']).stderr, /needs the candidate SHA/);
  assert.match(run(w, ['tester/h2c-dryrun', 'abcdef01']).stderr, /full 40-character/);
  assert.match(run(w, ['tester/h2c-dryrun', '--restore', '--revert']).stderr, /one phase at a time/);
  assert.equal(ghCalls(w).length, 0);
});

test('--cleanup prints the delete command and runs nothing', () => {
  const w = fakeWorld();
  const r = run(w, ['tester/h2c-material-dryrun', '--cleanup']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /gh repo delete tester\/h2c-material-dryrun/);
  assert.equal(ghCalls(w).length, 0);
});

test('gh_write and git_push write only to the dry-run repository: a protected name anywhere in a command, or none of the mirror, is refused', () => {
  const w = fakeWorld();
  const h = (body) => bash(`source "$0"; REPO=tester/h2c-dryrun; ${body}`, w.env);
  const writes = [
    'gh_write api -X PUT repos/faridbnv/h2c-materials/pages -f build_type=workflow',
    'gh_write variable set DEPLOY_HOLD --body legacy-final --repo faridbnv/h2c-materials',
    'gh_write variable set X --body y --repo tester/h2c-dryrun --repo faridbnv/h2c-material-temp-page',
    'gh_write release create h2c-legacy-final --repo FARIDBNV/H2C-MATERIALS',
    'gh_write workflow run next-main.yml --ref main --repo tester/other-dryrun',
    'gh_write repo delete tester/h2c-dryrun --repo faridbnv/h2c-materials.git',
  ];
  for (const cmd of writes) {
    const r = h(cmd);
    assert.notEqual(r.status, 0, cmd);
    assert.match(r.stderr, /refusing/, `${cmd}: ${r.stderr}`);
  }
  assert.equal(ghCalls(w).length, 0, 'a refused command never reached gh');
  // a command that names the mirror, and only the mirror (whose name starts with a protected name), passes
  const ok = bash('source "$0"; REPO=faridbnv/h2c-materials-dryrun; gh_write variable set LIVE_BASE_URL --body u --repo faridbnv/h2c-materials-dryrun', w.env);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ghCalls(w).join('\n'), /variable set LIVE_BASE_URL --body u --repo faridbnv\/h2c-materials-dryrun/);
  // git_push: the remote must be the mirror
  const clone = join(w.dir, 'clone');
  spawnSync('git', ['init', '-q', clone]);
  spawnSync('git', ['-C', clone, 'remote', 'add', 'mirror', 'https://github.com/faridbnv/h2c-materials.git']);
  const push = bash(`source "$0"; REPO=tester/h2c-dryrun; CLONE="${clone}"; git_push HEAD:refs/heads/main`, w.env);
  assert.notEqual(push.status, 0);
  assert.match(push.stderr, /'mirror' remote is https:\/\/github\.com\/faridbnv\/h2c-materials\.git/);
  const noRemote = bash(`source "$0"; REPO=tester/h2c-dryrun; CLONE="${w.dir}/none"; git_push HEAD:refs/heads/main`, w.env);
  assert.match(noRemote.stderr, /no 'mirror' remote/);
});

// ---- the whole of phases 1 to 3 against local repositories ---------------------------------------------------------------------------
const GIT_ENV = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.test', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.test', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
const git = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: { ...process.env, ...GIT_ENV } }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const put = (dir, rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text); };
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

/** A source repository shaped like the real one: main (the frozen old tool) moved after remake/v3 branched, and both added next-gate.yml. */
function makeSource(w) {
  const src = join(w.dir, 'source');
  mkdirSync(src);
  git(src, 'init', '-q', '-b', 'main');
  put(src, 'README.md', 'old tool\n');
  git(src, 'add', '-A'); git(src, 'commit', '-q', '-m', 'A');
  git(src, 'checkout', '-q', '-b', 'remake/v3');
  git(src, 'checkout', '-q', 'main');
  put(src, '.github/workflows/next-gate.yml', 'gate on main\n');
  put(src, '.github/workflows/pages.yml', 'old pages\n');
  git(src, 'add', '-A'); git(src, 'commit', '-q', '-m', 'B: the old tool, with the gate');
  const frozen = git(src, 'rev-parse', 'HEAD');
  git(src, 'checkout', '-q', 'remake/v3');
  put(src, '.github/workflows/next-gate.yml', 'gate on the remake\n');
  put(src, '.github/workflows/next-main.yml', 'the new workflow\n');
  put(src, 'remake/attest.csv', 'date,key,detail,source\n');
  put(src, 'remake/control/restore.json', '{"schema":1,"request":null}\n');
  const assets = join(w.dir, 'assets');
  put(assets, 'legacy-site-aaaaaaaaaaaa.zip', 'the saved site');
  put(assets, 'legacy-manifest.json', '{"files":[]}');
  put(assets, 'legacy-diff.md', 'no difference');
  const legacy = { schema: 1, asset: 'legacy-site-aaaaaaaaaaaa.zip', digest: `sha256:${sha256('the saved site')}`, manifestDigest: `sha256:${sha256('{"files":[]}')}`, mainCommit: frozen, oldReleaseId: 'aaaaaaaaaaaa', fileCount: 3, release: 'h2c-legacy-final' };
  put(src, 'remake/legacy/legacy-final.json', `${JSON.stringify(legacy, null, 2)}\n`);
  git(src, 'add', '-A'); git(src, 'commit', '-q', '-m', 'C: the candidate');
  return { src, frozen, candidate: git(src, 'rev-parse', 'HEAD'), assets, legacy };
}

function worldEnv(w, s) {
  return { ...w.env, ...GIT_ENV, H2C_DRYRUN_SOURCE_URL: `file://${s.src}`, H2C_DRYRUN_MIRROR_BASE: `file://${w.env.MIRRORS}`, FIXTURE_ASSETS: s.assets, H2C_DRYRUN_POLL_S: '1' };
}

/** Runs a phase; when the script pauses for the owner's wp:attest, plays the owner (writes the row, presses Enter). */
function runPhase(w, s, args, { attest = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [SCRIPT, ...args], { env: worldEnv(w, s), stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', answered = false;
    child.stdout.on('data', (d) => {
      out += d;
      if (attest && !answered && out.includes('ATTEST-WAIT')) {
        answered = true;
        appendFileSync(join(w.env.H2C_DRYRUN_WORK, 'tester_h2c-dryrun', 'clone', 'remake/attest.csv'), `2026-10-24,cutover-approved,${attest},wp:attest\n`);
        child.stdin.write('\n');
      }
    });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, out, err, answered }));
  });
}

test('phases 1 to 3 against local repositories: the mirror gets the frozen main, the attested candidate and a real merge, then the restore and the revert', async () => {
  const w = fakeWorld();
  const s = makeSource(w);
  const mirror = join(w.env.MIRRORS, 'tester/h2c-dryrun.git');

  const one = await runPhase(w, s, ['tester/h2c-dryrun', s.candidate, '--no-wait'], { attest: s.candidate });
  assert.equal(one.status, 0, `${one.err}\n${one.out}`);
  assert.ok(one.answered, 'the script paused for the owner\'s wp:attest');
  assert.match(one.out, /npm run wp:attest -- cutover-approved [0-9a-f]{40}/);
  assert.match(one.out, /CONFLICT in \.github\/workflows\/next-gate\.yml/);
  assert.match(one.out, /sync main into remake\/v3 BEFORE the candidate is named/);

  // the mirror: main is a merge of the frozen main and the attested candidate; remake/v3 is the attested candidate
  const merge = git(mirror, 'rev-parse', 'refs/heads/main');
  assert.equal(git(mirror, 'rev-list', '--parents', '-n', '1', merge).split(' ').length, 3, 'a merge commit');
  assert.equal(git(mirror, 'rev-parse', `${merge}^1`), s.frozen);
  const attested = git(mirror, 'rev-parse', 'refs/heads/remake/v3');
  assert.equal(git(mirror, 'rev-parse', `${merge}^2`), attested);
  assert.equal(git(mirror, 'rev-parse', `${attested}^`), s.candidate);
  assert.match(git(mirror, 'show', `${attested}:remake/attest.csv`), new RegExp(`cutover-approved,${s.candidate},`));
  assert.equal(git(mirror, 'show', `${merge}:.github/workflows/next-gate.yml`), 'gate on the remake');
  assert.equal(git(mirror, 'show', `${merge}:.github/workflows/pages.yml`), 'old pages', 'the old workflow is still there after the merge');

  // what was asked of GitHub: only the mirror was written to
  const calls = ghCalls(w);
  assert.ok(calls.includes('repo create tester/h2c-dryrun --public --description Throwaway dry run of the Filament Atlas live deploy path. Safe to delete.'));
  assert.ok(calls.includes('api -X POST repos/tester/h2c-dryrun/pages -f build_type=workflow'));
  assert.ok(calls.includes('variable set LIVE_BASE_URL --body https://example.test/tester/h2c-dryrun/ --repo tester/h2c-dryrun'));
  assert.ok(calls.includes('variable set PREVIEW_REPO --body tester/h2c-dryrun --repo tester/h2c-dryrun'));
  assert.ok(calls.some((c) => c.startsWith('release download h2c-legacy-final --repo faridbnv/h2c-materials --dir ')), 'the source release is only read');
  const create = calls.find((c) => c.startsWith('release create h2c-legacy-final'));
  assert.match(create, /legacy-site-aaaaaaaaaaaa\.zip .*legacy-manifest\.json .*legacy-diff\.md --repo tester\/h2c-dryrun --target [0-9a-f]{40} --title Filament Atlas, the old site as it was served/);
  const writes = calls.filter((c) => /^(repo create|variable set|variable delete|release create|workflow run|api -X)/.test(c));
  for (const c of writes) assert.doesNotMatch(c, /faridbnv/, c);
  // the clone cannot push to the real repository
  assert.match(git(join(w.env.H2C_DRYRUN_WORK, 'tester_h2c-dryrun/clone'), 'remote', 'get-url', '--push', 'origin'), /DISABLED/);

  // it will not make a second mirror over the first
  const again = await runPhase(w, s, ['tester/h2c-dryrun', s.candidate, '--no-wait']);
  assert.notEqual(again.status, 0);
  assert.match(again.err, /exists already/);
  const resumed = await runPhase(w, s, ['tester/h2c-dryrun', s.candidate, '--no-wait', '--resume']);
  assert.equal(resumed.status, 0, resumed.err);
  assert.match(resumed.out, /phase 1 is complete already/);

  // phase 2: hold, standing request, dispatch, clear
  const before = ghCalls(w).length;
  const two = await runPhase(w, s, ['tester/h2c-dryrun', '--restore', '--no-wait']);
  assert.equal(two.status, 0, `${two.err}\n${two.out}`);
  const c2 = ghCalls(w).slice(before);
  const order = ['variable set DEPLOY_HOLD --body legacy-final --repo tester/h2c-dryrun', 'workflow run next-main.yml --ref main -f mode=live -f restore=true --repo tester/h2c-dryrun', 'variable delete DEPLOY_HOLD --repo tester/h2c-dryrun'].map((c) => c2.indexOf(c));
  assert.ok(order.every((i) => i >= 0) && order[0] < order[1] && order[1] < order[2], `hold, dispatch, clear in that order: ${c2.join(' | ')}`);
  assert.equal(existsSync(join(w.env.FAKE, 'var_DEPLOY_HOLD')), false, 'the hold is cleared at the end');
  const log = git(mirror, 'log', '--format=%s', '-3', 'refs/heads/main').split('\n');
  assert.deepEqual(log, ['Clear the restore request after the live dry run [skip ci]', 'Standing restore request for the live dry run [skip ci]', 'Merge remake/v3 into main (live dry run of the cutover)']);
  const asked = JSON.parse(git(mirror, 'show', `refs/heads/main~1:remake/control/restore.json`));
  assert.deepEqual(asked.request, { id: 'dryrun-restore-1', hold: 'legacy-final', tag: 'h2c-legacy-final', asset: s.legacy.asset, digest: s.legacy.digest, reason: 'live dry run: put the saved old site back' });
  assert.deepEqual(JSON.parse(git(mirror, 'show', 'refs/heads/main:remake/control/restore.json')), { schema: 1, request: null });

  // phase 3: the revert of the merge puts the frozen main's files back
  const three = await runPhase(w, s, ['tester/h2c-dryrun', '--revert', '--no-wait']);
  assert.equal(three.status, 0, `${three.err}\n${three.out}`);
  assert.match(three.out, /There must be NO "Next main" run/);
  assert.equal(git(mirror, 'rev-parse', 'refs/heads/main^{tree}'), git(mirror, 'rev-parse', `${s.frozen}^{tree}`), 'the tree is the frozen main\'s again');
  assert.match(git(mirror, 'log', '-1', '--format=%B', 'refs/heads/main'), new RegExp(`This reverts commit ${merge}`));
  for (const c of ghCalls(w).filter((x) => /^(repo create|variable|release create|workflow run|api -X)/.test(x))) assert.doesNotMatch(c, /faridbnv/, c);
});

test('phase 2 needs phase 1 first and sets nothing on the mirror without it', async () => {
  const w = fakeWorld();
  const s = makeSource(w);
  const none = await runPhase(w, s, ['tester/h2c-dryrun', '--restore', '--no-wait']);
  assert.notEqual(none.status, 0);
  assert.match(none.err, /run phase 1 first/);
  assert.equal(ghCalls(w).filter((c) => /^variable set/.test(c)).length, 0);
});

test('the waits: success returns, a red run stops the script with the mirror\'s address, and a run that never finishes times out', () => {
  const w = fakeWorld();
  mkdirSync(w.env.FAKE, { recursive: true });
  const wait = (state, extra = {}) => {
    writeFileSync(join(w.env.FAKE, 'run_state'), `${state}\n`);
    return bash('source "$0"; REPO=tester/h2c-dryrun; NOWAIT=0; wait_run pages.yml abc "Publish to Pages"', { ...w.env, H2C_DRYRUN_POLL_S: '0', ...extra });
  };
  const ok = wait('completed success');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Publish to Pages: success/);
  const red = wait('completed failure');
  assert.notEqual(red.status, 0);
  assert.match(red.stderr, /ended 'failure'.*github\.com\/tester\/h2c-dryrun\/actions/);
  const stuck = wait('in_progress ', { H2C_DRYRUN_WAIT_MINUTES: '0' });
  assert.notEqual(stuck.status, 0);
  assert.match(stuck.stderr, /did not finish in 0 minutes \(last state: 'in_progress '\)/);
  const none = wait('', { H2C_DRYRUN_WAIT_MINUTES: '0' });
  assert.match(none.stderr, /last state: 'no run yet'/);
});

test('phase 1 resumed after the approval was committed keeps that commit and does not ask for wp:attest again', async () => {
  const w = fakeWorld();
  const s = makeSource(w);
  const first = await runPhase(w, s, ['tester/h2c-dryrun', s.candidate, '--no-wait'], { attest: s.candidate });
  assert.equal(first.status, 0, first.err);
  // as if the push of the merge had been refused: the merge is not recorded, the approval is
  const state = join(w.env.H2C_DRYRUN_WORK, 'tester_h2c-dryrun/state.env');
  writeFileSync(state, readFileSync(state, 'utf8').split('\n').filter((l) => !l.startsWith('MERGE_SHA=')).join('\n'));
  const mirror = join(w.env.MIRRORS, 'tester/h2c-dryrun.git');
  git(mirror, 'update-ref', '-d', 'refs/heads/main');
  git(mirror, 'update-ref', 'refs/heads/main', s.frozen);
  const again = await runPhase(w, s, ['tester/h2c-dryrun', s.candidate, '--no-wait', '--resume']);
  assert.equal(again.status, 0, `${again.err}\n${again.out}`);
  assert.equal(again.answered, false);
  assert.match(again.out, /the approval is recorded and committed already/);
  assert.equal(git(mirror, 'rev-list', '--parents', '-n', '1', 'refs/heads/main').split(' ').length, 3, 'the merge was made and pushed this time');
});

// ---- the check: what it reads and how it judges ----------------------------------------------------------------------------------------
const FROZEN = '1'.repeat(40);
const MERGE = '2'.repeat(40);
const REVERT = '3'.repeat(40);
const CAND = '4'.repeat(40);
const DIGEST = `sha256:${'a'.repeat(64)}`;
const at = (m) => `2026-10-24T10:${String(m).padStart(2, '0')}:00Z`;
const job = (id, name, conclusion = 'success', minute = 10) => ({ id, name, conclusion, startedAt: at(minute), completedAt: at(minute) });
const nextMainJobs = (base) => [
  job(base + 1, 'plan'), job(base + 2, 'verify / build-old'), job(base + 3, 'verify / next-verify'), job(base + 4, 'build the site artifact'),
  job(base + 5, 'deploy the artifact to GitHub Pages', 'success', 30), job(base + 6, 'smoke on the live address', 'success', 33), job(base + 7, 'keep the release', 'success', 35), job(base + 8, 'next-main result'),
];
const restoreJobs = (base) => [job(base + 1, 'plan'), job(base + 2, 'restore the saved old site on GitHub Pages'), job(base + 3, 'legacy smoke on the live address'), job(base + 4, 'next-main result')];
const mkrun = (id, path, sha, event, jobs, conclusion = 'success', minute = 0) => ({ id, name: path, path: `.github/workflows/${path}`, event, branch: 'main', sha, status: 'completed', conclusion, createdAt: at(minute), startedAt: at(minute), updatedAt: at(minute + 20), jobs });

function passing() {
  return {
    repo: 'tester/h2c-dryrun', collectedAt: at(59), pagesUrl: 'https://example.test/tester/h2c-dryrun/',
    legacy: { oldReleaseId: 'aaaaaaaaaaaa', fileCount: 256 },
    commits: { frozenMain: FROZEN, mergeSha: MERGE, revertSha: REVERT, candidate: CAND },
    runs: [
      mkrun(1, 'verify.yml', FROZEN, 'push', [job(11, 'verify')], 'success', 0),
      mkrun(2, 'pages.yml', FROZEN, 'workflow_run', [job(12, 'build'), job(13, 'deploy')], 'success', 5),
      mkrun(10, 'next-main.yml', MERGE, 'push', nextMainJobs(100), 'success', 20),
      mkrun(20, 'next-main.yml', MERGE, 'workflow_dispatch', restoreJobs(200), 'success', 40),
      mkrun(30, 'verify.yml', REVERT, 'push', [job(31, 'verify')], 'success', 50),
      mkrun(31, 'pages.yml', REVERT, 'workflow_run', [job(32, 'build'), job(33, 'deploy')], 'success', 52),
    ],
    logs: {
      101: '2026 next-main plan: run; mode live, action deploy, deploy true. live deploy of the tested artifact',
      104: `x\n${DIGEST} (812 files, 99000000 bytes)\ny`,
      105: `artifact digest ${DIGEST} matches (812 files)`,
      106: 'ok   index.html\nsmoke: pass',
      107: `artifact digest ${DIGEST} matches (812 files)`,
      201: '2026 next-main plan: run; mode live, action restore, deploy true. restore dryrun-restore-1: the saved site legacy-site-aaaaaaaaaaaa.zip under hold legacy-final',
      203: 'ok   all 256 files of the manifest served with their digests (256 matched)\nlegacy smoke: pass; served 40 s after the start',
    },
    release: { tag: 'h2c-abcdef123456', target: MERGE, assets: ['site-abcdef123456.zip', 'release.json', 'artifact.json', 'decision-diff.md'], artifact: { schema: 1, release: 'abcdef123456', digest: DIGEST } },
    holdNow: '', servedRelease: 'aaaaaaaaaaaa',
  };
}
const by = (report, name) => report.phases.find((p) => p.name === name);
const mutate = (fn) => { const ev = passing(); fn(ev); return judgeDryrun(ev, new Date('2026-10-24T12:00:00Z')); };

test('a complete, healthy dry run passes all four phases, with the digests, the smokes and the revert on record', () => {
  const r = judgeDryrun(passing(), new Date('2026-10-24T12:00:00Z'));
  assert.equal(r.result, 'pass', JSON.stringify(r.phases.map((p) => [p.name, p.problems])));
  assert.deepEqual(r.phases.map((p) => p.name), [...PHASES]);
  assert.deepEqual([r.schema, r.kind, r.repo, r.candidate, r.mergeSha], [1, 'live-dryrun', 'tester/h2c-dryrun', CAND, MERGE]);
  const live = by(r, 'live-deploy');
  assert.deepEqual([live.runId, live.conclusion], [10, 'success']);
  assert.equal(live.jobs.find((j) => j.name === 'deploy the artifact to GitHub Pages').conclusion, 'success');
  assert.deepEqual([live.observed.artifactDigest, live.observed.deployedDigest, live.observed.releasedDigest, live.observed.liveSmoke], [DIGEST, DIGEST, DIGEST, 'pass']);
  assert.equal(live.observed.release, 'h2c-abcdef123456');
  const restore = by(r, 'restore');
  assert.deepEqual([restore.observed.legacySmoke, restore.observed.filesChecked], ['pass', 256]);
  assert.equal(by(r, 'revert').observed.nextMainRuns, 0);
  assert.equal(r.endedAt, '2026-10-24T12:00:00.000Z');
  assert.equal(reportName(new Date('2026-10-24T12:00:00Z')), 'live-dryrun-2026-10-24.json');
});

test('a phase with no run is missing, not passed: the dry run is incomplete until all four are judged', () => {
  const noRestore = mutate((ev) => { ev.runs = ev.runs.filter((r) => r.event !== 'workflow_dispatch'); });
  assert.equal(noRestore.result, 'incomplete');
  assert.equal(by(noRestore, 'restore').result, 'missing');
  assert.match(noRestore.note, /restore: Next main has no run started by hand/);
  assert.equal(by(noRestore, 'live-deploy').result, 'pass');
  const justStarted = mutate((ev) => { ev.runs = ev.runs.filter((r) => r.sha === FROZEN); ev.commits = { frozenMain: null, mergeSha: null, revertSha: null, candidate: null }; ev.release = null; });
  assert.equal(justStarted.result, 'incomplete');
  assert.deepEqual(justStarted.phases.map((p) => p.result), ['missing', 'missing', 'missing', 'missing']);
  const noRevert = mutate((ev) => { ev.commits.revertSha = null; });
  assert.equal(by(noRevert, 'revert').result, 'missing');
  assert.equal(noRevert.result, 'incomplete');
});

test('a failed live deploy names what failed: a job, a digest that differs, a smoke that did not pass, a release without its zip', () => {
  const jobDown = mutate((ev) => { ev.runs[2].jobs.find((j) => j.name === 'keep the release').conclusion = 'failure'; ev.runs[2].conclusion = 'failure'; });
  assert.equal(jobDown.result, 'fail');
  assert.match(by(jobDown, 'live-deploy').problems.join(' | '), /the job "keep the release" ended failure/);
  const skipped = mutate((ev) => { ev.runs[2].jobs = ev.runs[2].jobs.filter((j) => j.name !== 'deploy the artifact to GitHub Pages'); });
  assert.match(by(skipped, 'live-deploy').problems.join(' | '), /the job "deploy the artifact to GitHub Pages" did not run/);
  const digest = mutate((ev) => { ev.logs[105] = `artifact digest sha256:${'b'.repeat(64)} matches (812 files)`; });
  assert.equal(by(digest, 'live-deploy').result, 'fail');
  assert.match(by(digest, 'live-deploy').problems.join(' | '), /the digests differ/);
  const kept = mutate((ev) => { ev.release.artifact.digest = `sha256:${'c'.repeat(64)}`; });
  assert.match(by(kept, 'live-deploy').problems.join(' | '), /the digests differ/);
  const smoke = mutate((ev) => { ev.logs[106] = 'FAIL index.html\nsmoke: fail'; });
  assert.match(by(smoke, 'live-deploy').problems.join(' | '), /live smoke did not report "smoke: pass"/);
  const zip = mutate((ev) => { ev.release.assets = ['release.json', 'artifact.json', 'decision-diff.md']; });
  assert.match(by(zip, 'live-deploy').problems.join(' | '), /lacks site-abcdef123456\.zip/);
  const noRelease = mutate((ev) => { ev.release = null; });
  assert.match(by(noRelease, 'live-deploy').problems.join(' | '), /no release h2c-<id> was kept for the cutover merge/);
  const refused = mutate((ev) => { ev.logs[101] = 'next-main plan: REFUSED; mode live, action none, deploy false. no cutover-approved row'; });
  assert.match(by(refused, 'live-deploy').problems.join(' | '), /did not take the live deploy path/);
  const noVerify = mutate((ev) => { ev.runs[2].jobs = ev.runs[2].jobs.filter((j) => !j.name.endsWith('next-verify')); });
  assert.match(by(noVerify, 'live-deploy').problems.join(' | '), /next-verify did not succeed/);
});

test('the old workflows are still on main after the merge: one that publishes after Next main is a failure, one that published before it a warning', () => {
  const oldPages = (deployMinute) => mkrun(40, 'pages.yml', MERGE, 'workflow_run', [job(41, 'build'), job(42, 'deploy', 'success', deployMinute)], 'success', 21);
  const after = mutate((ev) => { ev.runs.push(oldPages(50)); });
  assert.equal(after.result, 'fail');
  assert.match(by(after, 'live-deploy').problems.join(' | '), /OLD Publish to Pages deployed AFTER Next main/);
  const before = mutate((ev) => { ev.runs.push(oldPages(25)); });
  assert.equal(before.result, 'pass');
  assert.match(by(before, 'live-deploy').observed.warnings.join(' '), /also deployed on the merge commit/);
  assert.deepEqual(by(before, 'live-deploy').observed.oldWorkflowsOnMerge.map((r) => r.workflow), ['pages.yml']);
});

test('a failed restore, an unfinished old-site publish and a revert that Next main answered are each judged', () => {
  const planWrong = mutate((ev) => { ev.logs[201] = 'next-main plan: run; mode live, action deploy, deploy false. DEPLOY_HOLD'; });
  assert.match(by(planWrong, 'restore').problems.join(' | '), /did not take the live restore path/);
  const smokeFail = mutate((ev) => { ev.logs[203] = 'FAIL index.html\nlegacy smoke: fail'; ev.runs[3].conclusion = 'failure'; });
  assert.equal(by(smokeFail, 'restore').result, 'fail');
  const files = mutate((ev) => { ev.legacy.fileCount = 300; });
  assert.match(by(files, 'restore').problems.join(' | '), /matched 256 files, the saved site has 300/);
  const held = mutate((ev) => { ev.holdNow = 'legacy-final'; });
  assert.equal(by(held, 'restore').result, 'pass');
  assert.match(by(held, 'restore').observed.warnings.join(' '), /DEPLOY_HOLD is still set/);
  const oldDown = mutate((ev) => { ev.runs[1].conclusion = 'failure'; });
  assert.match(by(oldDown, 'old-site').problems.join(' | '), /Publish to Pages on the frozen main ended failure/);
  const nextMainOnRevert = mutate((ev) => { ev.runs.push(mkrun(60, 'next-main.yml', REVERT, 'push', [], 'failure', 51)); });
  assert.match(by(nextMainOnRevert, 'revert').problems.join(' | '), /Next main ran on the revert/);
  const notRepublished = mutate((ev) => { ev.runs = ev.runs.filter((r) => r.id !== 31); });
  assert.match(by(notRepublished, 'revert').problems.join(' | '), /Publish to Pages on the revert ended with no run/);
  const wrongSite = mutate((ev) => { ev.servedRelease = 'abcdef123456'; });
  assert.match(by(wrongSite, 'revert').problems.join(' | '), /serves release abcdef123456, not the old release aaaaaaaaaaaa/);
  const unknownServed = mutate((ev) => { ev.servedRelease = null; });
  assert.match(by(unknownServed, 'revert').problems.join(' | '), /gave no manifest\.json, so it is not shown to serve the old site/, 'an address that could not be fetched does not pass the revert');
  const unknownLegacy = mutate((ev) => { ev.legacy = null; });
  assert.match(by(unknownLegacy, 'revert').problems.join(' | '), /release id is unknown/);
});

test('a run that has not finished is missing, not failed: the owner can run the check while GitHub is still working', () => {
  const running = (id) => (ev) => { const r = ev.runs.find((x) => x.id === id); r.status = 'in_progress'; r.conclusion = null; };
  for (const [id, name] of [[10, 'live-deploy'], [20, 'restore'], [31, 'revert'], [2, 'old-site']]) {
    const r = mutate(running(id));
    assert.equal(by(r, name).result, 'missing', name);
    assert.equal(r.result, 'incomplete', name);
  }
});

test('a release kept already for the same content is found by its tag and noted; an unreadable hold is noted, not read as clear', () => {
  const rerun = mutate((ev) => { ev.release.target = '9'.repeat(40); });
  assert.equal(by(rerun, 'live-deploy').result, 'pass');
  assert.match(by(rerun, 'live-deploy').observed.warnings.join(' '), /kept already for the same content/);
  const noHold = mutate((ev) => { ev.holdNow = null; });
  assert.match(by(noHold, 'restore').observed.warnings.join(' '), /could not be read/);
});

/** The API as the mirror would answer it, for collect(). */
function fakeApi(ev) {
  const calls = [];
  const ndjson = (xs) => xs.map((x) => JSON.stringify(x)).join('\n');
  const gh = (args) => {
    calls.push(args);
    const path = args[1];
    if (path.endsWith('/pages')) return `${ev.pagesUrl}\n`;
    if (path.startsWith(`repos/${ev.repo}/commits?`)) {
      return JSON.stringify([
        { sha: REVERT, commit: { message: `Revert "Merge remake/v3 into main"\n\nThis reverts commit ${MERGE}, reversing changes made to ${FROZEN}.` }, parents: [{ sha: MERGE }] },
        { sha: MERGE, commit: { message: 'Merge remake/v3 into main' }, parents: [{ sha: FROZEN }, { sha: 'f'.repeat(40) }] },
        { sha: FROZEN, commit: { message: 'old' }, parents: [{ sha: '0'.repeat(40) }] },
      ]);
    }
    if (path === `repos/${ev.repo}/commits/${'f'.repeat(40)}`) return JSON.stringify({ commit: { message: `Record the cutover approval for ${CAND} (live dry run)` } });
    if (/\/actions\/runs\?/.test(path)) return ndjson([...ev.runs.map(({ jobs, ...r }) => r), { id: 99, name: 'x', path: '.github/workflows/next-verify.yml', event: 'push', branch: 'remake/v3', sha: 'e'.repeat(40), status: 'completed', conclusion: 'success', createdAt: at(1), startedAt: at(1), updatedAt: at(2) }]);
    const jobs = path.match(/\/actions\/runs\/(\d+)\/jobs/);
    if (jobs) return ndjson(ev.runs.find((r) => r.id === Number(jobs[1])).jobs);
    const log = path.match(/\/actions\/jobs\/(\d+)\/logs/);
    if (log) { const text = ev.logs[Number(log[1])]; if (text === undefined) throw new Error('no log'); return text; }
    if (path.endsWith('/releases?per_page=30')) return JSON.stringify([{ tag_name: ev.release.tag, target_commitish: ev.release.target, assets: ev.release.assets.map((name, i) => ({ name, id: 500 + i })) }]);
    if (path.startsWith(`repos/${ev.repo}/releases/assets/`)) return JSON.stringify(ev.release.artifact);
    if (path.endsWith('/variables/DEPLOY_HOLD')) return `${ev.holdNow}\n`;
    throw new Error(`unexpected API call ${path}`);
  };
  return { gh, calls };
}

test('collect reads the mirror with gh api only, finds the merge, the revert and the candidate in main\'s history, and its evidence judges as a pass', async () => {
  const ev = passing();
  // the log ids are job ids: align the fake logs with the jobs collect will ask for
  ev.logs = { 101: ev.logs[101], 104: ev.logs[104], 105: ev.logs[105], 106: ev.logs[106], 107: ev.logs[107], 201: ev.logs[201], 203: ev.logs[203] };
  const { gh, calls } = fakeApi(ev);
  const got = await collect(ev.repo, { gh, legacy: ev.legacy, fetchText: async (url) => { assert.equal(url, 'https://example.test/tester/h2c-dryrun/manifest.json'); return '{"release":"aaaaaaaaaaaa"}'; } });
  assert.deepEqual(got.commits, { mergeSha: MERGE, frozenMain: FROZEN, revertSha: REVERT, candidate: CAND });
  assert.ok(calls.every((a) => a[0] === 'api'), 'every call is gh api');
  assert.equal(got.runs.filter((r) => r.branch === 'main').length, 6);
  assert.ok(!got.runs.some((r) => r.id === 99), 'a run on another branch is not read');
  assert.equal(got.release.tag, 'h2c-abcdef123456');
  assert.equal(got.servedRelease, 'aaaaaaaaaaaa');
  const report = judgeDryrun(got);
  assert.equal(report.result, 'pass', JSON.stringify(report.phases.map((p) => [p.name, p.problems])));
});

test('a failure to read a log is judged as a missing digest, never as a pass', async () => {
  const ev = passing();
  ev.logs = {};
  const { gh } = fakeApi(ev);
  const got = await collect(ev.repo, { gh, legacy: ev.legacy, fetchText: async () => null });
  const report = judgeDryrun(got);
  assert.equal(report.result, 'fail');
  assert.match(by(report, 'live-deploy').problems.join(' | '), /artifactDigest could not be read/);
  assert.equal(got.servedRelease, null);
});

test('the reader is read only: gh api with no method, field or input; the real repositories and non-mirror names are refused', () => {
  const seen = [];
  const read = ghReader((args) => { seen.push(args); return { status: 0, stdout: 'ok' }; });
  assert.equal(read(['api', 'repos/tester/h2c-dryrun/pages', '--jq', '.html_url']), 'ok');
  assert.equal(read(['api', 'repos/x/y/releases/assets/1', '-H', 'Accept: application/octet-stream']), 'ok');
  for (const bad of [['api', '-X', 'DELETE', 'repos/tester/h2c-dryrun'], ['api', '--method', 'POST', 'repos/a/b'], ['api', 'repos/a/b/issues', '-f', 'title=x'], ['api', 'repos/a/b', '-F', 'x=1'], ['api', 'repos/a/b', '--input', 'f.json'], ['api', '-XPOST', 'repos/a/b'], ['release', 'create', 'x'], ['variable', 'set', 'X']]) {
    assert.throws(() => read(bad), /read only|reads with "gh api" only/, bad.join(' '));
  }
  assert.equal(seen.length, 2, 'a refused call never ran');
  assert.throws(() => ghReader(() => ({ status: 1, stderr: 'HTTP 404' }))(['api', 'repos/a/b']), /gh api repos\/a\/b failed: HTTP 404/);
  for (const bad of ['faridbnv/h2c-materials', 'FARIDBNV/H2C-MATERIAL-TEMP-PAGE', 'tester/staging', 'h2c-dryrun', '../x/dryrun', '']) assert.throws(() => assertMirror(bad), /real repository|dryrun|OWNER\/NAME/, bad);
  assert.equal(assertMirror('faridbnv/h2c-materials-dryrun'), 'faridbnv/h2c-materials-dryrun');
});

test('CLI: refuses a real repository before it reads anything', () => {
  const r = spawnSync(process.execPath, [join(root, 'remake/tools/live-dryrun-check.mjs'), 'faridbnv/h2c-materials'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /real repository/);
});

test('the kit\'s files exist, the script parses, and the guide names the commands and the limitations it closes', () => {
  for (const f of ['remake/tools/live-dryrun.sh', 'remake/tools/live-dryrun-check.mjs', 'docs/next/live-dryrun.md', 'tests/remake/fixtures/live-dryrun/fake-gh.sh']) assert.ok(existsSync(join(root, f)), f);
  const bashSyntax = spawnSync('bash', ['-n', SCRIPT], { encoding: 'utf8' });
  assert.equal(bashSyntax.status, 0, bashSyntax.stderr);
  const doc = readFileSync(join(root, 'docs/next/live-dryrun.md'), 'utf8');
  for (const c of ['live-dryrun.sh', '--restore', '--revert', '--cleanup', 'live-dryrun-check.mjs', 'L-02', 'L-03']) assert.ok(doc.includes(c), c);
});
