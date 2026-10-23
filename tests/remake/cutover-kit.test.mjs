// WP-32: the workflow that replaces verify.yml and pages.yml, and the pieces it stands on: the plan (what a run may do), the artifact and its
// digest, the restore from the saved old site, and the legacy smoke. The plan is judged without GitHub; the workflow is judged as text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROL_PATH, DRY_RUN_BRANCH, LIVE_BRANCH, cutoverRows, planRun, readControl, validateControl } from '../../remake/tools/cutover.mjs';
import { DIGEST_IGNORES, carryPrevious, folderDigest, releaseNotes } from '../../remake/tools/artifact.mjs';
import { buildManifest, packZip, sha256 } from '../../remake/tools/legacy-site.mjs';
import { BANNER_ATTR, markPage, unmarkPage } from '../../remake/tools/restore-marks.mjs';
import { preparePreview, verifyAndUnpack } from '../../remake/tools/restore.mjs';
import { runLegacySmoke } from '../../remake/tools/legacy-smoke.mjs';
import { runSmoke } from '../../remake/tools/preview-smoke.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const MAIN_TIP = 'c'.repeat(40);
const tmp = (name) => mkdtempSync(join(tmpdir(), `${name}-`));

const REQUEST = { id: 'restore-1', hold: 'legacy-final', tag: 'h2c-legacy-final', asset: 'legacy-site-7c6da496722d.zip', digest: `sha256:${'d'.repeat(64)}`, reason: 'the live site is wrong' };

/** A scratch checkout holding only what the plan reads: the control file and the attest rows. */
function fixture({ request = null, attest = [], control } = {}) {
  const dir = tmp('cutover');
  mkdirSync(join(dir, 'remake/control'), { recursive: true });
  writeFileSync(join(dir, CONTROL_PATH), control ?? JSON.stringify({ schema: 1, request }));
  writeFileSync(join(dir, 'remake/attest.csv'), ['date,key,detail,source', ...attest].join('\n') + '\n');
  return dir;
}
const cutoverRow = (sha) => `2026-11-01,cutover-approved,${sha},wp:attest`;
const plan = (dir, over = {}) => planRun({ event: 'push', ref: LIVE_BRANCH, sha: MAIN_TIP, hold: '', changedFiles: ['app/x.js'], root: dir, isAncestor: () => false, ...over });

// ---- the plan: where a run may deploy ---------------------------------------------------------------------------------------
test('a ref that is neither main nor remake/v3 is refused', () => {
  const dir = fixture();
  for (const ref of ['refs/heads/wp-x', 'refs/tags/v1', 'refs/pull/3/merge']) assert.equal(plan(dir, { ref }).refused, true, ref);
});

test('the live path refuses to run unless the cutover is recorded for the deployed commit or one of its ancestors', () => {
  const without = plan(fixture());
  assert.equal(without.refused, true);
  assert.equal(without.deploy, false);
  assert.match(without.reason, /no "cutover-approved cccccccc" row/);
  // a row for this very commit
  const same = plan(fixture({ attest: [cutoverRow(MAIN_TIP)] }));
  assert.deepEqual([same.refused, same.mode, same.action, same.deploy], [false, 'live', 'deploy', true]);
  // a row for an ancestor (the candidate; the merge commit is a descendant)
  const ancestor = plan(fixture({ attest: [cutoverRow(SHA)] }), { isAncestor: (a, b) => a === SHA && b === MAIN_TIP });
  assert.equal(ancestor.deploy, true);
  // a row for a commit that is not an ancestor does not count
  const stranger = plan(fixture({ attest: [cutoverRow(OTHER)] }), { isAncestor: () => false });
  assert.equal(stranger.refused, true);
  assert.match(stranger.reason, /1 cutover row\(s\) found/);
  // a row that names no full commit is not a record
  assert.equal(plan(fixture({ attest: ['2026-11-01,cutover-approved,abc123,wp:attest', '2026-11-01,safari-check,' + MAIN_TIP + ',wp:attest'] })).refused, true);
  assert.deepEqual(cutoverRows(fixture({ attest: [cutoverRow(SHA), '2026-11-01,cutover-approved,short,wp:attest'] })).map((r) => r.sha), [SHA]);
});

test('the dry run is on remake/v3: an ordinary push is next-preview.yml\'s, a push that changes remake/control/ deploys to the preview', () => {
  const dir = fixture();
  const ordinary = plan(dir, { ref: DRY_RUN_BRANCH, changedFiles: ['packages/x.ts'] });
  assert.deepEqual([ordinary.run, ordinary.refused, ordinary.deploy, ordinary.mode], [false, false, false, 'dry-run']);
  assert.match(ordinary.reason, /next-preview\.yml/);
  const control = plan(dir, { ref: DRY_RUN_BRANCH, changedFiles: ['remake/control/rehearsal-ping.json'] });
  assert.deepEqual([control.run, control.mode, control.action, control.deploy], [true, 'dry-run', 'deploy', true]);
  // the dry run needs no cutover record: it never touches the live site
  assert.equal(control.refused, false);
});

