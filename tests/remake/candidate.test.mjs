// WP-34: the candidate receipt and candidate:check. A complete fixture receipt is built by the real generator (with the shell, git, the site
// build and the network replaced), checked, and then broken one field at a time: every break must fail the check and say which.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BROWSER_CMD, CHECKS, PARITY_CMD, SECTIONS, checkCandidate, overlayRecords, recordsCommitOf, compatibilityOf, defectsOf, defectsProblems, generate, judge, limitationsOf, mainState, parseDefects, receiptPath, resolveSha, safariOf, runCommand } from '../../remake/tools/candidate.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHA = 'a1'.repeat(20);
const OLD_MAIN = '5eabafad4e19e3cc2f4e71d55848474ff22bd444';
const NEW_MAIN = 'c31ceebf2c64b392c5451a884a2e2a466e5ac779';
const write = (dir, rel, content) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), typeof content === 'string' ? content : JSON.stringify(content, null, 2)); };
const read = (dir, rel) => readFileSync(join(dir, rel), 'utf8');

const DEFECTS = `# Defects

### T1-D1. A thing that is fixed

- **Disposition.** fixed in PR #40 (transition 2026-10-22-science-one).
- **Science.** yes: transition 2026-10-22-science-one
- **Where.** here.

### T1-D2. A thing that is kept

- **Disposition.** known limitation. Kept as the old tool has it.
- **Science.** no

### T1-D3. A thing the owner ruled on

- **Disposition.** owner-ruled by R-OQ07.
- **Science.** yes: ruling R-OQ07

### Noted, not a defect

- anything.
`;

/** A scratch checkout holding every record the receipt reads, in a state that is met. */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'candidate-'));
  write(dir, '.nvmrc', '26.12.0\n');
  write(dir, 'remake/baseline/5eabafad.json', { schema: 1, generatedAt: '2026-10-21T07:10:17.209Z', git: { originMain: OLD_MAIN } });
  cpSync(join(repo, 'remake/baseline/main-allowed.json'), join(dir, 'remake/baseline/main-allowed.json'));
  write(dir, 'remake/attest.csv', `date,key,detail,source\n2026-11-02,safari-check,${SHA.slice(0, 8)},wp:attest\n2026-11-03,bus-factor-rollback,,wp:attest\n`);
  write(dir, 'docs/next/defects.md', DEFECTS);
  write(dir, 'docs/next/rulings.csv', 'Id,Topic,Status,Ruling,OwnerWords,Date,Source,Effect\nR-OQ07,DT-2,Owner,Postpone,A,2026-10-20,x,None\nR-Q2-19,Defects,Owner,Keep,A,2026-10-20,x,None\n');
  write(dir, 'docs/next/known-limitations.md', '# Known limitations\n\n- **L-01.** Chromium only.\n- **L-02.** The live deploy path is unproved by the rehearsal.\n');
  write(dir, 'docs/next/quirks-kept.md', '# Quirks\n\n## Q1\n\n## Q2\n');
  write(dir, 'parity/transitions/2026-10-22-science-one.json', { id: '2026-10-22-science-one', kind: 'science', ruling: 'R-OQ09', differences: [{}, {}] });
  write(dir, 'parity/transitions/2026-10-22-display-one.json', { id: '2026-10-22-display-one', kind: 'display', ruling: 'OQ-11 A', differences: [{}] });
  write(dir, 'remake/port-items.json', { schema: 1, items: [] });
  write(dir, 'remake/legacy/legacy-final.json', { schema: 1, asset: 'legacy-site-7c6da496722d.zip', digest: `sha256:${'1'.repeat(64)}`, manifestDigest: `sha256:${'2'.repeat(64)}`, mainCommit: OLD_MAIN });
  write(dir, 'remake/rehearsal/2026-11-04.json', { schema: 1, result: 'pass', restoreSeconds: 500, holdTested: true, candidate: SHA });
  return dir;
}