test('a manual run can ask for the dry run anywhere and for the live path only on main', () => {
  const dir = fixture();
  const dryOnMain = plan(dir, { event: 'workflow_dispatch', inputMode: 'dry-run', changedFiles: null });
  assert.deepEqual([dryOnMain.refused, dryOnMain.mode, dryOnMain.deploy], [false, 'dry-run', true], 'a dry run on main needs no cutover row');
  assert.equal(plan(dir, { event: 'workflow_dispatch', inputMode: 'live', ref: DRY_RUN_BRANCH, changedFiles: null }).refused, true);
  assert.equal(plan(dir, { event: 'workflow_dispatch', inputMode: 'live', changedFiles: null }).refused, true, 'live on main without the record');
  assert.equal(plan(dir, { event: 'workflow_dispatch', inputMode: 'nonsense', changedFiles: null }).refused, true);
  assert.equal(plan(dir, { event: 'pull_request', ref: DRY_RUN_BRANCH }).refused, true, 'an event the workflow does not act on');
});

test('the weekly checks run from main only and deploy nothing', () => {
  const dir = fixture();
  const weekly = plan(dir, { event: 'schedule', changedFiles: null });
  assert.deepEqual([weekly.run, weekly.action, weekly.deploy, weekly.refused], [true, 'weekly', false, false]);
  assert.equal(plan(dir, { event: 'schedule', ref: DRY_RUN_BRANCH, changedFiles: null }).refused, true);
});

// ---- DEPLOY_HOLD -------------------------------------------------------------------------------------------------------------
test('under DEPLOY_HOLD an ordinary run verifies and builds but does not deploy, on the live path and in the dry run', () => {
  const live = plan(fixture({ attest: [cutoverRow(MAIN_TIP)] }), { hold: 'legacy-final' });
  assert.deepEqual([live.run, live.action, live.deploy, live.refused], [true, 'deploy', false, false]);
  assert.match(live.reason, /DEPLOY_HOLD is "legacy-final".*not deployed/);
  const dry = plan(fixture(), { ref: DRY_RUN_BRANCH, changedFiles: ['remake/control/rehearsal-ping.json'], hold: 'legacy-final' });
  assert.deepEqual([dry.run, dry.action, dry.deploy], [true, 'deploy', false], 'the rehearsal\'s harmless push does not deploy');
  // a hold of only spaces is no hold (the variable is cleared by deleting it, but a blank value must not wedge the site)
  assert.equal(plan(fixture({ attest: [cutoverRow(MAIN_TIP)] }), { hold: '  ' }).deploy, true);
});

test('a restore needs its hold: refused without one or with another value, allowed only for the restore the hold names', () => {
  const dir = fixture({ request: REQUEST });
  const push = { ref: DRY_RUN_BRANCH, changedFiles: [CONTROL_PATH] };
  const none = plan(dir, push);
  assert.equal(none.refused, true);
  assert.match(none.reason, /DEPLOY_HOLD is not set/);
  assert.match(none.reason, /gh variable set DEPLOY_HOLD --body legacy-final/, 'the refusal says the exact command; the workflow never runs it');
  const wrong = plan(dir, { ...push, hold: 'something-else' });
  assert.equal(wrong.refused, true);
  assert.match(wrong.reason, /answers hold "legacy-final"/);
  const ok = plan(dir, { ...push, hold: 'legacy-final' });
  assert.deepEqual([ok.refused, ok.mode, ok.action, ok.deploy], [false, 'dry-run', 'restore', true]);
  assert.equal(ok.request.asset, REQUEST.asset);
});

test('a restore acts on the push that changed the control file, or on a manual run that asks; a later push never restores again', () => {
  const dir = fixture({ request: REQUEST, attest: [cutoverRow(MAIN_TIP)] });
  const later = plan(dir, { hold: 'legacy-final', changedFiles: ['packages/x.ts'] });
  assert.deepEqual([later.action, later.deploy], ['deploy', false], 'a standing request does not restore on an ordinary push; the hold keeps it from deploying');
  const dispatch = plan(dir, { event: 'workflow_dispatch', inputMode: 'live', inputRestore: true, hold: 'legacy-final', changedFiles: null });
  assert.deepEqual([dispatch.refused, dispatch.mode, dispatch.action, dispatch.deploy], [false, 'live', 'restore', true]);
  assert.equal(plan(dir, { event: 'workflow_dispatch', inputMode: 'live', inputRestore: true, changedFiles: null }).refused, true, 'a live restore without the hold');
  // asking for a restore when the file holds none is not a restore
  const empty = plan(fixture({ attest: [cutoverRow(MAIN_TIP)] }), { event: 'workflow_dispatch', inputMode: 'live', inputRestore: true, changedFiles: null });
  assert.equal(empty.action, 'deploy');
});

test('a live restore is also refused until the cutover is recorded', () => {
  const dir = fixture({ request: REQUEST });
  const r = plan(dir, { event: 'workflow_dispatch', inputMode: 'live', inputRestore: true, hold: 'legacy-final', changedFiles: null });
  assert.equal(r.refused, true);
  assert.match(r.reason, /cutover-approved/);
});

test('the control file is validated and a malformed one is a refusal, never "no request"', () => {
  assert.equal(validateControl({ schema: 1, request: null }), null);
  assert.deepEqual(validateControl({ schema: 1, request: REQUEST }), REQUEST);
  const bad = (over, re) => assert.throws(() => validateControl({ schema: 1, request: { ...REQUEST, ...over } }), re);
  bad({ digest: 'sha256:abc' }, /request\.digest/);
  bad({ tag: 'h2c-legacy-other' }, /request\.tag/);
  bad({ asset: 'site.zip' }, /request\.asset/);
  bad({ id: 'a' }, /request\.id/);
  bad({ reason: '' }, /request\.reason/);
  bad({ extra: 1 }, /unknown field/);
  assert.throws(() => validateControl({ schema: 2, request: null }), /schema must be 1/);
  assert.throws(() => validateControl({ schema: 1 }), /request must be null or an object/);
  const broken = plan(fixture({ control: '{not json' }), { ref: DRY_RUN_BRANCH, changedFiles: [CONTROL_PATH] });
  assert.equal(broken.refused, true);
  assert.match(broken.reason, /not JSON/);
  assert.throws(() => readControl(tmp('empty')), /is missing/);
  // the committed file is valid and holds no request
  assert.equal(readControl(root), null);
});

test('CLI: plan writes the outputs, exits 1 on a refusal, and REQUIRE_ACTION stops a job whose action is not allowed to deploy', () => {
  const run = (dir, env) => {
    const out = join(dir, 'out.txt');
    writeFileSync(out, '');
    const r = spawnSync(process.execPath, [join(root, 'remake/tools/cutover.mjs'), 'plan'], { env: { PATH: process.env.PATH, H2C_WP_ROOT: dir, GITHUB_OUTPUT: out, SHA, EVENT_NAME: 'workflow_dispatch', REF: LIVE_BRANCH, ...env }, encoding: 'utf8' });
    return { status: r.status, out: readFileSync(out, 'utf8'), stderr: r.stderr, stdout: r.stdout };
  };
  const ok = run(fixture({ attest: [cutoverRow(SHA)] }), { INPUT_MODE: 'live' });
  assert.equal(ok.status, 0);
  assert.match(ok.out, /^mode=live\naction=deploy\nrun=true\ndeploy=true\n$/);
  const refused = run(fixture(), { INPUT_MODE: 'live' });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /::error::the live deploy is refused/);
  // the second lock: a job that is about to restore, in a run whose plan is a plain (held) deploy
  const held = run(fixture({ attest: [cutoverRow(SHA)] }), { INPUT_MODE: 'live', DEPLOY_HOLD: 'legacy-final', REQUIRE_ACTION: 'deploy' });
  assert.equal(held.status, 1);
  assert.match(held.stderr, /takes the action "deploy"/);
  const wrongAction = run(fixture({ attest: [cutoverRow(SHA)] }), { INPUT_MODE: 'live', REQUIRE_ACTION: 'restore' });
  assert.equal(wrongAction.status, 1);
  assert.equal(run(fixture({ request: REQUEST, attest: [cutoverRow(SHA)] }), { INPUT_MODE: 'live', INPUT_RESTORE: 'true', DEPLOY_HOLD: 'legacy-final', REQUIRE_ACTION: 'restore' }).status, 0);
  const noSha = spawnSync(process.execPath, [join(root, 'remake/tools/cutover.mjs'), 'plan'], { env: { PATH: process.env.PATH, H2C_WP_ROOT: fixture() }, encoding: 'utf8' });
  assert.equal(noSha.status, 1);
  assert.match(noSha.stderr, /SHA is not a 40-character commit/);
});