/** The replaced outside world: git, the shell, the site build, the release identity and main. `state` is changed by a test to break something. */
function world(dir, state = {}) {
  const git = (args) => {
    const j = args.join(' ');
    const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
    if (args[0] === 'rev-parse' && args[1] === '--verify') return state.unknownCommit ? { status: 1, stdout: '', stderr: 'bad' } : ok(`${SHA}\n`);
    if (j === 'rev-parse HEAD') return ok(`${state.head ?? SHA}\n`);
    if (j === 'rev-parse --abbrev-ref HEAD') return ok('wp-test\n');
    if (args[0] === 'status') return ok(state.dirty ?? '');
    if (args[0] === 'diff') return ok((state.moved ?? []).join('\n'));
    return { status: 1, stdout: '', stderr: '' };
  };
  const ran = [];
  const run = (cmd) => {
    ran.push(cmd);
    if (cmd === BROWSER_CMD) {
      write(dir, 'remake/measure/axe/live-path/index.json', { schema: 1, runId: 'r1', mode: 'fast', axe: '4.13.0', blocking: false, pages: [{ page: 'selector', violatedRules: 2, violatingNodes: 5 }] });
    }
    const fail = (state.failing ?? []).find((f) => cmd.includes(f));
    if (fail) return { status: 1, stdout: '', stderr: 'boom' };
    return { status: 0, stdout: 'ok\n', stderr: '' };
  };
  return {
    git, run, ran,
    observeMain: () => ({ tip: state.mainTip ?? OLD_MAIN, source: 'fixture' }),
    changedPaths: () => state.mainChanged ?? [],
    releaseIdentity: () => ({ id: 'c0a0f17e0cc4', inputs: { data: 'd', schema: 's', rules: 'r', engine: 'e', view: 'v' } }),
    assemble: () => (state.noArtifact ? { status: 'fail', note: 'no dist/' } : { status: 'pass', artifact: { digest: `sha256:${'3'.repeat(64)}`, files: 10, bytes: 1000 }, sizes: { ok: state.overBudget !== true, site: { bytes: 99_000_000 }, checks: { siteBytes: { value: 1, budget: 2, ok: state.overBudget !== true } } } }),
  };
}

/** Generates the receipt in a scratch checkout, writes it where the check reads it, and returns the pieces. */
function made(state = {}, options = {}) {
  const dir = fixture();
  const w = world(dir, state);
  const receipt = generate(dir, SHA, options, w);
  write(dir, receiptPath(SHA), receipt);
  return { dir, w, receipt };
}
const problemsOf = ({ dir, w }) => checkCandidate(dir, SHA, w).problems;
const has = (list, re) => list.some((p) => re.test(p));
const rewrite = ({ dir }, fn) => { const r = JSON.parse(read(dir, receiptPath(SHA))); fn(r); write(dir, receiptPath(SHA), r); };

test('a complete fixture receipt, made by the generator on the candidate, passes candidate:check', () => {
  const m = made();
  assert.deepEqual(problemsOf(m), []);
  assert.equal(m.receipt.summary.verdict, 'met');
  for (const k of SECTIONS) assert.equal(m.receipt[k].commit, SHA, k);
  assert.equal(m.receipt.checks.results.length, CHECKS.length + 1, 'every check, and the browser suite');
  assert.ok(m.w.ran.includes(PARITY_CMD), 'the full parity run against the old engine is part of the receipt');
  assert.equal(m.receipt.parity.status, 'pass');
  assert.deepEqual(['factual', 'policy', 'presentation', 'intentional'].map((k) => m.receipt.compatibility[k].length), [0, 1, 1, 0], 'science is policy, display is presentation');
  assert.equal(m.receipt.compatibility.quirksKept, 2);
  assert.equal(m.receipt.baseline.unchanged, true);
  assert.deepEqual(m.receipt.portItems.items, []);
  assert.equal(m.receipt.safari.attested, true);
  assert.equal(m.receipt.artifact.digest, `sha256:${'3'.repeat(64)}`);
  assert.equal(m.receipt.axe.violatedRules, 2);
  assert.equal(m.receipt.rollback.legacyZip.digest, `sha256:${'1'.repeat(64)}`);
  assert.equal(m.receipt.limitations.items.length, 2);
  assert.equal(m.receipt.runtime.node, process.version);
});