// ---- the workflow, as text -----------------------------------------------------------------------------------------------------
const text = (name) => readFileSync(join(root, '.github/workflows', name), 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const main = text('next-main.yml');
const jobBlock = (src, id) => {
  const m = new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm').exec(src);
  assert.ok(m, `job ${id}`);
  return m[1];
};
const jobIds = [...main.matchAll(/^  ([\w-]+):\n/gm)].map((m) => m[1]).filter((id) => !['push', 'workflow_dispatch', 'schedule', 'contents'].includes(id));
const stepsOf = (block) => block.split(/^      - /m).slice(1);

test('next-main.yml triggers on main and remake/v3, pins every action, and runs on the pinned image with a timeout on every job', () => {
  assert.match(main, /on:\n  push:\n    branches: \[main, remake\/v3\]\n/);
  assert.doesNotMatch(main, /pull_request/, 'no pull request event: a pull request runs its own copy of the workflow');
  const uses = [...main.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(uses.length > 10);
  for (const u of uses) if (u !== './.github/workflows/next-verify.yml') assert.match(u, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, u);
  assert.match(main, /^permissions:\n  contents: read$/m);
  assert.deepEqual([...new Set([...main.matchAll(/^    runs-on:\s*(\S+)/gm)].map((m) => m[1]))], ['ubuntu-24.04']);
  assert.equal((main.match(/^    runs-on:/gm) || []).length, (main.match(/^    timeout-minutes:/gm) || []).length, 'a timeout on every job that runs on a runner');
  assert.match(main, /group: next-main\n  cancel-in-progress: false/);
});

test('every job waits for the plan, and the one result job names all of them', () => {
  assert.ok(jobIds.includes('plan') && jobIds.includes('next-main'));
  for (const id of jobIds.filter((j) => !['plan', 'next-main'].includes(j))) assert.match(jobBlock(main, id), /^    needs: .*\bplan\b/m, `${id} needs the plan`);
  const result = jobBlock(main, 'next-main');
  const needs = /needs: \[(.*)\]/.exec(result)[1].split(',').map((s) => s.trim());
  assert.deepEqual(needs.sort(), jobIds.filter((j) => j !== 'next-main').sort());
  assert.match(result, /if: always\(\)/);
});

test('the live path is guarded by the cutover record, the ref and the hold: three locks on every job that can touch Pages or releases', () => {
  for (const id of ['deploy-live', 'release', 'restore-live']) {
    const block = jobBlock(main, id);
    assert.match(block, /if: needs\.plan\.outputs\.mode == 'live' && needs\.plan\.outputs\.action == '(deploy|restore)' && needs\.plan\.outputs\.deploy == 'true' && github\.ref == 'refs\/heads\/main'/, `${id} is live-only, on main, and only when the plan allows the deploy`);
    const check = stepsOf(block).find((s) => s.startsWith('name: Check the cutover record again'));
    assert.ok(check, `${id} checks the cutover record again, itself`);
    assert.match(check, /REQUIRE_ACTION: (deploy|restore)/);
    assert.match(check, /DEPLOY_HOLD: \$\{\{ vars\.DEPLOY_HOLD \}\}/);
    assert.match(check, /node remake\/tools\/cutover\.mjs plan/);
    assert.match(block, /fetch-depth: 0/, `${id} has the whole history, so the ancestry of the cutover row can be told`);
  }
  // the plan is the only job that decides the mode; the live jobs only read it
  assert.equal((main.match(/cutover\.mjs plan/g) || []).length, 4, 'the plan job and the three live jobs');
  // Pages and release rights belong to those jobs alone
  for (const id of jobIds) {
    const block = jobBlock(main, id);
    const needsPages = /pages: write|id-token: write/.test(block);
    const needsRelease = /contents: write/.test(block);
    assert.equal(needsPages, ['deploy-live', 'restore-live'].includes(id), `${id}: pages rights`);
    assert.equal(needsRelease, id === 'release', `${id}: contents: write`);
  }
  assert.equal((main.match(/actions\/deploy-pages@/g) || []).length, 2);
  assert.equal((main.match(/gh release create/g) || []).length, 1);
  assert.match(jobBlock(main, 'release'), /gh release create/);
  assert.match(jobBlock(main, 'release'), /needs: \[plan, build, smoke-live\]/, 'the release is kept only after the live smoke passed');
});

test('the deployed bytes are the tested artifact: fetched by run ID and checked against the digest before any publish step', () => {
  for (const id of ['deploy-preview', 'deploy-live', 'release']) {
    const steps = stepsOf(jobBlock(main, id));
    const download = steps.findIndex((s) => /actions\/download-artifact@/.test(s));
    const verify = steps.findIndex((s) => /artifact\.mjs verify --site _site --expect "\$EXPECT"/.test(s));
    assert.ok(download >= 0 && verify > download, `${id}: download, then verify`);
    assert.match(steps[download], /name: site-\$\{\{ github\.run_id \}\}/);
    assert.match(steps[download], /run-id: \$\{\{ github\.run_id \}\}/);
    assert.match(steps[verify], /EXPECT: \$\{\{ needs\.build\.outputs\.digest \}\}/);
    const firstPublish = steps.findIndex((s) => /preview-assemble\.mjs (inject|stage)|upload-pages-artifact|gh release create/.test(s));
    assert.ok(firstPublish > verify, `${id}: nothing is published before the digest is checked`);
  }
  assert.match(jobBlock(main, 'build'), /digest: \$\{\{ steps\.digest\.outputs\.digest \}\}/);
  // the digest counts every file, .nojekyll among them, so the upload must keep dotfiles or every deploy refuses its artifact
  assert.match(jobBlock(main, 'build'), /name: site-\$\{\{ github\.run_id \}\}\n\s+path: _site\n[\s\S]*?include-hidden-files: true/);
  assert.match(jobBlock(main, 'build'), /size-report\.mjs --site _site/, 'the byte budgets gate the artifact');
});

test('DEPLOY_HOLD is read and never set; no job changes a repository variable', () => {
  assert.match(main, /DEPLOY_HOLD: \$\{\{ vars\.DEPLOY_HOLD \}\}/);
  assert.doesNotMatch(main, /gh variable (set|delete)|gh api[^\n]*variables|actions\/variables|repos\/[^\n]*\/actions\/variables/);
  assert.equal(readFileSync(join(root, '.github/workflows/next-main.yml'), 'utf8').match(/^[^#\n]*gh variable (set|delete)/gm), null, 'the only mentions are in comments');
  // the held run still verifies and builds: the hold is applied at the deploy jobs, through the plan\'s deploy output
  for (const id of ['deploy-preview', 'deploy-live', 'restore-preview', 'restore-live']) assert.match(jobBlock(main, id), /needs\.plan\.outputs\.deploy == 'true'/, id);
  assert.doesNotMatch(jobBlock(main, 'build'), /outputs\.deploy ==/, 'build does not depend on the hold');
});

test('the preview deploy key appears in exactly the two push steps of the preview jobs, which run only git, ssh, curl and jq', () => {
  assert.equal((main.match(/secrets\./g) || []).length, 2);
  for (const id of ['deploy-preview', 'restore-preview']) {
    const block = jobBlock(main, id);
    assert.match(block, /environment:\n      name: preview/);
    const withKey = stepsOf(block).filter((s) => s.includes('secrets.PREVIEW_DEPLOY_KEY'));
    assert.equal(withKey.length, 1, id);
    assert.doesNotMatch(withKey[0].replace(/PREVIEW_DEPLOY_KEY/g, ''), /\b(node|npm|npx|bash) /, `${id}: the key step runs only git, ssh, curl and jq`);
  }
  for (const id of jobIds.filter((j) => !['deploy-preview', 'restore-preview'].includes(j))) assert.doesNotMatch(jobBlock(main, id), /secrets\./, id);
});

test('no run block holds an expression: everything an outsider could write reaches a script through env', () => {
  const blocks = [...main.matchAll(/^ {8}run: \|?\n?([\s\S]*?)(?=^ {0,8}(?:- |\w[\w-]*:))/gm)].map((m) => m[1]);
  assert.ok(blocks.length > 10);
  for (const b of blocks) assert.doesNotMatch(b, /\$\{\{/, b.slice(0, 80));
  for (const m of main.matchAll(/^ {8}run: ([^|\n].*)$/gm)) assert.doesNotMatch(m[1], /\$\{\{/, m[1]);
  // the untrusted inputs of a push or a dispatch are only ever env values of the plan and the re-check steps
  assert.doesNotMatch(main, /github\.event\.(head_commit|pull_request|comment|issue)/);
  assert.doesNotMatch(main, /github\.head_ref/);
});

test('next-main.yml reuses the checks of next-verify.yml, which does not clash with its own run', () => {
  const verify = text('next-verify.yml');
  assert.match(verify, /^  workflow_call:$/m);
  assert.match(verify, /group: next-verify-\$\{\{ github\.workflow \}\}-/, 'a called run and a direct run on the same commit do not cancel each other');
  const call = jobBlock(main, 'verify');
  assert.match(call, /uses: \.\/\.github\/workflows\/next-verify\.yml/);
  assert.match(call, /permissions:\n      contents: read\n      pull-requests: read\n      issues: read/, 'the called workflow\'s jobs may ask for no more than the caller grants');
  assert.match(call, /needs\.plan\.outputs\.action == 'deploy'/);
});

test('a push that changes only remake/control/ is next-main\'s, not next-preview\'s (the hold test must reach a workflow that reads the hold)', () => {
  assert.match(readFileSync(join(root, '.github/workflows/next-preview.yml'), 'utf8'), /paths-ignore: \['remake\/control\/\*\*'\]/);
});

test('the dry run records the main commit the preview names, and it is the baseline\'s', () => {
  const baseline = JSON.parse(readFileSync(join(root, 'remake/baseline/5eabafad.json'), 'utf8'));
  assert.equal(/MAIN_COMMIT: ([0-9a-f]{40})/.exec(main)[1], baseline.git.originMain);
});

test('the control files are valid JSON in the form the plan reads, and the restore request is empty until a rehearsal or a rollback asks', () => {
  assert.equal(readControl(root), null);
  assert.equal(JSON.parse(readFileSync(join(root, 'remake/control/rehearsal-ping.json'), 'utf8')).schema, 1);
});

// ---- the artifact and its digest ------------------------------------------------------------------------------------------------
const writeSite = (dir, files) => { for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); } return dir; };

test('the artifact digest covers every file but deploy.json, whatever the order they were written in', () => {
  const a = writeSite(tmp('art'), { 'index.html': 'x', 'data/a.json': '{}', 'deploy.json': '{"builtAt":"t1","remakeCommit":"1"}' });
  const b = writeSite(tmp('art'), { 'deploy.json': '{"builtAt":"t2","remakeCommit":"2"}', 'data/a.json': '{}', 'index.html': 'x' });
  assert.deepEqual([...DIGEST_IGNORES], ['deploy.json']);
  assert.equal(folderDigest(a).digest, folderDigest(b).digest);
  assert.match(folderDigest(a).digest, /^sha256:[0-9a-f]{64}$/);
  writeFileSync(join(b, 'data/a.json'), '{ }');
  assert.notEqual(folderDigest(a).digest, folderDigest(b).digest, 'one changed byte is another artifact');
  rmSync(join(b, 'data/a.json'));
  assert.notEqual(folderDigest(a).digest, folderDigest(b).digest, 'a missing file is another artifact');
  assert.throws(() => folderDigest(tmp('empty')), /holds no files/);
});

test('CLI: artifact verify exits 1 on a digest that is not the folder\'s, and digest writes the file the build job reads', () => {
  const site = writeSite(tmp('art'), { 'index.html': 'x' });
  const out = join(tmp('art-out'), 'artifact.json');
  const tool = join(root, 'remake/tools/artifact.mjs');
  const d = spawnSync(process.execPath, [tool, 'digest', '--site', site, '--out', out], { encoding: 'utf8' });
  assert.equal(d.status, 0, d.stderr);
  const { digest } = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(spawnSync(process.execPath, [tool, 'verify', '--site', site, '--expect', digest], { encoding: 'utf8' }).status, 0);
  writeFileSync(join(site, 'index.html'), 'y');
  const bad = spawnSync(process.execPath, [tool, 'verify', '--site', site, '--expect', digest], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /artifact digest mismatch/);
});

test('the previous release\'s data and chunks are carried from its unpacked zip, without detail/, and the marker says which', () => {
  const prev = writeSite(tmp('prev'), {
    'release.json': JSON.stringify({ release: 'aaaaaaaaaaaa', assets: ['old.js'] }), 'assets/old.js': 'old', 'data/aaaaaaaaaaaa/result.json': '{}', 'data/aaaaaaaaaaaa/core.json': '{}', 'data/aaaaaaaaaaaa/detail/M001.json': '{}',
  });
  const site = writeSite(tmp('new'), { 'release.json': JSON.stringify({ release: 'bbbbbbbbbbbb', assets: ['new.js'] }), 'assets/new.js': 'new', 'deploy.json': '{"release":"bbbbbbbbbbbb"}' });
  const r = carryPrevious(site, prev);
  assert.equal(r.release, 'aaaaaaaaaaaa');
  assert.ok(existsSync(join(site, 'data/aaaaaaaaaaaa/result.json')) && existsSync(join(site, 'assets/old.js')) && existsSync(join(site, 'assets/new.js')));
  assert.ok(!existsSync(join(site, 'data/aaaaaaaaaaaa/detail')), 'the slim copy: no detail part (R-M3-SITE-SCOPE)');
  assert.equal(JSON.parse(readFileSync(join(site, 'deploy.json'), 'utf8')).v3Previous, 'aaaaaaaaaaaa');
  // the same release twice carries nothing; no previous site carries nothing; a previous site missing a chunk it lists is an error
  assert.deepEqual(carryPrevious(writeSite(tmp('new'), { 'release.json': JSON.stringify({ release: 'aaaaaaaaaaaa' }) }), prev), { release: 'aaaaaaaaaaaa', same: true, files: 0, chunks: 0 });
  assert.equal(carryPrevious(site, tmp('none')), null);
  const broken = writeSite(tmp('prev'), { 'release.json': JSON.stringify({ release: 'cccccccccccc', assets: ['gone.js'] }), 'data/cccccccccccc/result.json': '{}' });
  assert.throws(() => carryPrevious(writeSite(tmp('new'), { 'release.json': JSON.stringify({ release: 'bbbbbbbbbbbb' }) }), broken), /chunks the preview repository does not hold/);
});

test('the release\'s decision diff lists every registered transition and says what is not automated', () => {
  const site = writeSite(tmp('rel'), { 'release.json': JSON.stringify({ release: 'bbbbbbbbbbbb' }) });
  const t = readdirSync(join(root, 'parity/transitions')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  const notes = releaseNotes({ site, commit: SHA, previousCommit: null, transitions: t });
  assert.match(notes, /Decision diff of release bbbbbbbbbbbb/);
  for (const id of t) assert.ok(notes.includes(id), id);
  assert.match(notes, /not automated/);
});

// ---- the saved old site: restore and the legacy smoke ---------------------------------------------------------------------------
const PAGE = (body) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;
const OLD_ID = '7c6da496722d';
const STAMPED = `H2C_Material_Selector_2026-09-21_${OLD_ID}.html`;

/** A saved old site: a folder, its zip, its manifest, and the control request that names them. */
function saved() {
  const site = writeSite(tmp('legacy-site'), {
    'index.html': PAGE('selector'), [STAMPED]: PAGE('selector'), 'manifest.json': JSON.stringify({ release: OLD_ID }), 'validation-report.md': '# report',
    'materials/M001.html': PAGE('pla'), 'materials/index.html': PAGE('index'),
  });
  // index.html must be the stamped page byte for byte
  const manifest = buildManifest(site, { mainCommit: SHA });
  const dir = tmp('legacy-out');
  const zip = join(dir, `legacy-site-${OLD_ID}.zip`);
  packZip(site, zip);
  const manifestFile = join(dir, 'legacy-manifest.json');
  writeFileSync(manifestFile, JSON.stringify(manifest));
  const digest = `sha256:${sha256(readFileSync(zip))}`;
  const control = join(dir, 'control.json');
  writeFileSync(control, JSON.stringify({ schema: 1, request: { ...REQUEST, asset: `legacy-site-${OLD_ID}.zip`, digest } }));
  return { site, dir, zip, manifest, manifestFile, digest, control };
}

test('restore verifies the zip against the control file\'s digest and the unpacked tree against the manifest', () => {
  const s = saved();
  const out = join(tmp('restored'), 'site');
  const v = verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out });
  assert.equal(v.digest, s.digest);
  assert.equal(v.manifest.oldReleaseId, OLD_ID);
  assert.ok(existsSync(join(out, 'materials/M001.html')));
  // a zip that is not the one the request names
  const other = JSON.parse(readFileSync(s.control, 'utf8'));
  other.request.digest = `sha256:${'0'.repeat(64)}`;
  writeFileSync(s.control, JSON.stringify(other));
  assert.throws(() => verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out: tmp('r') }), /the zip's digest is/);
});

test('restore refuses a zip whose asset name is not the request\'s, a manifest of another release, and a tree that differs from its manifest', () => {
  const s = saved();
  const rename = JSON.parse(readFileSync(s.control, 'utf8'));
  rename.request.asset = 'legacy-site-111111111111.zip';
  writeFileSync(s.control, JSON.stringify(rename));
  assert.throws(() => verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out: tmp('r') }), /the request names legacy-site-111111111111\.zip/);
  const s2 = saved();
  const m = JSON.parse(readFileSync(s2.manifestFile, 'utf8'));
  m.oldReleaseId = '111111111111';
  writeFileSync(s2.manifestFile, JSON.stringify(m));
  assert.throws(() => verifyAndUnpack({ zip: s2.zip, manifestFile: s2.manifestFile, controlFile: s2.control, out: tmp('r') }), /manifest is of old release 111111111111/);
  const s3 = saved();
  const m3 = JSON.parse(readFileSync(s3.manifestFile, 'utf8'));
  m3.files.find((f) => f.path === 'materials/M001.html').sha256 = '0'.repeat(64);
  writeFileSync(s3.manifestFile, JSON.stringify(m3));
  assert.throws(() => verifyAndUnpack({ zip: s3.zip, manifestFile: s3.manifestFile, controlFile: s3.control, out: tmp('r') }), /1 different/);
  const s4 = saved();
  const m4 = JSON.parse(readFileSync(s4.manifestFile, 'utf8'));
  m4.files = m4.files.filter((f) => f.path !== 'validation-report.md');
  writeFileSync(s4.manifestFile, JSON.stringify(m4));
  assert.throws(() => verifyAndUnpack({ zip: s4.zip, manifestFile: s4.manifestFile, controlFile: s4.control, out: tmp('r') }), /1 extra/);
});

test('a zip holding a path outside its folder is refused before anything is unpacked', () => {
  const s = saved();
  const evil = join(tmp('evil'), `legacy-site-${OLD_ID}.zip`);
  const py = spawnSync('python3', ['-I', '-c', 'import sys, zipfile\nz = zipfile.ZipFile(sys.argv[1], "w")\nz.writestr("index.html", "x")\nz.writestr("../escape.txt", "x")\nz.close()', evil]);
  assert.equal(py.status, 0, String(py.stderr));
  const control = join(dirname(evil), 'control.json');
  writeFileSync(control, JSON.stringify({ schema: 1, request: { ...REQUEST, asset: `legacy-site-${OLD_ID}.zip`, digest: `sha256:${sha256(readFileSync(evil))}` } }));
  const out = join(tmp('restored'), 'site');
  assert.throws(() => verifyAndUnpack({ zip: evil, manifestFile: s.manifestFile, controlFile: control, out }), /unsafe path/);
  assert.ok(!existsSync(join(dirname(out), 'escape.txt')));
});

test('the preview marks are exactly reversible, applied once, and refused on a page that cannot carry them', () => {
  const html = PAGE('<h1>old</h1>');
  const marked = markPage(html, 'index.html');
  assert.ok(marked.includes(BANNER_ATTR) && marked.includes('noindex') && marked.includes('data-preview-storage'));
  assert.equal(markPage(marked), marked, 'marking twice changes nothing');
  assert.equal(unmarkPage(marked), html, 'the saved page comes back byte for byte');
  assert.equal(unmarkPage(html), html);
  assert.throws(() => markPage('<html><body>x</body></html>', 'a.html'), /no <head>/);
  assert.throws(() => markPage('<html><head></head>x', 'a.html'), /no <body>/);
});

test('preparing the restore for the preview marks every page, writes preview.json with the digest it restored from, and refuses a stray .git', () => {
  const s = saved();
  const out = join(tmp('restored'), 'site');
  const v = verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out });
  const info = preparePreview(out, { ...v, remake: SHA, main: OTHER, runId: '42' });
  assert.equal(info.release, OLD_ID);
  assert.equal(info.restoredFrom, s.digest);
  assert.equal(info.restoreId, 'restore-1');
  assert.equal(info.sampleMaterial, 'materials/M001.html');
  assert.equal(info.stampedSelector, STAMPED);
  for (const f of ['index.html', STAMPED, 'materials/M001.html']) assert.ok(readFileSync(join(out, f), 'utf8').includes(BANNER_ATTR), f);
  assert.ok(existsSync(join(out, '404.html')) && existsSync(join(out, '.nojekyll')));
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'preview.json'), 'utf8')).restoredFrom, s.digest);
  const dirty = join(tmp('restored'), 'site');
  verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out: dirty });
  mkdirSync(join(dirty, '.git'));
  assert.throws(() => preparePreview(dirty, { ...v, remake: SHA, main: OTHER }), /top-level \.git/);
  assert.throws(() => preparePreview(out, { ...v, remake: 'abc', main: OTHER }), /--remake must be a 40-character/);
});

/** A static server over a folder; `override` replaces a path's answer. */
function serve(dir, override = {}) {
  const server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    if (p in override) { res.writeHead(override[p].status ?? 200); res.end(override[p].body ?? ''); return; }
    const file = join(dir, p);
    if (p.split('/').includes('..') || !existsSync(file) || !readdirSafe(file)) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200); res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => { server.closeAllConnections(); return new Promise((r) => server.close(r)); } })));
}
const readdirSafe = (f) => { try { readFileSync(f); return true; } catch { return false; } };
const fast = { sleep: async () => {} };
const smokeCfg = (url, s, extra = {}) => ({ baseUrl: url, manifest: s.manifest, profile: 'live', timeoutS: 5, pollS: 0.01, ...extra });

test('legacy smoke (live profile): every file of the saved manifest served with its digest passes; a changed byte, a missing file and a served 404 page each fail', async () => {
  const s = saved();
  const ok = await serve(s.site);
  try {
    const m = await runLegacySmoke(smokeCfg(ok.url, s), fast);
    assert.equal(m.status, 'pass', JSON.stringify(m.checks.filter((c) => !c.ok)));
    assert.equal(m.filesChecked, s.manifest.files.length);
  } finally { await ok.close(); }
  const changed = await serve(s.site, { 'materials/M001.html': { body: PAGE('not pla') } });
  try {
    const m = await runLegacySmoke(smokeCfg(changed.url, s), fast);
    assert.equal(m.status, 'fail');
    assert.ok(m.checks.some((c) => !c.ok && c.name === 'materials/M001.html: digest'));
  } finally { await changed.close(); }
  const missing = await serve(s.site, { 'materials/index.html': { status: 404 } });
  try {
    const m = await runLegacySmoke(smokeCfg(missing.url, s), fast);
    assert.ok(m.checks.some((c) => !c.ok && c.name === 'materials/index.html: HTTP 200'));
  } finally { await missing.close(); }
  // a site that answers 200 for a missing path is not the old site (it would hide a broken link)
  const softServer = createServer((req, res) => { res.writeHead(200); res.end(readFileSync(join(s.site, 'index.html'))); });
  await new Promise((r) => softServer.listen(0, '127.0.0.1', r));
  try {
    const m = await runLegacySmoke(smokeCfg(`http://127.0.0.1:${softServer.address().port}/`, s, { timeoutS: 1 }), fast);
    assert.equal(m.status, 'fail');
  } finally { softServer.closeAllConnections(); await new Promise((r) => softServer.close(r)); }
});