test('candidate:check fails, naming the field, for each field that is missing', () => {
  for (const field of SECTIONS) {
    const m = made();
    rewrite(m, (r) => { delete r[field]; });
    assert.ok(has(problemsOf(m), new RegExp(`field ${field} is missing`)), field);
  }
  const m = made();
  rewrite(m, (r) => { r.schema = 2; r.candidate.sha = 'b'.repeat(40); });
  const p = problemsOf(m);
  assert.ok(has(p, /schema must be 1/) && has(p, /candidate\.sha is b+, not a1/));
  assert.ok(has(checkCandidate(fixture(), SHA, world(fixture())).problems, /does not exist \(npm run candidate:receipt/), 'no receipt at all');
});

test('candidate:check fails for each field produced on another commit', () => {
  for (const field of SECTIONS) {
    const m = made();
    rewrite(m, (r) => { r[field].commit = 'b'.repeat(40); });
    assert.ok(has(problemsOf(m), new RegExp(`field ${field} was produced on bbbbbbbb, not on a1a1a1a1`)), field);
  }
  const m = made();
  rewrite(m, (r) => { r.checks.results[3].commit = 'b'.repeat(40); });
  assert.ok(has(problemsOf(m), /check parity-erase was run on bbbbbbbb/));
});

test('a check that failed, did not run, or has no result fails the candidate; so does a parity run that is not a pass', () => {
  const failing = made({ failing: ['lint'] });
  assert.ok(has(problemsOf(failing), /check lint: fail/));
  assert.equal(failing.receipt.summary.verdict, 'not met');
  const m = made();
  rewrite(m, (r) => { r.checks.results = r.checks.results.filter((c) => c.id !== 'typecheck'); r.checks.results.find((c) => c.id === 'rulings').status = 'not-run'; r.checks.results.find((c) => c.id === 'rulings').note = 'command not found'; });
  const p = problemsOf(m);
  assert.ok(has(p, /check typecheck has no result/) && has(p, /check rulings: not-run \(command not found\)/));
  assert.ok(has(problemsOf(made({ failing: ['--milestone'] })), /^parity: fail/));
});

test('exit 0 with output that says it skipped is not a pass', () => {
  const run = (cmd) => ({ status: 0, stdout: 'ok\nSKIPPED: no private store\n', stderr: '' });
  assert.equal(runCommand('x', '.', SHA, { run }).status, 'not-run');
  assert.equal(runCommand('x', '.', SHA, { run: () => ({ status: 0, stdout: 'ℹ tests 0\n', stderr: '' }) }).status, 'not-run');
  assert.equal(runCommand('x', '.', SHA, { run: () => ({ status: 127, stdout: '', stderr: '' }) }).status, 'not-run');
  assert.equal(runCommand('x', '.', SHA, { run: () => ({ status: 0, stdout: 'ok', stderr: '' }) }).status, 'pass');
});

test('main changed: a different tip fails unless every changed path is one the owner accepted; an unobservable main fails too', () => {
  assert.ok(has(problemsOf(made({ mainTip: NEW_MAIN, mainChanged: ['data/tables/materials.csv'] })), /main changed: 1 path\(s\) differ from the baseline 5eabafad and are not accepted \(first: data\/tables\/materials\.csv\)/));
  assert.ok(has(problemsOf(made({ mainTip: NEW_MAIN, mainChanged: ['.github/workflows/next-gate.yml', 'app/js/x.js'] })), /main changed: 1 path/));
  assert.deepEqual(problemsOf(made({ mainTip: NEW_MAIN, mainChanged: ['.github/workflows/next-gate.yml'] })), [], 'the tamper-proof gate on main is the accepted exception (owner option A)');
  // main moved but the difference cannot be listed
  const unlisted = made();
  const w = { ...unlisted.w, observeMain: () => ({ tip: NEW_MAIN, source: 'x' }), changedPaths: () => null };
  assert.ok(has(checkCandidate(unlisted.dir, SHA, w).problems, /the difference cannot be listed here/));
  const dark = { ...unlisted.w, observeMain: () => { throw new Error('offline'); } };
  assert.ok(has(checkCandidate(unlisted.dir, SHA, dark).problems, /main's tip could not be observed: offline/));
  // no baseline receipt at all
  const bare = made();
  rmSync(join(bare.dir, 'remake/baseline/5eabafad.json'));
  assert.ok(has(checkCandidate(bare.dir, SHA, bare.w).problems, /remake\/baseline\/ holds no baseline receipt/));
  // a receipt written against another baseline commit
  const other = made();
  rewrite(other, (r) => { r.baseline.recordedMain = 'f'.repeat(40); });
  assert.ok(has(problemsOf(other), /the receipt records main ffffffff, remake\/baseline\/ records 5eabafad/));
  // pure function
  const dir = fixture();
  assert.equal(mainState(dir, { observe: () => ({ tip: OLD_MAIN, source: 's' }), changedPaths: () => { throw new Error('not called'); } }).unchanged, true);
});

test('the defects gate: every entry needs a disposition, and an entry that touches science names its transition or ruling', () => {
  const fails = (mutate, re) => {
    const m = made();
    write(m.dir, 'docs/next/defects.md', mutate(DEFECTS));
    const p = problemsOf(m);
    assert.ok(has(p, re), `${re}: ${p.join(' | ')}`);
  };
  fails((t) => t.replace('- **Disposition.** known limitation. Kept as the old tool has it.\n', ''), /defects gate: T1-D2: no "Disposition\." line/);
  fails((t) => t.replace('fixed in PR #40 (transition 2026-10-22-science-one)', 'fixed (transition 2026-10-22-science-one)'), /T1-D1: "fixed" names no PR \(#N\) or commit/);
  fails((t) => t.replace('owner-ruled by R-OQ07', 'owner-ruled by R-OQ99'), /T1-D3: "owner-ruled" must name rulings that exist/);
  fails((t) => t.replace('owner-ruled by R-OQ07', 'owner-ruled'), /T1-D3: "owner-ruled" must name rulings/);
  fails((t) => t.replace('- **Science.** no', '- **Science.** yes'), /T1-D2: touches science but names no transition or ruling/);
  fails((t) => t.replace('- **Science.** no', '- **Science.** yes: ruling R-NOPE'), /T1-D2: names ruling R-NOPE, which is not in docs\/next\/rulings\.csv/);
  fails((t) => t.replace('yes: transition 2026-10-22-science-one', 'yes: transition 2026-10-22-gone'), /T1-D1: names transition 2026-10-22-gone, which is not in parity\/transitions\//);
  fails((t) => t.replace('yes: transition 2026-10-22-science-one', 'yes: ruling R-OQ07'), /T1-D1: a fix that touches science names its transition/);
  fails((t) => t.replace('- **Science.** no\n', ''), /T1-D2: no "Science\." line/);
  fails((t) => t.replace('known limitation. Kept', 'ignored. Kept'), /T1-D2: disposition "ignored/);
  fails(() => '# Defects\n\nnothing here\n', /lists no defect entry/);
  // an undispositioned entry added after the receipt was made still fails the check: the gate reads the file now
  const added = made();
  assert.deepEqual(problemsOf(added), []);
  write(added.dir, 'docs/next/defects.md', `${DEFECTS}\n### T2-D1. A new one\n\n- **Where.** here.\n`);
  assert.ok(has(problemsOf(added), /T2-D1: no "Disposition\." line/));
  // the "Noted, not a defect" section is not an entry
  assert.deepEqual(parseDefects(DEFECTS).map((e) => e.id), ['T1-D1', 'T1-D2', 'T1-D3']);
});

test('the repository\'s own defects file passes the gate, and its known limitations and transitions are sorted', () => {
  const d = defectsOf(repo, SHA);
  assert.deepEqual(d.problems, []);
  assert.equal(d.entries, 16);
  const l = limitationsOf(repo, SHA);
  assert.ok(l.items.length >= 10 && l.defectsKeptAsLimitations.length >= 10);
  const c = compatibilityOf(repo, SHA);
  assert.deepEqual(c.unsorted, []);
  assert.equal(c.policy.length + c.presentation.length + c.intentional.length + c.factual.length, 4);
});

test('the owner\'s safari-check row is required, and a row that names another commit is not this candidate\'s', () => {
  const none = made();
  write(none.dir, 'remake/attest.csv', 'date,key,detail,source\n2026-11-03,bus-factor-rollback,,wp:attest\n');
  const stillClaims = checkCandidate(none.dir, SHA, none.w).problems;
  assert.deepEqual(stillClaims.map((x) => x.replace(/ \(.*/, '')), ['safari-check: not met now'], 'a receipt that claims a row the file no longer holds is caught by the live read');
  write(none.dir, receiptPath(SHA), generate(none.dir, SHA, {}, none.w));
  const p = checkCandidate(none.dir, SHA, none.w).problems;
  assert.ok(has(p, /safari-check: not met \(no safari-check row in remake\/attest\.csv/));
  assert.ok(has(p, /safari-check: not met now/));
  const other = made();
  write(other.dir, 'remake/attest.csv', 'date,key,detail,source\n2026-11-02,safari-check,deadbeef,wp:attest\n2026-11-03,bus-factor-rollback,,wp:attest\n');
  assert.ok(has(checkCandidate(other.dir, SHA, other.w).problems, /the safari-check row names deadbeef, not this candidate/));
  // a row with no commit in it is accepted as it stands (the owner types the sha when they can)
  const bare = made();
  write(bare.dir, 'remake/attest.csv', 'date,key,detail,source\n2026-11-02,safari-check,,wp:attest\n2026-11-03,bus-factor-rollback,,wp:attest\n');
  assert.deepEqual(checkCandidate(bare.dir, SHA, bare.w).problems, []);
  assert.equal(safariOf(fixture(), SHA).attested, true);
});

test('the compatibility report must sort every transition and list every one that exists now', () => {
  const unsorted = made();
  write(unsorted.dir, 'parity/transitions/2026-10-22-odd.json', { id: '2026-10-22-odd', kind: 'mystery', differences: [] });
  const p = checkCandidate(unsorted.dir, SHA, unsorted.w).problems;
  assert.ok(has(p, /compatibility report lacks transition 2026-10-22-odd/));
  const m = made();
  rewrite(m, (r) => { r.compatibility.unsorted = [{ id: '2026-10-22-odd' }]; });
  assert.ok(has(problemsOf(m), /1 transition\(s\) fit none of factual, policy, presentation, intentional/));
  const gone = made();
  rewrite(gone, (r) => { r.compatibility.policy.push({ id: '2026-10-22-ghost' }); });
  assert.ok(has(problemsOf(gone), /names transition 2026-10-22-ghost, which is not in parity\/transitions/));
});

test('the port-item queue must exist and be empty, in the receipt and now', () => {
  const full = made();
  write(full.dir, 'remake/port-items.json', { schema: 1, items: [{ id: 'P1' }] });
  assert.ok(has(checkCandidate(full.dir, SHA, full.w).problems, /port-item queue holds 1 item\(s\) now/));
  const gone = made();
  rmSync(join(gone.dir, 'remake/port-items.json'));
  const p = checkCandidate(gone.dir, SHA, gone.w).problems;
  assert.ok(has(p, /remake\/port-items\.json is missing/) && has(p, /missing or malformed now/));
});

test('no artifact digest, a budget over its line, and no axe report each fail the candidate', () => {
  assert.ok(has(problemsOf(made({ noArtifact: true })), /artifact: no digest \(no dist\/\)/));
  assert.ok(has(problemsOf(made({ overBudget: true })), /budgets: a budget is over its line or was not measured/));
  const noBrowser = made({}, { skipBrowser: true });
  assert.ok(has(problemsOf(noBrowser), /axe: no report \(the browser suite was skipped/));
  const stale = made();
  rewrite(stale, (r) => { r.axe.pages = []; r.axe.note = 'the axe files in the tree are older than this run'; });
  assert.ok(has(problemsOf(stale), /axe: no report \(the axe files in the tree are older/));
});

test('rollback: the legacy zip digest, a passing rehearsal under 15 minutes that tested the hold, and the bus-factor row are all required', () => {
  const noLegacy = made();
  rmSync(join(noLegacy.dir, 'remake/legacy/legacy-final.json'));
  const regen = generate(noLegacy.dir, SHA, {}, noLegacy.w);
  write(noLegacy.dir, receiptPath(SHA), regen);
  assert.ok(has(checkCandidate(noLegacy.dir, SHA, noLegacy.w).problems, /rollback: the legacy zip digest is not recorded/));
  assert.ok(regen.rollback.notRun[0].includes('save-legacy.sh'));
  const slow = made();
  write(slow.dir, 'remake/rehearsal/2026-11-04.json', { schema: 1, result: 'pass', restoreSeconds: 901, holdTested: true });
  write(slow.dir, receiptPath(SHA), generate(slow.dir, SHA, {}, slow.w));
  assert.ok(has(checkCandidate(slow.dir, SHA, slow.w).problems, /the restore took 901 s, the line is 900 s/));
  const nohold = made();
  write(nohold.dir, 'remake/rehearsal/2026-11-04.json', { schema: 1, result: 'pass', restoreSeconds: 100, holdTested: false });
  write(nohold.dir, receiptPath(SHA), generate(nohold.dir, SHA, {}, nohold.w));
  assert.ok(has(checkCandidate(nohold.dir, SHA, nohold.w).problems, /did not show that a push under DEPLOY_HOLD did not deploy/));
  const failed = made();
  write(failed.dir, 'remake/rehearsal/2026-11-04.json', { schema: 1, result: 'fail', restoreSeconds: 100, holdTested: true });
  write(failed.dir, receiptPath(SHA), generate(failed.dir, SHA, {}, failed.w));
  assert.ok(has(checkCandidate(failed.dir, SHA, failed.w).problems, /the rehearsal result is fail/));
  const noBus = made();
  write(noBus.dir, 'remake/attest.csv', `date,key,detail,source\n2026-11-02,safari-check,${SHA.slice(0, 8)},wp:attest\n`);
  write(noBus.dir, receiptPath(SHA), generate(noBus.dir, SHA, {}, noBus.w));
  assert.ok(has(checkCandidate(noBus.dir, SHA, noBus.w).problems, /no bus-factor-rollback row/));
  const noLog = made();
  rmSync(join(noLog.dir, 'remake/rehearsal'), { recursive: true });
  write(noLog.dir, receiptPath(SHA), generate(noLog.dir, SHA, {}, noLog.w));
  assert.ok(has(checkCandidate(noLog.dir, SHA, noLog.w).problems, /rollback: no rehearsal log/));
  // the live practice run's report sits in the same folder and sorts after every date: it is not the rehearsal log
  const dryrun = made();
  write(dryrun.dir, 'remake/rehearsal/live-dryrun-2026-11-05.json', { schema: 1, result: 'pass', phases: [] });
  write(dryrun.dir, receiptPath(SHA), generate(dryrun.dir, SHA, {}, dryrun.w));
  const picked = checkCandidate(dryrun.dir, SHA, dryrun.w);
  assert.equal(picked.receipt.rollback.rehearsal.file, 'remake/rehearsal/2026-11-04.json');
  assert.ok(!has(picked.problems, /^rollback:/));
});

test('the branch moving past the candidate voids the receipt unless only records changed', () => {
  const m = made();
  const records = { ...m.w, git: world(m.dir, { head: 'f'.repeat(40), moved: ['remake/candidates/x.json', 'remake/attest.csv', 'remake/measure/sizes.json', 'remake/rehearsal/a.json', 'remake/control/restore.json'] }).git };
  assert.deepEqual(checkCandidate(m.dir, SHA, records).problems, []);
  const code = { ...m.w, git: world(m.dir, { head: 'f'.repeat(40), moved: ['remake/attest.csv', 'packages/engine/src/x.ts', 'apps/public/src/y.ts'] }).git };
  const p = checkCandidate(m.dir, SHA, code).problems;
  assert.ok(has(p, /the branch moved past the candidate by more than records: packages\/engine\/src\/x\.ts, apps\/public\/src\/y\.ts \(name the new candidate\)/));
});

test('the generator refuses to describe a commit that is not checked out, or a working tree that differs from it', () => {
  const dir = fixture();
  assert.throws(() => generate(dir, SHA, {}, world(dir, { head: 'f'.repeat(40) })), /HEAD is ffffffff, not a1a1a1a1/);
  assert.throws(() => generate(dir, SHA, {}, world(dir, { dirty: ' M packages/engine/src/x.ts\n' })), /tracked files differ from the commit/);
  // a record that the run itself rewrites is not a difference
  assert.doesNotThrow(() => generate(dir, SHA, {}, world(dir, { dirty: ' M remake/measure/sizes.json\n' })));
  assert.throws(() => resolveSha(dir, 'zz'), /not a commit id/);
  assert.throws(() => resolveSha(dir, 'abcdef0', world(dir, { unknownCommit: true }).git), /is not a commit in this checkout/);
});

test('judge: a receipt that is not an object, and the pure parts of the gate', () => {
  assert.deepEqual(judge(null, SHA, {}), ['the receipt is not a JSON object']);
  const { entries, problems } = defectsProblems('### X1-D1. t\n\n- **Disposition.** fixed in commit abcdef1.\n- **Science.** no\n', { rulingIds: new Set(), transitionIds: new Set() });
  assert.deepEqual([entries, problems], [1, []]);
});

test('CLI: with no receipt and no commit it says "not run", never "met"; a named commit that has no receipt exits 1; a bad id exits 2', () => {
  const run = (...args) => spawnSync(process.execPath, [join(repo, 'remake/tools/candidate.mjs'), ...args], { cwd: repo, encoding: 'utf8', env: { ...process.env } });
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
  const none = run('check');
  if (!/not run/.test(none.stdout)) assert.match(none.stdout + none.stderr, /candidate:check/); // a receipt may exist in a later checkout
  const named = run('check', head);
  assert.equal(named.status, 1);
  assert.match(named.stderr, /remake\/candidates\/[0-9a-f]{40}\.json does not exist|NOT MET/);
  const bad = run('check', 'zzz');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /not a commit id/);
  assert.equal(run('receipt').status, 2);
});

// ---- where the owner's records come from (M4 close): a commit cannot name its own sha ----------------------------------------------
/** A real scratch repository: the fixture without the owner's records at commit A (the candidate); `records` and `code` add commits after it. */
function history() {
  const dir = fixture();
  const sh = (...args) => { const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
  const saved = {};
  for (const f of ['remake/attest.csv', 'remake/rehearsal/2026-11-04.json', 'remake/legacy/legacy-final.json']) { saved[f] = read(dir, f); rmSync(join(dir, f)); }
  sh('init', '-q', '-b', 'trunk');
  write(dir, 'remake/attest.csv', 'date,key,detail,source\n');
  write(dir, 'packages/code.txt', 'one\n');
  sh('add', '-A'); sh('commit', '-q', '-m', 'candidate');
  const candidate = sh('rev-parse', 'HEAD');
  const commit = (m) => { sh('add', '-A'); sh('commit', '-q', '-m', m); return sh('rev-parse', 'HEAD'); };
  const records = (extra = {}) => {
    write(dir, 'remake/attest.csv', `date,key,detail,source\n2026-11-02,safari-check,${candidate.slice(0, 8)},wp:attest\n2026-11-03,bus-factor-rollback,,wp:attest\n2026-11-03,retire-approved,A-doctor,wp:attest\n`);
    write(dir, 'remake/rehearsal/2026-11-04.json', saved['remake/rehearsal/2026-11-04.json']);
    write(dir, 'remake/legacy/legacy-final.json', saved['remake/legacy/legacy-final.json']);
    write(dir, 'remake/status/WP-99.json', { id: 'WP-99', status: 'done' });
    for (const [f, c] of Object.entries(extra)) write(dir, f, c);
    return commit('records');
  };
  return { dir, sh, candidate, commit, records, ref: 'trunk' };
}

test('the deadlock: records committed after the candidate (safari-check naming its sha8) are overlaid, and the receipt is met', () => {
  const h = history();
  const x = h.records();
  h.sh('checkout', '-q', '--detach', h.candidate);
  assert.equal(recordsCommitOf(h.dir, h.candidate, { ref: h.ref }), x);
  const w = world(h.dir);
  const seen = {};
  const run = (cmd) => { if (cmd === 'npm run checks:register -- --cutover-ready') seen.attest = read(h.dir, 'remake/attest.csv'); return w.run(cmd); };
  const receipt = generate(h.dir, h.candidate, {}, { ...w, run, git: (args) => spawnSync('git', args, { cwd: h.dir, encoding: 'utf8' }), recordsRef: h.ref });
  assert.equal(receipt.records.from, x);
  assert.equal(receipt.records.commit, h.candidate);
  assert.match(seen.attest, /retire-approved,A-doctor/, 'the cutover-ready run sees the owner\'s retire rows');
  assert.equal(receipt.safari.attested, true);
  assert.equal(receipt.rollback.busFactorRollback, true);
  assert.equal(receipt.rollback.rehearsal.result, 'pass');
  assert.equal(receipt.summary.verdict, 'met', receipt.summary.problems.join('; '));
  assert.equal(read(h.dir, 'packages/code.txt'), 'one\n', 'the code stays the candidate\'s');
});

test('a descendant that changes code is not the records source; the newest records-only descendant before it is', () => {
  const h = history();
  const x = h.records();
  write(h.dir, 'packages/code.txt', 'two\n');
  write(h.dir, 'remake/status/WP-98.json', { id: 'WP-98', status: 'done' });
  const y = h.commit('code and a record');
  h.records({ 'remake/status/WP-97.json': { id: 'WP-97', status: 'done' } });
  assert.equal(recordsCommitOf(h.dir, h.candidate, { ref: h.ref }), x, 'later records-only commits sit on a code change: none is used');
  h.sh('checkout', '-q', '--detach', h.candidate);
  assert.equal(overlayRecords(h.dir, h.candidate, { ref: h.ref }).from, x);
  assert.equal(read(h.dir, 'packages/code.txt'), 'one\n');
  assert.notEqual(y, x);
});

test('with no descendant, or a ref that is not known here, the records are the candidate\'s own', () => {
  const h = history();
  assert.equal(recordsCommitOf(h.dir, h.candidate, { ref: h.ref }), h.candidate);
  h.records();
  assert.equal(recordsCommitOf(h.dir, h.candidate, { ref: 'origin/not-a-branch' }), h.candidate);
  h.sh('checkout', '-q', '--detach', h.candidate);
  assert.deepEqual(overlayRecords(h.dir, h.candidate, { ref: 'origin/not-a-branch' }), { commit: h.candidate, from: h.candidate, files: 0 });
  const m = made();
  assert.equal(m.receipt.records.from, SHA, 'the fixture world has no later commit');
});

test('every parity test that skips without an environment switch runs in the receipt: the receipt reads a skip as not-run', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'parity');
  const cmd = CHECKS.find((c) => c.id === 'tests-parity').cmd;
  const gates = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.mjs'))) {
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/skip:\s*!process\.env\.(\w+)/g)) gates.add(m[1]);
  }
  assert.ok(gates.has('PARITY_FULL'), 'the full noop and mutate tests are gated by PARITY_FULL');
  for (const g of gates) assert.match(cmd, new RegExp(`(^|\\s)${g}=1\\s`), `${g} is set by the receipt's tests-parity command`);
});