test('legacy smoke (preview profile): waits for preview.json to name the restore, takes the marks off before comparing, and times out on another digest', async () => {
  const s = saved();
  const v = verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out: join(tmp('restored'), 'site') });
  const site = join(tmp('restored'), 'site');
  verifyAndUnpack({ zip: s.zip, manifestFile: s.manifestFile, controlFile: s.control, out: site });
  preparePreview(site, { ...v, remake: SHA, main: OTHER });
  const srv = await serve(site);
  try {
    const m = await runLegacySmoke({ ...smokeCfg(srv.url, s, { profile: 'preview', digest: s.digest }) }, fast);
    assert.equal(m.status, 'pass', JSON.stringify(m.checks.filter((c) => !c.ok)));
    assert.ok(m.checks.some((c) => c.name === 'the preview page carries the restore banner' && c.ok));
    // preview.json names another restore (the candidate has not been replaced yet): the smoke does not pass
    let t = 0;
    const clock = { now: () => t, sleep: async (ms) => { t += ms; } };
    const late = await runLegacySmoke({ ...smokeCfg(srv.url, s, { profile: 'preview', digest: `sha256:${'9'.repeat(64)}`, timeoutS: 30, pollS: 10 }) }, clock);
    assert.equal(late.status, 'fail');
    assert.match(late.checks[0].detail, /timed out after 30s.*restoredFrom/);
  } finally { await srv.close(); }
  await assert.rejects(() => runLegacySmoke({ ...smokeCfg('http://x/', s), profile: 'other' }, fast), /profile "other"/);
});

// ---- the live profile of the preview smoke ---------------------------------------------------------------------------------------
test('the preview smoke has a live profile that polls deploy.json, not preview.json', async () => {
  const seen = [];
  const fetchFn = async (url) => { seen.push(new URL(url).pathname); return { status: 404, headers: new Headers(), json: async () => ({}), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }; };
  let t = 0;
  const m = await runSmoke({ baseUrl: 'http://live.invalid/', expectCommit: SHA, timeoutS: 3, pollS: 1, profile: 'live' }, { fetchFn, now: () => t, sleep: async (ms) => { t += ms; } });
  assert.equal(m.status, 'fail');
  assert.ok(seen.length > 0 && seen.every((p) => p === '/deploy.json'), seen.join(','));
  assert.match(m.checks[0].name, /^deploy\.json names the pushed commit$/);
  seen.length = 0;
  await runSmoke({ baseUrl: 'http://prev.invalid/', expectCommit: SHA, timeoutS: 3, pollS: 1 }, { fetchFn, now: () => t, sleep: async (ms) => { t += ms; } });
  assert.ok(seen.every((p) => p === '/preview.json'));
});

test('the files the register names for the kit exist', () => {
  for (const f of ['remake/tools/cutover.mjs', 'remake/tools/restore.mjs', 'remake/tools/artifact.mjs', 'remake/tools/legacy-smoke.mjs', 'remake/tools/legacy-site.mjs', '.github/workflows/next-main.yml', 'remake/control/restore.json', 'docs/next/OPERATING.md']) assert.ok(existsSync(join(root, f)), f);
});
